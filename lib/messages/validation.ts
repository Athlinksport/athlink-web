import { DIRECT_MESSAGE_MAX_LENGTH } from "@/lib/messages/constants";

export function validateDirectMessage(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Message cannot be empty.";
  if (value.trim().length > DIRECT_MESSAGE_MAX_LENGTH) return `Message must be ${DIRECT_MESSAGE_MAX_LENGTH} characters or fewer.`;
  return null;
}

export function applyConfirmedUnreadCount(current: number, confirmed: unknown) {
  return typeof confirmed === "number" && Number.isFinite(confirmed) && confirmed >= 0
    ? Math.floor(confirmed)
    : current;
}
