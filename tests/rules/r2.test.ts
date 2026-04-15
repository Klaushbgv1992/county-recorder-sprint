import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR2 } from "../../src/logic/rules/r2-open-dot-past-window";

const NOW = new Date("2026-04-14");

describe("R2 open DOT past expected release window", () => {
  it("fires on HOGUE — open 2015 DOT (>=10 years old)", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-77-689");
    const findings = detectR2(parcel, instruments, lifecycles, NOW);
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.rule_id).toBe("R2");
    expect(f.severity).toBe("high");
    expect(f.evidence_instruments).toContain("20150516730");
    expect(f.description).toContain("lc-003");
    expect(f.description).toContain("2015-07-17");
    expect(f.detection_provenance.confidence).toBe(0.85);
  });

  it("does NOT fire on POPHAM — 2021 DOT is ~5 years old on 2026-04-14", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const findings = detectR2(parcel, instruments, lifecycles, NOW);
    // POPHAM has lc-001 (released), lc-002 (open, 2021 — only 5 years old),
    // lc-004 (released). None fire under R2's 10-year test.
    expect(findings).toEqual([]);
  });

  it("does not fire on a released lifecycle regardless of age", () => {
    const parcel = { apn: "test", current_owner: "x" } as unknown as import("../../src/types").Parcel;
    const instruments = [
      {
        instrument_number: "10000000001",
        recording_date: "2000-01-01",
        document_type: "deed_of_trust",
        parties: [{ name: "X", role: "trustor", provenance: "manual_entry", confidence: 1 }],
      },
    ] as unknown as import("../../src/types").Instrument[];
    const lifecycles = [
      {
        id: "lc-test",
        root_instrument: "10000000001",
        child_instruments: [],
        status: "released",
        status_rationale: "x",
        examiner_override: null,
      },
    ] as unknown as import("../../src/types").EncumbranceLifecycle[];
    expect(detectR2(parcel, instruments, lifecycles, NOW)).toEqual([]);
  });
});
