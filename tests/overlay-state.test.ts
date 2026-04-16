import { describe, it, expect } from "vitest";
import {
  parseOverlayParam,
  serializeOverlayParam,
  toggleOverlay,
  type OverlayName,
} from "../src/logic/overlay-state";

describe("parseOverlayParam", () => {
  it("returns an empty Set on null", () => {
    expect(parseOverlayParam(null).size).toBe(0);
  });
  it("splits on commas and trims", () => {
    const s = parseOverlayParam("encumbrance, anomaly");
    expect(s.has("encumbrance")).toBe(true);
    expect(s.has("anomaly")).toBe(true);
  });
  it("drops unknown tokens silently", () => {
    const s = parseOverlayParam("encumbrance,chaos,lastdeed");
    expect(s.has("encumbrance")).toBe(true);
    expect(s.has("lastdeed")).toBe(true);
    expect(s.size).toBe(2);
  });
});

describe("serializeOverlayParam", () => {
  it("returns empty string for empty Set", () => {
    expect(serializeOverlayParam(new Set())).toBe("");
  });
  it("joins with comma, fixed order: encumbrance,anomaly,lastdeed", () => {
    const s = new Set<OverlayName>(["lastdeed", "encumbrance"]);
    expect(serializeOverlayParam(s)).toBe("encumbrance,lastdeed");
  });
});

describe("toggleOverlay", () => {
  it("adds the name when absent", () => {
    const s = toggleOverlay(new Set<OverlayName>(), "anomaly");
    expect(s.has("anomaly")).toBe(true);
  });
  it("removes the name when present", () => {
    const s = toggleOverlay(new Set<OverlayName>(["anomaly"]), "anomaly");
    expect(s.has("anomaly")).toBe(false);
  });
  it("returns a new Set (does not mutate)", () => {
    const s = new Set<OverlayName>();
    const out = toggleOverlay(s, "encumbrance");
    expect(s.size).toBe(0);
    expect(out.size).toBe(1);
  });
});

describe("round-trip", () => {
  it("parse(serialize(x)) == x for any subset", () => {
    const subsets: OverlayName[][] = [[], ["encumbrance"], ["anomaly", "lastdeed"], ["encumbrance", "anomaly", "lastdeed"]];
    for (const sub of subsets) {
      const s = new Set<OverlayName>(sub);
      expect(parseOverlayParam(serializeOverlayParam(s))).toEqual(s);
    }
  });
});
