import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR1 } from "../../src/logic/rules/r1-same-day-cluster";

describe("R1 same-day transaction cluster", () => {
  it("fires on POPHAM — same-day 2013 deed+DOT, 2021 UCC-term+DOT, and 2002 synthetic pair", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-78-386");
    const findings = detectR1(parcel, instruments);

    // POPHAM has three same-day clusters in the curated+reconstructed data:
    //   2013-02-27: 20130183449 (warranty deed) + 20130183450 (DOT) — shares CHRISTOPHER POPHAM
    //   2021-01-19: 20210057846 (UCC term) + 20210057847 (DOT) — both now use
    //     CHRISTOPHER POPHAM (FIRSTNAME-LAST) after the party-name curation
    //     sweep that normalized all individuals to one format. Previously these
    //     differed in ordering and R1's exact-string compare missed the match;
    //     that was the Decision #15 entity-resolution gap for person names.
    //   2002-04-12: 20020100001 (synthetic SWD) + 20020100002 (synthetic DOT) —
    //     shares MATTHEW A ROBERTS and JENNIFER L ROBERTS.
    expect(findings).toHaveLength(3);
    const popham2013 = findings.find(
      (f) =>
        f.evidence_instruments.includes("20130183449") &&
        f.evidence_instruments.includes("20130183450"),
    );
    expect(popham2013).toBeDefined();
    expect(popham2013!.rule_id).toBe("R1");
    expect(popham2013!.severity).toBe("info");
    expect(popham2013!.parcel_apn).toBe("304-78-386");
    expect(popham2013!.description).toContain("2013-02-27");
    expect(popham2013!.detection_provenance.confidence).toBe(0.95);

    const popham2021 = findings.find(
      (f) =>
        f.evidence_instruments.includes("20210057846") &&
        f.evidence_instruments.includes("20210057847"),
    );
    expect(popham2021).toBeDefined();
    expect(popham2021!.description).toContain("2021-01-19");

    const popham2002 = findings.find(
      (f) =>
        f.evidence_instruments.includes("20020100001") &&
        f.evidence_instruments.includes("20020100002"),
    );
    expect(popham2002).toBeDefined();
    expect(popham2002!.description).toContain("2002-04-12");
  });

  it("fires on HOGUE — same-day 2015 deed + DOT pair", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-77-689");
    const findings = detectR1(parcel, instruments);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence_instruments.sort()).toEqual(
      ["20150516729", "20150516730"].sort(),
    );
  });

  it("does not fire on a parcel with no same-day clusters", () => {
    const parcel = {
      apn: "000-00-000",
      address: "x",
      city: "x",
      state: "AZ",
      zip: "00000",
      legal_description: "x",
      current_owner: "SOLO",
      subdivision: "x",
    } as unknown as import("../../src/types").Parcel;
    const instruments = [] as unknown as import("../../src/types").Instrument[];
    expect(detectR1(parcel, instruments)).toEqual([]);
  });

  it("does not fire when instruments share a date but not parties", () => {
    const parcel = {
      apn: "000-00-000",
      address: "x",
      city: "x",
      state: "AZ",
      zip: "00000",
      legal_description: "x",
      current_owner: "x",
      subdivision: "x",
    } as unknown as import("../../src/types").Parcel;
    const instruments = [
      {
        instrument_number: "10000000001",
        recording_date: "2020-05-01",
        document_type: "warranty_deed",
        parties: [{ name: "ALICE", role: "grantor", provenance: "manual_entry", confidence: 1 }],
      },
      {
        instrument_number: "10000000002",
        recording_date: "2020-05-01",
        document_type: "deed_of_trust",
        parties: [{ name: "BOB", role: "trustor", provenance: "manual_entry", confidence: 1 }],
      },
    ] as unknown as import("../../src/types").Instrument[];
    expect(detectR1(parcel, instruments)).toEqual([]);
  });
});
