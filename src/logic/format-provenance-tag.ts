import type { ProvenanceKind } from "../types";

export function formatProvenanceTag(
  provenance: ProvenanceKind,
  confidence: number,
): string {
  if (provenance === "public_api") return "(api)";
  if (provenance === "manual_entry") return "(manual)";
  const label = provenance === "ocr" ? "ocr" : "algo";
  return `(${label}, ${confidence.toFixed(2)})`;
}
