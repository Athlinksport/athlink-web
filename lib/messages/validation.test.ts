import { describe, expect, it } from "vitest";
import { applyConfirmedUnreadCount, validateDirectMessage } from "./validation";
describe("direct messages and read state", () => {
  it("rejects empty and oversized messages", () => {
    expect(validateDirectMessage(" ")).toBeTruthy();
    expect(validateDirectMessage("x".repeat(4001))).toBeTruthy();
    expect(validateDirectMessage("hello")).toBeNull();
  });
  it("clears unread state from a confirmed room result", () => {
    expect(applyConfirmedUnreadCount(4, 0)).toBe(0);
    expect(applyConfirmedUnreadCount(4, -1)).toBe(4);
  });
});
