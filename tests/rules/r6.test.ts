import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR6 } from "../../src/logic/rules/r6-plat-unrecoverable";

describe("R6 root plat unrecoverable via public API", () => {
  it("fires on POPHAM — Seville Parcel 3 plat references parent Book 553 Page 15 (Known Gap #2)", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-78-386");
    const findings = detectR6(parcel, instruments);
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.rule_id).toBe("R6");
    expect(f.severity).toBe("info");
    expect(f.evidence_instruments).toEqual(["20010093192"]);
    expect(f.description).toContain("20010093192");
    expect(f.description).toContain("hunt-log-known-gap-2.md");
    expect(f.detection_provenance.confidence).toBe(1.0);
  });

  it("does not fire on HOGUE — no plat in curated instruments", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-77-689");
    const findings = detectR6(parcel, instruments);
    expect(findings).toEqual([]);
  });
});
