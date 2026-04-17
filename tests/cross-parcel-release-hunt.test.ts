import { describe, it, expect } from "vitest";
import { huntCrossParcelRelease } from "../src/logic/cross-parcel-release-hunt";
import staffIndex from "../src/data/staff-index.json";
import type { StaffIndexRow } from "../src/logic/staff-search";

describe("huntCrossParcelRelease", () => {
  it("returns honest zero for HOGUE lc-003 with a nonzero scanned party count and curator verified_through", () => {
    const result = huntCrossParcelRelease({
      lifecycle_id: "lc-003",
      parcel_apn: "304-77-689",
      borrower_names: ["HOGUE JASON", "HOGUE MICHELE"],
    });
    expect(result.candidates).toEqual([]);
    expect(result.scanned_party_count).toBeGreaterThan(0);
    // verified_through mirrors the curator stage's verified_through in
    // src/data/pipeline-state.json — roll when the fixture is refreshed.
    expect(result.verified_through).toBe("2026-04-12");
  });

  it("excludes the subject parcel from scanned_party_count and from candidates", () => {
    const subjectApn = "304-78-386";
    const result = huntCrossParcelRelease({
      lifecycle_id: "lc-test",
      parcel_apn: subjectApn,
      borrower_names: ["POPHAM CHRISTOPHER"],
    });
    expect(
      result.candidates.every(
        (c) => c.attributed_parcel_apn !== subjectApn,
      ),
    ).toBe(true);
    const rows = staffIndex as unknown as StaffIndexRow[];
    const expectedScanned = rows.filter(
      (r) =>
        r.attributed_parcel_apn !== subjectApn &&
        r.names.some((n) => n.split(" ")[0]?.toUpperCase() === "POPHAM"),
    ).length;
    expect(result.scanned_party_count).toBe(expectedScanned);
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
