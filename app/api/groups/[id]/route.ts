import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const GROUP_MEDIA_BUCKETS = ["group-avatars", "group-covers", "group-post-images"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIST_PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
type StorageEntry = { name: string };

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

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server configuration error." },
      { status: 500 },
    );
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
  const cleanupFailures = await sweepGroupMedia(admin, groupId);
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
