import fixtureJson from "../data/custodian-sweep-fixture.json";
import {
  FixtureSchema,
  type Fixture,
  type IndexId,
  type Approach,
  type ParcelSweep,
  type QueryResult,
  type DeadEndIndex,
  type LiveIndexMeta,
} from "./custodian-query-engine.schema";

export type {
  IndexId,
  Approach,
  Hit,
  FailureMode,
  QueryResult,
  ParcelSweep,
  DeadEndIndex,
  SweepSummary,
  LiveIndexMeta,
} from "./custodian-query-engine.schema";

export type PartyName = string;

let cached: Fixture | null = null;

function loadFixture(): Fixture {
  if (cached) return cached;
  cached = FixtureSchema.parse(fixtureJson);
  return cached;
}

/** For tests: drop memoized fixture so a subsequent call re-parses. */
export function __resetEngineCacheForTests(): void {
  cached = null;
}

const MIN_LATENCY_MS = 150;
const MAX_LATENCY_MS = 300;

function simulateLatency(): Promise<void> {
  const ms = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cellKey(party: PartyName, indexId: IndexId, approach: Approach): string {
  return `${party}__${indexId}__${approach}`;
}

/**
 * Single-cell query. Applies 150–300 ms simulated latency, then returns the
 * captured fixture result for this (party, index, approach) tuple.
 * Throws if party is unknown.
 */
export async function queryIndex(
  party: PartyName,
  indexId: IndexId,
  approach: Approach
): Promise<QueryResult> {
  const fx = loadFixture();
  if (!fx.parties.includes(party)) {
    throw new Error(
      `queryIndex: unknown party "${party}". Known parties: ${fx.parties.join(", ")}`
    );
  }
  await simulateLatency();
  const result = fx.cells[cellKey(party, indexId, approach)];
  if (!result) {
    throw new Error(
      `queryIndex: no fixture cell for (${party}, ${indexId}, ${approach}). ` +
        `Fixture is malformed — every (party, liveIndex, approach) must have an entry.`
    );
  }
  return result;
}

/** Synchronous — returns the frame data the showpiece needs to lay out cells. */
export function getShowpieceShape(): {
  parties: PartyName[];
  liveIndexes: LiveIndexMeta[];
  deadEnds: DeadEndIndex[];
} {
  const fx = loadFixture();
  return { parties: [...fx.parties], liveIndexes: [...fx.live_indexes], deadEnds: [...fx.dead_ends] };
}

/** Returns null for APNs with no fixture entry. */
export async function getSweepForParcel(apn: string): Promise<ParcelSweep | null> {
  const fx = loadFixture();
  const sweep = fx.parcel_sweeps[apn];
  if (!sweep) return null;
  await simulateLatency();
  return sweep;
}

export function getCaptureMetadata(): {
  captured_at: string;
  capture_duration_ms: number;
  operator_notes?: string;
} {
  const fx = loadFixture();
  return {
    captured_at: fx.captured_at,
    capture_duration_ms: fx.capture_duration_ms,
    operator_notes: fx.operator_notes,
  };
}

export function getDeadEnds(): DeadEndIndex[] {
  return [...loadFixture().dead_ends];
}
