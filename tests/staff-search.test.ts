import { describe, it, expect } from "vitest";
import { searchByName } from "../src/logic/staff-search";

describe("searchByName", () => {
  it("returns multiple groups for POPHAM and includes the attributed 304-78-386 parcel", () => {
    const groups = searchByName("POPHAM");
    expect(groups.length).toBeGreaterThan(1);
    const popham = groups.find((g) => g.attributed_parcel_apn === "304-78-386");
    expect(popham).toBeDefined();
    expect(popham?.kind).toBe("attributed");
  });

  it("returns at least one same_name_candidate group for HOGUE", () => {
    const groups = searchByName("HOGUE");
    const suppressed = groups.filter((g) => g.kind === "same_name_candidate");
    expect(suppressed.length).toBeGreaterThanOrEqual(1);
    expect(suppressed[0].results.length).toBeGreaterThanOrEqual(1);
  });

  it("is case-insensitive and matches partial name fragments", () => {
    const groups = searchByName("pop");
    expect(groups.length).toBeGreaterThan(0);
    const allNames = groups.flatMap((g) => g.results.flatMap((r) => r.names));
    expect(allNames.some((n) => /POPHAM/i.test(n))).toBe(true);
  });

  it("returns [] on no match", () => {
    expect(searchByName("zzzz_no_match")).toEqual([]);
  });

  it("returns [] for queries under 2 characters", () => {
    expect(searchByName("a")).toEqual([]);
    expect(searchByName("")).toEqual([]);
  });
});
