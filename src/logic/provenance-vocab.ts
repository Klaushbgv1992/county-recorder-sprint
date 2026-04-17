import type { ProvenanceKind } from "../types";
import { formatProvenanceTag } from "./format-provenance-tag";

// Human-readable label for UI badges
export function provenanceLabel(p: ProvenanceKind): string {
  switch (p) {
    case "public_api":
      return "County API";
    case "ocr":
      return "OCR";
    case "manual_entry":
      return "Curator";
    case "algorithmic":
      return "Inferred";
    case "demo_synthetic":
      return "Demo-only";
    default: {
      const _: never = p;
      throw new Error(`Unknown ProvenanceKind: ${_ as string}`);
    }
  }
}

// PDF inline tag — delegates to the formatter (single source for that logic)
export function provenanceInlineTag(p: ProvenanceKind, confidence: number): string {
  return formatProvenanceTag(p, confidence);
}
