# Custodian Query Engine — Design

**Date:** 2026-04-18
**Status:** Brainstorm complete, ready for plan
**Author:** Klaus + Claude (brainstorm session 2026-04-18)
**Supersedes:** static `src/data/party-judgment-sweeps.json` content

## 1. Mission

Demonstrate — not narrate — the county custodial moat by building one shared query engine over real captured index data, exposed through two surfaces:

1. `/custodian-query` — a stand-alone showpiece page that animates 20 queries (5 parties × 2 live indexes × 2 approaches) side-by-side, with real failure modes on the public-API side and real hit/zero outcomes on the county-internal side.
2. `PartyJudgmentSweep` — the existing parcel-page panel, rewired to consume the same engine. POPHAM renders the narrative sweep; HOGUE renders the `no_capture_available` contrast.

The thesis: the public API is structurally unable to answer queries that the custodian can. The showpiece makes that asymmetry visible in parallel; the parcel panel applies it to a specific examiner workflow.

## 2. Decisions locked during brainstorm

| # | Decision |
|---|---|
| 2.1 | **Two live indexes:** Maricopa Recorder full-name index + MCSC civil judgments. Three documented dead-ends (AZ DOR, IRS NFTL, USBC AZ). |
| 2.2 | **POPHAM-only party scope:** 5 parties, 10 live queries. HOGUE remains the deliberate blocked-contrast parcel. |
| 2.3 | **Pre-hunt BRIAN MADISON collision** during serialized Playwright capture to seed the one visceral AI-judgment moment. |
| 2.4 | **Async engine with simulated 150–300 ms latency.** AI judgments pre-computed in the fixture; no live LLM. No MSW. |
| 2.5 | **Showpiece layout A:** matrix, auto-run on first visit (gated by `sessionStorage`), `Replay` button for re-watches. |
| 2.6 | **HOGUE via engine `no_capture_available` state.** Existing blocked-panel narrative survives intact, sourced from the engine instead of hand-authored JSON. |

## 3. Architecture

One engine, three surfaces (two visual: showpiece + POPHAM panel; one narrative: HOGUE panel):

```
[ scripts/capture-sweep.ts  (offline Playwright + curl) ]
                │
                ▼
[ src/data/custodian-sweep-fixture.json  (committed) ]
                │
                ▼
[ src/lib/custodian-query-engine.ts ]
          │              │              │
          ▼              ▼              ▼
   CustodianQueryPage  PartyJudgmentSweep  PartyJudgmentSweep
   (/custodian-query)    (POPHAM panel)     (HOGUE panel)
```

- Engine is a pure async API over a Zod-validated fixture. No React, no fetch, no classes.
- Fixture is captured once, committed to the repo, replayed at runtime.
- Capture script is dev-only; Playwright does not ship in the app bundle.
- AI rationales are fixture data; inference runs offline during curation.
- No runtime network calls to Maricopa, the IRS, PACER, or the Anthropic API.

## 4. Engine contract

```ts
// src/lib/custodian-query-engine.ts

export type PartyName = string;
export type IndexId = 'mcr-name' | 'mcsc-civil';
export type Approach = 'public-api' | 'county-internal';

export type QueryResult =
  | { status: 'hit'; hits: Hit[] }
  | { status: 'zero' }
  | { status: 'blocked'; failure: FailureMode }
  | { status: 'no_capture_available'; reason: string; what_production_would_do: string };

export type Hit = {
  id: string;
  party_name: string;                 // indexed name as returned (may differ from query)
  recording_number?: string;
  recording_date?: string;
  doc_type_raw?: string;
  summary: string;
  ai_judgment: 'probable_false_positive' | 'requires_examiner_review' | 'confirmed_exposure';
  ai_rationale: string;
  confidence: number;                 // [0, 1]
  provenance: 'county_internal_index' | 'state_index_feed' | 'federal_index_feed' | 'manual_entry';
  action_required: string;
};

export type FailureMode = {
  kind:
    | 'cloudflare_challenge'
    | 'http_403'
    | 'filter_silently_dropped'
    | 'pagination_broken'
    | 'viewstate_required'
    | 'captcha_required'
    | 'paywall'
    | 'no_public_search';
  http_status?: number;
  message: string;                    // one-line human summary
  captured_url?: string;
  captured_response_excerpt?: string; // up to ~500 chars, for popover
};

export type DeadEndIndex = {
  id: 'az-dor-liens' | 'irs-nftl' | 'usbc-az';
  name: string;
  reason: string;
};

export type ParcelSweep =
  | {
      apn: string;
      status: 'swept';
      parties: PartyName[];
      indexes: IndexId[];
      hits: Hit[];
      summary: SweepSummary;
      verified_through: string;
      swept_at: string;
    }
  | {
      apn: string;
      status: 'no_capture_available';
      parties: PartyName[];
      reason: string;
      what_production_would_do: string;
    };

export type SweepSummary = {
  parties_scanned: number;
  indexes_scanned: number;
  raw_hits: number;
  post_judgment_hits_requiring_action: number;
  all_clear: boolean;
  all_clear_after_judgment: boolean;
  note: string;
};

// Single-cell query. Awaits 150–300 ms simulated latency, then returns fixture result.
export async function queryIndex(
  party: PartyName,
  indexId: IndexId,
  approach: Approach
): Promise<QueryResult>;

// Showpiece frame metadata (parties, live-index metadata, dead-end list).
// Does NOT pre-resolve cells — matrix component calls queryIndex per cell
// so each cell owns its own spinner → result animation.
export function getShowpieceShape(): {
  parties: PartyName[];
  liveIndexes: { id: IndexId; name: string; short: string; custodian: string; coverage: string }[];
  deadEnds: DeadEndIndex[];
};

// Per-parcel sweep surface (what PartyJudgmentSweep consumes).
// Returns `null` for APNs not present in the fixture (e.g., neighbors, unknown
// parcels) so the consuming component can `return null` and preserve today's
// behavior of not rendering a sweep panel on non-curated parcels. HOGUE has
// an explicit fixture entry and therefore returns a `no_capture_available`
// `ParcelSweep`, not null.
export async function getSweepForParcel(apn: string): Promise<ParcelSweep | null>;

// Capture session metadata (single source of truth for "Swept at" timestamps).
export function getCaptureMetadata(): {
  captured_at: string;       // ISO 8601
  capture_duration_ms: number;
  operator_notes?: string;
};
```

### 4.1 Behavioral notes

- Fixture loads once per session, memoized. Schema validation runs on first load; failures throw.
- `queryIndex` applies random latency in `[150, 300)` ms per call via `await new Promise(r => setTimeout(r, ...))`. Latency is runtime-only, never captured.
- `queryIndex` for an unknown party throws with a useful error message.
- `getSweepForParcel(apn)` returns `null` for APNs with no fixture entry. HOGUE returns a `no_capture_available` `ParcelSweep`; unknown parcels return `null`.
- The matrix component fires `queryIndex` 20 times in parallel with 50 ms stagger; each cell owns its own spinner.

## 5. Capture strategy

The capture is a one-time offline curation session using Playwright MCP + `curl`. It is serialized against any other Playwright-using agent.

### 5.1 Serialization protocol

1. Before starting: confirm no other agent has Playwright in flight.
2. During: single linear session, no concurrent `mcp__playwright__*` calls.
3. Atomic per-cell writes to a working JSON so interruptions are resumable.
4. After: browser closed cleanly; handoff note written to `operator_notes`.

### 5.2 Phases

| Phase | Purpose | Budget |
|---|---|---|
| A — MCSC scout | Confirm MCSC civil-judgment public search is reachable. If not, drop MCSC to dead-ends without redesign. | 30 min |
| B — Public-API failure catalog | 10 real `curl` calls against `publicapi.recorder.maricopa.gov` (and MCSC public search if live) to capture per-cell failure modes. | 30 min |
| C — BRIAN MADISON collision pre-hunt | Playwright-drive MCR legacy name search + MCSC civil search for real namesakes. ≥1 hit = AI-judgment seed; 0 hits = verified-zero fallback documented in `operator_notes`. | 30 min |
| D — Full sweep capture | Playwright-drive all 10 county-internal queries (5 parties × 2 live indexes). Record hits/zeros. | 45 min |
| E — HOGUE no-capture entry | Author `no_capture_available` narrative from existing static JSON copy. | 5 min |
| F — Fixture write + validation | Assemble final JSON, run `tsx scripts/validate-sweep-fixture.ts`, commit. | 15 min |

**Total:** ~2.5 hours single session.

### 5.3 Fixture shape (abridged)

```jsonc
{
  "schema_version": 1,
  "captured_at": "2026-04-18T19:32:00Z",
  "capture_duration_ms": 9120000,
  "operator_notes": "MCSC reachable; BRIAN J MADISON collision found on a civil judgment from 2019.",
  "parties": ["CHRISTOPHER POPHAM", "ASHLEY POPHAM", "BRIAN J MADISON", "TANYA R MADISON", "BRIAN J AND TANYA R MADISON LIVING TRUST"],
  "live_indexes": [
    { "id": "mcr-name", "name": "Maricopa County Recorder — full name index", "short": "MCR name index", "custodian": "Maricopa County Recorder", "coverage": "1871-06-01 through 2026-04-18" },
    { "id": "mcsc-civil", "name": "Maricopa County Superior Court — civil judgments", "short": "MCSC civil judgments", "custodian": "Maricopa County Clerk of Superior Court", "coverage": "1990 through 2026-04-18" }
  ],
  "dead_ends": [
    { "id": "az-dor-liens", "name": "AZ DOR state tax liens", "reason": "..." },
    { "id": "irs-nftl",     "name": "IRS NFTL",                "reason": "..." },
    { "id": "usbc-az",      "name": "USBC AZ bankruptcy",      "reason": "..." }
  ],
  "cells": {
    "CHRISTOPHER POPHAM__mcr-name__public-api":      { "status": "blocked", "failure": { ... } },
    "CHRISTOPHER POPHAM__mcr-name__county-internal": { "status": "zero" },
    "BRIAN J MADISON__mcsc-civil__county-internal":  { "status": "hit", "hits": [ ... ] }
    // ...17 more cells
  },
  "parcel_sweeps": {
    "304-78-386": { "status": "swept", ... },
    "304-77-689": { "status": "no_capture_available", ... }
  }
}
```

Cell keys: `${party}__${indexId}__${approach}`. Flat dict, O(1) lookup.

### 5.4 Fallbacks

- **MCSC not reachable:** matrix shrinks to 5 parties × 1 index × 2 approaches = 10 cells. MCSC becomes a 4th dead-end. Engine `IndexId` union reduces to `'mcr-name'`. No code changes in surfaces.
- **BRIAN MADISON collision not found:** all right-column cells are `zero`. Demo leans on "verified zero across 10 queries" as the moat moment. Showpiece hit-detail card is absent. Fixture `operator_notes` records the fallback; test suite reads the note and skips collision-specific assertions.

## 6. `/custodian-query` showpiece page

### 6.1 Structure

1. Header — title, one-sentence moat framing, capture metadata strip.
2. Outcome tile — static counts (`20 queries · Public API: 0 · County internal: 10 · 1 AI-dismissed · 9 verified zero`). Inline `Replay` button.
3. Matrix — 2 columns (Public API | County Internal), each containing 5 party groups of 2 cells.
4. Dead-ends strip — 3 indexes with one-line `reason` each.
5. Operator notes + footer — capture timestamp, operator note, deep-link to `/parcel/304-78-386/encumbrances`.

### 6.2 Cell states (`<LiveQueryCell>`)

| State | Visual |
|---|---|
| `idle` | gray outline, "awaiting sweep" |
| `loading` | shimmer + spinner, "querying {index}…" |
| `zero` | green check, "verified zero · {coverage}" |
| `hit · probable_false_positive` | amber outline, "1 hit · AI: false positive", click to expand detail card |
| `hit · requires_examiner_review` | red outline (not in current fixture; type-supported) |
| `blocked` | slate ×, `failure.message`, click for popover with `captured_response_excerpt` |
| `no_capture_available` | not rendered on showpiece (parcel-panel-only state) |

All transitions are CSS opacity/color. No animation library.

### 6.3 Animation controller

- On mount, read `sessionStorage['custodian-query-seen']`.
- If absent or `?replay=1`: 50 ms stagger loop sets each cell `idle → loading`; `queryIndex` resolves each to final state (~1.3 s total).
- If present: all cells render final state immediately; `Replay` is the only re-trigger.
- Completion sets `sessionStorage['custodian-query-seen'] = '1'`.
- `Replay` clears the flag and remounts via `key` bump.

### 6.4 Hit detail card

Inline disclosure (not modal) with: matched indexed name, recording number/date/doc type, AI rationale verbatim, confidence, callout linking to `/parcel/304-78-386/instrument/20130183450` for viewer verification.

### 6.5 Failure popover

Click a `blocked` cell → popover with `failure.kind` heading, `message`, `captured_url`, `captured_response_excerpt` in `<pre>`, and link to `/why`. Closes on outside click.

### 6.6 Responsive

- ≥1280 px: full 2-column matrix.
- 768–1279 px: matrix scales proportionally.
- <768 px: stacks to single column. Graceful degradation, not optimized.

### 6.7 Copy discipline

Counted, not adjectival. No "amazing / powerful / impressive". The asymmetry IS the argument.

## 7. `PartyJudgmentSweep` rewiring

### 7.1 Data swap

- **Before:** imports `src/data/party-judgment-sweeps.json`.
- **After:** calls `getSweepForParcel(parcel.apn)`. Renders `<SweepSkeleton>` during the ~300 ms await, then the `ParcelSweep` result.

### 7.2 POPHAM path (`status: 'swept'`)

Visuals near-identical to today. Changes:
- Counters: `parties_scanned: 5`, `indexes_scanned: 2` (not 5).
- Indexes-scanned disclosure renders 2 live + 3 dead-ends (new); dead-ends in muted style with `reason`.
- Footer gains "How this sweep works →" link to `/custodian-query#party-{slug}`.
- Hit recording numbers stay non-clickable when outside the parcel's corpus; hover tooltip: "Outside this parcel's corpus — available in production".

### 7.3 HOGUE path (`status: 'no_capture_available'`)

Visuals unchanged from today. Engine serves the `reason` + `what_production_would_do` narrative. Footer adds "See the engine in action on POPHAM →" link to `/custodian-query`.

### 7.4 Unknown APN path

`getSweepForParcel` returns `null`; the component returns `null`. No panel renders on non-curated parcels. This matches today's behavior exactly.

### 7.5 Deep-link protocol

- Showpiece footer → `/parcel/304-78-386/encumbrances`
- Parcel panel footer → `/custodian-query#party-{slug}` (or `/custodian-query` if no hits)
- Hit-detail card callout → `/parcel/304-78-386/instrument/20130183450`

**Slug rule:** `party-{SLUG}` where `SLUG` is the party name uppercased with every run of non-alphanumeric characters replaced by a single `-`. Example: `BRIAN J MADISON` → `party-BRIAN-J-MADISON`. `BRIAN J AND TANYA R MADISON LIVING TRUST` → `party-BRIAN-J-AND-TANYA-R-MADISON-LIVING-TRUST`. The showpiece reads the anchor on mount and `scrollIntoView`s the matching party row.

## 8. File layout

### 8.1 New files

| Path | Purpose | LOC max |
|---|---|---|
| `src/lib/custodian-query-engine.ts` | Engine public API + latency + memoized load | 180 |
| `src/lib/custodian-query-engine.schema.ts` | Zod schema; derived types exported | 90 |
| `src/lib/custodian-query-engine.test.ts` | Engine unit tests | 120 |
| `src/data/custodian-sweep-fixture.json` | Captured sweep artifact | ~25 KB |
| `src/pages/CustodianQueryPage.tsx` | Matrix showpiece | 260 |
| `src/pages/CustodianQueryPage.test.tsx` | Showpiece smoke | 80 |
| `src/components/LiveQueryCell.tsx` | Cell state renderer | 110 |
| `src/components/LiveQueryCell.test.tsx` | Cell state smoke | 60 |
| `scripts/capture-sweep.ts` | Dev-only Playwright runbook | 220 |
| `scripts/lib/sweep-capture-helpers.ts` | Playwright + curl helpers | 140 |
| `scripts/validate-sweep-fixture.ts` | Zod validator entry point | 30 |

### 8.2 Modified files

| Path | Change |
|---|---|
| `src/components/PartyJudgmentSweep.tsx` | Swap JSON import for engine call; skeleton; dead-ends disclosure; footer deep-link |
| `src/router.tsx` | Add `/custodian-query` route |
| `src/pages/LandingPage.tsx` | Add small "See the custodian query engine" link |
| `src/__tests__/PartyJudgmentSweep.smoke.tsx` | Mock `getSweepForParcel` instead of JSON |
| `docs/data-provenance.md` | Add §4 capture methodology |
| `CLAUDE.md` | Append Decision #46 |

### 8.3 Deleted files

- `src/data/party-judgment-sweeps.json` (subsumed by fixture)

### 8.4 Dependencies

No new npm packages. Zod is already present; Playwright MCP is already enabled.

### 8.5 Module boundaries

```
scripts/capture-sweep.ts
     ↓ writes
custodian-sweep-fixture.json
     ↑ reads
custodian-query-engine.ts  ←  custodian-query-engine.schema.ts
     ↑ imports
     ├──  CustodianQueryPage.tsx  ←  LiveQueryCell.tsx
     └──  PartyJudgmentSweep.tsx
```

`LiveQueryCell` is showpiece-only. The parcel panel keeps its own hit-card rendering.

### 8.6 Footprint

- New code: ~1,290 LOC across 11 files (~360 LOC dev-only scripts)
- Modified code: ~110 LOC across 5 files
- Runtime bundle growth: ~15 KB gzipped (fixture + engine + page + cell)

## 9. Testing

### 9.1 What we test

**Engine unit tests:**
- Fixture loads + Zod passes.
- `queryIndex` returns expected fixture cell for each known tuple.
- `queryIndex` applies ≥150 ms latency (fake timers).
- `queryIndex` throws for unknown party.
- `getSweepForParcel('304-78-386')` returns `status: 'swept'`.
- `getSweepForParcel('304-77-689')` returns `status: 'no_capture_available'` with HOGUE narrative.
- `getSweepForParcel('999-99-999')` returns `null` (APN not in fixture).
- `getShowpieceShape()` returns correct counts.
- Fixture load memoized.

**Fixture validator:**
- All matrix cells present (20, or 10 under MCSC fallback).
- All `ai_judgment` / `FailureMode.kind` values valid.
- `parcel_sweeps['304-78-386'].parties ⊆ parties[]`.
- `captured_at` ISO-8601 in past.
- `hits[*].confidence ∈ [0, 1]`.
- No orphaned cells.

Runs during `npm test` and standalone: `tsx scripts/validate-sweep-fixture.ts`.

**`LiveQueryCell` tests:**
- 6 states render expected DOM.
- `hit` expands/collapses on click.
- `blocked` popover opens + closes on outside click.
- Keyboard accessibility (role, tabindex, keydown).

**`CustodianQueryPage` smoke tests:**
- Renders without throwing.
- 20 cells post-resolve (or 10 under fallback).
- Outcome tile counts match cell states.
- `Replay` resets sessionStorage + re-animates.
- `?replay=1` forces animation.
- Anchor-based scroll works.
- Dead-ends strip present.
- Footer deep-link present.

**`PartyJudgmentSweep` smoke tests:**
- POPHAM: hit count matches fixture.
- HOGUE: blocked-variant banner with narrative.
- Unknown APN: renders `null` (no panel).
- Footer deep-link present on both paths.

### 9.2 What we don't test

- Playwright captures (not in CI).
- Real network calls (engine never makes any).
- Visual regression / screenshot diffs.
- Animation timing precision.
- Live LLM inference.
- Cross-parcel search.
- HOGUE sweep captures.

### 9.3 Test data flow

Tests use the real fixture. No test-specific fixture. Intentional fixture changes propagate into test assertions; unintentional ones surface as clear failures.

### 9.4 Budget

- ~2 hours to write tests across 5 files.
- No test >100 ms (fake timers for simulated latency).

## 10. Out of scope

- HOGUE party captures.
- Cross-parcel / cross-county queries.
- Runtime LLM inference.
- MSW / service workers.
- PACER integration beyond dead-end documentation.
- Assessor-side sweeps.
- Auth, saved sweeps, per-user audit trail.
- Scheduled re-capture; verified-through live clock.
- Admin tooling for non-dev operators.

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| MCSC public search unreachable | Medium | Phase A scout gates; 1-live-index fallback documented |
| BRIAN MADISON collision not found | Medium | Verified-zero fallback; `operator_notes` drives test-suite branch |
| Legacy MCR UI changes during capture-to-demo window | Low | Fixture is frozen |
| Playwright session collides with another agent | Low (resolved) | Serialization protocol §5.1 |
| `publicapi.recorder.maricopa.gov` offline during capture | Low | Defer session |
| Viewer opens on mobile | Certain for some | Single-column stacked fallback acceptable |
| Fixture schema drift breaks tests | Certain when intentional | Update schema + fixture + tests together |
| Viewer dismisses AI-judgment as cherry-picked | Medium | Inline detail card links to real 2013 DOT for self-verification |
| Viewer asks "is AI actually running?" | High (technical audience) | `/why` page + this spec disclose pre-computation explicitly |

## 12. Rollback

Full rollback = revert the feature branch merge. Partial rollback (showpiece problematic, engine fine): revert `CustodianQueryPage.tsx` + route + landing link; engine still powers `PartyJudgmentSweep`. Engine is stable regardless of showpiece state.

## 13. Decision log append

A new entry to add to `CLAUDE.md`:

> | 46 | Custodian query engine replaces static party-judgment-sweeps.json | Real-data engine over a captured Playwright + curl fixture; exposed through a `/custodian-query` matrix showpiece (5 parties × 2 live indexes × 2 approaches = 20 cells, auto-run on first visit) and the existing `PartyJudgmentSweep` parcel panel. 2 live indexes (MCR name index + MCSC civil judgments); 3 documented dead-ends (AZ DOR, IRS NFTL, USBC). POPHAM-only party scope; HOGUE remains blocked-contrast via engine `no_capture_available` state. AI judgments pre-baked in fixture; no runtime LLM. Capture serialized against other Playwright agents. MCSC scoutability + BRIAN MADISON collision pre-hunt both have documented fallbacks. | 2026-04-18 |
