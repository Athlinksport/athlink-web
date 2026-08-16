"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { Textarea } from "@/components/ui/textarea";
import { GROUP_POST_IMAGE_SIGNED_URL_TTL_SECONDS, GROUP_POST_MAX } from "@/lib/groups/constants";
import type { GroupPost, ProfileSummary } from "@/lib/groups/types";
import { safeFileExtension, validateImage } from "@/lib/groups/utils";

export function PostComposer({
  supabase,
  groupId,
  userId,
  profile,
  onCreated,
}: {
  supabase: SupabaseClient;
  groupId: string;
  userId: string;
  profile: ProfileSummary | null;
  onCreated: (post: GroupPost) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const imageError = validateImage(file);
    if (imageError) { setError(imageError); return; }
    if (image) URL.revokeObjectURL(image.preview);
    setImage({ file, preview: URL.createObjectURL(file) });
    setError("");
  }
  function removeImage() {
    if (image) URL.revokeObjectURL(image.preview);
    setImage(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) { setError("Write something before posting."); return; }
    setIsSubmitting(true);
    setError("");
    let imagePath: string | null = null;
    let imageUrl: string | null = null;
    if (image) {
      imagePath = `${userId}/${groupId}/post-${crypto.randomUUID()}.${safeFileExtension(image.file)}`;
      const { error: uploadError } = await supabase.storage.from("group-post-images").upload(imagePath, image.file);
      if (uploadError) { setError("The image could not be uploaded. Please try again."); setIsSubmitting(false); return; }
      imageUrl = image.preview;
    }
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: GroupPost = {
      id: optimisticId, group_id: groupId, author_id: userId, content: trimmed, image_url: imageUrl,
      comment_count: 0, like_count: 0, is_pinned: false, created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), author: profile, author_role: null, viewer_has_liked: false,
    };
    onCreated(optimistic);
    const { data, error: insertError } = await supabase.from("group_posts").insert({ group_id: groupId, author_id: userId, content: trimmed, image_url: imagePath }).select("*").single();
    if (insertError) {
      if (imagePath) {
        await fetch("/api/groups/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: "group-post-images", path: imagePath }),
        });
      }
      onCreated({ ...optimistic, id: optimisticId, content: `__ROLLBACK__${optimisticId}` });
      setError("The post could not be published. Please try again.");
      setIsSubmitting(false);
      return;
    }
    let renderedImageUrl: string | null = null;
    if (imagePath) {
      const { data: signedImage, error: signedImageError } = await supabase.storage
        .from("group-post-images")
        .createSignedUrl(imagePath, GROUP_POST_IMAGE_SIGNED_URL_TTL_SECONDS);
      if (signedImageError) setError("The post was created, but its image could not be loaded.");
      renderedImageUrl = signedImage?.signedUrl ?? null;
    }
    onCreated({ ...(data as GroupPost), image_url: renderedImageUrl, author: profile, author_role: null, viewer_has_liked: false, content: `__REPLACE__${optimisticId}__CONTENT__${data.content}` });
    setContent("");
    removeImage();
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-surface/85 p-4 shadow-surface transition focus-within:border-lime-300/30 sm:p-5">
      <label htmlFor="group-post-content" className="sr-only">Write a post</label>
      <Textarea id="group-post-content" value={content} onChange={(event) => setContent(event.target.value)} maxLength={GROUP_POST_MAX} rows={2} placeholder="Share a session, question, result, or useful tip…" className="min-h-20 resize-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0" />
      {image && <div className="relative mt-3 h-56 overflow-hidden rounded-2xl bg-slate-900"><Image src={image.preview} alt="Post image preview" fill unoptimized className="object-cover" /><Button type="button" size="icon-sm" variant="secondary" aria-label="Remove attached image" onClick={removeImage} className="absolute top-2 right-2"><X /></Button></div>}
      {error && <InlineError className="mt-3">{error}</InlineError>}
      <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus />Photo</Button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} className="sr-only" />
          <span className="text-xs text-muted-foreground">{content.length}/{GROUP_POST_MAX}</span>
        </div>
        <Button type="submit" disabled={isSubmitting || !content.trim()}><Send />{isSubmitting ? "Posting…" : "Post"}</Button>
      </div>
    </form>
  );
}
