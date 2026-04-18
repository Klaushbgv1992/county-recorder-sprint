/**
 * Map a recording number to the hand-curated field values for the
 * side-by-side AI-vs-curator view in `AiExtractLivePanel`.
 *
 * Only the intersection with `LIVE_EXTRACT_FIELDS` is surfaced. If a
 * recording number is not in the curated corpus, returns null.
 *
 * Grantor/grantee roles in this codebase are stored as party objects
 * with a `role` string. The Maricopa public API has no grantor/grantee
 * distinction (Decision #19), so this split is itself curator
 * judgment — which is precisely what we're showing off here.
 */

import type { Instrument, Party } from "../types";

const modules = import.meta.glob("../data/instruments/*.json", {
  eager: true,
}) as Record<string, { default: Instrument }>;

const instrumentsByRecording: Map<string, Instrument> = new Map(
  Object.values(modules).map((m) => [m.default.instrument_number, m.default]),
);

export interface CuratedExtraction {
  document_type: string | null;
  recording_date: string | null;
  grantors: string[] | null;
  grantees: string[] | null;
  legal_description: string | null;
}

const GRANTOR_ROLES: ReadonlyArray<Party["role"]> = [
  "grantor",
  "trustor",
  "releasing_party",
];

const GRANTEE_ROLES: ReadonlyArray<Party["role"]> = [
  "grantee",
  "beneficiary",
  "lender",
];

export function getCuratedExtraction(
  recordingNumber: string,
): CuratedExtraction | null {
  const inst = instrumentsByRecording.get(recordingNumber);
  if (!inst) return null;

  const grantors = inst.parties
    .filter((p) => GRANTOR_ROLES.includes(p.role))
    .map((p) => p.name);
  const grantees = inst.parties
    .filter((p) => GRANTEE_ROLES.includes(p.role))
    .map((p) => p.name);

  return {
    document_type: prettyDocumentType(inst.document_type, inst.document_type_raw),
    recording_date: inst.recording_date,
    grantors: grantors.length > 0 ? grantors : null,
    grantees: grantees.length > 0 ? grantees : null,
    legal_description: inst.legal_description?.value ?? null,
  };
}

/**
 * The stored document_type is a short canonical enum (deed_of_trust,
 * full_reconveyance). Render a human label that matches what an
 * examiner would write on an abstract — apples to apples against the
 * model's output, which is also a prose phrase.
 */
function prettyDocumentType(
  canonical: string,
  raw: string | undefined,
): string {
  const map: Record<string, string> = {
    deed_of_trust: "Deed of Trust",
    warranty_deed: "Warranty Deed",
    grant_deed: "Grant Deed",
    quit_claim: "Quit Claim Deed",
    full_reconveyance: "Deed of Release and Full Reconveyance of Deed of Trust",
    assignment_of_dot: "Assignment of Deed of Trust",
    ucc_termination: "Termination of Financing Statement (UCC-3)",
    affidavit_of_correction: "Affidavit of Correction",
    affidavit_of_disclosure: "Affidavit of Disclosure",
    subdivision_plat: "Subdivision Plat",
  };
  if (map[canonical]) return map[canonical];
  if (raw) return raw;
  return canonical;
}

// Test helper — exported for unit tests, not used by the panel.
export function __getCuratedCorpusForTests(): Map<string, Instrument> {
  return instrumentsByRecording;
}
