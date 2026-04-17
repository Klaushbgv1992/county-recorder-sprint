import type { ProvenanceKind } from "../types";

export function formatProvenanceTag(
  provenance: ProvenanceKind,
  confidence: number,
): string {
  switch (provenance) {
    case "public_api":
      return "(api)";
    case "manual_entry":
      return "(manual)";
    case "ocr":
      return `(ocr, ${confidence.toFixed(2)})`;
    case "algorithmic":
      return `(algo, ${confidence.toFixed(2)})`;
    case "demo_synthetic":
      return "[demo-only]";
    default: {
      const _exhaustive: never = provenance;
      throw new Error(`Unknown ProvenanceKind: ${_exhaustive as string}`);
    }
  }
}
