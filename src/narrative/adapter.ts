import type { Instrument } from "../types";
import cache304_78_338 from "../data/api-cache/recorder/304-78-338.json";
import cache304_78_367 from "../data/api-cache/recorder/304-78-367.json";
import cache304_78_369 from "../data/api-cache/recorder/304-78-369.json";
import cache304_78_406 from "../data/api-cache/recorder/304-78-406.json";
import cache304_78_408 from "../data/api-cache/recorder/304-78-408.json";

interface CachedDocument {
  names: string[];
  documentCodes: string[];
  recordingDate: string; // MM-DD-YYYY
  recordingNumber: string;
  pageAmount: number;
  docketBook: number;
  pageMap: number;
  affidavitPresent: boolean;
  affidavitPageAmount: number;
  restricted: boolean;
}

interface CachedNeighborFile {
  apn: string;
  api_response: {
    documents: CachedDocument[];
  };
}

const CACHE_BY_APN: Record<string, CachedNeighborFile> = {
  "304-78-338": cache304_78_338 as CachedNeighborFile,
  "304-78-367": cache304_78_367 as CachedNeighborFile,
  "304-78-369": cache304_78_369 as CachedNeighborFile,
  "304-78-406": cache304_78_406 as CachedNeighborFile,
  "304-78-408": cache304_78_408 as CachedNeighborFile,
};

function normalizeDate(mmDdYyyy: string): string {
  const [m, d, y] = mmDdYyyy.split("-");
  return `${y}-${m}-${d}`;
}

function documentTypeFromCode(codes: string[]): Instrument["document_type"] {
  const primary = codes[0] ?? "";
  switch (primary) {
    case "WAR DEED":
      return "warranty_deed";
    case "GRANT DEED":
      return "grant_deed";
    case "SPCL WD":
      return "special_warranty_deed";
    case "Q/CL DEED":
      return "quit_claim_deed";
    case "DEED TRST":
      return "deed_of_trust";
    case "ASN DT":
      return "assignment_of_dot";
    case "REL D/T":
      return "full_reconveyance";
    case "T FIN ST":
      return "ucc_termination";
    case "DISCLAIMR":
    case "AF DISCLS":
      return "affidavit_of_disclosure";
    default:
      return "other";
  }
}

export function loadCachedNeighborInstruments(apn: string): Instrument[] {
  const file = CACHE_BY_APN[apn];
  if (!file) return [];

  return file.api_response.documents.map((raw): Instrument => ({
    instrument_number: raw.recordingNumber,
    recording_date: normalizeDate(raw.recordingDate),
    document_type: documentTypeFromCode(raw.documentCodes),
    document_type_raw: raw.documentCodes.join(" + "),
    bundled_document_types: [],

    parties: [],

    legal_description: undefined,

    extracted_fields: {},

    back_references: [],
    same_day_group: [],
    same_day_group_id: null,

    source_image_path: null,
    page_count: raw.pageAmount,

    raw_api_response: {
      names: raw.names,
      documentCodes: raw.documentCodes,
      recordingDate: raw.recordingDate,
      recordingNumber: raw.recordingNumber,
      pageAmount: raw.pageAmount,
      docketBook: raw.docketBook,
      pageMap: raw.pageMap,
      affidavitPresent: raw.affidavitPresent,
      affidavitPageAmount: raw.affidavitPageAmount,
      restricted: raw.restricted,
    },

    corpus_boundary_note:
      "Cached from public API; no OCR or curation",

    provenance_summary: undefined,
  }));
}
