import { describe, it, expect } from "vitest";
import { loadOverlayForApn } from "./overlays";
import "./register-overlays";

describe("loadOverlayForApn", () => {
  it("returns null for an APN with no overlay file", () => {
    expect(loadOverlayForApn("999-99-999")).toBeNull();
  });
});

describe("POPHAM overlay", () => {
  it("is loaded and has a hero_override", () => {
    const ov = loadOverlayForApn("304-78-386");
    expect(ov).not.toBeNull();
    expect(ov!.hero_override).toContain("3674 E Palmer St");
    expect(ov!.callouts["20130183449"]).toContain("Madison");
  });
});
