import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import type { Parcel, Instrument, DocumentLink, DocumentType } from "../types";
import { ChainSwimlane } from "./ChainSwimlane";
import { TerminologyProvider } from "../terminology/TerminologyContext";

// Minimal Instrument factory — the ChainSwimlane only reads a subset of fields,
// but the Zod type requires the full shape at compile time.
function makeInstrument(partial: {
  instrument_number: string;
  recording_date: string;
  document_type: DocumentType;
  grantor?: string;
  grantee?: string;
  synthesized?: boolean;
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
      synthesized: partial.synthesized,
      synthesized_note: partial.synthesized
        ? "Demo-only synthetic instrument"
        : undefined,
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

const hogue: Parcel = {
  apn: "304-77-689",
  address: "2715 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85298",
  legal_description: "",
  current_owner: "HOGUE JASON / MICHELE",
  subdivision: "Shamrock Estates Phase 2A",
  instrument_numbers: [],
};

function renderChain(
  parcel: Parcel,
  instruments: Instrument[],
  links: DocumentLink[] = [],
) {
  return render(
    <MemoryRouter>
      <TerminologyProvider>
        <ChainSwimlane
          parcel={parcel}
          instruments={instruments}
          links={links}
          onOpenDocument={() => {}}
        />
      </TerminologyProvider>
    </MemoryRouter>,
  );
}

describe("ChainSwimlane", () => {
  afterEach(() => cleanup());

  it("renders one track per ownership period (POPHAM pre-plat → MADISON → POPHAM)", () => {
    const deed1 = makeInstrument({
      instrument_number: "19780100001",
      recording_date: "1978-03-01",
      document_type: "warranty_deed",
      grantor: "PREVIOUS OWNER",
      grantee: "MADISON FAMILY",
      synthesized: true,
    });
    const deed2 = makeInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-03-05",
      document_type: "warranty_deed",
      grantor: "MADISON FAMILY",
      grantee: "POPHAM CHRISTOPHER",
    });
    renderChain(popham, [deed1, deed2]);

    // Owner headers per period
    expect(screen.getByText(/MADISON FAMILY/)).toBeInTheDocument();
    expect(screen.getByText(/POPHAM CHRISTOPHER/)).toBeInTheDocument();
    // Current-owner badge marks the last period
    expect(screen.getByText(/Current Owner/i)).toBeInTheDocument();
  });

  it("renders a prior-to-corpus band when the first grantor is outside the chain", () => {
    const deed = makeInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-03-05",
      document_type: "warranty_deed",
      grantor: "MADISON LIVING TRUST",
      grantee: "POPHAM CHRISTOPHER",
    });
    renderChain(popham, [deed]);
    expect(screen.getByText(/MADISON LIVING TRUST/)).toBeInTheDocument();
    expect(screen.getByText(/Prior to corpus scope/i)).toBeInTheDocument();
  });

  it("groups same-day WAR DEED + DOT as a composite node on the MADISON→POPHAM track", () => {
    const warDeed = makeInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-03-05",
      document_type: "warranty_deed",
      grantor: "MADISON FAMILY",
      grantee: "POPHAM CHRISTOPHER",
    });
    const dot = makeInstrument({
      instrument_number: "20130183450",
      recording_date: "2013-03-05",
      document_type: "deed_of_trust",
      grantor: "POPHAM CHRISTOPHER",
    });
    const link: DocumentLink = {
      id: "link-001",
      source_instrument: "20130183450",
      target_instrument: "20130183449",
      link_type: "same_day_transaction",
      provenance: "public_api",
      confidence: 1,
      examiner_action: "pending",
    };
    renderChain(popham, [warDeed, dot], [link]);

    // Composite node button renders with a multiplier label and aria-label
    // that names the same-day transaction grouping.
    const composite = screen.getByRole("button", {
      name: /2 same-day instruments recorded 2013-03-05/i,
    });
    expect(composite).toBeInTheDocument();
    expect(composite).toHaveTextContent("×2");
  });

  it("renders the synthesized amber banner when any deed is synthesized", () => {
    const deed = makeInstrument({
      instrument_number: "19780100001",
      recording_date: "1978-03-01",
      document_type: "warranty_deed",
      grantor: "PREVIOUS OWNER",
      grantee: "MADISON FAMILY",
      synthesized: true,
    });
    renderChain(popham, [deed]);
    expect(
      screen.getByText(/Historical chain extended by demo reconstruction/i),
    ).toBeInTheDocument();
  });

  it("omits the synthesized banner when no instrument is synthesized", () => {
    const deed = makeInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-03-05",
      document_type: "warranty_deed",
      grantor: "MADISON FAMILY",
      grantee: "POPHAM CHRISTOPHER",
    });
    renderChain(popham, [deed]);
    expect(
      screen.queryByText(/Historical chain extended by demo reconstruction/i),
    ).not.toBeInTheDocument();
  });

  it("renders the HOGUE sparse-by-design rationale inline", () => {
    const deed = makeInstrument({
      instrument_number: "20150516729",
      recording_date: "2015-07-10",
      document_type: "warranty_deed",
      grantor: "RIGGS BUILDER",
      grantee: "HOGUE JASON",
    });
    renderChain(hogue, [deed]);
    expect(screen.getByText(/Sparse by design/i)).toBeInTheDocument();
    expect(
      screen.getByText(/HOGUE is the demo.s counter-example parcel/i),
    ).toBeInTheDocument();
  });

  it("renders an empty-state note when there are zero deeds", () => {
    renderChain(popham, []);
    expect(
      screen.getByText(/No conveyance instruments in corpus/i),
    ).toBeInTheDocument();
  });

  it("renders the global time axis once across all periods", () => {
    const deed1 = makeInstrument({
      instrument_number: "20060100001",
      recording_date: "2006-08-15",
      document_type: "warranty_deed",
      grantor: "A",
      grantee: "B",
    });
    const deed2 = makeInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-03-05",
      document_type: "warranty_deed",
      grantor: "B",
      grantee: "POPHAM CHRISTOPHER",
    });
    const { container } = renderChain(popham, [deed1, deed2]);
    // TimeAxis is a primitive from ./swimlane; there should be exactly one
    // axis region for the whole chain, spanning from the earliest deed year
    // to the latest (exclusive upper bound — see computeTimeAxisDomain).
    const axes = container.querySelectorAll("[data-chain-timeaxis]");
    expect(axes.length).toBe(1);
    const axis = axes[0] as HTMLElement;
    expect(
      axis.querySelector('[aria-label="Time axis from 2006 to 2014"]'),
    ).not.toBeNull();
  });
});
