import { describe, it, expect } from "vitest";
import type {
  NarrativeOverlay,
  StoryMode,
} from "./types";

describe("narrative types", () => {
  it("NarrativeOverlay accepts full POPHAM-shaped object", () => {
    const ov: NarrativeOverlay = {
      hero_override: "custom hero",
      callouts: { "20130183449": "a note" },
      what_this_means: "for you",
      moat_note: "vs plant",
    };
    expect(ov.callouts["20130183449"]).toBe("a note");
  });

  it("NarrativeOverlay accepts sparse object with only what_this_means", () => {
    const ov: NarrativeOverlay = {
      hero_override: null,
      callouts: {},
      what_this_means: "for you",
      moat_note: null,
    };
    expect(ov.what_this_means).toBeDefined();
  });

  it("StoryMode is curated or partial", () => {
    const a: StoryMode = "curated";
    const b: StoryMode = "partial";
    expect([a, b]).toHaveLength(2);
  });
});
