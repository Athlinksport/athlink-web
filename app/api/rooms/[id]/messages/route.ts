import { NextResponse } from "next/server";

import {
  DIRECT_MESSAGE_MAX_LENGTH,
  DIRECT_MESSAGE_PAGE_SIZE,
} from "@/lib/messages/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const cursor = new URL(request.url).searchParams.get("before");
  const separator = cursor?.lastIndexOf("|") ?? -1;
  const before = separator > 0 ? cursor!.slice(0, separator) : null;
  const beforeId = separator > 0 ? cursor!.slice(separator + 1) : null;
  if (cursor && (!before || !beforeId || Number.isNaN(Date.parse(before)) || !UUID_PATTERN.test(beforeId))) {
    return NextResponse.json({ error: "Invalid pagination cursor." }, { status: 400 });
  }
  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at, edited_at, deleted_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(DIRECT_MESSAGE_PAGE_SIZE + 1);
  if (before && beforeId) {
    query = query.or(`created_at.lt.${before},and(created_at.eq.${before},id.lt.${beforeId})`);
  }

  const { data, error } = await query;
  if (error) {
    const status = error.code === "42501" ? 403 : 500;
    return NextResponse.json({
      error: status === 403 ? "Conversation access denied." : "Messages could not be loaded.",
    }, { status });
  }
  const rows = data ?? [];
  const hasMore = rows.length > DIRECT_MESSAGE_PAGE_SIZE;
  const messages = rows.slice(0, DIRECT_MESSAGE_PAGE_SIZE).reverse();
  const ownMessageIds = messages
    .filter((message) => message.sender_id === authData.user.id)
    .map((message) => message.id);
  const { data: receipts } = ownMessageIds.length
    ? await supabase
        .from("message_reads")
        .select("message_id, read_at")
        .in("message_id", ownMessageIds)
        .neq("user_id", authData.user.id)
    : { data: [] };
  const readAtByMessage = new Map((receipts ?? []).map((receipt) => [receipt.message_id, receipt.read_at]));

  const { data: markedRead, error: markReadError } = await supabase.rpc(
    "mark_direct_conversation_read",
    { target_conversation_id: id },
  );
  if (markReadError) {
    const status = markReadError.code === "42501" ? 403 : 500;
    return NextResponse.json(
      {
        error:
          status === 403
            ? "Conversation access denied."
            : "Read state could not be updated.",
        code: markReadError.code,
      },
      { status },
    );
  }

  const { data: unreadCount, error: unreadCountError } = await supabase.rpc(
    "get_unread_message_count",
  );
  if (unreadCountError) {
    return NextResponse.json(
      {
        error: "Unread count could not be refreshed.",
        code: unreadCountError.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    messages: messages.map((message) => ({
      ...message,
      read_at: readAtByMessage.get(message.id) ?? null,
    })),
    hasMore,
    nextCursor: hasMore && messages[0] ? `${messages[0].created_at}|${messages[0].id}` : null,
    markedRead: Number(markedRead ?? 0),
    unreadCount: Number(unreadCount ?? 0),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid message request." }, { status: 400 });
  }
  const content = typeof input === "object" && input !== null && "content" in input
    && typeof (input as { content?: unknown }).content === "string"
    ? (input as { content: string }).content.trim()
    : "";
  if (!content) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }
  if (content.length > DIRECT_MESSAGE_MAX_LENGTH) {
    return NextResponse.json({
      error: `Message must be ${DIRECT_MESSAGE_MAX_LENGTH} characters or fewer.`,
    }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: id, sender_id: authData.user.id, content })
    .select("id, conversation_id, sender_id, content, created_at, edited_at, deleted_at")
    .single();
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "23514" ? 400 : 500;
    const message = status === 403
      ? "Conversation access denied."
      : status === 400
        ? "Message content is invalid."
        : "Message could not be sent.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ message: { ...data, read_at: null } }, { status: 201 });
}
