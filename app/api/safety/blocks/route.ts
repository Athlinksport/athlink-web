import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateBlockInput } from "@/lib/safety/validation";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const input = await request.json().catch(() => null) as { targetId?: unknown } | null;
  const error = validateBlockInput(input?.targetId, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const { error: insertError } = await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: input!.targetId });
  if (insertError && insertError.code !== "23505") return NextResponse.json({ error: "Member could not be blocked." }, { status: 400 });
  return NextResponse.json({ blocked: true });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const targetId = new URL(request.url).searchParams.get("targetId");
  const error = validateBlockInput(targetId, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const { error: deleteError } = await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
  if (deleteError) return NextResponse.json({ error: "Member could not be unblocked." }, { status: 400 });
  return NextResponse.json({ blocked: false });
}
