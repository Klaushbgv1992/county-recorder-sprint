# Landing Map as Product — Completion Summary

**Branch:** `feature/landing-map-as-product`
**Date:** 2026-04-16
**Test delta:** 341 (pre-branch) → 498+ (branch tip)
**Commits:** ~40 on branch (preflight + Batch A/B/C/D)

## Feature scope delivered

The landing page at `/` is now a full-bleed Maricopa County map that
serves as the primary search and discovery interface. A cold visitor
sees 8,570 real parcel polygons in the Gilbert/Chandler corridor,
can search by APN/address/owner/subdivision/instrument, click any
polygon to open a tiered drawer, and toggle three data overlays.

### Components built

| Component | Purpose |
|---|---|
| `MapSearchBar` | Floating autocomplete with tier chips (`Curated · full chain` / `Recorder · cached` / `Assessor · public GIS`) |
| `ParcelDrawer` (4 variants) | Curated (chain+encumbrance CTAs), recorder-cached (last N instruments), assessor-only (honest disclaimer), not-in-seeded-area (dynamic count) |
| `OverlayToggles` | 3-pill toggle strip: Open encumbrances, Curator anomalies, Last deed recorded |
| `EncumbranceOverlayLayer` | Highlights 4 open-lifecycle parcels in moat-blue |
| `AnomalyOverlayLayer` | Severity-colored outlines on 2 anomaly-carrying parcels |
| `LastDeedOverlayLayer` | Recency-banded gradient across all visible polygons |
| `AnomalySummaryPanel` | Inline panel with 3-mechanism dismissal (button, Esc, toggle-off) |
| `CachedNeighborPopup` | Compact hover popup for recorder-cached tier |
| `AssessorOnlyPopup` | Compact hover popup for assessor-only tier |

### Data supply chain

| Asset | Source | Records | Gzipped |
|---|---|---|---|
| `src/data/gilbert-parcels-geo.json` | Maricopa Assessor ArcGIS MapServer | 8,570 parcels | 1,089 KB |
| `src/data/api-cache/recorder/*.json` | Maricopa Recorder public API | 14 instruments across 5 APNs | ~8 KB |

### Pure logic modules

| Module | Purpose |
|---|---|
| `src/logic/assessor-parcel.ts` | Zod schema + `assembleAddress` |
| `src/logic/searchable-index.ts` | `Searchable` union + `buildSearchableIndex` + `searchAll` with tier-aware matching and silent owner-suppression on assessor tier |
| `src/logic/overlay-state.ts` | URL-param parse/serialize/toggle |
| `src/logic/drawer-variant.ts` | `resolveDrawerVariant` pure function |
| `src/hooks/useLandingUrlState.ts` | Unified `?q` + `?apn` + `?overlay` URL state |

## 60-second demo script

1. **Land on `/`** — full-bleed county map loads. 8,570 parcel polygons
   visible in the Gilbert corridor. Open-encumbrances overlay ON by default
   (4 parcels highlighted in moat-blue).
2. **Type "POPHAM" in the search bar** — autocomplete shows POPHAM with
   `Curated · full chain` chip. Address, owner, APN visible.
3. **Click the POPHAM result** (or press Enter) — map flies to the parcel.
   Curated drawer opens: "Open chain of title" + "Open encumbrances" CTAs.
4. **Click "Open chain of title"** — navigates to `/parcel/304-78-386`.
   Existing chain-of-title view renders. Proof Drawer available on click.
5. **Back to `/`** — click a POPHAM neighbor (e.g., lot 45 ANGUS, lot 47
   KALANITHI). Recorder-cached drawer shows last 2–3 instruments with
   provenance pills from `publicapi.recorder.maricopa.gov`.
6. **(Optional) Click any other polygon** in the corridor — assessor-only
   drawer shows honest disclaimer + county-custody footnote.

### Overlay beats (toggle during narration)

- **"Curator anomalies" ON** → 2 parcels glow with severity-colored
  outlines. Panel shows 6 anomalies grouped by APN.
- **"Last deed recorded" ON** → gradient across all 8,570 polygons.
  Legend: "source: Maricopa Assessor public GIS (not the recorder index)."

## Scope cuts (with rationale)

| Cut | Rationale |
|---|---|
| No geocoder for addresses outside the seeded area | Would add a third-party dependency; "not in seeded area" state is more honest |
| Owner autocomplete suppressed on assessor tier | Tonally wrong — "type JASON, see 47 Jasons" reads as skip-tracer, not county portal |
| Per-route code splitting deferred | All routes share one entry chunk; landing-only UI adds ~303 KB. See Known Gap #21. |
| No overlay-transition animations | Sprint-owner directive — toggles are instant, not polished |
| No hover popup for assessor-only tier on map | Thin popups built but wired only for curated tier; assessor hover deferred to integration |
| Mobile overlay toggle sheet | Toggles render flat on mobile; "Layers" collapsible sheet deferred |

## Known gaps introduced

| # | Gap | Reference |
|---|---|---|
| 21 | Landing-only UI in shared entry chunk (~303 KB) | `docs/known-gaps.md` |

## Merge guidance

- **Conflict with heartbeat branch expected** in `src/components/LandingPage.tsx`
  (heartbeat adds a verified-through banner; landing-map restructures the
  page layout). Resolution: heartbeat band sits above the header; the
  full-bleed map section sits below it. Manual merge — ~5 lines.
- **No conflicts expected** in any other file (the landing-map branch
  created 30+ new files but modified only `CountyMap.tsx`,
  `LandingPage.tsx`, `vite.config.ts`, `CLAUDE.md`, and
  `docs/known-gaps.md`).
- After merge: run `npm test`, `npx tsc -b`, `npm run build` — all should
  pass. If heartbeat introduced new tests, the combined suite should be
  the union of both branches' test counts.
