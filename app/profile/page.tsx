"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const languageOptions = [
  "English",
  "French",
  "German",
  "Italian",
  "Spanish",
  "Persian",
  "Chinese",
  "Arabic",
  "Portuguese",
  "Turkish",
  "Russian",
  "Dutch",
  "Japanese",
  "Korean",
];

const lookingForOptions = [
  "Sports partner",
  "Training buddy",
  "Team",
  "Group activities",
  "Friendship",
  "Coach",
  "Students",
  "Professional networking",
  "Dating",
];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [cityName, setCityName] = useState("");
  const [countryName, setCountryName] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [searchRadius, setSearchRadius] = useState(10);
  const [locationVisibility, setLocationVisibility] = useState("city");
  const [profileVisibility, setProfileVisibility] = useState("public");

  const [birthDate, setBirthDate] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const userBirthDate = user.user_metadata?.birth_date || null;
      setBirthDate(userBirthDate);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setCityName(data.city_name || "");
        setCountryName(data.country_name || "");
        setLanguages(data.languages || []);
        setLookingFor(data.looking_for || []);
        setSearchRadius(data.search_radius_km || 10);
        setLocationVisibility(data.location_visibility || "city");
        setProfileVisibility(data.profile_visibility || "public");
        setBirthDate(data.birth_date || userBirthDate);
      } else {
        setDisplayName(user.user_metadata?.first_name || "");
        setBirthDate(userBirthDate);
      }

      setIsLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  function toggleLanguage(language: string) {
    setLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language]
    );
  }

  function toggleLookingFor(option: string) {
    setLookingFor((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    if (!displayName.trim()) {
      setMessage("Please enter a display name.");
      return;
    }

    if (!cityName.trim()) {
      setMessage("Please enter your city.");
      return;
    }

    if (languages.length === 0) {
      setMessage("Please select at least one language.");
      return;
    }

    if (lookingFor.length === 0) {
      setMessage("Please select at least one connection type.");
      return;
    }

    setMessage("");
    setIsSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName.trim(),
      birth_date: birthDate,
      bio: bio.trim() || null,
      city_name: cityName.trim(),
      country_name: countryName.trim() || null,
      languages,
      looking_for: lookingFor,
      search_radius_km: searchRadius,
      location_visibility: locationVisibility,
      profile_visibility: profileVisibility,
      dating_enabled: lookingFor.includes("Dating"),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
      setIsSaving(false);
      return;
    }

    setMessage("Profile saved successfully.");
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="text-2xl font-bold">
            Athlink
          </Link>

          <nav className="flex items-center gap-5 text-sm text-slate-300">
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>

            <Link href="/rooms" className="hover:text-white">
              Rooms
            </Link>

            <Link href="/profile" className="text-white">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
            Your profile
          </p>

          <h1 className="mt-4 text-4xl font-bold">
            Tell us how you want to connect
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Only a few details are required. Everything else can be completed
            later.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Link
            href="/profile/sports"
            className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-lime-400/50"
            >
            <p className="text-sm text-slate-400">Sports profile</p>

            <h2 className="mt-2 text-xl font-semibold">
            Manage your sports
            </h2>

            <p className="mt-2 text-sm text-slate-500">
            Add sports, levels, goals and frequency.
            </p>
            </Link>

            <Link
              href="/profile/availability"
              className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-lime-400/50"
            >
             <p className="text-sm text-slate-400">
               Availability
             </p>

             <h2 className="mt-2 text-xl font-semibold">
              Set your availability
             </h2>

             <p className="mt-2 text-sm text-slate-500">
               Choose the days and times that usually work for you.
             </p>
            </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
        >
          <section>
            <h2 className="text-xl font-semibold">Basic information</h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Display name *
                </label>

                <input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="How should people call you?"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                />
              </div>

              <div>
                 <label
                  htmlFor="birthDate"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Date of birth
                </label>

                <input
                  id="birthDate"
                  type="date"
                  value={birthDate || ""}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-lime-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                   Your full date of birth will remain private. Only your age may be shown on your public profile.
                </p>
              </div> 

              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm text-slate-300"
                >
                  City *
                </label>

                <input
                  id="city"
                  value={cityName}
                  onChange={(event) => setCityName(event.target.value)}
                  placeholder="Start typing your city"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Country
                </label>

                <input
                  id="country"
                  value={countryName}
                  onChange={(event) => setCountryName(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label
                  htmlFor="radius"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Search radius
                </label>

                <select
                  id="radius"
                  value={searchRadius}
                  onChange={(event) =>
                    setSearchRadius(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                >
                  <option value={1}>1 km</option>
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="bio"
                className="mb-2 block text-sm text-slate-300"
              >
                Short introduction
                <span className="ml-2 text-slate-500">Optional</span>
              </label>

              <textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={300}
                rows={4}
                placeholder="Tell people a little about your sports interests and personality."
                className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
              />

              <p className="mt-2 text-right text-xs text-slate-500">
                {bio.length}/300
              </p>
            </div>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-xl font-semibold">Communication languages *</h2>

            <p className="mt-2 text-sm text-slate-400">
              Select all languages you are comfortable using.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {languageOptions.map((language) => {
                const selected = languages.includes(language);

                return (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      selected
                        ? "border-lime-400 bg-lime-400 text-slate-950"
                        : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {language}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-xl font-semibold">
              What are you open to finding? *
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Choose at least one. Dating is optional and can be disabled at
              any time.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {lookingForOptions.map((option) => {
                const selected = lookingFor.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleLookingFor(option)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-lime-400 bg-lime-400/10 text-lime-300"
                        : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-xl font-semibold">Privacy</h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Location visibility
                </label>

                <select
                  value={locationVisibility}
                  onChange={(event) =>
                    setLocationVisibility(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                >
                  <option value="city">Show city only</option>
                  <option value="approximate">Approximate area</option>
                  <option value="distance">Distance only</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Profile visibility
                </label>

                <select
                  value={profileVisibility}
                  onChange={(event) =>
                    setProfileVisibility(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
                >
                  <option value="public">Visible to Athlink members</option>
                  <option value="connections">Connections only</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
          </section>

          {message && (
            <p
              className={`rounded-xl px-4 py-3 text-sm ${
                message === "Profile saved successfully."
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
              className="rounded-xl border border-white/10 px-6 py-3 text-center font-medium text-slate-300 hover:bg-white/5"
            >
              Skip for now
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-lime-400 px-7 py-3 font-semibold text-slate-950 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save and continue"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}