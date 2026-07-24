"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ShieldHalf, SlidersHorizontal } from "lucide-react";

import { sports } from "@/data/sports";
import { useAuth } from "@/hooks/use-auth";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import type { Group, GroupListMode, GroupSort, MembershipSummary } from "@/lib/groups/types";
import { GROUP_PAGE_SIZE } from "@/lib/groups/constants";

const modes: Array<{ value: GroupListMode; label: string }> = [
  { value: "discover", label: "Discover" },
  { value: "mine", label: "My groups" },
  { value: "pending", label: "Pending" },
];

function GroupsSkeleton() {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-96 animate-pulse rounded-3xl border border-white/8 bg-white/5" />)}</div>;
}

export function GroupsDiscovery({ cleanupWarning = "" }: { cleanupWarning?: string }) {
  const router = useRouter();
  const { supabase, user, isAuthLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<GroupListMode>("discover");
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [sort, setSort] = useState<GroupSort>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const requestGeneration = useRef(0);
  const isMounted = useRef(true);

  const loadGroups = useCallback(async (reset = true, requestedGeneration?: number) => {
    if (isAuthLoading) return;
    if (!user) { router.replace("/login"); return; }
    const generation = requestedGeneration ?? ++requestGeneration.current;
    const nextPage = reset ? 0 : page + 1;
    if (generation === requestGeneration.current) {
      if (reset) setIsLoading(true);
      setError("");
    }

    const membershipQuery = supabase.from("group_members").select("id, group_id, role, status").eq("user_id", user.id);
    const groupQuery = supabase.rpc("discover_groups", {
      group_mode: mode,
      search_query: search.trim() || null,
      sport_filter: sport || null,
      city_filter: city.trim() || null,
      country_filter: country.trim() || null,
      privacy_filter: privacy || null,
      sort_order: sort,
      page_limit: GROUP_PAGE_SIZE,
      page_offset: nextPage * GROUP_PAGE_SIZE,
    });

    const [{ data: rows, error: groupsError }, { data: memberships, error: membershipError }] = await Promise.all([groupQuery, membershipQuery]);
    if (!isMounted.current || generation !== requestGeneration.current) return;
    if (groupsError || membershipError) {
      setError(groupsError?.message ?? membershipError?.message ?? "Groups could not be loaded.");
      setIsLoading(false);
      return;
    }
    const membershipMap = new Map((memberships ?? []).map((item) => [item.group_id as string, item as MembershipSummary]));
    const mapped = ((rows ?? []) as Group[]).map((row) => ({ ...row, viewer_membership: membershipMap.get(row.id) ?? null }));
    setGroups((current) => reset ? mapped : [...current, ...mapped.filter((item) => !current.some((group) => group.id === item.id))]);
    setHasMore((rows?.length ?? 0) === GROUP_PAGE_SIZE);
    setPage(nextPage);
    setIsLoading(false);
  }, [city, country, isAuthLoading, mode, page, privacy, router, search, sort, sport, supabase, user]);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const timer = window.setTimeout(() => void loadGroups(true, generation), 250);
    return () => window.clearTimeout(timer);
  }, [city, country, isAuthLoading, mode, privacy, search, sort, sport, user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      requestGeneration.current += 1;
    };
  }, []);

  const emptyCopy = useMemo(() => mode === "mine" ? ["No groups yet", "Join a community and it will appear here."] : mode === "pending" ? ["No pending requests", "Requests to private groups will appear here."] : ["No groups match", "Try removing a filter or create the community you want."], [mode]);

  return (
    <main className="min-h-svh bg-transparent">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-300">Community</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Find your people. Play together.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Discover local sports communities, trade advice, and turn shared goals into sessions.</p>
          </div>
          <Button nativeButton={false} render={<Link href="/groups/create" />} size="lg"><Plus />Create group</Button>
        </header>

        <div className="mt-9 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1.5" role="tablist" aria-label="Group views">
          {modes.map((item) => <button key={item.value} role="tab" aria-selected={mode === item.value} onClick={() => setMode(item.value)} className="min-w-max rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-white aria-selected:bg-lime-300 aria-selected:text-slate-950">{item.label}</button>)}
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-surface/75 p-4 backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(14rem,2fr)_repeat(5,minmax(0,1fr))]">
            <label className="relative min-w-0 sm:col-span-2 lg:col-span-1"><span className="sr-only">Search groups</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups…" className="w-full pl-9" /></label>
            <label className="min-w-0"><span className="sr-only">Sport</span><select value={sport} onChange={(event) => setSport(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"><option value="">All sports</option>{sports.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
            <Input aria-label="City filter" value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" className="min-w-0" />
            <Input aria-label="Country filter" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" className="min-w-0" />
            <select aria-label="Privacy filter" value={privacy} onChange={(event) => setPrivacy(event.target.value)} className="h-9 min-w-0 w-full rounded-lg border border-input bg-transparent px-3 text-sm"><option value="">Any privacy</option><option value="public">Public</option><option value="private">Private</option></select>
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-3"><span className="sr-only">Sort groups</span><SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" /><select value={sort} onChange={(event) => setSort(event.target.value as GroupSort)} className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"><option value="active">Most active</option><option value="members">Most members</option><option value="newest">Newest</option></select></label>
          </div>
        </div>

        <div className="mt-7">
          {cleanupWarning && <div role="status" className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{cleanupWarning}</div>}
          {error ? <InlineError className="justify-between"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void loadGroups(true)}>Retry</Button></InlineError> : isLoading ? <GroupsSkeleton /> : groups.length === 0 ? <EmptyState icon={ShieldHalf} title={emptyCopy[0]} description={emptyCopy[1]} action={<Button nativeButton={false} render={<Link href="/groups/create" />}><Plus />Create a group</Button>} className="rounded-3xl border border-dashed border-white/12 py-16" /> : <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{groups.map((group, index) => <GroupCard key={group.id} group={group} supabase={supabase} index={index} onMembershipChange={(membership) => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, viewer_membership: membership, member_count: Math.max(0, item.member_count + (membership?.status === "active" ? 1 : item.viewer_membership?.status === "active" ? -1 : 0)) } : item))} />)}</div>
            {hasMore && <div className="mt-8 text-center"><Button variant="outline" onClick={() => void loadGroups(false)}>Load more groups</Button></div>}
          </>}
        </div>
      </section>
    </main>
  );
}
