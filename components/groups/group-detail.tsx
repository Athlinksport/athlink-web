"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, Info, LockKeyhole, MapPin, MessageSquareText, Pencil, ShieldAlert, Trash2, UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { GroupAvatar } from "@/components/groups/group-avatar";
import { MembershipButton } from "@/components/groups/membership-button";
import { MembersPanel } from "@/components/groups/members-panel";
import { PostCard } from "@/components/groups/post-card";
import { PostComposer } from "@/components/groups/post-composer";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/inline-error";
import { GROUP_POST_IMAGE_REFRESH_MS, GROUP_POST_IMAGE_SIGNED_URL_TTL_SECONDS, POST_PAGE_SIZE } from "@/lib/groups/constants";
import type { Group, GroupPost, GroupRole, MembershipSummary, ProfileSummary } from "@/lib/groups/types";
import { groupPostImagePath, relativeTime } from "@/lib/groups/utils";

type DetailTab = "feed" | "about" | "members";

export function GroupDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, user, isAuthLoading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [membership, setMembership] = useState<MembershipSummary | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileSummary | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ProfileSummary | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [tab, setTab] = useState<DetailTab>("feed");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const groupDeletionInProgress = useRef(false);
  const postsRef = useRef(posts);
  const signedUrlRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const signedUrlRefreshInFlightRef = useRef(false);
  const componentMountedRef = useRef(true);
  const groupId = params.id;
  const viewerRole: GroupRole | null = membership?.status === "active" ? membership.role : null;
  const isActiveMember = membership?.status === "active";

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const loadPosts = useCallback(async (nextPage = 0) => {
    await Promise.resolve();
    if (!user) return;
    setIsPostsLoading(true);
    const { data, error: postsError } = await supabase.from("group_posts").select("*").eq("group_id", groupId).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).range(nextPage * POST_PAGE_SIZE, (nextPage + 1) * POST_PAGE_SIZE - 1);
    if (postsError) { setError(postsError.message); setIsPostsLoading(false); return; }
    const rows = data ?? [];
    const authorIds = [...new Set(rows.map((post) => post.author_id))];
    const postIds = rows.map((post) => post.id);
    const [{ data: profiles }, { data: memberRoles }, { data: likes }] = await Promise.all([
      authorIds.length ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds) : Promise.resolve({ data: [] }),
      authorIds.length ? supabase.from("group_members").select("user_id, role").eq("group_id", groupId).eq("status", "active").in("user_id", authorIds) : Promise.resolve({ data: [] }),
      postIds.length ? supabase.from("group_post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileSummary]));
    const roleMap = new Map((memberRoles ?? []).map((member) => [member.user_id, member.role as GroupRole]));
    const liked = new Set((likes ?? []).map((like) => like.post_id));
    const signedImageEntries = await Promise.all(rows.map(async (post) => {
      if (!post.image_url) return [post.id, null] as const;
      const { data: signedImage, error: signedImageError } = await supabase.storage
        .from("group-post-images")
        .createSignedUrl(groupPostImagePath(post.image_url), GROUP_POST_IMAGE_SIGNED_URL_TTL_SECONDS);
      return [post.id, signedImageError ? null : signedImage.signedUrl] as const;
    }));
    const signedImageMap = new Map(signedImageEntries);
    const mapped = rows.map((post) => ({ ...post, image_url: signedImageMap.get(post.id) ?? null, author: profileMap.get(post.author_id) ?? null, author_role: roleMap.get(post.author_id) ?? null, viewer_has_liked: liked.has(post.id) })) as GroupPost[];
    setPosts((current) => nextPage === 0 ? mapped : [...current, ...mapped.filter((post) => !current.some((existing) => existing.id === post.id))]);
    setHasMore(rows.length === POST_PAGE_SIZE); setPage(nextPage); setIsPostsLoading(false);
  }, [groupId, supabase, user]);

  const loadSignedPostImages = useCallback(async (currentPosts: GroupPost[]) => {
    return Promise.all(currentPosts.map(async (post) => {
      if (!post.image_url) return post;

      const { data, error: signedImageError } = await supabase.storage
        .from("group-post-images")
        .createSignedUrl(
          groupPostImagePath(post.image_url),
          GROUP_POST_IMAGE_SIGNED_URL_TTL_SECONDS,
        );

      return signedImageError ? post : { ...post, image_url: data.signedUrl };
    }));
  }, [supabase]);

  const refreshAllPostSignedUrls = useCallback(async () => {
    if (signedUrlRefreshInFlightRef.current) {
      return;
    }

    signedUrlRefreshInFlightRef.current = true;

    try {
      const refreshedPosts = await loadSignedPostImages(postsRef.current);

      if (componentMountedRef.current) {
        setPosts(refreshedPosts);
        postsRef.current = refreshedPosts;
      }
    } finally {
      signedUrlRefreshInFlightRef.current = false;
    }
  }, [loadSignedPostImages]);

  const loadGroup = useCallback(async () => {
    await Promise.resolve();
    if (isAuthLoading) return;
    if (!user) { router.replace("/login"); return; }
    setIsLoading(true); setError(""); setAccessDenied(false);
    const [{ data: groupData, error: groupError }, { data: membershipData }, { data: profileData }] = await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
      supabase.from("group_members").select("id, role, status").eq("group_id", groupId).eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("id, display_name, avatar_url").eq("id", user.id).maybeSingle(),
    ]);
    if (groupError) { setError(groupError.message); setIsLoading(false); return; }
    if (!groupData) {
      const { data: membershipProbe } = await supabase.from("group_members").select("id, role, status").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
      setMembership((membershipProbe as MembershipSummary | null) ?? null);
      setAccessDenied(Boolean(membershipProbe)); setIsLoading(false); return;
    }
    const loadedGroup = groupData as Group;
    setGroup(loadedGroup); setMembership((membershipData as MembershipSummary | null) ?? null); setCurrentProfile((profileData as ProfileSummary | null) ?? null);
    const { data: ownerData } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", loadedGroup.owner_id).maybeSingle();
    setOwnerProfile((ownerData as ProfileSummary | null) ?? null);
    setIsLoading(false);
  }, [groupId, isAuthLoading, router, supabase, user]);

  // These effects synchronize remote group/feed state with the route and membership.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadGroup(); }, [loadGroup]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (group && (group.privacy === "public" || isActiveMember)) void loadPosts(0); }, [group, isActiveMember, loadPosts]);
  useEffect(() => {
    if (!user || !group) return;
    const channel = supabase.channel(`group:${groupId}:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_posts", filter: `group_id=eq.${groupId}` }, () => { void loadPosts(0); })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, (payload) => {
        const row = (payload.new || payload.old) as { user_id?: string };
        if (row.user_id === user.id) void loadGroup();
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [group, groupId, loadGroup, loadPosts, supabase, user]);
  useEffect(() => {
    componentMountedRef.current = true;

    const scheduleNextRefresh = () => {
      if (signedUrlRefreshTimerRef.current) {
        clearTimeout(signedUrlRefreshTimerRef.current);
      }

      signedUrlRefreshTimerRef.current = setTimeout(async () => {
        await refreshAllPostSignedUrls();

        if (componentMountedRef.current) {
          scheduleNextRefresh();
        }
      }, GROUP_POST_IMAGE_REFRESH_MS);
    };

    scheduleNextRefresh();

    return () => {
      componentMountedRef.current = false;

      if (signedUrlRefreshTimerRef.current) {
        clearTimeout(signedUrlRefreshTimerRef.current);
        signedUrlRefreshTimerRef.current = null;
      }
    };
  }, [refreshAllPostSignedUrls]);

  function reconcileCreated(post: GroupPost) {
    if (post.content.startsWith("__ROLLBACK__")) {
      const id = post.content.slice("__ROLLBACK__".length);
      setPosts((current) => current.filter((item) => item.id !== id));
      return;
    }
    if (post.content.startsWith("__REPLACE__")) {
      const payload = post.content.slice("__REPLACE__".length);
      const separatorIndex = payload.indexOf("__CONTENT__");
      const optimisticId = payload.slice(0, separatorIndex);
      const content = payload.slice(separatorIndex + "__CONTENT__".length);
      setPosts((current) => current.map((item) => item.id === optimisticId ? { ...post, content } : item));
      return;
    }
    setPosts((current) => current.some((item) => item.id === post.id) ? current : [post, ...current]);
  }
  async function deleteGroup() {
    if (groupDeletionInProgress.current) return;
    if (!window.confirm(`Permanently delete ${group?.name ?? "this group"} and all posts, comments, and memberships? This cannot be undone.`)) return;
    groupDeletionInProgress.current = true;
    setIsDeletingGroup(true);
    setError(""); setWarning("");
    try {
      const response = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      const result = await response.json() as {
        deletedGroupId?: string;
        error?: string;
        cleanupWarning?: { message: string };
      };
      if (result.deletedGroupId === groupId) {
        const warningQuery = result.cleanupWarning?.message
          ? `?cleanupWarning=${encodeURIComponent(result.cleanupWarning.message)}`
          : "";
        router.replace(`/groups${warningQuery}`);
        return;
      }
      if (!response.ok) {
        setError(result.error ?? "The group could not be deleted.");
        return;
      }
      setError("The group deletion response could not be confirmed.");
    } catch {
      setError("The group could not be deleted. Check your connection and try again.");
    } finally {
      groupDeletionInProgress.current = false;
      setIsDeletingGroup(false);
    }
  }
  const tabs = useMemo(() => [
    { value: "feed" as const, label: "Feed", icon: MessageSquareText },
    { value: "about" as const, label: "About", icon: Info },
    { value: "members" as const, label: "Members", icon: UsersRound },
  ], []);

  if (isLoading) return <main className="mx-auto min-h-svh max-w-7xl px-4 py-10 sm:px-6"><div className="h-64 animate-pulse rounded-3xl bg-white/5" /><div className="mx-auto mt-6 h-96 max-w-3xl animate-pulse rounded-3xl bg-white/5" /></main>;
  if (!group) return <main className="grid min-h-[70svh] place-items-center px-4"><EmptyState icon={accessDenied ? LockKeyhole : ShieldAlert} title={accessDenied ? "This group is private" : "Group not found"} description={accessDenied ? "Only active members can view this private group. If you requested access, an admin must approve it first." : "It may have been deleted or the link is no longer valid."} action={<Button nativeButton={false} render={<Link href="/groups" />}><ArrowLeft />Browse groups</Button>} className="rounded-3xl border border-white/10 px-8" /></main>;

  const privateLocked = group.privacy === "private" && !isActiveMember;
  const imageWarning = searchParams.get("imageWarning");
  return (
    <main className="min-h-svh bg-transparent pb-16">
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8">
        <Button nativeButton={false} render={<Link href="/groups" />} variant="ghost"><ArrowLeft />All groups</Button>
        <header className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-elevated">
          <div className="relative h-52 bg-gradient-to-br from-lime-300/15 via-cyan-400/10 to-slate-950 sm:h-72">
            {group.cover_image_url && <Image src={group.cover_image_url} alt={`${group.name} cover`} fill priority sizes="100vw" className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
          </div>
          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4"><GroupAvatar name={group.name} url={group.avatar_url} size="xl" /><div className="min-w-0 pb-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-lime-300/15 px-2.5 py-1 text-xs font-semibold text-lime-300">{group.sport}</span><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs capitalize"><LockKeyhole className="size-3" />{group.privacy}</span></div><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">{group.name}</h1></div></div>
              <div className="flex flex-wrap gap-2">{viewerRole === "owner" && <Button nativeButton={false} render={<Link href={`/groups/${group.id}/edit`} />} variant="outline"><Pencil />Edit group</Button>}<MembershipButton supabase={supabase} groupId={group.id} privacy={group.privacy} membership={membership} onChange={(next) => { const wasActive = membership?.status === "active"; const isNowActive = next?.status === "active"; setMembership(next); if (wasActive !== isNowActive) setGroup((current) => current ? { ...current, member_count: Math.max(0, current.member_count + (isNowActive ? 1 : -1)) } : current); }} /></div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{group.description}</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{[group.city, group.country].filter(Boolean).join(", ")}</span><span className="inline-flex items-center gap-1.5"><UsersRound className="size-4" />{group.member_count} members</span><span className="inline-flex items-center gap-1.5"><FileText className="size-4" />{group.post_count} posts</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />Created {relativeTime(group.created_at)}</span></div>
          </div>
        </header>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-surface/75 p-1.5" role="tablist" aria-label="Group sections">
          {tabs.map(({ value, label, icon: Icon }) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-white aria-selected:bg-lime-300 aria-selected:text-slate-950"><Icon className="size-4" />{label}</button>)}
        </div>

        {error && <InlineError className="mt-5">{error}</InlineError>}
        {warning && <div role="status" className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{warning}</div>}
        {imageWarning && <div role="status" className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{imageWarning}</div>}
        <div className="mt-6">
          {privateLocked ? <EmptyState icon={LockKeyhole} title={membership?.status === "pending" ? "Request awaiting approval" : "Members-only group"} description="The feed, member list, and full group details are available to active members." className="rounded-3xl border border-white/10 py-16" /> : tab === "feed" ? <div className="mx-auto max-w-3xl space-y-5">
            {isActiveMember && user && <PostComposer supabase={supabase} groupId={group.id} userId={user.id} profile={currentProfile} onCreated={reconcileCreated} />}
            {isPostsLoading && posts.length === 0 ? Array.from({ length: 3 }, (_, index) => <div key={index} className="h-60 animate-pulse rounded-3xl bg-white/5" />) : posts.length === 0 ? <EmptyState icon={MessageSquareText} title="The feed is ready" description={isActiveMember ? "Be the first member to start a conversation." : "Join the group to publish the first post."} className="rounded-3xl border border-dashed border-white/10 py-14" /> : posts.map((post) => <PostCard key={post.id} post={post} supabase={supabase} userId={user?.id ?? ""} currentProfile={currentProfile} viewerRole={viewerRole} isActiveMember={isActiveMember} onUpdate={(next) => setPosts((current) => current.map((item) => item.id === next.id ? next : item))} onDelete={(id, cleanupWarning) => { setPosts((current) => current.filter((item) => item.id !== id)); if (cleanupWarning) setWarning(cleanupWarning); }} />)}
            {hasMore && <div className="text-center"><Button variant="outline" onClick={() => void loadPosts(page + 1)} disabled={isPostsLoading}>{isPostsLoading ? "Loading…" : "Load more posts"}</Button></div>}
          </div> : tab === "about" ? <div className="grid gap-5 lg:grid-cols-[1fr_22rem]"><div className="rounded-3xl border border-white/10 bg-surface/80 p-6"><h2 className="text-xl font-bold">About {group.name}</h2><p className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">{group.description}</p>{viewerRole === "owner" && <div className="mt-8 border-t border-white/10 pt-6"><h3 className="font-semibold text-destructive">Danger zone</h3><p className="mt-1 text-sm text-muted-foreground">Deleting a group permanently removes its community content.</p><Button variant="destructive" className="mt-3" disabled={isDeletingGroup} onClick={() => void deleteGroup()}><Trash2 />{isDeletingGroup ? "Deleting group…" : "Delete group"}</Button></div>}</div><aside className="rounded-3xl border border-white/10 bg-white/5 p-5"><h2 className="font-semibold">Group owner</h2><Link href={`/players/${group.owner_id}`} className="mt-4 flex items-center gap-3 rounded-2xl bg-white/5 p-3 hover:bg-white/8"><GroupAvatar name={ownerProfile?.display_name ?? "Athlete"} url={ownerProfile?.avatar_url ?? null} size="sm" /><span><span className="block font-medium">{ownerProfile?.display_name ?? "Athlink member"}</span><span className="text-xs text-muted-foreground">Owner</span></span></Link></aside></div> : user && <MembersPanel supabase={supabase} groupId={group.id} userId={user.id} viewerRole={viewerRole} onOwnershipTransfer={(newOwnerId) => { setGroup((current) => current ? { ...current, owner_id: newOwnerId } : current); setMembership((current) => current ? { ...current, role: "admin" } : current); }} />}
        </div>
      </section>
    </main>
  );
}
