export const REPORT_REASONS = ["harassment", "hate", "threats", "spam", "fraud", "impersonation", "sexual_content", "unsafe_activity", "other"] as const;
export const REPORT_TARGETS = ["user", "group", "post", "comment", "message"] as const;
export type ReportReason = typeof REPORT_REASONS[number];
export type ReportTarget = typeof REPORT_TARGETS[number];
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateBlockInput(targetId: unknown, userId?: string) {
  if (typeof targetId !== "string" || !UUID_PATTERN.test(targetId)) return "Choose a valid member.";
  if (targetId === userId) return "You cannot block yourself.";
  return null;
}

export function validateReportInput(input: unknown) {
  if (!input || typeof input !== "object") return { ok: false as const, error: "Invalid report." };
  const value = input as { targetType?: unknown; targetId?: unknown; reason?: unknown; details?: unknown };
  if (!REPORT_TARGETS.includes(value.targetType as ReportTarget) || typeof value.targetId !== "string" || !UUID_PATTERN.test(value.targetId) || !REPORT_REASONS.includes(value.reason as ReportReason)) return { ok: false as const, error: "Choose a valid report reason and target." };
  const details = typeof value.details === "string" ? value.details.trim() : "";
  if (details.length > 500) return { ok: false as const, error: "Report details must be 500 characters or fewer." };
  return { ok: true as const, value: { target_type: value.targetType as ReportTarget, target_id: value.targetId, reason: value.reason as ReportReason, details: details || null } };
}
