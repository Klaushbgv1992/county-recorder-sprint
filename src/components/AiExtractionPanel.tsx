import { useState } from "react";
import type { ExtractionTrace, ExtractionTraceField } from "../logic/extraction-trace";
import { totalOcrWordCount } from "../logic/extraction-trace";

interface Props {
  trace: ExtractionTrace;
}

/**
 * AiExtractionPanel — replay-tape view of a real OCR extraction run.
 *
 * Every value rendered here came from the trace JSON on disk, which itself
 * was written by `scripts/run-extraction.py` running Tesseract against the
 * source PDF. No values are fabricated — missing fields are shown as
 * "not recovered" with the OCR-side diagnostic note.
 */
export function AiExtractionPanel({ trace }: Props) {
  const [expandedSnippet, setExpandedSnippet] = useState<string | null>(null);
  const totalWords = totalOcrWordCount(trace);
  const pageCount = trace.pages.length;
  const recovered = trace.extractions.filter((e) => e.value).length;
  const total = trace.extractions.length;

  return (
    <div className="space-y-4">
      {/* Replay banner — proves it's real OCR output, not a fixture */}
      <div className="rounded border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">AI Extraction Replay</div>
          <div className="font-mono text-[10px] text-indigo-700">
            {trace.ocr_engine} / {trace.ocr_version.replace(/^tesseract\s+/i, "v")}
          </div>
        </div>
        <p className="mt-1 text-indigo-800">
          Tesseract OCR was run against the source PDF offline; this panel
          replays the recorded trace. {recovered}/{total} target fields
          recovered from {totalWords} OCR'd words across {pageCount} page
          {pageCount === 1 ? "" : "s"}.
        </p>
        <p className="mt-1 text-[11px] text-indigo-700">
          Extracted at {trace.extracted_at} from{" "}
          <span className="font-mono">{trace.source_pdf}</span>
        </p>
      </div>

      {/* Per-field results */}
      <div className="space-y-3">
        {trace.extractions.map((field) => (
          <FieldCard
            key={field.field}
            field={field}
            expanded={expandedSnippet === field.field}
            onToggle={() =>
              setExpandedSnippet((v) => (v === field.field ? null : field.field))
            }
          />
        ))}
      </div>

      {/* Trace-level notes */}
      {trace.notes && trace.notes !== "All target fields recovered." && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-semibold">Trace notes: </span>
          {trace.notes}
        </div>
      )}
    </div>
  );
}

function FieldCard({
  field,
  expanded,
  onToggle,
}: {
  field: ExtractionTraceField;
  expanded: boolean;
  onToggle: () => void;
}) {
  const humanLabel = field.field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const recovered = field.value !== null && field.value !== "";

  return (
    <div
      className={`rounded border p-3 text-sm ${
        recovered
          ? "border-gray-200 bg-white"
          : "border-dashed border-gray-300 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {humanLabel}
        </span>
        <ConfidenceBadge value={field.confidence} recovered={recovered} />
      </div>
      <div className="mt-1">
        {recovered ? (
          <div className="font-mono text-sm text-gray-900 break-words">
            {field.value}
          </div>
        ) : (
          <div className="text-sm italic text-gray-500">not recovered</div>
        )}
      </div>
      <div className="mt-2 text-[11px] text-gray-500">
        <span className="font-medium">method:</span> {field.extraction_method}
        {field.source_page !== null && (
          <>
            {" "}
            &middot; <span className="font-medium">page:</span> {field.source_page}
          </>
        )}
      </div>
      {field.note && (
        <div className="mt-1 text-[11px] italic text-amber-700">{field.note}</div>
      )}
      {field.source_snippet && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onToggle}
            className="text-[11px] text-blue-700 underline hover:text-blue-900"
          >
            {expanded ? "Hide source snippet" : "View source snippet"}
          </button>
          {expanded && (
            <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-gray-100 p-2 font-mono text-[11px] text-gray-800">
              {field.source_snippet}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ value, recovered }: { value: number; recovered: boolean }) {
  if (!recovered) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
        n/a
      </span>
    );
  }
  const pct = Math.round(value * 100);
  let cls = "bg-red-100 text-red-800";
  if (value >= 0.85) cls = "bg-emerald-100 text-emerald-800";
  else if (value >= 0.7) cls = "bg-lime-100 text-lime-800";
  else if (value >= 0.5) cls = "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {pct}% conf
    </span>
  );
}
