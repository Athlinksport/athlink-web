"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, Pin, Save, Trash2, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CommentsThread } from "@/components/groups/comments-thread";
import { ReportDialog } from "@/components/safety/report-dialog";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupPost, GroupRole, ProfileSummary } from "@/lib/groups/types";
import { canModerate, initials, relativeTime } from "@/lib/groups/utils";

export function PostCard({
  post,
  supabase,
  userId,
  currentProfile,
  viewerRole,
  isActiveMember,
  onUpdate,
  onDelete,
}: {
  post: GroupPost;
  supabase: SupabaseClient;
  userId: string;
  currentProfile: ProfileSummary | null;
  viewerRole: GroupRole | null;
  isActiveMember: boolean;
  onUpdate: (post: GroupPost) => void;
  onDelete: (postId: string, cleanupWarning?: string) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deletionInProgress = useRef(false);
  const authorized = post.author_id === userId || canModerate(viewerRole);

  async function toggleLike() {
    if (!isActiveMember) return;
    const next = { ...post, viewer_has_liked: !post.viewer_has_liked, like_count: Math.max(0, post.like_count + (post.viewer_has_liked ? -1 : 1)) };
    onUpdate(next);
    const result = post.viewer_has_liked ? await supabase.from("group_post_likes").delete().eq("post_id", post.id).eq("user_id", userId) : await supabase.from("group_post_likes").insert({ post_id: post.id, user_id: userId });
    if (result.error) { onUpdate(post); setError("The post reaction could not be updated. Please try again."); }
  }
  async function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const { data, error: updateError } = await supabase.from("group_posts").update({ content: trimmed }).eq("id", post.id).select("*").single();
    if (updateError) setError("The post could not be updated. Please try again.");
    else { onUpdate({ ...post, ...(data as GroupPost), image_url: post.image_url }); setEditing(false); }
  }
  async function remove() {
    if (deletionInProgress.current) return;
    if (!window.confirm("Delete this post and all of its comments?")) return;
    deletionInProgress.current = true;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/groups/posts/${post.id}`, { method: "DELETE" });
      const result = await response.json() as {
        deletedPostId?: string;
        error?: string;
        cleanupWarning?: { message: string };
      };
      if (result.deletedPostId === post.id) {
        onDelete(post.id, result.cleanupWarning?.message);
        return;
      }
      if (!response.ok) {
        setError(result.error ?? "The post could not be deleted.");
        return;
      }
      setError("The post deletion response could not be confirmed.");
    } catch {
      setError("The post could not be deleted. Check your connection and try again.");
    } finally {
      deletionInProgress.current = false;
      setIsDeleting(false);
    }
  }
  async function togglePin() {
    const { data, error: pinError } = await supabase.rpc("set_group_post_pinned", { target_post: post.id, pinned: !post.is_pinned });
    if (pinError) setError("The post pin could not be updated. Please try again."); else onUpdate({ ...post, ...(data as GroupPost), image_url: post.image_url });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-surface/85 shadow-surface">
      <div className="p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <Link href={`/players/${post.author_id}`} className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lime-300/15 text-sm font-bold text-lime-300">{initials(post.author?.display_name ?? "Athlete")}</Link>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/players/${post.author_id}`} className="truncate font-semibold hover:text-lime-300">{post.author?.display_name ?? "Athlink member"}</Link>{post.author_role && post.author_role !== "member" && <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-200">{post.author_role}</span>}{post.is_pinned && <span className="inline-flex items-center gap-1 text-xs text-lime-300"><Pin className="size-3" />Pinned</span>}</div><time dateTime={post.created_at} className="text-xs text-muted-foreground">{relativeTime(post.created_at)}{post.updated_at !== post.created_at ? " · edited" : ""}</time></div>
          </div>
          {authorized && <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Post actions" disabled={isDeleting} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end">{post.author_id === userId && <DropdownMenuItem onClick={() => setEditing(true)}>Edit post</DropdownMenuItem>}{canModerate(viewerRole) && <DropdownMenuItem onClick={() => void togglePin()}>{post.is_pinned ? "Unpin post" : "Pin post"}</DropdownMenuItem>}<DropdownMenuItem variant="destructive" disabled={isDeleting} onClick={() => void remove()}><Trash2 />{isDeleting ? "Deleting…" : "Delete post"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
        </header>
        {error && <InlineError className="mt-3">{error}</InlineError>}
        {editing ? <div className="mt-4"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} maxLength={5000} /><div className="mt-2 flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(post.content); }}><X />Cancel</Button><Button size="sm" onClick={() => void save()}><Save />Save</Button></div></div> : <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-6">{post.content}</p>}
        {post.image_url && <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-2xl bg-slate-900"><Image src={post.image_url} alt="Image shared with this post" fill sizes="(max-width: 768px) 100vw, 700px" className="object-cover" /></div>}
      </div>
      <div className="flex items-center gap-1 border-t border-white/8 px-3 py-2">
        {isActiveMember ? <Button variant="ghost" size="sm" aria-label={`${post.viewer_has_liked ? "Unlike" : "Like"} post`} onClick={() => void toggleLike()} className={post.viewer_has_liked ? "text-lime-300" : ""}><Heart className={post.viewer_has_liked ? "fill-current" : ""} />{post.like_count} {post.like_count === 1 ? "like" : "likes"}</Button> : <span className="px-3 py-2 text-sm text-muted-foreground">{post.like_count} {post.like_count === 1 ? "like" : "likes"}</span>}
        <Button variant="ghost" size="sm" aria-expanded={commentsOpen} aria-controls={`comments-${post.id}`} onClick={() => setCommentsOpen((value) => !value)}><MessageCircle />{post.comment_count} comments</Button>
        <ReportDialog targetType="post" targetId={post.id} />
      </div>
      {commentsOpen && <CommentsThread supabase={supabase} postId={post.id} userId={userId} currentProfile={currentProfile} viewerRole={viewerRole} isActiveMember={isActiveMember} onCountChange={(delta) => onUpdate({ ...post, comment_count: Math.max(0, post.comment_count + delta) })} />}
    </article>
  );
}
