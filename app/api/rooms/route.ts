import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("list_direct_conversations");
  if (error) {
    return NextResponse.json({ error: "Conversations could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid conversation request." }, { status: 400 });
  }
  const participantId = typeof input === "object" && input !== null && "participantId" in input
    ? (input as { participantId?: unknown }).participantId
    : null;
  if (typeof participantId !== "string" || !UUID_PATTERN.test(participantId)) {
    return NextResponse.json({ error: "Choose a valid athlete." }, { status: 400 });
  }
  if (participantId === authData.user.id) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    other_user_id: participantId,
  });
  if (error) {
    const status = error.code === "P0002" ? 404 : error.code === "22023" ? 400 : error.code === "42501" ? 403 : 500;
    const message = status === 404
      ? "Athlete not found."
      : status === 400
        ? "You cannot message yourself."
        : status === 403
          ? "Only connected athletes can start conversations."
        : "The conversation could not be opened.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ conversationId: data });
}
