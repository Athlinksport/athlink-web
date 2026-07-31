import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
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

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, participant_low, participant_high")
    .eq("id", id)
    .maybeSingle();
  if (error || !conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  const participantId = conversation.participant_low === authData.user.id
    ? conversation.participant_high
    : conversation.participant_low;
  const { data: participant } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city_name, country_name")
    .eq("id", participantId)
    .maybeSingle();

  return NextResponse.json({
    conversation: {
      id,
      participant: participant ?? {
        id: participantId,
        display_name: null,
        avatar_url: null,
        city_name: null,
        country_name: null,
      },
    },
  });
}

