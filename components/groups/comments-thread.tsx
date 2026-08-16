"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { CornerDownRight, Heart, LoaderCircle, Pencil, Save, Send, Trash2, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/safety/report-dialog";
import { InlineError } from "@/components/ui/inline-error";
import { Textarea } from "@/components/ui/textarea";
import { COMMENT_PAGE_SIZE, GROUP_COMMENT_MAX } from "@/lib/groups/constants";
import type { GroupComment, GroupRole, ProfileSummary } from "@/lib/groups/types";
import { canModerate, initials, relativeTime } from "@/lib/groups/utils";

export function CommentsThread({
  supabase,
  postId,
  userId,
  currentProfile,
  viewerRole,
  isActiveMember,
  onCountChange,
}: {
  supabase: SupabaseClient;
  postId: string;
  userId: string;
  currentProfile: ProfileSummary | null;
  viewerRole: GroupRole | null;
  isActiveMember: boolean;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<GroupComment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<GroupComment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const load = useCallback(async (nextPage = 0) => {
    await Promise.resolve();
    if (nextPage === 0) setIsLoading(true);
    const { data: rootRows, error: rootsError } = await supabase
      .from("group_post_comments")
      .select("*")
      .eq("post_id", postId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .range(nextPage * COMMENT_PAGE_SIZE, (nextPage + 1) * COMMENT_PAGE_SIZE - 1);
    if (rootsError) { setError("Comments could not be loaded. Please try again."); setIsLoading(false); return; }
    const roots = rootRows ?? [];
    const rootIds = roots.map((item) => item.id);
    const { data: replyRows, error: repliesError } = rootIds.length
      ? await supabase
          .from("group_post_comments")
          .select("*")
          .in("parent_comment_id", rootIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };
    if (repliesError) { setError("Replies could not be loaded. Please try again."); setIsLoading(false); return; }
    const rows = [...roots, ...(replyRows ?? [])];
    const authorIds = [...new Set(rows.map((item) => item.author_id))];
    const commentIds = rows.map((item) => item.id);
    const [{ data: profiles }, { data: likes }] = await Promise.all([
      authorIds.length ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds) : Promise.resolve({ data: [] }),
      commentIds.length ? supabase.from("group_comment_likes").select("comment_id").eq("user_id", userId).in("comment_id", commentIds) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileSummary]));
    const liked = new Set((likes ?? []).map((item) => item.comment_id));
    const mapped = rows.map((row) => ({ ...row, author: profileMap.get(row.author_id) ?? null, viewer_has_liked: liked.has(row.id) })) as GroupComment[];
    setComments((current) => nextPage === 0 ? mapped : [...current, ...mapped.filter((item) => !current.some((existing) => existing.id === item.id))]);
    setHasMore(roots.length === COMMENT_PAGE_SIZE);
    setPage(nextPage);
    setIsLoading(false);
  }, [postId, supabase, userId]);
  // The effect synchronizes the thread with its post id.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase
      .channel(`group-comments:${postId}:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_post_comments", filter: `post_id=eq.${postId}` }, async (payload) => {
        const row = payload.new as Omit<GroupComment, "author" | "viewer_has_liked">;
        if (row.author_id === userId) return;
        const { data: author } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", row.author_id).maybeSingle();
        const incoming = { ...row, author: (author as ProfileSummary | null) ?? null, viewer_has_liked: false } as GroupComment;
        setComments((current) => {
          if (current.some((comment) => comment.id === incoming.id)) return current;
          if (incoming.parent_comment_id && !current.some((comment) => comment.id === incoming.parent_comment_id)) return current;
          return incoming.parent_comment_id ? [...current, incoming] : [incoming, ...current];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_post_comments", filter: `post_id=eq.${postId}` }, (payload) => {
        const row = payload.new as Omit<GroupComment, "author" | "viewer_has_liked">;
        setComments((current) => current.map((comment) => comment.id === row.id ? { ...comment, ...row } : comment));
      })
      // With the default replica identity, DELETE payloads contain the primary
      // key but not post_id. Listen at table scope and reject IDs not loaded by
      // this thread instead of requiring REPLICA IDENTITY FULL.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_post_comments" }, (payload) => {
        const deletedId = (payload.old as { id?: string }).id;
        if (!deletedId) return;
        setComments((current) => {
          if (!current.some((comment) => comment.id === deletedId)) return current;
          return current.filter((comment) => comment.id !== deletedId && comment.parent_comment_id !== deletedId);
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [postId, supabase, userId]);

  const ordered = useMemo(() => {
    const roots = comments.filter((comment) => !comment.parent_comment_id);
    const replies = comments.filter((comment) => comment.parent_comment_id);
    return roots.flatMap((root) => [root, ...replies.filter((reply) => reply.parent_comment_id === root.id)]);
  }, [comments]);

  async function submit() {
    if (!isActiveMember) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    setIsSubmitting(true); setError("");
    const optimistic: GroupComment = { id: `optimistic-${crypto.randomUUID()}`, post_id: postId, author_id: userId, parent_comment_id: replyTo?.id ?? null, content: trimmed, like_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), author: currentProfile, viewer_has_liked: false };
    setComments((current) => [optimistic, ...current]);
    onCountChange(1);
    setContent(""); setReplyTo(null);
    const { data, error: insertError } = await supabase.from("group_post_comments").insert({ post_id: postId, author_id: userId, parent_comment_id: optimistic.parent_comment_id, content: trimmed }).select("*").single();
    if (insertError) {
      setComments((current) => current.filter((item) => item.id !== optimistic.id));
      onCountChange(-1); setContent(trimmed); setError("Your comment could not be posted. Please try again.");
    } else setComments((current) => current.map((item) => item.id === optimistic.id ? { ...(data as GroupComment), author: currentProfile, viewer_has_liked: false } : item));
    setIsSubmitting(false);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void submit(); }
  }
  async function toggleLike(comment: GroupComment) {
    if (!isActiveMember) return;
    const liked = comment.viewer_has_liked;
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, viewer_has_liked: !liked, like_count: Math.max(0, item.like_count + (liked ? -1 : 1)) } : item));
    const result = liked ? await supabase.from("group_comment_likes").delete().eq("comment_id", comment.id).eq("user_id", userId) : await supabase.from("group_comment_likes").insert({ comment_id: comment.id, user_id: userId });
    if (result.error) { setComments((current) => current.map((item) => item.id === comment.id ? comment : item)); setError("The comment could not be liked. Please try again."); }
  }
  async function remove(comment: GroupComment) {
    if (!window.confirm("Delete this comment?")) return;
    const { error: deleteError } = await supabase.from("group_post_comments").delete().eq("id", comment.id);
    if (deleteError) { setError("The comment could not be deleted. Please try again."); return; }
    const removed = comments.filter((item) => item.id === comment.id || item.parent_comment_id === comment.id).length;
    setComments((current) => current.filter((item) => item.id !== comment.id && item.parent_comment_id !== comment.id));
    onCountChange(-removed);
  }
  async function saveEdit(comment: GroupComment) {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    const { data, error: updateError } = await supabase.from("group_post_comments").update({ content: trimmed }).eq("id", comment.id).select("*").single();
    if (updateError) { setError("The comment could not be updated. Please try again."); return; }
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, ...(data as GroupComment) } : item));
    setEditingId(null); setEditDraft("");
  }

  return (
    <div id={`comments-${postId}`} className="border-t border-white/8 px-4 py-4 sm:px-5">
      {error && <InlineError className="mb-3">{error}</InlineError>}
      {isActiveMember ? <div className="flex gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lime-300/15 text-xs font-bold text-lime-300">{initials(currentProfile?.display_name ?? "Athlete")}</span>
        <div className="min-w-0 flex-1">
          {replyTo && <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Replying to {replyTo.author?.display_name ?? "Athlete"}</span><button onClick={() => setReplyTo(null)} className="hover:text-white">Cancel</button></div>}
          <Textarea aria-label={replyTo ? "Write a reply" : "Write a comment"} value={content} maxLength={GROUP_COMMENT_MAX} rows={2} onKeyDown={handleKeyDown} onChange={(event) => setContent(event.target.value)} placeholder={replyTo ? "Write a reply…" : "Add a comment…"} />
          <div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Ctrl/⌘ + Enter to send</span><Button size="sm" onClick={() => void submit()} disabled={isSubmitting || !content.trim()}><Send />{isSubmitting ? "Sending…" : "Comment"}</Button></div>
        </div>
      </div> : <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted-foreground">Join the group to interact.</p>}
      {isLoading ? <div className="flex items-center justify-center py-6 text-sm text-muted-foreground"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading comments…</div> : (
        <div className="mt-5 space-y-4">
          {ordered.map((comment) => {
            const isReply = Boolean(comment.parent_comment_id);
            return <article key={comment.id} className={isReply ? "ml-8 border-l border-white/10 pl-3 sm:ml-11" : ""}>
              <div className="flex gap-2.5">
                <Link href={`/players/${comment.author_id}`} className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/8 text-xs font-bold text-lime-300">{initials(comment.author?.display_name ?? "Athlete")}</Link>
                <div className="min-w-0 flex-1 rounded-2xl bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs"><Link href={`/players/${comment.author_id}`} className="font-semibold hover:text-lime-300">{comment.author?.display_name ?? "Athlink member"}</Link><time className="text-muted-foreground" dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time></div>
                  {editingId === comment.id ? <div className="mt-2"><Textarea aria-label="Edit comment" value={editDraft} maxLength={GROUP_COMMENT_MAX} rows={2} onChange={(event) => setEditDraft(event.target.value)} /><div className="mt-1 flex justify-end gap-1"><Button size="xs" variant="ghost" onClick={() => setEditingId(null)}><X />Cancel</Button><Button size="xs" onClick={() => void saveEdit(comment)}><Save />Save</Button></div></div> : <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{comment.content}</p>}
                </div>
              </div>
              <div className="mt-1 ml-10 flex items-center gap-1">
                {isActiveMember ? <Button size="xs" variant="ghost" aria-label={`${comment.viewer_has_liked ? "Unlike" : "Like"} comment`} onClick={() => void toggleLike(comment)} className={comment.viewer_has_liked ? "text-lime-300" : ""}><Heart className={comment.viewer_has_liked ? "fill-current" : ""} />{comment.like_count || "Like"}</Button> : comment.like_count > 0 && <span className="px-2 text-xs text-muted-foreground">{comment.like_count} likes</span>}
                {isActiveMember && !isReply && <Button size="xs" variant="ghost" onClick={() => setReplyTo(comment)}><CornerDownRight />Reply</Button>}
                {comment.author_id === userId && <Button size="icon-xs" variant="ghost" aria-label="Edit comment" onClick={() => { setEditingId(comment.id); setEditDraft(comment.content); }}><Pencil /></Button>}
                {(comment.author_id === userId || canModerate(viewerRole)) && <Button size="icon-xs" variant="ghost" aria-label="Delete comment" onClick={() => void remove(comment)}><Trash2 /></Button>}
                <ReportDialog targetType="comment" targetId={comment.id} label="Report comment" />
              </div>
            </article>;
          })}
          {hasMore && <Button variant="ghost" size="sm" onClick={() => void load(page + 1)}>Load more comments</Button>}
        </div>
      )}
    </div>
  );
}
