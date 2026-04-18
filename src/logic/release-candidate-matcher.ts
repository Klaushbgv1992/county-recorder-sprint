import type {
  Instrument,
  Party,
  Parcel,
  DocumentLink,
  EncumbranceLifecycle,
} from "../types";

// Minimum overall matcher score at which a candidate is worth surfacing to
// an examiner in the UI. Single-sourced here so tests and UI agree.
export const CANDIDATE_DISPLAY_THRESHOLD = 0.25;

// -- Release-candidate scoring ----------------------------------------------
//
// Given a deed of trust and a set of candidate release/reconveyance
// instruments, rank the candidates by three features:
//   1. Party-name similarity: Jaccard token overlap between the DOT's
//      beneficiary (or its nominee_for target) and the releasing party
//      named on the candidate.
//   2. Date proximity: 1 - (years between DOT and candidate) / 30, clamped
//      to [0, 1]. A release recorded the same year as the DOT scores 1.0;
//      a release 30+ years later scores 0.
//   3. Legal-description overlap: token overlap (Jaccard) on lot number
//      and subdivision name when both instruments expose a legal
//      description. 0 when either side is missing.
//
// The overall score is the equal-weighted mean of the three features. The
// matcher intentionally does not make a binary accept/reject decision — it
// produces a ranking that an examiner or a higher-level rule can confirm.
// Hand-authored links in src/data/links.json remain the ground-truth
// "confirmed" subset; the matcher is a suggestion layer that answers the
// code-review critique that encumbrance linkage today is curated rather
// than discovered.
// --------------------------------------------------------------------------

export interface ReleaseCandidateScore {
  candidate: Instrument;
  score: number;
  features: {
    partyNameSim: number;
    dateProximity: number;
    legalDescOverlap: number;
  };
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "inc",
  "llc",
  "corp",
  "co",
  "ltd",
  "company",
  "nominee",
  "as",
  "for",
  "mers",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getBeneficiaryName(dot: Instrument): string {
  // Prefer the real beneficiary behind a nominee (MERS case). If the DOT
  // has a nominee party with nominee_for, use that target's party_name.
  // Otherwise fall back to the first lender or beneficiary party.
  const nominee = dot.parties.find((p) => p.nominee_for);
  if (nominee?.nominee_for) return nominee.nominee_for.party_name;
  const lender = dot.parties.find(
    (p: Party) => p.role === "lender" || p.role === "beneficiary",
  );
  return lender?.name ?? "";
}

function getReleasingPartyName(release: Instrument): string {
  const releasing = release.parties.find(
    (p: Party) =>
      p.role === "releasing_party" ||
      p.role === "beneficiary" ||
      p.role === "lender" ||
      p.role === "servicer",
  );
  return releasing?.name ?? release.parties[0]?.name ?? "";
}

function yearsBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(b - a) / (365.25 * 24 * 60 * 60 * 1000);
}

export function dateProximity(dotDate: string, candidateDate: string): number {
  const years = yearsBetween(dotDate, candidateDate);
  return Math.max(0, 1 - years / 30);
}

export function partyNameSimilarity(
  dot: Instrument,
  candidate: Instrument,
): number {
  const dotName = getBeneficiaryName(dot);
  const candidateName = getReleasingPartyName(candidate);
  if (!dotName || !candidateName) return 0;
  return jaccard(tokenize(dotName), tokenize(candidateName));
}

export function legalDescriptionOverlap(
  dot: Instrument,
  candidate: Instrument,
): number {
  const dotLegal = dot.legal_description?.value;
  const candidateLegal = candidate.legal_description?.value;
  if (!dotLegal || !candidateLegal) return 0;
  return jaccard(tokenize(dotLegal), tokenize(candidateLegal));
}

export function rankReleaseCandidates(
  dot: Instrument,
  candidates: Instrument[],
): ReleaseCandidateScore[] {
  const scored: ReleaseCandidateScore[] = candidates.map((candidate) => {
    const partyNameSim = partyNameSimilarity(dot, candidate);
    const dateProx = dateProximity(dot.recording_date, candidate.recording_date);
    const legalDesc = legalDescriptionOverlap(dot, candidate);
    const score = (partyNameSim + dateProx + legalDesc) / 3;
    return {
      candidate,
      score,
      features: {
        partyNameSim,
        dateProximity: dateProx,
        legalDescOverlap: legalDesc,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

// -- UI-glue helpers (additive) --------------------------------------------
//
// Pure helpers that convert matcher output into the shape the Encumbrance
// Lifecycle Panel renders, and that synthesize an algorithmic DocumentLink
// when the examiner accepts a candidate. Kept here so the "suggestion layer"
// surface area lives in one module alongside the scoring it depends on.
// --------------------------------------------------------------------------

export type CandidateAction = "accepted" | "rejected";

export interface CandidateRow {
  candidate: Instrument;
  score: number;
  features: {
    partyNameSim: number;
    dateProximity: number;
    legalDescOverlap: number;
  };
  alreadyLinkedTo: string | null;
  canAccept: boolean;
  action: "pending" | CandidateAction;
}

export interface BuildCandidateRowsParams {
  lifecycleId: string;
  dot: Instrument;
  pool: Instrument[];
  releaseLinks: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  candidateActions: Record<string, CandidateAction>;
}

export interface BuildCandidateRowsResult {
  rows: CandidateRow[];
  total: number;
  aboveThresholdCount: number;
}

const MAX_CANDIDATE_ROWS = 3;

export function candidateKey(
  lifecycleId: string,
  candidateInstrumentNumber: string,
): string {
  return `${lifecycleId}::${candidateInstrumentNumber}`;
}

function findAcceptedReleaseLifecycle(
  candidate: Instrument,
  releaseLinks: DocumentLink[],
  lifecycles: EncumbranceLifecycle[],
): string | null {
  const acceptedLink = releaseLinks.find(
    (l) =>
      l.source_instrument === candidate.instrument_number &&
      l.link_type === "release_of" &&
      l.examiner_action === "accepted",
  );
  if (!acceptedLink) return null;
  const owner = lifecycles.find(
    (lc) => lc.root_instrument === acceptedLink.target_instrument,
  );
  return owner?.id ?? null;
}

export function buildCandidateRows({
  lifecycleId,
  dot,
  pool,
  releaseLinks,
  lifecycles,
  candidateActions,
}: BuildCandidateRowsParams): BuildCandidateRowsResult {
  const total = pool.length;
  const ranked = rankReleaseCandidates(dot, pool);
  const aboveThreshold = ranked.filter(
    (r) => r.score >= CANDIDATE_DISPLAY_THRESHOLD,
  );
  const displayed = aboveThreshold.slice(0, MAX_CANDIDATE_ROWS);

  const rows: CandidateRow[] = displayed.map((r) => {
    const alreadyLinkedTo = findAcceptedReleaseLifecycle(
      r.candidate,
      releaseLinks,
      lifecycles,
    );
    const key = candidateKey(lifecycleId, r.candidate.instrument_number);
    const action = candidateActions[key] ?? "pending";
    return {
      candidate: r.candidate,
      score: r.score,
      features: r.features,
      alreadyLinkedTo,
      canAccept: alreadyLinkedTo === null,
      action,
    };
  });

  return {
    rows,
    total,
    aboveThresholdCount: aboveThreshold.length,
  };
}

export function synthesizeAlgorithmicLink(params: {
  lifecycleId: string;
  dot: Instrument;
  candidate: Instrument;
  score: number;
}): DocumentLink {
  const { lifecycleId, dot, candidate, score } = params;
  return {
    id: `synthetic-${lifecycleId}-${candidate.instrument_number}`,
    source_instrument: candidate.instrument_number,
    target_instrument: dot.instrument_number,
    link_type: "release_of",
    provenance: "algorithmic",
    confidence: score,
    examiner_action: "accepted",
  };
}

export function buildAcceptedRationale(score: number): string {
  return `Accepted via release-candidate matcher, score=${score.toFixed(2)}`;
}

export function buildEmptyStateRationale(parcel: Parcel): string {
  return (
    `Cross-parcel scan: scanned ${parcel.subdivision} parcel corpus, ` +
    `0 reconveyance candidates above threshold. ` +
    `The public API cannot search for releases filed against ` +
    `${parcel.current_owner} outside this parcel — a county-internal ` +
    `full-name scan across the entire recorded index closes this gap.`
  );
}
