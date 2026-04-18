import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import type { Parcel, Instrument, DocumentType } from "../types";
import { ChainOfTitle } from "./ChainOfTitle";
import { TerminologyProvider } from "../terminology/TerminologyContext";

function makeInstrument(partial: {
  instrument_number: string;
  recording_date: string;
  document_type: DocumentType;
  grantor?: string;
  grantee?: string;
}): Instrument {
  return {
    instrument_number: partial.instrument_number,
    recording_date: partial.recording_date,
    document_type: partial.document_type,
    document_type_raw: partial.document_type,
    bundled_document_types: [],
    parties: [
      ...(partial.grantor
        ? [
            {
              name: partial.grantor,
              role: "grantor" as const,
              provenance: "manual_entry" as const,
              confidence: 1,
            },
          ]
        : []),
      ...(partial.grantee
        ? [
            {
              name: partial.grantee,
              role: "grantee" as const,
              provenance: "manual_entry" as const,
              confidence: 1,
            },
          ]
        : []),
    ],
    extracted_fields: {},
    back_references: [],
    source_image_path: null,
    page_count: null,
    raw_api_response: {
      names: [],
      documentCodes: [partial.document_type],
      recordingDate: partial.recording_date,
      recordingNumber: partial.instrument_number,
      pageAmount: 0,
      docketBook: 0,
      pageMap: 0,
      affidavitPresent: false,
      affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "",
  };
}

const popham: Parcel = {
  apn: "304-78-386",
  address: "3674 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85298",
  legal_description: "",
  current_owner: "POPHAM CHRISTOPHER / ASHLEY",
  subdivision: "Seville Parcel 3",
  instrument_numbers: [],
};

describe("ChainOfTitle layout order", () => {
  afterEach(() => cleanup());

  it("renders the swimlane timeline before the AI summary disclosure", () => {
    const deed = makeInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-03-05",
      document_type: "warranty_deed",
      grantor: "MADISON FAMILY",
      grantee: "POPHAM CHRISTOPHER",
    });
    const { container } = render(
      <MemoryRouter>
        <TerminologyProvider>
          <ChainOfTitle
            parcel={popham}
            instruments={[deed]}
            links={[]}
            onOpenDocument={() => {}}
          />
        </TerminologyProvider>
      </MemoryRouter>,
    );

    // The "Chain of Title Timeline" heading (swimlane) must come before the
    // "View AI summary" disclosure in document order. Mission: work product
    // first, AI as augmentation.
    const swimlaneHeading = screen.getByText(/Chain of Title Timeline/i);
    const aiButton = screen.getByRole("button", { name: /AI summary/i });
    const swimlanePos = Array.prototype.indexOf.call(
      container.querySelectorAll("*"),
      swimlaneHeading,
    );
    const aiPos = Array.prototype.indexOf.call(
      container.querySelectorAll("*"),
      aiButton,
    );
    expect(swimlanePos).toBeLessThan(aiPos);
  });

  it("starts with the AI summary collapsed", () => {
    const deed = makeInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-03-05",
      document_type: "warranty_deed",
      grantor: "MADISON FAMILY",
      grantee: "POPHAM CHRISTOPHER",
    });
    render(
      <MemoryRouter>
        <TerminologyProvider>
          <ChainOfTitle
            parcel={popham}
            instruments={[deed]}
            links={[]}
            onOpenDocument={() => {}}
          />
        </TerminologyProvider>
      </MemoryRouter>,
    );
    const aiButton = screen.getByRole("button", { name: /View AI summary/i });
    expect(aiButton).toHaveAttribute("aria-expanded", "false");
  });
});
