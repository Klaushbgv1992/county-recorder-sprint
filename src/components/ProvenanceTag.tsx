import type { ProvenanceKind } from "../types";
import { provenanceLabel } from "../logic/provenance-vocab";

const PROVENANCE_COLORS: Record<ProvenanceKind, string> = {
  public_api: "bg-gray-100 text-gray-700",
  ocr: "bg-purple-100 text-purple-700",
  manual_entry: "bg-orange-100 text-orange-700",
  algorithmic: "bg-indigo-100 text-indigo-700",
  demo_synthetic: "bg-yellow-100 text-yellow-700",
};

interface Props {
  provenance: ProvenanceKind;
  confidence: number;
}

export function ProvenanceTag({ provenance, confidence }: Props) {
  const pct = Math.round(confidence * 100);
  const label = provenanceLabel(provenance);
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${PROVENANCE_COLORS[provenance]}`}
      title={`Source: ${label}, Confidence: ${pct}%`}
    >
      {label} {pct}%
    </span>
  );
}
