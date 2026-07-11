"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setFirstName(user.user_metadata?.first_name || "Athlete");
      setIsLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold">
            Athlink
          </Link>

          <nav className="flex items-center gap-5 text-sm text-slate-300">
            <Link href="/dashboard" className="text-white">
              Dashboard
            </Link>

            <Link href="/rooms" className="hover:text-white">
              Rooms
            </Link>

            <Link href="/profile" className="hover:text-white">
              Profile
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/15 px-4 py-2 transition hover:bg-white/10"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
            Welcome to Athlink
          </p>

          <h1 className="mt-4 text-4xl font-bold">
            Welcome, {firstName}
          </h1>

          <p className="mt-4 max-w-2xl text-slate-300">
            Complete your sports profile, discover compatible athletes and
            join local rooms.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">Profile completion</p>

              <p className="mt-3 text-3xl font-bold text-lime-400">20%</p>

              <p className="mt-2 text-sm text-slate-400">
                Add your sports, level and availability.
              </p>

              <Link
                href="/profile"
                className="mt-5 inline-block text-sm font-semibold text-lime-400 hover:text-lime-300"
              >
                Complete profile →
              </Link>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">Nearby rooms</p>

              <p className="mt-3 text-3xl font-bold text-lime-400">0</p>

              <p className="mt-2 text-sm text-slate-400">
                Local activities will appear here.
              </p>

              <Link
                href="/rooms"
                className="mt-5 inline-block text-sm font-semibold text-lime-400 hover:text-lime-300"
              >
                Explore rooms →
              </Link>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">Connections</p>

              <p className="mt-3 text-3xl font-bold text-lime-400">0</p>

              <p className="mt-2 text-sm text-slate-400">
                Your sports connections will appear here.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}