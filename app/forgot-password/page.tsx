"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/auth/validation";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = validateEmail(new FormData(event.currentTarget).get("email"));
    if (!email.ok) return setStatus(email.error);
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    await createClient().auth.resetPasswordForEmail(email.value, { redirectTo });
    setStatus("If an account exists for that email, a recovery link is on its way.");
    setBusy(false);
  }

  return <main className="mx-auto grid min-h-[75svh] w-full max-w-md place-items-center px-4 py-12">
    <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-7">
      <p className="text-sm font-semibold uppercase tracking-[.2em] text-lime-300">Account recovery</p>
      <h1 className="mt-3 text-3xl font-bold">Reset your password</h1>
      <p className="mt-3 text-sm text-muted-foreground">Enter your account email. Recovery links expire and can be used only once.</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium" htmlFor="email">Email</label>
        <input className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 focus:border-lime-400 focus:outline-none" id="email" name="email" type="email" autoComplete="email" required />
        {status && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm">{status}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-lime-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{busy ? "Sending…" : "Send recovery link"}</button>
      </form>
      <Link className="mt-5 inline-block text-sm text-lime-300" href="/login">Back to login</Link>
    </section>
  </main>;
}
