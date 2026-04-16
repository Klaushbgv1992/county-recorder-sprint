import { describe, it, expect } from "vitest";
import { resolveDrawerVariant } from "../src/logic/drawer-variant";

const curatedApns = new Set(["304-78-386", "304-77-689"]);
const cachedApns = new Set(["304-78-300"]);
const seededApns = new Set(["304-78-300", "304-78-999", "304-78-386", "304-77-689"]);

describe("resolveDrawerVariant", () => {
  it("returns 'curated' when apn is in curated set", () => {
    expect(resolveDrawerVariant("304-78-386", { curatedApns, cachedApns, seededApns }))
      .toBe("curated");
  });
  it("returns 'recorder_cached' when apn is in cache but not curated", () => {
    expect(resolveDrawerVariant("304-78-300", { curatedApns, cachedApns, seededApns }))
      .toBe("recorder_cached");
  });
  it("returns 'assessor_only' when apn is seeded but neither curated nor cached", () => {
    expect(resolveDrawerVariant("304-78-999", { curatedApns, cachedApns, seededApns }))
      .toBe("assessor_only");
  });
  it("returns 'not_in_seeded_area' when apn is nowhere", () => {
    expect(resolveDrawerVariant("999-99-999", { curatedApns, cachedApns, seededApns }))
      .toBe("not_in_seeded_area");
  });
  it("curated wins when apn is in multiple tiers (defensive)", () => {
    const dup = new Set(["304-78-386"]);
    expect(resolveDrawerVariant("304-78-386", {
      curatedApns,
      cachedApns: dup,
      seededApns,
    })).toBe("curated");
  });
});
