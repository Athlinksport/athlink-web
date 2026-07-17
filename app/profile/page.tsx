"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";

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

async function createCroppedImage(
  imageSource: string,
  cropPixels: Area
): Promise<File> {
  const image = new Image();
  image.src = imageSource;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("The selected image could not be loaded."));
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image editing is not supported.");
  }

  canvas.width = 600;
  canvas.height = 600;

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    600,
    600
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("The edited image could not be created."));
        }
      },
      "image/jpeg",
      0.9
    );
  });

  return new File([blob], "avatar.jpg", {
    type: "image/jpeg",
  });
}

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageUrl, setCropImageUrl] =
    useState<string | null>(null);

  const [crop, setCrop] = useState<Point>({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [rotation, setRotation] = useState(0);

  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<Area | null>(null);

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
        setAvatarUrl(data.avatar_url || null);
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

  function handleAvatarSelect(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profile photo must be smaller than 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setCropImageUrl(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);

    event.target.value = "";
  }

  async function uploadAvatarFile(file: File) {

    if (!userId) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profile photo must be smaller than 5 MB.");
      return;
    }

    setMessage("");
    setIsUploadingAvatar(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      setIsUploadingAvatar(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      setMessage(profileError.message);
      setIsUploadingAvatar(false);
      return;
    }

    setAvatarUrl(publicUrl);
    setMessage("Profile photo uploaded successfully.");
    setIsUploadingAvatar(false);
  }

  function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatarFile(file);
    }
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
      avatar_url: avatarUrl,
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
          <section className="border-t border-white/10 pt-8">
            <h2 className="text-xl font-semibold">Profile photo</h2>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-900">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-lime-400">
                    {displayName.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>

              <div>
                <label
                  htmlFor="avatar"
                  className="inline-flex cursor-pointer rounded-xl bg-lime-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-lime-300"
                >
                  {isUploadingAvatar ? "Uploading..." : "Choose profile photo"}
                </label>

                <input
                  id="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarSelect}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />

                <p className="mt-3 text-sm text-slate-500">
                  JPG, PNG or WebP. Maximum size: 5 MB.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 pt-8">
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
                      className={`rounded-full border px-4 py-2 text-sm transition ${selected
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
                    className={`rounded-xl border px-4 py-3 text-left transition ${selected
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
              className={`rounded-xl px-4 py-3 text-sm ${message.includes("successfully")
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
      {cropImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl">            <h2 className="text-xl font-semibold">
            Edit profile photo
          </h2>

            <div className="relative mt-5 h-[320px] overflow-hidden rounded-2xl bg-black">
              <Cropper
                image={cropImageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
              />
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Zoom
                </label>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(event) =>
                    setZoom(Number(event.target.value))
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(cropImageUrl);
                  setCropImageUrl(null);
                }}
                className="rounded-xl border border-white/10 px-5 py-3 font-medium text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={async () => {
                  if (!croppedAreaPixels) {
                    setMessage("Please adjust the photo first.");
                    return;
                  }

                  try {
                    const croppedFile = await createCroppedImage(
                      cropImageUrl,
                      croppedAreaPixels
                    );

                    await uploadAvatarFile(croppedFile);

                    URL.revokeObjectURL(cropImageUrl);
                    setCropImageUrl(null);
                  } catch (error) {
                    console.error(error);
                    setMessage("The edited image could not be saved.");
                  }
                }}
                className="rounded-xl bg-lime-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploadingAvatar ? "Uploading..." : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}