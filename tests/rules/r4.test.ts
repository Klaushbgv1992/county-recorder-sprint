import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR4 } from "../../src/logic/rules/r4-assignment-chain-break";

describe("R4 assignment chain break", () => {
  it("fires on POPHAM lc-001 — VIP originated, Wells Fargo released, no assignment", () => {
    const { parcel, instruments, lifecycles, links } = loadParcelDataByApn("304-78-386");
    const findings = detectR4(parcel, instruments, lifecycles, links);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings.find((x) => x.evidence_instruments.includes("20130183450"))!;
    expect(f).toBeDefined();
    expect(f.rule_id).toBe("R4");
    expect(f.severity).toBe("medium");
    expect(f.description).toContain("V I P MORTGAGE INC");
    expect(f.description).toContain("WELLS FARGO");
    expect(f.evidence_instruments).toContain("20210075858");
    expect(f.detection_provenance.confidence).toBe(0.85);
  });

  it("does NOT fire on lc-004 (plat-based, not a DOT lifecycle)", () => {
    const { parcel, instruments, lifecycles, links } = loadParcelDataByApn("304-78-386");
    const findings = detectR4(parcel, instruments, lifecycles, links);
    expect(findings.every((f) => !f.evidence_instruments.includes("20010093192"))).toBe(true);
  });

  it("does not fire when an assignment_of_dot bridges originator and releaser", () => {
    const parcel = { apn: "t", current_owner: "x" } as unknown as import("../../src/types").Parcel;
    const instruments = [
      {
        instrument_number: "10000000001",
        recording_date: "2010-01-01",
        document_type: "deed_of_trust",
        parties: [
          { name: "X", role: "trustor", provenance: "manual_entry", confidence: 1 },
          { name: "ORIG BANK", role: "lender", provenance: "manual_entry", confidence: 1 },
        ],
      },
      {
        instrument_number: "10000000002",
        recording_date: "2015-01-01",
        document_type: "assignment_of_dot",
        parties: [],
      },
      {
        instrument_number: "10000000003",
        recording_date: "2020-01-01",
        document_type: "full_reconveyance",
        parties: [
          { name: "NEW BANK", role: "releasing_party", provenance: "manual_entry", confidence: 1 },
        ],
      },
    ] as unknown as import("../../src/types").Instrument[];
    const lifecycles = [
      {
        id: "lc-x",
        root_instrument: "10000000001",
        child_instruments: ["10000000003"],
        status: "released",
        status_rationale: "x",
        examiner_override: null,
      },
    ] as unknown as import("../../src/types").EncumbranceLifecycle[];
    const links = [
      {
        id: "l1",
        source_instrument: "10000000003",
        target_instrument: "10000000001",
        link_type: "release_of",
        provenance: "manual_entry",
        confidence: 1,
        examiner_action: "accepted",
      },
    ] as unknown as import("../../src/types").DocumentLink[];
    expect(detectR4(parcel, instruments, lifecycles, links)).toEqual([]);
  });
});
