# Demo-Ready Home-Run Design

**Date:** 2026-04-14
**Author:** Sprint owner (with Claude brainstorm session)
**Branch:** `claude/angry-buck`
**Status:** Approved, ready for writing-plans decomposition

---

## 1. Context

The county-recorder-sprint prototype has shipped the four mandatory screens
(Search, Chain, Encumbrance, Proof Drawer), deep-linkable routes, Commitment
Export (Schedule A + B-II), and the static `/moat-compare` route. The sprint
owner has extended time budget to 3+ days and is now targeting a "home run"
demo that:

- Drives public traffic (stale-feeling SPA → interactive public portal)
- Deepens the title-industry story (beat title plants structurally)
- Closes the actionable subset of the 19 documented known gaps
- Is executed in parallel across multiple Claude Code terminals in Warp
  using the `superpowers` plugin skills end-to-end

The recruiter's evaluation bar (paraphrased):

> "We've seen proper technical execution with poor research, and the product
> wasn't good. Understanding *why* the industry operates the way it does
> today is the tip. Home run > safe."

This spec is the architectural plan that satisfies that bar.

## 2. Asymmetric Winning Play

Two axes combined:

1. **Spatial context** — county assessor polygons are something a title
   plant cannot replicate authoritatively. We surface them in three tiers:
   public front door, examiner-view spatial panel, and public activity
   heat map.
2. **Title-workflow depth** — chain anomaly detection, Schedule B-I
   generation, pipeline freshness per stage, cross-parcel name search —
   the features only someone who dissected the examiner workflow would
   build. Each carries a visible *why*.

Visual polish wraps both. Research depth is surfaced on-screen via
per-surface tooltip/caption copy that connects UI choices to industry
realities.

## 3. Gap Strategy

The 19 gaps in `docs/known-gaps.md` split three ways.

### 3.1 Close (5)

Gaps where closing strengthens the pitch without eroding the moat
narrative:

| # | Change | Stream |
|---|--------|--------|
| 9 | Same-day transaction linking inferred at load time, not asserted in JSON | S5 |
| 14 | Examiner actions persisted to localStorage (session-only becomes session-sticky) | S5 |
| 17 | `EncumbranceLifecycle.tsx` header label driven by `document_type` | S5 |
| 18 | Shared provenance formatter feeds both screen badge and PDF inline | S5 |
| 19 | Exhaustive `switch` in `formatProvenanceTag` with `: never` default | S5 |

### 3.2 Turn into features (2)

| # | Gap | How it's weaponized | Stream |
|---|-----|---------------------|--------|
| 2 | Name-based release search not automated (public API limit) | Becomes `/staff/search` — internal full-index search that works, demonstrating the county's structural advantage | S4A |
| 7 | No APN ↔ recorder bidirectional bridge | Becomes the map itself — the county's assessor polygons serve as the bridge prototype | S1, S2 |

### 3.3 Keep as honest limits (12)

Gaps #1, #3, #4, #5, #6, #8, #10, #11, #12, #13, #15, #16. These are the
moat arguments. Surfacing them on stage (per the existing demo script) is
stronger than hiding them. **Exception:** #16 (Schedule B-I) is closed by
the S3B Transaction Wizard — moving from "keep open" to "close" during
this design pass. `known-gaps.md` to be updated by S5.

## 4. Stream Definitions

Five parallel streams + one sequential consolidator role.

### 4.1 Stream 1 — Public Front Door

**Goal.** Replace the bland search box with a visually striking county-level
map landing. Drive public traffic while preserving deep-link workflow.

**Screens.**

- `/` — redesigned landing: Maricopa county outline + municipal labels +
  highlighted parcels in corpus (POPHAM green, HOGUE amber as "honest
  counter-example") + search bar beneath + recent-activity sidebar.
- `/county-activity` — public heat map: recording density by zip /
  instrument type + freshness overlay + 30/60/90-day filter.

**Library.** MapLibre GL via `react-map-gl/maplibre` — open source, no API
key, vector tiles, GPU-smooth.

**Data source.** Targeted ArcGIS REST query against Maricopa Open Data
Portal at capture time, persisted as static GeoJSON. One-time fetch script
`scripts/fetch-gis.ts` committed alongside the data — capture is
reproducible, runtime is offline.

**Data files.**

- `src/data/maricopa-county-boundary.json` — county outline (GeoJSON)
- `src/data/parcels-geo.json` — POPHAM `304-78-386` + HOGUE `304-77-689`
  polygons from ArcGIS
- `src/data/activity-synthetic.json` — plausible recording activity for
  heat map, ~300/day distribution over Phoenix metro municipalities

**Research-depth copy.** Parcel hover tooltip: "This polygon comes from the
county assessor's file. Title plants license it via a third party. The
recorder system has no APN bridge (Known Gap #7) — the county is the only
party that can serve this spatial layer authoritatively."

**Key files.** `src/components/CountyMap.tsx`,
`src/components/LandingPage.tsx`, `src/components/ActivityHeatMap.tsx`,
`scripts/fetch-gis.ts`.

**Success criteria.** Map loads under 2s; POPHAM click deep-links to
`/parcel/304-78-386`; heat map renders with working date slider; mobile
viewport responsive; WHY copy present.

**Effort.** 6–8h.

### 4.2 Stream 2 — Spatial Context on Chain

**Goal.** Answer the examiner's spatial question ("does the legal
description match the physical parcel?") without leaving the portal.
Collapses tab #3 of the current 4-tab workflow.

**Placement.** Resizable right-hand panel on `/parcel/:apn` and
`/parcel/:apn/encumbrances`. Chain timeline stays primary (~60%), spatial
panel ~40%, collapsible with state persisted to localStorage.

**Layers** (bottom → top):

1. OSM/Carto basemap tile
2. Adjacent parcels — thin grey outlines (context)
3. Seville Parcel 3 subdivision boundary — dashed amber
4. Subject parcel polygon — solid highlight, clickable
5. Instrument markers — pins for any polygon with a recorded instrument
   in corpus (plat `20010093192`, affidavit `20010849180`)

**Interactions.**

- Click subject polygon → Proof Drawer opens on most recent instrument
- Click Seville Parcel 3 line → Proof Drawer opens on `20010093192`
- Click affidavit pin → Proof Drawer opens on `20010849180`
- Hover subject → tooltip: `APN 304-78-386 · Lot 46, Seville Parcel 3 ·
  0.19 acres · Book 554 Maps Page 19`
- "Open in MC Assessor" secondary button linking to
  `mcassessor.maricopa.gov/mcs/?q=30478386&mod=pd`

**Data added.**

- `src/data/subdivision-plats.json` — Seville Parcel 3 boundary
  (hand-traced from plat PDF page 1, provenance tagged `manual_entry`
  with `source_instrument: "20010093192"`)
- `src/data/adjacent-parcels.json` — ~20 neighbors via same ArcGIS script

**Research-depth copy.** Seville Parcel 3 tooltip: "Subdivision plat
recorded 2001-01-30 as resubdivision of SEVILLE TRACT H (Book 553 P15).
That root plat exists only in the county's book index — not recoverable
via public API (`docs/hunt-log-known-gap-2.md`). The moat isn't the
polygon, it's the custody chain behind it."

**Key files.** `src/components/SpatialContextPanel.tsx`, modify
`ChainOfTitle.tsx` + `EncumbranceLifecycle.tsx`,
`src/data/subdivision-plats.json`, `src/data/adjacent-parcels.json`.

**Dependencies.** Consumes `parcels-geo.json` from S1. Can develop against
stub until S1 lands.

**Success criteria.** Spatial panel renders on both routes; three
click-to-drawer paths functional; hover tooltip with full legal
description; MC Assessor link opens correct page; collapse state persists
via localStorage.

**Effort.** 5–7h.

### 4.3 Stream 3 — Title Depth

**Goal.** Build the features only someone who understands the examiner
workflow would build. Split into two sub-streams executed via
`superpowers:subagent-driven-development` inside the S3 terminal.

#### 4.3.1 S3A — Chain Anomaly Detector

**Rules engine.** Declarative rules at `src/data/anomaly-rules.json`,
detection logic at `src/logic/anomaly-detector.ts` — pure functions, TDD.

| # | Rule | Severity | Fires on |
|---|------|----------|----------|
| R1 | Same-day transaction cluster | info | POPHAM + HOGUE purchase pairs |
| R2 | Open DOT past expected release window | high | HOGUE `lc-003` (open 10 yrs) |
| R3 | MERS-as-nominee beneficiary | medium | POPHAM 2013 DOT — note may have transferred outside record |
| R4 | Assignment chain break | medium | POPHAM VIP → Wells Fargo, no recorded assignment |
| R5 | Grantor is trust entity | info | POPHAM 2013 warranty deed (Madison Living Trust) |
| R6 | Root plat unrecoverable via public API | info | Seville Parcel 3 → Book 553 P15 |
| R7 | Same-name contamination suppressed | info | HOGUE's 3 unrelated same-name instruments (Decision #26) |
| R8 | Chain stale > 5 years | low | HOGUE (no activity since 2015) |

**UI.** Banner atop `/parcel/:apn`: `3 anomalies detected · 1 high · 2 medium`.
Expandable panel. Each anomaly renders: severity pill + plain-English
description + evidence links to Proof Drawer + "Examiner action" line +
"Detection provenance" (rule number, confidence).

**Files.** `src/components/AnomalyPanel.tsx`, `src/logic/anomaly-detector.ts`,
`src/data/anomaly-rules.json`, modify `ChainOfTitle.tsx`.

#### 4.3.2 S3B — Transaction Wizard (closes Gap #16)

**Route.** `/parcel/:apn/commitment/new` — 4-step wizard.

**Steps.**

1. Transaction type: `purchase · refinance · 2nd DOT · HELOC · cash sale`
2. Inputs: effective date, buyer/borrower, new lender (autocomplete from
   corpus lenders)
3. Review generated B-I items inline — each with "Why this item" disclosure
4. Export: full A + B-I + B-II PDF

**B-I templates.** `src/data/schedule-bi-templates.json`, curator-reviewed
to ALTA-commitment phrasing:

- Payoff statement from `<current beneficiary>` for open lifecycle
  `<lc-id>` recorded `<instr>`
- Satisfaction-of-assignment verification for unrecorded VIP → Wells
  Fargo transfer
- Subordination from HOA if equity transaction
- Trust certification when grantor is trust entity
- Tax certificate current-year
- Curative affidavit for same-day transaction without deed recitation

Each B-I item renders its origin: `Generated from anomaly R3 (MERS
nominee) + open lifecycle lc-001 + transaction-type=refinance`.

**Files.** `src/components/TransactionWizard.tsx`,
`src/logic/schedule-bi-generator.ts`,
`src/data/schedule-bi-templates.json`, extend `src/logic/commitment-pdf.ts`
+ `src/components/ExportCommitmentButton.tsx`.

**Dependencies.** Independent. S3B extends commitment-export — merges
before S5's `known-gaps.md` update.

**Success criteria (S3 combined).** ≥6 rules implemented with 3 firing
on POPHAM + 2 on HOGUE; transaction wizard walks refi scenario end to
end; B-I appears in exported PDF alongside B-II; every B-I line has
expandable "Why this item" disclosure; anomaly-detector unit tests pass.

**Effort.** 12–16h (heaviest stream).

### 4.4 Stream 4 — Moat Made Visible

**Goal.** Flip every honest limit into a visible flex. Two sub-streams
via `superpowers:subagent-driven-development`.

#### 4.4.1 S4A — `/staff` Workbench

**Routes.**

- `/staff` — dashboard (pipeline state, queue counts, recent actions)
- `/staff/search` — name-filtered full-index search (flips Gap #2);
  type "Popham" → all instruments across all parcels, including
  same-name contamination with explicit multi-parcel-candidate flags
- `/staff/queue` — curator action queue; every anomaly from S3 across
  the corpus; accept/reject actions render an audit-row append
  (session-only, showing the production shape)
- `/staff/parcel/:apn` — expanded examiner view exposing internal
  annotations (attribution confidence, alternative APN candidates,
  suppressed same-name instruments)

**Cross-parcel release hunt.** For HOGUE `lc-003`, the `/staff/search`
returns: *"Scanned 1,247 parties named Jason/Michele Hogue across full
county index — 0 matches. Lifecycle remains open, verified-through
2026-04-05."* That honest zero result is the moat on stage — the search
surface exists and works, the data just doesn't contain a release.

**Mock auth.** Amber "Staff preview (demo)" banner top of page; no real
login. Acknowledged in demo script.

**Files.** `src/components/StaffWorkbench.tsx`,
`src/components/NameFilteredSearch.tsx`,
`src/components/CuratorQueue.tsx`, `src/components/AuditLogPanel.tsx`,
`src/data/staff-index.json` (expanded corpus including suppressed
same-name instruments).

#### 4.4.2 S4B — Pipeline Dashboard + Global Freshness Strip

**Surfaces.**

- **Sticky top strip** (40px) on every public + staff route:
  `County indexed through 2026-04-09 · OCR'd through 2026-04-08 ·
  Curator-verified through 2026-04-05 · 1,247 docs awaiting AI extraction`
- `/pipeline` — full dashboard: verified-through history, SLA adherence,
  backlog breakdown by stage (index → image → OCR → entity resolution →
  curator sign-off), "4 days faster than title plants" comparator

**Data.** `src/data/pipeline-state.json` — hand-curated state + 30-day
history, structured so production swaps data source, not schema.

**Research-depth copy.** Banner tooltip: "Title plants publish one
'current as of' date. The county custodian states verified-through per
stage — index, image, OCR, curator. That granularity isn't a UI choice,
it's what custody affords."

**Files.** `src/components/PipelineBanner.tsx` (mount in App shell),
`src/components/PipelineDashboard.tsx`, `src/data/pipeline-state.json`.

**Dependencies.** S4A queue consumes S3A anomaly output — stub on empty
array until S3A lands. S4B pipeline banner ships independently day one.

**Success criteria.** `/staff/*` routes render; full-index search
returns cross-parcel results with suppression flags; HOGUE cross-parcel
release hunt surfaces honest zero; curator queue shows anomalies with
session-only accept/reject + audit-row append; pipeline banner visible
on every route; `/pipeline` renders freshness history chart.

**Effort.** 6–8h.

### 4.5 Stream 5 — Hygiene + Visual Polish (runs LAST)

**Goal.** Close 5 gaps, ship design system pass, update moat narrative.
Runs last because polish touches many files.

**5A. Close 5 gaps** — see §3.1 table.

**5B. Visual polish.**

- Tailwind tokens: `colors.recorder.*`, `colors.moat.*`,
  `colors.provenance.*`
- Typography: Inter (UI) + IBM Plex Mono (recording numbers, APNs,
  legal IDs)
- Component polish: card elevation, focus rings, spacing rhythm
- Transitions: drawer, map pan/zoom, panel collapse
- Loading skeletons (Chain, Encumbrance, Map, Pipeline)
- Empty-state illustrations (not-in-corpus, no-results)
- Error states (GIS fetch failure, invalid APN)
- Dark mode (stretch)

**5C. Moat narrative update.**

- Rewrite `/moat-compare` to cover map custody, name-search flip,
  pipeline granularity, transaction-wizard depth
- Update `docs/demo-script.md` with beats for S1–S4
- Update `docs/known-gaps.md` — mark #9, #14, #16, #17, #18, #19 closed

**Files.** Tailwind config, `src/index.css`, most components, `docs/demo-script.md`,
`docs/known-gaps.md`, `src/components/MoatCompareRoute.tsx`,
`src/logic/provenance-vocab.ts` (new), `src/logic/format-provenance-tag.ts`
(refactor), `src/components/ProvenanceTag.tsx`,
`src/components/EncumbranceLifecycle.tsx`,
`src/logic/same-day-group-inferrer.ts` (new), `src/hooks/useExaminerActions.ts`,
`src/hooks/useLinkActions.ts`.

**Effort.** 8–10h.

## 5. Coordination Model

### 5.1 Consolidator (sequential; sprint owner's root checkout)

Responsibilities:

- Enforce merge order; run `npm test && npm run lint && npm run build`
  after each merge
- Integration smoke test (click through demo script)
- Visual regression pass (Chrome + Firefox + mobile viewport)
- Final demo-script rewrite after all features land
- Final `/moat-compare` polish
- Update `docs/reproducing-the-demo.md`
- `anthropic-skills:consolidate-memory` pass at the end

### 5.2 Merge order (min-conflict)

1. **S1** — new files only (landing, map, geo data) — ~zero conflict
2. **S4B pipeline banner** — App shell addition, one mount point
3. **S3A anomaly detector** — new files + small Chain mod
4. **S2 spatial context** — consumes S1 geo, new panel + small Chain mod
5. **S4A staff workbench** — consumes S3A output, new `/staff/*` routes
6. **S3B transaction wizard** — extends commitment-export, more invasive
7. **S5 hygiene + polish** — touches everything, last

### 5.3 Worktrees

Each stream lives in its own worktree created via
`superpowers:using-git-worktrees`:

- `S1` → `.claude/worktrees/home-run-s1-front-door`
- `S2` → `.claude/worktrees/home-run-s2-spatial-context`
- `S3` → `.claude/worktrees/home-run-s3-title-depth`
- `S4` → `.claude/worktrees/home-run-s4-moat-visible`
- `S5` → `.claude/worktrees/home-run-s5-hygiene-polish`

Each worktree branches from `claude/angry-buck` (current). Consolidator
merges each worktree's branch into `claude/angry-buck` in order. The
current worktree's `.claude/worktrees/` is already git-ignored
(commit `2328e70`).

### 5.4 Superpowers skills matrix

Every stream opens with
`superpowers:using-superpowers` (automatic on session start) →
`superpowers:using-git-worktrees` (isolate) →
`superpowers:brainstorming` (lightweight — spec section pre-approved) →
`superpowers:writing-plans` (per-stream plan) →
`superpowers:executing-plans` (build) →
`superpowers:verification-before-completion` (gate) →
`superpowers:requesting-code-review` (review) →
`superpowers:finishing-a-development-branch` (merge handoff).

Per-stream additions:

| Stream | Also uses |
|--------|-----------|
| S1 | `superpowers:subagent-driven-development` (landing // map // heatmap as parallel sub-tasks) |
| S2 | `superpowers:test-driven-development` (polygon → instrument-marker placement logic) |
| S3 | `superpowers:test-driven-development` (rules engine) + `superpowers:subagent-driven-development` (3A // 3B sub-streams) |
| S4 | `superpowers:test-driven-development` (search suppression logic) + `superpowers:subagent-driven-development` (4A // 4B sub-streams) |
| S5 | `superpowers:test-driven-development` (#9, #18, #19 pure logic) |

Consolidator additionally uses `superpowers:dispatching-parallel-agents`
(if coordinating sub-agents within one session rather than across
terminals) and `anthropic-skills:consolidate-memory` at end of sprint.

## 6. Total Effort

S1 (6–8h) + S2 (5–7h) + S3 (12–16h) + S4 (6–8h) + S5 (8–10h) =
**~40–50h wall-clock**. If 4 streams run true-parallel, **~15–25h
elapsed**. Consolidator overhead: ~4–6h for merges, smoke, demo
rehearsal.

## 7. Demo-Level Success Criteria

Demo is home run if, in 8 minutes:

1. Audience lands on `/` and sees the interactive map — gets what the
   product is before the speaker says a word
2. Speaker clicks POPHAM polygon → deep-link to Chain → spatial context
   panel confirms legal matches polygon
3. Anomaly banner surfaces 3 issues; speaker drills into R3 (MERS) and
   R4 (assignment break) — demonstrates workflow mastery
4. Transaction Wizard generates Schedule B-I live; each item cites its
   origin rule; PDF export includes A + B-I + B-II
5. Speaker navigates to `/staff` → runs name-filtered search across full
   index → shows HOGUE cross-parcel release hunt surfacing honest zero
6. Pipeline banner visible throughout; speaker points to verified-through
   dates as the moat crystallized
7. `/moat-compare` closer references each feature as evidence
8. Every screen surfaces at least one "WHY" copy tie-in to the industry
   problem

## 8. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| ArcGIS fetch schema drifts | Persist static GeoJSON at capture time; fetch script checked in for reproducibility |
| Map library bloat blows bundle | MapLibre GL tree-shakes; budget 200kb gzip; defer heat map to `/county-activity` route |
| S3 anomaly rules over-fire | Each rule has an `only_fires_on` whitelist gate during dev; remove gate only after review |
| S3B Schedule B-I appears aspirational | Every line cites its origin anomaly or lifecycle; no free-form generation |
| Merge conflicts in S5 | S5 owner runs last; rebases on each prior merge before starting polish pass |
| Mock `/staff` auth misread as live | Amber "Staff preview (demo)" banner + demo script calls it out explicitly |
| Pipeline dates conflict with Beat 0 "115 interactions" framing | Pipeline copy is about *current freshness*, Beat 0 is about *workflow cost*; orthogonal |
| Visual polish fragments | One Tailwind token pass landed first in S5; all component polish derives from the tokens |

## 9. Out of Scope

Intentionally not in this design:

- Cross-county search (CLAUDE.md hard constraint)
- Real authentication / SSO
- Live county API integration at demo time
- Mobile-native app
- Landman persona UI (recruiter flagged as bonus; not worth redirecting
  time from title examiner depth)
- Payment / intake flows
- Model-based confidence estimation (Gap #5, stays open)

## 10. Next Steps

1. Sprint owner reviews this spec
2. Invoke `superpowers:writing-plans` to decompose each stream into a
   per-stream implementation plan with checkpoints
3. Produce 5 terminal-ready prompts (one per stream) that boot each
   worktree, load spec + per-stream plan, and start execution
4. Sprint owner launches 5 Warp terminals with their prompts
5. Consolidator runs in a 6th terminal (sprint owner's root checkout)
   for merges and demo rehearsal
