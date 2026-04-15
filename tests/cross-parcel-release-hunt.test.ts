import { describe, it, expect } from "vitest";
import { huntCrossParcelRelease } from "../src/logic/cross-parcel-release-hunt";

describe("huntCrossParcelRelease", () => {
  it("returns honest zero for HOGUE lc-003 with a nonzero scanned party count and curator verified_through", () => {
    const result = huntCrossParcelRelease({
      lifecycle_id: "lc-003",
      parcel_apn: "304-77-689",
      borrower_names: ["HOGUE JASON", "HOGUE MICHELE"],
    });
    expect(result.candidates).toEqual([]);
    expect(result.scanned_party_count).toBeGreaterThan(0);
    expect(result.verified_through).toBe("2026-04-05");
  });

  it("returns at least one candidate for the POPHAM synthetic cross-parcel release hunt", () => {
    const result = huntCrossParcelRelease({
      lifecycle_id: "lc-demo-synthetic",
      parcel_apn: "999-99-001",
      borrower_names: ["POPHAM CHRISTOPHER"],
    });
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(
      result.candidates.every((c) => c.attributed_parcel_apn !== "999-99-001"),
    ).toBe(true);
  });
});
