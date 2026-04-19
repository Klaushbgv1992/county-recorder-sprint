import { describe, expect, it } from "vitest";
import { computeBringDown, type BringDownInput } from "./bring-down";
import { loadAllInstruments, loadAllParcels } from "../data-loader";

const ALL_INSTRUMENTS = loadAllInstruments();
const ALL_PARCELS = loadAllParcels();

function baseInput(overrides: Partial<BringDownInput> = {}): BringDownInput {
  return {
    watchedApns: [],
    parcels: ALL_PARCELS,
    instruments: ALL_INSTRUMENTS,
    asOf: "2026-04-09",
    lastChecked: {},
    defaultLookbackDays: 90,
    ...overrides,
  };
}

describe("computeBringDown", () => {
  it("returns empty array when nothing is watched", () => {
    const result = computeBringDown(baseInput());
    expect(result).toEqual([]);
  });

  it("surfaces the R-008 trustee-succession deed when 304-77-566 is watched and last-checked is older than 2026-03-20", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["304-77-566"],
        lastChecked: { "304-77-566": "2026-02-01" },
      }),
    );

    expect(result).toHaveLength(1);
    const row = result[0];
    expect(row.apn).toBe("304-77-566");
    expect(row.lastCheckedDefaulted).toBe(false);
    expect(row.totalNewCount).toBeGreaterThanOrEqual(1);
    const numbers = row.newInstruments.map((i) => i.instrumentNumber);
    expect(numbers).toContain("20260162239");
  });

  it("returns zero new instruments when last-checked is at-or-after every recording date", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["304-77-566"],
        lastChecked: { "304-77-566": "2026-04-09" },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].totalNewCount).toBe(0);
    expect(result[0].newInstruments).toEqual([]);
  });

  it("uses defaultLookbackDays when no lastChecked entry exists for an APN", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["304-77-566"],
        lastChecked: {},
        defaultLookbackDays: 90,
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].lastCheckedDefaulted).toBe(true);
    // 2026-04-09 minus 90 days ≈ 2026-01-09; the 2026-03-20 trustee deed must be inside.
    const numbers = result[0].newInstruments.map((i) => i.instrumentNumber);
    expect(numbers).toContain("20260162239");
  });

  it("orders newInstruments by recording_date descending (newest first)", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["304-77-566"],
        lastChecked: { "304-77-566": "2000-01-01" },
      }),
    );
    const dates = result[0].newInstruments.map((i) => i.recordingDate);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  it("groups newInstruments by raw document code (byDocType totals match newInstruments)", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["304-77-566"],
        lastChecked: { "304-77-566": "2000-01-01" },
      }),
    );
    const row = result[0];
    const docTypeSum = row.byDocType.reduce((s, d) => s + d.count, 0);
    expect(docTypeSum).toBe(row.totalNewCount);
    // Trustee deed is in there
    expect(row.byDocType.find((d) => d.docCode === "TRST DEED")?.count).toBeGreaterThanOrEqual(1);
  });

  it("returns ownerLabel from the parcel's current_owner", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["304-78-386"],
        lastChecked: { "304-78-386": "2000-01-01" },
      }),
    );
    expect(result[0].ownerLabel).toBe("POPHAM CHRISTOPHER / ASHLEY");
  });

  it("emits a parcelMissing row for an APN not present in the parcels list", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["999-99-999"],
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].apn).toBe("999-99-999");
    expect(result[0].parcelMissing).toBe(true);
    expect(result[0].newInstruments).toEqual([]);
    expect(result[0].totalNewCount).toBe(0);
  });

  it("preserves the order of watchedApns in the output", () => {
    const result = computeBringDown(
      baseInput({
        watchedApns: ["304-77-566", "304-78-386"],
        lastChecked: {},
      }),
    );
    expect(result.map((r) => r.apn)).toEqual(["304-77-566", "304-78-386"]);
  });
});
