import { describe, it, expect } from "vitest";
import {
  rankReleaseCandidates,
  jaccard,
  tokenize,
  dateProximity,
  partyNameSimilarity,
  legalDescriptionOverlap,
} from "../src/logic/release-candidate-matcher";
import type { Instrument } from "../src/types";

function makeInstrument(
  overrides: Partial<Instrument> &
    Pick<
      Instrument,
      "instrument_number" | "recording_date" | "document_type" | "parties"
    >,
): Instrument {
  return {
    document_type_raw: "DEED TRST",
    bundled_document_types: [],
    extracted_fields: {},
    back_references: [],
    source_image_path: "/test.pdf",
    page_count: 1,
    raw_api_response: {
      names: [],
      documentCodes: ["DEED TRST"],
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

describe("tokenize", () => {
  it("lowercases and splits on whitespace", () => {
    expect(tokenize("Wells Fargo Home Mortgage")).toEqual([
      "wells",
      "fargo",
      "home",
      "mortgage",
    ]);
  });

  it("drops stopwords and punctuation", () => {
    expect(tokenize("V.I.P. Mortgage, Inc.")).toEqual(["v", "i", "p", "mortgage"]);
  });
});

describe("jaccard", () => {
  it("returns 0 for empty input", () => {
    expect(jaccard([], ["a"])).toBe(0);
    expect(jaccard(["a"], [])).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    expect(jaccard(["a", "b"], ["a", "b"])).toBe(1);
  });

  it("returns intersection over union", () => {
    expect(jaccard(["a", "b", "c"], ["b", "c", "d"])).toBeCloseTo(2 / 4, 6);
  });
});

describe("dateProximity", () => {
  it("returns 1 for same-date pairs", () => {
    expect(dateProximity("2021-01-19", "2021-01-22")).toBeCloseTo(
      1 - 3 / (365.25 * 30),
      4,
    );
  });

  it("returns 0 for pairs 30+ years apart", () => {
    expect(dateProximity("1990-01-01", "2021-01-01")).toBe(0);
  });
});

describe("partyNameSimilarity", () => {
  it("uses nominee_for target when DOT has a MERS-style nominee", () => {
    const dot = makeInstrument({
      instrument_number: "20210000001",
      recording_date: "2021-01-19",
      document_type: "deed_of_trust",
      parties: [
        {
          name: "MORTGAGE ELECTRONIC REGISTRATION SYSTEMS INC",
          role: "nominee",
          provenance: "manual_entry",
          confidence: 1,
          nominee_for: {
            party_name: "WELLS FARGO HOME MORTGAGE",
            party_role: "lender",
          },
        },
      ],
    });
    const release = makeInstrument({
      instrument_number: "20210000002",
      recording_date: "2021-01-22",
      document_type: "full_reconveyance",
      parties: [
        {
          name: "WELLS FARGO HOME MORTGAGE",
          role: "releasing_party",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
    });
    expect(partyNameSimilarity(dot, release)).toBe(1);
  });
});

describe("legalDescriptionOverlap", () => {
  it("returns 0 when either side has no legal description", () => {
    const dot = makeInstrument({
      instrument_number: "20210000001",
      recording_date: "2021-01-19",
      document_type: "deed_of_trust",
      parties: [
        { name: "X", role: "trustor", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const release = makeInstrument({
      instrument_number: "20210000002",
      recording_date: "2021-01-22",
      document_type: "full_reconveyance",
      parties: [
        {
          name: "Y",
          role: "releasing_party",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
    });
    expect(legalDescriptionOverlap(dot, release)).toBe(0);
  });

  it("scores token overlap on lot and subdivision", () => {
    const dot = makeInstrument({
      instrument_number: "20210000001",
      recording_date: "2021-01-19",
      document_type: "deed_of_trust",
      parties: [
        { name: "X", role: "trustor", provenance: "manual_entry", confidence: 1 },
      ],
      legal_description: {
        value: "Lot 46, SEVILLE PARCEL 3, Book 554 Maps Page 19",
        provenance: "ocr",
        confidence: 1,
      },
    });
    const release = makeInstrument({
      instrument_number: "20210000002",
      recording_date: "2021-01-22",
      document_type: "full_reconveyance",
      parties: [
        {
          name: "Y",
          role: "releasing_party",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
      legal_description: {
        value: "Lot 46, SEVILLE PARCEL 3",
        provenance: "ocr",
        confidence: 1,
      },
    });
    expect(legalDescriptionOverlap(dot, release)).toBeGreaterThan(0.4);
  });
});

describe("rankReleaseCandidates", () => {
  it("ranks a strong match above a weak one", () => {
    const dot = makeInstrument({
      instrument_number: "20210000001",
      recording_date: "2021-01-19",
      document_type: "deed_of_trust",
      parties: [
        {
          name: "MERS",
          role: "nominee",
          provenance: "manual_entry",
          confidence: 1,
          nominee_for: {
            party_name: "WELLS FARGO HOME MORTGAGE",
            party_role: "lender",
          },
        },
      ],
      legal_description: {
        value: "Lot 46 SEVILLE PARCEL 3",
        provenance: "ocr",
        confidence: 1,
      },
    });
    const strong = makeInstrument({
      instrument_number: "20210000002",
      recording_date: "2021-01-22",
      document_type: "full_reconveyance",
      parties: [
        {
          name: "WELLS FARGO HOME MORTGAGE",
          role: "releasing_party",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
      legal_description: {
        value: "Lot 46 SEVILLE PARCEL 3",
        provenance: "ocr",
        confidence: 1,
      },
    });
    const weak = makeInstrument({
      instrument_number: "19900000003",
      recording_date: "1990-06-01",
      document_type: "full_reconveyance",
      parties: [
        {
          name: "SOME OTHER BANK",
          role: "releasing_party",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
    });
    const ranked = rankReleaseCandidates(dot, [weak, strong]);
    expect(ranked[0].candidate.instrument_number).toBe("20210000002");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("handles candidates with no legal description gracefully", () => {
    const dot = makeInstrument({
      instrument_number: "20150516730",
      recording_date: "2015-07-17",
      document_type: "deed_of_trust",
      parties: [
        {
          name: "PINNACLE CAPITAL MORTGAGE LLC",
          role: "lender",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
    });
    const candidate = makeInstrument({
      instrument_number: "20200000001",
      recording_date: "2020-01-01",
      document_type: "full_reconveyance",
      parties: [
        {
          name: "PINNACLE CAPITAL MORTGAGE LLC",
          role: "releasing_party",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
    });
    const [result] = rankReleaseCandidates(dot, [candidate]);
    expect(result.features.partyNameSim).toBe(1);
    expect(result.features.legalDescOverlap).toBe(0);
    expect(result.score).toBeGreaterThan(0);
  });
});
