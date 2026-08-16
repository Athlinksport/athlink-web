import { describe, expect, it } from "vitest";
import { validateGroup, validatedGroupPostImagePath } from "./utils";
describe("group validation", () => {
  it("rejects incomplete groups", () => expect(validateGroup({ name: "x", description: "", sport: "", city: "", country: "", privacy: "public", avatarUrl: null, coverImageUrl: null })).toBeTruthy());
  it("accepts a complete group", () => expect(validateGroup({ name: "Paris Runners", description: "A welcoming weekly running community.", sport: "Running", city: "Paris", country: "France", privacy: "public", avatarUrl: null, coverImageUrl: null })).toBeNull());
  it("binds media paths", () => expect(validatedGroupPostImagePath("u/g/a.webp", "u", "g")).toBe("u/g/a.webp"));
});
