import type { Parcel } from "../types";

export type MatchType =
  | "instrument"
  | "apn"
  | "address"
  | "owner"
  | "subdivision";

export interface SearchResult {
  parcel: Parcel;
  matchType: MatchType;
  /**
   * Set only when matchType === "instrument". Lets the UI route to the
   * Proof Drawer for this specific instrument number on the parcel.
   */
  instrumentNumber?: string;
}

const MATCH_PRIORITY: Record<MatchType, number> = {
  instrument: 0,
  apn: 1,
  address: 2,
  owner: 3,
  subdivision: 4,
};

const INSTRUMENT_RE = /^\d{11}$/;

function normalizeApn(raw: string): string {
  return raw.replace(/-/g, "").trim().toLowerCase();
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s,/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Owner match rule (per plan):
 *   Tokenize both query and parcel.current_owner, lowercase, and require
 *   every query token to appear as a substring of at least one owner token.
 *   Example: "chris pop" → matches "POPHAM CHRISTOPHER / ASHLEY".
 */
function ownerMatches(query: string, owner: string): boolean {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return false;
  const oTokens = tokenize(owner);
  if (oTokens.length === 0) return false;
  return qTokens.every((qt) => oTokens.some((ot) => ot.includes(qt)));
}

/**
 * Run a single-input search across the supplied parcel set.
 *
 * Priority order (highest first):
 *   1. 11-digit instrument number → the parcel that owns that instrument
 *   2. APN exact match (dashes stripped from both sides)
 *   3. Address case-insensitive substring
 *   4. Owner multi-token substring (see ownerMatches)
 *   5. Subdivision case-insensitive substring
 *
 * Empty query returns all parcels (no match type). Non-empty query returns
 * only parcels that matched; each parcel at most once, labeled with its
 * highest-priority match type.
 */
export function searchParcels(
  query: string,
  parcels: Parcel[],
): SearchResult[] {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    // Empty query shows the full list. Use "address" tier so nothing
    // ranks specially; callers only inspect matchType when a query exists.
    return parcels.map((p) => ({ parcel: p, matchType: "address" }));
  }

  // Instrument-number search has its own result shape: one result per
  // matching instrument (routed to its parcel). Falls through to other
  // match types only if the pattern doesn't match.
  if (INSTRUMENT_RE.test(trimmed)) {
    const owningParcel = parcels.find((p) =>
      (p.instrument_numbers ?? []).includes(trimmed),
    );
    if (owningParcel) {
      return [
        {
          parcel: owningParcel,
          matchType: "instrument",
          instrumentNumber: trimmed,
        },
      ];
    }
    // 11-digit that doesn't resolve → no results (don't fall through to
    // APN/address; an 11-digit string can't plausibly be any of those).
    return [];
  }

  const normalizedQueryApn = normalizeApn(trimmed);
  const lowerQuery = trimmed.toLowerCase();

  const results: SearchResult[] = [];
  for (const parcel of parcels) {
    let best: MatchType | null = null;
    const consider = (t: MatchType) => {
      if (best === null || MATCH_PRIORITY[t] < MATCH_PRIORITY[best]) {
        best = t;
      }
    };

    if (normalizeApn(parcel.apn) === normalizedQueryApn) {
      consider("apn");
    }
    if (parcel.address.toLowerCase().includes(lowerQuery)) {
      consider("address");
    }
    if (ownerMatches(trimmed, parcel.current_owner)) {
      consider("owner");
    }
    if (parcel.subdivision.toLowerCase().includes(lowerQuery)) {
      consider("subdivision");
    }

    if (best !== null) {
      results.push({ parcel, matchType: best });
    }
  }

  // Stable sort by priority; parcels[] order preserved within a tier.
  results.sort(
    (a, b) => MATCH_PRIORITY[a.matchType] - MATCH_PRIORITY[b.matchType],
  );
  return results;
}
