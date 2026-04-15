import { useMemo } from "react";
import type { Parcel, Instrument, DocumentLink, DocumentType } from "../types";
import { buildOwnerPeriods } from "../logic/chain-builder";
import { detectAnomalies } from "../logic/anomaly-detector";
import { getGrantors, getGrantees } from "../logic/party-roles";
import { AnomalyPanel } from "./AnomalyPanel";
import { ProvenanceTag } from "./ProvenanceTag";

const DEED_TYPES = new Set([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
]);

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
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
}

// Truncate a legal description to its most identifying prefix (lot + subdivision).
function legalDescriptionSnippet(legal: string): string {
  // Grab everything up to the first comma after "PARCEL" or first semicolon/150 chars
  const semiIdx = legal.indexOf(";");
  const cutoff = semiIdx > 0 ? semiIdx : Math.min(legal.length, 150);
  return legal.slice(0, cutoff).trim();
}

export function ChainOfTitle({
  parcel,
  instruments,
  links: _links,
  onOpenDocument,
}: Props) {
  const findings = useMemo(() => detectAnomalies(parcel.apn), [parcel.apn]);
  const ownerPeriods = useMemo(
    () => buildOwnerPeriods(instruments),
    [instruments],
  );
  const deeds = useMemo(
    () =>
      instruments
        .filter((i) => DEED_TYPES.has(i.document_type))
        .sort(
          (a, b) =>
            new Date(a.recording_date).getTime() -
            new Date(b.recording_date).getTime(),
        ),
    [instruments],
  );

  // Prior-to-corpus owner: derived from the first deed's grantor.
  const priorOwner = useMemo(() => {
    if (deeds.length === 0) return null;
    const firstDeed = deeds[0];
    const grantors = getGrantors(firstDeed);
    if (grantors.length === 0) return null;
    return {
      name: grantors.join(" & "),
      end_date: firstDeed.recording_date,
    };
  }, [deeds]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Chain of Title</h2>
        <p className="text-sm text-gray-500 mt-1">
          {parcel.address} &mdash; APN: {parcel.apn}
        </p>
      </div>

      <AnomalyPanel findings={findings} apn={parcel.apn} />

      {/* Owner Period Timeline */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Ownership Periods
        </h3>
        <div className="relative">
          {/* Prior-to-corpus owner period */}
          {priorOwner && (
            <div className="flex mb-4">
              <div className="flex flex-col items-center mr-4">
                <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400 border-dashed" />
                <div className="w-0.5 h-full bg-gray-200 mt-1" />
              </div>
              <div className="flex-1 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">
                    {priorOwner.name}
                  </span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    Prior to corpus scope
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Prior to {priorOwner.end_date}
                </div>
              </div>
            </div>
          )}

          {ownerPeriods.map((period, idx) => (
            <div key={period.start_instrument} className="flex mb-4">
              <div className="flex flex-col items-center mr-4">
                <div
                  className={`w-3 h-3 rounded-full ${period.is_current ? "bg-blue-600" : "bg-gray-400"}`}
                />
                {idx < ownerPeriods.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-1" />
                )}
              </div>

              <div
                className={`flex-1 border rounded-lg p-3 ${period.is_current ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">
                    {period.owner}
                  </span>
                  {period.is_current && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                      Current Owner
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {period.start_date}
                  {period.end_date ? ` to ${period.end_date}` : " to present"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deed List — labeled rows */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Conveyance Instruments
        </h3>
        <div className="space-y-3">
          {deeds.map((deed) => (
            <DeedCard
              key={deed.instrument_number}
              deed={deed}
              onOpenDocument={onOpenDocument}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-right">
        {deeds[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}

interface DeedCardProps {
  deed: Instrument;
  onOpenDocument: (instrumentNumber: string) => void;
}

function DeedCard({ deed, onOpenDocument }: DeedCardProps) {
  const grantors = getGrantors(deed);
  const grantees = getGrantees(deed);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium text-gray-700">
            {TYPE_LABELS[deed.document_type]}
          </span>
          <button
            onClick={() => onOpenDocument(deed.instrument_number)}
            className="text-sm font-mono text-blue-700 hover:underline"
            title="Open source document"
          >
            {deed.instrument_number}
          </button>
        </div>
        <span className="text-xs text-gray-500">
          Recorded {deed.recording_date}
        </span>
      </div>

      <dl className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-3 text-sm">
        <dt className="text-xs font-medium text-gray-500 self-start pt-0.5">
          Grantor
        </dt>
        <dd className="text-gray-800 break-words">
          {grantors.length > 0 ? grantors.join("; ") : <span className="text-gray-400">—</span>}
        </dd>

        <dt className="text-xs font-medium text-gray-500 self-start pt-0.5">
          Grantee
        </dt>
        <dd className="text-gray-800 break-words">
          {grantees.length > 0 ? grantees.join("; ") : <span className="text-gray-400">—</span>}
        </dd>

        {deed.legal_description && (
          <>
            <dt className="text-xs font-medium text-gray-500 self-start pt-0.5 flex items-center gap-1">
              Legal Desc.
            </dt>
            <dd className="text-gray-800 break-words">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="font-mono text-xs">
                  {legalDescriptionSnippet(deed.legal_description.value)}
                </span>
                <ProvenanceTag
                  provenance={deed.legal_description.provenance}
                  confidence={deed.legal_description.confidence}
                />
              </div>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
