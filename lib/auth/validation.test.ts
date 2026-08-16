import { describe, expect, it } from "vitest";
import { normalizeEmail, safeAuthError, validateEmail, validatePassword } from "./validation";
describe("authentication validation", () => {
  it("normalizes and validates email", () => {
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
    expect(validateEmail("not-an-email").ok).toBe(false);
  });
  it("validates recovery passwords", () => {
    expect(validatePassword("short").ok).toBe(false);
    expect(validatePassword("long-enough").ok).toBe(true);
  });
  it("does not return raw unknown provider errors", () => expect(safeAuthError("database details")).not.toContain("database"));
});
