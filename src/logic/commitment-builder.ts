import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
  ProvenanceKind,
  FieldWithProvenance,
  DocumentType,
} from "../types";

const COUNTY_NAME = "Maricopa County, AZ";
const COUNTY_API_BASE = "https://publicapi.recorder.maricopa.gov";

const SUBDIVISION_ENCUMBRANCE_ROOTS = new Set<string>(["20010093192"]);

export interface ClosingImpactTemplate {
  status: string;
  root_doc_type: string;
  template: string;
}

export interface BuildCommitmentInput {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  closingImpactTemplates: ClosingImpactTemplate[];
  generatedAt: string;
  viewedInstrumentNumber?: string;
}

export interface B2InstrumentRef {
  recordingNumber: string;
  documentType: string;
  recordingDate: string;
  pdfUrl: string;
}

export interface B2RowParty {
  role: string;
  name: string;
  provenance: ProvenanceKind;
  confidence: number;
}

export interface ScheduleB2Row {
  lifecycleId: string;
  status: "open" | "released" | "unresolved" | "possible_match";
  rootInstrument: B2InstrumentRef;
  childInstruments: B2InstrumentRef[];
  rationale: string;
  closingImpact?: string;
  parties: B2RowParty[];
  viewedMarker: boolean;
  subtype?: "subdivision_encumbrance";
}

export interface CommitmentDocument {
  header: {
    countyName: string;
    parcelApn: string;
    parcelAddress: string;
    verifiedThroughDate: string;
    generatedAt: string;
    headerNote: string;
    countyAuthoritativeUrls: {
      assessorUrl: string | undefined;
      recorderApiBase: string;
    };
  };
  scheduleA: {
    currentOwner: FieldWithProvenance;
    legalDescription: FieldWithProvenance;
    apn: string;
    subdivision: string;
    vesting?: FieldWithProvenance;
  };
  scheduleB2: ScheduleB2Row[];
  sources: {
    countyApiBase: string;
    perInstrumentMetadataUrls: Array<{
      recordingNumber: string;
      url: string;
    }>;
  };
}

function pdfUrlFor(recordingNumber: string): string {
  return `${COUNTY_API_BASE}/preview/pdf?recordingNumber=${recordingNumber}`;
}

function metadataUrlFor(recordingNumber: string): string {
  return `${COUNTY_API_BASE}/documents/${recordingNumber}`;
}

function instrumentRef(inst: Instrument): B2InstrumentRef {
  return {
    recordingNumber: inst.instrument_number,
    documentType: humanizeDocType(inst.document_type, inst.document_type_raw),
    recordingDate: inst.recording_date,
    pdfUrl: pdfUrlFor(inst.instrument_number),
  };
}

// Narrow allow-list for `document_type === "other"` instruments whose
// raw Maricopa code carries the actual identity. Only contains codes
// present in the curated corpus; unknown raw codes fall back to "Other".
// In this corpus the lone AFFIDAVIT is the lc-004 Affidavit of
// Correction; if a generic affidavit is added later, this lookup needs
// to disambiguate via extracted_fields.affidavit_type, not raw alone.
const RAW_DOC_TYPE_LABELS: Record<string, string> = {
  "PLAT MAP": "Subdivision Plat",
  AFFIDAVIT: "Affidavit of Correction",
};

function humanizeDocType(t: DocumentType, raw?: string): string {
  const map: Record<DocumentType, string> = {
    warranty_deed: "Warranty Deed",
    special_warranty_deed: "Special Warranty Deed",
    quit_claim_deed: "Quit Claim Deed",
    grant_deed: "Grant Deed",
    deed_of_trust: "Deed of Trust",
    assignment_of_dot: "Assignment of Deed of Trust",
    substitution_of_trustee: "Substitution of Trustee",
    full_reconveyance: "Full Reconveyance",
    partial_reconveyance: "Partial Reconveyance",
    modification: "Modification",
    heloc_dot: "HELOC Deed of Trust",
    ucc_termination: "UCC Termination",
    hoa_lien: "HOA Lien",
    affidavit_of_disclosure: "Affidavit of Disclosure",
    other: "Other",
  };
  if (t === "other" && raw && RAW_DOC_TYPE_LABELS[raw]) {
    return RAW_DOC_TYPE_LABELS[raw];
  }
  return map[t] ?? t;
}

function findClosingImpact(
  templates: ClosingImpactTemplate[],
  status: string,
  rootDocType: DocumentType,
): string | undefined {
  if (status !== "open") return undefined;
  return templates.find(
    (t) => t.status === status && t.root_doc_type === rootDocType,
  )?.template;
}

function vestingFromLatestDeed(
  instruments: Instrument[],
): FieldWithProvenance | undefined {
  const deeds = instruments
    .filter((i) =>
      ["warranty_deed", "special_warranty_deed", "quit_claim_deed", "grant_deed"].includes(
        i.document_type,
      ),
    )
    .sort((a, b) => (b.recording_date < a.recording_date ? -1 : 1));
  for (const d of deeds) {
    const v = d.extracted_fields["vesting"];
    if (v) return v;
  }
  return undefined;
}

function buildHeaderNote(verifiedThroughDate: string): string {
  return `This report is a chain-and-encumbrance abstract of the recorded corpus as of ${verifiedThroughDate}. Schedule B-I (Requirements) is transaction-scoped \u2014 items such as payoff of open deeds of trust, satisfaction of assignments, or curative affidavits are generated when a closing opens against a specific buyer, lender, and effective date. Those inputs are not part of the recorded corpus and are out of scope for this abstract.`;
}

export function buildCommitment(input: BuildCommitmentInput): CommitmentDocument {
  const {
    parcel,
    instruments,
    lifecycles,
    pipelineStatus,
    closingImpactTemplates,
    generatedAt,
    viewedInstrumentNumber,
  } = input;

  const instrumentMap = new Map(
    instruments.map((i) => [i.instrument_number, i]),
  );

  const scheduleB2: ScheduleB2Row[] = lifecycles.map((lc) => {
    const root = instrumentMap.get(lc.root_instrument);
    if (!root) {
      throw new Error(
        `commitment-builder: lifecycle ${lc.id} references unknown root instrument ${lc.root_instrument}`,
      );
    }
    const children = lc.child_instruments
      .map((n) => instrumentMap.get(n))
      .filter((x): x is Instrument => Boolean(x));

    const isViewed =
      viewedInstrumentNumber !== undefined &&
      (lc.root_instrument === viewedInstrumentNumber ||
        lc.child_instruments.includes(viewedInstrumentNumber));

    const subtype = SUBDIVISION_ENCUMBRANCE_ROOTS.has(lc.root_instrument)
      ? "subdivision_encumbrance"
      : undefined;

    return {
      lifecycleId: lc.id,
      status: lc.status,
      rootInstrument: instrumentRef(root),
      childInstruments: children.map(instrumentRef),
      rationale: lc.status_rationale,
      closingImpact: findClosingImpact(
        closingImpactTemplates,
        lc.status,
        root.document_type,
      ),
      parties: root.parties.map((p) => ({
        role: p.role,
        name: p.name,
        provenance: p.provenance,
        confidence: p.confidence,
      })),
      viewedMarker: isViewed,
      subtype,
    };
  });

  const cited = new Set<string>();
  for (const lc of lifecycles) {
    cited.add(lc.root_instrument);
    for (const c of lc.child_instruments) cited.add(c);
  }
  const perInstrumentMetadataUrls = Array.from(cited)
    .sort()
    .map((n) => ({ recordingNumber: n, url: metadataUrlFor(n) }));

  return {
    header: {
      countyName: COUNTY_NAME,
      parcelApn: parcel.apn,
      parcelAddress: `${parcel.address}, ${parcel.city}, ${parcel.state} ${parcel.zip}`,
      verifiedThroughDate: pipelineStatus.verified_through_date,
      generatedAt,
      headerNote: buildHeaderNote(pipelineStatus.verified_through_date),
      countyAuthoritativeUrls: {
        assessorUrl: parcel.assessor_url,
        recorderApiBase: COUNTY_API_BASE,
      },
    },
    scheduleA: {
      currentOwner: {
        value: parcel.current_owner,
        provenance: "manual_entry",
        confidence: 1,
      },
      legalDescription: {
        value: parcel.legal_description,
        provenance: "manual_entry",
        confidence: 1,
      },
      apn: parcel.apn,
      subdivision: parcel.subdivision,
      vesting: vestingFromLatestDeed(instruments),
    },
    scheduleB2,
    sources: {
      countyApiBase: COUNTY_API_BASE,
      perInstrumentMetadataUrls,
    },
  };
}
