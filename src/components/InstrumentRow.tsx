import type { Instrument, DocumentType } from "../types";
import { getGrantors, getGrantees } from "../logic/party-roles";
import { useTerminology } from "../terminology/TerminologyContext";

const TYPE_LABELS: Record<DocumentType, string> = {
  warranty_deed: "Warranty Deed",
  special_warranty_deed: "Special Warranty Deed",
  quit_claim_deed: "Quit Claim Deed",
  grant_deed: "Grant Deed",
  deed_of_trust: "Deed of Trust",
  assignment_of_dot: "Assignment of DOT",
  substitution_of_trustee: "Sub. of Trustee",
  full_reconveyance: "Full Reconveyance",
  partial_reconveyance: "Partial Reconveyance",
  modification: "Modification",
  heloc_dot: "HELOC DOT",
  ucc_termination: "UCC Termination",
  affidavit_of_disclosure: "Affidavit of Disclosure",
  other: "Other",
};

interface Props {
  instrument: Instrument;
  onOpenDocument: (instrumentNumber: string) => void;
}

export function InstrumentRow({ instrument, onOpenDocument }: Props) {
  const { t } = useTerminology();
  const grantors = getGrantors(instrument);
  const grantees = getGrantees(instrument);

  const partiesText =
    grantors.length > 0 && grantees.length > 0
      ? `${grantors.join(", ")} \u2192 ${grantees.join(", ")}`
      : grantors.length > 0
        ? grantors.join(", ")
        : grantees.join(", ");

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 hover:bg-gray-50 rounded">
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-medium text-gray-400 w-24">
          {instrument.recording_date}
        </span>
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium text-gray-700 whitespace-nowrap">
          {t(TYPE_LABELS[instrument.document_type])}
        </span>
        <button
          onClick={() => onOpenDocument(instrument.instrument_number)}
          className="text-sm font-mono text-blue-700 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          title="Open source document"
        >
          {instrument.instrument_number}
        </button>
      </div>
      <div
        className="text-sm text-gray-600 min-w-0 truncate text-right"
        title={partiesText}
      >
        {partiesText}
      </div>
    </div>
  );
}
