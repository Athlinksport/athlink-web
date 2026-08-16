import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const OWNED_BUCKETS = ["avatars", "group-avatars", "group-covers", "group-post-images"] as const;

async function listOwnedObjects(admin: ReturnType<typeof createSupabaseAdminClient>, bucket: string, root: string) {
  const files: string[] = [];
  const pending = [root];
  while (pending.length) {
    const prefix = pending.pop()!;
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw error;
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) files.push(path);
      else pending.push(path);
    }
  }
  return files;
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { confirmation?: string } | null;
  if (body?.confirmation !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const cleanupWarnings: string[] = [];

  const { error: ownedGroupsError } = await admin
    .from("groups")
    .delete()
    .eq("owner_id", user.id);
  if (ownedGroupsError) {
    return NextResponse.json(
      { error: "Owned groups could not be removed, so account deletion was stopped." },
      { status: 502 },
    );
  }

  for (const bucket of OWNED_BUCKETS) {
    let paths: string[];
    try {
      paths = await listOwnedObjects(admin, bucket, user.id);
    } catch {
      cleanupWarnings.push(`${bucket}: could not list objects`);
      continue;
    }
    if (paths.length) {
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) cleanupWarnings.push(`${bucket}: could not remove all objects`);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Account deletion failed.", cleanupWarnings }, { status: 502 });
  return NextResponse.json({ deleted: true, cleanupWarnings });
}
