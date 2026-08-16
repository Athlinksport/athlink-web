import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateReportInput } from "@/lib/safety/validation";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const validation = validateReportInput(await request.json().catch(() => null));
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  const targets = {
    user: ["profiles", "id"],
    group: ["groups", "id"],
    post: ["group_posts", "id"],
    comment: ["group_post_comments", "id"],
    message: ["messages", "id"],
  } as const;
  const [table, column] = targets[validation.value.target_type];
  const { data: target } = await supabase.from(table).select(column).eq(column, validation.value.target_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "The reported item is unavailable." }, { status: 404 });
  const { error } = await supabase.from("reports").insert({ ...validation.value, reporter_id: user.id });
  if (error?.code === "23505") return NextResponse.json({ error: "You already have an open report for this item." }, { status: 409 });
  if (error?.code === "P0001") return NextResponse.json({ error: "Report limit reached. Try again later." }, { status: 429 });
  if (error) return NextResponse.json({ error: "Report could not be submitted." }, { status: 400 });
  return NextResponse.json({ reported: true }, { status: 201 });
}
