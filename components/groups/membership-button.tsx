"use client";

import { useState } from "react";
import { Check, Clock3, LogOut, UserPlus } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import type { GroupPrivacy, MembershipSummary } from "@/lib/groups/types";

export function MembershipButton({
  supabase,
  groupId,
  privacy,
  membership,
  onChange,
  compact = false,
}: {
  supabase: SupabaseClient;
  groupId: string;
  privacy: GroupPrivacy;
  membership: MembershipSummary | null;
  onChange: (membership: MembershipSummary | null) => void;
  compact?: boolean;
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const active = membership?.status === "active";
  const pending = membership?.status === "pending";
  const owner = active && membership.role === "owner";

  async function join() {
    setError("");
    setIsWorking(true);
    const { data, error: joinError } = await supabase.rpc("join_group", { target_group: groupId });
    if (joinError) setError("The group could not be joined. Please try again.");
    else {
      const row = data as MembershipSummary;
      onChange({ id: row.id, role: row.role, status: row.status });
    }
    setIsWorking(false);
  }

  async function leave() {
    if (!window.confirm("Leave this group? You can join again later if the group is public.")) return;
    setError("");
    setIsWorking(true);
    const { error: leaveError } = await supabase.rpc("leave_group", { target_group: groupId });
    if (leaveError) setError("The group could not be left. Please try again.");
    else onChange(null);
    setIsWorking(false);
  }

  if (owner) {
    return <Button size={compact ? "sm" : "default"} variant="outline" disabled><Check />Owner</Button>;
  }
  if (pending) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size={compact ? "sm" : "default"} variant="outline" disabled><Clock3 />Pending</Button>
        {error && <span className="max-w-48 text-xs text-destructive">{error}</span>}
      </div>
    );
  }
  if (active) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size={compact ? "sm" : "default"} variant="outline" onClick={leave} disabled={isWorking}>
          <LogOut />{isWorking ? "Leaving…" : "Leave"}
        </Button>
        {error && <span className="max-w-48 text-xs text-destructive">{error}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button size={compact ? "sm" : "default"} onClick={join} disabled={isWorking}>
        <UserPlus />{isWorking ? "Working…" : privacy === "private" ? "Request to join" : "Join group"}
      </Button>
      {error && <span className="max-w-48 text-xs text-destructive">{error}</span>}
    </div>
  );
}
