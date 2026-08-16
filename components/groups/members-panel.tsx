"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Crown, MapPin, Shield, Trash2, UserRoundX, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/inline-error";
import { MEMBER_PAGE_SIZE } from "@/lib/groups/constants";
import type { GroupMember, GroupRole, ProfileSummary } from "@/lib/groups/types";
import { canManageMembers, initials } from "@/lib/groups/utils";

export function MembersPanel({
  supabase,
  groupId,
  userId,
  viewerRole,
  onOwnershipTransfer,
}: {
  supabase: SupabaseClient;
  groupId: string;
  userId: string;
  viewerRole: GroupRole | null;
  onOwnershipTransfer: (newOwnerId: string) => void;
}) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const canManage = canManageMembers(viewerRole);

  const load = useCallback(async (nextPage = 0) => {
    await Promise.resolve();
    if (nextPage === 0) setIsLoading(true);
    setError("");
    let query = supabase.from("group_members").select("*").eq("group_id", groupId).order("role").order("joined_at").range(nextPage * MEMBER_PAGE_SIZE, (nextPage + 1) * MEMBER_PAGE_SIZE - 1);
    if (!canManage) query = query.eq("status", "active");
    const { data, error: membersError } = await query;
    if (membersError) { setError("Group members could not be loaded. Please try again."); setIsLoading(false); return; }
    const rows = data ?? [];
    const ids = rows.map((row) => row.user_id);
    const [{ data: profiles }, { data: sports }] = await Promise.all([
      ids.length ? supabase.from("profiles").select("id, display_name, avatar_url, city_name, country_name").in("id", ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from("user_sports").select("user_id, sport_name").in("user_id", ids) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileSummary]));
    const mapped = rows.map((row) => ({ ...row, profile: profileMap.get(row.user_id) ?? null, sports: (sports ?? []).filter((sport) => sport.user_id === row.user_id).map((sport) => sport.sport_name).slice(0, 3) })) as GroupMember[];
    setMembers((current) => nextPage === 0 ? mapped : [...current, ...mapped.filter((item) => !current.some((existing) => existing.id === item.id))]);
    setHasMore(rows.length === MEMBER_PAGE_SIZE); setPage(nextPage); setIsLoading(false);
  }, [canManage, groupId, supabase]);
  // The effect synchronizes the member page with the active group.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function manage(member: GroupMember, action: "approve" | "reject" | "remove" | "role", role?: GroupRole) {
    if (action === "remove" && !window.confirm(`Remove ${member.profile?.display_name ?? "this member"} from the group?`)) return;
    const { error: actionError } = await supabase.rpc("manage_group_member", { target_group: groupId, target_user: member.user_id, action, new_role: role ?? null });
    if (actionError) { setError("The membership action could not be completed. Please try again."); return; }
    if (action === "remove") setMembers((current) => current.filter((item) => item.id !== member.id));
    else if (action === "reject") setMembers((current) => current.map((item) => item.id === member.id ? { ...item, status: "rejected" } : item));
    else if (action === "approve") setMembers((current) => current.map((item) => item.id === member.id ? { ...item, status: "active" } : item));
    else if (role) setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role } : item));
  }
  async function transfer(member: GroupMember) {
    if (!window.confirm(`Transfer ownership to ${member.profile?.display_name ?? "this member"}? You will become an admin.`)) return;
    const { error: transferError } = await supabase.rpc("transfer_group_ownership", { target_group: groupId, target_user: member.user_id });
    if (transferError) { setError("Group ownership could not be transferred. Please try again."); return; }
    setMembers((current) => current.map((item) => item.user_id === userId ? { ...item, role: "admin" } : item.user_id === member.user_id ? { ...item, role: "owner" } : item));
    onOwnershipTransfer(member.user_id);
  }

  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}</div>;
  return (
    <div>
      {error && <InlineError className="mb-4">{error}</InlineError>}
      {members.length === 0 ? <EmptyState icon={UserRoundX} title="No members to show" description="Active members and pending requests will appear here." /> : <div className="grid gap-3 sm:grid-cols-2">
        {members.map((member) => {
          const name = member.profile?.display_name ?? "Athlink member";
          return <article key={member.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <Link href={`/players/${member.user_id}`} className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lime-300/15 font-bold text-lime-300">{initials(name)}</Link>
              <div className="min-w-0 flex-1"><Link href={`/players/${member.user_id}`} className="font-semibold hover:text-lime-300">{name}</Link><div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-cyan-300/10 px-2 py-1 capitalize text-cyan-200">{member.role === "owner" ? <Crown className="size-3" /> : <Shield className="size-3" />}{member.role}</span>{member.status !== "active" && <span className="rounded-full bg-amber-300/10 px-2 py-1 capitalize text-amber-200">{member.status}</span>}</div>{(member.profile?.city_name || member.profile?.country_name) && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{[member.profile.city_name, member.profile.country_name].filter(Boolean).join(", ")}</p>}<p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{member.sports.join(" · ") || "Sports not listed"}</p></div>
            </div>
            {canManage && member.user_id !== userId && member.role !== "owner" && <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-3">
              {member.status === "pending" ? <><Button size="xs" onClick={() => void manage(member, "approve")}><Check />Approve</Button><Button size="xs" variant="outline" onClick={() => void manage(member, "reject")}><X />Reject</Button></> : member.status === "active" ? <>
                <label className="relative"><span className="sr-only">Change role for {name}</span><select value={member.role} onChange={(event) => void manage(member, "role", event.target.value as GroupRole)} className="h-6 appearance-none rounded-full border border-white/10 bg-slate-900 pr-7 pl-2 text-xs"><option value="member">Member</option><option value="moderator">Moderator</option>{viewerRole === "owner" && <option value="admin">Admin</option>}</select><ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2" /></label>
                <Button size="icon-xs" variant="ghost" aria-label={`Remove ${name}`} onClick={() => void manage(member, "remove")}><Trash2 /></Button>
                {viewerRole === "owner" && <Button size="xs" variant="ghost" onClick={() => void transfer(member)}><Crown />Transfer ownership</Button>}
              </> : null}
            </div>}
          </article>;
        })}
      </div>}
      {hasMore && <div className="mt-5 text-center"><Button variant="outline" onClick={() => void load(page + 1)}>Load more members</Button></div>}
    </div>
  );
}
