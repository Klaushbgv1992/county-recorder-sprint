/**
 * extraction-trace.ts — Client-side loader for OCR extraction traces.
 *
 * A trace is the *replay tape* of a real OCR + post-processing run that was
 * performed offline by `scripts/run-extraction.py`. The UI reads these traces
 * at demo time so that the "AI Extraction" panel shows real extracted values
 * without any live OCR dependency.
 *
 * Traces are colocated under `src/data/extraction-traces/` and are imported
 * at build time via Vite (same pattern as `data-loader.ts` does for
 * instruments). Instruments without a trace simply return `null` — the UI
 * renders a neutral "trace not available" message in that case.
 */

import trace20130183449 from "../data/extraction-traces/20130183449.trace.json";
import trace20150516729 from "../data/extraction-traces/20150516729.trace.json";

export interface ExtractionTracePage {
  page: number;
  raw_text: string;
  word_count: number;
}

export interface ExtractionTraceField {
  field: string;
  value: string | null;
  confidence: number;
  provenance: string;
  source_page: number | null;
  source_snippet: string | null;
  extraction_method: string;
  note?: string | null;
}

export interface ExtractionTrace {
  instrument_number: string;
  source_pdf: string;
  ocr_engine: string;
  ocr_version: string;
  extracted_at: string;
  pages: ExtractionTracePage[];
  extractions: ExtractionTraceField[];
  notes: string;
}

// Build-time registry. Vite inlines the JSON at build.
const TRACES: Record<string, ExtractionTrace> = {
  [trace20130183449.instrument_number]: trace20130183449 as ExtractionTrace,
  [trace20150516729.instrument_number]: trace20150516729 as ExtractionTrace,
};

/**
 * Return the extraction trace for an instrument, or null if none was generated.
 * Callers must handle the null case gracefully (e.g. hide the panel).
 */
export function getExtractionTrace(
  instrumentNumber: string,
): ExtractionTrace | null {
  return TRACES[instrumentNumber] ?? null;
}

/**
 * True if any trace is registered for this instrument.
 */
export function hasExtractionTrace(instrumentNumber: string): boolean {
  return instrumentNumber in TRACES;
}

/**
 * Total word count across all OCR'd pages — useful as a "this was a real
 * OCR run, not a fixture" sanity indicator in the UI.
 */
export function totalOcrWordCount(trace: ExtractionTrace): number {
  return trace.pages.reduce((sum, p) => sum + p.word_count, 0);
}
