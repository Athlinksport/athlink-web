import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { sports } from "@/data/sports";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from "@/lib/groups/constants";
import type { GroupPrivacy } from "@/lib/groups/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const GROUP_MEDIA_BUCKETS = ["group-avatars", "group-covers", "group-post-images"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIST_PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
type StorageEntry = { name: string };
type EditableGroup = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  sport: string;
  city: string | null;
  country: string;
  privacy: GroupPrivacy;
  avatar_url: string | null;
  cover_image_url: string | null;
  updated_at: string;
};

const GROUP_SELECT = "id, owner_id, name, description, sport, city, country, privacy, avatar_url, cover_image_url, updated_at";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatedOwnedMediaPath(value: unknown, userId: string, groupId: string) {
  if (typeof value !== "string") return null;
  const segments = value.split("/");
  return segments.length === 3
    && segments[0] === userId
    && segments[1] === groupId
    && Boolean(segments[2])
    && !segments[2].includes("/")
    ? value
    : null;
}

function storedObjectPath(value: string | null, bucket: string) {
  if (!value) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  try {
    return value.includes(marker)
      ? decodeURIComponent(value.slice(value.indexOf(marker) + marker.length).split("?")[0])
      : value.split("?")[0];
  } catch {
    return null;
  }
}

async function confirmStagedObject(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) {
  const lastSlash = path.lastIndexOf("/");
  const directory = path.slice(0, lastSlash);
  const filename = path.slice(lastSlash + 1);
  const { data, error } = await supabase.storage.from(bucket).list(directory, {
    limit: 2,
    search: filename,
  });
  if (error) return { error: `Could not verify the uploaded ${bucket === "group-avatars" ? "avatar" : "cover"}.` };
  if (!data.some((item) => item.name === filename)) return { error: "Uploaded group media was not found in the expected bucket." };
  return { error: null };
}

async function listAll(admin: SupabaseClient, bucket: string, prefix: string) {
  const entries: StorageEntry[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Could not list ${bucket}: ${error.message}`);
    entries.push(...data);
    if (data.length < LIST_PAGE_SIZE) return entries;
  }
}

async function sweepGroupMedia(admin: SupabaseClient, groupId: string) {
  const failures: Array<{ bucket: string; pathCount: number; message: string }> = [];
  for (const bucket of GROUP_MEDIA_BUCKETS) {
    let uploaderFolders: StorageEntry[];
    try {
      uploaderFolders = await listAll(admin, bucket, "");
    } catch (error) {
      failures.push({
        bucket,
        pathCount: 0,
        message: error instanceof Error ? error.message : "Could not enumerate uploader folders.",
      });
      continue;
    }

    const paths: string[] = [];
    for (const uploader of uploaderFolders) {
      if (!UUID_PATTERN.test(uploader.name)) continue;
      const prefix = `${uploader.name}/${groupId}`;
      let objects: StorageEntry[];
      try {
        objects = await listAll(admin, bucket, prefix);
      } catch (error) {
        failures.push({
          bucket,
          pathCount: 0,
          message: error instanceof Error ? error.message : `Could not enumerate ${prefix}.`,
        });
        continue;
      }
      for (const object of objects) {
        const path = `${prefix}/${object.name}`;
        const segments = path.split("/");
        if (
          segments.length === 3
          && segments[0] === uploader.name
          && segments[1] === groupId
          && Boolean(segments[2])
        ) {
          paths.push(path);
        }
      }
    }

    for (let index = 0; index < paths.length; index += DELETE_BATCH_SIZE) {
      const batch = paths.slice(index, index + DELETE_BATCH_SIZE);
      try {
        const { error } = await admin.storage.from(bucket).remove(batch);
        if (error) failures.push({ bucket, pathCount: batch.length, message: error.message });
      } catch (error) {
        failures.push({
          bucket,
          pathCount: batch.length,
          message: error instanceof Error ? error.message : "Unknown Storage cleanup error.",
        });
      }
    }
  }
  return failures;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  if (!UUID_PATTERN.test(groupId)) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, owner_id, updated_at")
    .eq("id", groupId)
    .maybeSingle();
  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (group.owner_id !== authData.user.id) {
    return NextResponse.json({ error: "Only the group owner can delete this group." }, { status: 403 });
  }

  const { data: deletedGroup, error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("owner_id", authData.user.id)
    .eq("updated_at", group.updated_at)
    .select("id")
    .maybeSingle();
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (!deletedGroup) {
    return NextResponse.json(
      { error: "The group changed before deletion. Refresh and try again." },
      { status: 409 },
    );
  }

  // This authoritative sweep happens only after the guarded delete succeeds.
  // Once the group row is gone, upload policies can no longer authorize new
  // objects, and this scan also catches uploads made while deletion was pending.
  let cleanupFailures: Array<{ bucket: string; pathCount: number; message: string }>;
  try {
    const admin = createSupabaseAdminClient();
    cleanupFailures = await sweepGroupMedia(admin, groupId);
  } catch (error) {
    cleanupFailures = [{
      bucket: "server-configuration",
      pathCount: 0,
      message: error instanceof Error ? error.message : "Server configuration error.",
    }];
  }
  if (cleanupFailures.length > 0) {
    const cleanupWarning = {
      code: "MEDIA_CLEANUP_FAILED",
      message: "The group was deleted, but some media cleanup was incomplete.",
      failures: cleanupFailures,
    };
    console.error("Group media cleanup failed after database deletion.", {
      groupId,
      failures: cleanupFailures,
    });
    return NextResponse.json(
      { deletedGroupId: deletedGroup.id, cleanupWarning },
      { status: 207 },
    );
  }

  return NextResponse.json({ deletedGroupId: deletedGroup.id });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  if (!UUID_PATTERN.test(groupId)) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select(GROUP_SELECT)
    .eq("id", groupId)
    .maybeSingle();
  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
  if (!groupData) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  const group = groupData as EditableGroup;
  if (group.owner_id !== authData.user.id) {
    return NextResponse.json({ error: "Only the group owner can edit this group." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid group update request." }, { status: 400 });
  }
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid group update request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const sport = typeof body.sport === "string" ? body.sport.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const privacy = body.privacy;
  if (name.length < 3 || name.length > GROUP_NAME_MAX) {
    return NextResponse.json({ error: `Group name must be between 3 and ${GROUP_NAME_MAX} characters.` }, { status: 400 });
  }
  if (description.length < 20 || description.length > GROUP_DESCRIPTION_MAX) {
    return NextResponse.json({ error: `Description must be between 20 and ${GROUP_DESCRIPTION_MAX} characters.` }, { status: 400 });
  }
  if (!sports.some((item) => item.name === sport)) {
    return NextResponse.json({ error: "Choose a valid sport." }, { status: 400 });
  }
  if (!country) {
    return NextResponse.json({ error: "Enter a country." }, { status: 400 });
  }
  if (country.length < 2 || country.length > 100) {
    return NextResponse.json({ error: "Country must be between 2 and 100 characters." }, { status: 400 });
  }
  if (city.length > 100) {
    return NextResponse.json({ error: "City must be 100 characters or fewer." }, { status: 400 });
  }
  if (privacy !== "public" && privacy !== "private") {
    return NextResponse.json({ error: "Choose a valid privacy setting." }, { status: 400 });
  }

  const mediaChanges: Array<{
    key: "avatarPath" | "coverPath";
    column: "avatar_url" | "cover_image_url";
    bucket: "group-avatars" | "group-covers";
  }> = [
    { key: "avatarPath", column: "avatar_url", bucket: "group-avatars" },
    { key: "coverPath", column: "cover_image_url", bucket: "group-covers" },
  ];
  const update: Record<string, string | null> = {
    name,
    description,
    sport,
    city: city || null,
    country,
    privacy,
  };
  const oldMedia: Array<{ bucket: string; path: string }> = [];
  for (const change of mediaChanges) {
    if (!(change.key in body)) continue;
    if (body[change.key] === null) {
      update[change.column] = null;
    } else {
      const path = validatedOwnedMediaPath(body[change.key], authData.user.id, groupId);
      if (!path) {
        return NextResponse.json({ error: `Invalid ${change.key === "avatarPath" ? "avatar" : "cover"} path.` }, { status: 400 });
      }
      const verification = await confirmStagedObject(supabase, change.bucket, path);
      if (verification.error) return NextResponse.json({ error: verification.error }, { status: 400 });
      update[change.column] = supabase.storage.from(change.bucket).getPublicUrl(path).data.publicUrl;
    }
    const storedPreviousPath = storedObjectPath(group[change.column], change.bucket);
    const previousPath = validatedOwnedMediaPath(
      storedPreviousPath,
      authData.user.id,
      groupId,
    );
    if (previousPath && previousPath !== body[change.key]) {
      oldMedia.push({ bucket: change.bucket, path: previousPath });
    }
  }

  const { data: updatedData, error: updateError } = await supabase
    .from("groups")
    .update(update)
    .eq("id", groupId)
    .eq("owner_id", authData.user.id)
    .eq("updated_at", group.updated_at)
    .select("*")
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!updatedData) {
    return NextResponse.json({ error: "The group changed before it could be updated. Refresh and try again." }, { status: 409 });
  }

  const failures: Array<{ bucket: string; path: string; message: string }> = [];
  if (oldMedia.length > 0) {
    try {
      const admin = createSupabaseAdminClient();
      for (const media of oldMedia) {
        const { error } = await admin.storage.from(media.bucket).remove([media.path]);
        if (error) failures.push({ ...media, message: error.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Server configuration error.";
      failures.push(...oldMedia.map((media) => ({ ...media, message })));
    }
  }

  if (failures.length > 0) {
    return NextResponse.json({
      updatedGroupId: groupId,
      group: updatedData,
      cleanupWarning: {
        code: "OLD_MEDIA_CLEANUP_FAILED",
        message: "The group was updated, but previous media cleanup was incomplete.",
        failures,
      },
    }, { status: 207 });
  }

  return NextResponse.json({ updatedGroupId: groupId, group: updatedData });
}
