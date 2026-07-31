import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
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
  const { data, error } = await supabase.rpc("mark_direct_conversation_read", {
    target_conversation_id: id,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : 500;
    return NextResponse.json({
      error: status === 403 ? "Conversation access denied." : "Read state could not be updated.",
      code: error.code,
    }, { status });
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
    markedRead: Number(data ?? 0),
    unreadCount: Number(unreadCount ?? 0),
  });
}
