# ANGUS Neighbor Lien + Live Matcher Demo — Design

**Date:** 2026-04-17
**Author:** Klaus
**Status:** Spec (awaiting review)
**Supersedes / related:** Decisions #38 (tax-lien hunt failure), #40 (Book 553 hunt pivot), #41 (curated links stay curated), #45 (Seville neighbors cached tier)

## Goal

Close two gaps the pre-demo review called out:

1. **No liens in the corpus.** Every curated lifecycle today is deed or DOT family. An examiner's daily work includes liens; a demo without them is visibly incomplete.
2. **Release matcher is wired but not visibly discovering links.** `CandidateReleasesPanel` renders inside the swimlane, but on every curated lifecycle either (a) the link is already in `links.json` (examiner sees a curated row, not a scorer-picked row) or (b) the parcel corpus has zero reconveyance candidates (matcher hits its empty-state branch).

Both gaps close in a single move: promote one existing cached neighbor parcel (ANGUS, Lot 45, Seville Parcel 3) to curated tier. Give it (a) an open HOA lien lifecycle and (b) a DOT lifecycle whose release is discovered live by the matcher with no entry in `links.json`.

## Non-goals

- Expanding the corpus to dozens of parcels (separate initiative — "try your own address" problem).
- Cross-subdivision lien signals.
- Mechanic's-lien preliminary-notice mechanics.
- Examiner-side dispute / unlink workflow (Decision #41 remains).
- Lien-payoff-amount extraction as structured data (stays `manual_entry` if recovered).

## Scope anchor parcel

- **APN:** 304-78-367
- **Subdivision:** Seville Parcel 3, Lot 45 — POPHAM's literal next-door neighbor (POPHAM is Lot 46)
- **Recorded owner history (from cached API):** Scott J. Angus → Phoenix Vacation Houses (quit-claim deed 20200620456, same day as DOT 20200620457 with United Wholesale Mortgage, 2020-07-13). Investor / short-term-rental pattern — narratively consistent with HOA friction.
- **Existing state:** Already at "Recorder · cached" tier per Decision #45 (`src/data/api-cache/recorder/304-78-367.json`). This design **promotes** it to fully curated.

## Hunt R-006 — time-boxed 15 minutes

Three parallel sub-hunts against `publicapi.recorder.maricopa.gov`, stop-early on first useful hit per hunt:

1. **ANGUS HOA lien.** Bracket-walk `GET /documents/{n}` across 2021-09-01 to 2024-12-31 (~40 calls, 1s spacing). Filter on document codes `ASSOC LIEN`, `HOA LIEN`, `MECHL LIEN`, `LIEN`, `MED LIEN`. Accept only if names include ANGUS, Phoenix Vacation Houses, or Seville Parcel 3 lot references.
2. **ANGUS release of 20200620457.** Same window. Filter on `REL D/T`, `SUBST TR`, `ASSIGN D/T`. Accept only if names include ANGUS, Phoenix Vacation Houses, or United Wholesale Mortgage.
3. **Seville Parcel 3 HOA-lien precedent** (backup evidence for the synthetic fallback framing). 6-month window Oct 2022 – Oct 2024. Any SEVILLE HOMEOWNERS ASSOCIATION lien on any lot.

**Hunt log** at `data/raw/R-006/hunt-log.md` captures every call, response code, and reasoning. The log becomes a first-class demo asset regardless of outcome (same pattern as Decisions #38/#40 — two prior hunt logs already exist as disintermediation receipts).

### Fallback policy

Sub-hunt | Hit | Miss
--- | --- | ---
1 (lien) | Use real instrument | Synthesize HOA lien on ANGUS, `provenance: "demo_synthetic"`, Proof Drawer amber banner
2 (release) | Use real instrument, leave out of `links.json`, let matcher discover live | Branch decision at hunt time (see R4 below)
3 (precedent) | Reference in synthetic lien's `source_note` to ground the pattern | Accept that fallback synthetic lien is narratively thinner

## Data additions

### `src/data/parcels.json`

Add ANGUS entry:

```json
{
  "apn": "304-78-367",
  "address": "3671 E Palmer St",
  "city": "Gilbert",
  "state": "AZ",
  "zip": "85298",
  "legal_description": "Lot 45, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19; Affidavit of Correction recorded in Document No. 2001-0849180",
  "current_owner": "PHOENIX VACATION HOUSES LLC",
  "type": "residential",
  "subdivision": "Seville Parcel 3",
  "assessor_url": "https://mcassessor.maricopa.gov/mcs/?q=30478367&mod=pd",
  "instrument_numbers": ["20200620456", "20200620457", "<lien>", "<release?>"]
}
```

Address confirmed at implementation time against assessor URL; format above is the placeholder matching Palmer St pattern.

### `src/data/instruments/`

- `20200620456.json` — ANGUS → Phoenix Vacation Houses Q/CL DEED (promoted from cache)
- `20200620457.json` — ANGUS UWM DEED TRST (promoted from cache)
- `<lien>.json` — HOA lien, real or synthetic
- `<release>.json` — release, real or synthetic (subject to hunt-2 outcome)

All four carry the existing Instrument schema. No schema changes.

### `src/data/lifecycles.json`

Add two new lifecycles:

- **lc-007** — root `20200620457` (UWM DOT). Status: `released` if hunt-2 hit, `open` if hunt-2 miss and we decide against synthesizing the release. `child_instruments` populated only on real hit.
- **lc-008** — root `<lien>`. Status: `open`. Rationale: *"Active HOA lien recorded by Seville Homeowners Association against Lot 45 (Phoenix Vacation Houses). No release, withdrawal, or payoff recorded in corpus."* (Verbatim copy will reflect real data if hunt-1 hit.)

### `src/data/links.json`

**No entries added for ANGUS.** This is the critical design invariant — the matcher must be the sole source of the DOT→release linkage shown in the UI for lc-007.

### `src/data/narratives/304-78-367.json`

New narrative. Frames the investor-flip → UWM DOT → HOA friction story. Explicitly flags the synthetic lien (if applicable) as illustrative.

### `data/raw/R-006/hunt-log.md`

The hunt transcript — first-person, timestamped, curl command blocks, response snippets.

## Logic changes

### `src/logic/subdivision-signals.ts` (new)

```ts
export interface LienSignal {
  apn: string;
  lot: string | null;
  currentOwner: string;
  documentType: string;
  lifecycleId: string;
  instrumentNumber: string;
}

export function getOpenLiensInSubdivision(
  subdivision: string,
  excludeApn: string,
  parcels: Parcel[],
  lifecycles: EncumbranceLifecycle[],
  instruments: Instrument[],
): LienSignal[];
```

Pure function. Filters lifecycles where:
- The parcel owning the root instrument has matching `subdivision` and `apn !== excludeApn`
- Root instrument's `document_type` is in the lien family: `ASSOC LIEN`, `MECHL LIEN`, `FED TAX L`, `LIEN`, `MED LIEN`
- Lifecycle `status === "open"`

Unit tests cover: empty result when no liens; correct filtering by subdivision; excludeApn respected; lien family predicate.

### `src/logic/provenance-vocab.ts`

Add `demo_synthetic` tag alongside existing `public_api`, `ocr`, `manual_entry`, `algorithmic`. Glyph + label pair so existing provenance-tag renderer can display it.

### `src/logic/party-roles.ts`

Add `claimant` and `debtor` party roles for lien-family instruments. Ensure `getReleasingParties()` does not crash on instruments without a releasing-party-family role (today's code falls through to `parties[0].name`; verify this remains safe for lien instruments).

### `src/logic/release-candidate-matcher.ts`

**No changes.** The matcher already handles parcel-local pools, feature-bar output, curated-link awareness, and accept/reject actions. ANGUS lc-007 is a consumer of existing behavior.

## Component changes

### `src/components/SubdivisionSignalsCard.tsx` (new)

Rendered at the top of the Encumbrance Lifecycle panel when `getOpenLiensInSubdivision()` returns non-empty. One-paragraph layout:

> **Subdivision signals** *(amber badge)*
>
> 1 active HOA lien in Seville Parcel 3 — Lot 45 *(3671 E Palmer St · Phoenix Vacation Houses)*. **Not on this parcel.** The public recorder API can only surface this by walking lot-by-lot; name-indexed title plants cannot reconstruct subdivision-wide encumbrance density.
>
> *[View Lot 45 →]*

Click → `/parcel/304-78-367/encumbrances`. Renders nothing if signals empty (no "no signals" filler — silence is a legitimate state).

Test coverage: renders when present; returns null when empty; link href correct; copy reflects single vs multiple liens (plural handling).

### `src/components/EncumbranceLifecycle.tsx`

Single change: render `<SubdivisionSignalsCard />` above the existing swimlane, passing current parcel's subdivision and APN. Zero behavior change on parcels where `getOpenLiensInSubdivision()` is empty.

### `src/components/ProofDrawer.tsx`

Handle `demo_synthetic` provenance at the top of the drawer:

> ⚠ **Demo-only synthesized record.** Not a real recorded instrument. See `source_note` for the sub-hunt that failed to locate a real instance.

Only rendered when the instrument's provenance_summary indicates any synthetic field. Existing provenance rendering handles individual field tags.

### `src/components/CountyMap.tsx` / encumbrance overlay

Extend the existing encumbrance overlay (default ON per Decision #45) so polygons with any open lien-family lifecycle paint **amber** distinct from open-DOT indigo. Behavior on existing POPHAM, HOGUE, WARNER, LOWRY polygons must be unchanged.

Implementation approach: verify at implementation time whether overlay painting has a clean selector module. If yes, extend. If no, carve out a selector as part of this work.

The overlay selector keys on lifecycle `status` and root-instrument `document_type` only — it does **not** inspect provenance. A synthetic-origin HOA lien (`provenance: "demo_synthetic"`) with `status === "open"` and `document_type === "ASSOC LIEN"` paints amber identically to a real one. The Proof Drawer remains the surface where synthetic provenance is disclosed; the map is a visual density signal, not a provenance-accuracy signal.

## Data flow

### ANGUS matcher demo

```
User → /parcel/304-78-367/encumbrances
  EncumbranceLifecycle loads lc-007 (DOT) + lc-008 (lien)
  Swimlane renders lc-007
  CandidateMatcherSlot → CandidateReleasesPanel
  buildCandidateRows({lifecycleId: "lc-007", dot: 20200620457, pool: [ANGUS reconveyances]})
    pool = 1 candidate; links.json has no lc-007 entry → alreadyLinkedTo = null → canAccept = true
  Feature bars render live; user clicks Accept or Reject
```

### POPHAM subdivision signals

```
User → /parcel/304-78-386/encumbrances
  EncumbranceLifecycle reads parcel.subdivision = "Seville Parcel 3"
  getOpenLiensInSubdivision("Seville Parcel 3", "304-78-386")
    → [{apn: "304-78-367", lot: "45", owner: "Phoenix Vacation Houses LLC", docType: "ASSOC LIEN", ...}]
  SubdivisionSignalsCard renders above swimlane
```

### Map overlay

```
Map tile render
  for each polygon:
    lifecycles for that APN
    if any lifecycle status=open with lien-family doc type → amber
    else if any lifecycle status=open (deed-family) → indigo (existing)
    else → neutral (existing)
```

## Testing

### New tests

- `src/logic/subdivision-signals.test.ts` — filtering, exclusion, status predicate, lien family (~5 cases)
- `src/logic/release-candidate-matcher.test.ts` — extend with ANGUS-specific assertion (lc-007 produces row ≥ 0.25, `alreadyLinkedTo === null`)
- `src/components/SubdivisionSignalsCard.test.tsx` — render-when-present, null-when-empty, href correctness
- `src/logic/party-roles.test.ts` — `claimant`/`debtor` cases
- Encumbrance-overlay test if a selector module exists (carve one out if not)

### Regression surface

- All POPHAM tests green
- All HOGUE tests green
- Commitment-PDF tests green (ANGUS is new — should not couple)
- Swimlane layout tests green

## Rollout order

1. Data scaffolding: ANGUS parcel + promoted cached instruments + placeholder lien/release.
2. Hunt R-006 (time-boxed 15 min). Replace placeholders with real data where hits land.
3. `provenance-vocab` additions + ProofDrawer synthetic banner.
4. `party-roles` lien-family support.
5. `subdivision-signals` logic module + tests.
6. `SubdivisionSignalsCard` component + tests + wire into `EncumbranceLifecycle`.
7. Encumbrance overlay extension for lien-amber paint.
8. End-to-end walk-through: ANGUS encumbrance route; POPHAM encumbrance route (confirms signals tile); map (confirms amber polygon). Screenshot each.

## Risks

- **R1 — Release's releasing party is an assignee.** If hunt-2 lands but the release names a servicer (not UWM), party-name-match bar will be low. *Outcome:* feature, not bug — mirrors the MERS/Wells-Fargo narrative on POPHAM lc-001. Document in `source_note`.
- **R2 — Wrong-subdivision HOA lien match.** Accept a hunt-1 hit only if (a) against a Seville Parcel 3 lot and (b) claimant is Seville HOA or its management company. Otherwise treat as sub-hunt-3 precedent.
- **R3 — Overlay extension breaks existing polygon paint.** Mitigation: explicit regression test for POPHAM/HOGUE/WARNER/LOWRY paint colors before and after. Carve selector if overlay logic is tangled.
- **R4 — Synthesized release feels dishonest.** *Branch decision at hunt-2 time.* If hunt-2 misses, the default is to keep lc-007 open with the matcher rendering its empty-state "cross-parcel scan" moat note (same as HOGUE lc-003). This preserves the "live matcher running" claim in a weaker form but avoids fabricating a release. Alternative: move matcher demo to WARNER lc-005 by synthesizing a reconveyance there — **not recommended**, same dishonesty concern.
- **R5 — Decision #41 violation.** Design adds no curated links and removes none. ✓
- **R6 — Two-parcel-corpus ceiling.** Unchanged by this work; separate initiative.

## Open branch at hunt time

After hunt R-006 executes at step 2, one decision remains:

> **If hunt-2 misses:** does lc-007 stay open (matcher empty-state moat note) or carry a synthesized release (matcher live-scoring demo)?

**Default (conservative):** Open, matcher empty-state. Preserves corpus integrity. Lose the live-score feature-bar moment on ANGUS, but the HOA lien demo + the POPHAM subdivision tile + map paint still deliver the "neighbor-data moat" claim, and POPHAM lc-001's matcher still renders feature bars (just with `alreadyLinkedTo` populated — not a rediscovery, but scoring is visible).

This default preserves the core deliverable even in the worst-case hunt outcome.
