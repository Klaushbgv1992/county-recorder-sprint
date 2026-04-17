import { describe, it, expect } from "vitest";
import type { Instrument } from "../types";
import { getClaimants, getDebtors } from "./party-roles";

const lien: Instrument = {
  instrument_number: "20230100000",
  recording_date: "2023-01-03",
  document_type: "hoa_lien",
  document_type_raw: "ASSOC LIEN",
  bundled_document_types: [],
  parties: [
    { name: "SEVILLE HOMEOWNERS ASSOCIATION", role: "claimant", provenance: "demo_synthetic", confidence: 1 },
    { name: "PHOENIX VACATION HOUSES LLC", role: "debtor", provenance: "demo_synthetic", confidence: 1 },
  ],
  extracted_fields: {},
  back_references: [],
  source_image_path: null,
  page_count: 2,
  raw_api_response: {
    names: [], documentCodes: ["ASSOC LIEN"], recordingDate: "1-3-2023",
    recordingNumber: "20230100000", pageAmount: 2, docketBook: 0, pageMap: 0,
    affidavitPresent: false, affidavitPageAmount: 0, restricted: false,
  },
  corpus_boundary_note: "test",
};

describe("party-roles lien helpers", () => {
  it("getClaimants returns claimant names", () => {
    expect(getClaimants(lien)).toEqual(["SEVILLE HOMEOWNERS ASSOCIATION"]);
  });
  it("getDebtors returns debtor names", () => {
    expect(getDebtors(lien)).toEqual(["PHOENIX VACATION HOUSES LLC"]);
  });
});
