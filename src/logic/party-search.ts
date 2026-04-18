import type { Instrument, Parcel, Party, PartyRole } from "../types";

/**
 * Cross-parcel party-name index over the curated corpus.
 *
 * Why this exists: title examiners search by party name (grantor/grantee/
 * trustor/lender/releasing party/etc.), not just by current owner. The
 * Maricopa public API returns flat names[] without roles (Decision #19);
 * the curated corpus carries roles via Party.role on each instrument.
 * This module is the moat — only possible because a custodian curated roles.
 *
 * Scope: in-memory linear scan over ~50 instruments. No external index.
 */

export type PartyInstrumentRef = {
  apn: string;
  instrumentNumber: string;
  role: PartyRole;
  recordingDate: string;
  documentType: string;
  /** When role === "nominee", the party this entity acts on behalf of. */
  nomineeFor?: { partyName: string; partyRole: PartyRole };
};

export type PartyHit = {
  /** Canonical, human-readable name (longest variant seen). */
  displayName: string;
  /** URL-safe lowercased dash-separated key. Unique per party. */
  normalizedName: string;
  totalInstruments: number;
  /** Distinct APNs the party touches. */
  parcels: number;
  byRole: Partial<Record<PartyRole, number>>;
  instruments: PartyInstrumentRef[];
};

/**
 * Static aliases for entities whose recorded full name is rarely typed.
 * MERS is the canonical example — examiners always type "MERS", not the
 * 44-character official entity name.
 */
const NAME_ALIASES: Array<{ pattern: RegExp; aliases: string[] }> = [
  {
    pattern: /mortgage electronic registration systems/i,
    aliases: ["mers"],
  },
];

/** Map every recorded instrument number to its parcel APN. */
export function buildInstrumentToApnMap(parcels: Parcel[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of parcels) {
    for (const num of p.instrument_numbers ?? []) {
      // First parcel wins on conflict — same instrument shouldn't be
      // attributed to two parcels in this corpus, but if it is, the
      // earlier-loaded parcel takes precedence.
      if (!m.has(num)) m.set(num, p.apn);
    }
  }
  return m;
}

/** Stable URL key for a party display name. */
export function normalizeForUrl(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Canonical comparison key for grouping name variants as one party. */
function canonicalKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Tokens for substring matching. For names like "V I P MORTGAGE INC" we
 * also emit a collapsed "vip" token so the natural query "VIP" matches.
 */
function indexTokens(name: string): string[] {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const raw = cleaned.split(/\s+/).filter(Boolean);
  const out = new Set<string>(raw);

  // Collapse runs of single-letter tokens into one token (V I P → vip).
  let i = 0;
  while (i < raw.length) {
    if (raw[i].length === 1) {
      let j = i;
      let combined = "";
      while (j < raw.length && raw[j].length === 1) {
        combined += raw[j];
        j++;
      }
      if (combined.length > 1) out.add(combined);
      i = j;
    } else {
      i++;
    }
  }
  return Array.from(out);
}

/** All searchable tokens for a party, including aliases and nominee_for. */
function searchableTokensForParty(party: Party): string[] {
  const tokens = new Set<string>(indexTokens(party.name));
  for (const { pattern, aliases } of NAME_ALIASES) {
    if (pattern.test(party.name)) {
      for (const a of aliases) tokens.add(a);
    }
  }
  if (party.nominee_for) {
    for (const t of indexTokens(party.nominee_for.party_name)) tokens.add(t);
  }
  return Array.from(tokens);
}

function queryTokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every query token must be a substring of at least one indexed token. */
function tokensMatch(qTokens: string[], indexed: string[]): boolean {
  if (qTokens.length === 0) return false;
  return qTokens.every((qt) => indexed.some((it) => it.includes(qt)));
}

type Bucket = {
  displayName: string;
  normalizedName: string;
  refs: PartyInstrumentRef[];
};

function buildAllBuckets(
  instruments: Instrument[],
  instrumentToApn: Map<string, string>,
): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  for (const inst of instruments) {
    const apn = instrumentToApn.get(inst.instrument_number);
    if (!apn) continue;
    for (const party of inst.parties) {
      const key = canonicalKey(party.name);
      if (!key) continue;
      let b = buckets.get(key);
      if (!b) {
        b = {
          displayName: party.name,
          normalizedName: normalizeForUrl(party.name),
          refs: [],
        };
        buckets.set(key, b);
      } else if (party.name.length > b.displayName.length) {
        // Prefer the longest variant as canonical (most informative).
        b.displayName = party.name;
        b.normalizedName = normalizeForUrl(party.name);
      }
      const ref: PartyInstrumentRef = {
        apn,
        instrumentNumber: inst.instrument_number,
        role: party.role,
        recordingDate: inst.recording_date,
        documentType: inst.document_type,
      };
      if (party.nominee_for) {
        ref.nomineeFor = {
          partyName: party.nominee_for.party_name,
          partyRole: party.nominee_for.party_role,
        };
      }
      b.refs.push(ref);
    }
  }
  return buckets;
}

function bucketToHit(b: Bucket): PartyHit {
  const byRole: Partial<Record<PartyRole, number>> = {};
  const apns = new Set<string>();
  for (const r of b.refs) {
    byRole[r.role] = (byRole[r.role] ?? 0) + 1;
    apns.add(r.apn);
  }
  // Sort the instrument list by recording date desc so newest appears first.
  const instruments = [...b.refs].sort((a, b) =>
    a.recordingDate < b.recordingDate ? 1 : a.recordingDate > b.recordingDate ? -1 : 0,
  );
  return {
    displayName: b.displayName,
    normalizedName: b.normalizedName,
    totalInstruments: b.refs.length,
    parcels: apns.size,
    byRole,
    instruments,
  };
}

/**
 * Search the curated corpus for parties whose name (or alias) matches the
 * query. Returns one PartyHit per distinct party, sorted by total instrument
 * count desc then displayName asc.
 */
export function searchParties(
  query: string,
  instruments: Instrument[],
  instrumentToApn: Map<string, string>,
): PartyHit[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const qTokens = queryTokens(trimmed);
  if (qTokens.length === 0) return [];

  const buckets = buildAllBuckets(instruments, instrumentToApn);

  // Per-party token cache so we don't recompute for each ref.
  const partyTokenCache = new Map<string, string[]>();
  const tokensForParty = (party: Party): string[] => {
    const k = canonicalKey(party.name);
    let t = partyTokenCache.get(k);
    if (!t) {
      t = searchableTokensForParty(party);
      partyTokenCache.set(k, t);
    }
    return t;
  };

  const hits: PartyHit[] = [];
  for (const [key, bucket] of buckets) {
    // We need to test against the underlying party tokens. Find any party
    // for this bucket key and use its tokens — all variants share a key.
    const probe = findFirstPartyForKey(instruments, key);
    if (!probe) continue;
    const indexed = tokensForParty(probe);
    if (tokensMatch(qTokens, indexed)) {
      hits.push(bucketToHit(bucket));
    }
  }

  hits.sort((a, b) => {
    if (a.totalInstruments !== b.totalInstruments) {
      return b.totalInstruments - a.totalInstruments;
    }
    return a.displayName.localeCompare(b.displayName);
  });
  return hits;
}

function findFirstPartyForKey(
  instruments: Instrument[],
  key: string,
): Party | undefined {
  for (const inst of instruments) {
    for (const p of inst.parties) {
      if (canonicalKey(p.name) === key) return p;
    }
  }
  return undefined;
}

/** Resolve the URL-safe normalizedName back to its PartyHit. */
export function findPartyByNormalizedName(
  normalizedName: string,
  instruments: Instrument[],
  instrumentToApn: Map<string, string>,
): PartyHit | null {
  const buckets = buildAllBuckets(instruments, instrumentToApn);
  for (const bucket of buckets.values()) {
    if (bucket.normalizedName === normalizedName) {
      return bucketToHit(bucket);
    }
  }
  return null;
}
