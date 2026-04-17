import { describe, it, expect } from "vitest";
import { PATTERNS, findMatchingPattern } from "./patterns";
import type { PatternContext, InstrumentGroup } from "./types";
import type { Instrument } from "../types";

const popham: PatternContext = {
  apn: "304-78-386",
  mode: "curated",
  allInstruments: [],
  allLinks: [],
  parcel: {
    apn: "304-78-386",
    address: "3674 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: "Lot 46, SEVILLE PARCEL 3",
    current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    type: "residential",
    subdivision: "Seville Parcel 3",
    assessor_url: "",
    instrument_numbers: [],
  } as never,
};

function groupOf(...instruments: Instrument[]): InstrumentGroup {
  return {
    instruments,
    recording_date: instruments[0].recording_date,
    same_day_group_id: instruments[0].same_day_group_id ?? null,
  };
}

function stubInstrument(overrides: Partial<Instrument>): Instrument {
  return {
    instrument_number: "20000000000",
    recording_date: "2000-01-01",
    document_type: "other",
    document_type_raw: "OTHER",
    bundled_document_types: [],
    parties: [],
    legal_description: null,
    extracted_fields: {},
    back_references: [],
    same_day_group: [],
    source_image_path: null,
    page_count: null,
    raw_api_response: {
      names: [],
      documentCodes: [],
      recordingDate: "1-1-2000",
      recordingNumber: "20000000000",
      pageAmount: 0,
      docketBook: 0,
      pageMap: 0,
      affidavitPresent: false,
      affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "",
    provenance_summary: null,
    same_day_group_id: null,
    ...overrides,
  } as Instrument;
}

describe("subdivision_plat pattern", () => {
  it("matches instrument 20010093192 (Seville Parcel 3 plat)", () => {
    const inst = stubInstrument({
      instrument_number: "20010093192",
      recording_date: "2001-01-30",
    });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("subdivision_plat");
  });
});

describe("affidavit_of_correction pattern", () => {
  it("matches an affidavit back-referencing a plat", () => {
    const inst = stubInstrument({
      instrument_number: "20010849180",
      recording_date: "2001-09-14",
      back_references: ["20010093192"],
    });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("affidavit_of_correction");
  });
});

describe("purchase_from_trust pattern", () => {
  it("matches a warranty deed whose grantor is a trust", () => {
    const inst = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        {
          name: "THE BRIAN J. AND TANYA R. MADISON LIVING TRUST",
          role: "grantor",
          provenance: "ocr",
          confidence: 1,
        },
        {
          name: "CHRISTOPHER POPHAM",
          role: "grantee",
          provenance: "manual_entry",
          confidence: 1,
        },
      ] as never,
    });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("purchase_from_trust");
  });
});

describe("purchase_from_individual pattern", () => {
  it("matches a warranty deed with an individual grantor", () => {
    const inst = stubInstrument({
      instrument_number: "20150516729",
      recording_date: "2015-06-30",
      document_type: "warranty_deed",
      parties: [
        {
          name: "JANE SMITH",
          role: "grantor",
          provenance: "manual_entry",
          confidence: 1,
        },
        {
          name: "JASON HOGUE",
          role: "grantee",
          provenance: "manual_entry",
          confidence: 1,
        },
      ] as never,
    });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("purchase_from_individual");
  });
});

describe("render output", () => {
  it("subdivision_plat renders prose with subdivision name + date", () => {
    const inst = stubInstrument({
      instrument_number: "20010093192",
      recording_date: "2001-01-30",
    });
    const match = findMatchingPattern(groupOf(inst), popham)!;
    const prose = match.render(groupOf(inst), popham);
    expect(prose).toContain("Seville Parcel 3");
    expect(prose).toContain("2001");
  });
});

describe("purchase_money_dot pattern", () => {
  it("matches a DOT same-day-grouped with a deed", () => {
    const deed = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "SELLER", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "BUYER", role: "grantee", provenance: "ocr", confidence: 1 },
      ] as never,
      same_day_group: ["20130183450"],
    });
    const dot = stubInstrument({
      instrument_number: "20130183450",
      recording_date: "2013-02-27",
      document_type: "deed_of_trust",
      parties: [
        { name: "BUYER", role: "trustor", provenance: "ocr", confidence: 1 },
        { name: "VIP MORTGAGE", role: "lender", provenance: "ocr", confidence: 1 },
      ] as never,
      same_day_group: ["20130183449"],
    });
    const ctx = { ...popham, allInstruments: [deed, dot] };
    const match = findMatchingPattern(groupOf(dot), ctx);
    expect(match?.id).toBe("purchase_money_dot");
  });
});

describe("refinance_dot pattern", () => {
  it("matches a DOT not same-day-grouped with a deed", () => {
    const dot = stubInstrument({
      instrument_number: "20210057846",
      recording_date: "2021-01-19",
      document_type: "deed_of_trust",
      parties: [
        { name: "POPHAM", role: "trustor", provenance: "ocr", confidence: 1 },
        { name: "WELLS FARGO", role: "lender", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const match = findMatchingPattern(groupOf(dot), popham);
    expect(match?.id).toBe("refinance_dot");
  });
});

describe("heloc_dot pattern", () => {
  it("matches a heloc_dot document type", () => {
    const inst = stubInstrument({ document_type: "heloc_dot" });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("heloc_dot");
  });
});

describe("PATTERNS registry", () => {
  it("exports patterns in first-match-wins order", () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(ids.indexOf("subdivision_plat")).toBeLessThan(
      ids.indexOf("purchase_from_individual")
    );
  });
});

describe("release_by_third_party pattern (MERS case)", () => {
  it("matches a reconveyance whose releasing_party is not the original beneficiary", () => {
    const release = stubInstrument({
      instrument_number: "20210075858",
      recording_date: "2021-01-22",
      document_type: "full_reconveyance",
      parties: [
        { name: "WELLS FARGO", role: "releasing_party", provenance: "ocr", confidence: 1 },
      ] as never,
      back_references: ["20130183450"],
    });
    const originalDot = stubInstrument({
      instrument_number: "20130183450",
      recording_date: "2013-02-27",
      document_type: "deed_of_trust",
      parties: [
        { name: "VIP MORTGAGE", role: "beneficiary", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...popham, allInstruments: [release, originalDot] };
    const match = findMatchingPattern(groupOf(release), ctx);
    expect(match?.id).toBe("release_by_third_party");
  });
});

describe("release_clean pattern", () => {
  it("matches a reconveyance whose releasing_party matches the original beneficiary", () => {
    const release = stubInstrument({
      instrument_number: "20000000009",
      recording_date: "2020-06-01",
      document_type: "full_reconveyance",
      parties: [
        { name: "VIP MORTGAGE", role: "releasing_party", provenance: "ocr", confidence: 1 },
      ] as never,
      back_references: ["20000000008"],
    });
    const dot = stubInstrument({
      instrument_number: "20000000008",
      recording_date: "2015-01-01",
      document_type: "deed_of_trust",
      parties: [
        { name: "VIP MORTGAGE", role: "beneficiary", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...popham, allInstruments: [release, dot] };
    const match = findMatchingPattern(groupOf(release), ctx);
    expect(match?.id).toBe("release_clean");
  });
});

describe("ucc_termination pattern", () => {
  it("matches a UCC termination", () => {
    const inst = stubInstrument({ document_type: "ucc_termination", recording_date: "2020-05-05" });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("ucc_termination");
  });
});

describe("generic_recording pattern (partial mode)", () => {
  it("fires for cached-neighbor instruments when no role-aware pattern matches", () => {
    const inst = stubInstrument({
      document_type: "warranty_deed",
      parties: [], // no role data — adapter behavior
      raw_api_response: {
        names: ["SELLER SAM", "BUYER BETTY"],
        documentCodes: ["WAR DEED"],
        recordingDate: "6-15-2019",
        recordingNumber: "20190123456",
        pageAmount: 2,
        docketBook: 0, pageMap: 0, affidavitPresent: false,
        affidavitPageAmount: 0, restricted: false,
      },
    });
    const ctx = { ...popham, mode: "partial" as const };
    const match = findMatchingPattern(groupOf(inst), ctx);
    expect(match?.id).toBe("generic_recording");
  });
});

describe("partial_chain_disclosure pattern", () => {
  it("exists in the registry", () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(ids).toContain("partial_chain_disclosure");
  });
});

describe("fallback pattern", () => {
  it("is last in the registry", () => {
    expect(PATTERNS[PATTERNS.length - 1].id).toBe("fallback");
  });
});
