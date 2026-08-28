import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const AVATAR_FILE_PATTERN =
  /^avatar-(?:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(?:jpe?g|png|webp)$/i;

function referencedAvatarPath(value: string | null) {
  if (!value) return null;
  const marker = "/storage/v1/object/public/avatars/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex === -1) return null;

  try {
    return decodeURIComponent(
      value.slice(markerIndex + marker.length).split("?")[0],
    );
  } catch {
    return null;
  }
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid cleanup request." }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path : "";
  const segments = path.split("/");
  if (
    segments.length !== 2
    || segments[0] !== authData.user.id
    || !AVATAR_FILE_PATTERN.test(segments[1])
  ) {
    return NextResponse.json({ error: "Invalid cleanup target." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: "Profile could not be verified." }, { status: 500 });
  }
  if (referencedAvatarPath(profile?.avatar_url ?? null) === path) {
    return NextResponse.json(
      { error: "The active profile photo cannot be deleted." },
      { status: 409 },
    );
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server configuration error." },
      { status: 500 },
    );
  }

  const { error: removeError } = await admin.storage.from("avatars").remove([path]);
  if (removeError) {
    return NextResponse.json({ error: "Profile photo cleanup failed." }, { status: 502 });
  }

  return NextResponse.json({ deletedPath: path });
}
