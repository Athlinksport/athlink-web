"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, LockKeyhole, MapPin, UsersRound } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { GroupAvatar } from "@/components/groups/group-avatar";
import { MembershipButton } from "@/components/groups/membership-button";
import { Button } from "@/components/ui/button";
import type { Group, MembershipSummary } from "@/lib/groups/types";
import { relativeTime } from "@/lib/groups/utils";

export function GroupCard({
  group,
  supabase,
  index,
  onMembershipChange,
}: {
  group: Group;
  supabase: SupabaseClient;
  index: number;
  onMembershipChange: (membership: MembershipSummary | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.035, 0.25) }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      className="group overflow-hidden rounded-3xl border border-white/10 bg-surface/85 shadow-surface transition-shadow hover:shadow-elevated"
    >
      <Link href={`/groups/${group.id}`} className="relative block h-28 overflow-hidden bg-gradient-to-br from-lime-300/15 via-cyan-400/10 to-slate-900">
        {group.cover_image_url && <Image src={group.cover_image_url} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
        <GroupAvatar name={group.name} url={group.avatar_url} size="lg" className="absolute -bottom-7 left-5" />
      </Link>
      <div className="px-5 pt-10 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/groups/${group.id}`} className="line-clamp-1 text-lg font-bold hover:text-lime-300">{group.name}</Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-lime-300/10 px-2 py-1 font-medium text-lime-300">{group.sport}</span>
              <span className="inline-flex items-center gap-1"><LockKeyhole className="size-3" />{group.privacy}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{group.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{[group.city, group.country].filter(Boolean).join(", ")}</span>
          <span className="inline-flex items-center gap-1"><UsersRound className="size-3.5" />{group.member_count} members</span>
          <span className="inline-flex items-center gap-1"><Activity className="size-3.5" />Active {relativeTime(group.last_activity_at)}</span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/8 pt-4">
          <Button nativeButton={false} render={<Link href={`/groups/${group.id}`} />} variant="ghost" size="sm">View group</Button>
          <MembershipButton supabase={supabase} groupId={group.id} privacy={group.privacy} membership={group.viewer_membership ?? null} onChange={onMembershipChange} compact />
        </div>
      </div>
    </motion.article>
  );
}
