import { useCallback, useState } from "react";
import type {
  Instrument,
  DocumentLink,
  Parcel,
  EncumbranceLifecycle,
  PipelineStatus,
} from "../types";
import { formatCitation } from "../logic/citation-formatter";
import { getGrantors, getGrantees, getTrustors, getLenders, getReleasingParties } from "../logic/party-roles";
import { ProvenanceTag } from "./ProvenanceTag";
import { getExtractionTrace } from "../logic/extraction-trace";
import { AiExtractionPanel } from "./AiExtractionPanel";
import { ExportCommitmentButton } from "./ExportCommitmentButton";
import { Term, TermSection } from "../terminology/Term";

const COUNTY_NAME = "Maricopa County, AZ";

function instrumentHasSyntheticField(instrument: Instrument): boolean {
  if (instrument.legal_description?.provenance === "demo_synthetic") return true;
  for (const p of instrument.parties) {
    if (p.provenance === "demo_synthetic") return true;
  }
  for (const f of Object.values(instrument.extracted_fields)) {
    if (f.provenance === "demo_synthetic") return true;
  }
  return false;
}

export interface CorpusProvenance {
  public_api: number;
  ocr: number;
  manual_entry: number;
}

interface Props {
  instrument: Instrument;
  links: DocumentLink[];
  corpusProvenance: CorpusProvenance;
  onClose: () => void;
  parcel: Parcel;
  allInstruments: Instrument[];
  allLinks: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
}

export function ProofDrawer({
  instrument,
  links,
  corpusProvenance,
  onClose,
  parcel,
  allInstruments,
  allLinks,
  lifecycles,
  pipelineStatus,
}: Props) {
  const [showCorpusTotals, setShowCorpusTotals] = useState(false);
  const [showAiExtraction, setShowAiExtraction] = useState(false);
  const citation = formatCitation(instrument, COUNTY_NAME);
  const extractionTrace = getExtractionTrace(instrument.instrument_number);

  const handleCopyCitation = useCallback(() => {
    navigator.clipboard.writeText(citation);
  }, [citation]);

  const grantors = getGrantors(instrument);
  const grantees = getGrantees(instrument);
  const trustors = getTrustors(instrument);
  const lenders = getLenders(instrument);
  const releasingParties = getReleasingParties(instrument);

  const ps = instrument.provenance_summary;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 font-mono">
              {instrument.instrument_number}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Recorded {instrument.recording_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportCommitmentButton
              parcel={parcel}
              instruments={allInstruments}
              links={allLinks}
              lifecycles={lifecycles}
              pipelineStatus={pipelineStatus}
              viewedInstrumentNumber={instrument.instrument_number}
            />
            <button
              onClick={handleCopyCitation}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              title="Copy formatted citation to clipboard"
            >
              Copy Citation
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              &times;
            </button>
          </div>
        </div>
        {/* Provenance summary line */}
        {ps && (
          <div className="mt-2 text-xs text-gray-600 flex items-center gap-1 flex-wrap">
            <span>This record:</span>
            <span className="font-medium text-gray-700">
              {ps.public_api_count} field{ps.public_api_count === 1 ? "" : "s"} from County API
            </span>
            <span className="text-gray-400">&middot;</span>
            <span className="font-medium text-gray-700">
              {ps.ocr_count} field{ps.ocr_count === 1 ? "" : "s"} OCR&rsquo;d from document
            </span>
            <span className="text-gray-400">&middot;</span>
            <span className="font-medium text-gray-700">
              {ps.manual_entry_count} field{ps.manual_entry_count === 1 ? "" : "s"} hand-curated
            </span>
            <button
              onClick={() => setShowCorpusTotals((v) => !v)}
              className="ml-1 w-4 h-4 rounded-full border border-gray-400 text-gray-500 text-[10px] leading-none flex items-center justify-center hover:bg-gray-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              title="Show corpus-wide totals"
              aria-label="Show corpus-wide totals"
            >
              i
            </button>
            {showCorpusTotals && (
              <span className="w-full mt-1 text-[11px] text-gray-500 italic">
                Across the full corpus: {corpusProvenance.public_api} /{" "}
                {corpusProvenance.ocr} / {corpusProvenance.manual_entry}
                {" "}(County API / OCR / hand-curated)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content: two-column */}
      <div className="flex-1 overflow-hidden flex">
          {/* Left: Document Image */}
          <div className="w-1/2 border-r border-gray-200 overflow-auto bg-gray-100 p-4">
            {instrument.source_image_path ? (
              instrument.source_image_path.endsWith(".pdf") ? (
                <iframe
                  src={instrument.source_image_path}
                  className="w-full h-full min-h-[600px] bg-white"
                  title={`Document ${instrument.instrument_number}`}
                />
              ) : (
                <img
                  src={instrument.source_image_path}
                  alt={`Document ${instrument.instrument_number}`}
                  className="w-full shadow-md bg-white"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    img.insertAdjacentHTML(
                    "afterend",
                    '<div class="text-center text-gray-400 py-12">Image not available</div>',
                  );
                }}
              />
            )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <p className="text-sm">Image not available</p>
                  <p className="text-xs mt-2">
                    Cached from public API — no local document
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Extracted Fields */}
          <div className="w-1/2 overflow-auto p-6">
            {instrumentHasSyntheticField(instrument) && (
              <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <strong>Demo-only synthesized record.</strong> Not a real recorded instrument.
                See <code>source_note</code> field for the R-006 sub-hunt that failed to locate a real instance.
              </div>
            )}
            <TermSection id="proof-extracted-fields">
            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Extracted Fields
            </h4>

            <div className="space-y-3 mb-6">
              {grantors.length > 0 && (
                <FieldDisplay label={<Term professional="Grantor" />} value={grantors.join("; ")} />
              )}
              {grantees.length > 0 && (
                <FieldDisplay label={<Term professional="Grantee" />} value={grantees.join("; ")} />
              )}
              {trustors.length > 0 && (
                <FieldDisplay label={<Term professional="Trustor/Borrower" />} value={trustors.join("; ")} />
              )}
              {lenders.length > 0 && (
                <FieldDisplay label="Lender" value={lenders.join("; ")} />
              )}
              {releasingParties.length > 0 && (
                <FieldDisplay label="Releasing Party" value={releasingParties.join("; ")} />
              )}
              <FieldDisplay
                label="Recording Date"
                value={instrument.recording_date}
              />
              {instrument.legal_description && (
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-500">
                      Legal Description
                    </span>
                    <ProvenanceTag
                      provenance={instrument.legal_description.provenance}
                      confidence={instrument.legal_description.confidence}
                    />
                  </div>
                  <span className="text-sm text-gray-800 font-mono">
                    {instrument.legal_description.value}
                  </span>
                </div>
              )}
              {instrument.back_references.length > 0 && (
                <FieldDisplay
                  label="Back References"
                  value={instrument.back_references.join(", ")}
                />
              )}
            </div>

            {/* Dynamic extracted fields */}
            {Object.keys(instrument.extracted_fields).length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Additional Fields
                </h4>
                <div className="space-y-3 mb-6">
                  {Object.entries(instrument.extracted_fields).map(
                    ([key, field]) => (
                      <div key={key}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-500">
                            {key
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          <ProvenanceTag
                            provenance={field.provenance}
                            confidence={field.confidence}
                          />
                        </div>
                        <span className="text-sm text-gray-800">
                          {field.value}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}

            </TermSection>

            {/* AI Extraction replay section — shown only when a real OCR trace exists */}
            {extractionTrace && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowAiExtraction((v) => !v)}
                  className="flex w-full items-center justify-between rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-left hover:bg-indigo-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
                  aria-expanded={showAiExtraction}
                >
                  <span className="text-sm font-semibold text-indigo-900">
                    AI Extraction ({trackSummary(extractionTrace)})
                  </span>
                  <span className="text-xs text-indigo-700">
                    {showAiExtraction ? "Hide" : "Show"}
                  </span>
                </button>
                {showAiExtraction && (
                  <div className="mt-3">
                    <AiExtractionPanel trace={extractionTrace} />
                  </div>
                )}
              </div>
            )}

            {/* MERS note */}
            {instrument.mers_note && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-6">
                <span className="text-xs font-medium text-amber-800">
                  MERS Note:
                </span>
                <p className="text-xs text-amber-700 mt-1">
                  {instrument.mers_note}
                </p>
              </div>
            )}

            {/* Related links */}
            {links.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Related Instruments
                </h4>
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="text-sm text-gray-600 flex items-center gap-2"
                    >
                      <span className="font-mono text-blue-700">
                        {link.source_instrument === instrument.instrument_number
                          ? link.target_instrument
                          : link.source_instrument}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({link.link_type.replace(/_/g, " ")})
                      </span>
                      <ProvenanceTag
                        provenance={link.provenance}
                        confidence={link.confidence}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Corpus boundary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                {instrument.corpus_boundary_note}
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}

function trackSummary(trace: {
  extractions: { value: string | null }[];
  ocr_version: string;
}): string {
  const recovered = trace.extractions.filter((e) => e.value).length;
  const total = trace.extractions.length;
  const ver = trace.ocr_version.replace(/^tesseract\s+/i, "v");
  return `${recovered}/${total} fields \u00b7 ${ver}`;
}

function FieldDisplay({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="text-sm text-gray-800">{value}</div>
    </div>
  );
}
