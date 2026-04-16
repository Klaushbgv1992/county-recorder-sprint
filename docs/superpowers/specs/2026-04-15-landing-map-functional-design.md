# Landing Map — Functional Street-Level Entry Point

**Date:** 2026-04-15
**Branch:** `feature/landing-map`
**Status:** Spec

## Problem

Today the homepage map (`src/components/CountyMap.tsx`) defaults to county-wide zoom 8.5. At that altitude, Maricopa County is ~150km across and a 7,000-sq-ft residential parcel is **sub-pixel** — technically rendered, visually invisible. The map functions as a static county outline decoration. Beat 1 of `docs/demo-script.md` tells visitors to "point to the polygons you see" — but there are no visible polygons. The narration is borderline dishonest at the current default.

## Goal

Make the homepage map a functional, street-level entry point that proves the county's spatial-custody moat within 3 seconds. A first-time visitor lands on `/` and immediately:

1. Sees parcel boundaries rendered visibly
2. Understands the polygons are clickable
3. Can hover for owner/APN/encumbrance context
4. Lands on `/parcel/:apn` on click

## Non-Goals

- Adding more parcels to the corpus (Decision #11: locked at 5)
- Swapping map providers (MapLibre GL + react-map-gl stays)
- Building a separate "explore subdivisions" UI
- Adding tax/value data
- A spatial activity overlay (rationale in §10)

## Constraints

- **Decision #11:** Parcel set is locked at 5
- **Decision #36:** URL is source of truth — parcel click navigates to `/parcel/:apn`
- **Tech stack:** MapLibre GL + react-map-gl already wired
- **Plain-English toggle:** all labels respect `TerminologyContext` via `<Term>`
- **County boundary outline:** must remain visible at all zooms
- **Beat 1 of demo script:** must still narrate correctly

## Coordination

- **Terminal 3 (parallel):** building a sitewide "Verified through 2026-04-09 · X days ahead of typical title-plant cycle" sticky strip mounted via a new RootLayout. Lands above the LandingPage header on every page including `/`. The map sits below it; visual planes don't conflict.
- **Terminal 4 (recently merged, PR #2):** added a persona row, "Featured" framing, and OG meta tags in `LandingPage.tsx` and `index.html`. This branch must rebase onto current `main` before opening PR; the persona row sits between header and search box, the map sits between header and the persona row, no line conflict expected.

---

## Design

### 1. Default zoom + computed centerpoint

Default desktop view: **zoom 15** centered on the midpoint of the POPHAM↔HOGUE polygon centroids. POPHAM and HOGUE are ~2km apart on Palmer St in Gilbert; the HOA tract sits ~50m from POPHAM and visually rides along.

**Centerpoint computation:** extracted into `src/logic/compute-map-center.ts` with unit tests (TDD). Reads centroids from `parcels-geo.json` features for the supplied APN list, takes their midpoint, returns `{ longitude, latitude }`. Called once at module load to freeze a named constant `LANDING_MAP_CENTER`. Comment shows the derivation:

```typescript
// Derived from midpoint of POPHAM (304-78-386) ↔ HOGUE (304-77-689) centroids.
// Recompute via computeLandingMapCenter() in src/logic/compute-map-center.ts
// if the highlighted parcel set changes.
const LANDING_MAP_CENTER = computeLandingMapCenter([
  "304-78-386",
  "304-77-689",
]);
const LANDING_MAP_ZOOM = 15;
```

**Verification gate during implementation:** open `npm run dev`, confirm Carto Positron at zoom 15 in residential Gilbert renders the "E Palmer St" street label visibly. If labels are too sparse, bump to zoom 16 and add a "Show counter-example" affordance for HOGUE. Try 15 first. Document the verified value in implementation notes.

**No fly-to animation on initial load.** Static initial frame. Animations only on user-triggered interactions (zoom button, parcel click).

### 2. Mobile fallback

Below 768px viewport width, fall back to `MapGL` `fitBounds` over the 3 highlighted parcel geometries with `maxZoom: 15` and ~24px padding. Hardcoded zoom 15 on a 375px-wide phone shows roughly one parcel — fitBounds prevents that disorienting tight crop. Detection via `window.matchMedia("(max-width: 767px)")` evaluated once at mount.

### 3. "Show full county" affordance

Custom button stacked with the react-map-gl zoom controls (top-left). Small, clear affordance — text label "Fit county" or county-outline glyph. `title="Zoom out to see all of Maricopa County."` tooltip. Click smoothly animates back to a fitBounds over `maricopa-county-boundary.json` with ~32px padding.

A second button "Reset view" returns to `LANDING_MAP_CENTER` + zoom 15 once the user has zoomed out — only visible when zoom < 13. Both buttons live in the same custom-control stack below the react-map-gl zoom controls, top-left.

### 4. HOA tract polygon enrichment

Add the third highlighted polygon for `304-78-409` (TRACT A, SEVILLE PARCEL 3, owner SEVILLE HOMEOWNERS ASSOCIATION) by appending its feature to `src/data/parcels-geo.json`. Source: same Maricopa assessor file the existing 2 polygons came from. This is data enrichment for an existing parcel record, not a new parcel — Decision #11's "5 parcels locked" is preserved.

**Visual treatment:**
- Fill: `slate-400` at 35% opacity
- Outline: `slate-500` dashed (2px weight, matches POPHAM/HOGUE outline weight; only the pattern differs)
- Echoes `SpatialContextPanel`'s dashed subdivision pattern for design-system consistency
- Reads as "context/structure" not "active demo subject"

**Schema flag:** add `parcels.json` field `type: "subdivision_common" | "residential"` (default `residential` if absent). HOA tract gets `subdivision_common`. Popup variant branches on this flag, not on APN — data-driven, not APN-conditional.

### 5. Hover popup

`MapPopup` component anchored to parcel centroid (`anchor="bottom"`, small offset to lift above polygon). `closeButton={false}`, `closeOnClick={false}`. Renders ~220×110px.

Two variants, branched on `parcel.type`:

**Residential variant** (POPHAM, HOGUE):
```
┌──────────────────────────────────────┐
│ POPHAM CHRISTOPHER/ASHLEY            │  font-medium, line-clamp:1
│ 304-78-386 · 3674 E Palmer St        │  text-xs, mono APN
│ 1 open lifecycle · last filed        │
│   2021-01-19                         │  open-count: amber-700 weighted
│ → Open chain of title                │  moat-700 affordance
└──────────────────────────────────────┘
```

**Subdivision-common variant** (HOA tract):
```
┌──────────────────────────────────────┐
│ Subdivision common area              │
│ 304-78-409 · TRACT A, SEVILLE P3     │
│ Holds plat encumbrances (lc-004)     │
│ → Open parcel record                 │
└──────────────────────────────────────┘
```

**Open-count visual rule (residential variant):**
- `count > 0` → amber-700 + `font-medium` weight on the "N open lifecycle[s]" span
- `count === 0` → slate-500 + normal weight (quiet, not asymmetric)

**Date format:** ISO `YYYY-MM-DD` in `font-mono`. Locked per Maricopa terminology note ("normalize to YYYY-MM-DD") and abstractor day-level precision needs.

**Plain-English toggle integration:** wrap labels in `<Term>`:
- "chain of title" → glossary returns "Ownership History"
- "lifecycle" → glossary returns "claim against property" (existing entry: "encumbrance lifecycles" → "Claims Against Property")
- "Click any property" replaces "Click any parcel" when in plain mode

**Per-popup `<Term>` dedup scoping:** wrap each popup's body in its own `<TermSection id={\`popup-${apn}\`}>` so the first-occurrence "?" hint dedup resets per popup mount, not per page. Without this, rapid hover across parcels would either re-fire the hint repeatedly (if dedup is per-render) or never fire after the first popup (if dedup is per-page).

**Popup data resolver** (`src/logic/popup-data.ts`, TDD):
- Input: `apn`, `parcels` (loaded), `instruments` map, `lifecycles`
- Output: `{ owner, address, apn, type, lastRecordingDate, openLifecycleCount }`
- `lastRecordingDate`: max `recording_date` across this parcel's `instrument_numbers`
- `openLifecycleCount`: count of lifecycles where `root_instrument` ∈ this parcel's instruments AND `status === "open"`
- Returns `null` if APN not in corpus

**Popup-legend collision:** popup centroid clamping. If a popup would render within 12px of the legend's bounding box, shift its anchor to the right side of the parcel. Implementation: compute popup screen-space bounds, intersect with legend bounds, shift offset if collision.

### 6. Legend panel

Top-right corner of map, ~180×120px. White background, slate-200 border, slate-700 text, subtle shadow. Persistent (no dismiss button — see §11).

```
┌─────────────────────────────────┐
│ Click any parcel to open its    │  ← header line, font-medium
│ chain of title                  │     <Term> wraps "chain of title"
│                                 │
│ ■ POPHAM — example              │  ← emerald-500 swatch
│ ■ HOGUE — counter-example       │  ← amber-500 swatch
│ ▨ Seville HOA tract             │  ← slate-400/500-dashed swatch
└─────────────────────────────────┘
```

**Swatch implementation:** small `<div>` (14×14px, `inline-block`) with explicit `background-color` + `border` matching each polygon's actual fill/outline treatment. Don't use Unicode glyphs (font rendering varies across systems). The HOA swatch uses `border: 2px dashed slate-500` + `background: slate-400 @ 35%` — same exact treatment as the polygon, scaled down.

**Mobile collapse:** below 768px the legend collapses to a `ⓘ` icon button (~32×32px, top-right). Tap expands the full panel; tap-outside dismisses. Persists nothing — fresh state per page load.

**Plain-English mappings on legend:**
| Professional | Plain |
|---|---|
| "Click any parcel to open its chain of title" | "Click any property to open its ownership history" |
| "POPHAM — example" | unchanged (proper noun) |
| "HOGUE — counter-example" | unchanged |
| "Seville HOA tract" | "Seville HOA common area" |

### 7. County boundary outline

Unchanged from current implementation: line layer over `maricopa-county-boundary.json`, `line-color: #1e293b`, `line-width: 1.5`. Visible at all zooms. At zoom 15 it sits well outside the viewport but renders during "Show full county" zoom-out — preserving the constraint.

### 8. "Why this map matters" caption

Existing bottom-left caption stays as-is. Different job from legend (moat narrative vs. color key), different visual plane. Confirmed during brainstorm — no overlap with legend (top-right).

### 9. Map element layout

Three corners populated, bottom-right empty (balanced):

```
┌─────────────────────────────────────────┐
│ [zoom +/-]              [Legend panel]  │  ← top
│ [Fit county]                            │
│                                         │
│                                         │
│                                         │
│ [Why this map matters caption]          │  ← bottom
└─────────────────────────────────────────┘
```

### 10. Activity overlay — explicitly cut

`activity-synthetic.json` is municipality-grained, already rendered at `/county-activity` via `ActivityHeatMap.tsx`, and would (i) require fetching a Gilbert municipal boundary GeoJSON we don't have, (ii) compete visually with parcel highlights, (iii) duplicate one click away. Cut documented inline in implementation: rationale comment in `LandingPage.tsx` or `CountyMap.tsx` reads:

```typescript
// Activity overlay intentionally omitted (spec 2026-04-15-landing-map §10):
// - municipality-grained, not parcel-grained (unit mismatch on parcel-zoom map)
// - already rendered at /county-activity (ActivityHeatMap)
// - freshness signal already covered by Terminal 3's verified-through banner
// Future: parcel-grained activity belongs in the popup, not as global overlay.
```

### 11. Things deliberately not done

- **No "dismiss legend" button.** Persisted dismiss-state adds complexity; returning users with legend dismissed lose click affordance entirely. Mobile collapse already proves the pattern; desktop 180×120px corner is not a burden.
- **No fly-to animation on load.** Static initial frame. Moving map disorients link-arrival visitors.
- **No pulse animation on polygons.** Contradicts static-frame decision; legend conveys clickability without animation.
- **No adding WARNER/LOWRY polygons.** Sprint scope per Q1 brainstorm — POPHAM, HOGUE, HOA only.
- **No Gilbert municipal boundary fetch.** Activity overlay was the only consumer; cut.

---

## Components

| File | Role | New/Modified |
|---|---|---|
| `src/components/CountyMap.tsx` | Map shell, parcel layers, popup hosting, legend hosting | Modified |
| `src/components/LandingPage.tsx` | Map section consumer; passes 3 highlighted parcels | Modified (HOA added) |
| `src/components/MapLegend.tsx` | Legend panel + mobile collapse | New |
| `src/components/MapPopup.tsx` | Hover popup, two variants | New |
| `src/components/MapZoomControls.tsx` | "Fit county" + "Reset view" custom map controls | New |
| `src/logic/compute-map-center.ts` | Centerpoint computation from APN list (TDD) | New |
| `src/logic/popup-data.ts` | Resolves popup fields from corpus (TDD) | New |
| `src/data/parcels-geo.json` | Add 304-78-409 HOA tract polygon | Modified |
| `src/data/parcels.json` | Add `type` field; HOA tract gets `subdivision_common` | Modified |
| `src/types.ts` (if applicable) | Extend `Parcel` with optional `type` field | Modified |

---

## Testing

**Unit tests (TDD):**
- `src/logic/compute-map-center.test.ts` — covers midpoint of N centroids, single-APN edge case, missing-APN error
- `src/logic/popup-data.test.ts` — covers residential parcel, subdivision_common parcel, parcel with 0 open lifecycles, parcel not in corpus (returns null)

**Integration verification (manual via `npm run dev`):**
- E Palmer St label visible at zoom 15 in Gilbert (Q2 verification gate)
- Three polygons visible at landing
- Hover on POPHAM → popup with Layout A content
- Hover on HOA tract → subdivision-common variant
- Click POPHAM → navigates to `/parcel/304-78-386`
- "Fit county" button zooms out smoothly
- Toggle plain-English mode → legend + popup labels swap
- 375px viewport → legend collapses to icon, fitBounds activates
- Beat 1 narration of demo-script.md still works

**Lighthouse:**
- Score on `/` does not regress more than 5 points vs. current main

---

## Risks

| Risk | Mitigation |
|---|---|
| Zoom 15 too sparse for E Palmer St label visibility | Verification gate during impl; bump to 16 if needed (Q2 contingency) |
| HOA tract polygon source not available | If Maricopa assessor returns 404 for 304-78-409, fall back to a hand-traced approximation from the assessor parcel viewer screenshot — tag with `provenance: "manual_trace"` in feature properties |
| Popup-legend collision more frequent than expected | Implementation does collision clamping; if still buggy, force popup `anchor="left"` for the rightmost-third of viewport |
| Plain-English glossary doesn't cover "lifecycle" cleanly | "encumbrance lifecycles" entry exists; if singular variant is needed, add `"lifecycle": "claim against property"` to glossary |
| Mobile breakpoint timing during map re-render | Evaluate `window.matchMedia` once on mount, not per render; legend mobile detection separate (responsive CSS class) |

---

## Future enhancements (not now)

- Parcel-grained activity data → render in popup as "N recordings in last year" (the only spatial activity surface that doesn't compete with parcel visibility)
- Cluster icons if parcel set ever grows beyond ~10
- Geolocation "near me" affordance for staff portal users

---

## Acceptance

- [ ] Three colored polygons visible within 3s of landing on `/`
- [ ] Legend panel renders with click hint + 3 swatches matching polygon treatments
- [ ] Hover on any of the 3 parcels shows popup with correct variant + data
- [ ] Click on any of the 3 parcels navigates to `/parcel/:apn`
- [ ] "Fit county" button zooms out to county bounds
- [ ] Plain-English toggle swaps legend + popup labels correctly
- [ ] Below 768px, legend collapses to icon and map fitBounds rather than hardcodes zoom
- [ ] Beat 1 of demo-script.md narrates correctly without modification
- [ ] All unit tests pass; baseline test suite still 0 failures
- [ ] Lighthouse on `/` does not regress >5 points
