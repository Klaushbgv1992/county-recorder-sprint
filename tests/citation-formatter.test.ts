import { describe, it, expect } from "vitest";
import { formatCitation } from "../src/logic/citation-formatter";
import type { Instrument } from "../src/types";

function makeInstrument(
  overrides: Partial<Instrument>,
): Instrument {
  return {
    instrument_number: "20210234567",
    recording_date: "2021-03-15",
    document_type: "deed_of_trust",
    document_type_raw: "DEED TRST",
    bundled_document_types: [],
    parties: [
      { name: "SMITH JOHN", role: "trustor", provenance: "manual_entry", confidence: 1 },
    ],
    extracted_fields: {},
    back_references: [],
    source_image_path: "/raw/20210234567.pdf",
    page_count: 1,
    raw_api_response: {
      names: [],
      documentCodes: ["DEED TRST"],
      recordingDate: "3-15-2021",
      recordingNumber: "20210234567",
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

describe("formatCitation", () => {
  it("formats a standard citation", () => {
    const inst = makeInstrument({});
    const result = formatCitation(inst, "Maricopa County, AZ");
    expect(result).toBe(
      "Deed of Trust, Inst. No. 20210234567, recorded 2021-03-15, Maricopa County, AZ",
    );
  });

  it("humanizes warranty deed", () => {
    const inst = makeInstrument({ document_type: "warranty_deed" });
    expect(formatCitation(inst, "Maricopa County, AZ")).toContain("Warranty Deed");
  });

  it("humanizes assignment type", () => {
    const inst = makeInstrument({ document_type: "assignment_of_dot" });
    expect(formatCitation(inst, "Maricopa County, AZ")).toContain("Assignment of Deed of Trust");
  });

  it("humanizes full reconveyance type", () => {
    const inst = makeInstrument({ document_type: "full_reconveyance" });
    expect(formatCitation(inst, "Maricopa County, AZ")).toContain("Full Reconveyance");
  });

  it("humanizes UCC termination", () => {
    const inst = makeInstrument({ document_type: "ucc_termination" });
    expect(formatCitation(inst, "Maricopa County, AZ")).toContain("UCC Termination");
  });
});
