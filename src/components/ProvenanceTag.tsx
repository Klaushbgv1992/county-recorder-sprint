import type { ProvenanceKind } from "../types";

const PROVENANCE_LABELS: Record<ProvenanceKind, string> = {
  public_api: "County API",
  ocr: "OCR",
  manual_entry: "Hand-Curated",
  algorithmic: "Matcher",
};

const PROVENANCE_COLORS: Record<ProvenanceKind, string> = {
  public_api: "bg-gray-100 text-gray-700",
  ocr: "bg-purple-100 text-purple-700",
  manual_entry: "bg-orange-100 text-orange-700",
  algorithmic: "bg-indigo-100 text-indigo-700",
};

interface Props {
  provenance: ProvenanceKind;
  confidence: number;
}

export function ProvenanceTag({ provenance, confidence }: Props) {
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${PROVENANCE_COLORS[provenance]}`}
      title={`Source: ${PROVENANCE_LABELS[provenance]}, Confidence: ${pct}%`}
    >
      {PROVENANCE_LABELS[provenance]} {pct}%
    </span>
  );
}
