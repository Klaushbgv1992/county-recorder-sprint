import { Link } from "react-router";
import { segmentLegalDescription } from "../logic/legal-description-links";

/**
 * Render a legal description with every "Book N Page M" reference
 * turned into a link to the matching plat instrument drawer.
 *
 * Resolves plats via `subdivision-plats.json`. Unresolved citations
 * are rendered as text but annotated — the examiner can see the
 * county's own index made the attempt and didn't find a match, which
 * is itself diagnostic (see docs/hunt-log-known-gap-2.md for the
 * master-plat hunt that exemplifies this category).
 */
export function LegalDescription({
  value,
  parcelApn,
}: {
  value: string;
  parcelApn?: string;
}) {
  const segments = segmentLegalDescription(value);
  return (
    <span className="text-sm text-gray-800 font-mono break-words">
      {segments.map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
        const { citation } = seg;
        if (citation.plat_instrument && parcelApn) {
          return (
            <Link
              key={i}
              to={`/parcel/${parcelApn}/instrument/${citation.plat_instrument}`}
              className="text-blue-700 underline decoration-dotted hover:bg-blue-50 rounded px-0.5"
              title={`Open plat ${citation.plat_instrument} (Book ${citation.book}, Page ${citation.page})`}
              data-testid="legal-desc-citation"
            >
              {citation.raw}
            </Link>
          );
        }
        if (citation.plat_instrument) {
          // No parcel context — still link to the instrument resolver.
          return (
            <Link
              key={i}
              to={`/instrument/${citation.plat_instrument}`}
              className="text-blue-700 underline decoration-dotted hover:bg-blue-50 rounded px-0.5"
              title={`Open plat ${citation.plat_instrument}`}
              data-testid="legal-desc-citation"
            >
              {citation.raw}
            </Link>
          );
        }
        // Unresolved — render as text with a diagnostic title so a
        // hovering examiner sees the county searched the index and
        // found no match for this reference.
        return (
          <span
            key={i}
            title="Book/page cited but not present in the curated plat index — see docs/hunt-log-known-gap-2.md for the class of problem"
            className="underline decoration-dotted decoration-gray-400"
            data-testid="legal-desc-citation-unresolved"
          >
            {citation.raw}
          </span>
        );
      })}
    </span>
  );
}
