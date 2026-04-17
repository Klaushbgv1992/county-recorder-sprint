import { describe, it, expect } from "vitest";
import { ProvenanceKind, DocumentLink } from "../src/schemas";
import {
  CANDIDATE_DISPLAY_THRESHOLD,
  buildCandidateRows,
  synthesizeAlgorithmicLink,
  buildAcceptedRationale,
  buildEmptyStateRationale,
} from "../src/logic/release-candidate-matcher";
import type {
  Instrument,
  Parcel,
  DocumentLink as DocumentLinkT,
  EncumbranceLifecycle,
} from "../src/types";

// -- fixture helpers --------------------------------------------------------

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

// Real-world-shape fixtures mirroring the POPHAM corpus
function pophamDot2013(): Instrument {
  return makeInstrument({
    instrument_number: "20130183450",
    recording_date: "2013-02-27",
    document_type: "deed_of_trust",
    parties: [
      {
        name: "MORTGAGE ELECTRONIC REGISTRATION SYSTEMS INC",
        role: "nominee",
        provenance: "manual_entry",
        confidence: 1,
        nominee_for: {
          party_name: "V.I.P. MORTGAGE INC",
          party_role: "lender",
        },
      },
    ],
    legal_description: {
      value: "Lot 46 SEVILLE PARCEL 3 Book 554 Maps Page 19",
      provenance: "ocr",
      confidence: 1,
    },
  });
}
function pophamDot2021(): Instrument {
  return makeInstrument({
    instrument_number: "20210057847",
    recording_date: "2021-01-19",
    document_type: "deed_of_trust",
    parties: [
      {
        name: "MORTGAGE ELECTRONIC REGISTRATION SYSTEMS INC",
        role: "nominee",
        provenance: "manual_entry",
        confidence: 1,
        nominee_for: {
          party_name: "GUILD MORTGAGE COMPANY LLC",
          party_role: "lender",
        },
      },
    ],
    legal_description: {
      value: "Lot 46 SEVILLE PARCEL 3 Book 554 Maps Page 19",
      provenance: "ocr",
      confidence: 1,
    },
  });
}
function pophamReconveyance2021(): Instrument {
  return makeInstrument({
    instrument_number: "20210075858",
    recording_date: "2021-01-22",
    document_type: "full_reconveyance",
    parties: [
      {
        name: "WELLS FARGO BANK NA",
        role: "releasing_party",
        provenance: "ocr",
        confidence: 1,
      },
    ],
    legal_description: {
      value: "Lot 46 SEVILLE PARCEL 3",
      provenance: "ocr",
      confidence: 1,
    },
  });
}
function hogueParcel(): Parcel {
  return {
    apn: "304-77-689",
    address: "2715 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: "Lot 348 Shamrock Estates Phase 2A",
    current_owner: "HOGUE JASON / MICHELE",
    subdivision: "Shamrock Estates Phase 2A",
  };
}
function existingReleaseLink(): DocumentLinkT {
  return {
    id: "link-002",
    source_instrument: "20210075858",
    target_instrument: "20130183450",
    link_type: "release_of",
    provenance: "ocr",
    confidence: 0.97,
    examiner_action: "accepted",
  };
}
function lc001(): EncumbranceLifecycle {
  return {
    id: "lc-001",
    root_instrument: "20130183450",
    child_instruments: ["20210075858"],
    status: "released",
    status_rationale: "Release confirmed by examiner via 20210075858",
    examiner_override: null,
  };
}
function lc002(): EncumbranceLifecycle {
  return {
    id: "lc-002",
    root_instrument: "20210057847",
    child_instruments: [],
    status: "open",
    status_rationale: "No reconveyance found in corpus",
    examiner_override: null,
  };
}

// -- Schema tests -----------------------------------------------------------

describe("algorithmic provenance kind", () => {
  it("ProvenanceKind.parse accepts 'algorithmic'", () => {
    expect(ProvenanceKind.parse("algorithmic")).toBe("algorithmic");
  });

  it("DocumentLink parses with provenance='algorithmic'", () => {
    const link = DocumentLink.parse({
      id: "synthetic-lc-001-20210075858",
      source_instrument: "20210075858",
      target_instrument: "20130183450",
      link_type: "release_of",
      provenance: "algorithmic",
      confidence: 0.87,
      examiner_action: "accepted",
    });
    expect(link.provenance).toBe("algorithmic");
  });
});

// -- Threshold constant -----------------------------------------------------

describe("CANDIDATE_DISPLAY_THRESHOLD", () => {
  it("is exported from the matcher module as 0.25", () => {
    expect(CANDIDATE_DISPLAY_THRESHOLD).toBe(0.25);
  });
});

// -- Hero test: lc-002 sees 20210075858 as already-linked candidate --------

describe("hero: already-linked candidate", () => {
  it("lc-002 surfaces 20210075858 with already_linked_to='lc-001', Accept disabled", () => {
    const { rows, total, aboveThresholdCount } = buildCandidateRows({
      lifecycleId: "lc-002",
      dot: pophamDot2021(),
      pool: [pophamReconveyance2021()],
      releaseLinks: [existingReleaseLink()],
      lifecycles: [lc001(), lc002()],
      candidateActions: {},
    });
    expect(total).toBe(1);
    expect(aboveThresholdCount).toBe(1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.candidate.instrument_number).toBe("20210075858");
    expect(row.alreadyLinkedTo).toBe("lc-001");
    expect(row.canAccept).toBe(false);
    // Score rendered live from matcher features (proves not theater)
    expect(row.score).toBeGreaterThan(CANDIDATE_DISPLAY_THRESHOLD);
    expect(row.features.dateProximity).toBeGreaterThan(0.99); // 3-day gap
    expect(row.features.legalDescOverlap).toBeGreaterThan(0.4);
  });

  it("rejecting the already-linked candidate does not touch lc-001's link", () => {
    const candidateKey = "lc-002::20210075858";
    const originalLink = existingReleaseLink();
    const { rows } = buildCandidateRows({
      lifecycleId: "lc-002",
      dot: pophamDot2021(),
      pool: [pophamReconveyance2021()],
      releaseLinks: [originalLink],
      lifecycles: [lc001(), lc002()],
      candidateActions: { [candidateKey]: "rejected" },
    });
    expect(rows[0].action).toBe("rejected");
    // Rejected rows stay visible (auditable trail).
    expect(rows).toHaveLength(1);
    // lc-001's link is untouched in the releaseLinks input.
    expect(originalLink.examiner_action).toBe("accepted");
    expect(originalLink.provenance).toBe("ocr");
  });
});

// -- HOGUE empty-state ------------------------------------------------------

describe("HOGUE empty-state (no reconveyances in parcel corpus)", () => {
  it("builds the moat-reinforcing rationale text", () => {
    const rationale = buildEmptyStateRationale(hogueParcel());
    expect(rationale).toContain("Cross-parcel scan");
    expect(rationale).toContain("Shamrock Estates Phase 2A");
    expect(rationale).toContain("HOGUE JASON / MICHELE");
    expect(rationale).toContain("county-internal full-name scan");
    expect(rationale).toContain("out of prototype scope");
  });

  it("buildCandidateRows on an empty pool returns total=0, no rows", () => {
    const hogueDot = makeInstrument({
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
    const { rows, total, aboveThresholdCount } = buildCandidateRows({
      lifecycleId: "lc-003",
      dot: hogueDot,
      pool: [],
      releaseLinks: [],
      lifecycles: [],
      candidateActions: {},
    });
    expect(total).toBe(0);
    expect(aboveThresholdCount).toBe(0);
    expect(rows).toHaveLength(0);
  });
});

// -- Accept path ------------------------------------------------------------

describe("accept path synthesizes an algorithmic DocumentLink", () => {
  it("link carries provenance=algorithmic, confidence=score, correct endpoints", () => {
    const dot = pophamDot2021();
    const candidate = pophamReconveyance2021();
    const score = 0.8734;
    const link = synthesizeAlgorithmicLink({
      lifecycleId: "lc-002",
      dot,
      candidate,
      score,
    });
    expect(link.provenance).toBe("algorithmic");
    expect(link.confidence).toBe(score);
    expect(link.examiner_action).toBe("accepted");
    expect(link.link_type).toBe("release_of");
    expect(link.source_instrument).toBe("20210075858");
    expect(link.target_instrument).toBe("20210057847");
    expect(link.id).toBe("synthetic-lc-002-20210075858");
    // Zod-validates as a real DocumentLink
    expect(() => DocumentLink.parse(link)).not.toThrow();
  });

  it("buildAcceptedRationale formats score to 2 decimals", () => {
    expect(buildAcceptedRationale(0.8734)).toBe(
      "Accepted via release-candidate matcher, score=0.87",
    );
    expect(buildAcceptedRationale(1)).toBe(
      "Accepted via release-candidate matcher, score=1.00",
    );
    expect(buildAcceptedRationale(0.4)).toBe(
      "Accepted via release-candidate matcher, score=0.40",
    );
  });

  it("accepting a fresh candidate in rows reflects action='accepted' and canAccept=true", () => {
    const dot = pophamDot2021();
    const candidate = pophamReconveyance2021();
    const freshPool = [candidate];
    // No existing release link pointing at this candidate.
    const { rows } = buildCandidateRows({
      lifecycleId: "lc-002",
      dot,
      pool: freshPool,
      releaseLinks: [],
      lifecycles: [lc002()],
      candidateActions: { "lc-002::20210075858": "accepted" },
    });
    expect(rows[0].action).toBe("accepted");
    expect(rows[0].canAccept).toBe(true);
    expect(rows[0].alreadyLinkedTo).toBeNull();
  });
});

// -- Sub-threshold filtering ------------------------------------------------

describe("sub-threshold filtering", () => {
  it("reports total=2 / aboveThreshold=1 and renders only the strong candidate", () => {
    const dot = pophamDot2021();
    const strong = pophamReconveyance2021();
    // Weak: different lender, 28 years earlier, no legal desc
    const weak = makeInstrument({
      instrument_number: "19930000001",
      recording_date: "1993-06-01",
      document_type: "full_reconveyance",
      parties: [
        {
          name: "SOME UNRELATED BANK",
          role: "releasing_party",
          provenance: "manual_entry",
          confidence: 1,
        },
      ],
    });
    const { rows, total, aboveThresholdCount } = buildCandidateRows({
      lifecycleId: "lc-002",
      dot,
      pool: [weak, strong],
      releaseLinks: [],
      lifecycles: [lc002()],
      candidateActions: {},
    });
    expect(total).toBe(2);
    expect(aboveThresholdCount).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].candidate.instrument_number).toBe("20210075858");
  });

  it("caps aboveThreshold rows at top 3 even when more pass", () => {
    const dot = pophamDot2021();
    const mk = (num: string) =>
      makeInstrument({
        instrument_number: num,
        recording_date: "2021-02-01",
        document_type: "full_reconveyance",
        parties: [
          {
            name: "GUILD MORTGAGE COMPANY LLC",
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
    const pool = [
      mk("20210000001"),
      mk("20210000002"),
      mk("20210000003"),
      mk("20210000004"),
      mk("20210000005"),
    ];
    const { rows, total, aboveThresholdCount } = buildCandidateRows({
      lifecycleId: "lc-002",
      dot,
      pool,
      releaseLinks: [],
      lifecycles: [lc002()],
      candidateActions: {},
    });
    expect(total).toBe(5);
    expect(aboveThresholdCount).toBe(5);
    expect(rows).toHaveLength(3);
  });
});
