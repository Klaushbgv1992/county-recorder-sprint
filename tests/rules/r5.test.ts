import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR5 } from "../../src/logic/rules/r5-grantor-is-trust";

describe("R5 grantor is trust entity", () => {
  it("fires on POPHAM — MADISON LIVING TRUST is grantor of 20130183449", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-78-386");
    const findings = detectR5(parcel, instruments);
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.rule_id).toBe("R5");
    expect(f.severity).toBe("info");
    expect(f.evidence_instruments).toEqual(["20130183449"]);
    expect(f.description).toContain("MADISON LIVING TRUST");
    expect(f.detection_provenance.confidence).toBe(0.95);
  });

  it("does not fire on HOGUE — no trust grantor in 2015 deed", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-77-689");
    const findings = detectR5(parcel, instruments);
    expect(findings).toEqual([]);
  });

  it("does not match DOT trustors (trustor is not grantor)", () => {
    const parcel = { apn: "t" } as unknown as import("../../src/types").Parcel;
    const instruments = [
      {
        instrument_number: "10000000001",
        recording_date: "2020-01-01",
        document_type: "deed_of_trust",
        parties: [
          { name: "SOMEONE LIVING TRUST", role: "trustor", provenance: "manual_entry", confidence: 1 },
        ],
      },
    ] as unknown as import("../../src/types").Instrument[];
    expect(detectR5(parcel, instruments)).toEqual([]);
  });
});
