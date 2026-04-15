import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR3 } from "../../src/logic/rules/r3-mers-nominee";

describe("R3 MERS-as-nominee beneficiary", () => {
  it("fires on POPHAM — 2013 DOT has MERS as nominee for VIP; release by Wells Fargo", () => {
    const { parcel, instruments, links } = loadParcelDataByApn("304-78-386");
    const findings = detectR3(parcel, instruments, links);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings.find((x) => x.evidence_instruments.includes("20130183450"))!;
    expect(f).toBeDefined();
    expect(f.rule_id).toBe("R3");
    expect(f.severity).toBe("medium");
    expect(f.description).toContain("V I P MORTGAGE INC");
    expect(f.description).toContain("WELLS FARGO");
    expect(f.detection_provenance.confidence).toBe(0.9);
    expect(f.evidence_instruments).toContain("20210075858");
  });

  it("does not fire when DOT has no MERS nominee", () => {
    const parcel = { apn: "t", current_owner: "x" } as unknown as import("../../src/types").Parcel;
    const instruments = [
      {
        instrument_number: "10000000001",
        recording_date: "2020-01-01",
        document_type: "deed_of_trust",
        parties: [
          { name: "ALICE", role: "trustor", provenance: "manual_entry", confidence: 1 },
          { name: "BIG BANK", role: "lender", provenance: "manual_entry", confidence: 1 },
          { name: "BIG BANK", role: "beneficiary", provenance: "manual_entry", confidence: 1 },
        ],
      },
    ] as unknown as import("../../src/types").Instrument[];
    const links = [] as unknown as import("../../src/types").DocumentLink[];
    expect(detectR3(parcel, instruments, links)).toEqual([]);
  });
});
