import { describe, expect, it } from "vitest";
import { validateBlockInput, validateReportInput } from "./validation";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
describe("report and block validation", () => {
  it("prevents self-blocks", () => expect(validateBlockInput(A, A)).toContain("yourself"));
  it("accepts another member", () => expect(validateBlockInput(B, A)).toBeNull());
  it("limits report input", () => {
    expect(validateReportInput({ targetType: "user", targetId: B, reason: "spam", details: "x" }).ok).toBe(true);
    expect(validateReportInput({ targetType: "user", targetId: B, reason: "invalid" }).ok).toBe(false);
  });
});
