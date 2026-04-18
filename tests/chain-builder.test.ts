import { describe, it, expect } from "vitest";
import { buildOwnerPeriods } from "../src/logic/chain-builder";
import type { Instrument } from "../src/types";

function makeDeed(
  overrides: Partial<Instrument> & Pick<Instrument, "instrument_number" | "recording_date" | "document_type" | "parties">,
): Instrument {
  return {
    document_type_raw: "WAR DEED",
    bundled_document_types: [],
    extracted_fields: {},
    back_references: [],
    source_image_path: "/test.pdf",
    page_count: 1,
    raw_api_response: {
      names: [],
      documentCodes: ["WAR DEED"],
      recordingDate: "1-1-2021",
      recordingNumber: overrides.instrument_number,
      pageAmount: 1,
      docketBook: 0,
      pageMap: 0,
      affidavitPresent: false,
      affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "test",
    ...overrides,
  };
}

describe("buildOwnerPeriods", () => {
  it("returns empty array when no deeds exist", () => {
    const dot = makeDeed({
      instrument_number: "20210001000",
      recording_date: "2021-01-01",
      document_type: "deed_of_trust",
      parties: [
        { name: "SMITH", role: "trustor", provenance: "manual_entry", confidence: 1 },
      ],
    });
    expect(buildOwnerPeriods([dot])).toEqual([]);
  });

  it("builds a single current-owner period from one deed", () => {
    const deed = makeDeed({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "MADISON TRUST", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "CHRIS POPHAM", role: "grantee", provenance: "manual_entry", confidence: 1 },
        { name: "ASHLEY POPHAM", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const periods = buildOwnerPeriods([deed]);
    expect(periods).toHaveLength(1);
    expect(periods[0]).toEqual({
      owner: "CHRIS POPHAM & ASHLEY POPHAM",
      start_instrument: "20130183449",
      start_date: "2013-02-27",
      end_instrument: null,
      end_date: null,
      is_current: true,
    });
  });

  it("chains multiple deeds with correct start/end dates", () => {
    const deed1 = makeDeed({
      instrument_number: "20100001000",
      recording_date: "2010-05-01",
      document_type: "grant_deed",
      parties: [
        { name: "SELLER A", role: "grantor", provenance: "manual_entry", confidence: 1 },
        { name: "BUYER B", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const deed2 = makeDeed({
      instrument_number: "20150002000",
      recording_date: "2015-09-15",
      document_type: "warranty_deed",
      parties: [
        { name: "BUYER B", role: "grantor", provenance: "manual_entry", confidence: 1 },
        { name: "BUYER C", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const periods = buildOwnerPeriods([deed2, deed1]); // out of order to test sorting
    expect(periods).toHaveLength(2);
    expect(periods[0].owner).toBe("BUYER B");
    expect(periods[0].start_date).toBe("2010-05-01");
    expect(periods[0].end_date).toBe("2015-09-15");
    expect(periods[0].is_current).toBe(false);
    expect(periods[1].owner).toBe("BUYER C");
    expect(periods[1].is_current).toBe(true);
    expect(periods[1].end_date).toBeNull();
  });

  it("ignores non-deed instruments", () => {
    const deed = makeDeed({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "GRANTOR", role: "grantor", provenance: "manual_entry", confidence: 1 },
        { name: "GRANTEE", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const dot = makeDeed({
      instrument_number: "20130183450",
      recording_date: "2013-02-27",
      document_type: "deed_of_trust",
      parties: [
        { name: "GRANTEE", role: "trustor", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const periods = buildOwnerPeriods([deed, dot]);
    expect(periods).toHaveLength(1);
    expect(periods[0].owner).toBe("GRANTEE");
  });

  it("handles single grantee without ampersand", () => {
    const deed = makeDeed({
      instrument_number: "20200001000",
      recording_date: "2020-01-01",
      document_type: "quit_claim_deed",
      parties: [
        { name: "GRANTOR", role: "grantor", provenance: "manual_entry", confidence: 1 },
        { name: "SOLO BUYER", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const periods = buildOwnerPeriods([deed]);
    expect(periods[0].owner).toBe("SOLO BUYER");
  });

  it("treats trustees_deed (successor-trustee transfer or trustee's deed upon sale) as a vesting conveyance", () => {
    // R-008 hero scenario: successor trustee Moore conveys Lot 224 from
    // the Silva Family Revocable Trust to his own Moore Revocable Trust.
    const intoTrust = makeDeed({
      instrument_number: "20170019586",
      recording_date: "2017-01-10",
      document_type: "special_warranty_deed",
      parties: [
        { name: "ROBERT FRANCIS SILVA", role: "grantor", provenance: "public_api", confidence: 1 },
        { name: "LINDA LUCILLE SILVA", role: "grantor", provenance: "public_api", confidence: 1 },
        { name: "THE SILVA FAMILY REVOCABLE TRUST", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const trusteesDeed = makeDeed({
      instrument_number: "20260162239",
      recording_date: "2026-03-20",
      document_type: "trustees_deed",
      parties: [
        { name: "THE SILVA FAMILY REVOCABLE TRUST", role: "grantor", provenance: "public_api", confidence: 1 },
        { name: "MOORE REVOCABLE TRUST", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const periods = buildOwnerPeriods([intoTrust, trusteesDeed]);
    expect(periods).toHaveLength(2);
    expect(periods[0].owner).toBe("THE SILVA FAMILY REVOCABLE TRUST");
    expect(periods[0].end_instrument).toBe("20260162239");
    expect(periods[0].is_current).toBe(false);
    expect(periods[1].owner).toBe("MOORE REVOCABLE TRUST");
    expect(periods[1].is_current).toBe(true);
  });
});
