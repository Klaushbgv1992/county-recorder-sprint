// src/data/load-cached-neighbors.ts
//
// Statically imports the 5 pre-cached neighbor API responses and exposes them
// as a Map<apn, CacheEntry> for use in LandingPage's dynamic-import path.
//
// This file is intended to be dynamic-imported from LandingPage so it stays
// out of the initial bundle for non-landing routes.

import raw338 from "./api-cache/recorder/304-78-338.json";
import raw367 from "./api-cache/recorder/304-78-367.json";
import raw369 from "./api-cache/recorder/304-78-369.json";
import raw406 from "./api-cache/recorder/304-78-406.json";
import raw408 from "./api-cache/recorder/304-78-408.json";

export interface CacheEntry {
  polygon: null; // matched to assessor polygon in LandingPage
  lastRecordedDate: string;
  lastDocType: string;
  recent_instruments: Array<{
    recording_number: string;
    recording_date: string;
    doc_type: string;
    parties: string[];
  }>;
  raw: unknown; // the full API response
}

function fromRaw(raw: {
  apn: string;
  display_fields: {
    last_recorded_date: string;
    last_doc_type: string;
    recent_instruments: Array<{
      recording_number: string;
      recording_date: string;
      doc_type: string;
      parties: string[];
    }>;
  };
}): CacheEntry {
  return {
    polygon: null,
    lastRecordedDate: raw.display_fields.last_recorded_date,
    lastDocType: raw.display_fields.last_doc_type,
    recent_instruments: raw.display_fields.recent_instruments,
    raw,
  };
}

const ENTRIES: Array<[string, CacheEntry]> = [
  [raw338.apn, fromRaw(raw338)],
  [raw367.apn, fromRaw(raw367)],
  [raw369.apn, fromRaw(raw369)],
  [raw406.apn, fromRaw(raw406)],
  [raw408.apn, fromRaw(raw408)],
];

const cachedNeighbors: Map<string, CacheEntry> = new Map(ENTRIES);

export default cachedNeighbors;
