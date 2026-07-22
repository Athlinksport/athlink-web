"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const days = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const timePeriods = [
  {
    value: "Morning",
    label: "Morning",
    description: "Before 12:00",
  },
  {
    value: "Afternoon",
    label: "Afternoon",
    description: "12:00–17:00",
  },
  {
    value: "Evening",
    label: "Evening",
    description: "17:00–21:00",
  },
  {
    value: "Late evening",
    label: "Late evening",
    description: "After 21:00",
  },
];

type AvailabilityItem = {
  dayOfWeek: number;
  timePeriod: string;
};

export default function AvailabilityPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [flexibleSchedule, setFlexibleSchedule] = useState(false);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadAvailability() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("user_availability")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setAvailability(
          data.map((item) => ({
            dayOfWeek: item.day_of_week,
            timePeriod: item.time_period,
          }))
        );

        setFlexibleSchedule(
          data.some((item) => Boolean(item.flexible))
        );
      }

      setIsLoading(false);
    }

    loadAvailability();
  }, [router, supabase]);

  function isSelected(dayOfWeek: number, timePeriod: string) {
    return availability.some(
      (item) =>
        item.dayOfWeek === dayOfWeek &&
        item.timePeriod === timePeriod
    );
  }

  function toggleAvailability(
    dayOfWeek: number,
    timePeriod: string
  ) {
    setAvailability((current) => {
      const alreadySelected = current.some(
        (item) =>
          item.dayOfWeek === dayOfWeek &&
          item.timePeriod === timePeriod
      );

      if (alreadySelected) {
        return current.filter(
          (item) =>
            !(
              item.dayOfWeek === dayOfWeek &&
              item.timePeriod === timePeriod
            )
        );
      }

      return [
        ...current,
        {
          dayOfWeek,
          timePeriod,
        },
      ];
    });
  }

  function clearAvailability() {
    setAvailability([]);
    setFlexibleSchedule(false);
    setMessage("");
  }

  async function handleSave() {
    if (!userId) {
      return;
    }

    setMessage("");
    setIsSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from("user_availability")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        setMessage(deleteError.message);
        return;
      }

      if (availability.length > 0) {
        const rows = availability.map((item) => ({
          user_id: userId,
          day_of_week: item.dayOfWeek,
          time_period: item.timePeriod,
          flexible: flexibleSchedule,
        }));

        const { error: insertError } = await supabase
          .from("user_availability")
          .insert(rows);

        if (insertError) {
          setMessage(insertError.message);
          return;
        }
      }

      setMessage("Availability saved successfully.");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading your availability...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-white">
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
            Availability
          </p>

          <h1 className="mt-4 text-4xl font-bold">
            When are you usually free?
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Choose the time slots that usually work for you. This section is
            optional, and you can update it whenever your schedule changes.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[150px_repeat(4,1fr)] gap-3">
                <div />

                {timePeriods.map((period) => (
                  <div
                    key={period.value}
                    className="px-3 py-2 text-center"
                  >
                    <p className="text-sm font-medium text-slate-300">
                      {period.label}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {period.description}
                    </p>
                  </div>
                ))}

                {days.map((day) => (
                  <div key={day.value} className="contents">
                    <div className="flex items-center font-medium text-slate-200">
                      {day.label}
                    </div>

                    {timePeriods.map((period) => {
                      const selected = isSelected(
                        day.value,
                        period.value
                      );

                      return (
                        <button
                          key={`${day.value}-${period.value}`}
                          type="button"
                          onClick={() =>
                            toggleAvailability(
                              day.value,
                              period.value
                            )
                          }
                          className={`rounded-xl border px-3 py-4 text-sm transition ${
                            selected
                              ? "border-lime-400 bg-lime-400 text-slate-950"
                              : "border-white/10 bg-slate-900 text-slate-400 hover:border-lime-400/50 hover:text-slate-200"
                          }`}
                        >
                          {selected ? "Available" : "Select"}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <label className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900 p-5">
            <input
              type="checkbox"
              checked={flexibleSchedule}
              onChange={(event) =>
                setFlexibleSchedule(event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-lime-400"
            />

            <span>
              <span className="block font-medium text-slate-200">
                My schedule changes often
              </span>

              <span className="mt-1 block text-sm text-slate-500">
                Other members will understand that your availability is
                approximate and may need confirmation.
              </span>
            </span>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clearAvailability}
              disabled={
                availability.length === 0 && !flexibleSchedule
              }
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear all
            </button>

            <p className="flex items-center text-sm text-slate-500">
              {availability.length === 0
                ? "No time slots selected yet."
                : `${availability.length} time slot${
                    availability.length === 1 ? "" : "s"
                  } selected.`}
            </p>
          </div>

          {message && (
            <p
              className={`mt-6 rounded-xl px-4 py-3 text-sm ${
                message === "Availability saved successfully."
                  ? "bg-lime-400/10 text-lime-300"
                  : "bg-red-500/10 text-red-300"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/profile"
              className="rounded-xl border border-white/10 px-6 py-3 text-center font-medium text-slate-300 transition hover:bg-white/5"
            >
              Skip for now
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-lime-400 px-7 py-3 font-semibold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save availability"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
