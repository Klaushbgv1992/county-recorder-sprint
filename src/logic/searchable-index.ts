import type { Parcel } from "../types";
import type { AssessorParcel } from "./assessor-parcel";
import { assembleAddress } from "./assessor-parcel";

export type RecorderCache = {
  recent_instruments: Array<{
    recording_number: string;
    recording_date: string;
    doc_type: string;
    parties: string[];
  }>;
};

export type Searchable =
  | { tier: "curated"; apn: string; parcel: Parcel }
  | { tier: "recorder_cached"; apn: string; polygon: AssessorParcel; cachedInstruments: string[] }
  | { tier: "assessor_only"; apn: string; polygon: AssessorParcel };

export type MatchType =
  | "instrument"
  | "apn"
  | "address"
  | "owner"
  | "subdivision";

export type SearchHit = { searchable: Searchable; matchType: MatchType };

const INSTRUMENT_RE = /^\d{11}$/;

const MATCH_PRIORITY: Record<MatchType, number> = {
  instrument: 0, apn: 1, address: 2, owner: 3, subdivision: 4,
};

const TIER_PRIORITY: Record<Searchable["tier"], number> = {
  curated: 0, recorder_cached: 1, assessor_only: 2,
};

function normalizeApn(raw: string): string {
  return raw.replace(/-/g, "").trim().toLowerCase();
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s,/]+/).filter((t) => t.length > 0);
}

function ownerMatches(query: string, owner: string | null | undefined): boolean {
  if (!owner) return false;
  const q = tokenize(query);
  if (q.length === 0) return false;
  const o = tokenize(owner);
  return q.every((qt) => o.some((ot) => ot.includes(qt)));
}

export function buildSearchableIndex(
  curated: Parcel[],
  cached: Map<string, RecorderCache>,
  assessor: AssessorParcel[],
): Searchable[] {
  const curatedApns = new Set(curated.map((p) => p.apn));
  const cachedApns = new Set(cached.keys());
  const out: Searchable[] = [];

  for (const p of curated) out.push({ tier: "curated", apn: p.apn, parcel: p });

  for (const a of assessor) {
    const apn = a.APN_DASH;
    if (curatedApns.has(apn)) continue;
    if (cachedApns.has(apn)) {
      const cache = cached.get(apn)!;
      out.push({
        tier: "recorder_cached",
        apn,
        polygon: a,
        cachedInstruments: cache.recent_instruments.map((i) => i.recording_number),
      });
    } else {
      out.push({ tier: "assessor_only", apn, polygon: a });
    }
  }
  return out;
}

function addressOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.address;
  return assembleAddress(s.polygon);
}

function ownerOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.current_owner;
  return s.polygon.OWNER_NAME ?? "";
}

function subdivisionOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.subdivision;
  return s.polygon.SUBNAME ?? "";
}

function instrumentsOf(s: Searchable): string[] {
  if (s.tier === "curated") return s.parcel.instrument_numbers ?? [];
  if (s.tier === "recorder_cached") return s.cachedInstruments;
  return [];
}

export function searchAll(
  query: string,
  searchables: Searchable[],
  opts?: { limit?: number },
): SearchHit[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  if (INSTRUMENT_RE.test(trimmed)) {
    for (const s of searchables) {
      if (instrumentsOf(s).includes(trimmed)) {
        const hits: SearchHit[] = [{ searchable: s, matchType: "instrument" }];
        return opts?.limit ? hits.slice(0, opts.limit) : hits;
      }
    }
    return [];
  }

  const q = trimmed.toLowerCase();
  const qApn = normalizeApn(trimmed);

  const hits: SearchHit[] = [];
  for (const s of searchables) {
    let best: MatchType | null = null;
    const consider = (t: MatchType) => {
      if (best === null || MATCH_PRIORITY[t] < MATCH_PRIORITY[best]) best = t;
    };

    if (normalizeApn(s.apn) === qApn) consider("apn");
    if (addressOf(s).toLowerCase().includes(q)) consider("address");
    if (s.tier !== "assessor_only" && ownerMatches(trimmed, ownerOf(s))) consider("owner");
    if (subdivisionOf(s).toLowerCase().includes(q)) consider("subdivision");

    if (best) hits.push({ searchable: s, matchType: best });
  }

  hits.sort((a, b) => {
    const t = TIER_PRIORITY[a.searchable.tier] - TIER_PRIORITY[b.searchable.tier];
    if (t !== 0) return t;
    const m = MATCH_PRIORITY[a.matchType] - MATCH_PRIORITY[b.matchType];
    if (m !== 0) return m;
    return a.searchable.apn.localeCompare(b.searchable.apn);
  });

  return opts?.limit ? hits.slice(0, opts.limit) : hits;
}
