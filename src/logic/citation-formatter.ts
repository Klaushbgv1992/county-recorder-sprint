import type { Instrument, DocumentType } from "../types";

const TYPE_LABELS: Record<DocumentType, string> = {
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
  affidavit_of_disclosure: "Affidavit of Disclosure",
  other: "Other",
};

export function formatCitation(
  instrument: Instrument,
  countyName: string,
): string {
  const typeLabel = TYPE_LABELS[instrument.document_type];
  return `${typeLabel}, Inst. No. ${instrument.instrument_number}, recorded ${instrument.recording_date}, ${countyName}`;
}
