import { describe, it, expect } from "vitest";
import { renderTimeline, groupBySameDay } from "./engine";
import type { PatternContext } from "./types";
import type { Instrument } from "../types";

function stubInstrument(overrides: Partial<Instrument>): Instrument {
  // Same helper as patterns.test.ts — duplicated to avoid cross-test
  // imports; for this sprint one copy per test file is acceptable.
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
      names: [], documentCodes: [], recordingDate: "1-1-2000",
      recordingNumber: "20000000000", pageAmount: 0, docketBook: 0,
      pageMap: 0, affidavitPresent: false, affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "",
    provenance_summary: null,
    same_day_group_id: null,
    ...overrides,
  } as Instrument;
}

const ctxBase: PatternContext = {
  apn: "304-78-386",
  mode: "curated",
  allInstruments: [],
  allLinks: [],
  parcel: {
    apn: "304-78-386", address: "3674 E Palmer St", city: "Gilbert",
    state: "AZ", zip: "85298", legal_description: "", current_owner: "",
    type: "residential", subdivision: "Seville Parcel 3",
    assessor_url: "", instrument_numbers: [],
  } as never,
};

describe("groupBySameDay", () => {
  it("groups instruments sharing same_day_group_id", () => {
    const a = stubInstrument({ instrument_number: "1", recording_date: "2013-02-27", same_day_group_id: "g1" });
    const b = stubInstrument({ instrument_number: "2", recording_date: "2013-02-27", same_day_group_id: "g1" });
    const c = stubInstrument({ instrument_number: "3", recording_date: "2020-01-01", same_day_group_id: null });
    const groups = groupBySameDay([a, b, c]);
    expect(groups).toHaveLength(2);
    expect(groups[0].instruments.map((i) => i.instrument_number).sort()).toEqual(["1", "2"]);
  });

  it("sorts groups chronologically by recording_date", () => {
    const a = stubInstrument({ instrument_number: "1", recording_date: "2021-01-01", same_day_group_id: null });
    const b = stubInstrument({ instrument_number: "2", recording_date: "2013-01-01", same_day_group_id: null });
    const groups = groupBySameDay([a, b]);
    expect(groups[0].recording_date).toBe("2013-01-01");
  });
});

describe("renderTimeline", () => {
  it("produces one TimelineBlock per group", () => {
    const deed = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "SELLER", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "POPHAM", role: "grantee", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...ctxBase, allInstruments: [deed] };
    const blocks = renderTimeline([deed], ctx);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].pattern_id).toBe("purchase_from_individual");
    expect(blocks[0].prose).toContain("2013");
  });

  it("emits partial_chain_disclosure block first in partial mode", () => {
    const inst = stubInstrument({
      instrument_number: "20190001234",
      recording_date: "2019-06-01",
      document_type: "warranty_deed",
      raw_api_response: { names: ["FOO", "BAR"], documentCodes: ["WAR DEED"],
        recordingDate: "6-1-2019", recordingNumber: "20190001234", pageAmount: 2,
        docketBook: 0, pageMap: 0, affidavitPresent: false,
        affidavitPageAmount: 0, restricted: false } as never,
    });
    const ctx = { ...ctxBase, mode: "partial" as const, allInstruments: [inst] };
    const blocks = renderTimeline([inst], ctx);
    expect(blocks[0].pattern_id).toBe("partial_chain_disclosure");
    expect(blocks[1].pattern_id).toBe("generic_recording");
  });

  it("attaches overlay callouts to the matching instrument's block", () => {
    const deed = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "SELLER", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "POPHAM", role: "grantee", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...ctxBase, allInstruments: [deed] };
    const overlay = { hero_override: null, callouts: { "20130183449": "callout!" }, what_this_means: null, moat_note: null };
    const blocks = renderTimeline([deed], ctx, overlay);
    expect(blocks[0].callouts).toEqual(["callout!"]);
  });
});
