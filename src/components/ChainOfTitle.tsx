import { useCallback, useMemo } from "react";
import { Link } from "react-router";
import type { Parcel, Instrument, DocumentLink, DocumentType } from "../types";
import { buildOwnerPeriods } from "../logic/chain-builder";
import { detectAnomalies } from "../logic/anomaly-detector";
import { getGrantors, getGrantees } from "../logic/party-roles";
import { formatCitation } from "../logic/citation-formatter";
import { AnomalyPanel } from "./AnomalyPanel";
import { AiSummaryStatic } from "./AiSummaryStatic";
import { useTerminology } from "../terminology/TerminologyContext";
import { Term, TermSection } from "../terminology/Term";
import { storyPageExists } from "../narrative/availability";

const COUNTY_NAME = "Maricopa County, AZ";

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
  hoa_lien: "HOA Lien",
  affidavit_of_disclosure: "Affidavit of Disclosure",
  other: "Other",
};

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
}

export function ChainOfTitle({
  parcel,
  instruments,
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

  const knownInstruments = useMemo(
    () => new Set(instruments.map((i) => i.instrument_number)),
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
      <TermSection id="chain-heading">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {parcel.address}, {parcel.city} {parcel.state}
          </h1>
          <div className="flex items-baseline gap-3 flex-wrap mt-1">
            <h2 className="text-base font-semibold text-gray-700">
              <Term professional="Chain of Title" />
            </h2>
            {storyPageExists(parcel.apn) && (
              <Link
                to={`/parcel/${parcel.apn}/story`}
                className="text-xs text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              >
                Read as a story →
              </Link>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            APN: <span className="font-mono">{parcel.apn}</span>
          </p>
        </div>
      </TermSection>

      <AnomalyPanel findings={findings} apn={parcel.apn} />

      <AiSummaryStatic
        parcel={parcel}
        knownInstruments={knownInstruments}
        onOpenDocument={onOpenDocument}
      />

      {/* Owner Period Timeline */}
      <TermSection id="ownership-periods">
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

      </TermSection>

      {/* Deed List — dense table */}
      <TermSection id="conveyance-instruments">
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Conveyance Instruments
        </h3>
        {deeds.some((d) => d.raw_api_response?.synthesized) && (
          // One-time notice above the table: the deed list mixes real and
          // reconstructed rows. Individual synthetic rows also carry a
          // pill, but the block header sets context before the examiner
          // scans the table. Matches the "synthetic · demo-only" pill
          // used elsewhere.
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold">
              Historical chain extended by demo reconstruction.
            </strong>{" "}
            Rows marked <span className="inline-block rounded-full bg-amber-100 px-1.5 py-0.5 font-medium">synthetic</span>{" "}
            (1978&ndash;2006) model the pre-subdivision parent tract and the
            first post-plat ownership period &mdash; they do not resolve
            against <code className="font-mono">publicapi.recorder.maricopa.gov</code>.
            The real, OCR-curated chain starts with the 2013 purchase. In
            production, this segment would be reconstructed from the
            1974-forward image depth plus pre-1974 docket/book references.
          </div>
        )}
        <DeedTable deeds={deeds} onOpenDocument={onOpenDocument} />
        {parcel.apn === "304-77-689" && (
          // HOGUE is the counter-example parcel. The 2015 purchase is the
          // only curated deed; without an inline explainer the chain reads
          // "something didn't load" instead of "the county is honest about
          // what it recorded." Paired with the empty-matcher rationale on
          // the Encumbrance view, this surfaces Known Gap #4 inline rather
          // than burying it in docs/.
          <p className="mt-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
            <strong className="font-semibold text-slate-900">
              Sparse by design.
            </strong>{" "}
            HOGUE is the demo&apos;s counter-example parcel. The 2015 purchase
            is the only curated deed &mdash; no post-2015 sale or refinance is
            in the corpus. Title plants paper over gaps like this with
            third-party feeds; a county custodian is honest about what it
            recorded.
          </p>
        )}
      </div>
      </TermSection>

      <p className="text-xs text-gray-400 mt-6 text-right">
        {deeds[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}

interface DeedTableProps {
  deeds: Instrument[];
  onOpenDocument: (instrumentNumber: string) => void;
}

function DeedTable({ deeds, onOpenDocument }: DeedTableProps) {
  const { t } = useTerminology();
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="text-left font-medium px-3 py-2">Date</th>
            <th scope="col" className="text-left font-medium px-3 py-2">Type</th>
            <th scope="col" className="text-left font-medium px-3 py-2">
              <Term professional="Grantor" /> → <Term professional="Grantee" />
            </th>
            <th scope="col" className="text-left font-medium px-3 py-2">Recording #</th>
            <th scope="col" className="text-right font-medium px-3 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {deeds.map((deed) => (
            <DeedRow
              key={deed.instrument_number}
              deed={deed}
              typeLabel={t(TYPE_LABELS[deed.document_type])}
              onOpenDocument={onOpenDocument}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DeedRowProps {
  deed: Instrument;
  typeLabel: string;
  onOpenDocument: (instrumentNumber: string) => void;
}

function DeedRow({ deed, typeLabel, onOpenDocument }: DeedRowProps) {
  const grantors = getGrantors(deed);
  const grantees = getGrantees(deed);
  const grantorText = grantors.length > 0 ? grantors.join("; ") : "—";
  const granteeText = grantees.length > 0 ? grantees.join("; ") : "—";
  const citation = useMemo(
    () => formatCitation(deed, COUNTY_NAME),
    [deed],
  );
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(citation);
  }, [citation]);
  const pdfHref = deed.source_image_path ?? null;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
        {deed.recording_date}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium text-gray-700">
          {typeLabel}
        </span>
        {deed.raw_api_response?.synthesized && (
          <span
            className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-medium"
            title={deed.raw_api_response.synthesized_note ?? "Demo-only synthetic instrument"}
          >
            synthetic
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-800">
        <span className={grantors.length === 0 ? "text-gray-400" : ""}>
          {grantorText}
        </span>
        <span className="mx-1 text-gray-400" aria-hidden="true">→</span>
        <span className={grantees.length === 0 ? "text-gray-400" : ""}>
          {granteeText}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          onClick={() => onOpenDocument(deed.instrument_number)}
          className="font-mono text-xs text-blue-700 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded"
          title="Open source document"
        >
          {deed.instrument_number}
        </button>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy citation for ${deed.instrument_number}`}
            title="Copy citation"
            className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          >
            <CopyIcon />
          </button>
          {pdfHref ? (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open PDF for ${deed.instrument_number} in new tab`}
              title="Open PDF"
              className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              <PdfIcon />
            </a>
          ) : (
            <span
              aria-label="No local PDF available"
              title="No local PDF"
              className="p-1 rounded text-gray-300"
            >
              <PdfIcon />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M9 2v3h3" />
    </svg>
  );
}
