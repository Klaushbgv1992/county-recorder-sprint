import { useCallback } from "react";
import type { Instrument, DocumentLink } from "../types";
import { formatCitation } from "../logic/citation-formatter";
import { getGrantors, getGrantees, getTrustors, getLenders, getReleasingParties } from "../logic/party-roles";
import { ProvenanceTag } from "./ProvenanceTag";

const COUNTY_NAME = "Maricopa County, AZ";

interface Props {
  instrument: Instrument;
  links: DocumentLink[];
  onClose: () => void;
}

export function ProofDrawer({ instrument, links, onClose }: Props) {
  const citation = formatCitation(instrument, COUNTY_NAME);

  const handleCopyCitation = useCallback(() => {
    navigator.clipboard.writeText(citation);
  }, [citation]);

  const grantors = getGrantors(instrument);
  const grantees = getGrantees(instrument);
  const trustors = getTrustors(instrument);
  const lenders = getLenders(instrument);
  const releasingParties = getReleasingParties(instrument);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[800px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-800">
              {instrument.instrument_number}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Recorded {instrument.recording_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCitation}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              title="Copy formatted citation to clipboard"
            >
              Copy Citation
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content: two-column */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Document Image */}
          <div className="w-1/2 border-r border-gray-200 overflow-auto bg-gray-100 p-4">
            {instrument.source_image_path.endsWith(".pdf") ? (
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
            )}
          </div>

          {/* Right: Extracted Fields */}
          <div className="w-1/2 overflow-auto p-6">
            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Extracted Fields
            </h4>

            <div className="space-y-3 mb-6">
              {grantors.length > 0 && (
                <FieldDisplay label="Grantor" value={grantors.join("; ")} />
              )}
              {grantees.length > 0 && (
                <FieldDisplay label="Grantee" value={grantees.join("; ")} />
              )}
              {trustors.length > 0 && (
                <FieldDisplay label="Trustor/Borrower" value={trustors.join("; ")} />
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

            {/* Provenance summary */}
            {instrument.provenance_summary && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 mb-2">
                  Field Provenance Breakdown
                </h4>
                <div className="flex gap-4 text-xs text-gray-600">
                  <span>
                    County API: {instrument.provenance_summary.public_api_count}
                  </span>
                  <span>OCR: {instrument.provenance_summary.ocr_count}</span>
                  <span>
                    Hand-Curated: {instrument.provenance_summary.manual_entry_count}
                  </span>
                </div>
              </div>
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
    </>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="text-sm text-gray-800">{value}</div>
    </div>
  );
}
