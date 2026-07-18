"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  bio: string | null;
  city_name: string | null;
  country_name: string | null;
  languages: string[] | null;
  looking_for: string[] | null;
  profile_visibility: string | null;
};

type SportRow = {
  id: number;
  sport_name: string;
  category: string | null;
  level: string | null;
  goals: string[] | null;
  preferred_intensity: string | null;
  frequency: string | null;
  is_primary: boolean | null;
};

type AvailabilityRow = {
  day_of_week: number;
  time_period: string;
  flexible: boolean | null;
};

const dayNames: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function calculateAge(birthDate: string | null) {
  if (!birthDate) {
    return undefined;
  }

  const birth = new Date(birthDate);
  const today = new Date();

  if (Number.isNaN(birth.getTime())) {
    return undefined;
  }

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function PublicPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const playerId = params.id;

  const [currentUserId, setCurrentUserId] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [sports, setSports] = useState<SportRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<
    "none" | "pending" | "accepted" | "declined"
  >("none");

  const [isIncomingRequest, setIsIncomingRequest] = useState(false);

  useEffect(() => {
    async function loadPlayer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);
      const { data: existingConnection, error: connectionError } =
        await supabase
          .from("connections")
          .select("status, sender_id, receiver_id")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${playerId}),and(sender_id.eq.${playerId},receiver_id.eq.${user.id})`
          )
          .maybeSingle();

      if (connectionError) {
        console.error("Connection error:", {
          message: connectionError.message,
          details: connectionError.details,
          hint: connectionError.hint,
          code: connectionError.code,
        });

        setMessage(
          `Connection error: ${connectionError.message || "Unknown error"}`
        );
      } else if (existingConnection) {
        setConnectionStatus(
          existingConnection.status as
          | "pending"
          | "accepted"
          | "declined"
        );

        setIsIncomingRequest(
          existingConnection.receiver_id === user.id
        );
      }
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            `
              id,
              display_name,
              avatar_url,
              birth_date,
              bio,
              city_name,
              country_name,
              languages,
              looking_for,
              profile_visibility
            `
          )
          .eq("id", playerId)
          .maybeSingle();

      if (profileError) {
        setMessage(profileError.message);
        setIsLoading(false);
        return;
      }

      if (!profileData) {
        setMessage("This profile could not be found.");
        setIsLoading(false);
        return;
      }

      if (
        profileData.profile_visibility !== "public" &&
        profileData.id !== user.id
      ) {
        setMessage("This profile is not public.");
        setIsLoading(false);
        return;
      }

      const { data: sportsData, error: sportsError } =
        await supabase
          .from("user_sports")
          .select(
            `
              id,
              sport_name,
              category,
              level,
              goals,
              preferred_intensity,
              frequency,
              is_primary
            `
          )
          .eq("user_id", playerId)
          .order("is_primary", { ascending: false });

      if (sportsError) {
        setMessage(sportsError.message);
        setIsLoading(false);
        return;
      }

      const { data: availabilityData, error: availabilityError } =
        await supabase
          .from("user_availability")
          .select("day_of_week, time_period, flexible")
          .eq("user_id", playerId)
          .order("day_of_week", { ascending: true });

      if (availabilityError) {
        setMessage(availabilityError.message);
        setIsLoading(false);
        return;
      }

      setProfile(profileData);
      setSports(sportsData || []);
      setAvailability(availabilityData || []);
      setIsLoading(false);
    }

    loadPlayer();
  }, [playerId, router, supabase]);

  const age = calculateAge(profile?.birth_date || null);

  const displayName = profile?.display_name || "Athlete";

  const groupedAvailability = useMemo(() => {
    return availability.reduce<Record<number, string[]>>(
      (groups, item) => {
        if (!groups[item.day_of_week]) {
          groups[item.day_of_week] = [];
        }

        groups[item.day_of_week].push(item.time_period);
        return groups;
      },
      {}
    );
  }, [availability]);

  const flexibleSchedule = availability.some(
    (item) => Boolean(item.flexible)
  );

  const isOwnProfile =
    Boolean(currentUserId) && currentUserId === playerId;
  async function handleConnect() {
    if (!currentUserId || !playerId) {
      return;
    }

    setMessage("");
    setIsSendingRequest(true);

    const { error } = await supabase.from("connections").insert({
      sender_id: currentUserId,
      receiver_id: playerId,
      status: "pending",
    });

    if (error) {
      setMessage(error.message);
      setIsSendingRequest(false);
      return;
    }

    setConnectionStatus("pending");
    setIsSendingRequest(false);
  }

  async function handleRemoveConnection() {
    if (!currentUserId || !playerId) {
      return;
    }

    if (!window.confirm("Are you sure you want to disconnect?")) {
      return;
    }
    setMessage("");

    const { error } = await supabase
      .from("connections")
      .delete()
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${playerId}),and(sender_id.eq.${playerId},receiver_id.eq.${currentUserId})`
      );

    if (error) {
      setMessage(error.message);
      return;
    }

    setConnectionStatus("none");
    setIsIncomingRequest(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading profile...</p>
      </main>
    );
  }

  if (!profile || message) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <AppNavbar />

        <section className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h1 className="text-2xl font-semibold">
              Profile unavailable
            </h1>

            <p className="mt-3 text-slate-400">
              {message || "This profile could not be loaded."}
            </p>

            <Link
              href="/discover"
              className="mt-6 inline-flex rounded-xl bg-lime-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-lime-300"
            >
              Back to Discover
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppNavbar />

      <section className="mx-auto max-w-6xl px-6 py-14">
        <Link
          href="/discover"
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          ← Back to Discover
        </Link>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900">
          <div className="relative min-h-64 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white/10 bg-slate-800 shadow-2xl shadow-black/30">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`${displayName} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-bold text-lime-400">
                    {getInitials(displayName)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">
                  Athlete profile
                </p>

                <h1 className="mt-3 text-4xl font-bold tracking-tight">
                  {displayName}
                  {typeof age === "number" ? `, ${age}` : ""}
                </h1>

                {(profile.city_name || profile.country_name) && (
                  <p className="mt-3 text-slate-400">
                    📍{" "}
                    {[profile.city_name, profile.country_name]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <Link
                    href="/profile"
                    className="rounded-xl bg-lime-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-lime-300"
                  >
                    Edit my profile
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (connectionStatus === "pending" && isIncomingRequest) {
                          router.push("/connections");
                          return;
                        }

                        if (
                          connectionStatus === "pending" ||
                          connectionStatus === "accepted"
                        ) {
                          handleRemoveConnection();
                          return;
                        }

                        handleConnect();
                      }}
                      disabled={isSendingRequest}
                      className="rounded-xl bg-lime-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingRequest
                        ? "Please wait..."
                        : connectionStatus === "pending" && isIncomingRequest
                          ? "Review request"
                          : connectionStatus === "pending"
                            ? "Cancel request"
                            : connectionStatus === "accepted"
                              ? "Disconnect"
                              : "Connect"}
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
                    >
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>

            {profile.bio && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold">About</h2>

                <p className="mt-3 max-w-3xl leading-7 text-slate-400">
                  {profile.bio}
                </p>
              </div>
            )}

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-8">
                <section>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold">Sports</h2>

                    <p className="text-sm text-slate-500">
                      {sports.length} selected
                    </p>
                  </div>

                  {sports.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
                      No sports added yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {sports.map((sport) => (
                        <article
                          key={sport.id}
                          className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold">
                                  {sport.sport_name}
                                </h3>

                                {sport.is_primary && (
                                  <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-300">
                                    Primary sport
                                  </span>
                                )}
                              </div>

                              {sport.category && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {sport.category}
                                </p>
                              )}
                            </div>

                            {sport.level && (
                              <span className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">
                                {sport.level}
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {sport.preferred_intensity && (
                              <span className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300">
                                {sport.preferred_intensity}
                              </span>
                            )}

                            {sport.frequency && (
                              <span className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300">
                                {sport.frequency}
                              </span>
                            )}

                            {(sport.goals || []).map((goal) => (
                              <span
                                key={goal}
                                className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300"
                              >
                                {goal}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-xl font-semibold">Availability</h2>

                  {availability.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
                      Availability has not been shared.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <div className="space-y-4">
                        {Object.entries(groupedAvailability).map(
                          ([day, periods]) => (
                            <div
                              key={day}
                              className="flex flex-col gap-2 border-b border-white/5 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <p className="font-medium text-slate-200">
                                {dayNames[Number(day)]}
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {periods.map((period) => (
                                  <span
                                    key={period}
                                    className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300"
                                  >
                                    {period}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      {flexibleSchedule && (
                        <p className="mt-5 rounded-xl bg-lime-400/10 px-4 py-3 text-sm text-lime-300">
                          Their schedule may be flexible and should be
                          confirmed before making plans.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <h2 className="font-semibold">Languages</h2>

                  {profile.languages &&
                    profile.languages.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.languages.map((language) => (
                        <span
                          key={language}
                          className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300"
                        >
                          {language}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No languages shared.
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <h2 className="font-semibold">Open to</h2>

                  {profile.looking_for &&
                    profile.looking_for.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.looking_for.map((option) => (
                        <span
                          key={option}
                          className="rounded-full bg-lime-400/10 px-3 py-2 text-sm text-lime-300"
                        >
                          {option}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No preferences shared.
                    </p>
                  )}
                </section>

                {!isOwnProfile && (
                  <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <h2 className="font-semibold">Safety reminder</h2>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Meet in a public place, confirm the activity details,
                      and avoid sharing sensitive personal information too
                      early.
                    </p>
                  </section>
                )}
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}