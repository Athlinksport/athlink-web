"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, RefreshCw, UserRoundCheck, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/use-auth";

type DashboardProfile = {
  display_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  bio: string | null;
  city_name: string | null;
  country_name: string | null;
  languages: string[] | null;
  looking_for: string[] | null;
};

type DashboardData = {
  profile: DashboardProfile | null;
  sportsCount: number;
  connectionCount: number;
  nearbyAthleteCount: number | null;
};

const emptyDashboard: DashboardData = {
  profile: null,
  sportsCount: 0,
  connectionCount: 0,
  nearbyAthleteCount: null,
};

function DashboardSkeleton() {
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-2xl border border-white/10 bg-slate-900/80"
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestGeneration = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  const loadDashboard = useCallback(async () => {
    if (isAuthLoading || !user) return;

    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const result: unknown = await response.json().catch(() => null);

      if (
        controller.signal.aborted ||
        requestGeneration.current !== generation
      ) {
        return;
      }

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const safeMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "object" &&
          result.error !== null &&
          "message" in result.error &&
          typeof result.error.message === "string"
            ? result.error.message
            : "Your dashboard could not be loaded. Please try again.";
        setError(safeMessage);
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("dashboard" in result)
      ) {
        setError("Your dashboard returned an invalid response. Please try again.");
        return;
      }

      setDashboard(result.dashboard as DashboardData);
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        return;
      }
      if (requestGeneration.current === generation) {
        setError("The dashboard request failed. Check your connection and retry.");
      }
    } finally {
      if (
        !controller.signal.aborted &&
        requestGeneration.current === generation
      ) {
        setIsLoading(false);
      }
    }
  }, [isAuthLoading, router, user]);

  useEffect(() => {
    if (isAuthLoading || !user) return;

    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestGeneration.current += 1;
      activeController.current?.abort();
    };
  }, [isAuthLoading, loadDashboard, user]);

  const profileCompletion = useMemo(() => {
    const profile = dashboard.profile;
    const completedItems = [
      Boolean(profile?.display_name?.trim()),
      Boolean(profile?.avatar_url),
      Boolean(profile?.birth_date),
      Boolean(profile?.bio?.trim()),
      Boolean(profile?.city_name?.trim()),
      Boolean(profile?.country_name?.trim()),
      Boolean(profile?.languages?.length),
      Boolean(profile?.looking_for?.length),
      dashboard.sportsCount > 0,
    ].filter(Boolean).length;

    return Math.round((completedItems / 9) * 100);
  }, [dashboard]);

  const discoverHref = useMemo(() => {
    const params = new URLSearchParams();
    if (dashboard.profile?.city_name) {
      params.set("city", dashboard.profile.city_name);
    }
    if (dashboard.profile?.country_name) {
      params.set("country", dashboard.profile.country_name);
    }
    const query = params.toString();
    return query ? `/discover?${query}` : "/discover";
  }, [dashboard.profile]);

  const firstName =
    dashboard.profile?.display_name?.trim().split(/\s+/)[0] ||
    user?.user_metadata?.first_name ||
    "Athlete";

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent text-white">
        <LoadingState label="Loading your dashboard…" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent px-6 text-white">
        <p className="text-center text-sm text-slate-400">
          Sign in to view your dashboard. Redirecting…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
            Welcome to Athlink
          </p>

          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Welcome, {firstName}
          </h1>

          <p className="mt-4 max-w-2xl text-slate-300">
            Complete your sports profile, discover compatible athletes, and
            grow your sports community.
          </p>

          {error ? (
            <InlineError className="mt-8 items-center justify-between gap-4">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadDashboard()}
              >
                <RefreshCw />
                Retry
              </Button>
            </InlineError>
          ) : isLoading ? (
            <DashboardSkeleton />
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <article className="flex min-h-56 flex-col rounded-2xl border border-white/10 bg-slate-900 p-6">
                <UserRoundCheck className="size-5 text-lime-400" aria-hidden="true" />
                <p className="mt-4 text-sm text-slate-400">Profile completion</p>
                <p className="mt-2 text-3xl font-bold text-lime-400">
                  {profileCompletion}%
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {profileCompletion === 100
                    ? "Your sports profile is ready for discovery."
                    : "Add missing profile details to improve your matches."}
                </p>
                <Link
                  href={dashboard.sportsCount > 0 ? "/profile" : "/profile/sports"}
                  className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-lime-400 hover:text-lime-300"
                >
                  {profileCompletion === 100 ? "Review profile" : "Complete profile"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>

              <article className="flex min-h-56 flex-col rounded-2xl border border-white/10 bg-slate-900 p-6">
                <MapPin className="size-5 text-lime-400" aria-hidden="true" />
                <p className="mt-4 text-sm text-slate-400">Athletes nearby</p>
                <p className="mt-2 text-3xl font-bold text-lime-400">
                  {dashboard.nearbyAthleteCount ?? "—"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {!dashboard.profile?.city_name
                    ? "Add your city to see athletes near you."
                    : dashboard.nearbyAthleteCount === 0
                      ? `No discoverable athletes in ${dashboard.profile.city_name} yet.`
                      : `Discover athletes in ${dashboard.profile.city_name}.`}
                </p>
                <Link
                  href={dashboard.profile?.city_name ? discoverHref : "/profile"}
                  className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-lime-400 hover:text-lime-300"
                >
                  {dashboard.profile?.city_name ? "Discover nearby athletes" : "Add location"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>

              <article className="flex min-h-56 flex-col rounded-2xl border border-white/10 bg-slate-900 p-6">
                <UsersRound className="size-5 text-lime-400" aria-hidden="true" />
                <p className="mt-4 text-sm text-slate-400">Connections</p>
                <p className="mt-2 text-3xl font-bold text-lime-400">
                  {dashboard.connectionCount}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {dashboard.connectionCount === 0
                    ? "Accepted sports connections will appear here."
                    : "Keep up with your accepted sports connections."}
                </p>
                <Link
                  href={dashboard.connectionCount > 0 ? "/connections" : discoverHref}
                  className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-lime-400 hover:text-lime-300"
                >
                  {dashboard.connectionCount > 0 ? "View connections" : "Find athletes"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
