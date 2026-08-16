"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AccountSettingsPage() {
  const { user, isAuthLoading, supabase } = useAuth();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isAuthLoading && !user) { router.replace("/login"); return null; }

  async function removeAccount() {
    setBusy(true); setError("");
    const response = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation }) });
    const result = await response.json() as { error?: string; cleanupWarnings?: string[] };
    if (!response.ok) { setError(result.error ?? "Account deletion failed."); setBusy(false); return; }
    if (result.cleanupWarnings?.length) {
      window.alert("Your account was deleted, but some user-owned storage files could not be removed. Support has been advised to review the cleanup.");
    }
    await supabase.auth.signOut();
    router.replace("/?accountDeleted=1");
  }

  return <main className="mx-auto w-full max-w-3xl px-4 py-12"><h1 className="text-3xl font-bold">Account settings</h1><section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/5 p-6"><h2 className="text-xl font-semibold">Delete account</h2><p className="mt-2 text-sm text-muted-foreground">This permanently removes your login and data that can safely be deleted. Some moderation records may be retained in anonymized form for safety and legal obligations.</p><Dialog><DialogTrigger render={<Button variant="destructive" className="mt-5" />}>Delete my account</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Permanently delete your account?</DialogTitle><DialogDescription>This cannot be undone. Type DELETE to confirm.</DialogDescription></DialogHeader><label htmlFor="confirmation" className="text-sm font-medium">Confirmation</label><input id="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<Button variant="destructive" disabled={confirmation !== "DELETE" || busy} onClick={() => void removeAccount()}>{busy ? "Deleting…" : "Delete permanently"}</Button></DialogContent></Dialog></section></main>;
}
