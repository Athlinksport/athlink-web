"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sports } from "@/data/sports";
import { useAuth } from "@/hooks/use-auth";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from "@/lib/groups/constants";
import type { CreateGroupInput, Group } from "@/lib/groups/types";
import { safeFileExtension, validateGroup, validateImage } from "@/lib/groups/utils";

type ImageSelection = { file: File; preview: string };
type MediaKind = "avatar" | "cover";

function EditImagePicker({
  label,
  aspect,
  currentUrl,
  selection,
  removed,
  onSelect,
  onRemove,
}: {
  label: string;
  aspect: MediaKind;
  currentUrl: string | null;
  selection: ImageSelection | null;
  removed: boolean;
  onSelect: (value: ImageSelection | null, error?: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = selection?.preview ?? (removed ? null : currentUrl);
  function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const error = validateImage(file);
    if (error) return onSelect(null, error);
    onSelect({ file, preview: URL.createObjectURL(file) });
  }
  return (
    <div>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <div className={`relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/4 ${aspect === "cover" ? "h-44" : "size-32"}`}>
        {preview ? (
          <Image src={preview} alt={`${label} preview`} fill unoptimized={Boolean(selection)} className="object-cover" />
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-white">
            <ImagePlus className="size-6 text-lime-300" />Choose image
          </button>
        )}
        {preview && (
          <div className="absolute top-2 right-2 flex gap-2">
            <button type="button" aria-label={`Replace ${label.toLowerCase()}`} onClick={() => inputRef.current?.click()} className="rounded-full bg-slate-950/80 p-2 text-white"><ImagePlus className="size-4" /></button>
            <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={onRemove} className="rounded-full bg-slate-950/80 p-2 text-white"><X className="size-4" /></button>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={select} />
      <p className="mt-2 text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF. Maximum 8 MB.</p>
    </div>
  );
}

export function EditGroupForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { supabase, user, isAuthLoading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [form, setForm] = useState<CreateGroupInput | null>(null);
  const [avatar, setAvatar] = useState<ImageSelection | null>(null);
  const [cover, setCover] = useState<ImageSelection | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [error, setError] = useState("");
  const [countryError, setCountryError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionRef = useRef(false);
  const previewsRef = useRef<{ avatar: string | null; cover: string | null }>({ avatar: null, cover: null });
  const groupId = params.id;

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace("/login");
  }, [isAuthLoading, router, user]);
  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;
    void supabase.from("groups").select("*").eq("id", groupId).maybeSingle().then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError || !data) setError(loadError ? "The group could not be loaded. Please try again." : "Group not found.");
      else if (data.owner_id !== user.id) setError("Only the group owner can edit this group.");
      else {
        const loaded = data as Group;
        setGroup(loaded);
        setForm({
          name: loaded.name,
          description: loaded.description,
          sport: loaded.sport,
          city: loaded.city ?? "",
          country: loaded.country,
          privacy: loaded.privacy,
          avatarUrl: loaded.avatar_url,
          coverImageUrl: loaded.cover_image_url,
        });
      }
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [groupId, isAuthLoading, supabase, user]);
  useEffect(() => () => {
    if (previewsRef.current.avatar) URL.revokeObjectURL(previewsRef.current.avatar);
    if (previewsRef.current.cover) URL.revokeObjectURL(previewsRef.current.cover);
  }, []);

  function set<K extends keyof CreateGroupInput>(key: K, value: CreateGroupInput[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }
  function setImage(kind: MediaKind, value: ImageSelection | null, imageError?: string) {
    const previous = previewsRef.current[kind];
    if (previous) URL.revokeObjectURL(previous);
    previewsRef.current[kind] = value?.preview ?? null;
    if (kind === "avatar") {
      setAvatar(value);
      setAvatarRemoved(false);
    } else {
      setCover(value);
      setCoverRemoved(false);
    }
    setError(imageError ?? "");
  }
  function removeImage(kind: MediaKind) {
    setImage(kind, null);
    if (kind === "avatar") setAvatarRemoved(true); else setCoverRemoved(true);
  }
  function reset() {
    if (!group) return;
    setImage("avatar", null);
    setImage("cover", null);
    setAvatarRemoved(false);
    setCoverRemoved(false);
    setForm({
      name: group.name, description: group.description, sport: group.sport,
      city: group.city ?? "", country: group.country, privacy: group.privacy,
      avatarUrl: group.avatar_url, coverImageUrl: group.cover_image_url,
    });
    setError("");
    setCountryError("");
    setSuccess("");
  }
  async function cleanup(items: Array<{ bucket: string; path: string }>) {
    await Promise.allSettled(items.map((item) => fetch("/api/groups/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })));
  }
  async function upload(kind: MediaKind, file: File) {
    if (!user) throw new Error("Authentication required.");
    const bucket = kind === "avatar" ? "group-avatars" : "group-covers";
    const path = `${user.id}/${groupId}/${kind}-${Date.now()}.${safeFileExtension(file)}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw new Error(`${kind === "avatar" ? "Avatar" : "Cover"} upload failed: ${uploadError.message}`);
    return { bucket, path };
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || !user || submissionRef.current) return;
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
    if (validationError) return setError(validationError);
    submissionRef.current = true;
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    const uploaded: Array<{ bucket: string; path: string }> = [];
    try {
      if (avatar) uploaded.push(await upload("avatar", avatar.file));
      if (cover) uploaded.push(await upload("cover", cover.file));
      const avatarUpload = uploaded.find((item) => item.bucket === "group-avatars");
      const coverUpload = uploaded.find((item) => item.bucket === "group-covers");
      const body: Record<string, unknown> = {
        name: form.name, description: form.description, sport: form.sport,
        city: form.city, country, privacy: form.privacy,
      };
      if (avatarUpload) body.avatarPath = avatarUpload.path;
      else if (avatarRemoved) body.avatarPath = null;
      if (coverUpload) body.coverPath = coverUpload.path;
      else if (coverRemoved) body.coverPath = null;
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string; updatedGroupId?: string; group?: Group; cleanupWarning?: { message: string } };
      if (!result.updatedGroupId || !result.group) throw new Error(result.error ?? "The group could not be updated.");
      setGroup(result.group);
      setForm({
        name: result.group.name, description: result.group.description, sport: result.group.sport,
        city: result.group.city ?? "", country: result.group.country, privacy: result.group.privacy,
        avatarUrl: result.group.avatar_url, coverImageUrl: result.group.cover_image_url,
      });
      setImage("avatar", null);
      setImage("cover", null);
      setAvatarRemoved(false);
      setCoverRemoved(false);
      setSuccess(result.cleanupWarning?.message ?? "Group updated successfully.");
    } catch {
      await cleanup(uploaded);
      setError("The group could not be updated. Please try again.");
    } finally {
      submissionRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (isLoading || isAuthLoading) return <main className="grid min-h-[70svh] place-items-center text-muted-foreground">Loading group settings…</main>;
  if (!group || !form) return <main className="mx-auto max-w-3xl px-4 py-16"><InlineError>{error || "Group not found."}</InlineError><Button nativeButton={false} render={<Link href={`/groups/${groupId}`} />} variant="ghost" className="mt-4"><ArrowLeft />Back to group</Button></main>;

  return (
    <main className="min-h-svh px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-5xl">
        <Button nativeButton={false} render={<Link href={`/groups/${groupId}`} />} variant="ghost"><ArrowLeft />Back to group</Button>
        <header className="mt-6"><p className="text-sm font-semibold uppercase tracking-[0.22em] text-lime-300">Owner settings</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Edit {group.name}</h1></header>
        <form onSubmit={submit} className="mt-8 rounded-3xl border border-white/10 bg-surface/80 p-5 shadow-surface backdrop-blur-xl sm:p-7">
          {error && <InlineError>{error}</InlineError>}
          {success && <div role="status" className="mb-5 rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">{success}</div>}
          <div className="grid gap-6">
            <label><span className="mb-2 flex justify-between text-sm font-medium"><span>Group name</span><span className="text-xs text-muted-foreground">{form.name.length}/{GROUP_NAME_MAX}</span></span><Input required minLength={3} maxLength={GROUP_NAME_MAX} value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
            <label><span className="mb-2 flex justify-between text-sm font-medium"><span>Description</span><span className="text-xs text-muted-foreground">{form.description.length}/{GROUP_DESCRIPTION_MAX}</span></span><Textarea required minLength={20} maxLength={GROUP_DESCRIPTION_MAX} rows={7} value={form.description} onChange={(event) => set("description", event.target.value)} /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className="mb-2 block text-sm font-medium">Primary sport</span><select required value={form.sport} onChange={(event) => set("sport", event.target.value)} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm">{sports.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
              <label><span className="mb-2 block text-sm font-medium">Privacy</span><select value={form.privacy} onChange={(event) => set("privacy", event.target.value as "public" | "private")} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"><option value="public">Public — anyone can join</option><option value="private">Private — approve requests</option></select></label>
              <label>
                <span className="mb-2 block text-sm font-medium">Country</span>
                <Input
                  required
                  minLength={2}
                  maxLength={100}
                  aria-invalid={Boolean(countryError)}
                  aria-describedby={countryError ? "edit-country-error" : undefined}
                  value={form.country}
                  onInvalid={() => setCountryError(form.country.trim() ? "Country must be between 2 and 100 characters." : "Enter a country.")}
                  onChange={(event) => {
                    set("country", event.target.value);
                    setCountryError("");
                  }}
                />
                {countryError && <span id="edit-country-error" className="mt-2 block text-xs text-destructive">{countryError}</span>}
              </label>
              <label><span className="mb-2 block text-sm font-medium">City <span className="text-muted-foreground">(optional)</span></span><Input maxLength={100} value={form.city} onChange={(event) => set("city", event.target.value)} /></label>
            </div>
            <div className="grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-[9rem_1fr]">
              <EditImagePicker label="Group avatar" aspect="avatar" currentUrl={group.avatar_url} selection={avatar} removed={avatarRemoved} onSelect={(value, imageError) => setImage("avatar", value, imageError)} onRemove={() => removeImage("avatar")} />
              <EditImagePicker label="Cover image" aspect="cover" currentUrl={group.cover_image_url} selection={cover} removed={coverRemoved} onSelect={(value, imageError) => setImage("cover", value, imageError)} onRemove={() => removeImage("cover")} />
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={reset} disabled={isSubmitting}><RotateCcw />Reset</Button>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => router.push(`/groups/${groupId}`)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}><Save />{isSubmitting ? "Saving changes…" : "Save changes"}</Button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
