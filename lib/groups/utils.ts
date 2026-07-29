import {
  GROUP_DESCRIPTION_MAX,
  GROUP_IMAGE_MAX_BYTES,
  GROUP_IMAGE_TYPES,
  GROUP_NAME_MAX,
} from "@/lib/groups/constants";
import type { CreateGroupInput, GroupRole } from "@/lib/groups/types";

const GROUP_POST_IMAGE_PUBLIC_PATH = "/storage/v1/object/public/group-post-images/";
const GROUP_POST_IMAGE_SIGNED_PATH = "/storage/v1/object/sign/group-post-images/";

export function groupPostImagePath(value: string) {
  const marker = [GROUP_POST_IMAGE_PUBLIC_PATH, GROUP_POST_IMAGE_SIGNED_PATH]
    .find((candidate) => value.includes(candidate));
  if (!marker) return value.split("?")[0];
  return decodeURIComponent(value.slice(value.indexOf(marker) + marker.length).split("?")[0]);
}

export function validatedGroupPostImagePath(value: string, authorId: string, groupId: string) {
  try {
    const path = groupPostImagePath(value);
    const segments = path.split("/");
    return segments.length === 3
      && segments[0] === authorId
      && segments[1] === groupId
      && Boolean(segments[2])
      ? path
      : null;
  } catch {
    return null;
  }
}

export function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

export function relativeTime(value: string) {
  const elapsed = new Date(value).getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(elapsed) >= size) return formatter.format(Math.round(elapsed / size), unit);
  }
  return "just now";
}

export function canModerate(role: GroupRole | null | undefined) {
  return role === "owner" || role === "admin" || role === "moderator";
}

export function canManageMembers(role: GroupRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export function validateGroup(input: CreateGroupInput) {
  if (input.name.trim().length < 3 || input.name.trim().length > GROUP_NAME_MAX) {
    return `Group name must be between 3 and ${GROUP_NAME_MAX} characters.`;
  }
  if (input.description.trim().length < 20 || input.description.trim().length > GROUP_DESCRIPTION_MAX) {
    return `Description must be between 20 and ${GROUP_DESCRIPTION_MAX} characters.`;
  }
  const country = input.country.trim();
  if (!input.sport.trim() || !country) {
    return "Choose a sport and enter a country.";
  }
  if (country.length < 2 || country.length > 100) {
    return "Country must be between 2 and 100 characters.";
  }
  if (input.city.trim().length > 100) {
    return "City must be 100 characters or fewer.";
  }
  return null;
}

export function validateImage(file: File) {
  if (!GROUP_IMAGE_TYPES.includes(file.type as (typeof GROUP_IMAGE_TYPES)[number])) {
    return "Use a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > GROUP_IMAGE_MAX_BYTES) return "Images must be smaller than 8 MB.";
  return null;
}

export function safeFileExtension(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return byType[file.type] ?? "jpg";
}
