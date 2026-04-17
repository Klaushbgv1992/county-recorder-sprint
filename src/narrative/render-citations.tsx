import type { ReactNode } from "react";

/**
 * Tokenizes `[11-digit]` citations in `text` into clickable buttons iff
 * the number is in `knownInstruments`. Otherwise renders literal text.
 * Extracted from AiSummaryPanel.tsx for shared use across the AI summary
 * (static) and anomaly-prose render paths.
 */
export function renderWithCitations(
  text: string,
  knownInstruments: Set<string>,
  onOpenDocument: (n: string) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[(\d{11})\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    const instNum = match[1];
    if (knownInstruments.has(instNum)) {
      nodes.push(
        <button
          key={`cite-${key++}`}
          onClick={() => onOpenDocument(instNum)}
          className="font-mono text-xs bg-moat-50 hover:bg-moat-100 border border-moat-200 text-moat-800 px-1.5 py-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          title="Open source document"
        >
          {instNum}
        </button>,
      );
    } else {
      nodes.push(`[${instNum}]`);
    }
    lastIdx = pattern.lastIndex;
  }
  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
  return nodes;
}
