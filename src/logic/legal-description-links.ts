/**
 * Extract Book/Page references from a legal description and resolve
 * them to plat instruments in the curated corpus.
 *
 * A legal description like:
 *   "Lot 46, SEVILLE PARCEL 3, according to the plat of record in
 *    the office of the County Recorder of Maricopa County, Arizona,
 *    recorded in Book 554 of Maps, Page 19"
 * contains a Book/Page reference that resolves to plat recording
 * number 20010093192 via `subdivision-plats.json`.
 *
 * The Maricopa public API's book/page bridge is Cloudflare-gated
 * (see Decision #40 / R-005 hunt log). The county's own index knows
 * the mapping — we rebuild it here from the curated subdivision-plats
 * file, turning "Book 554 Page 19" into a clickable link to the plat
 * instrument drawer. Plant products can't do this because they can't
 * reach the bridge.
 */

import subdivisionPlatsJson from "../data/subdivision-plats.json";

interface SubdivisionPlatFeature {
  properties: {
    plat_instrument: string;
    plat_book: string;
    plat_page: string;
  };
}

const featureCollection = subdivisionPlatsJson as {
  features: SubdivisionPlatFeature[];
};

/**
 * Parse ranges like:
 *   Book 554 of Maps, Page 19
 *   Book 554 Maps Page 19
 *   Book 554, Page 19
 *   Book 554 Page 19
 *
 * Returns every match in source order — a legal description may cite
 * both the final plat AND a parent plat.
 */
export interface BookPageCitation {
  /** 0-based character index of the match start in the input string. */
  start: number;
  /** 0-based character index immediately after the match. */
  end: number;
  /** Raw matched substring (for rendering). */
  raw: string;
  book: string;
  page: string;
  /** Resolved plat recording number, or null if not in the corpus. */
  plat_instrument: string | null;
}

const BOOK_PAGE_PATTERN =
  /\bBook\s+(\d{1,5})(?:\s+of\s+Maps|\s+Maps)?\s*[,;]?\s*Page\s+(\d{1,5})\b/gi;

export function extractBookPageCitations(
  legalDescription: string,
): BookPageCitation[] {
  if (!legalDescription) return [];
  const platIndex: Record<string, string> = {};
  for (const f of featureCollection.features) {
    const key = `${f.properties.plat_book}|${f.properties.plat_page}`;
    platIndex[key] = f.properties.plat_instrument;
  }

  const out: BookPageCitation[] = [];
  const re = new RegExp(BOOK_PAGE_PATTERN.source, BOOK_PAGE_PATTERN.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(legalDescription)) !== null) {
    const [raw, book, page] = m;
    const key = `${book}|${page}`;
    out.push({
      start: m.index,
      end: m.index + raw.length,
      raw,
      book,
      page,
      plat_instrument: platIndex[key] ?? null,
    });
  }
  return out;
}

/**
 * Break a legal description into alternating plain-text spans and
 * citation spans, preserving source order. Useful for rendering a
 * React fragment with inline <Link> elements.
 */
export type LegalDescriptionSegment =
  | { kind: "text"; text: string }
  | { kind: "citation"; citation: BookPageCitation };

export function segmentLegalDescription(
  legalDescription: string,
): LegalDescriptionSegment[] {
  if (!legalDescription) return [];
  const citations = extractBookPageCitations(legalDescription);
  if (citations.length === 0) {
    return [{ kind: "text", text: legalDescription }];
  }
  const segments: LegalDescriptionSegment[] = [];
  let cursor = 0;
  for (const c of citations) {
    if (c.start > cursor) {
      segments.push({ kind: "text", text: legalDescription.slice(cursor, c.start) });
    }
    segments.push({ kind: "citation", citation: c });
    cursor = c.end;
  }
  if (cursor < legalDescription.length) {
    segments.push({ kind: "text", text: legalDescription.slice(cursor) });
  }
  return segments;
}
