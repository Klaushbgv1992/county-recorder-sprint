import { z } from "zod";

// -- Provenance --

export const ProvenanceKind = z.enum([
  "public_api",
  "ocr",
  "manual_entry",
  "algorithmic",
  "demo_synthetic",
]);

export const FieldWithProvenance = z.object({
  value: z.string(),
  provenance: ProvenanceKind,
  confidence: z.number().min(0).max(1),
});

// -- Party Roles --

export const PartyRole = z.enum([
  "grantor",
  "grantee",
  "trustor",
  "trustee",
  "beneficiary",
  "borrower",
  "lender",
  "nominee",
  "releasing_party",
  "servicer",
  "claimant",
  "debtor",
]);

export const Party = z.object({
  name: z.string(),
  role: PartyRole,
  provenance: ProvenanceKind,
  confidence: z.number().min(0).max(1),
  nominee_for: z.object({
    party_name: z.string(),
    party_role: PartyRole,
  }).optional(),
});

// -- Document Types --

export const DocumentType = z.enum([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
  "deed_of_trust",
  "assignment_of_dot",
  "substitution_of_trustee",
  "full_reconveyance",
  "partial_reconveyance",
  "modification",
  "heloc_dot",
  "ucc_termination",
  "hoa_lien",
  "affidavit_of_disclosure",
  "other",
]);

// -- Raw API Response (preserved for provenance) --

export const RawApiResponse = z.object({
  names: z.array(z.string()),
  documentCodes: z.array(z.string()),
  recordingDate: z.string(),
  recordingNumber: z.string(),
  pageAmount: z.number(),
  docketBook: z.number(),
  pageMap: z.number(),
  affidavitPresent: z.boolean(),
  affidavitPageAmount: z.number(),
  restricted: z.boolean(),
  // Synthetic-instrument fields: present only on demo-only instruments
  // whose recording numbers are in the reserved YYYY010000N block.
  synthesized: z.boolean().optional(),
  synthesized_note: z.string().optional(),
});

// -- Instrument --

export const Instrument = z.object({
  instrument_number: z.string().regex(/^\d{11}$/),
  recording_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  document_type: DocumentType,
  document_type_raw: z.string(),
  bundled_document_types: z.array(DocumentType).default([]),

  parties: z.array(Party),

  legal_description: FieldWithProvenance.optional(),

  extracted_fields: z.record(z.string(), FieldWithProvenance),

  back_references: z.array(z.string()),
  same_day_group: z.array(z.string()).optional(),
  same_day_group_id: z.string().nullable().optional(),

  source_image_path: z.string().nullable(),
  page_count: z.number().int().nonnegative().nullable(),

  raw_api_response: RawApiResponse,

  corpus_boundary_note: z.string(),

  mers_note: z.string().optional(),

  provenance_summary: z.object({
    public_api_count: z.number().int().nonnegative(),
    ocr_count: z.number().int().nonnegative(),
    manual_entry_count: z.number().int().nonnegative(),
  }).optional(),
});

// -- Parcel --

export const Parcel = z.object({
  apn: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string().length(2),
  zip: z.string(),
  legal_description: z.string(),
  current_owner: z.string(),
  subdivision: z.string(),
  // Display variant. Drives popup variant on landing map and any future
  // per-type rendering. Omit for legacy residential records (defaults
  // applied at consumer site).
  type: z.enum(["residential", "subdivision_common"]).optional(),
  assessor_url: z.string().optional(),
  recorder_url: z.string().optional(),
  // List of instruments curated for this parcel. Used by multi-parcel
  // data-loader to scope instruments/links/lifecycles to one parcel.
  // Optional for backward compatibility with single-parcel corpora.
  instrument_numbers: z.array(z.string()).optional(),
});

// -- Derived types (computed at runtime, not stored in curated files) --

export const OwnerPeriod = z.object({
  owner: z.string(),
  start_instrument: z.string(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_instrument: z.string().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  is_current: z.boolean(),
});

// -- Document Links --

export const LinkType = z.enum([
  "back_reference",
  "assignment_of",
  "release_of",
  "modification_of",
  "substitution_of_trustee_for",
  "same_day_transaction",
]);

export const ExaminerAction = z.enum([
  "pending",
  "accepted",
  "rejected",
  "unresolved",
]);

export const DocumentLink = z.object({
  id: z.string(),
  source_instrument: z.string(),
  target_instrument: z.string(),
  link_type: LinkType,
  provenance: ProvenanceKind,
  confidence: z.number().min(0).max(1),
  examiner_action: ExaminerAction,
});

// -- Encumbrance Lifecycle --

export const LifecycleStatus = z.enum([
  "open",
  "released",
  "unresolved",
  "possible_match",
]);

export const EncumbranceLifecycle = z.object({
  id: z.string(),
  root_instrument: z.string(),
  child_instruments: z.array(z.string()),
  status: LifecycleStatus,
  status_rationale: z.string(),
  examiner_override: LifecycleStatus.nullable(),
});

// -- Pipeline Status (county moat) --

export const PipelineStage = z.enum([
  "received",
  "recorded",
  "indexed",
  "verified",
  "published",
]);

export const PipelineStatus = z.object({
  verified_through_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  current_stage: PipelineStage,
  last_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// -- Top-level file schemas --

export const ParcelFile = Parcel;
export const ParcelsFile = z.array(Parcel);
export const InstrumentFile = Instrument;
export const LinksFile = z.array(DocumentLink);
export const LifecyclesFile = z.object({
  pipeline_status: PipelineStatus,
  lifecycles: z.array(EncumbranceLifecycle),
});

// -- Anomaly Findings --

export const AnomalyFindingSchema = z.object({
  rule_id: z.string(),
  parcel_apn: z.string(),
  severity: z.enum(["high", "medium", "low", "info"]),
  title: z.string(),
  description: z.string(),
  evidence_instruments: z.array(z.string()),
  examiner_action: z.string(),
  detection_provenance: z.object({
    rule_name: z.string(),
    rule_version: z.string(),
    confidence: z.number().min(0).max(1),
  }),
});

// -- Commitment B-I Items --

export const BIItemSchema = z.object({
  item_id: z.string(),
  text: z.string(),
  why: z.string(),
  template_id: z.string(),
  origin_anomaly_id: z.string().nullable(),
  origin_lifecycle_id: z.string().nullable(),
});

// -- Narrative overlay --

export const NarrativeOverlayFile = z.object({
  hero_override: z.string().nullable(),
  callouts: z.record(z.string(), z.string()),
  what_this_means: z.string().nullable(),
  moat_note: z.string().nullable(),
});

// -- Staff Anomaly (discriminated union: engine vs override) --

const AnomalyBaseSchema = z.object({
  id: z.string(),
  parcel_apn: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  title: z.string(),
  description: z.string(),
});

const EngineAnomalySchema = AnomalyBaseSchema.extend({
  references: z.array(z.string()).min(1),
  pattern_id: z.string(),
}).strict();

const OverrideAnomalySchema = AnomalyBaseSchema.extend({
  references: z.array(z.string()).length(0),
  plain_english: z.string(),
}).strict();

export const StaffAnomalySchema = z.union([
  EngineAnomalySchema,
  OverrideAnomalySchema,
]);

export const StaffAnomalyFileSchema = z.array(StaffAnomalySchema);

export type StaffAnomaly = z.infer<typeof StaffAnomalySchema>;
