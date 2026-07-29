"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ImagePlus, LockKeyhole, ShieldCheck, UsersRound, X } from "lucide-react";

import { sports } from "@/data/sports";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from "@/lib/groups/constants";
import type { CreateGroupInput, Group } from "@/lib/groups/types";
import { safeFileExtension, validateGroup, validateImage } from "@/lib/groups/utils";

type ImageSelection = { file: File; preview: string };

function ImagePicker({
  label,
  value,
  onChange,
  aspect,
}: {
  label: string;
  value: ImageSelection | null;
  onChange: (value: ImageSelection | null, error?: string) => void;
  aspect: "avatar" | "cover";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const error = validateImage(file);
    if (error) { onChange(null, error); return; }
    onChange({ file, preview: URL.createObjectURL(file) });
  }
  return (
    <div>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <div className={`relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/4 ${aspect === "cover" ? "h-44" : "size-32"}`}>
        {value ? <Image src={value.preview} alt={`${label} preview`} fill unoptimized className="object-cover" /> : <button type="button" onClick={() => inputRef.current?.click()} className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-white"><ImagePlus className="size-6 text-lime-300" />Choose image</button>}
        {value && <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange(null)} className="absolute top-2 right-2 rounded-full bg-slate-950/80 p-2 text-white backdrop-blur hover:bg-slate-900"><X className="size-4" /></button>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={select} />
      <p className="mt-2 text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF. Maximum 8 MB.</p>
    </div>
  );
}

export function CreateGroupForm() {
  const router = useRouter();
  const { supabase, user, isAuthLoading } = useAuth();
  const [form, setForm] = useState<CreateGroupInput>({ name: "", description: "", sport: "", city: "", country: "", privacy: "public", avatarUrl: null, coverImageUrl: null });
  const [avatar, setAvatar] = useState<ImageSelection | null>(null);
  const [cover, setCover] = useState<ImageSelection | null>(null);
  const [error, setError] = useState("");
  const [countryError, setCountryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const avatarPreviewUrlRef = useRef<string | null>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace("/login");
  }, [isAuthLoading, router, user]);
  useEffect(() => () => {
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
    }
    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
    }
  }, []);

  function set<K extends keyof CreateGroupInput>(key: K, value: CreateGroupInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function setImage(kind: "avatar" | "cover", value: ImageSelection | null, imageError?: string) {
    const previewRef = kind === "avatar" ? avatarPreviewUrlRef : coverPreviewUrlRef;
    const previousUrl = previewRef.current;
    previewRef.current = value?.preview ?? null;
    if (kind === "avatar") setAvatar(value); else setCover(value);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    setError(imageError ?? "");
  }
  async function upload(file: File, bucket: string, groupId: string, name: string) {
    if (!user) throw new Error("You must be signed in.");
    const path = `${user.id}/${groupId}/${name}-${Date.now()}.${safeFileExtension(file)}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || submissionInProgress.current) return;
    const country = form.country.trim();
    if (!country) {
      setCountryError("Enter a country.");
      return;
    }
    if (country.length < 2 || country.length > 100) {
      setCountryError("Country must be between 2 and 100 characters.");
      return;
    }
    const validationError = validateGroup(form);
    if (validationError) { setError(validationError); return; }
    submissionInProgress.current = true;
    setError("");
    setIsSubmitting(true);
    const { data, error: createError } = await supabase.rpc("create_group", {
      group_name: form.name.trim(), group_description: form.description.trim(), group_sport: form.sport,
      group_country: country, group_city: form.city.trim() || null, group_privacy: form.privacy,
      group_avatar_url: null, group_cover_image_url: null,
    });
    if (createError) {
      submissionInProgress.current = false;
      setError(createError.message);
      setIsSubmitting(false);
      return;
    }
    const group = data as Group;
    const uploaded: Array<{ bucket: string; path: string }> = [];
    try {
      const [avatarUpload, coverUpload] = await Promise.allSettled([
        avatar ? upload(avatar.file, "group-avatars", group.id, "avatar") : null,
        cover ? upload(cover.file, "group-covers", group.id, "cover") : null,
      ]);
      const avatarResult = avatarUpload.status === "fulfilled" ? avatarUpload.value : null;
      const coverResult = coverUpload.status === "fulfilled" ? coverUpload.value : null;
      if (avatarResult) uploaded.push({ bucket: "group-avatars", path: avatarResult.path });
      if (coverResult) uploaded.push({ bucket: "group-covers", path: coverResult.path });
      const failedUpload = [avatarUpload, coverUpload].find((result) => result.status === "rejected");
      if (failedUpload?.status === "rejected") throw failedUpload.reason;
      if (avatarResult || coverResult) {
        const { error: updateError } = await supabase.from("groups").update({ avatar_url: avatarResult?.url ?? null, cover_image_url: coverResult?.url ?? null }).eq("id", group.id);
        if (updateError) throw new Error(updateError.message);
      }
      router.replace(`/groups/${group.id}`);
    } catch {
      const cleanupResults = await Promise.allSettled(uploaded.map(async (item) => {
        const response = await fetch("/api/groups/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error ?? "Uploaded media cleanup failed.");
        }
      }));
      const cleanupFailureCount = cleanupResults.filter((result) => result.status === "rejected").length;
      const cleanupMessage = cleanupFailureCount
        ? ` Cleanup also failed for ${cleanupFailureCount} uploaded ${cleanupFailureCount === 1 ? "file" : "files"}.`
        : "";
      const warning = `Your group was created, but one or more images could not be saved and can be added later.${cleanupMessage}`;
      router.replace(`/groups/${group.id}?imageWarning=${encodeURIComponent(warning)}`);
    }
  }

  if (isAuthLoading || !user) return <main className="grid min-h-svh place-items-center text-muted-foreground">Preparing group creation…</main>;

  return (
    <main className="min-h-svh bg-transparent">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Button nativeButton={false} render={<Link href="/groups" />} variant="ghost"><ArrowLeft />Back to groups</Button>
        <header className="mt-7 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-300">Start a community</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Build the group you want to join.</h1>
          <p className="mt-3 text-muted-foreground">Set the tone, invite athletes, and turn a shared sport into a reliable community.</p>
        </header>
        <form onSubmit={submit} className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-surface/80 p-5 shadow-surface backdrop-blur-xl sm:p-7">
            {error && <InlineError>{error}</InlineError>}
            <label className="block"><span className="mb-2 flex justify-between text-sm font-medium"><span>Group name</span><span className="text-xs text-muted-foreground">{form.name.length}/{GROUP_NAME_MAX}</span></span><Input required minLength={3} maxLength={GROUP_NAME_MAX} value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Toulouse Saturday Runners" /></label>
            <label className="block"><span className="mb-2 flex justify-between text-sm font-medium"><span>Description</span><span className="text-xs text-muted-foreground">{form.description.length}/{GROUP_DESCRIPTION_MAX}</span></span><Textarea required minLength={20} maxLength={GROUP_DESCRIPTION_MAX} rows={7} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Tell athletes who this group is for, how you train, and what members can expect…" /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className="mb-2 block text-sm font-medium">Primary sport</span><select required value={form.sport} onChange={(event) => set("sport", event.target.value)} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"><option value="">Choose a sport</option>{sports.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
              <label><span className="mb-2 block text-sm font-medium">Privacy</span><select value={form.privacy} onChange={(event) => set("privacy", event.target.value as "public" | "private")} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"><option value="public">Public — anyone can join</option><option value="private">Private — approve requests</option></select></label>
              <label>
                <span className="mb-2 block text-sm font-medium">Country</span>
                <Input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="country-name"
                  aria-invalid={Boolean(countryError)}
                  aria-describedby={countryError ? "create-country-error" : undefined}
                  value={form.country}
                  onInvalid={() => setCountryError(form.country.trim() ? "Country must be between 2 and 100 characters." : "Enter a country.")}
                  onChange={(event) => {
                    set("country", event.target.value);
                    setCountryError("");
                  }}
                  placeholder="France"
                />
                {countryError && <span id="create-country-error" className="mt-2 block text-xs text-destructive">{countryError}</span>}
              </label>
              <label><span className="mb-2 block text-sm font-medium">City <span className="text-muted-foreground">(optional)</span></span><Input maxLength={100} autoComplete="address-level2" value={form.city} onChange={(event) => set("city", event.target.value)} placeholder="Toulouse" /></label>
            </div>
            <div className="grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-[9rem_1fr]">
              <ImagePicker label="Group avatar" value={avatar} onChange={(value, imageError) => setImage("avatar", value, imageError)} aspect="avatar" />
              <ImagePicker label="Cover image" value={cover} onChange={(value, imageError) => setImage("cover", value, imageError)} aspect="cover" />
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
              <Button nativeButton={false} render={<Link href="/groups" />} variant="ghost">Cancel</Button>
              <Button type="submit" size="lg" disabled={isSubmitting}><Camera />{isSubmitting ? "Creating your group…" : "Create group"}</Button>
            </div>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-lime-300/15 bg-lime-300/5 p-5">
              <ShieldCheck className="size-6 text-lime-300" />
              <h2 className="mt-3 font-semibold">You stay in control</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">You become the owner automatically and can appoint admins or moderators later.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              {form.privacy === "private" ? <LockKeyhole className="size-6 text-cyan-300" /> : <UsersRound className="size-6 text-cyan-300" />}
              <h2 className="mt-3 font-semibold">{form.privacy === "private" ? "Approval required" : "Open community"}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{form.privacy === "private" ? "Only active members can see the private group and its content." : "Authenticated athletes can discover the group and join immediately."}</p>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}
