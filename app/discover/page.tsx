"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { sports as allSports } from "@/data/sports";
import PlayerCard, {
  type PlayerCardData,
} from "@/components/PlayerCard";
import { useAuth } from "@/hooks/use-auth";

export default function DiscoverPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [players, setPlayers] = useState<PlayerCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const requestGeneration = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setCityFilter(params.get("city") ?? "");
      setCountryFilter(params.get("country") ?? "");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  const loadPlayers = useCallback(async () => {
    if (isAuthLoading || !user) return;

    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/discover", {
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
            : "Athletes could not be loaded. Please try again.";
        setError(safeMessage);
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("discover" in result) ||
        typeof result.discover !== "object" ||
        result.discover === null ||
        !("players" in result.discover) ||
        !Array.isArray(result.discover.players)
      ) {
        setError("Athletes returned an invalid response. Please try again.");
        return;
      }

      setPlayers(result.discover.players as PlayerCardData[]);
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        return;
      }
      if (requestGeneration.current === generation) {
        setError("The athlete request failed. Check your connection and retry.");
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
      void loadPlayers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestGeneration.current += 1;
      activeController.current?.abort();
    };
  }, [isAuthLoading, loadPlayers, user]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const normalizedCity = cityFilter.trim().toLocaleLowerCase();
    const normalizedCountry = countryFilter.trim().toLocaleLowerCase();

    return players.filter((player) => {
      const matchesSearch = !normalizedSearch || [
        player.displayName,
        player.bio ?? "",
        player.city ?? "",
        ...player.sports.map((sport) => sport.name),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      const matchesSport = sportFilter === "all" ||
        player.sports.some((sport) => sport.name === sportFilter);
      const matchesCity = !normalizedCity ||
        (player.city ?? "").toLocaleLowerCase() === normalizedCity;
      const playerCountry = player.country ?? "";
      const matchesCountry = !normalizedCountry ||
        playerCountry.toLocaleLowerCase() === normalizedCountry;
      const age = player.age;
      const matchesAge = ageFilter === "all" || (typeof age === "number" && (
        (ageFilter === "18-24" && age >= 18 && age <= 24) ||
        (ageFilter === "25-30" && age >= 25 && age <= 30) ||
        (ageFilter === "31-40" && age >= 31 && age <= 40) ||
        (ageFilter === "41+" && age >= 41)
      ));

      return matchesSearch && matchesSport && matchesCity && matchesCountry && matchesAge;
    });
  }, [ageFilter, cityFilter, countryFilter, players, search, sportFilter]);

  return (
      <main className="min-h-screen bg-transparent text-white">
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
            Discover
          </p>

          <h1 className="mt-4 text-4xl font-bold">
            Find people who fit your sports life
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Explore athletes based on shared sports, location, age,
            availability, language and connection preferences.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="search"
              aria-label="Search athletes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people..."
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-lime-400 lg:col-span-2"
            />

            <select
              value={sportFilter}
              onChange={(event) => setSportFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
            >
              <option value="all">All sports</option>

              {allSports
                .slice()
                .sort((firstSport, secondSport) =>
                  firstSport.name.localeCompare(secondSport.name)
                )
                .map((sport) => (
                  <option key={sport.id} value={sport.name}>
                    {sport.name}
                  </option>
                ))}
            </select>

            <input
              aria-label="City filter"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              placeholder="Any city"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-lime-400"
            />

            <input
              aria-label="Country filter"
              value={countryFilter}
              onChange={(event) => setCountryFilter(event.target.value)}
              placeholder="Any country"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-lime-400"
            />

            <select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)} aria-label="Age filter" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400">
              <option value="all">Any age</option>
              <option value="18-24">18–24</option>
              <option value="25-30">25–30</option>
              <option value="31-40">31–40</option>
              <option value="41+">41+</option>
            </select>
          </div>
        </div>

        <div className="mt-12 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-lime-400">
              Best matches
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Recommended for you
            </h2>
          </div>

          {!isLoading && !error ? (
            <p className="text-sm text-slate-500">
              {filteredPlayers.length}{" "}
              {filteredPlayers.length === 1 ? "person" : "people"} found
            </p>
          ) : null}
        </div>

          {isLoading ? (
            <p role="status" className="mt-8 rounded-3xl border border-white/10 p-10 text-center text-slate-400">
              Loading athletes…
            </p>
          ) : error ? (
            <div className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/5 p-10 text-center">
              <p role="alert" className="text-red-200">{error}</p>
              <button type="button" onClick={() => void loadPlayers()} className="mt-4 rounded-xl bg-lime-400 px-5 py-2.5 font-semibold text-slate-950">Retry</button>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-10 text-center">
              <h3 className="text-lg font-semibold">
                No athletes match these filters
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try changing or clearing one of the filters.
              </p>
            </div>
         ) : (
           <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
             {filteredPlayers.map((player) => (
               <PlayerCard key={player.id} player={player} />
             ))}
           </div>
         )}
        </section>
      </main>
  );
}
