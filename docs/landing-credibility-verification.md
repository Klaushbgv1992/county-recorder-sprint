# Landing Credibility Branch — Verification Report

**Date:** 2026-04-15
**Branch:** `feature/landing-credibility`

## Sub-task 1 — Export Commitment PDF

**Verdict:** Works as designed. See `docs/export-commitment-verification.md`.

```bash
npx vitest run src/components/ExportCommitmentButton.test.tsx
# 5 passed — covers the full pipeline (build → render → blob → download callback)
```

## Sub-task 2 — Featured demo parcels framing

**Verdict:** Verified.

- `src/components/SearchEntry.tsx` no longer renders results when query is empty (gate
  changed from `count > 0` to `count > 0 && hasQuery`).
- `src/components/FeaturedParcels.tsx` renders the new section between map and
  search, with the explainer pointing to POPHAM and a "Recommended demo" badge on
  the POPHAM card. 4 unit tests pass.

## Sub-task 3 — Persona row

**Verdict:** Verified.

- `src/components/PersonaRow.tsx` renders three pills above the search input.
- Routing + terminology side-effect verified by 4 tests in `PersonaRow.test.tsx`:
  - Homeowner → `/parcel/304-78-386` + `terminology-mode=plain`
  - Title professionals → `/parcel/304-78-386/encumbrances` + `terminology-mode=professional`
  - County staff → `/staff` (terminology untouched even when seeded)
- `setMode(mode)` added to `TerminologyContext`, covered by 2 new tests in
  `TerminologyContext.test.tsx`.

## Sub-task 4 — Open Graph + Schema.org

**Verdict:** Verified for crawler use; live social-preview screenshot is out of
reach without a publicly-exposed dev URL.

### Static defaults (raw HTML, what crawlers see)

```bash
$ curl -s -A "Slackbot-LinkExpanding 1.0" http://localhost:5174/parcel/304-78-386
HTTP 200, 2313 bytes
```

The response is the SPA shell (`index.html`) including:

```
<title>Land Custodian Portal — Maricopa County, AZ</title>
<meta name="description" content="AI-enhanced county recorder search portal..." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Land Custodian Portal" />
<meta property="og:title" content="Land Custodian Portal — Maricopa County, AZ" />
<meta property="og:description" content="AI-enhanced county recorder search portal..." />
<meta property="og:image" content="/og-default.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="/og-default.png" />
```

The OG image is served at `/og-default.png` (HTTP 200, image/png, 44919 bytes).

### Per-parcel meta (after JS hydration)

`src/hooks/useDocumentMeta.ts` injects parcel-specific `<meta>` tags and a
Schema.org `Place` JSON-LD payload into `<head>` after React mounts on the
parcel routes. Behavior verified by 6 unit tests in `useDocumentMeta.test.tsx`
including:

- `<title>` set
- og:title / og:description / twitter:title / twitter:image present and
  parcel-specific
- JSON-LD inserted with correct `@type: Place`
- Cleanup removes managed elements on unmount
- No duplicate elements when props change (upsert-in-place via
  `data-managed="useDocumentMeta"` selector)
- JSON-LD removed when `jsonLd` prop becomes `undefined`

### Why a real social-preview screenshot is not in this report

To capture a real Slack/Twitter/LinkedIn unfurl card you would need:

1. The dev server (or a deployed build) reachable from the public internet,
   AND
2. A chat client to paste the URL into.

Neither is available in the sprint environment. What IS verified:

- The static HTML defaults are present in raw bytes that any crawler
  fetches (Slackbot UA test above).
- The `og:image` is served as a real PNG with HTTP 200.
- The structured data on parcel routes (per-parcel meta + JSON-LD `Place`)
  is present in the post-hydration DOM, validated by unit tests.

For a manual finish, paste a parcel URL into a chat client after the next
deploy and confirm:
- Card title says "Land Custodian Portal — Maricopa County, AZ"
  (defaults) — not parcel-specific, because no-JS crawlers can't see the
  per-parcel hydration.
- Card image is the og-default.png.
- Card description is the portal blurb.

If you want per-parcel social previews to render correctly for no-JS crawlers,
that requires SSR or a build-time pre-render — out of scope per Decision #16
(snapshot prototype, server-side stubbed).

## Beat 1 demo script — still works

`docs/demo-script.md` Beat 1 mentions:
- "Point to the landing page map" — present (60vh map at top, unchanged)
- "Point to the three-pillar row below the search box" — present (capability
  cards still below the search section; FeaturedParcels and PersonaRow added
  *above* the cards, so "below the search box" remains accurate)

No demo-script changes needed.

## Final test run

```bash
$ npm test -- --run
Test Files  51 passed | 1 skipped (52)
Tests       304 passed | 1 skipped (305)
```

```bash
$ npm run build
✓ 431 modules transformed.
✓ built in 944ms
```

## Coordination with parallel branch

Coordinator note: `feature-landing-map` worktree is also editing
`LandingPage.tsx`. Surface area of this branch's edits to LandingPage:

- 2 new imports (`FeaturedParcels`, `PersonaRow`)
- 1 new `<FeaturedParcels parcels={parcels} />` between `<section>` map and
  `<section role="search">`
- 1 new `<PersonaRow />` inside the search section, just before the heading
- 1 heading text change (`Or enter a parcel or instrument number directly`
  → `Or look up a parcel directly`)

A 3-way merge with map-only edits should be straightforward as long as the
map worktree keeps its changes scoped to the `<section>` containing
`<CountyMap>` (i.e., the 60vh map block).
