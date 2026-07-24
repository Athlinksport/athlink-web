import { NextResponse } from "next/server";

import { validatedGroupPostImagePath } from "@/lib/groups/utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PostForDeletion = {
  id: string;
  group_id: string;
  author_id: string;
  image_url: string | null;
  updated_at: string;
};

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: postData, error: postError } = await supabase
    .from("group_posts")
    .select("id, group_id, author_id, image_url, updated_at")
    .eq("id", postId)
    .maybeSingle();
  if (postError) return NextResponse.json({ error: postError.message }, { status: 500 });
  if (!postData) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const post = postData as PostForDeletion;
  let authorized = post.author_id === authData.user.id;
  if (!authorized) {
    const { data: canModerate, error: roleError } = await supabase.rpc("can_moderate_group", {
      target_group: post.group_id,
    });
    if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });
    authorized = canModerate === true;
  }
  if (!authorized) {
    return NextResponse.json({ error: "You are not allowed to delete this post." }, { status: 403 });
  }

  const imagePath = post.image_url
    ? validatedGroupPostImagePath(post.image_url, post.author_id, post.group_id)
    : null;
  if (post.image_url && !imagePath) {
    return NextResponse.json({ error: "The post has an invalid image reference." }, { status: 409 });
  }

  let deleteQuery = supabase
    .from("group_posts")
    .delete()
    .eq("id", post.id)
    .eq("updated_at", post.updated_at);
  deleteQuery = post.image_url
    ? deleteQuery.eq("image_url", post.image_url)
    : deleteQuery.is("image_url", null);
  const { data: deletedPost, error: deleteError } = await deleteQuery.select("id").maybeSingle();
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (!deletedPost) {
    return NextResponse.json(
      { error: "The post changed before deletion. Refresh and try again." },
      { status: 409 },
    );
  }

  if (imagePath) {
    let cleanupError = "";
    try {
      const admin = createSupabaseAdminClient();
      const { error: storageError } = await admin.storage.from("group-post-images").remove([imagePath]);
      cleanupError = storageError?.message ?? "";
    } catch (error) {
      cleanupError = error instanceof Error ? error.message : "Unknown Storage cleanup error.";
    }
    if (cleanupError) {
      const cleanupWarning = {
        code: "MEDIA_CLEANUP_FAILED",
        message: "The post was deleted, but its image cleanup was incomplete.",
        details: { bucket: "group-post-images", path: imagePath },
      };
      console.error("Post image cleanup failed after database deletion.", {
        postId: post.id,
        storageError: cleanupError,
        ...cleanupWarning.details,
      });
      return NextResponse.json(
        { deletedPostId: deletedPost.id, cleanupWarning },
        { status: 207 },
      );
    }
  }

  return NextResponse.json({ deletedPostId: deletedPost.id });
}
