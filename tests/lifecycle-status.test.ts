import { describe, it, expect } from "vitest";
import {
  computeLifecycleStatus,
  resolveLifecycleStatus,
} from "../src/logic/lifecycle-status";
import type { Instrument, DocumentLink } from "../src/types";

function makeInstrument(
  overrides: Partial<Instrument> &
    Pick<Instrument, "instrument_number" | "recording_date" | "document_type" | "parties">,
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
    corpus_boundary_note: "County online records searched through 2026-04-10",
    ...overrides,
  };
}

describe("computeLifecycleStatus", () => {
  const rootDot = makeInstrument({
    instrument_number: "20210001000",
    recording_date: "2021-03-15",
    document_type: "deed_of_trust",
    parties: [
      { name: "SMITH JOHN", role: "trustor", provenance: "manual_entry", confidence: 1 },
      { name: "LENDER BANK NA", role: "lender", provenance: "manual_entry", confidence: 1 },
    ],
  });

  it("returns 'open' when no child instruments exist", () => {
    const result = computeLifecycleStatus(rootDot, [], []);
    expect(result.status).toBe("open");
    expect(result.status_rationale).toContain("No reconveyance found");
  });

  it("returns 'released' when a release link is accepted", () => {
    const release = makeInstrument({
      instrument_number: "20230002000",
      recording_date: "2023-06-01",
      document_type: "full_reconveyance",
      parties: [
        { name: "LENDER BANK NA", role: "releasing_party", provenance: "ocr", confidence: 1 },
      ],
    });
    const links: DocumentLink[] = [
      {
        id: "link-001",
        source_instrument: "20230002000",
        target_instrument: "20210001000",
        link_type: "release_of",
        provenance: "ocr",
        confidence: 0.95,
        examiner_action: "accepted",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [release], links);
    expect(result.status).toBe("released");
  });

  it("returns 'possible_match' when release link is pending review", () => {
    const release = makeInstrument({
      instrument_number: "20230002000",
      recording_date: "2023-06-01",
      document_type: "full_reconveyance",
      parties: [
        { name: "LOAN SERVICER LLC", role: "releasing_party", provenance: "ocr", confidence: 1 },
      ],
    });
    const links: DocumentLink[] = [
      {
        id: "link-001",
        source_instrument: "20230002000",
        target_instrument: "20210001000",
        link_type: "release_of",
        provenance: "ocr",
        confidence: 0.75,
        examiner_action: "pending",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [release], links);
    expect(result.status).toBe("possible_match");
    expect(result.status_rationale).toContain("pending");
  });

  it("returns 'unresolved' when release link is rejected", () => {
    const links: DocumentLink[] = [
      {
        id: "link-001",
        source_instrument: "20230002000",
        target_instrument: "20210001000",
        link_type: "release_of",
        provenance: "ocr",
        confidence: 0.4,
        examiner_action: "rejected",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [], links);
    expect(result.status).toBe("unresolved");
  });

  it("returns 'open' when only assignments exist, no release", () => {
    const assignment = makeInstrument({
      instrument_number: "20220003000",
      recording_date: "2022-01-10",
      document_type: "assignment_of_dot",
      parties: [
        { name: "LENDER BANK NA", role: "grantor", provenance: "manual_entry", confidence: 1 },
        { name: "NEW SERVICER LLC", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ],
    });
    const links: DocumentLink[] = [
      {
        id: "link-002",
        source_instrument: "20220003000",
        target_instrument: "20210001000",
        link_type: "assignment_of",
        provenance: "public_api",
        confidence: 1.0,
        examiner_action: "accepted",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [assignment], links);
    expect(result.status).toBe("open");
  });
});

describe("resolveLifecycleStatus", () => {
  const computed = {
    status: "open" as const,
    status_rationale: "No reconveyance found in corpus for DOT 20210001000",
  };

  it("returns computed unchanged when override is null", () => {
    const result = resolveLifecycleStatus(computed, null);
    expect(result).toEqual(computed);
  });

  it("override wins over computed status", () => {
    const result = resolveLifecycleStatus(computed, "released");
    expect(result.status).toBe("released");
  });

  it("rationale includes original reason when overridden", () => {
    const result = resolveLifecycleStatus(computed, "released");
    expect(result.status_rationale).toContain("Examiner override");
    expect(result.status_rationale).toContain("open");
    expect(result.status_rationale).toContain("No reconveyance found");
  });
});
