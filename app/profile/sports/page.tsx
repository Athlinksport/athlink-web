"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sports, SportOption } from "@/data/sports";

type SelectedSport = {
  sport: SportOption;
  level: string;
  goals: string[];
  intensity: string;
  frequency: string;
  isPrimary: boolean;
};

const levelOptions = [
  "New to this",
  "Beginner",
  "Recreational",
  "Intermediate",
  "Advanced",
  "Competitive",
  "Professional",
  "Coach",
];

const goalOptions = [
  "Casual practice",
  "Regular training partner",
  "Team",
  "Competition",
  "Learn from someone",
  "Help beginners",
  "Improve fitness",
  "Build strength",
  "Social connection",
  "Stress relief",
  "Prepare for an event",
  "Find a coach",
  "Just for fun",
];

const intensityOptions = [
  "Relaxed",
  "Moderate",
  "Challenging",
  "High intensity",
  "Flexible",
];

const frequencyOptions = [
  "Occasionally",
  "Once a week",
  "2–3 times a week",
  "4+ times a week",
  "Flexible",
];

export default function SportsProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSports, setSelectedSports] = useState<SelectedSport[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSports() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("user_sports")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false });

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        const existingSports: SelectedSport[] = data.map((item) => ({
          sport: {
            id: item.sport_id,
            name: item.sport_name,
            category: item.category || "Other",
          },
          level: item.level || "",
          goals: item.goals || [],
          intensity: item.preferred_intensity || "",
          frequency: item.frequency || "",
          isPrimary: Boolean(item.is_primary),
        }));

        setSelectedSports(existingSports);
      }

      setIsLoading(false);
    }

    loadSports();
  }, [router, supabase]);

  const filteredSports = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return sports;
    }

    return sports.filter(
      (sport) =>
        sport.name.toLowerCase().includes(searchValue) ||
        sport.category.toLowerCase().includes(searchValue)
    );
  }, [search]);

  const groupedSports = useMemo(() => {
    return filteredSports.reduce<Record<string, SportOption[]>>(
      (groups, sport) => {
        if (!groups[sport.category]) {
          groups[sport.category] = [];
        }

        groups[sport.category].push(sport);
        return groups;
      },
      {}
    );
  }, [filteredSports]);

  function addSport(sport: SportOption) {
    const alreadySelected = selectedSports.some(
      (item) => item.sport.id === sport.id
    );

    if (alreadySelected) {
      return;
    }

    setSelectedSports((current) => [
      ...current,
      {
        sport,
        level: "",
        goals: [],
        intensity: "",
        frequency: "",
        isPrimary: current.length === 0,
      },
    ]);
  }

  function removeSport(sportId: string) {
    setSelectedSports((current) => {
      const remaining = current.filter(
        (item) => item.sport.id !== sportId
      );

      if (
        remaining.length > 0 &&
        !remaining.some((item) => item.isPrimary)
      ) {
        remaining[0] = {
          ...remaining[0],
          isPrimary: true,
        };
      }

      return remaining;
    });
  }

  function updateSport(
    sportId: string,
    updates: Partial<SelectedSport>
  ) {
    setSelectedSports((current) =>
      current.map((item) =>
        item.sport.id === sportId
          ? { ...item, ...updates }
          : item
      )
    );
  }

  function toggleGoal(sportId: string, goal: string) {
    setSelectedSports((current) =>
      current.map((item) => {
        if (item.sport.id !== sportId) {
          return item;
        }

        const goals = item.goals.includes(goal)
          ? item.goals.filter((itemGoal) => itemGoal !== goal)
          : [...item.goals, goal];

        return {
          ...item,
          goals,
        };
      })
    );
  }

  function setPrimarySport(sportId: string) {
    setSelectedSports((current) =>
      current.map((item) => ({
        ...item,
        isPrimary: item.sport.id === sportId,
      }))
    );
  }

  async function handleSave() {
    if (!userId) {
      return;
    }

    if (selectedSports.length === 0) {
      setMessage("Please select at least one sport.");
      return;
    }

    setMessage("");
    setIsSaving(true);

    const { error: deleteError } = await supabase
      .from("user_sports")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setMessage(deleteError.message);
      setIsSaving(false);
      return;
    }

    const rows = selectedSports.map((item) => ({
      user_id: userId,
      sport_id: item.sport.id,
      sport_name: item.sport.name,
      category: item.sport.category,
      level: item.level || null,
      goals: item.goals,
      preferred_intensity: item.intensity || null,
      frequency: item.frequency || null,
      is_primary: item.isPrimary,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("user_sports")
      .insert(rows);

    if (insertError) {
      setMessage(insertError.message);
      setIsSaving(false);
      return;
    }

    setMessage("Sports saved successfully.");
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading your sports...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-white">
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
            Your sports
          </p>

          <h1 className="mt-4 text-4xl font-bold">
            What do you enjoy doing?
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Select one or more sports. Level, goals and frequency are
            optional and can be completed later.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Find a sport</h2>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by sport or category..."
              className="mt-5 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-lime-400"
            />

            <div className="mt-6 max-h-[650px] space-y-7 overflow-y-auto pr-2">
              {Object.entries(groupedSports).map(
                ([category, categorySports]) => (
                  <div key={category}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                      {category}
                    </h3>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {categorySports.map((sport) => {
                        const selected = selectedSports.some(
                          (item) => item.sport.id === sport.id
                        );

                        return (
                          <button
                            key={sport.id}
                            type="button"
                            disabled={selected}
                            onClick={() => addSport(sport)}
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                              selected
                                ? "cursor-not-allowed border-lime-400/30 bg-lime-400/10 text-lime-300"
                                : "border-white/10 bg-slate-900 text-slate-300 hover:border-lime-400/50"
                            }`}
                          >
                            {selected ? "✓ " : "+ "}
                            {sport.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">
                Selected sports
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Choose one primary sport. Everything else is optional.
              </p>
            </div>

            {selectedSports.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-slate-500">
                No sports selected yet.
              </div>
            )}

            {selectedSports.map((item) => (
              <article
                key={item.sport.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {item.sport.category}
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      {item.sport.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSport(item.sport.id)}
                    className="text-sm text-red-300 hover:text-red-200"
                  >
                    Remove
                  </button>
                </div>

                <label className="mt-5 flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="primarySport"
                    checked={item.isPrimary}
                    onChange={() =>
                      setPrimarySport(item.sport.id)
                    }
                    className="h-4 w-4 accent-lime-400"
                  />

                  This is my primary sport
                </label>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Level
                      <span className="ml-2 text-slate-500">
                        Optional
                      </span>
                    </label>

                    <select
                      value={item.level}
                      onChange={(event) =>
                        updateSport(item.sport.id, {
                          level: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                    >
                      <option value="">Select later</option>

                      {levelOptions.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Frequency
                      <span className="ml-2 text-slate-500">
                        Optional
                      </span>
                    </label>

                    <select
                      value={item.frequency}
                      onChange={(event) =>
                        updateSport(item.sport.id, {
                          frequency: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                    >
                      <option value="">Select later</option>

                      {frequencyOptions.map((frequency) => (
                        <option key={frequency} value={frequency}>
                          {frequency}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">
                      Preferred intensity
                      <span className="ml-2 text-slate-500">
                        Optional
                      </span>
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {intensityOptions.map((intensity) => (
                        <button
                          key={intensity}
                          type="button"
                          onClick={() =>
                            updateSport(item.sport.id, {
                              intensity:
                                item.intensity === intensity
                                  ? ""
                                  : intensity,
                            })
                          }
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            item.intensity === intensity
                              ? "border-lime-400 bg-lime-400 text-slate-950"
                              : "border-white/10 bg-slate-900 text-slate-300"
                          }`}
                        >
                          {intensity}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">
                      Goals
                      <span className="ml-2 text-slate-500">
                        Optional
                      </span>
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {goalOptions.map((goal) => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() =>
                            toggleGoal(item.sport.id, goal)
                          }
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            item.goals.includes(goal)
                              ? "border-lime-400 bg-lime-400/10 text-lime-300"
                              : "border-white/10 bg-slate-900 text-slate-300"
                          }`}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {message && (
              <p
                className={`rounded-xl px-4 py-3 text-sm ${
                  message === "Sports saved successfully."
                    ? "bg-lime-400/10 text-lime-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 px-6 py-3 text-center text-slate-300 hover:bg-white/5"
              >
                Skip for now
              </Link>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl bg-lime-400 px-7 py-3 font-semibold text-slate-950 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save sports"}
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
