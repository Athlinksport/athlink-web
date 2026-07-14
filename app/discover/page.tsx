"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppNavbar from "@/components/AppNavbar";
import { sports as allSports } from "@/data/sports";
import PlayerCard, {
  PlayerCardData,
} from "@/components/PlayerCard";
import { error } from "console";

const examplePlayers: PlayerCardData[] = [
  {
    id: "alex-martin",
    displayName: "Alex",
    age: 28,
    city: "Toulouse",
    distanceKm: 2.4,
    bio: "I enjoy badminton, running and relaxed weekend activities.",
    sports: [
      {
        name: "Badminton",
        level: "Intermediate",
        isPrimary: true,
      },
      {
        name: "Running",
        level: "Recreational",
      },
      {
        name: "Gym",
        level: "Intermediate",
      },
    ],
    languages: ["French", "English"],
    lookingFor: ["Sports partner", "Friendship"],
    availabilityLabel: "Free this evening",
    matchPercentage: 94,
    matchReasons: [
  "You both enjoy badminton",
  "You are both available in the evening",
  "You are looking for similar connections",
],
verified: true,
  },
  {
    id: "sarah-lee",
    displayName: "Sarah",
    age: 25,
    city: "Toulouse",
    distanceKm: 4.1,
    bio: "Looking for friendly people for regular padel and fitness sessions.",
    sports: [
      {
        name: "Padel",
        level: "Beginner",
        isPrimary: true,
      },
      {
        name: "Pilates",
        level: "Intermediate",
      },
    ],
    languages: ["English", "French", "Spanish"],
    lookingFor: ["Training buddy", "Group activities"],
    availabilityLabel: "Free this weekend",
    matchPercentage: 87,
    matchReasons: [
  "You both want regular sports activities",
  "You share two communication languages",
  "You live close to each other",
],
verified: true,
  },
  {
    id: "nicolas-dubois",
    displayName: "Nicolas",
    age: 31,
    city: "Blagnac",
    distanceKm: 7.8,
    bio: "Trail running enthusiast preparing for longer races.",
    sports: [
      {
        name: "Trail running",
        level: "Advanced",
        isPrimary: true,
      },
      {
        name: "Hiking",
        level: "Advanced",
      },
    ],
    languages: ["French", "English"],
    lookingFor: ["Regular training partner", "Team"],
    availabilityLabel: "Free Saturday",
    matchPercentage: 79,
    matchReasons: [
  "You both enjoy trail running",
  "You are both available on Saturdays",
  "You are looking for similar training partners",
],
verified: true,
  },
];

export default function DiscoverPage() {
const supabase = createClient();

const [players, setPlayers] = useState<PlayerCardData[]>([]);
const [isLoading, setIsLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState("all");
useEffect(() => {
  async function loadPlayers() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("profile_visibility", "public")
      .neq("id", user.id);

    if (error) {
      console.error(error);
      setIsLoading(false);
      return;
    }

    console.log(data);

    setIsLoading(false);
  }

  loadPlayers();
}, []);
useEffect(() => {
  async function loadPlayers() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select(`
    id,
    display_name,
    birth_date,
    bio,
    city_name,
    country_name,
    languages,
    looking_for
  `)
  .eq("profile_visibility", "public")
  .neq("id", user.id);

if (profilesError) {
  console.error(profilesError);
  setIsLoading(false);
  return;
}

const profileIds = (profiles || []).map((profile) => profile.id);

let sports: {
  user_id: string;
  sport_name: string;
  level: string | null;
  is_primary: boolean | null;
}[] = [];

if (profileIds.length > 0) {
  const { data: sportsData, error: sportsError } = await supabase
    .from("user_sports")
    .select("user_id, sport_name, level, is_primary")
    .in("user_id", profileIds);

  if (sportsError) {
    console.error(sportsError);
    setIsLoading(false);
    return;
  }

  sports = sportsData || [];
}

console.log({ profiles, sports });

setIsLoading(false);

  }

  loadPlayers();
}, []);
  const filteredPlayers = useMemo(() => {
    if (sportFilter === "all") {
      return examplePlayers;
    }

    return examplePlayers.filter((player) =>
      player.sports.some((sport) => sport.name === sportFilter)
    );
  }, [sportFilter]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppNavbar />

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

            <select className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400">
              <option value="all">Any distance</option>
              <option value="3">Within 3 km</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="20">Within 20 km</option>
            </select>

            <select className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400">
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

          <p className="text-sm text-slate-500">
            {filteredPlayers.length} people found
          </p>
        </div>

          {filteredPlayers.length === 0 && (
            <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-10 text-center">
              <h3 className="text-lg font-semibold">
                No athletes found for this sport
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try another sport or select All sports.
              </p>
            </div>
         )}
         {filteredPlayers.length > 0 && (
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