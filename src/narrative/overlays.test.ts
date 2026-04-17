import { describe, it, expect } from "vitest";
import { loadOverlayForApn } from "./overlays";

describe("loadOverlayForApn", () => {
  it("returns null for an APN with no overlay file", () => {
    expect(loadOverlayForApn("999-99-999")).toBeNull();
  });
});
