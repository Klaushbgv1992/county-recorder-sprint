import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR3 } from "../../src/logic/rules/r3-mers-nominee";

describe("R3 MERS-as-nominee beneficiary", () => {
  it("fires on POPHAM — 2013 DOT has MERS as nominee for VIP; release by Wells Fargo (and again on the 2002 synthetic pair)", () => {
    const { parcel, instruments, links } = loadParcelDataByApn("304-78-386");
    const findings = detectR3(parcel, instruments, links);
    // Two MERS-as-nominee DOTs in POPHAM's chain: the real 2013 DOT
    // (20130183450, VIP Mortgage) released 2021 by Wells Fargo, and the
    // synthetic 2002 historical-chain DOT (20020100002, Wells Fargo Home
    // Mortgage) released 2005 by Wells Fargo Bank NA. The rule correctly
    // fires on both — continuity of the MERS-disintermediation pattern
    // across two ownership eras is the reason the synthetic pair models
    // MERS explicitly.
    expect(findings).toHaveLength(2);
    const f = findings.find((x) => x.evidence_instruments.includes("20130183450"))!;
    expect(f).toBeDefined();
    expect(f.rule_id).toBe("R3");
    expect(f.severity).toBe("medium");
    expect(f.description).toContain("V I P MORTGAGE INC");
    expect(f.description).toContain("WELLS FARGO");
    expect(f.detection_provenance.confidence).toBe(0.9);
    expect(f.evidence_instruments).toContain("20210075858");

    const synthetic2002 = findings.find((x) =>
      x.evidence_instruments.includes("20020100002"),
    );
    expect(synthetic2002).toBeDefined();
    expect(synthetic2002!.evidence_instruments).toContain("20050100001");
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
