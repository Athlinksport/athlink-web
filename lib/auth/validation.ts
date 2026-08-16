export const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function validateEmail(value: unknown) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }
  return { ok: true as const, value: email };
}

export function validatePassword(value: unknown) {
  const password = String(value ?? "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false as const, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (password.length > 128) {
    return { ok: false as const, error: "Password must be 128 characters or fewer." };
  }
  return { ok: true as const, value: password };
}

export function safeAuthError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("email not confirmed")) return "Confirm your email before signing in.";
  if (normalized.includes("invalid login")) return "Email or password is incorrect.";
  if (normalized.includes("rate") || normalized.includes("too many")) return "Too many attempts. Wait a few minutes and try again.";
  return "We could not complete that request. Check your details and try again.";
}
