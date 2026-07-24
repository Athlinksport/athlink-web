import { NextResponse } from "next/server";

import { groupPostImagePath } from "@/lib/groups/utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const GROUP_MEDIA_BUCKETS = new Set([
  "group-avatars",
  "group-covers",
  "group-post-images",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function referencedObjectPath(value: string, bucket: string) {
  if (bucket === "group-post-images") return groupPostImagePath(value);
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (!value.includes(marker)) return value.split("?")[0];
  return decodeURIComponent(value.slice(value.indexOf(marker) + marker.length).split("?")[0]);
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { bucket?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid cleanup request." }, { status: 400 });
  }

  const bucket = typeof body.bucket === "string" ? body.bucket : "";
  const path = typeof body.path === "string" ? body.path : "";
  const segments = path.split("/");
  if (
    !GROUP_MEDIA_BUCKETS.has(bucket)
    || segments.length !== 3
    || segments[0] !== authData.user.id
    || !UUID_PATTERN.test(segments[0])
    || !UUID_PATTERN.test(segments[1])
    || !segments[2]
  ) {
    return NextResponse.json({ error: "Invalid cleanup target." }, { status: 400 });
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

  const groupId = segments[1];
  if (bucket === "group-post-images") {
    const { data: posts, error: postsError } = await admin
      .from("group_posts")
      .select("image_url")
      .eq("author_id", authData.user.id)
      .eq("group_id", groupId)
      .not("image_url", "is", null);
    if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 });
    if ((posts ?? []).some((post) => (
      post.image_url && referencedObjectPath(post.image_url, bucket) === path
    ))) {
      return NextResponse.json({ error: "Referenced media cannot be deleted directly." }, { status: 409 });
    }
  } else {
    const column = bucket === "group-avatars" ? "avatar_url" : "cover_image_url";
    const { data: group, error: groupError } = await admin
      .from("groups")
      .select("owner_id, avatar_url, cover_image_url")
      .eq("id", groupId)
      .maybeSingle();
    if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
    if (!group || group.owner_id !== authData.user.id) {
      return NextResponse.json({ error: "Only the group owner can clean up this media." }, { status: 403 });
    }
    const referencedUrl = group[column];
    if (
      typeof referencedUrl === "string"
      && referencedObjectPath(referencedUrl, bucket) === path
    ) {
      return NextResponse.json({ error: "Referenced media cannot be deleted directly." }, { status: 409 });
    }
  }

  const { error: removeError } = await admin.storage.from(bucket).remove([path]);
  if (removeError) return NextResponse.json({ error: removeError.message }, { status: 502 });
  return NextResponse.json({ deletedPath: path });
}
