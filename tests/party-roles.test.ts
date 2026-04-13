import { describe, it, expect } from "vitest";
import type { Instrument } from "../src/types";
import {
  getGrantors,
  getGrantees,
  getBeneficiaries,
  getTrustors,
  getLenders,
  getReleasingParties,
  getPartiesByRole,
} from "../src/logic/party-roles";

// Minimal instrument factory — only parties matter for these tests
function makeInstrument(
  parties: Instrument["parties"],
): Instrument {
  return {
    instrument_number: "00000000000",
    recording_date: "2021-01-01",
    document_type: "deed_of_trust",
    document_type_raw: "DEED TRST",
    bundled_document_types: [],
    parties,
    extracted_fields: {},
    back_references: [],
    source_image_path: "/test.pdf",
    page_count: 1,
    raw_api_response: {
      names: [],
      documentCodes: ["DEED TRST"],
      recordingDate: "1-1-2021",
      recordingNumber: "00000000000",
      pageAmount: 1,
      docketBook: 0,
      pageMap: 0,
      affidavitPresent: false,
      affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "test",
  };
}

describe("party-roles helpers", () => {
  const warrantyDeed = makeInstrument([
    { name: "MADISON TRUST", role: "grantor", provenance: "ocr", confidence: 1 },
    { name: "CHRIS POPHAM", role: "grantee", provenance: "manual_entry", confidence: 1 },
    { name: "ASHLEY POPHAM", role: "grantee", provenance: "manual_entry", confidence: 1 },
  ]);

  it("getGrantors returns grantor names", () => {
    expect(getGrantors(warrantyDeed)).toEqual(["MADISON TRUST"]);
  });

  it("getGrantees returns grantee names", () => {
    expect(getGrantees(warrantyDeed)).toEqual(["CHRIS POPHAM", "ASHLEY POPHAM"]);
  });

  const dotWithMers = makeInstrument([
    { name: "CHRIS POPHAM", role: "trustor", provenance: "manual_entry", confidence: 1 },
    { name: "VIP MORTGAGE INC", role: "lender", provenance: "manual_entry", confidence: 1 },
    { name: "AMERICAN TITLE", role: "trustee", provenance: "manual_entry", confidence: 1 },
    {
      name: "MERS INC",
      role: "nominee",
      provenance: "manual_entry",
      confidence: 1,
      nominee_for: { party_name: "VIP MORTGAGE INC", party_role: "lender" },
    },
  ]);

  it("getBeneficiaries includes nominee (MERS) for DOT with MERS nominee", () => {
    expect(getBeneficiaries(dotWithMers)).toEqual(["MERS INC"]);
  });

  it("getBeneficiaries returns direct beneficiary + nominee when both present", () => {
    const release = makeInstrument([
      {
        name: "MERS INC",
        role: "beneficiary",
        provenance: "manual_entry",
        confidence: 1,
        nominee_for: { party_name: "VIP MORTGAGE INC", party_role: "lender" },
      },
      { name: "WELLS FARGO", role: "releasing_party", provenance: "ocr", confidence: 1 },
    ]);
    // Only one MERS entry with role:"beneficiary", no role:"nominee" — returns just MERS
    expect(getBeneficiaries(release)).toEqual(["MERS INC"]);
  });

  it("getTrustors returns trustor names", () => {
    expect(getTrustors(dotWithMers)).toEqual(["CHRIS POPHAM"]);
  });

  it("getLenders returns lender names", () => {
    expect(getLenders(dotWithMers)).toEqual(["VIP MORTGAGE INC"]);
  });

  it("getReleasingParties returns releasing_party names", () => {
    const release = makeInstrument([
      { name: "WELLS FARGO", role: "releasing_party", provenance: "ocr", confidence: 1 },
      { name: "CAS NATIONWIDE", role: "releasing_party", provenance: "ocr", confidence: 1 },
    ]);
    expect(getReleasingParties(release)).toEqual(["WELLS FARGO", "CAS NATIONWIDE"]);
  });

  it("getPartiesByRole returns full Party objects for nominee_for inspection", () => {
    const nominees = getPartiesByRole(dotWithMers, "nominee");
    expect(nominees).toHaveLength(1);
    expect(nominees[0].nominee_for).toEqual({
      party_name: "VIP MORTGAGE INC",
      party_role: "lender",
    });
  });

  it("returns empty array when no parties match role", () => {
    expect(getReleasingParties(warrantyDeed)).toEqual([]);
    expect(getBeneficiaries(warrantyDeed)).toEqual([]);
  });
});
