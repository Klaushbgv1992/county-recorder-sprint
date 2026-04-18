import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Instrument,
  DocumentLink,
  Parcel,
  EncumbranceLifecycle,
  PipelineStatus,
  ProvenanceKind,
} from "../types";
import { formatCitation } from "../logic/citation-formatter";
import { getGrantors, getGrantees, getTrustors, getLenders, getReleasingParties } from "../logic/party-roles";
import { ProvenanceTag } from "./ProvenanceTag";
import { getExtractionTrace } from "../logic/extraction-trace";
import { AiExtractionPanel } from "./AiExtractionPanel";
import { ExportCommitmentButton } from "./ExportCommitmentButton";
import { FlagInstrumentButton } from "./account/FlagInstrumentButton";
import { LegalDescription } from "./LegalDescription";
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
  // True when the enclosing page already renders an Export Commitment
  // button (encumbrance route). Avoids the side-by-side duplicate where
  // the page header and drawer header both carry the same action.
  hideExportButton?: boolean;
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
  hideExportButton = false,
}: Props) {
  const [showCorpusTotals, setShowCorpusTotals] = useState(false);
  const [showAiExtraction, setShowAiExtraction] = useState(false);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(
    null,
  );
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const citation = formatCitation(instrument, COUNTY_NAME);
  const extractionTrace = getExtractionTrace(instrument.instrument_number);

  const handleCopyCitation = useCallback(() => {
    navigator.clipboard.writeText(citation);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopied(true);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1600);
  }, [citation]);

  const handleFieldClick = useCallback((fieldId: string) => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setHighlightedFieldId(fieldId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedFieldId(null);
      highlightTimerRef.current = null;
    }, 700);
  }, []);

  // Reset highlight when the instrument changes so stale pulses don't leak
  // across drawers.
  useEffect(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedFieldId(null);
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, [instrument.instrument_number]);

  // Image pulses whenever *any* field is highlighted.
  const imagePulsing = highlightedFieldId !== null;

  const grantors = getGrantors(instrument);
  const grantees = getGrantees(instrument);
  const trustors = getTrustors(instrument);
  const lenders = getLenders(instrument);
  const releasingParties = getReleasingParties(instrument);

  const ps = instrument.provenance_summary;

  // Build an ordered list of primary fields so we can stagger their reveal
  // *and* assign each a click handler with a stable ID. Tagged fields (legal
  // description, extracted_fields entries) carry provenance rendered inline.
  type PrimaryField = {
    id: string;
    label: React.ReactNode;
    value: string;
    /** Optional rich renderer; falls back to plain text(value) when absent. */
    valueNode?: React.ReactNode;
    provenance?: ProvenanceKind;
    confidence?: number;
    mono?: boolean;
  };
  const primaryFields: PrimaryField[] = [];
  if (grantors.length > 0) {
    primaryFields.push({
      id: "grantor",
      label: <Term professional="Grantor" />,
      value: grantors.join("; "),
    });
  }
  if (grantees.length > 0) {
    primaryFields.push({
      id: "grantee",
      label: <Term professional="Grantee" />,
      value: grantees.join("; "),
    });
  }
  if (trustors.length > 0) {
    primaryFields.push({
      id: "trustor",
      label: <Term professional="Trustor/Borrower" />,
      value: trustors.join("; "),
    });
  }
  if (lenders.length > 0) {
    primaryFields.push({
      id: "lender",
      label: "Lender",
      value: lenders.join("; "),
    });
  }
  if (releasingParties.length > 0) {
    primaryFields.push({
      id: "releasing-party",
      label: "Releasing Party",
      value: releasingParties.join("; "),
    });
  }
  primaryFields.push({
    id: "recording-date",
    label: "Recording Date",
    value: instrument.recording_date,
  });
  if (instrument.legal_description) {
    primaryFields.push({
      id: "legal-description",
      label: "Legal Description",
      value: instrument.legal_description.value,
      valueNode: (
        <LegalDescription
          value={instrument.legal_description.value}
          parcelApn={parcel.apn}
        />
      ),
      provenance: instrument.legal_description.provenance,
      confidence: instrument.legal_description.confidence,
      mono: true,
    });
  }
  if (instrument.back_references.length > 0) {
    primaryFields.push({
      id: "back-references",
      label: "Back References",
      value: instrument.back_references.join(", "),
    });
  }

  const extractedEntries = Object.entries(instrument.extracted_fields);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl ring-1 ring-slate-200 shadow-lg overflow-hidden relative">
      {/* Leading moat accent stripe — reinforces "county-authoritative panel". */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-moat-400 to-moat-600"
      />
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800 font-mono">
                {instrument.instrument_number}
              </h3>
              {instrument.raw_api_response?.synthesized && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                  title={instrument.raw_api_response.synthesized_note ?? "Demo-only synthetic instrument"}
                >
                  synthetic · demo-only
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Recorded {instrument.recording_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!hideExportButton && (
              <ExportCommitmentButton
                parcel={parcel}
                instruments={allInstruments}
                links={allLinks}
                lifecycles={lifecycles}
                pipelineStatus={pipelineStatus}
                viewedInstrumentNumber={instrument.instrument_number}
              />
            )}
            <button
              onClick={handleCopyCitation}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${
                copied
                  ? "bg-moat-100 text-moat-900 ring-1 ring-moat-300"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="Copy formatted citation to clipboard"
              aria-live="polite"
            >
              {copied ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    className="animate-checkmark-draw"
                    strokeDasharray="24"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
              )}
              {copied ? "Copied" : "Copy Citation"}
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="px-2 py-1.5 text-slate-400 hover:text-slate-700 text-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded"
            >
              &times;
            </button>
            <FlagInstrumentButton
              instrumentNumber={instrument.instrument_number}
              parcelApn={parcel.apn}
            />
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
          <div
            key={`img-${instrument.instrument_number}`}
            className={`w-1/2 border-r border-gray-200 overflow-auto bg-gray-100 p-4 animate-fade-in${
              imagePulsing ? " animate-pulse-once rounded" : ""
            }`}
          >
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

            <div
              key={`primary-${instrument.instrument_number}`}
              className="space-y-3 mb-6"
            >
              {primaryFields.map((field, i) => (
                <FieldCard
                  key={field.id}
                  fieldId={field.id}
                  index={i}
                  label={field.label}
                  value={field.value}
                  valueNode={field.valueNode}
                  provenance={field.provenance}
                  confidence={field.confidence}
                  mono={field.mono}
                  highlighted={highlightedFieldId === field.id}
                  onClick={handleFieldClick}
                />
              ))}
            </div>

            {/* Dynamic extracted fields */}
            {extractedEntries.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Additional Fields
                </h4>
                <div
                  key={`extra-${instrument.instrument_number}`}
                  className="space-y-3 mb-6"
                >
                  {extractedEntries.map(([key, field], i) => {
                    const fieldId = `extracted-${key}`;
                    return (
                      <FieldCard
                        key={fieldId}
                        fieldId={fieldId}
                        index={primaryFields.length + i}
                        label={key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                        value={field.value}
                        provenance={field.provenance}
                        confidence={field.confidence}
                        highlighted={highlightedFieldId === fieldId}
                        onClick={handleFieldClick}
                      />
                    );
                  })}
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

interface FieldCardProps {
  fieldId: string;
  index: number;
  label: React.ReactNode;
  value: string;
  /** Optional rich renderer; falls back to plain `value` text when absent. */
  valueNode?: React.ReactNode;
  provenance?: ProvenanceKind;
  confidence?: number;
  mono?: boolean;
  highlighted: boolean;
  onClick: (fieldId: string) => void;
}

function FieldCard({
  fieldId,
  index,
  label,
  value,
  valueNode,
  provenance,
  confidence,
  mono,
  highlighted,
  onClick,
}: FieldCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(fieldId);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(fieldId)}
      onKeyDown={handleKeyDown}
      style={{ animationDelay: `${index * 60}ms` }}
      className={`animate-fade-in-up rounded -mx-1 px-1 py-0.5 cursor-pointer transition-colors duration-150 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500${
        highlighted ? " animate-pulse-once" : ""
      }`}
    >
      {provenance !== undefined ? (
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-gray-500">{label}</span>
          <ProvenanceTag
            provenance={provenance}
            confidence={confidence ?? 1}
          />
        </div>
      ) : (
        <span className="text-xs font-medium text-gray-500">{label}</span>
      )}
      <div
        className={`text-sm text-gray-800${mono ? " font-mono" : ""}`}
      >
        {valueNode ?? value}
      </div>
    </div>
  );
}
