"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  const firstName = user?.user_metadata?.first_name || "Athlete";

  if (isAuthLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent text-white">
        <p className="text-slate-400">Loading your dashboard...</p>
      </main>
    );
  }

  return (
      <main className="min-h-screen bg-transparent">
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
