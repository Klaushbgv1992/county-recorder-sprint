import { describe, it, expect } from "vitest";
import { storyPageExists, getStoryMode } from "./availability";

describe("storyPageExists", () => {
  it("returns true for POPHAM curated APN", () => {
    expect(storyPageExists("304-78-386")).toBe(true);
  });
  it("returns true for a cached-neighbor APN (304-78-406)", () => {
    expect(storyPageExists("304-78-406")).toBe(true);
  });
  it("returns false for an unknown APN", () => {
    expect(storyPageExists("999-99-999")).toBe(false);
  });
});

describe("getStoryMode", () => {
  it("returns 'curated' for POPHAM", () => {
    expect(getStoryMode("304-78-386")).toBe("curated");
  });
  it("returns 'partial' for cached neighbor", () => {
    expect(getStoryMode("304-78-406")).toBe("partial");
  });
  it("returns null for unknown APN", () => {
    expect(getStoryMode("999-99-999")).toBeNull();
  });
});
