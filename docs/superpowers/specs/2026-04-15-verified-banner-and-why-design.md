# Sitewide verified-through banner + `/why` educational page — design spec

**Date:** 2026-04-15
**Author:** Claude (feature-verified-banner-and-why worktree)
**Status:** Approved for implementation

## Mission

Two related changes that together establish trust on every page and surface the strongest research artifact in the repo (the hunt logs) as a public-facing credibility receipt.

- **Part A — Sitewide "Verified through" banner.** A slim, one-line neutral strip visible on every public route, hidden on `/staff/*`. Replaces the existing dark `PipelineBanner` in-place (same file, refactored). Reuses the already-tested `laggingVsPlant()` selector — no new data, no new constant.
- **Part B — `/why` educational page.** A public-facing long-form page that doubles as an SEO landing surface and converts the two hunt logs (`docs/hunt-log-known-gap-2.md`, `data/raw/R-005/hunt-log.md`) from internal research artifacts into a reader-friendly research narrative. Linked from `LandingPage` header and footer.

## Guiding constraints

- Only ONE sitewide freshness banner. The existing `PipelineBanner.tsx` is refactored in-place, not duplicated.
- Data is data-driven from `src/data/pipeline-state.json` via the existing `laggingVsPlant()` selector. No invented numbers.
- Hunt-log numbers are preserved verbatim when narrating.
- No new dependencies for SEO (React 19 native `<title>` / `<meta>` hoisting) or hunt-log rendering (vite `?raw` import).
- `/moat-compare` and `/pipeline` are read-only inputs — not modified.
- `/staff/*` routes are untouched (they use `StaffPageFrame`, which has its own header treatment).

## Architecture

### Route tree

Introduce a `RootLayout` wrapper that owns the sitewide banner. All existing routes become children of it. The `/staff/*` skip is a single `useMatch("/staff/*")` conditional inside `RootLayout`.

```
routes = [{
  element: <RootLayout />,
  children: [
    { path: "/",                element: <LandingPage /> },
    { path: "/county-activity", element: <ActivityHeatMap /> },
    { path: "/why",             element: <WhyPage /> },           // NEW
    {
      element: <AppShell />,                                       // unchanged
      children: [ /* existing AppShell children unchanged */ ],
    },
  ],
}]
```

### Component boundaries

| Component | Responsibility | Imports from |
|---|---|---|
| `RootLayout` (new) | Renders the sitewide banner + `<Outlet />`; hides the banner on `/staff/*` | `PipelineBanner`, `react-router` |
| `PipelineBanner` (refactored in place) | One-line "Verified through {date} · {N} days ahead of typical title-plant cycle · See pipeline →". Silent no-render if data missing/stale. | `laggingVsPlant`, `currentFreshness` from `src/logic/pipeline-selectors.ts`; `react-router`'s `Link` |
| `WhyPage` (new) | `/why` route — page-level `<title>` / `<meta>`, H1, TOC, 3 sections + closing | `HuntLogSection` (local), `?raw` markdown imports |
| `HuntLogSection` (new, local to WhyPage) | Renders one narrative + expandable `<details>` with raw log + muted source-file citation | `?raw` markdown import |
| `usePageMeta` (new hook, **only if React 19 hoisting proves insufficient**) | Sets `document.title` + injects a meta-description tag as a fallback | `useEffect` |

### Mount wrapping order

`RootLayout` is the outer wrapper; `AppShell` is nested inside it. The banner mounts once at root. Each AppShell route (`/parcel/*`, `/pipeline`, `/moat-compare`, `/staff/*`) renders inside RootLayout → AppShell → Outlet. **This order matters:** reversing it would constrain the banner inside AppShell's `h-screen flex flex-col` and break banner visibility on standalone routes.

## Part A — Sitewide banner

### Data source

Reuse the existing selector pair in `src/logic/pipeline-selectors.ts`:

- `currentFreshness(state).index` → `"2026-04-09"` (displayed verified-through date)
- `laggingVsPlant(state).days_ahead_of_min_plant_lag` → `9` (displayed days-ahead count)

The 14-day baseline is the existing `plant_lag_reference.lag_days_min` constant inside `pipeline-state.json`, already consumed by `PipelineDashboard.tsx`. No new constants introduced.

### Rendered output

```
Verified through 2026-04-09 · 9 days ahead of typical title-plant cycle · See pipeline →
```

- **"2026-04-09"**: `font-mono text-slate-900`
- **"9"**: `font-medium text-slate-900` — weight, not color. Deliberate: government-issued data should look factual, not marketed. Color is reserved for interactive affordance. Code comment explains the choice.
- **"See pipeline →"**: `text-moat-700 hover:text-moat-900 underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-moat-500`. The whole trailing phrase is the link target (`/pipeline`).

### Visual treatment

- Height: 32px (`h-8 px-4 flex items-center`)
- Background: `bg-slate-100`
- Border: `border-b border-slate-200`
- Text: `text-xs text-slate-700`
- One line, no wrap on normal viewports. On very narrow viewports (<480px), the middle "N days ahead…" clause may wrap; acceptable.

### Sticky behavior

- AppShell routes: effectively sticky for free via AppShell's `h-screen flex flex-col` layout. Banner at top, scrollable `<Outlet />` below — no CSS `position: sticky` needed.
- Standalone routes (`/`, `/county-activity`, `/why`): banner renders once at top of body and scrolls away with content. Explicitly non-sticky — banner's job is first-paint trust, not ongoing context. LandingPage's absolute-positioned map overlay would z-index-fight with a sticky banner.

### Graceful degradation

If `currentFreshness(state).index` is missing OR `laggingVsPlant(state).days_ahead_of_min_plant_lag` is negative (stale data) OR the pipeline-state module fails to resolve, the banner renders nothing. Silent no-render; no layout-shift placeholder. (If we ever hit visible layout shift in practice, revisit — not pre-optimizing.)

### Test plan (rewrite of `tests/pipeline-banner.dom.test.tsx`)

Five cases:

1. Renders the exact format `Verified through 2026-04-09 · 9 days ahead of typical title-plant cycle · See pipeline →` from fixture data.
2. Link has `href="/pipeline"` and link text contains "See pipeline".
3. Renders nothing when fixture data is missing or `days_ahead_of_min_plant_lag` is negative.
4. Days-ahead number (`9`) bears `font-medium text-slate-900` class (asserting the deliberate weight-not-color choice).
5. Mounted under `RootLayout` on a non-staff memory-router path: banner present. Under `/staff/foo`: banner absent.

### Files touched (Part A)

- `src/components/PipelineBanner.tsx` — full refactor, same file, same export name
- `src/components/RootLayout.tsx` — NEW
- `src/router.tsx` — wrap existing routes in `RootLayout`
- `src/App.tsx` — remove `<PipelineBanner />` from `AppShell`
- `tests/pipeline-banner.dom.test.tsx` — rewrite all 5 cases
- `tests/root-layout.dom.test.tsx` — NEW — staff-skip test + presence-on-public test

### Viewport check

LandingPage stack: banner (32px) + page header (~72px) + 60vh map. On a 768px-tall viewport, 32 + 72 + 461 = 565px — map ends at ~75% of viewport, above the fold. ✅ Will dev-verify on 768px and 900px during implementation.

## Part B — `/why` page

### Page-level SEO

React 19.2 native hoisting handles `<title>` and `<meta>` inside the component tree — no `react-helmet`-style dependency.

- **`<title>`:** `Why county-owned title data — Maricopa County Recorder Portal`
- **`<meta name="description">`:** `How county recording, indexing, and title-plant search actually work — plus what the public API blocks, with receipts from two failed hunts against Maricopa's publicapi.recorder.maricopa.gov.`

Fallback: if React 19 hoisting proves insufficient in practice (e.g., crawlers don't see the hoisted elements), add a thin `usePageMeta(title, description)` hook that sets `document.title` + inserts a `<meta>` in `document.head` via `useEffect`. Implementation detail; chosen at build time, not a scope question.

### Page structure

```
<h1>Why county-owned title data</h1>
<p>subhead: "How residential title work actually happens, and where the public pipeline falls short."</p>

<nav aria-label="On this page">
  On this page:
    ↓ How county records actually work  (1 min)
    ↓ What title plants can't do        (45 sec)
    ↓ Receipts: the failed hunts        (3 min)
</nav>

<section id="how-records-work">
  <h2>How county records actually work</h2>
  <!-- 3 cards, ~60 words each -->
</section>

<section id="plants-cannot">
  <h2>What title plants can't do</h2>
  <!-- 4 bullets, ~30 words each -->
</section>

<section id="receipts">
  <h2>Receipts: what we tried, what the public API blocked</h2>
  <HuntLogSection narrative={tier1A} raw={tier1ARaw} sourcePath="docs/hunt-log-known-gap-2.md" />
  <HuntLogSection narrative={tier1B} raw={tier1BRaw} sourcePath="data/raw/R-005/hunt-log.md" />
  <p>closing paragraph</p>
</section>
```

### Section 1 — "How county records actually work" (3 cards, ~60 words each)

**Card 1 — Recording → indexing → search.** A deed becomes public in three moments: it's *recorded* (officially filed), then *indexed* (added to a searchable catalog), then *searchable* (anyone can find it). The gap between indexing and search is where title plants live — their value proposition is re-indexing after the county. The county has no such gap. What's recorded is immediately searchable from the same surface that recorded it.

**Card 2 — Chain reconstruction.** Title examiners work backwards. Today's owner names someone who sold it to them, who names someone before them, who names someone before them — a chain of title going back decades. Miss one link and the title is broken. Examiners do this click-by-click because every deed names different parties, filed on different dates, under different instrument numbers.

**Card 3 — Encumbrance lifecycle.** Every lien has a birth (recording) and, usually, a death (release). When the death never gets filed, the lien sits on paper forever — technically still there, legally dead, practically awkward. Tracking which encumbrances have been released and which haven't is half of what an examiner does.

### Section 2 — "What title plants can't do" (4 bullets, ~30 words each)

1. **Lien search by recording code is literally impossible on the public API.** The four lien-related codes — `RE FED TX`, `FED TAX L`, `LIEN`, `MED LIEN` — are in the index, but the search surface refuses to enumerate by them. `totalResults: 0` every time.
2. **Title plants host copies; the county hosts originals.** Every PDF linked from this portal comes from `publicapi.recorder.maricopa.gov` directly. Aggregators serve their own CDN copy behind a subscription.
3. **Plants index on a 14–28-day lag; the county publishes same-day.** Every recorded document is available through the public API the moment it's filed. Indexing lag exists upstream of the plants, not at the county.
4. **Pipeline transparency is custodian-only.** This portal shows five verified-through dates (index, image, OCR, entity resolution, curator) each with its own SLA. No aggregator can report on stages they don't run.

Trailing line: *"Full side-by-side at [/moat-compare](/moat-compare)."*

### Section 3 — "Receipts" (two ~200-word narratives + closing)

Each narrative is an original prose summary of the corresponding hunt log, preserving all numbers verbatim. Below each narrative, an expandable `<details>` element loads the full raw markdown text via vite's `?raw` import — evidence is one click away, crawlable, no parser needed. Below the expanded content, a muted source-file citation (`text-xs text-slate-400 font-mono`) anchors the file path in version control.

**Narrative 1 — Federal-tax-lien hunt (Tier 1-A).** 45 minutes. One goal: find a federal tax lien using only the API the county exposes to the public.

The search endpoint accepts a `documentCode` filter. Every spelling of "federal tax lien" (`FED TAX LIEN`, `FEDERAL TAX LIEN`, `IRS LIEN`, `NFTL`, ten others) returned zero. The short code for federal tax lien isn't in the search vocabulary.

Date filters? Silently dropped. The endpoint accepts the parameter but ignores it. Default sort is ascending by recording number, so every query starts in 1947 and would need ~50,000 pages of pagination to reach 2020. There's no descending sort.

The modern web search page is Cloudflare-gated. The legacy ASP.NET page requires replaying `__VIEWSTATE` tokens that no scripting API can generate. Structural blocker hit in 20 minutes. Stopped.

The hunt pivoted to subdivision encumbrances already cited in POPHAM's deed legal description — and that pivot succeeded, because it didn't require name or code search. Every step was `GET /documents/{known_number}`. That's the shape of what works here and what doesn't.

*Source file in repo: `docs/hunt-log-known-gap-2.md`*

**Narrative 2 — Master-plat hunt (Tier 1-B).** Different question, same API, deeper failure.

Parcel 3's final plat (`20010093192`) says on its face: *"being a resubdivision of a portion of Seville Tract H as recorded in Book 553, Page 15."* One well-formed question with a single-integer answer: what's the recording number for Book 553, Page 15?

Budgeted 200 API calls. Stopped at ~141. Zero hits.

Five API layers blocked the lookup:

1. `documentCode` filter on `/documents/search` silently dropped.
2. `docketBook` and `pageMap` filters silently dropped.
3. Pagination broken — page 10 returns the same 50 records from 1947 that page 1 returned.
4. Hypothesized `byBook/page` and `book/{n}/{p}` endpoints both 404.
5. Legacy book/page bridge URL Cloudflare-gated.

Bracket-scanned `GET /documents/{recordingNumber}` across ~94 sample points in the approved range `20000600000–20010100000`. Plats are 1-in-thousands sparse. No hits.

The side discovery matters more than the miss: four lien-related document codes — `RE FED TX`, `FED TAX L`, `LIEN`, `MED LIEN` — *are* present in the index (they appear inside `documentCodes` when you fetch by recording number) but return `totalResults: 0` from `/documents/search?documentCode=…`. **The codes are indexable but unsearchable** — the index records what the search surface refuses to enumerate.

*Source file in repo: `data/raw/R-005/hunt-log.md`*

**Closing paragraph:** Two failed hunts at adjacent tiers in the same taxonomy is the receipt. One is a one-off. Two is a pattern. The county holds the data. The public API serves documents, not searches. A county-owned portal closes these gaps because only the custodian has both the authoritative source records and the ingestion pipeline to build the indexes the public surface refuses to expose.

### Verbatim-numbers checklist (for self-review)

All of these must appear in the rendered `/why` page:

`45 minutes`, `20 minutes`, `~50,000 pages`, `1947`, `~141 of 200 calls`, `5 API layers` (enumerated 1–5), `~94 sample points`, `20000600000–20010100000`, `Book 553, Page 15`, `20010093192`, `totalResults: 0`, `RE FED TX`, `FED TAX L`, `LIEN`, `MED LIEN`, `__VIEWSTATE`, `publicapi.recorder.maricopa.gov`, `14–28-day lag`.

### LandingPage integration

Two new `<Link to="/why">` entries in `src/components/LandingPage.tsx`:

- **Header:** right-aligned in the header row, visually separate from the tagline (not inline-adjacent). Tagline stays as the standalone brand statement; the link reads as a navigation affordance. At narrow viewports (~375px), the link wraps below the tagline rather than truncating either. Classes: `text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2`.
- **Footer:** new entry in the existing footer row, positioned between "→ View county activity" and "→ Compare to a title-plant report". Matches the styling of the sibling links.

### Test plan (Part B)

- `tests/why-page.dom.test.tsx` — NEW:
  - Renders H1, all 3 H2s, TOC anchors resolve to matching `<section id>`s.
  - All verbatim numbers from the checklist above appear in the rendered output.
  - Both hunt-log `<details>` elements are present and collapsed by default.
  - Muted source-file citations appear once per hunt log.
  - LandingPage header and footer both contain a `<Link to="/why">` with "Why this matters" text.
- `tests/why-page.seo.test.tsx` — NEW:
  - `<title>` element rendered with the exact spec text.
  - `<meta name="description">` with the exact spec text.

### Files touched (Part B)

- `src/components/WhyPage.tsx` — NEW
- `src/router.tsx` — add `{ path: "/why", element: <WhyPage /> }` child of `RootLayout`
- `src/components/LandingPage.tsx` — add two `<Link to="/why">` entries
- `tests/why-page.dom.test.tsx` — NEW
- `tests/why-page.seo.test.tsx` — NEW

## Manual verification checklist

Before declaring done:

- [ ] `npm run dev`, visit `/` — banner appears at top with `Verified through 2026-04-09 · 9 days ahead…`, LandingPage hero map still visible above the fold on 768px and 900px viewports.
- [ ] Visit `/parcel/304-78-386` — banner appears at top of AppShell.
- [ ] Visit `/pipeline` — banner appears; "See pipeline →" click is a no-op stay-on-page (acceptable).
- [ ] Visit `/county-activity` — banner appears.
- [ ] Visit `/moat-compare` — banner appears.
- [ ] Visit `/why` — banner appears; page renders H1, TOC, 3 sections, closing paragraph, both hunt logs collapsed.
- [ ] Visit `/staff`, `/staff/search`, `/staff/queue`, `/staff/parcel/304-78-386` — banner does NOT appear.
- [ ] Expand each `<details>` — full raw hunt log markdown renders as pre-formatted text.
- [ ] View-source on `/why` — `<title>` and `<meta name="description">` present with exact spec text.
- [ ] LandingPage header — "Why this matters" link visible, right-aligned, separate from tagline.
- [ ] LandingPage footer — "→ Why this matters" link visible alongside existing footer links.
- [ ] `npm run build` — succeeds.
- [ ] `npm test` — 288+ passing (all existing tests plus new ones), 0 failing.

## Out of scope (explicit)

- Redesigning `/pipeline` itself
- Modifying `/moat-compare` content
- Analytics / tracking pixels
- Markdown-to-HTML rendering in the `<details>` (raw pre-formatted text is sufficient)
- SSR or server-side meta generation
- Splitting `AppShell` into `PublicShell` + `StaffShell` (right idea long-term, deferred as unrelated architectural cleanup)
- New dependencies for any of the above
