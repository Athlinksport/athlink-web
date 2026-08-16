"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void createClient().auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = validatePassword(form.get("password"));
    if (!password.ok) return setStatus(password.error);
    if (password.value !== String(form.get("confirmPassword") ?? "")) return setStatus("Passwords do not match.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: password.value });
    setBusy(false);
    if (error) return setStatus("This recovery session is invalid or expired. Request a new link.");
    router.replace("/login?passwordUpdated=1");
  }

  if (ready === null) return <main className="grid min-h-[70svh] place-items-center"><p role="status">Checking recovery link…</p></main>;
  if (!ready) return <main className="grid min-h-[70svh] place-items-center px-4"><section className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-7"><h1 className="text-2xl font-bold">Recovery link unavailable</h1><p className="mt-3 text-muted-foreground">The link is invalid, expired, or was already used.</p><Link href="/forgot-password" className="mt-5 inline-block text-lime-300">Request a new link</Link></section></main>;

  return <main className="mx-auto grid min-h-[75svh] w-full max-w-md place-items-center px-4"><section className="w-full rounded-3xl border border-white/10 bg-white/5 p-7"><h1 className="text-3xl font-bold">Choose a new password</h1><form onSubmit={submit} className="mt-7 space-y-4"><label htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3" /><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />{status && <p role="alert" className="text-sm text-red-300">{status}</p>}<button disabled={busy} className="w-full rounded-xl bg-lime-400 p-3 font-semibold text-slate-950">{busy ? "Updating…" : "Update password"}</button></form></section></main>;
}
