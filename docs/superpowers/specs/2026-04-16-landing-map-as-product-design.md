# Landing Map as Product — Design Spec

**Date:** 2026-04-16
**Branch (proposed):** `feature/landing-map-as-product`
**Status:** Spec, pending plan
**Supersedes (expands, does not replace):** `docs/superpowers/specs/2026-04-15-landing-map-functional-design.md`

---

## 1. Problem

The current landing map (`src/components/CountyMap.tsx` + `src/components/LandingPage.tsx`) shows three highlighted parcel polygons (POPHAM, HOGUE, Seville HOA tract) on a MapLibre basemap inside a 60vh section, with a Featured-Parcels grid and a `SearchEntry` text input below. A cold visitor reads the landing as *"a small demo with an AI sprinkle,"* not *"the county portal."* The disintermediation thesis is captioned but not *felt*.

## 2. Goal

Turn the landing map into the product itself. On page load, a first-time visitor should feel they can find any property in Maricopa County. An evaluator poking at the corpus boundaries should still see we are honest about what is curated vs. what is cached vs. what is assessor-only.

The demo beat this produces: **land, search "POPHAM", fly-to, click drawer, click "Open chain of title," land on existing chain view — under 60 seconds.**

Secondary beat: click a non-curated Seville neighbor → see real recorder-API data cached at build time → feel the custody-and-provenance story without any live fetch.

## 3. Non-Goals

- No new base map provider (Carto Positron stays).
- No new map library (MapLibre GL + react-map-gl stays).
- No live runtime fetch to any `maricopa.gov` endpoint.
- No geocoder; search misses show an honest "not in seeded area" state, not fuzzy address guesses.
- No changes to existing `/parcel/:apn`, `/encumbrances`, `/proof-drawer`, `/moat-compare`, `/county-activity`, `/staff/*` routes or to their tests.
- No new curated parcels (Decision #11 holds — 5 locked).
- No owner autocomplete on assessor-only tier (silent suppression).
- No fabricated "recent recordings (30d)" overlay.
- No unlink action on curated links (Known Gap #15 preserved).

## 4. Constraints

| Constraint | Source |
|---|---|
| 2-day build window | CLAUDE.md hard constraints |
| Manual curation preferred over flaky automation | CLAUDE.md hard constraints |
| Serve captured source documents locally | CLAUDE.md hard constraints |
| No runtime scraping of maricopa.gov | Mission brief |
| Build-time fetch is allowed under A.R.S. § 11-495 with attribution | User directive, 2026-04-16 |
| Tailwind v4 tokens only (`recorder-*`, `moat-*`) | `src/index.css` |
| MapLibre GL already in bundle; no second map lib | CLAUDE.md hard constraints |
| Verified-through date 2026-04-16 preserved (MoatBanner / PipelineBanner) | CLAUDE.md sprint state |
| URL is source of truth for navigation | Decision #36 |

## 4a. Canonical APN reference (for this spec)

The 5 curated parcels, referenced throughout. None change on this branch.

| APN | Owner | Subdivision |
|---|---|---|
| 304-78-386 | POPHAM CHRISTOPHER/ASHLEY | Seville Parcel 3 |
| 304-77-689 | HOGUE JASON/MICHELE | Shamrock Estates Phase 2A |
| 304-78-409 | SEVILLE HOMEOWNERS ASSOCIATION (Tract A) | Seville Parcel 3 |
| 304-78-374 | WARNER KAMA | Seville Parcel 3 |
| 304-78-383 | LOWRY AMY E | Seville Parcel 3 |

## 5. Scope decisions (locked from brainstorm 2026-04-16)

| # | Decision | Value |
|---|---|---|
| S1 | Spatial data source | Build-time fetch of ~1,000–3,000 Gilbert/Chandler parcels from Maricopa County Assessor public ArcGIS REST service → `src/data/gilbert-parcels-geo.json`. Hard cap 2 MB gzipped. |
| S2 | Recorder pre-cache | 5 Seville Parcel 3 neighbors (not POPHAM, HOA, WARNER, or LOWRY). `/documents/search` + last-3 `/documents/{n}` responses cached to `src/data/api-cache/recorder/{apn}.json`. |
| S3 | Search tiers | `Curated · full chain` (5) / `Recorder · cached` (5) / `Assessor · public GIS` (~2,000). |
| S4 | Owner autocomplete on assessor tier | Silently suppressed — no user-facing explanation. Click behavior still shows owner in the drawer. |
| S5 | Overlay set | Three: Open encumbrances (default ON), Curator anomalies (default OFF), Last deed recorded (default OFF). |
| S6 | Overlay URL state | `?overlay=encumbrance,anomaly,lastdeed` (comma-separated, order preserved). |
| S7 | Drawer URL state | `?apn=<selected-apn>` in addition to `?q=` and `?overlay=`. |
| S8 | Initial viewport | Static street-level load (no fit-to-county intro animation). Deep-linked state renders in one paint — no fly-to animation on initial load when `?q=` or `?apn=` is present. |
| S9 | Overlay-transition animations | None. Toggles are instant. |
| S10 | Demo decision log | Add CLAUDE.md Decision #43 (Gilbert seed) and #44 (5 Seville neighbors + tiered drawer) on completion. |

## 6. Architecture

Six components. Each has a clear purpose, a narrow interface, and its own tests.

### 6.1 Data supply chain (build-time scripts)

#### `scripts/fetch-gilbert-parcels.mjs`

Idempotent Node script that discovers, fetches, stamps, and commits the Gilbert/Chandler assessor polygon set.

**Endpoint probe (in order):**
1. `https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/FeatureServer`
2. `https://maps.mcassessor.maricopa.gov/arcgis/rest/services/` (possibly deprecated)
3. Open-data portal indirection via `https://maps-mcassessor.opendata.arcgis.com/` → follow the featured dataset's REST URL

Hit each with `?f=json` to identify the Parcels layer (layer ID, fields, max record count). Log each probe. **On total probe failure:** print the three URLs tried, print a `curl` command the operator can run locally, exit non-zero. Do not invent a URL. Do not guess a layer ID. Do not partial-fetch.

**Query parameters after discovery:**

```
geometryType   = esriGeometryEnvelope
geometry       = xmin=-111.755, ymin=33.225, xmax=-111.695, ymax=33.258, spatialReference={wkid:4326}
spatialRel     = esriSpatialRelIntersects
outFields      = APN, APN_DASH, OWNER_NAME, PHYSICAL_STREET_NUM, PHYSICAL_STREET_DIR,
                 PHYSICAL_STREET_NAME, PHYSICAL_STREET_TYPE, PHYSICAL_CITY, PHYSICAL_ZIP,
                 SUBNAME, LOT_NUM, DEED_NUMBER, DEED_DATE, SALE_DATE, LAND_SIZE,
                 CONST_YEAR, Shape_Length, Shape_Area
returnGeometry = true
outSR          = 4326
f              = geojson
geometryPrecision = 6
resultRecordCount = 2000
resultOffset   = 0 .. N   (paginate while exceededTransferLimit === true)
```

Deliberately excluded from `outFields`: FCV_*, LPV_*, TAX_YR_*, MAIL_* (valuations and mailing addresses — public but unnecessary for the drawer; taking less signals good public-records hygiene).

**Per-feature stamping** (after download, before write):
```json
{
  "source": "maricopa_assessor_public_gis",
  "source_url": "<exact query URL used>",
  "captured_date": "2026-04-16"
}
```

**Top-level `metadata` block** mirrors the pattern in `src/data/adjacent-parcels.json`: source, source_url, captured_date, record_count, bbox, layer_id, attribution (`Maricopa County Assessor`), A.R.S. § 11-495.

**Budget enforcement:** after write, measure gzipped size. If >2 MB, exit non-zero with a message suggesting tighter bbox values. Do not silently truncate.

Script is idempotent — re-running overwrites the output deterministically (same bbox, same fields, same date tag). Not run in CI.

#### `scripts/fetch-seville-neighbors-recorder-cache.mjs`

Idempotent Node script. **Takes 5 APNs × 3 recording numbers = 15 frozen constants** at top of file — not a runtime selection. The Maricopa public API has no name-filtered document search (Known Gap #2), so "which 3 instruments belong to this neighbor" is a **one-time manual research step** performed before the script is run. The manual step is documented in `docs/data-provenance.md` with the exact source used (Maricopa recorder browser UI at `recorder.maricopa.gov/recording/document-search-results.html`), the date of the research, and the APN → recordingNumber mapping.

**Neighbor selection rule** (manual, one-time, documented):

```
From the fetched gilbert-parcels-geo.json:
  WHERE properties.SUBNAME contains 'SEVILLE PARCEL 3'
    AND properties.APN_DASH NOT IN
        ('304-78-386', '304-77-689', '304-78-409', '304-78-374', '304-78-383')
  ORDER BY properties.DEED_DATE DESC (prefer 2013–2021 activity)
  TAKE 5
```

Operator reviews the 5 candidates, visits each in the recorder UI, captures the 3 most-recent instrument numbers per APN, commits the 15 numbers as the script's `NEIGHBOR_INSTRUMENTS` frozen constant, then runs the script. Swapping a dud APN is cheap — change the constant, re-run.

**Fetch plan per instrument** (API confirmed working in R-003, Decision #22):
1. `GET https://publicapi.recorder.maricopa.gov/documents/{recordingNumber}` — full metadata.

For each of the 5 APNs, the script writes one aggregated cache file containing its 3 documents' responses plus pre-normalized display fields. No `/documents/search` calls — that endpoint's name/book-page filtering is silently dropped (Decision #40), so it produces no value here.

**Output file** (`src/data/api-cache/recorder/{APN_DASH}.json`):
```jsonc
{
  "apn": "304-78-…",
  "source_url_per_document": ["…", "…", "…"],
  "captured_date": "2026-04-16",          // actual execution date, stamped by script
  "source_note": "Pre-cached at build-time for prototype; production would query live at click.",
  "display_fields": {
    "last_recorded_date": "2021-06-12",    // derived from max(recording_date) across the 3
    "last_doc_type": "WAR DEED",
    "last_3_instruments": [
      { "recording_number": "…", "recording_date": "…", "doc_type": "…", "parties": ["…", "…"] },
      …
    ]
  },
  "api_response": {
    "documents": [ { "recording_number": "…", …raw /documents/{n} response… }, … ]
  }
}
```

**Rate-limiting etiquette:**
- Minimum 500 ms between calls
- Hard budget: 30 calls total across the run (15 `/documents/{n}` calls + slack for one-off metadata probes)
- Log every call with URL, status, latency
- On any 429 or 5xx: halt immediately, print the offending call, exit non-zero — do not retry blindly

Every committed file must correspond to a polygon the user can actually click (every APN in `api-cache/recorder/` must also appear in `gilbert-parcels-geo.json`). **No orphan fixtures.** An assertion in the script verifies this before write.

#### `docs/data-provenance.md` (operator runbook — written FIRST)

One-page document written **before either fetch script is run**. Serves both as a demo asset (evaluators can open it) and as the operator checklist for re-fetching data. Must contain, in this order:

1. **Run order**: (a) `scripts/fetch-gilbert-parcels.mjs`, (b) filter candidates from output, (c) manual recorder-UI research step, (d) commit `NEIGHBOR_INSTRUMENTS` constant, (e) `scripts/fetch-seville-neighbors-recorder-cache.mjs`.
2. **Gilbert fetch parameters**: endpoint (pasted verbatim after probe succeeds), bbox, outFields, record count at capture, file size gzipped, attribution, A.R.S. § 11-495 citation.
3. **Candidate filter**: the SQL-like rule in §6.1 applied to `gilbert-parcels-geo.json`, producing a short list of Seville Parcel 3 polygons (minus the 5 curated APNs).
4. **Manual research step** (the Known Gap #2 workaround):
   - Exact recorder UI URL family to visit (`https://recorder.maricopa.gov/recording/document-search-results.html?mode=…`).
   - Fields to copy per instrument: `recordingNumber`, `recordingDate`, `documentCode`, `names[]`.
   - How to identify the 3 most-recent per APN (sort by recordingDate descending; take top 3).
   - What to do if a candidate APN has fewer than 3 recorded instruments (swap in the next candidate from the filter list).
5. **`NEIGHBOR_INSTRUMENTS` mapping**: the resulting 5×3 table, with the research date.
6. **Seville fetch confirmation**: post-run, list the 5 cache files, their sizes, and total API call count.
7. **Re-run instructions**: what to change (capture date), what to verify (tests), when re-capture is appropriate (assessor feed structure change, or demo date drift).

This document is the first deliverable of the landing-map branch, not the last. No script is run before it is drafted.

### 6.2 New data types + search index

#### `src/logic/assessor-parcel.ts`

`AssessorParcel` zod schema + type. Minimal shape matching the Gilbert seed's property bag (APN, OWNER_NAME, PHYSICAL_* pieces, SUBNAME, LOT_NUM, DEED_NUMBER, DEED_DATE, LAND_SIZE, Shape_Area, plus the three provenance stamps). Exports a pure `assembleAddress(polygonProps)` helper that produces a display string from STREET_NUM/DIR/NAME/TYPE/CITY/ZIP. Tested round-trip on a representative fixture derived from `src/data/parcels-geo.json`.

#### `src/logic/searchable-index.ts`

```ts
export type Searchable =
  | { tier: "curated";         apn: string; parcel: Parcel }
  | { tier: "recorder_cached"; apn: string; polygon: AssessorParcel; cachedInstruments: string[] }
  | { tier: "assessor_only";   apn: string; polygon: AssessorParcel };

export type SearchHit = {
  searchable: Searchable;
  matchType: "instrument" | "apn" | "address" | "owner" | "subdivision";
};

export function buildSearchableIndex(
  curated: Parcel[],
  cached: Map<string, RecorderCache>,
  assessor: AssessorParcel[],
): Searchable[];

export function searchAll(
  query: string,
  searchables: Searchable[],
  opts?: { limit?: number },
): SearchHit[];
```

Search semantics (mirrors `src/logic/search.ts`, extended for tiers):
- 11-digit query → instrument match. Resolve against curated `instrument_numbers[]` first, then cached `display_fields.last_3_instruments[].recording_number`. Miss → empty result.
- APN match: dashes stripped on both sides, exact.
- Address match: tokenize + substring, assembled from either `parcel.address` (curated) or `assembleAddress(polygon)` (cached, assessor).
- Owner match: multi-token substring (existing `ownerMatches` rule). **Suppressed on `tier: "assessor_only"` via a guard.** The guard is silent — no UI message.
- Subdivision match: substring.

Sort: Curated > Recorder-cached > Assessor-only. Within tier, match-type priority: instrument > apn > address > owner > subdivision. Within match type, stable by APN.

Existing `src/logic/search.ts` stays untouched. Legacy `SearchEntry` on other routes keeps working.

### 6.3 The map itself (`CountyMap.tsx` — extended, not replaced)

Layer stack, bottom to top:

| # | Layer | Visibility | Fill / outline | Clickable? |
|---|---|---|---|---|
| 1 | Carto Positron basemap | always | — | no |
| 2 | Maricopa County outline | always | slate-800 1.5px | no |
| 3 | Assessor-only polygons (~2,000) | zoom ≥ 13 | slate-300 fill @ 8%, slate-500 outline @ 0.5px | yes (when visible) |
| 4 | Recorder-cached neighbors (5) | always | no fill, moat-500 outline @ 2px; small "cached" chip on hover | yes |
| 5 | Curated parcels (5) | always | existing emerald/amber/slate status fills (unchanged) | yes |
| 6a | Overlay: Open encumbrances | toggle | moat-600 fill @ 50%, moat-700 outline @ 2px, on the 4 open-lifecycle parcels | no (does not intercept clicks) |
| 6b | Overlay: Anomaly highlights | toggle | severity-colored outline (red-600 / amber-500 / slate-400) on the 2 anomaly parcels | no (does not intercept clicks) |
| 6c | Overlay: Last deed recorded gradient | toggle | recency-banded fill across every visible polygon; null → outline-only | no (does not intercept clicks) |

**`interactiveLayerIds` ordering** (explicit, top-priority first):
```
[
  curated-*-fill,
  recorder-cached-*-fill-hit,   // invisible hit target matching the outlined polygon
  assessor-only-fill,
]
```
Overlay layers 6a–6c are **never** in `interactiveLayerIds`. They recolor parcels; they do not intercept clicks. The underlying curated/cached/assessor layer handles the click. This prevents clicking an overlay highlight and missing the parcel beneath it.

Because layer 4 (recorder-cached) has no fill by default, we add an invisible fill layer (`*-fill-hit`, `fill-opacity: 0.01`) below the outline to give MapLibre a hit target.

**Overlay-vs-base-fill interaction:** overlay layers render *on top of* layers 3–5. When an overlay fill is active, its color blends with the underlying tier fill (base fill visible beneath at full opacity, overlay at its stated 30–50% opacity). This is intentional — the polygon still reads as "curated parcel" or "assessor polygon" (base color) *and* carries the overlay highlight. The tier chip on the drawer + the overlay legend text disambiguate for an evaluator. Verified during implementation via Preview MCP screenshots listed in §13.

Hover popup behavior:
- Curated: unchanged (`resolvePopupData` + `MapPopup`).
- Recorder-cached: new `CachedNeighborPopup` — compact, shows APN, owner, last recorded doc type + date, "Recorder · cached" chip.
- Assessor-only: new `AssessorOnlyPopup` — compact, shows APN, owner, address, "Assessor · public GIS" chip.

Mobile: existing `MobileBoundsFitter` pattern preserved for the 3 original highlights; extended with no new animation.

### 6.4 Search bar + drawer (new components)

#### `src/components/MapSearchBar.tsx`

Floating, top-center of the map. Always visible. Tailwind classes on an outer wrapper — `absolute top-4 left-1/2 -translate-x-1/2 z-10`.

- Placeholder: `"Search APN, address, owner, subdivision, or 11-digit instrument"`.
- Typing updates local state; `?q=…` updates after a 150 ms debounce to keep URL history manageable.
- Results dropdown renders up to 8 `SearchHit`s with "+N more" footer.
- Each row: two-line card + **match-type chip** (left) + **tier chip** (right).
- **Tier chip wording** (locked):
  - `Curated · full chain` (emerald)
  - `Recorder · cached` (moat-blue)
  - `Assessor · public GIS` (slate)
- Keyboard: ↑/↓ navigate, Enter selects, Esc closes dropdown.
- On select: update `?apn=…`, fly map to polygon centroid at zoom 18 (no animation if the state came from the URL on first paint), drawer opens.

#### `src/components/ParcelDrawer.tsx`

Right-side drawer on desktop (fixed 420 px, slides in via CSS transform, `z-20`). Full-screen modal on mobile (<768 px). Focus trap when open. Esc closes. Clicking the map background does not close (too easy to misfire) — explicit X button + back link.

**Variant selection** (`resolveDrawerVariant(apn, context)`):

| Input | Variant |
|---|---|
| APN in `parcels.json` | `curated` |
| APN in `api-cache/recorder/*.json` (and in Gilbert seed) | `recorder_cached` |
| APN in Gilbert seed only | `assessor_only` |
| APN unresolvable (deep-link to missing APN) | `not_in_seeded_area` |

**Variant 1 — `curated`**: unchanged content. APN + address + owner + current lifecycle summary + two CTAs: "Open chain of title" → `/parcel/{apn}`, "Open encumbrances" → `/parcel/{apn}/encumbrances`.

**Variant 2 — `recorder_cached`**:
- Header: owner, APN, address.
- Provenance pill: `Maricopa Assessor · public GIS · cached 2026-04-16` on assessor fields.
- Section `Last 3 recorded instruments`: three rows from `display_fields.last_3_instruments`, each with a provenance pill: `Maricopa Recorder · cached 2026-04-16`, a doc-type badge, a date, parties.
- Honest disclaimer at top: *"This parcel is indexed but not curated in this demo. The 3 recorded instruments below are cached verbatim from `publicapi.recorder.maricopa.gov`."*
- **Primary CTA:** `→ See a fully curated parcel: POPHAM (Seville Parcel 3)` → `/parcel/304-78-386`.
- **Secondary CTA (smaller):** `or browse all 5 curated parcels ↓` — smooth-scrolls to `FeaturedParcels` section.
- No inline 5-parcel list in the drawer.

**Variant 3 — `assessor_only`**:
- Header + provenance pill (assessor only).
- Section `Assessor fields`: APN, owner, address, subdivision, lot, parcel size, year built, last deed instrument # (assessor DEED_NUMBER), last deed date (assessor DEED_DATE).
- Honest disclaimer: *"This parcel is indexed by the Maricopa County Assessor but is not curated in this demo. The fields below come from the assessor's public GIS feed. The recorder's chain of instruments, lifecycle status, and examiner-reviewed provenance are not populated."*
- No "Open chain of title" CTA (would fake curation).
- Primary + secondary CTAs identical to Variant 2.
- Muted footnote: *"In production, the county — the only party with custody of both the assessor and recorder indexes — would stitch them together at query time."*

**Variant 4 — `not_in_seeded_area`** (search miss, or deep-link to APN outside the seed):
- Header: *"Not in the seeded area."*
- Body: *"The prototype seeds parcel polygons only for the Gilbert/Chandler corridor — {N} parcels captured from the Maricopa County Assessor's public GIS feed on 2026-04-16. In production, the county's authoritative parcel index covers all ~1.6M Maricopa parcels. That's the custody difference title plants can't close."*
- `{N}` is loaded at build from `gilbert-parcels-geo.json.features.length` via a build-time constant (`src/data/gilbert-seed-count.ts`, generated by the fetch script). If `{N}` is ever out of sync with the committed JSON, a test fails.
- Below body: one-click list of the 5 curated parcels (reuses an existing compact parcel card).

Every field row in every variant carries its provenance pill. No field is rendered without a source.

**Drawer dismissal (tier-aware):**

| Surface | Dismissal mechanisms |
|---|---|
| Desktop drawer (≥768 px) | X button (top-right), Esc key, focus trap honored while open. Clicking map background does **not** close. |
| Mobile full-screen modal (<768 px) | Top-left back-chevron button labeled `← Back to map`, browser/hardware back button (modal pushes a history entry on open, pops on close), and tap on an explicit close target. No Esc dependency. |

Both paths call the same `closeDrawer()` which clears `?apn=` from the URL. `tests/parcel-drawer.dom.test.tsx` covers both paths with a viewport-size fixture and asserts that hardware-back triggers the mobile close.

### 6.5 Overlays

#### `src/components/OverlayToggles.tsx`

Pill-button group, horizontal. Pinned top-right of the map: `absolute top-4 right-4 z-10`. Three buttons, each a toggle (`aria-pressed`). Reads from and writes to `?overlay=`.

Button labels:
1. `Open encumbrances` (default ON for landing)
2. `Curator anomalies` (default OFF)
3. `Last deed recorded` (default OFF)

Mobile (<768 px): collapse into a single "Layers" button that opens a bottom sheet with the 3 toggles.

#### `src/logic/overlay-state.ts`

Pure helpers, no React:
```ts
export type OverlayName = "encumbrance" | "anomaly" | "lastdeed";
export function parseOverlayParam(value: string | null): Set<OverlayName>;
export function serializeOverlayParam(s: Set<OverlayName>): string;
export function toggleOverlay(s: Set<OverlayName>, name: OverlayName): Set<OverlayName>;
```

Preserves toggle order in the URL (e.g., `?overlay=encumbrance,anomaly` ≠ `?overlay=anomaly,encumbrance` in URL form, but resolves to the same Set — irrelevant for behavior, tested for parse-serialize round-trip).

#### Unified URL state helper

```ts
// src/hooks/useLandingUrlState.ts
export function useLandingUrlState(): {
  query: string;
  selectedApn: string | null;
  overlays: Set<OverlayName>;
  setQuery(q: string): void;
  setSelectedApn(apn: string | null): void;
  toggleOverlay(name: OverlayName): void;
};
```

Thin wrapper around `useSearchParams`. All three params (`q`, `apn`, `overlay`) read and written through one hook to avoid race conditions between independent `useSearchParams` calls.

#### Overlay layer components

Each is a self-contained component that conditionally renders MapLibre `Source` + `Layer` elements. They accept the `Set<OverlayName>` and do nothing when their overlay is not active.

- **`EncumbranceOverlayLayer`** — reads `lifecycles.json`, selects the 4 open-lifecycle parcels (lc-002 POPHAM, lc-003 HOGUE, lc-005 WARNER, lc-006 LOWRY). For each, render a moat-600 fill at 50% over the polygon. Legend row caption (rendered in `MapLegend`): *"4 open lifecycles visible in this demo seed · production renders across all 1.6M county parcels."*
- **`AnomalyOverlayLayer`** — reads `staff-anomalies.json`, groups by `parcel_apn`, picks max severity per parcel, recolors outline. Clicking the anomaly legend chip opens an inline `AnomalySummaryPanel` (new component, small — stateless list of the 6 anomalies grouped by APN with title + severity dot + one-click "open parcel"). No reuse of staff-workbench `AnomalyCard` to avoid coupling landing-map UI to staff routes' components.

  **`AnomalySummaryPanel` placement and dismissal:**
  - Renders as an **inline panel anchored below the `OverlayToggles` row**, top-right of the map. Not a modal. Not a drawer. Fixed width 320 px; `max-height: 60vh` with internal vertical scroll if the anomaly list grows.
  - Does not compete with `ParcelDrawer` for screen space — drawer stays right-docked, panel stays top-right below the toggles. On narrow viewports (<768 px) the panel docks below the toggle sheet instead.
  - **Dismissal — three mechanisms, all tested:**
    1. Clicking the anomaly-overlay pill toggle a second time (toggle OFF also dismisses the panel)
    2. Clicking the panel's own `×` close button (panel closes but the overlay stays ON)
    3. Esc key on desktop
  - Visibility rule: the panel can only be open when the anomaly overlay is on; closing the overlay closes the panel. A separate boolean tracks "panel manually closed but overlay still on" so re-toggling the overlay doesn't re-open a panel the user dismissed.
- **`LastDeedOverlayLayer`** — reads `DEED_DATE` from every currently visible polygon. Bands:
  - 2020-01-01 or later → emerald-500 fill @ 30%
  - 2015 to 2019 → amber-500 fill @ 30%
  - 2010 to 2014 → slate-400 fill @ 30%
  - pre-2010 → grey-500 fill @ 30%
  - `DEED_DATE` missing → no fill, slate-400 outline @ 1px (outline-only fallback)
  Legend caption: *"Last recorded deed per parcel · source: Maricopa County Assessor public GIS (not the recorder index — see tier chips above)."*

**DEED_DATE source-of-truth** (resolved mechanically, 2026-04-16): the 3 polygons currently in `parcels-geo.json` (POPHAM, HOGUE, HOA tract) carry `DEED_DATE` on their property bag. The Gilbert seed will contribute polygon geometry for WARNER (304-78-374) and LOWRY (304-78-383) with `DEED_DATE` from the assessor. After the seed lands, every curated polygon carries `DEED_DATE` natively. No backfill needed. The outline-only fallback applies only to seeded parcels where the assessor feed returned a null DEED_DATE (rare, but handled).

### 6.6 Landing page restructure (`LandingPage.tsx`)

Desktop top-to-bottom:
1. `RootLayout` header + verified-through banner (unchanged).
2. Map container, `flex-1` — grows to fill remaining viewport height below the banner (replaces 60vh).
3. Inside the map container:
   - `<MapSearchBar>` floating top-center
   - `<OverlayToggles>` floating top-right
   - `<CountyMap>` fills 100%
   - `<ParcelDrawer>` slides in from right when `?apn=…` is set
4. Below the map (scrollable): `FeaturedParcels`, `PersonaRow`, legacy `SearchEntry`, moat cards, footer — all unchanged. These still serve the slower walkthrough beats.

Mobile: search bar docks to top of the map, overlay toggles collapse into "Layers" sheet, drawer becomes full-screen modal. Below-map content unchanged.

## 7. URL state contract (locked)

Canonical landing URL form:
```
/?q=<query>&apn=<selected-apn>&overlay=<comma-separated-overlays>
```

All three params independent. All three persist across page refresh. A deep-link like `/?q=popham&apn=304-78-386&overlay=encumbrance,anomaly` reproduces exact demo state including drawer open and two overlays on, rendered in one paint (no fly-to animation on first-paint deep-link — §S8).

## 8. Bundle strategy (explicit acceptance check)

**Baseline must be captured and committed before any landing-map work starts.** Procedure:

1. On the current `main` tip (pre-feature-branch), run `npm run build`.
2. Run a small committed helper (`scripts/capture-bundle-baseline.mjs`) that reads `dist/.vite/manifest.json`, walks the route chunk graph for `/parcel/:apn`, `/encumbrances`, `/proof-drawer`, `/moat-compare`, `/county-activity`, `/staff`, and writes per-route aggregated chunk sizes to `tests/baseline-bundle-sizes.json`. Keyed by route, values in bytes.
3. Commit `tests/baseline-bundle-sizes.json` on the feature branch's first commit. Without this file the bundle-split test cannot run.

The Gilbert seed (1–2 MB raw JSON, gzipped smaller) must not be loaded on `/parcel/:apn`, `/encumbrances`, `/proof-drawer`, `/moat-compare`, `/county-activity`, or `/staff/*`.

**Implementation:** dynamic `import()` of `src/data/gilbert-parcels-geo.json` inside the landing-page module tree only. `CountyMap.tsx` receives the polygon set as a prop, not as a top-level import. The landing page awaits the dynamic import and renders a lightweight loading state until it resolves.

**Acceptance check (named, scripted):** `tests/landing-bundle.test.ts` runs `npm run build`, reads the new `dist/.vite/manifest.json`, aggregates per-route sizes, compares against `tests/baseline-bundle-sizes.json`, and asserts:
- Every non-landing route chunk aggregate stays within **+2 KB** of its baseline.
- The Gilbert seed appears in a chunk whose entry points are reachable *only* from the landing route.

Fails loudly if either condition fails. The 2 KB tolerance absorbs noise from Vite chunk-id reshuffling without letting real regressions slip.

## 9. TDD surfaces

Every new logic function and component gets tests before implementation. Non-exhaustive list:

| Surface | File | What to test |
|---|---|---|
| `AssessorParcel` schema | `tests/logic/assessor-parcel.test.ts` | Round-trip parse/serialize; `assembleAddress` on edge cases (missing pieces, trailing nulls) |
| `searchAll` | `tests/logic/searchable-index.test.ts` | Tier ordering, match-type priority, owner suppression on assessor tier, instrument resolution across tiers |
| `buildSearchableIndex` | same | Input shape contracts, no mutation of inputs, duplicate-APN handling |
| `parseOverlayParam` / `serialize` / `toggleOverlay` | `tests/logic/overlay-state.test.ts` | Parse-serialize round-trip; order preservation in URL form; unknown tokens stripped; empty param → empty Set |
| `resolveDrawerVariant` | `tests/logic/drawer-variant.test.ts` | All 4 variants selected correctly; APN in multiple tiers resolves to highest (curated wins over cached) |
| Gilbert seed count loader | `tests/data/gilbert-seed-count.test.ts` | Value in `gilbert-seed-count.ts` matches `gilbert-parcels-geo.json.features.length` |
| `MapSearchBar` DOM | `tests/map-search-bar.dom.test.tsx` | Keyboard nav (↑/↓/Enter/Esc), tier chips render correctly, +N more footer, debounced URL write |
| `ParcelDrawer` variants | `tests/parcel-drawer.dom.test.tsx` | Each variant's fields, CTAs, provenance pills; focus trap; Esc closes |
| `OverlayToggles` DOM | `tests/overlay-toggles.dom.test.tsx` | `aria-pressed` state, toggle writes URL, click re-hydrates from URL |
| Overlay layers | `tests/county-map-overlays.dom.test.tsx` | Each overlay appears when toggled, does not intercept clicks (layer ordering assertion) |
| `useLandingUrlState` | `tests/hooks/use-landing-url-state.test.tsx` | All 3 params read/write atomically, no race between setters |
| `fetch-gilbert-parcels.mjs` pure logic | `tests/scripts/fetch-gilbert-parcels.test.mjs` | Provenance stamping, pagination loop termination, 2MB budget enforcement, endpoint-probe fallback ordering, fail-loud on total probe failure |
| `fetch-seville-neighbors-recorder-cache.mjs` pure logic | `tests/scripts/fetch-seville-neighbors.test.mjs` | 500 ms spacing, 30-call budget, 429/5xx halt, `NEIGHBOR_INSTRUMENTS` consolidated validation (see below) |
| `AnomalySummaryPanel` DOM | `tests/anomaly-summary-panel.dom.test.tsx` | Renders 6 anomalies grouped by APN, severity dots correct, click opens parcel |
| Landing bundle split | `tests/landing-bundle.test.ts` | Gilbert seed chunk not present in non-landing route chunks; route chunks do not grow |

Component tests mirror patterns established in `tests/county-map.dom.test.tsx`.

### 9a. `NEIGHBOR_INSTRUMENTS` consolidated validation

One test file (`tests/scripts/fetch-seville-neighbors.test.mjs`) asserts every rule. Five rules, all must pass:

1. **Shape — exactly 5 APNs.** Top-level object has exactly 5 keys.
2. **APN format.** Every key matches `/^\d{3}-\d{2}-\d{3}[A-Z]?$/`.
3. **Instrument format + count.** Each APN's value is an array of exactly 3 strings, each matching `/^\d{11}$/`.
4. **No cross-APN duplicates.** Flattening all 15 recording numbers yields 15 distinct values.
5. **Corpus-boundary respect.** Every recording number's leading 4-digit year is ≤ 2026, and if the year is 2026 the date portion (month-sequence) cannot correspond to a post-2026-04-09 filing. This matches CLAUDE.md Terminology Notes — instrument numbers are YYYY + 7-digit sequence and the corpus boundary is 2026-04-09.
6. **Orphan-fixture guard (consolidated here).** Every APN in `NEIGHBOR_INSTRUMENTS` also appears in the committed `src/data/gilbert-parcels-geo.json` feature set. Prevents a cached file with no polygon to click.

The test loads both `NEIGHBOR_INSTRUMENTS` and `gilbert-parcels-geo.json` at test time; failure on any rule names the offending APN or recording number.

## 10. Accessibility (wired at construction, not bolted on later)

- Keyboard nav in `MapSearchBar` dropdown: ↑/↓ move selection, Enter selects, Esc closes dropdown.
- `ParcelDrawer`: focus trap while open; Esc closes; initial focus goes to the close button; focus restores to the triggering element on close.
- `OverlayToggles`: `aria-pressed` reflects toggle state; visible focus rings (Tailwind `focus-visible:ring-2`).
- All new interactive elements have visible focus states via Tailwind focus-visible utilities.
- Overlay legend chips expose their labels via `aria-label` (chip icon alone is not enough).
- Each test file for a new interactive surface includes at least one assertion on its a11y contract (focus management, aria attributes, or keyboard handling).

## 11. CLAUDE.md decision log entries (to add on completion)

**Decision #43** — Seeded Gilbert parcel polygons from Maricopa Assessor public GIS feed. *Rationale:* Option B from 2026-04-16 landing-map brainstorm. Bounding box, record count, file size, source URL, A.R.S. § 11-495 citation, captured date all committed in `docs/data-provenance.md` and stamped per-feature. Cached at build time, never at runtime. Date: 2026-04-16.

**Decision #44** — 5 Seville Parcel 3 neighbors curated with pre-fetched recorder API responses. *Rationale:* provides the "click any Seville neighbor, the county serves the record right now" moat beat in the guided demo. Selection committed as a frozen constant in `scripts/fetch-seville-neighbors-recorder-cache.mjs` (rule: SUBNAME contains 'SEVILLE PARCEL 3' AND APN not in {POPHAM, HOA, WARNER, LOWRY}, prefer 2013–2021 activity). Tiered drawer model: Curated (5) / Recorder-cached (5) / Assessor-only (~2,000) — chip wording: `Curated · full chain` / `Recorder · cached` / `Assessor · public GIS`. Owner autocomplete silently suppressed on assessor tier. Date: 2026-04-16.

## 12. Implementation phasing

Within the 2-day window; subagent-driven-development where tasks are independent.

**Day 2 morning — preflight (runs before any code):**
- **Task 0: Write `docs/data-provenance.md` operator runbook** per §6.1. This is the first deliverable.
- **Task 1: Capture bundle baseline.** Run `scripts/capture-bundle-baseline.mjs` on the pre-feature tip, commit `tests/baseline-bundle-sizes.json`. The bundle-split test cannot run without it.
- **Task 2: Run `scripts/fetch-gilbert-parcels.mjs`.** Commit `src/data/gilbert-parcels-geo.json` and its per-feature provenance. Update `docs/data-provenance.md` with the actual endpoint and record count.
- **Task 3: Manual recorder-UI research per runbook.** Produce the 5×3 `NEIGHBOR_INSTRUMENTS` table.
- **Task 4: Run `scripts/fetch-seville-neighbors-recorder-cache.mjs`.** Commit the 5 cache files; update provenance doc with the post-run list.

**Day 2 morning — code:**
- `AssessorParcel` schema + `searchable-index.ts` + `overlay-state.ts` + `useLandingUrlState` (TDD, all pure).
- `MapSearchBar` + its tests.
- Hero overlay: `EncumbranceOverlayLayer` (highest-value overlay, build first).
- Curated-variant `ParcelDrawer` (smallest delta — wraps existing content behind the new shell).

**Day 2 afternoon:**
- Recorder-cached and assessor-only drawer variants.
- `AnomalyOverlayLayer` + `AnomalySummaryPanel`.
- Full-bleed layout restructure in `LandingPage.tsx` (breaks tests last, replace with new ones).
- Bundle-split verification against the baseline.

**Day 2 late afternoon (cut if anomalies ran long):**
- `LastDeedOverlayLayer`.
- Mobile polish: search-bar dock, overlay toggle sheet, drawer modal with hardware-back dismissal.
- Preview-MCP screenshot pass.

## 13. Verification plan

Before declaring done:
- `npm run test` — green, including every new test file above.
- `npx tsc -b` — no errors.
- `npm run build` — passes; `tests/landing-bundle.test.ts` asserts the chunk split held.
- Preview MCP screenshots captured for: desktop landing (static, fresh), mobile landing, curated-drawer open, recorder-cached drawer open, assessor-only drawer open, not-in-seeded-area empty state, each of the 3 overlays individually on, all 3 overlays on, autocomplete dropdown with a multi-tier result set, deep-link `/?q=popham&apn=304-78-386&overlay=encumbrance,anomaly` reproducing exact state in one paint.
- 60-second demo beat measured on the sprint owner's machine.

## 14. Open risks (none blocking)

- **R1:** Assessor ArcGIS endpoint may require an auth token even for public parcel reads. Mitigation: probe script fails loudly on 401/403 and reports which URL returned the error — operator can then pivot (provide a documented token, or open the Open Data portal to copy a working URL). No silent fallback.
- **R2:** Gilbert bbox may return >3,000 parcels, tripping the 2MB gzipped budget. Mitigation: on budget exceed, the fetch script computes a concrete shrunken bbox by contracting each side 25% toward the centroid of the input bbox and prints it as a one-line suggestion (`"Suggested retry bbox: xmin=…,ymin=…,xmax=…,ymax=…"`), so the operator pastes the new values and re-runs in under 30 seconds.
- **R3:** 5 selected Seville neighbors may happen to have near-identical recording histories, making the cached-neighbor beat feel flat. Mitigation: selection rule prefers 2013–2021 activity; operator reviews the 5 cached files before committing and swaps any dud APN. Rule lives in script as a comment so swap is documented.
- **R4:** Public recorder API may have changed since R-003. Mitigation: the fetch script halts on any 4xx and reports — the operator can inspect and adjust, not re-run blindly.
