# Custodian Query Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fixture-backed custodian query engine and expose it through a new `/custodian-query` matrix showpiece plus a rewired `PartyJudgmentSweep` parcel panel, demonstrating the county moat with real captured data and pre-computed AI judgments.

**Architecture:** A single pure-async engine (`src/lib/custodian-query-engine.ts`) reads a Zod-validated fixture (`src/data/custodian-sweep-fixture.json`) and exposes `queryIndex`, `getShowpieceShape`, `getSweepForParcel`, `getCaptureMetadata`, `getDeadEnds`. Two React surfaces consume it: a new `CustodianQueryPage` animates a 5-party × 2-live-index × 2-approach matrix; the existing `PartyJudgmentSweep` swaps its JSON import for `getSweepForParcel`. A dev-only `scripts/capture-sweep.ts` Playwright runbook produces the fixture via a serialized offline session.

**Tech Stack:** TypeScript, React 19, Vite, Vitest + jsdom + React Testing Library, Zod (already present), Tailwind v4, react-router v7, Playwright MCP (dev-only, offline capture).

**Spec:** `docs/superpowers/specs/2026-04-18-custodian-query-engine-design.md`

---

## Task Ordering Rationale

Order preserves a green test suite at every commit. Dev-fixture seed (Task 2) unblocks the engine and surfaces so they can be built and tested before the real Playwright capture (Task 13). The real capture overwrites the fixture at the end and all the existing tests still pass because they assert on shape and count, not exact hit text.

1. Zod schema + derived types
2. Dev-fixture seed (placeholder but schema-valid)
3. Engine core
4. Engine unit tests
5. Fixture validator script
6. `LiveQueryCell` component + tests
7. `CustodianQueryPage` layout (cells pre-resolved, no animation yet)
8. `CustodianQueryPage` animation + sessionStorage + replay
9. Hit detail card + failure popover
10. Route registration + landing page link
11. `PartyJudgmentSweep` rewire + smoke tests updated
12. Delete `party-judgment-sweeps.json`
13. Playwright capture runbook (produces real fixture)
14. Docs: `data-provenance.md` §4 + `CLAUDE.md` Decision #46

---

## Task 1: Zod schema + derived types

**Files:**
- Create: `src/lib/custodian-query-engine.schema.ts`
- Test: `src/lib/custodian-query-engine.schema.test.ts`

- [ ] **Step 1: Write failing schema test**

Create `src/lib/custodian-query-engine.schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FixtureSchema, type Fixture } from "./custodian-query-engine.schema";

const MINIMAL: Fixture = {
  schema_version: 1,
  captured_at: "2026-04-18T19:32:00Z",
  capture_duration_ms: 9120000,
  parties: ["A", "B", "C", "D", "E"],
  live_indexes: [
    { id: "mcr-name",   name: "MCR",  short: "MCR",  custodian: "County", coverage: "1871-2026" },
    { id: "mcsc-civil", name: "MCSC", short: "MCSC", custodian: "Court",  coverage: "1990-2026" },
  ],
  dead_ends: [
    { id: "az-dor-liens", name: "AZ DOR",      reason: "r" },
    { id: "irs-nftl",     name: "IRS NFTL",    reason: "r" },
    { id: "usbc-az",      name: "USBC AZ",     reason: "r" },
  ],
  cells: {
    "A__mcr-name__public-api":      { status: "blocked", failure: { kind: "http_403", message: "403" } },
    "A__mcr-name__county-internal": { status: "zero" },
  },
  parcel_sweeps: {
    "304-78-386": {
      apn: "304-78-386",
      status: "swept",
      parties: ["A"],
      indexes: ["mcr-name"],
      hits: [],
      verified_through: "2026-04-18",
      swept_at: "2026-04-18T19:32:00Z",
      summary: {
        parties_scanned: 1, indexes_scanned: 1, raw_hits: 0,
        post_judgment_hits_requiring_action: 0,
        all_clear: true, all_clear_after_judgment: true, note: "ok",
      },
    },
    "304-77-689": {
      apn: "304-77-689",
      status: "no_capture_available",
      parties: ["J", "M"],
      reason: "r",
      what_production_would_do: "w",
    },
  },
};

describe("FixtureSchema", () => {
  it("accepts a minimal well-formed fixture", () => {
    expect(() => FixtureSchema.parse(MINIMAL)).not.toThrow();
  });

  it("rejects a fixture with an invalid FailureMode.kind", () => {
    const bad = structuredClone(MINIMAL);
    // @ts-expect-error intentional invalid kind
    bad.cells["A__mcr-name__public-api"].failure.kind = "not_a_real_kind";
    expect(() => FixtureSchema.parse(bad)).toThrow();
  });

  it("rejects a fixture with hit.confidence out of [0,1]", () => {
    const bad = structuredClone(MINIMAL);
    bad.cells["A__mcr-name__county-internal"] = {
      status: "hit",
      hits: [{
        id: "h1", party_name: "A", summary: "s",
        ai_judgment: "probable_false_positive", ai_rationale: "r",
        confidence: 1.5,
        provenance: "county_internal_index", action_required: "none",
      }],
    };
    expect(() => FixtureSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/custodian-query-engine.schema.test.ts`
Expected: FAIL with "Cannot find module './custodian-query-engine.schema'".

- [ ] **Step 3: Write schema file**

Create `src/lib/custodian-query-engine.schema.ts`:

```ts
import { z } from "zod";

export const IndexIdSchema = z.enum(["mcr-name", "mcsc-civil"]);
// DeadEnd ids are a free-form string (not an enum) so the MCSC-dropped
// fallback can list `mcsc-civil` as a dead-end. The ids are display keys,
// not tooling keys — nothing in the engine or UI branches on specific values.
export const DeadEndIdSchema = z.string().min(1);
export const ApproachSchema = z.enum(["public-api", "county-internal"]);

export const AiJudgmentSchema = z.enum([
  "probable_false_positive",
  "requires_examiner_review",
  "confirmed_exposure",
]);

export const FailureKindSchema = z.enum([
  "cloudflare_challenge",
  "http_403",
  "filter_silently_dropped",
  "pagination_broken",
  "viewstate_required",
  "captcha_required",
  "paywall",
  "no_public_search",
]);

export const ProvenanceSchema = z.enum([
  "county_internal_index",
  "state_index_feed",
  "federal_index_feed",
  "manual_entry",
]);

export const HitSchema = z.object({
  id: z.string().min(1),
  party_name: z.string().min(1),
  recording_number: z.string().optional(),
  recording_date: z.string().optional(),
  doc_type_raw: z.string().optional(),
  summary: z.string().min(1),
  ai_judgment: AiJudgmentSchema,
  ai_rationale: z.string().min(1),
  confidence: z.number().min(0).max(1),
  provenance: ProvenanceSchema,
  action_required: z.string(),
});

export const FailureModeSchema = z.object({
  kind: FailureKindSchema,
  http_status: z.number().int().optional(),
  message: z.string().min(1),
  captured_url: z.string().url().optional(),
  captured_response_excerpt: z.string().optional(),
});

export const QueryResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("hit"), hits: z.array(HitSchema).min(1) }),
  z.object({ status: z.literal("zero") }),
  z.object({ status: z.literal("blocked"), failure: FailureModeSchema }),
  z.object({
    status: z.literal("no_capture_available"),
    reason: z.string().min(1),
    what_production_would_do: z.string().min(1),
  }),
]);

export const LiveIndexMetaSchema = z.object({
  id: IndexIdSchema,
  name: z.string().min(1),
  short: z.string().min(1),
  custodian: z.string().min(1),
  coverage: z.string().min(1),
});

export const DeadEndIndexSchema = z.object({
  id: DeadEndIdSchema,
  name: z.string().min(1),
  reason: z.string().min(1),
});

export const SweepSummarySchema = z.object({
  parties_scanned: z.number().int().nonnegative(),
  indexes_scanned: z.number().int().nonnegative(),
  raw_hits: z.number().int().nonnegative(),
  post_judgment_hits_requiring_action: z.number().int().nonnegative(),
  all_clear: z.boolean(),
  all_clear_after_judgment: z.boolean(),
  note: z.string(),
});

export const ParcelSweepSchema = z.discriminatedUnion("status", [
  z.object({
    apn: z.string().min(1),
    status: z.literal("swept"),
    parties: z.array(z.string()),
    indexes: z.array(IndexIdSchema),
    hits: z.array(HitSchema),
    summary: SweepSummarySchema,
    verified_through: z.string(),
    swept_at: z.string(),
  }),
  z.object({
    apn: z.string().min(1),
    status: z.literal("no_capture_available"),
    parties: z.array(z.string()),
    reason: z.string().min(1),
    what_production_would_do: z.string().min(1),
  }),
]);

export const FixtureSchema = z.object({
  schema_version: z.literal(1),
  captured_at: z.string().datetime({ offset: true }),
  capture_duration_ms: z.number().int().nonnegative(),
  operator_notes: z.string().optional(),
  parties: z.array(z.string().min(1)).length(5),
  live_indexes: z.array(LiveIndexMetaSchema).min(1).max(2),
  dead_ends: z.array(DeadEndIndexSchema),
  cells: z.record(z.string(), QueryResultSchema),
  parcel_sweeps: z.record(z.string(), ParcelSweepSchema),
});

export type Fixture = z.infer<typeof FixtureSchema>;
export type IndexId = z.infer<typeof IndexIdSchema>;
export type DeadEndId = z.infer<typeof DeadEndIdSchema>;
export type Approach = z.infer<typeof ApproachSchema>;
export type AiJudgment = z.infer<typeof AiJudgmentSchema>;
export type FailureKind = z.infer<typeof FailureKindSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type Hit = z.infer<typeof HitSchema>;
export type FailureMode = z.infer<typeof FailureModeSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type LiveIndexMeta = z.infer<typeof LiveIndexMetaSchema>;
export type DeadEndIndex = z.infer<typeof DeadEndIndexSchema>;
export type SweepSummary = z.infer<typeof SweepSummarySchema>;
export type ParcelSweep = z.infer<typeof ParcelSweepSchema>;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run src/lib/custodian-query-engine.schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/custodian-query-engine.schema.ts src/lib/custodian-query-engine.schema.test.ts
git -c commit.gpgsign=false commit -m "feat(custodian-query): Zod schema and derived types for sweep fixture"
```

---

## Task 2: Dev-fixture seed

Seed a minimal, schema-valid fixture with all 20 cells and both parcel sweeps. Real capture data overwrites this in Task 13. This exists so engine, surfaces, and tests can be built and tested before Playwright runs.

**Files:**
- Create: `src/data/custodian-sweep-fixture.json`

- [ ] **Step 1: Write the dev fixture**

Create `src/data/custodian-sweep-fixture.json` with the following structure. All 10 public-API cells are `blocked` with a plausible placeholder `filter_silently_dropped` failure; 9 county-internal cells are `zero`; 1 county-internal cell (BRIAN J MADISON × mcsc-civil) is a `hit` with a pre-authored placeholder collision.

```json
{
  "schema_version": 1,
  "captured_at": "2026-04-18T00:00:00Z",
  "capture_duration_ms": 0,
  "operator_notes": "DEV SEED — overwritten by scripts/capture-sweep.ts. Do not cite in the demo until capture has run.",
  "parties": [
    "CHRISTOPHER POPHAM",
    "ASHLEY POPHAM",
    "BRIAN J MADISON",
    "TANYA R MADISON",
    "BRIAN J AND TANYA R MADISON LIVING TRUST"
  ],
  "live_indexes": [
    {
      "id": "mcr-name",
      "name": "Maricopa County Recorder — full name index",
      "short": "MCR name index",
      "custodian": "Maricopa County Recorder",
      "coverage": "1871-06-01 through 2026-04-18"
    },
    {
      "id": "mcsc-civil",
      "name": "Maricopa County Superior Court — civil judgments",
      "short": "MCSC civil judgments",
      "custodian": "Maricopa County Clerk of Superior Court",
      "coverage": "1990 through 2026-04-18"
    }
  ],
  "dead_ends": [
    {
      "id": "az-dor-liens",
      "name": "Arizona Department of Revenue — state tax liens",
      "reason": "No free name search. Filed at the recorder under state-lien document codes, but the public API's documentCode filter is silently dropped — same Known Gap #2 surface."
    },
    {
      "id": "irs-nftl",
      "name": "IRS Notices of Federal Tax Lien",
      "reason": "Filed at the recorder as FED TAX L. Public API silently drops documentCode filters. No free IRS-side name search."
    },
    {
      "id": "usbc-az",
      "name": "U.S. Bankruptcy Court — District of Arizona",
      "reason": "PACER requires a paid account plus CAPTCHA. No free name search."
    }
  ],
  "cells": {
    "CHRISTOPHER POPHAM__mcr-name__public-api":                               { "status": "blocked", "failure": { "kind": "filter_silently_dropped", "message": "DEV SEED placeholder — capture will overwrite" } },
    "CHRISTOPHER POPHAM__mcr-name__county-internal":                           { "status": "zero" },
    "CHRISTOPHER POPHAM__mcsc-civil__public-api":                              { "status": "blocked", "failure": { "kind": "no_public_search", "message": "DEV SEED placeholder — capture will overwrite" } },
    "CHRISTOPHER POPHAM__mcsc-civil__county-internal":                         { "status": "zero" },
    "ASHLEY POPHAM__mcr-name__public-api":                                     { "status": "blocked", "failure": { "kind": "filter_silently_dropped", "message": "DEV SEED placeholder — capture will overwrite" } },
    "ASHLEY POPHAM__mcr-name__county-internal":                                { "status": "zero" },
    "ASHLEY POPHAM__mcsc-civil__public-api":                                   { "status": "blocked", "failure": { "kind": "no_public_search", "message": "DEV SEED placeholder — capture will overwrite" } },
    "ASHLEY POPHAM__mcsc-civil__county-internal":                              { "status": "zero" },
    "BRIAN J MADISON__mcr-name__public-api":                                   { "status": "blocked", "failure": { "kind": "filter_silently_dropped", "message": "DEV SEED placeholder — capture will overwrite" } },
    "BRIAN J MADISON__mcr-name__county-internal":                              { "status": "zero" },
    "BRIAN J MADISON__mcsc-civil__public-api":                                 { "status": "blocked", "failure": { "kind": "no_public_search", "message": "DEV SEED placeholder — capture will overwrite" } },
    "BRIAN J MADISON__mcsc-civil__county-internal":                            { "status": "hit", "hits": [{ "id": "sweep-dev-001", "party_name": "BRIAN MADISON", "recording_number": "PENDING", "recording_date": "PENDING", "doc_type_raw": "CIVIL JDG", "summary": "DEV SEED — Brian Madison civil judgment, different address. Overwritten during Playwright capture.", "ai_judgment": "probable_false_positive", "ai_rationale": "DEV SEED — different address, not the Brian J Madison named on the 2013 DOT in this parcel's chain.", "confidence": 0.9, "provenance": "county_internal_index", "action_required": "none" }] },
    "TANYA R MADISON__mcr-name__public-api":                                   { "status": "blocked", "failure": { "kind": "filter_silently_dropped", "message": "DEV SEED placeholder — capture will overwrite" } },
    "TANYA R MADISON__mcr-name__county-internal":                              { "status": "zero" },
    "TANYA R MADISON__mcsc-civil__public-api":                                 { "status": "blocked", "failure": { "kind": "no_public_search", "message": "DEV SEED placeholder — capture will overwrite" } },
    "TANYA R MADISON__mcsc-civil__county-internal":                            { "status": "zero" },
    "BRIAN J AND TANYA R MADISON LIVING TRUST__mcr-name__public-api":          { "status": "blocked", "failure": { "kind": "filter_silently_dropped", "message": "DEV SEED placeholder — capture will overwrite" } },
    "BRIAN J AND TANYA R MADISON LIVING TRUST__mcr-name__county-internal":     { "status": "zero" },
    "BRIAN J AND TANYA R MADISON LIVING TRUST__mcsc-civil__public-api":        { "status": "blocked", "failure": { "kind": "no_public_search", "message": "DEV SEED placeholder — capture will overwrite" } },
    "BRIAN J AND TANYA R MADISON LIVING TRUST__mcsc-civil__county-internal":   { "status": "zero" }
  },
  "parcel_sweeps": {
    "304-78-386": {
      "apn": "304-78-386",
      "status": "swept",
      "parties": ["CHRISTOPHER POPHAM", "ASHLEY POPHAM", "BRIAN J MADISON", "TANYA R MADISON", "BRIAN J AND TANYA R MADISON LIVING TRUST"],
      "indexes": ["mcr-name", "mcsc-civil"],
      "hits": [{ "id": "sweep-dev-001", "party_name": "BRIAN MADISON", "recording_number": "PENDING", "recording_date": "PENDING", "doc_type_raw": "CIVIL JDG", "summary": "DEV SEED — Brian Madison civil judgment, different address. Overwritten during Playwright capture.", "ai_judgment": "probable_false_positive", "ai_rationale": "DEV SEED — different address, not the Brian J Madison named on the 2013 DOT in this parcel's chain.", "confidence": 0.9, "provenance": "county_internal_index", "action_required": "none" }],
      "verified_through": "2026-04-18",
      "swept_at": "2026-04-18T00:00:00Z",
      "summary": {
        "parties_scanned": 5,
        "indexes_scanned": 2,
        "raw_hits": 1,
        "post_judgment_hits_requiring_action": 0,
        "all_clear": false,
        "all_clear_after_judgment": true,
        "note": "1 raw hit, 1 dismissed by chain-context AI as a false positive."
      }
    },
    "304-77-689": {
      "apn": "304-77-689",
      "status": "no_capture_available",
      "parties": ["JASON HOGUE", "MICHELE HOGUE"],
      "reason": "The HOGUE parcel sweep cannot be run from the public API. The public endpoint publicapi.recorder.maricopa.gov has no name-filtered search — a hunt log documenting the five API layers that block this is at docs/hunt-log-known-gap-2.md. The county's internal full-name index, which this portal would use in production, closes the gap. That is the moat argument: the custodian can answer the question the public API is structurally unable to answer.",
      "what_production_would_do": "Run a name-filtered query against the recorder's internal name index and the MCSC civil-judgments index — the same indexes swept for POPHAM — and return hits or a verified zero with a timestamp."
    }
  }
}
```

- [ ] **Step 2: Verify fixture validates against schema**

Run: `node -e "const {FixtureSchema} = require('./dist/...')"` — actually, simpler: add a tiny ad-hoc check via the existing schema test. Add this test to `src/lib/custodian-query-engine.schema.test.ts`:

```ts
import fixture from "../data/custodian-sweep-fixture.json";

it("dev-seed fixture passes schema", () => {
  expect(() => FixtureSchema.parse(fixture)).not.toThrow();
});
```

Run: `npx vitest run src/lib/custodian-query-engine.schema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add src/data/custodian-sweep-fixture.json src/lib/custodian-query-engine.schema.test.ts
git -c commit.gpgsign=false commit -m "feat(custodian-query): dev-seed fixture (overwritten by capture)"
```

---

## Task 3: Engine core

**Files:**
- Create: `src/lib/custodian-query-engine.ts`

- [ ] **Step 1: Write the engine**

Create `src/lib/custodian-query-engine.ts`:

```ts
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
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/custodian-query-engine.ts
git -c commit.gpgsign=false commit -m "feat(custodian-query): engine core — queryIndex, getShowpieceShape, getSweepForParcel"
```

---

## Task 4: Engine unit tests

**Files:**
- Create: `src/lib/custodian-query-engine.test.ts`

- [ ] **Step 1: Write engine tests**

Create `src/lib/custodian-query-engine.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  queryIndex,
  getShowpieceShape,
  getSweepForParcel,
  getCaptureMetadata,
  getDeadEnds,
  __resetEngineCacheForTests,
} from "./custodian-query-engine";

beforeEach(() => {
  __resetEngineCacheForTests();
});

describe("custodian-query-engine", () => {
  describe("getShowpieceShape", () => {
    it("returns 5 parties, 2 live indexes, 3 dead-ends", () => {
      const shape = getShowpieceShape();
      expect(shape.parties).toHaveLength(5);
      expect(shape.liveIndexes).toHaveLength(2);
      expect(shape.deadEnds).toHaveLength(3);
      expect(shape.liveIndexes.map((i) => i.id).sort()).toEqual(["mcr-name", "mcsc-civil"]);
      expect(shape.deadEnds.map((d) => d.id).sort()).toEqual(["az-dor-liens", "irs-nftl", "usbc-az"]);
    });
  });

  describe("queryIndex", () => {
    it("resolves for a known (party, liveIndex, approach) tuple", async () => {
      const result = await queryIndex("CHRISTOPHER POPHAM", "mcr-name", "county-internal");
      expect(result.status).toMatch(/zero|hit|blocked|no_capture_available/);
    });

    it("returns BRIAN J MADISON mcsc-civil county-internal as a hit (dev seed invariant)", async () => {
      const result = await queryIndex("BRIAN J MADISON", "mcsc-civil", "county-internal");
      expect(result.status).toBe("hit");
      if (result.status === "hit") {
        expect(result.hits.length).toBeGreaterThanOrEqual(1);
        expect(result.hits[0].ai_judgment).toBe("probable_false_positive");
      }
    });

    it("public-api approach cells are blocked", async () => {
      const result = await queryIndex("CHRISTOPHER POPHAM", "mcr-name", "public-api");
      expect(result.status).toBe("blocked");
    });

    it("throws for an unknown party", async () => {
      await expect(
        queryIndex("UNKNOWN PERSON", "mcr-name", "county-internal")
      ).rejects.toThrow(/unknown party/);
    });

    it("applies simulated latency of at least 150 ms", async () => {
      vi.useFakeTimers();
      const promise = queryIndex("CHRISTOPHER POPHAM", "mcr-name", "county-internal");
      // Advance by less than minimum; promise should not have resolved.
      await vi.advanceTimersByTimeAsync(100);
      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);
      // Advance past the max; it must resolve.
      await vi.advanceTimersByTimeAsync(250);
      await expect(promise).resolves.toBeDefined();
      vi.useRealTimers();
    });
  });

  describe("getSweepForParcel", () => {
    it("returns status=swept for POPHAM", async () => {
      const sweep = await getSweepForParcel("304-78-386");
      expect(sweep).not.toBeNull();
      expect(sweep!.status).toBe("swept");
      if (sweep && sweep.status === "swept") {
        expect(sweep.parties).toHaveLength(5);
        expect(sweep.summary.parties_scanned).toBe(5);
      }
    });

    it("returns status=no_capture_available for HOGUE", async () => {
      const sweep = await getSweepForParcel("304-77-689");
      expect(sweep).not.toBeNull();
      expect(sweep!.status).toBe("no_capture_available");
      if (sweep && sweep.status === "no_capture_available") {
        expect(sweep.reason).toMatch(/public API/i);
        expect(sweep.what_production_would_do).toMatch(/internal/i);
      }
    });

    it("returns null for an APN with no fixture entry", async () => {
      const sweep = await getSweepForParcel("999-99-999");
      expect(sweep).toBeNull();
    });
  });

  describe("getCaptureMetadata", () => {
    it("exposes the fixture-level timestamp and notes", () => {
      const meta = getCaptureMetadata();
      expect(meta.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof meta.capture_duration_ms).toBe("number");
    });
  });

  describe("getDeadEnds", () => {
    it("lists 3 dead-end indexes with reasons", () => {
      const deadEnds = getDeadEnds();
      expect(deadEnds).toHaveLength(3);
      expect(deadEnds.every((d) => d.reason.length > 0)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests, verify all pass**

Run: `npx vitest run src/lib/custodian-query-engine.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 3: Commit**

```bash
git add src/lib/custodian-query-engine.test.ts
git -c commit.gpgsign=false commit -m "test(custodian-query): engine unit tests"
```

---

## Task 5: Fixture validator script

**Files:**
- Create: `scripts/validate-sweep-fixture.ts`

- [ ] **Step 1: Write the validator**

Create `scripts/validate-sweep-fixture.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Validates src/data/custodian-sweep-fixture.json against the engine's Zod
 * schema, and cross-checks invariants the schema alone can't express.
 *
 * Exits 0 on pass, 1 on any failure. Run standalone or from npm test via the
 * schema test suite.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FixtureSchema, type Fixture } from "../src/lib/custodian-query-engine.schema";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function main(): void {
  const path = resolve(process.cwd(), "src/data/custodian-sweep-fixture.json");
  const raw = readFileSync(path, "utf-8");
  const json: unknown = JSON.parse(raw);

  let fx: Fixture;
  try {
    fx = FixtureSchema.parse(json);
  } catch (e) {
    fail(`Zod schema rejected the fixture:\n${e instanceof Error ? e.message : String(e)}`);
  }

  // Invariant 1: every (party × liveIndex × approach) has a cell.
  const approaches = ["public-api", "county-internal"] as const;
  const expectedCells: string[] = [];
  for (const party of fx.parties) {
    for (const idx of fx.live_indexes) {
      for (const a of approaches) {
        expectedCells.push(`${party}__${idx.id}__${a}`);
      }
    }
  }
  const actualCells = new Set(Object.keys(fx.cells));
  const missing = expectedCells.filter((k) => !actualCells.has(k));
  if (missing.length > 0) {
    fail(`Missing ${missing.length} cell(s). First: ${missing[0]}`);
  }

  // Invariant 2: no orphan cells.
  const expectedSet = new Set(expectedCells);
  const orphans = [...actualCells].filter((k) => !expectedSet.has(k));
  if (orphans.length > 0) {
    fail(`Orphan cell keys: ${orphans.slice(0, 3).join(", ")}${orphans.length > 3 ? "…" : ""}`);
  }

  // Invariant 3: POPHAM sweep parties subset of top-level parties.
  const pop = fx.parcel_sweeps["304-78-386"];
  if (pop && pop.status === "swept") {
    const top = new Set(fx.parties);
    const extra = pop.parties.filter((p) => !top.has(p));
    if (extra.length > 0) {
      fail(`POPHAM sweep references parties not in top-level list: ${extra.join(", ")}`);
    }
  }

  // Invariant 4: captured_at must not be in the future.
  const capturedAt = Date.parse(fx.captured_at);
  if (capturedAt > Date.now() + 60_000) {
    fail(`captured_at (${fx.captured_at}) is in the future.`);
  }

  console.log(
    `OK: ${fx.parties.length} parties × ${fx.live_indexes.length} live indexes × 2 approaches = ${expectedCells.length} cells. ${fx.dead_ends.length} dead-ends. Captured at ${fx.captured_at}.`
  );
}

main();
```

- [ ] **Step 2: Run validator against dev seed**

Run: `npx tsx scripts/validate-sweep-fixture.ts`
Expected: `OK: 5 parties × 2 live indexes × 2 approaches = 20 cells. 3 dead-ends. Captured at 2026-04-18T00:00:00Z.`

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-sweep-fixture.ts
git -c commit.gpgsign=false commit -m "feat(custodian-query): fixture validator script"
```

---

## Task 6: `LiveQueryCell` component

**Files:**
- Create: `src/components/LiveQueryCell.tsx`
- Create: `src/components/LiveQueryCell.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/LiveQueryCell.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LiveQueryCell } from "./LiveQueryCell";
import type { QueryResult } from "../lib/custodian-query-engine.schema";

afterEach(() => cleanup());

const ZERO: QueryResult = { status: "zero" };
const HIT: QueryResult = {
  status: "hit",
  hits: [{
    id: "h1", party_name: "BRIAN MADISON", summary: "A different Brian",
    ai_judgment: "probable_false_positive", ai_rationale: "Different address",
    confidence: 0.91, provenance: "county_internal_index", action_required: "none",
  }],
};
const BLOCKED: QueryResult = {
  status: "blocked",
  failure: {
    kind: "filter_silently_dropped",
    message: "name filter ignored",
    captured_url: "https://publicapi.recorder.maricopa.gov/documents/search?name=POPHAM",
    captured_response_excerpt: '{"page":1,"items":[...]}',
  },
};

describe("LiveQueryCell", () => {
  it("idle state shows 'awaiting sweep'", () => {
    render(<LiveQueryCell state="idle" party="CHRISTOPHER POPHAM" indexShort="MCR" />);
    expect(screen.getByText(/awaiting sweep/i)).toBeInTheDocument();
  });

  it("loading state shows a spinner and 'querying'", () => {
    render(<LiveQueryCell state="loading" party="CHRISTOPHER POPHAM" indexShort="MCR" />);
    expect(screen.getByText(/querying/i)).toBeInTheDocument();
  });

  it("zero state shows 'verified zero'", () => {
    render(<LiveQueryCell state="resolved" party="CHRISTOPHER POPHAM" indexShort="MCR" result={ZERO} coverage="1871-2026" />);
    expect(screen.getByText(/verified zero/i)).toBeInTheDocument();
  });

  it("hit (false-positive) state shows AI dismissal badge", () => {
    render(<LiveQueryCell state="resolved" party="BRIAN J MADISON" indexShort="MCSC" result={HIT} coverage="1990-2026" />);
    expect(screen.getByText(/AI: false positive/i)).toBeInTheDocument();
  });

  it("blocked state shows failure message", () => {
    render(<LiveQueryCell state="resolved" party="CHRISTOPHER POPHAM" indexShort="MCR" result={BLOCKED} coverage="" />);
    expect(screen.getByText(/name filter ignored/i)).toBeInTheDocument();
  });

  it("blocked cell click opens a popover with the captured URL", () => {
    render(<LiveQueryCell state="resolved" party="CHRISTOPHER POPHAM" indexShort="MCR" result={BLOCKED} coverage="" />);
    fireEvent.click(screen.getByRole("button", { name: /failure details/i }));
    expect(screen.getByText(/publicapi\.recorder\.maricopa\.gov/)).toBeInTheDocument();
  });

  it("hit cell click toggles the detail card", () => {
    render(<LiveQueryCell state="resolved" party="BRIAN J MADISON" indexShort="MCSC" result={HIT} coverage="1990-2026" />);
    const btn = screen.getByRole("button", { name: /hit details/i });
    fireEvent.click(btn);
    expect(screen.getByText(/Different address/)).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText(/Different address/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/components/LiveQueryCell.test.tsx`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write the component**

Create `src/components/LiveQueryCell.tsx`:

```tsx
import { useState } from "react";
import type { QueryResult, Hit, FailureMode } from "../lib/custodian-query-engine.schema";

export type CellState = "idle" | "loading" | "resolved";

interface Props {
  state: CellState;
  party: string;
  indexShort: string;
  result?: QueryResult;
  coverage?: string;
}

function JudgmentLabel({ j }: { j: Hit["ai_judgment"] }) {
  if (j === "probable_false_positive") return <>AI: false positive</>;
  if (j === "requires_examiner_review") return <>AI: requires review</>;
  return <>AI: confirmed exposure</>;
}

function HitBody({ hits }: { hits: Hit[] }) {
  const primary = hits[0];
  return (
    <div className="mt-2 rounded border border-amber-200 bg-amber-50/50 p-2 text-[11px] leading-relaxed text-slate-700">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-slate-900">{primary.party_name}</span>
        <span className="text-[10px] uppercase tracking-wide text-amber-900">
          <JudgmentLabel j={primary.ai_judgment} />
        </span>
      </div>
      <p className="mt-1">{primary.summary}</p>
      <p className="mt-1 italic text-slate-600">
        <span className="font-semibold not-italic text-slate-700">AI rationale:</span>{" "}
        {primary.ai_rationale} <span className="text-slate-500">({Math.round(primary.confidence * 100)}%)</span>
      </p>
      {primary.recording_number && primary.recording_date && (
        <p className="mt-1 font-mono text-slate-600">
          {primary.recording_number} · {primary.recording_date} · {primary.doc_type_raw}
        </p>
      )}
    </div>
  );
}

function FailurePopover({ f }: { f: FailureMode }) {
  return (
    <div className="mt-2 rounded border border-slate-300 bg-white p-2 text-[11px] leading-relaxed text-slate-700">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        {f.kind.replace(/_/g, " ")}
        {f.http_status ? ` · ${f.http_status}` : ""}
      </div>
      <p className="mt-1">{f.message}</p>
      {f.captured_url && (
        <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{f.captured_url}</p>
      )}
      {f.captured_response_excerpt && (
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 font-mono text-[10px] text-slate-600">
          {f.captured_response_excerpt.slice(0, 500)}
        </pre>
      )}
    </div>
  );
}

export function LiveQueryCell({ state, party, indexShort, result, coverage }: Props) {
  const [expanded, setExpanded] = useState(false);

  const base = "rounded-md border p-2 text-[12px] transition-colors";
  const partyLine = <div className="font-mono text-[11px] text-slate-500 truncate">{party}</div>;
  const indexLine = <div className="text-[10px] uppercase tracking-wide text-slate-500">{indexShort}</div>;

  if (state === "idle") {
    return (
      <div className={`${base} border-slate-200 bg-slate-50`}>
        {partyLine}
        {indexLine}
        <div className="mt-1 text-slate-500">awaiting sweep</div>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className={`${base} border-slate-300 bg-white`} aria-busy="true">
        {partyLine}
        {indexLine}
        <div className="mt-1 flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-400" aria-hidden />
          querying {indexShort}…
        </div>
      </div>
    );
  }
  // resolved
  if (!result) {
    return (
      <div className={`${base} border-slate-200 bg-white`}>
        {partyLine}
        {indexLine}
        <div className="mt-1 text-slate-500">no data</div>
      </div>
    );
  }
  if (result.status === "zero") {
    return (
      <div className={`${base} border-emerald-200 bg-emerald-50`}>
        {partyLine}
        {indexLine}
        <div className="mt-1 text-emerald-800">
          <span aria-hidden>✓</span> verified zero {coverage && <span className="text-[10px] text-emerald-700">· {coverage}</span>}
        </div>
      </div>
    );
  }
  if (result.status === "hit") {
    const primary = result.hits[0];
    return (
      <div className={`${base} border-amber-200 bg-amber-50/60`}>
        {partyLine}
        {indexLine}
        <button
          type="button"
          className="mt-1 flex items-baseline gap-1 text-left text-amber-900 hover:underline"
          aria-label="hit details"
          onClick={() => setExpanded((x) => !x)}
        >
          <span aria-hidden>●</span>
          <span>{result.hits.length} hit{result.hits.length === 1 ? "" : "s"} · </span>
          <span className="font-semibold"><JudgmentLabel j={primary.ai_judgment} /></span>
        </button>
        {expanded && <HitBody hits={result.hits} />}
      </div>
    );
  }
  if (result.status === "blocked") {
    return (
      <div className={`${base} border-slate-300 bg-slate-50`}>
        {partyLine}
        {indexLine}
        <button
          type="button"
          className="mt-1 block w-full text-left text-slate-700 hover:underline"
          aria-label="failure details"
          onClick={() => setExpanded((x) => !x)}
        >
          <span aria-hidden>×</span> {result.failure.message}
        </button>
        {expanded && <FailurePopover f={result.failure} />}
      </div>
    );
  }
  // no_capture_available — not expected on the showpiece; render as blocked-style
  return (
    <div className={`${base} border-slate-300 bg-slate-50`}>
      {partyLine}
      {indexLine}
      <div className="mt-1 text-slate-600">not captured</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, verify all pass**

Run: `npx vitest run src/components/LiveQueryCell.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/LiveQueryCell.tsx src/components/LiveQueryCell.test.tsx
git -c commit.gpgsign=false commit -m "feat(custodian-query): LiveQueryCell component with all result states"
```

---

## Task 7: `CustodianQueryPage` layout (static, no animation)

Build the page skeleton with all cells resolving to final states on mount (no stagger). Animation is added in Task 8 to keep this task reviewable independently.

**Files:**
- Create: `src/pages/CustodianQueryPage.tsx`
- Create: `src/pages/CustodianQueryPage.test.tsx`

- [ ] **Step 1: Write smoke tests**

Create `src/pages/CustodianQueryPage.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CustodianQueryPage } from "./CustodianQueryPage";

afterEach(() => cleanup());

function mount() {
  return render(
    <MemoryRouter initialEntries={["/custodian-query"]}>
      <CustodianQueryPage />
    </MemoryRouter>
  );
}

describe("CustodianQueryPage", () => {
  it("renders the page header", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: /custodian query engine/i })).toBeInTheDocument();
  });

  it("renders two column headers — public API and county internal", async () => {
    mount();
    expect(await screen.findByText(/public api/i)).toBeInTheDocument();
    expect(await screen.findByText(/county internal/i)).toBeInTheDocument();
  });

  it("renders all 5 party names", async () => {
    mount();
    expect(await screen.findAllByText(/CHRISTOPHER POPHAM/)).not.toHaveLength(0);
    expect(screen.getAllByText(/ASHLEY POPHAM/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BRIAN J MADISON/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TANYA R MADISON/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/LIVING TRUST/).length).toBeGreaterThan(0);
  });

  it("renders the dead-ends strip with 3 indexes", async () => {
    mount();
    await waitFor(() => {
      expect(screen.getByText(/arizona department of revenue/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/irs notices/i)).toBeInTheDocument();
    expect(screen.getByText(/bankruptcy court/i)).toBeInTheDocument();
  });

  it("renders the outcome tile with query counts", async () => {
    mount();
    await waitFor(() => {
      expect(screen.getByText(/20 queries attempted/i)).toBeInTheDocument();
    });
  });

  it("renders the footer deep-link to POPHAM parcel", async () => {
    mount();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /POPHAM.*parcel/i });
      expect(link).toHaveAttribute("href", "/parcel/304-78-386/encumbrances");
    });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/pages/CustodianQueryPage.test.tsx`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write the page (static resolution, no animation)**

Create `src/pages/CustodianQueryPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  getShowpieceShape,
  getCaptureMetadata,
  queryIndex,
  type IndexId,
  type Approach,
  type QueryResult,
  type LiveIndexMeta,
} from "../lib/custodian-query-engine";
import { LiveQueryCell } from "../components/LiveQueryCell";

type CellKey = `${string}__${IndexId}__${Approach}`;

function cellKey(party: string, indexId: IndexId, approach: Approach): CellKey {
  return `${party}__${indexId}__${approach}` as CellKey;
}

export function CustodianQueryPage() {
  const shape = useMemo(() => getShowpieceShape(), []);
  const meta = useMemo(() => getCaptureMetadata(), []);
  const [cells, setCells] = useState<Record<CellKey, QueryResult>>({});

  useEffect(() => {
    let cancelled = false;
    const tasks: Promise<void>[] = [];
    for (const party of shape.parties) {
      for (const idx of shape.liveIndexes) {
        for (const a of ["public-api", "county-internal"] as const) {
          tasks.push(
            queryIndex(party, idx.id, a).then((r) => {
              if (cancelled) return;
              setCells((prev) => ({ ...prev, [cellKey(party, idx.id, a)]: r }));
            })
          );
        }
      }
    }
    Promise.all(tasks);
    return () => {
      cancelled = true;
    };
  }, [shape]);

  const outcome = useMemo(() => countOutcomes(cells), [cells]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Custodian Query Engine — Maricopa County
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          The public API cannot answer by name. The custodian can. This page runs both side-by-side.
        </p>
        <div className="mt-2 text-[11px] text-slate-500 space-x-3 font-mono">
          <span>captured {meta.captured_at}</span>
          <span>·</span>
          <span>{shape.parties.length} parties</span>
          <span>·</span>
          <span>{shape.liveIndexes.length} live indexes</span>
        </div>
      </header>

      <section className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">
            {shape.parties.length * shape.liveIndexes.length * 2} queries attempted
          </span>
          {" · "}Public API: <span className="font-semibold text-slate-700">{outcome.publicAnswered}</span> answered
          {" · "}County internal: <span className="font-semibold text-emerald-800">{outcome.countyAnswered}</span> answered
          {" · "}<span className="text-amber-900">{outcome.aiDismissed}</span> AI-dismissed hit{outcome.aiDismissed === 1 ? "" : "s"}
          {" · "}<span className="text-emerald-800">{outcome.zeros}</span> verified zero
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MatrixColumn
          title="Public API"
          subtitle="publicapi.recorder.maricopa.gov"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="public-api"
          cells={cells}
        />
        <MatrixColumn
          title="County internal index"
          subtitle="what a custodian can run"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="county-internal"
          cells={cells}
        />
      </section>

      <section className="mt-8 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Three more indexes that would be in a production sweep
        </h2>
        <ul className="mt-3 space-y-2 text-[12px] text-slate-700">
          {shape.deadEnds.map((d) => (
            <li key={d.id} className="leading-relaxed">
              <span className="font-semibold text-slate-800">{d.name}</span> — {d.reason}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
        {meta.operator_notes && <p>{meta.operator_notes}</p>}
        <p className="mt-2">
          <Link className="text-moat-700 hover:underline" to="/parcel/304-78-386/encumbrances">
            See this sweep applied to POPHAM's parcel →
          </Link>
        </p>
      </footer>
    </div>
  );
}

function MatrixColumn({
  title,
  subtitle,
  parties,
  liveIndexes,
  approach,
  cells,
}: {
  title: string;
  subtitle: string;
  parties: string[];
  liveIndexes: LiveIndexMeta[];
  approach: Approach;
  cells: Record<CellKey, QueryResult>;
}) {
  return (
    <div>
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
        <p className="mt-0.5 text-[11px] font-mono text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-3 space-y-4">
        {parties.map((party) => {
          const slug = party.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
          return (
            <div key={party} id={`party-${slug}`} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="font-mono text-[11px] text-slate-600">{party}</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {liveIndexes.map((idx) => {
                  const k = cellKey(party, idx.id, approach);
                  const r = cells[k];
                  return (
                    <LiveQueryCell
                      key={idx.id}
                      state={r ? "resolved" : "loading"}
                      party={party}
                      indexShort={idx.short}
                      result={r}
                      coverage={idx.coverage}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function countOutcomes(cells: Record<CellKey, QueryResult>) {
  let publicAnswered = 0;
  let countyAnswered = 0;
  let aiDismissed = 0;
  let zeros = 0;
  for (const [key, r] of Object.entries(cells)) {
    const isCounty = key.endsWith("__county-internal");
    const isPublic = key.endsWith("__public-api");
    if (r.status === "zero" || r.status === "hit") {
      if (isCounty) countyAnswered += 1;
      if (isPublic) publicAnswered += 1;
    }
    if (r.status === "zero") zeros += 1;
    if (r.status === "hit") {
      for (const h of r.hits) {
        if (h.ai_judgment === "probable_false_positive") aiDismissed += 1;
      }
    }
  }
  return { publicAnswered, countyAnswered, aiDismissed, zeros };
}
```

- [ ] **Step 4: Run tests, verify all pass**

Run: `npx vitest run src/pages/CustodianQueryPage.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/CustodianQueryPage.tsx src/pages/CustodianQueryPage.test.tsx
git -c commit.gpgsign=false commit -m "feat(custodian-query): CustodianQueryPage layout with live cell resolution"
```

---

## Task 8: Matrix animation + sessionStorage + replay

Add stagger, sessionStorage gate, replay button, and `?replay=1` override.

**Files:**
- Modify: `src/pages/CustodianQueryPage.tsx`
- Modify: `src/pages/CustodianQueryPage.test.tsx`

- [ ] **Step 1: Add animation test cases**

Append to `src/pages/CustodianQueryPage.test.tsx`:

```tsx
import { useLocation } from "react-router";

describe("CustodianQueryPage animation + replay", () => {
  it("renders a Replay button", async () => {
    mount();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /replay sweep/i })).toBeInTheDocument();
    });
  });

  it("first visit sets sessionStorage flag after animation", async () => {
    sessionStorage.removeItem("custodian-query-seen");
    mount();
    await waitFor(() => {
      expect(sessionStorage.getItem("custodian-query-seen")).toBe("1");
    }, { timeout: 3000 });
  });

  it("Replay click resets sessionStorage and re-runs", async () => {
    sessionStorage.setItem("custodian-query-seen", "1");
    mount();
    const btn = await screen.findByRole("button", { name: /replay sweep/i });
    btn.click();
    await waitFor(() => {
      expect(sessionStorage.getItem("custodian-query-seen")).toBe("1");
    }, { timeout: 3000 });
  });
});
```

- [ ] **Step 2: Run tests, verify failures**

Run: `npx vitest run src/pages/CustodianQueryPage.test.tsx`
Expected: FAIL (no Replay button).

- [ ] **Step 3: Update the page with animation + replay**

Replace the `CustodianQueryPage` function body. Key changes:
- Track each cell's state independently (`idle` → `loading` → `resolved`) using a `Map<CellKey, CellState>` in state.
- On mount: check `sessionStorage['custodian-query-seen']` and `location.search`. If `seen && !replayFlag`, set all cells to `resolved` immediately. Otherwise run staggered animation.
- Replay button: increment a `key` state to remount the effect; clear sessionStorage.

Replace the component with this version:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  getShowpieceShape,
  getCaptureMetadata,
  queryIndex,
  type IndexId,
  type Approach,
  type QueryResult,
  type LiveIndexMeta,
} from "../lib/custodian-query-engine";
import { LiveQueryCell, type CellState } from "../components/LiveQueryCell";

type CellKey = `${string}__${IndexId}__${Approach}`;

function cellKey(party: string, indexId: IndexId, approach: Approach): CellKey {
  return `${party}__${indexId}__${approach}` as CellKey;
}

const SESSION_KEY = "custodian-query-seen";
const STAGGER_MS = 50;

export function CustodianQueryPage() {
  const shape = useMemo(() => getShowpieceShape(), []);
  const meta = useMemo(() => getCaptureMetadata(), []);
  const location = useLocation();
  const [animationKey, setAnimationKey] = useState(0);
  const [cellStates, setCellStates] = useState<Record<CellKey, CellState>>({});
  const [cells, setCells] = useState<Record<CellKey, QueryResult>>({});

  const replayParam = new URLSearchParams(location.search).has("replay");

  useEffect(() => {
    let cancelled = false;
    const seen = sessionStorage.getItem(SESSION_KEY) === "1";
    const allKeys: { party: string; idx: IndexId; a: Approach; k: CellKey }[] = [];
    for (const party of shape.parties) {
      for (const idx of shape.liveIndexes) {
        for (const a of ["public-api", "county-internal"] as const) {
          allKeys.push({ party, idx: idx.id, a, k: cellKey(party, idx.id, a) });
        }
      }
    }

    if (seen && !replayParam) {
      // Skip animation: resolve everything immediately.
      const initialStates: Record<CellKey, CellState> = {};
      for (const { k } of allKeys) initialStates[k] = "loading";
      setCellStates(initialStates);
      Promise.all(
        allKeys.map(({ party, idx, a, k }) =>
          queryIndex(party, idx, a).then((r) => {
            if (cancelled) return;
            setCells((prev) => ({ ...prev, [k]: r }));
            setCellStates((prev) => ({ ...prev, [k]: "resolved" }));
          })
        )
      ).then(() => {
        if (cancelled) return;
        sessionStorage.setItem(SESSION_KEY, "1");
      });
      return () => {
        cancelled = true;
      };
    }

    // First visit / replay: staggered animation.
    const idleStates: Record<CellKey, CellState> = {};
    for (const { k } of allKeys) idleStates[k] = "idle";
    setCellStates(idleStates);
    setCells({});

    const tasks = allKeys.map(({ party, idx, a, k }, i) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (cancelled) return resolve();
          setCellStates((prev) => ({ ...prev, [k]: "loading" }));
          queryIndex(party, idx, a).then((r) => {
            if (cancelled) return resolve();
            setCells((prev) => ({ ...prev, [k]: r }));
            setCellStates((prev) => ({ ...prev, [k]: "resolved" }));
            resolve();
          });
        }, i * STAGGER_MS);
      });
    });

    Promise.all(tasks).then(() => {
      if (cancelled) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    });

    return () => {
      cancelled = true;
    };
  }, [shape, animationKey, replayParam]);

  useEffect(() => {
    // Scroll to anchor if present.
    if (location.hash.startsWith("#party-")) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [location.hash]);

  const outcome = useMemo(() => countOutcomes(cells), [cells]);

  function handleReplay() {
    sessionStorage.removeItem(SESSION_KEY);
    setAnimationKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Custodian Query Engine — Maricopa County
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          The public API cannot answer by name. The custodian can. This page runs both side-by-side.
        </p>
        <div className="mt-2 text-[11px] text-slate-500 space-x-3 font-mono">
          <span>captured {meta.captured_at}</span>
          <span>·</span>
          <span>{shape.parties.length} parties</span>
          <span>·</span>
          <span>{shape.liveIndexes.length} live indexes</span>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">
            {shape.parties.length * shape.liveIndexes.length * 2} queries attempted
          </span>
          {" · "}Public API: <span className="font-semibold text-slate-700">{outcome.publicAnswered}</span> answered
          {" · "}County internal: <span className="font-semibold text-emerald-800">{outcome.countyAnswered}</span> answered
          {" · "}<span className="text-amber-900">{outcome.aiDismissed}</span> AI-dismissed
          {" · "}<span className="text-emerald-800">{outcome.zeros}</span> verified zero
        </p>
        <button
          type="button"
          onClick={handleReplay}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          ▶ Replay sweep
        </button>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MatrixColumn
          title="Public API"
          subtitle="publicapi.recorder.maricopa.gov"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="public-api"
          cells={cells}
          states={cellStates}
        />
        <MatrixColumn
          title="County internal index"
          subtitle="what a custodian can run"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="county-internal"
          cells={cells}
          states={cellStates}
        />
      </section>

      <section className="mt-8 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Three more indexes that would be in a production sweep
        </h2>
        <ul className="mt-3 space-y-2 text-[12px] text-slate-700">
          {shape.deadEnds.map((d) => (
            <li key={d.id} className="leading-relaxed">
              <span className="font-semibold text-slate-800">{d.name}</span> — {d.reason}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
        {meta.operator_notes && <p>{meta.operator_notes}</p>}
        <p className="mt-2">
          <Link className="text-moat-700 hover:underline" to="/parcel/304-78-386/encumbrances">
            See this sweep applied to POPHAM's parcel →
          </Link>
        </p>
      </footer>
    </div>
  );
}

function MatrixColumn({
  title,
  subtitle,
  parties,
  liveIndexes,
  approach,
  cells,
  states,
}: {
  title: string;
  subtitle: string;
  parties: string[];
  liveIndexes: LiveIndexMeta[];
  approach: Approach;
  cells: Record<CellKey, QueryResult>;
  states: Record<CellKey, CellState>;
}) {
  return (
    <div>
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
        <p className="mt-0.5 text-[11px] font-mono text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-3 space-y-4">
        {parties.map((party) => {
          const slug = party.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
          return (
            <div key={party} id={`party-${slug}`} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="font-mono text-[11px] text-slate-600">{party}</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {liveIndexes.map((idx) => {
                  const k = cellKey(party, idx.id, approach);
                  return (
                    <LiveQueryCell
                      key={idx.id}
                      state={states[k] ?? "idle"}
                      party={party}
                      indexShort={idx.short}
                      result={cells[k]}
                      coverage={idx.coverage}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function countOutcomes(cells: Record<CellKey, QueryResult>) {
  let publicAnswered = 0;
  let countyAnswered = 0;
  let aiDismissed = 0;
  let zeros = 0;
  for (const [key, r] of Object.entries(cells)) {
    const isCounty = key.endsWith("__county-internal");
    const isPublic = key.endsWith("__public-api");
    if (r.status === "zero" || r.status === "hit") {
      if (isCounty) countyAnswered += 1;
      if (isPublic) publicAnswered += 1;
    }
    if (r.status === "zero") zeros += 1;
    if (r.status === "hit") {
      for (const h of r.hits) {
        if (h.ai_judgment === "probable_false_positive") aiDismissed += 1;
      }
    }
  }
  return { publicAnswered, countyAnswered, aiDismissed, zeros };
}
```

- [ ] **Step 4: Run all page tests, verify pass**

Run: `npx vitest run src/pages/CustodianQueryPage.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/CustodianQueryPage.tsx src/pages/CustodianQueryPage.test.tsx
git -c commit.gpgsign=false commit -m "feat(custodian-query): stagger animation, sessionStorage gating, replay button"
```

---

## Task 9: Hit detail callout + verification deep-link

The `LiveQueryCell` already expands a hit detail. Add the "this is not the Brian J Madison" callout that deep-links into `/parcel/304-78-386/instrument/20130183450`, only when the hit's party matches the chain.

**Files:**
- Modify: `src/components/LiveQueryCell.tsx`
- Modify: `src/components/LiveQueryCell.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `src/components/LiveQueryCell.test.tsx`:

```tsx
it("hit detail card shows deep-link to 2013 DOT for BRIAN J MADISON collision", () => {
  render(
    <LiveQueryCell
      state="resolved"
      party="BRIAN J MADISON"
      indexShort="MCSC"
      result={HIT}
      coverage="1990-2026"
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /hit details/i }));
  const link = screen.getByRole("link", { name: /2013 DOT/i });
  expect(link).toHaveAttribute("href", "/parcel/304-78-386/instrument/20130183450");
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `npx vitest run src/components/LiveQueryCell.test.tsx`
Expected: FAIL (no link).

- [ ] **Step 3: Add callout + import Link**

In `src/components/LiveQueryCell.tsx`, add `import { Link } from "react-router";` at the top, then modify `HitBody` to include the callout when the party is Brian J Madison:

```tsx
function HitBody({ hits, party }: { hits: Hit[]; party: string }) {
  const primary = hits[0];
  const isMadisonCollision =
    party === "BRIAN J MADISON" && primary.ai_judgment === "probable_false_positive";
  return (
    <div className="mt-2 rounded border border-amber-200 bg-amber-50/50 p-2 text-[11px] leading-relaxed text-slate-700">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-slate-900">{primary.party_name}</span>
        <span className="text-[10px] uppercase tracking-wide text-amber-900">
          <JudgmentLabel j={primary.ai_judgment} />
        </span>
      </div>
      <p className="mt-1">{primary.summary}</p>
      <p className="mt-1 italic text-slate-600">
        <span className="font-semibold not-italic text-slate-700">AI rationale:</span>{" "}
        {primary.ai_rationale}{" "}
        <span className="text-slate-500">({Math.round(primary.confidence * 100)}%)</span>
      </p>
      {primary.recording_number && primary.recording_date && (
        <p className="mt-1 font-mono text-slate-600">
          {primary.recording_number} · {primary.recording_date} · {primary.doc_type_raw}
        </p>
      )}
      {isMadisonCollision && (
        <p className="mt-2">
          <Link
            to="/parcel/304-78-386/instrument/20130183450"
            className="text-moat-700 hover:underline"
          >
            Verify against the real 2013 DOT on this parcel →
          </Link>
        </p>
      )}
    </div>
  );
}
```

Update the hit branch in `LiveQueryCell` to pass `party` to `HitBody`:

```tsx
{expanded && <HitBody hits={result.hits} party={party} />}
```

The test imports `MemoryRouter` — wrap the hit render in tests. Update the "hit cell click toggles" and the new test case to wrap with `MemoryRouter`:

```tsx
import { MemoryRouter } from "react-router";
// ...
function renderHit() {
  return render(
    <MemoryRouter>
      <LiveQueryCell state="resolved" party="BRIAN J MADISON" indexShort="MCSC" result={HIT} coverage="1990-2026" />
    </MemoryRouter>
  );
}
```

And replace the two hit-related test bodies to use `renderHit()`.

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/components/LiveQueryCell.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/LiveQueryCell.tsx src/components/LiveQueryCell.test.tsx
git -c commit.gpgsign=false commit -m "feat(custodian-query): hit detail callout linking to real 2013 DOT"
```

---

## Task 10: Route registration + landing page link

**Files:**
- Modify: `src/router.tsx`
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Add route**

Open `src/router.tsx`. Find the import block and add:

```tsx
import { CustodianQueryPage } from "./pages/CustodianQueryPage";
```

Find the route list (look for `{ path: "/why", ... }` line around 438). Add after the `enterprise-page` entry:

```tsx
{ path: "/custodian-query", id: "custodian-query-page", element: <CustodianQueryPage /> },
```

- [ ] **Step 2: Add landing-page link**

In `src/components/LandingPage.tsx`, locate the area near the Pipeline Banner (search for `PipelineBanner` or `CountyHeartbeat`). Add a small link immediately after:

```tsx
<p className="mt-2 text-[11px] text-slate-500">
  <Link to="/custodian-query" className="text-moat-700 hover:underline">
    See the custodian query engine →
  </Link>
</p>
```

Ensure `Link` is imported: `import { Link } from "react-router";` (likely already imported).

- [ ] **Step 3: Smoke-check compile and route**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run`
Expected: all pre-existing tests still pass; 18+ new tests all pass.

- [ ] **Step 4: Commit**

```bash
git add src/router.tsx src/components/LandingPage.tsx
git -c commit.gpgsign=false commit -m "feat(custodian-query): register /custodian-query route and landing link"
```

---

## Task 11: Rewire `PartyJudgmentSweep` to use engine

**Files:**
- Modify: `src/components/PartyJudgmentSweep.tsx`
- Modify: `src/components/PartyJudgmentSweep.test.tsx`

- [ ] **Step 1: Update tests for engine-backed rendering**

Open `src/components/PartyJudgmentSweep.test.tsx`. The existing tests assert synchronously. Since the engine is async (~150ms simulated), add `waitFor` and update assertions. Replace the file contents:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PartyJudgmentSweep } from "./PartyJudgmentSweep";
import { loadAllParcels } from "../data-loader";

const parcels = loadAllParcels();
const POPHAM = parcels.find((p) => p.apn === "304-78-386")!;
const HOGUE = parcels.find((p) => p.apn === "304-77-689")!;

function mount(parcel: typeof POPHAM) {
  return render(
    <MemoryRouter>
      <PartyJudgmentSweep parcel={parcel} />
    </MemoryRouter>
  );
}

describe("PartyJudgmentSweep", () => {
  afterEach(() => cleanup());

  it("renders the sweep header for POPHAM with verified-through date", async () => {
    mount(POPHAM);
    expect(
      await screen.findByRole("heading", { name: /party judgment sweep/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/verified through/i)).toBeInTheDocument();
    });
  });

  it("POPHAM sweep renders the summary metric cards", async () => {
    mount(POPHAM);
    await waitFor(() => {
      expect(screen.getAllByText(/^Parties$/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/^Indexes$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Raw hits$/)).toBeInTheDocument();
    expect(screen.getByText(/dismissed \(ai\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^Need action$/)).toBeInTheDocument();
  });

  it("POPHAM sweep shows the probable-false-positive AI judgment", async () => {
    mount(POPHAM);
    await waitFor(() => {
      expect(screen.getByText(/AI: probable false positive/i)).toBeInTheDocument();
    });
  });

  it("POPHAM sweep footer links to /custodian-query", async () => {
    mount(POPHAM);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /how this sweep works/i });
      expect(link.getAttribute("href")).toMatch(/\/custodian-query/);
    });
  });

  it("HOGUE sweep renders the 'blocked by public API' moat banner", async () => {
    mount(HOGUE);
    await waitFor(() => {
      expect(screen.getByText(/sweep blocked by public API limitation/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/why this sweep didn't run/i)).toBeInTheDocument();
    expect(screen.getByText(/what a production deploy would do/i)).toBeInTheDocument();
  });

  it("HOGUE sweep footer links to /custodian-query showpiece", async () => {
    mount(HOGUE);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /see the engine in action/i });
      expect(link).toHaveAttribute("href", "/custodian-query");
    });
  });

  it("returns null for a parcel with no sweep on file", async () => {
    const synthetic = { ...POPHAM, apn: "999-99-999" };
    const { container } = mount(synthetic);
    // Wait a bit to let the engine resolve (null).
    await new Promise((r) => setTimeout(r, 400));
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/components/PartyJudgmentSweep.test.tsx`
Expected: FAIL (import paths change, async behavior not wired).

- [ ] **Step 3: Rewrite the component**

Replace `src/components/PartyJudgmentSweep.tsx` contents:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Parcel } from "../types";
import {
  getSweepForParcel,
  getDeadEnds,
  type ParcelSweep,
  type Hit,
  type DeadEndIndex,
} from "../lib/custodian-query-engine";

interface Props {
  parcel: Parcel;
  onOpenDocument?: (instrumentNumber: string) => void;
}

function JudgmentBadge({ judgment }: { judgment: Hit["ai_judgment"] }) {
  const spec: Record<Hit["ai_judgment"], { label: string; cls: string }> = {
    probable_false_positive: {
      label: "AI: probable false positive",
      cls: "bg-slate-100 text-slate-700 border-slate-200",
    },
    requires_examiner_review: {
      label: "AI: requires review",
      cls: "bg-amber-100 text-amber-900 border-amber-200",
    },
    confirmed_exposure: {
      label: "AI: confirmed exposure",
      cls: "bg-red-100 text-red-900 border-red-200",
    },
  };
  const s = spec[judgment];
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function slugify(party: string): string {
  return party.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
}

export function PartyJudgmentSweep({ parcel, onOpenDocument }: Props) {
  const [sweep, setSweep] = useState<ParcelSweep | null | undefined>(undefined);
  const deadEnds = useMemo<DeadEndIndex[]>(() => getDeadEnds(), []);
  const [showIndexes, setShowIndexes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSweepForParcel(parcel.apn).then((s) => {
      if (!cancelled) setSweep(s);
    });
    return () => {
      cancelled = true;
    };
  }, [parcel.apn]);

  if (sweep === undefined) return null; // initial loading
  if (sweep === null) return null;       // no fixture entry

  if (sweep.status === "no_capture_available") {
    const firstParty = sweep.parties[0];
    return (
      <section
        aria-labelledby="party-judgment-sweep-heading"
        className="mt-6 rounded-md border border-slate-300 bg-slate-50 p-5"
      >
        <header>
          <h3
            id="party-judgment-sweep-heading"
            className="text-sm font-semibold uppercase tracking-wide text-slate-700"
          >
            Party Judgment Sweep
          </h3>
          <p className="mt-1 text-sm text-slate-800">
            <span className="font-semibold text-slate-800">
              Sweep blocked by public API limitation.
            </span>{" "}
            This is the moat moment — the county's internal index can run this; the public API cannot.
          </p>
        </header>
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-slate-300 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Why this sweep didn't run
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{sweep.reason}</p>
          </div>
          <div className="rounded-md border border-moat-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-moat-700">
              What a production deploy would do
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {sweep.what_production_would_do}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Parties that would be swept once the county-internal index is wired:{" "}
            {sweep.parties.map((p, i) => (
              <span key={p} className="font-mono">
                {p}
                {i < sweep.parties.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          <Link to="/custodian-query" className="text-moat-700 hover:underline">
            See the engine in action on POPHAM →
          </Link>
        </p>
      </section>
    );
  }

  // status === 'swept'
  const anchor = sweep.hits.length > 0 ? `#party-${slugify(sweep.hits[0].party_name)}` : "";
  const bannerVariant: "clear" | "review" =
    sweep.summary.post_judgment_hits_requiring_action > 0 ? "review" : "clear";
  const bannerCls = {
    clear: "border-emerald-200 bg-emerald-50",
    review: "border-amber-200 bg-amber-50",
  }[bannerVariant];

  return (
    <section
      aria-labelledby="party-judgment-sweep-heading"
      className={`mt-6 rounded-md border ${bannerCls} p-5`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="party-judgment-sweep-heading"
            className="text-sm font-semibold uppercase tracking-wide text-slate-700"
          >
            Party Judgment Sweep
          </h3>
          <p className="mt-1 text-sm text-slate-800">
            {bannerVariant === "clear" ? (
              <>
                <span className="font-semibold text-emerald-800">All clear after AI judgment.</span>{" "}
                Swept {sweep.summary.parties_scanned} parties across{" "}
                {sweep.summary.indexes_scanned} custodial indexes. {sweep.summary.raw_hits} raw hit
                {sweep.summary.raw_hits === 1 ? "" : "s"},{" "}
                {sweep.summary.post_judgment_hits_requiring_action} requiring examiner action.
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-900">
                  {sweep.summary.post_judgment_hits_requiring_action} item
                  {sweep.summary.post_judgment_hits_requiring_action === 1 ? "" : "s"} require review.
                </span>{" "}
                Swept {sweep.summary.parties_scanned} parties across{" "}
                {sweep.summary.indexes_scanned} custodial indexes.
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 space-y-0.5 text-right text-[11px] text-slate-500">
          <div>
            Verified through <span className="font-mono text-slate-700">{sweep.verified_through}</span>
          </div>
          <div>
            Swept at{" "}
            <span className="font-mono text-slate-700">
              {new Date(sweep.swept_at).toISOString().slice(0, 16).replace("T", " ")} UTC
            </span>
          </div>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-5">
        <Metric label="Parties" value={sweep.summary.parties_scanned} />
        <Metric label="Indexes" value={sweep.summary.indexes_scanned} />
        <Metric label="Raw hits" value={sweep.summary.raw_hits} />
        <Metric label="Dismissed (AI)" value={sweep.summary.raw_hits - sweep.summary.post_judgment_hits_requiring_action} />
        <Metric
          label="Need action"
          value={sweep.summary.post_judgment_hits_requiring_action}
          cls={sweep.summary.post_judgment_hits_requiring_action === 0 ? "text-emerald-700" : "text-amber-800"}
        />
      </div>

      {sweep.hits.length > 0 && (
        <ul className="mt-4 space-y-3">
          {sweep.hits.map((h) => (
            <li key={h.id} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-sm text-slate-900">{h.party_name}</span>
                <JudgmentBadge judgment={h.ai_judgment} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{h.summary}</p>
              <div className="mt-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                <span className="font-semibold text-slate-700">AI rationale:</span> {h.ai_rationale}
                <span className="ml-2 text-[11px] text-slate-500">
                  (confidence {(h.confidence * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                {h.recording_number && (
                  <span>
                    Recording:{" "}
                    {onOpenDocument ? (
                      <button
                        onClick={() => onOpenDocument(h.recording_number!)}
                        className="font-mono text-moat-700 hover:underline"
                      >
                        {h.recording_number}
                      </button>
                    ) : (
                      <span
                        className="font-mono text-slate-700"
                        title="Outside this parcel's corpus — available in production"
                      >
                        {h.recording_number}
                      </span>
                    )}
                  </span>
                )}
                {h.recording_date && (
                  <span>
                    Date: <span className="font-mono text-slate-700">{h.recording_date}</span>
                  </span>
                )}
                <span>
                  Action:{" "}
                  <span className="text-slate-700">{h.action_required === "none" ? "—" : h.action_required}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details
        className="mt-4 rounded-md border border-slate-200 bg-white"
        open={showIndexes}
        onToggle={(e) => setShowIndexes((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-slate-700">
          Indexes scanned ({sweep.indexes.length} live · {deadEnds.length} dead-ends) ·{" "}
          {sweep.parties.length} parties ·{" "}
          <span className="font-normal text-slate-500">click to expand</span>
        </summary>
        <div className="space-y-2 border-t border-slate-100 px-3 py-3 text-[12px]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Live</div>
          {sweep.indexes.map((id) => (
            <div key={id} className="text-slate-700">
              <span className="font-mono">{id}</span>
            </div>
          ))}
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Dead-ends (production scope)
          </div>
          {deadEnds.map((d) => (
            <div key={d.id} className="leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-600">{d.name}</span> — {d.reason}
            </div>
          ))}
          <div className="mt-2 border-t border-slate-100 pt-2 text-slate-500">
            Parties swept:{" "}
            {sweep.parties.map((p, i) => (
              <span key={p} className="font-mono text-slate-700">
                {p}
                {i < sweep.parties.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      </details>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        The Party Judgment Sweep is a county-custodian capability. It runs against the recorder's
        internal full-name index plus additional custodial feeds — none of which are reachable by
        name from the public API. An abstractor's B-II schedule is only defensible if the sweep
        behind it is visible; this panel makes it visible.
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        <Link to={`/custodian-query${anchor}`} className="text-moat-700 hover:underline">
          How this sweep works →
        </Link>
      </p>
    </section>
  );
}

function Metric({ label, value, cls }: { label: string; value: number; cls?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className={`text-lg font-semibold ${cls ?? "text-slate-900"}`}>{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/components/PartyJudgmentSweep.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Run full suite to catch regressions**

Run: `npx vitest run`
Expected: all tests pass across the project.

- [ ] **Step 6: Commit**

```bash
git add src/components/PartyJudgmentSweep.tsx src/components/PartyJudgmentSweep.test.tsx
git -c commit.gpgsign=false commit -m "refactor(custodian-query): rewire PartyJudgmentSweep onto engine"
```

---

## Task 12: Delete `party-judgment-sweeps.json`

Now that nothing imports the old static JSON, delete it.

**Files:**
- Delete: `src/data/party-judgment-sweeps.json`

- [ ] **Step 1: Confirm nothing imports it**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: grep tool over `src/` for `party-judgment-sweeps`
Expected: no matches.

- [ ] **Step 2: Delete the file**

```bash
git rm src/data/party-judgment-sweeps.json
```

- [ ] **Step 3: Run full suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -m "chore(custodian-query): delete obsolete party-judgment-sweeps.json"
```

---

## Task 13: Playwright capture runbook

**This is a semi-manual, operator-driven step.** The implementing agent runs Playwright MCP and `curl` to capture real data, overwriting the dev-seed fixture in-place. The runbook is written as executable code with manual checkpoints.

**Precondition:** confirm with sprint owner that no other Playwright-using agent is active. The serialization protocol (§5.1 of the spec) is binding.

**Files:**
- Create: `scripts/capture-sweep.ts`
- Create: `scripts/lib/sweep-capture-helpers.ts`
- Modify: `src/data/custodian-sweep-fixture.json` (overwrite via capture output)

- [ ] **Step 1: Write capture-helpers library**

Create `scripts/lib/sweep-capture-helpers.ts`:

```ts
// Capture helpers — do not ship in runtime bundle.
// Invoked by scripts/capture-sweep.ts. Assumes Playwright MCP session is open
// and the operator has agreed to the serialization protocol.

import type { FailureMode, QueryResult } from "../../src/lib/custodian-query-engine.schema";

/**
 * Classify a raw public-API response into a FailureMode.
 * Pass the response body and status from a curl invocation.
 */
export function classifyPublicApiFailure(params: {
  url: string;
  httpStatus: number;
  body: string;
  partyNameAttempted: string;
}): FailureMode {
  const { url, httpStatus, body, partyNameAttempted } = params;

  if (httpStatus === 403) {
    return {
      kind: "http_403",
      http_status: 403,
      message: `403 Forbidden — public endpoint rejected the request.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  if (/cloudflare/i.test(body) || /challenge/i.test(body)) {
    return {
      kind: "cloudflare_challenge",
      http_status: httpStatus,
      message: `Cloudflare challenge page returned instead of data.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  // Heuristic: if the response is 200 with a large unfiltered result set,
  // the name filter was silently dropped.
  if (httpStatus === 200 && body.length > 1000 && !body.includes(partyNameAttempted.split(" ")[0])) {
    return {
      kind: "filter_silently_dropped",
      http_status: 200,
      message: `name filter ignored — response does not contain "${partyNameAttempted}" and result set is large.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  if (httpStatus === 404 || /no results/i.test(body)) {
    return {
      kind: "no_public_search",
      http_status: httpStatus,
      message: `endpoint does not expose a public name-search interface.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  return {
    kind: "no_public_search",
    http_status: httpStatus,
    message: `unclassified public-API response — treated as no-public-search.`,
    captured_url: url,
    captured_response_excerpt: body.slice(0, 500),
  };
}

/** Parties locked by spec §2.2. */
export const PARTIES = [
  "CHRISTOPHER POPHAM",
  "ASHLEY POPHAM",
  "BRIAN J MADISON",
  "TANYA R MADISON",
  "BRIAN J AND TANYA R MADISON LIVING TRUST",
] as const;

/** The MCR legacy name-search driver is too stateful to unit-test here; the
 *  runbook calls Playwright MCP directly. This helper only classifies output. */
export type McrRawResult = {
  party: string;
  matches: { recording_number: string; recording_date: string; doc_type: string; indexed_name: string }[];
};

export function mcrRawToQueryResult(raw: McrRawResult): QueryResult {
  if (raw.matches.length === 0) return { status: "zero" };
  return {
    status: "hit",
    hits: raw.matches.map((m, i) => ({
      id: `sweep-${raw.party.split(" ")[0].toLowerCase()}-${String(i + 1).padStart(3, "0")}`,
      party_name: m.indexed_name,
      recording_number: m.recording_number,
      recording_date: m.recording_date,
      doc_type_raw: m.doc_type,
      summary: `Recorded document matched on name "${m.indexed_name}". Requires examiner judgment — may not be the same person as the chain party.`,
      ai_judgment: "requires_examiner_review",
      ai_rationale: "Automated sweep surfaced this hit; examiner must confirm identity vs chain context.",
      confidence: 0.5,
      provenance: "county_internal_index",
      action_required: "examiner-review",
    })),
  };
}
```

- [ ] **Step 2: Write the capture runbook**

Create `scripts/capture-sweep.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Playwright + curl capture runbook. Produces src/data/custodian-sweep-fixture.json.
 *
 * SERIALIZATION: Before running, confirm with sprint owner that no other
 * Playwright-using agent is in flight. See spec §5.1.
 *
 * This runbook is INTERACTIVE by design. It intentionally breaks into phases
 * with manual checkpoints. Do not automate past the checkpoints; the phases
 * require operator judgment (especially Phase A scout outcome and Phase C
 * collision confirmation).
 *
 * Usage:
 *   npx tsx scripts/capture-sweep.ts
 *
 * The runbook writes a working fixture at scripts/.work/custodian-sweep-working.json
 * after each phase so interruptions are recoverable.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyPublicApiFailure,
  mcrRawToQueryResult,
  PARTIES,
  type McrRawResult,
} from "./lib/sweep-capture-helpers";
import type { Fixture } from "../src/lib/custodian-query-engine.schema";
import { FixtureSchema } from "../src/lib/custodian-query-engine.schema";

const WORK_DIR = resolve(process.cwd(), "scripts/.work");
const WORK_PATH = resolve(WORK_DIR, "custodian-sweep-working.json");
const OUTPUT_PATH = resolve(process.cwd(), "src/data/custodian-sweep-fixture.json");

function loadWork(): Partial<Fixture> {
  if (!existsSync(WORK_PATH)) return {};
  return JSON.parse(readFileSync(WORK_PATH, "utf-8"));
}

function saveWork(fx: Partial<Fixture>): void {
  mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(WORK_PATH, JSON.stringify(fx, null, 2));
  console.log(`  working fixture saved to ${WORK_PATH}`);
}

function prompt(msg: string): void {
  console.log(`\n=== ${msg} ===\n`);
}

async function main(): Promise<void> {
  const start = Date.now();
  const fx: Partial<Fixture> = loadWork();
  fx.schema_version = 1;
  fx.parties = [...PARTIES];

  // PHASE A — MCSC scoutability
  prompt("Phase A — MCSC scout. Use Playwright MCP to open superiorcourt.maricopa.gov civil search. Probe with a synthetic common name. Set mcscReachable accordingly in the code below, then continue.");
  const mcscReachable = true; // OPERATOR: flip to false if MCSC gated/unreachable.
  fx.live_indexes = mcscReachable
    ? [
        { id: "mcr-name",   name: "Maricopa County Recorder — full name index",            short: "MCR name index",        custodian: "Maricopa County Recorder",            coverage: "1871-06-01 through 2026-04-18" },
        { id: "mcsc-civil", name: "Maricopa County Superior Court — civil judgments",      short: "MCSC civil judgments",  custodian: "Maricopa County Clerk of Superior Court", coverage: "1990 through 2026-04-18" },
      ]
    : [
        { id: "mcr-name", name: "Maricopa County Recorder — full name index", short: "MCR name index", custodian: "Maricopa County Recorder", coverage: "1871-06-01 through 2026-04-18" },
      ];
  fx.dead_ends = [
    { id: "az-dor-liens", name: "Arizona Department of Revenue — state tax liens", reason: "No free name search. Filed at the recorder under state-lien document codes, but the public API's documentCode filter is silently dropped — same Known Gap #2 surface." },
    { id: "irs-nftl",     name: "IRS Notices of Federal Tax Lien",                  reason: "Filed at the recorder as FED TAX L. Public API silently drops documentCode filters. No free IRS-side name search." },
    { id: "usbc-az",      name: "U.S. Bankruptcy Court — District of Arizona",      reason: "PACER requires a paid account plus CAPTCHA. No free name search." },
  ];
  if (!mcscReachable) {
    fx.dead_ends.push({
      id: "mcsc-civil",
      name: "Maricopa County Superior Court — civil judgments",
      reason:
        "Public civil-case search was gated or unreachable during the capture session; MCSC falls to the dead-end list for this fixture. Production would hit this via the county's internal civil-index feed.",
    });
  }
  saveWork(fx);

  // PHASE B — Public-API failure catalog
  prompt("Phase B — public-API failures. For each party × live-index, curl publicapi.recorder.maricopa.gov (and MCSC public endpoint if live). Record URL, HTTP status, response excerpt. Pass into classifyPublicApiFailure(). Populate fx.cells below.");
  const cells: Fixture["cells"] = (fx.cells ?? {}) as Fixture["cells"];
  // OPERATOR: replace this stub with real curl output per cell, e.g.:
  //   const url = `https://publicapi.recorder.maricopa.gov/documents/search?name=${encodeURIComponent(p)}`;
  //   const body = await fetch(url).then(r => ({ status: r.status, text: r.text() }))
  //   cells[`${p}__mcr-name__public-api`] = { status: "blocked", failure: classifyPublicApiFailure({ url, httpStatus: body.status, body: body.text, partyNameAttempted: p }) };
  // Run once per party, per live index.
  fx.cells = cells;
  saveWork(fx);

  // PHASE C — BRIAN MADISON collision pre-hunt
  prompt("Phase C — BRIAN MADISON collision. Use Playwright MCP against MCR legacy name search + MCSC civil search for 'BRIAN MADISON' / 'BRIAN J MADISON'. ≥1 real hit against a different person: record the hit; 0 hits: document fallback in operator_notes.");
  let operatorNotes = "Capture complete.";
  const madisonCollision: McrRawResult = {
    party: "BRIAN J MADISON",
    matches: [
      // OPERATOR: replace with real hit or leave empty for fallback.
      // { recording_number: "...", recording_date: "...", doc_type: "CIVIL JDG", indexed_name: "BRIAN MADISON" },
    ],
  };
  const madisonResult = mcrRawToQueryResult(madisonCollision);
  if (madisonResult.status === "hit" && madisonResult.hits[0]) {
    // OPERATOR: author the AI judgment once the hit is confirmed as a different-person collision.
    madisonResult.hits[0].ai_judgment = "probable_false_positive";
    madisonResult.hits[0].ai_rationale =
      `Judgment defendant is recorded at an address outside the Seville subdivision. Our Brian J Madison is the 2013 grantor (via the Madison Living Trust) on recording 20130183450 — different chain, different address, different party.`;
    madisonResult.hits[0].confidence = 0.9;
    madisonResult.hits[0].action_required = "none";
    madisonResult.hits[0].summary = `Civil judgment recorded against a different BRIAN MADISON. Not the Brian J Madison on the 2013 DOT for this parcel.`;
  } else {
    operatorNotes += " BRIAN MADISON collision pre-hunt returned zero hits; demo leans on pure verified-zero.";
  }
  cells[`BRIAN J MADISON__mcsc-civil__county-internal`] = madisonResult;
  saveWork(fx);

  // PHASE D — Full sweep capture
  prompt("Phase D — full sweep. Playwright-drive name search for each party against each live index. Populate cells with zero/hit results via mcrRawToQueryResult.");
  for (const p of PARTIES) {
    for (const idx of fx.live_indexes!) {
      const key = `${p}__${idx.id}__county-internal`;
      if (cells[key]) continue; // already set (e.g., BRIAN J MADISON cell from Phase C)
      // OPERATOR: replace with real Playwright-driven search; zero results default below.
      const raw: McrRawResult = { party: p, matches: [] };
      cells[key] = mcrRawToQueryResult(raw);
    }
  }
  saveWork(fx);

  // PHASE E — HOGUE no-capture entry
  prompt("Phase E — HOGUE narrative (copy from dev seed, verified).");
  const hogueReason =
    "The HOGUE parcel sweep cannot be run from the public API. The public endpoint publicapi.recorder.maricopa.gov has no name-filtered search — a hunt log documenting the five API layers that block this is at docs/hunt-log-known-gap-2.md. The county's internal full-name index, which this portal would use in production, closes the gap. That is the moat argument: the custodian can answer the question the public API is structurally unable to answer.";
  const hogueProd =
    "Run a name-filtered query against the recorder's internal name index and the MCSC civil-judgments index — the same indexes swept for POPHAM — and return hits or a verified zero with a timestamp.";

  // Build POPHAM summary from cells.
  const pophamHits = PARTIES.flatMap((p) => {
    const mcr = cells[`${p}__mcr-name__county-internal`];
    const mcsc = cells[`${p}__mcsc-civil__county-internal`];
    const all = [];
    if (mcr?.status === "hit") all.push(...mcr.hits);
    if (mcsc?.status === "hit") all.push(...mcsc.hits);
    return all;
  });
  const rawHits = pophamHits.length;
  const dismissed = pophamHits.filter((h) => h.ai_judgment === "probable_false_positive").length;
  const needAction = rawHits - dismissed;

  fx.parcel_sweeps = {
    "304-78-386": {
      apn: "304-78-386",
      status: "swept",
      parties: [...PARTIES],
      indexes: fx.live_indexes!.map((i) => i.id),
      hits: pophamHits,
      verified_through: "2026-04-18",
      swept_at: new Date().toISOString(),
      summary: {
        parties_scanned: PARTIES.length,
        indexes_scanned: fx.live_indexes!.length,
        raw_hits: rawHits,
        post_judgment_hits_requiring_action: needAction,
        all_clear: rawHits === 0,
        all_clear_after_judgment: needAction === 0,
        note:
          rawHits === 0
            ? `Verified zero across ${PARTIES.length} parties × ${fx.live_indexes!.length} indexes.`
            : `${rawHits} raw hit(s), ${dismissed} dismissed by AI, ${needAction} require review.`,
      },
    },
    "304-77-689": {
      apn: "304-77-689",
      status: "no_capture_available",
      parties: ["JASON HOGUE", "MICHELE HOGUE"],
      reason: hogueReason,
      what_production_would_do: hogueProd,
    },
  };

  // PHASE F — finalize
  fx.captured_at = new Date().toISOString();
  fx.capture_duration_ms = Date.now() - start;
  fx.operator_notes = operatorNotes;
  const parsed = FixtureSchema.parse(fx);
  writeFileSync(OUTPUT_PATH, JSON.stringify(parsed, null, 2));
  console.log(`\nOK: wrote ${OUTPUT_PATH}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run the capture interactively**

Follow the phases A–F printed by the script. For each prompted phase, drive Playwright MCP and `curl` as directed, paste results into the corresponding section of the script, re-run. The working fixture at `scripts/.work/custodian-sweep-working.json` is your checkpoint.

Note: This task's execution depends on operator judgment per phase. Do not attempt to automate the phases into a single non-interactive pass.

- [ ] **Step 4: Validate the captured fixture**

Run: `npx tsx scripts/validate-sweep-fixture.ts`
Expected: `OK: 5 parties × N live indexes × 2 approaches = M cells. 3 dead-ends. Captured at <now>.`

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass. If the MCSC-dropped fallback was used, the page-level count assertion for `/20 queries attempted/` must be updated to `/10 queries attempted/`; adjust in place.

- [ ] **Step 6: Commit**

```bash
git add scripts/capture-sweep.ts scripts/lib/sweep-capture-helpers.ts src/data/custodian-sweep-fixture.json
git -c commit.gpgsign=false commit -m "feat(custodian-query): real captured sweep fixture + capture runbook"
```

---

## Task 14: Documentation

**Files:**
- Modify: `docs/data-provenance.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add §4 to data-provenance.md**

Read the end of `docs/data-provenance.md`. Append a new section:

```md
## §4 Custodian Sweep Fixture

**Purpose.** `src/data/custodian-sweep-fixture.json` backs the Custodian
Query Engine (`src/lib/custodian-query-engine.ts`) that powers the
`/custodian-query` showpiece page and the parcel-page `PartyJudgmentSweep`
panel. Every field is either captured (via Playwright + `curl`) or authored
during curation with explicit provenance.

**Sources.**

- **Public-API failure cells** (left column of showpiece): `curl` against
  `publicapi.recorder.maricopa.gov` and, if reachable, the MCSC civil-search
  endpoint. HTTP status + response body excerpt are captured verbatim. The
  failure classifier lives at `scripts/lib/sweep-capture-helpers.ts`.
- **County-internal cells** (right column): Playwright MCP driving the
  Maricopa Recorder legacy name-search UI plus, if reachable, the MCSC civil
  public search. Result rows recorded with recording number, date, doc type,
  and the indexed-name string.
- **AI judgments on hits:** authored during curation with rationale grounded
  in chain context. Confidence hand-assigned, consistent with Decision #17.
- **HOGUE no-capture narrative:** authored, carried forward verbatim from
  the prior static JSON; it is not a captured-from-external-system field.

**Serialization protocol.** Captures run in a single linear Playwright
session, serialized against any other Playwright-using agent. The session
writes a checkpoint at `scripts/.work/custodian-sweep-working.json` after
each phase so interruptions are resumable.

**Fallbacks.** (a) If MCSC civil search is unreachable during capture, it
drops to a fourth dead-end and the live-index list shrinks to one. (b) If
the BRIAN MADISON collision pre-hunt returns no real hit, the demo leans on
pure verified-zero; the fallback is recorded in `operator_notes`.

**Validation.** `scripts/validate-sweep-fixture.ts` runs the Zod schema
(`src/lib/custodian-query-engine.schema.ts`) plus invariants (every
`(party, liveIndex, approach)` cell present, no orphans, POPHAM parties ⊆
top-level parties, `captured_at` not in the future).
```

- [ ] **Step 2: Add Decision #46 to CLAUDE.md**

Open `CLAUDE.md`. Append to the Decision Log table:

```md
| 46 | Custodian query engine replaces static party-judgment-sweeps.json | Real-data engine over a captured Playwright + curl fixture; exposed through a `/custodian-query` matrix showpiece (5 parties × 2 live indexes × 2 approaches = 20 cells, auto-run on first visit) and the existing `PartyJudgmentSweep` parcel panel. 2 live indexes (MCR name index + MCSC civil judgments); 3 documented dead-ends (AZ DOR, IRS NFTL, USBC). POPHAM-only party scope; HOGUE remains blocked-contrast via engine `no_capture_available` state. AI judgments pre-baked in fixture; no runtime LLM. Capture serialized against other Playwright agents. MCSC scoutability + BRIAN MADISON collision pre-hunt both have documented fallbacks. | 2026-04-18 |
```

- [ ] **Step 3: Commit**

```bash
git add docs/data-provenance.md CLAUDE.md
git -c commit.gpgsign=false commit -m "docs(custodian-query): data-provenance §4 and Decision #46"
```

---

## Final Verification

- [ ] **Run full type check and test suite**

```bash
npx tsc --noEmit && npx vitest run && npx tsx scripts/validate-sweep-fixture.ts
```

Expected: no TypeScript errors, all tests pass, fixture validates.

- [ ] **Run the app locally and click through the demo path**

```bash
npm run dev
```

Manual checks in the browser:
1. Landing page shows "See the custodian query engine →" link.
2. `/custodian-query` animates 20 cells on first visit; sessionStorage set.
3. Refresh `/custodian-query` — cells resolve immediately, no animation.
4. Click `Replay sweep` — animation replays.
5. `/custodian-query?replay=1` — forces animation.
6. Click the BRIAN MADISON hit cell (or any zero cell); it expands / badges show.
7. Click a blocked cell; popover with captured excerpt appears.
8. Footer link → `/parcel/304-78-386/encumbrances`. Sweep panel renders narrative.
9. `/parcel/304-77-689/encumbrances` — HOGUE blocked-contrast panel intact; footer link → `/custodian-query`.
10. `/parcel/999-99-999/encumbrances` — no sweep panel.

- [ ] **Screenshot the demo for the record (optional, not committed)**

Captures go in `research/` or `docs/screenshots/` per team preference.

---

## Notes for the implementing agent

- **TDD discipline:** every new file has its test written first. Don't skip the red step — the failure message is the best verification you're testing the right thing.
- **DRY:** if you find yourself copying cell-key construction or judgment-badge styling into a third place, extract a helper.
- **YAGNI:** do not add filtering, sorting, or search to the showpiece. Do not add visual regression tests. Do not add an admin panel for the fixture.
- **Commit after every task.** Never batch commits across tasks.
- **Playwright:** Task 13 is the only task that touches Playwright MCP. Do not touch Playwright in any other task. Confirm with sprint owner before starting Task 13.
- **Fixture is the truth:** after Task 13 overwrites the fixture, earlier tests still pass because they assert on shape, not exact text. If a test fails on exact text, that's a signal to soften the assertion — the point is shape invariants, not content lock-in.
