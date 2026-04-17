import { describe, it, expect } from "vitest";
import type { Parcel, Instrument, EncumbranceLifecycle } from "../types";
import { getOpenLiensInSubdivision } from "./subdivision-signals";

function parcel(apn: string, subdivision: string, owner: string, lot: string | null = null): Parcel {
  return {
    apn,
    address: "test",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: lot ? `Lot ${lot}, ${subdivision}` : subdivision,
    current_owner: owner,
    subdivision,
    instrument_numbers: [],
  };
}

function lien(instrumentNumber: string): Instrument {
  return {
    instrument_number: instrumentNumber,
    recording_date: "2023-01-03",
    document_type: "hoa_lien",
    document_type_raw: "ASSOC LIEN",
    bundled_document_types: [],
    parties: [],
    extracted_fields: {},
    back_references: [],
    source_image_path: null,
    page_count: 2,
    raw_api_response: {
      names: [], documentCodes: ["ASSOC LIEN"], recordingDate: "1-3-2023",
      recordingNumber: instrumentNumber, pageAmount: 2, docketBook: 0, pageMap: 0,
      affidavitPresent: false, affidavitPageAmount: 0, restricted: false,
    },
    corpus_boundary_note: "test",
  };
}

function deed(instrumentNumber: string): Instrument {
  return { ...lien(instrumentNumber), document_type: "warranty_deed", document_type_raw: "WAR DEED" };
}

function lc(id: string, root: string, status: "open" | "released"): EncumbranceLifecycle {
  return { id, root_instrument: root, child_instruments: [], status, status_rationale: "", examiner_override: null };
}

describe("getOpenLiensInSubdivision", () => {
  function buildParcels(): Parcel[] {
    const p = [
      parcel("304-78-386", "Seville Parcel 3", "POPHAM", "46"),
      parcel("304-78-367", "Seville Parcel 3", "PHOENIX VACATION HOUSES LLC", "45"),
      parcel("304-77-689", "Shamrock Estates Phase 2A", "HOGUE", "348"),
    ];
    p[0].instrument_numbers = ["deed-1"];
    p[1].instrument_numbers = ["lien-1"];
    p[2].instrument_numbers = ["lien-other-subdivision"];
    return p;
  }

  it("returns liens in same subdivision excluding the current parcel", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      buildParcels(),
      [lc("lc-a", "lien-1", "open"), lc("lc-b", "deed-1", "open")],
      [lien("lien-1"), deed("deed-1")],
    );
    expect(result).toHaveLength(1);
    expect(result[0].apn).toBe("304-78-367");
    expect(result[0].documentType).toBe("hoa_lien");
    expect(result[0].lifecycleId).toBe("lc-a");
  });

  it("excludes released lifecycles", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      buildParcels(),
      [lc("lc-a", "lien-1", "released")],
      [lien("lien-1")],
    );
    expect(result).toEqual([]);
  });

  it("excludes the current parcel even if it has an open lien", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-367",
      buildParcels(),
      [lc("lc-a", "lien-1", "open")],
      [lien("lien-1")],
    );
    expect(result).toEqual([]);
  });

  it("excludes liens from other subdivisions", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      buildParcels(),
      [lc("lc-x", "lien-other-subdivision", "open")],
      [lien("lien-other-subdivision")],
    );
    expect(result).toEqual([]);
  });

  it("excludes non-lien-family document types", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      buildParcels(),
      [lc("lc-b", "deed-1", "open")],
      [deed("deed-1")],
    );
    expect(result).toEqual([]);
  });
});
