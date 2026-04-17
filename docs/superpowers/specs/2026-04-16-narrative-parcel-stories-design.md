# Narrative Parcel Stories — Homeowner-Voice Story Pages

**Date:** 2026-04-16
**Sprint context:** Day 2 polish pass; closes the public-portal gap flagged by both independent reviews. See CLAUDE.md Decisions #43–#45 for landing-page state that this work extends.
**Approach:** Option B (templated for all 5 curated parcels + partial-story rendering for 5 cached neighbors), new route `/parcel/:apn/story`, per-parcel narrative overlay JSON files.
**Envelope:** 3–4 hours, itemized at the bottom of this spec. Sits alongside — does not replace — the 2026-04-15 terminology toggle.

## Why this exists

The recruiter's brief names two public-portal priorities: *"focused on innovation and the public portal"* and *"drive traffic back to the county search site."* The shipped app over-indexes on the title-pro persona (Chain of Title, Encumbrance Lifecycle, Proof Drawer) and under-serves anyone who isn't an abstractor. The terminology toggle (2026-04-15) partially addresses this by swapping 15 labels, but the *shape* of every page remains a dense examiner timeline.

This spec adds a third view — **narrative mode** — that restructures a parcel's curated data into a homeowner-readable story. Narrative pages are SEO-indexable, share-preview-rich, and internally crosslinked, which directly executes "drive traffic back to county." They also embed the county-custodial moat callout inline, which subsumes a separate Tier 2 polish item for free.

## Scope

**In scope**
- New route `/parcel/:apn/story`
- Pattern-registry template renderer that converts curated instruments into prose sentences
- Per-parcel narrative overlay files at `src/data/narratives/{apn}.json` (optional per parcel)
- Story pages for all 5 curated parcels (POPHAM, HOGUE, WARNER, LOWRY, Seville HOA common)
- Partial-story pages for all 5 cached neighbors (304-78-338, 304-78-367, 304-78-369, 304-78-406, 304-78-408) rendered from their `src/data/api-cache/recorder/{apn}.json` files
- Per-page `<title>`, `<meta description>`, and `og:description` tags
- Entry points: "For homeowners" persona button retargets to POPHAM's story; every professional-view parcel page gets a "Read as a story →" link near its heading
- Section 4 ("In your neighborhood") internal crosslinks between story pages
- Inline moat callout in every story page (section 6), bundling Tier 2 polish item #5

**Out of scope (deferred)**
- Subscribe-to-parcel notification feature (only a link stub on section 7 CTAs, points to a coming-soon page — the feature itself is Tier 1 #3 from the review synthesis, not shipped here)
- County-wide map as front door (Tier 1 #2 — separate spec)
- Recent-filings stream (Tier 1 #3 — separate spec, only stubbed from this work)
- Landman / STR / mineral overlays (recruiter explicitly deprioritized)
- Translating the existing terminology glossary into the narrative renderer — narrative mode writes prose; it does not consume the `<Term>` component. The terminology toggle only affects professional views.
- Editing narrative pages through the staff workbench
- Live preview of rendered story in the staff workbench

## Architecture

### Route

- `/parcel/:apn/story` — new route registered in `src/router.tsx` (or wherever `/parcel/:apn` lives), inside the `AppShell` outlet.
- Resolves `apn` through the same lookup as the professional view:
  1. Check `parcels.json` (curated) — renders full story mode.
  2. Check `src/data/api-cache/recorder/{apn}.json` (cached neighbor) — renders partial-story mode.
  3. Neither — renders the existing "Not in this corpus" empty state (no new component).

### Component tree

```
<StoryPage apn="...">
  <StoryMeta />                          {/* sets document.title + meta tags imperatively */}
  <StoryHero />                          {/* section 1 */}
  <StoryTimeline />                      {/* section 2 */}
  <StoryCurrentClaims />                 {/* section 3 */}
  <StoryNeighborhood />                  {/* section 4 */}
  <StoryWhatThisMeans />                 {/* section 5 */}
  <StoryMoatCallout />                   {/* section 6 */}
  <StoryFooterCtas />                    {/* section 7 */}
</StoryPage>
```

All components live in `src/components/story/`. Each is a presentational component that receives its slice of already-computed data — no component reads JSON directly. Data composition happens in `StoryPage` via a `useStoryData(apn)` hook that returns one typed `StoryPageData` object.

### Data flow

```
  curated instruments.json  ──┐
  parcels.json                ├──►  useStoryData(apn)  ──►  StoryPageData  ──►  components
  narratives/{apn}.json       │
  api-cache/recorder/{apn}.json ─┘
```

`useStoryData(apn)`:
- For curated APNs, reuses `loadParcelDataByApn(apn)` from existing `src/data-loader.ts`, then merges optional `narratives/{apn}.json` overlay.
- For cached-neighbor APNs, reads `src/data/api-cache/recorder/{apn}.json` (the list of cached APNs is `src/data/api-cache/recorder/index.json`) and normalizes it into a restricted `Instrument[]` shape. Cached-neighbor records come from the public API — which per Decision #29 does not provide reliable grantor/grantee roles — so the adapter preserves `names[]` as a flat list without role assignment. This restricts which patterns can fire on cached-neighbor data (see "Pattern availability by mode" below).
- Returns a single `StoryPageData` object:

```ts
interface StoryPageData {
  apn: string;
  mode: "curated" | "partial";
  parcel: Parcel;
  hero: { oneLiner: string; metaDescription: string };
  timelineBlocks: TimelineBlock[];       // section 2 rendered sentences
  currentlyOpen: CurrentClaim[];          // section 3
  neighborhood: { subdivision: NeighborhoodLine; neighbors: NeighborLink[] };
  whatThisMeans: string;                  // section 5 resolved prose
  moatCallout: string;                    // section 6 resolved prose
}
```

### Template engine

Lives at `src/narrative/engine.ts`. Exports two pure functions:

```ts
renderTimeline(instruments: Instrument[], links: DocumentLink[], overlay?: NarrativeOverlay): TimelineBlock[]
renderHero(parcel: Parcel, instruments: Instrument[], overlay?: NarrativeOverlay): { oneLiner; metaDescription }
```

**Pattern registry** (`src/narrative/patterns.ts`) is an array of `Pattern` objects:

```ts
interface Pattern {
  id: string;                                    // e.g. "purchase_from_trust"
  match: (group: InstrumentGroup) => boolean;    // predicate against a same-day group
  render: (group: InstrumentGroup) => string;    // returns prose sentence
}
```

A same-day group is a pre-computed bundle of instruments sharing `same_day_group_id` (already populated in the data loader via `inferSameDayGroups`). The engine walks groups chronologically, matches each against the registry in order, emits the first matching pattern's sentence, and appends any `overlay.callouts[instrument_number]` as an aside below the sentence.

**Required patterns** (covers POPHAM, HOGUE, WARNER, LOWRY, Seville HOA + the 5 cached neighbors):

| Pattern ID | When it fires | Example output |
|---|---|---|
| `subdivision_plat` | Instrument is in `src/data/subdivision-plats.json` — explicit membership keeps the predicate data-driven rather than depending on document-type heuristics | "Your lot was first platted as Lot {lot} of {subdivision}, recorded {date} by {dedicator}." |
| `affidavit_of_correction` | Instrument has a `back_references` entry pointing to an instrument already matched by `subdivision_plat` | "The plat was later corrected by an affidavit recorded {date} — this fixed a minor legal-description issue the county caught before sales began." |
| `purchase_from_trust` | Deed family + grantor role is a trust entity | "In {year}, {grantees} purchased the home from {trust_name} — a revocable family living trust, a common way families pass homes between generations." |
| `purchase_from_individual` | Deed family + grantor role is a person | "In {year}, {grantees} bought the home from {grantors}." |
| `purchase_money_dot` | `deed_of_trust` same-day-grouped with a deed | "They financed the purchase with a mortgage from {lender}, recorded the same day as the sale." |
| `refinance_dot` | `deed_of_trust` with no same-day deed, preceded by an existing open DOT | "On {date}, they refinanced with a new mortgage from {lender} — {days_to_release} days before the prior mortgage was paid off, a typical refinance pattern." |
| `standalone_dot` | `deed_of_trust` not matching the above | "On {date}, they took out a {amount_or_unstated} mortgage from {lender}." |
| `release_clean` | `full_reconveyance` where the releasing party matches the original DOT beneficiary | "That mortgage was paid off on {date}." |
| `release_by_third_party` | `full_reconveyance` where the releasing party does not match the original beneficiary (MERS case) | "That mortgage was paid off on {date} — the release was signed by {releasing_party}, not the original lender, because the loan had been sold or transferred. The county records the release either way." |
| `ucc_termination` | `ucc_termination` document type | "A UCC financing statement (a filing used for personal-property collateral like solar leases) was terminated on {date}." |
| `heloc_dot` | `heloc_dot` document type | "On {date}, they opened a home-equity line of credit with {lender}." |
| `generic_recording` | Cached-neighbor instrument that needs role-aware prose the adapter can't supply | "On {date}, a {doc_type_label} was recorded for this parcel naming {names_joined}." |
| `partial_chain_disclosure` | Fires once at the top of a cached-neighbor (partial) page | "The county has {n} recorded documents for this parcel — here's what they say. This isn't a complete ownership history; for older records, a title examiner would request the county archive. You're seeing the same authoritative record they'd see." |
| `fallback` | No other pattern matched on curated data | "On {date}, a {doc_type_label} was recorded." (last-resort; should be rare on curated parcels) |

**Pattern availability by mode.** Curated pages can match any pattern. Partial (cached-neighbor) pages can match only `partial_chain_disclosure` (once, at the top) and `generic_recording` (per instrument). This keeps role-dependent prose like "the Pophams bought from the Madisons" out of pages where roles can't be trusted. When the corpus is later enriched with OCR-derived roles for a cached neighbor, that neighbor can graduate to full pattern matching by moving into `parcels.json` with `instrument_numbers`; no engine change required.

Patterns are ordered in the registry; the first match wins. Adding a pattern is a pure-data change — no engine code touched.

### Narrative overlay schema

File: `src/data/narratives/{apn}.json` (optional per parcel).

```json
{
  "hero_override": "string | null",
  "callouts": {
    "20130183449": "prose to render below the templated sentence for this instrument"
  },
  "what_this_means": "string — section 5 body",
  "moat_note": "string — section 6 body (optional, falls back to generic)"
}
```

**Validation:** Zod schema `NarrativeOverlayFile` added to `src/schemas.ts`. Engine imports are wrapped in `try/catch` with a structured log on parse failure — a bad overlay file renders the templated page without the overlay instead of crashing the route.

**POPHAM gets full overlay.** 4 other curated parcels get `what_this_means` only. Cached neighbors get no overlay file — the `partial_chain_disclosure` pattern and generic `what_this_means` fallback carry them.

### Fallback cascade

| Missing | Behavior |
|---|---|
| No overlay file | Render from templates only; section 5 uses generic fallback; section 6 uses generic fallback. |
| Overlay present, `hero_override` absent | Template-generated hero. |
| Overlay present, `callouts[N]` absent | No aside rendered for instrument N. |
| Overlay present, `what_this_means` absent | Generic section 5: *"This is the recorded ownership history of {address}, assembled from documents filed at the Maricopa County Recorder. If you're buying, selling, or refinancing, a title examiner would verify this chain against the same documents."* |
| Overlay present, `moat_note` absent | Generic section 6: *"A title-plant snapshot would show you the document list above — but the details that live only in each document's pages (legal descriptions, trust names, MERS relationships) come directly from the county's records. [See how we compare to a title plant →]"* |

No section ever renders empty. Every degradation produces truthful, homeowner-readable prose.

## Page sections — rendering details

1. **Hero** (`StoryHero`) — renders the one-liner in `<h1>` size. Generated by `renderHero()` which uses: parcel address, most recent deed grantee(s), a single summary phrase for currently open encumbrances. Hero text doubles as `<meta name="description">` and `og:description`.
2. **Story timeline** (`StoryTimeline`) — renders `TimelineBlock[]` as flowing prose paragraphs grouped by era (pre-purchase subdivision events → ownership → financing lifecycle). Inline callout asides render as `<aside>` elements with a muted left border, slightly smaller type.
3. **Currently open claims** (`StoryCurrentClaims`) — enumerates open `EncumbranceLifecycle` rows in homeowner voice (curated mode only; lifecycles are only populated for curated parcels). For partial (cached-neighbor) pages, this section renders: *"We don't have enough documents on file for this parcel to determine which claims are currently open. A title examiner would request older records from the county archive — the county has them."* Empty state on a curated parcel with no open lifecycles: *"No claims are currently open against this property."*
4. **In your neighborhood** (`StoryNeighborhood`) — renders a subdivision line (from `parcel.subdivision` + plat-instrument lookup) and an inline list of neighbor links. Neighbor list is computed from `src/data/adjacent-parcels.json` + cached-neighbor index. Each neighbor link goes to that neighbor's own `/parcel/:apn/story` page (curated or partial). Empty state: *"This parcel isn't mapped to a subdivision in our index."* (Only the Seville HOA common tract legitimately hits this.)
5. **What this means for you** (`StoryWhatThisMeans`) — renders overlay `what_this_means` or the generic fallback. POPHAM's overlay contains the MERS transparency note referenced in CLAUDE.md Decision #34 so a homeowner learns why the 2021 release is signed by Wells Fargo rather than VIP Mortgage.
6. **Inline moat callout** (`StoryMoatCallout`) — renders overlay `moat_note` or generic fallback. The callout ends with an inline link to `/moat-compare` (`[See how we compare to a title plant →]`). This is the Tier 2 #5 polish item inlined.
7. **Footer CTAs** (`StoryFooterCtas`) — horizontal row of four links:
   - *Read the examiner's detailed chain →* → `/parcel/:apn`
   - *Export as commitment →* → `/parcel/:apn/commitment/new`
   - *See all claims against this parcel →* → `/parcel/:apn/encumbrances`
   - *Subscribe to new filings on this parcel →* → `/subscribe?apn=...` (stub page: "Coming soon — here's how it will work and why a title plant can't offer it")

The subscribe stub page is a single small component (`<SubscribePlaceholder>`) added to the router — zero ongoing work, earns the CTA without shipping a real pipeline.

## Entry points

- **Persona row button "For homeowners"** ([PersonaRow.tsx](src/components/PersonaRow.tsx)) — `to` prop changes from its current destination to `/parcel/304-78-386/story`. Existing tests in `PersonaRow.test.tsx` updated.
- **Professional view heading** — in `ChainOfTitle.tsx`, adjacent to the `<h2>Chain of Title</h2>` element, a small muted link `<Link to={`/parcel/${apn}/story`} className="...muted text-xs...">Read as a story →</Link>`. Rendered only when `apn` resolves to either a curated parcel or a cached-neighbor APN (i.e., a story page exists). Gating goes through a new helper `storyPageExists(apn): boolean` in `src/narrative/availability.ts`, which checks the curated APN set (from `parcels.json`) and the cached-neighbor APN set (from `src/data/api-cache/recorder/index.json`). The same helper is used by the route resolver in `useStoryData(apn)` to decide between full-story and partial-story mode, so there is one authoritative answer to "does this APN have a story page?"
- **Landing-page featured parcels grid** — each parcel card gets a small secondary link "Read the story →" in addition to the existing "Open chain of title" CTA.

## SEO + shareability

- `StoryMeta` component sets via `useEffect`:
  - `document.title` = `"<address> — Ownership Story | Maricopa County Recorder"`
  - `<meta name="description">` = hero one-liner
  - `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:type" content="article">`
- No SSR — client-side title writes are sufficient for this sprint; social-media scrapers that don't execute JS will miss the tags, which is an accepted limitation explicitly noted in the spec.
- Internal link graph: each curated story links to 3–5 neighbor stories via section 4. With 10 story pages total, the internal link density is sufficient for the demo's traffic-driving pitch without any external SEO work.

## Accessibility

- Each section uses `<section aria-labelledby="story-section-{id}">` with a corresponding visually-hidden (or visible, for some) heading.
- Footer CTAs are a `<nav aria-label="Actions for this parcel">`.
- Hero one-liner is an `<h1>`; all subsequent section headings are `<h2>`.
- Callout asides use `<aside>`, inheriting the section's semantic context.
- Prose is left-aligned and constrained to `max-w-prose` for readability; no justification.
- Moat-callout inline link has a visible focus ring using the existing `focus-visible:ring-moat-500` utility.

## Testing

New test files:

- `src/narrative/engine.test.ts` — unit tests for `renderTimeline` and `renderHero` against fixture instrument groups. Covers: each of the 13 patterns firing, pattern ordering (first match wins), overlay merging, missing-overlay fallback, cached-neighbor adapter, `partial_chain_disclosure` firing exactly once at the top of partial pages.
- `src/narrative/patterns.test.ts` — parametric tests for each pattern's `match` predicate against known groups: POPHAM's 2013 purchase matches `purchase_from_trust`, POPHAM's 2021 release matches `release_by_third_party`, HOGUE's 2015 DOT matches `purchase_money_dot`, etc.
- `src/components/story/StoryPage.test.tsx` — snapshot renders of POPHAM (full overlay) and 304-78-406 (cached neighbor, no overlay) to catch regressions in template output and section ordering.
- `src/components/PersonaRow.test.tsx` — updated assertion for the "For homeowners" button's `to` prop.

Existing tests remain green:
- `terminology-context.test.tsx`, `term-component.test.tsx` — narrative mode does not touch the terminology toggle.
- Existing `ChainOfTitle`/`EncumbranceLifecycle`/`ProofDrawer` tests — professional view unchanged except for the added "Read as a story →" link, which is covered by one new assertion in the existing file.

## Known gaps / deferred

- **Meta tags are client-side only.** Non-JS crawlers (many social previews) will not see the `og:description`. Accepted for sprint; server-side meta is production scope.
- **Section 4 neighbor list uses `adjacent-parcels.json` + cached-neighbor index as the adjacency source.** If the data doesn't identify ≥3 neighbors for a curated parcel, the section renders whatever exists (minimum 1) and adds a muted note: *"We index neighbors as we add them."* Not a crash path.
- **Subscribe-to-parcel is a stub.** The CTA exists, the page renders a placeholder pitch, no notification pipeline ships. This is intentional — the link itself advances the traffic-driving thesis without eating the envelope.
- **The 2026-04-15 plain-terminology toggle is not applied inside narrative mode.** Narrative prose is written in plain English from the start; routing terminology translation through generated prose would introduce double-translation artifacts (e.g., "Mortgage" translated from "Deed of Trust" rendering as "Home Loan"). Narrative pages always render as themselves. The toggle in the header is hidden on `/parcel/:apn/story` routes.
- **No story pages outside the 5 curated + 5 cached = 10 APNs.** Typing `/parcel/999-99-999/story` hits the existing "Not in this corpus" panel. This is the same scope rule used elsewhere in the app.

## Success criteria

1. `/parcel/304-78-386/story` renders with all 7 sections, hero one-liner accurate, MERS note visible in section 5.
2. `/parcel/304-78-406/story` (cached neighbor) renders the `partial_chain_disclosure` hero, a 2–3-sentence timeline, section 4 linking to POPHAM + other Seville neighbors, a generic section 5, an abbreviated section 6, and full footer CTAs.
3. All 10 story URLs return a populated page with no console errors.
4. Each story page has a distinct `document.title` and `<meta name="description">`.
5. Clicking "For homeowners" on the landing page opens POPHAM's story page.
6. The professional view of every curated or cached-neighbor parcel shows a "Read as a story →" link near the heading.
7. `npm test` passes, `npm run lint` passes, `npm run build` succeeds, console is clean on every route.
8. A homeowner reviewer (non-technical) can read POPHAM's story end-to-end and restate what happened in their own words without needing definitions.

## Time envelope — itemized

| Item | Estimate |
|---|---|
| Route registration + `StoryPage` shell + `useStoryData` hook + cached-neighbor adapter | 35 min |
| Pattern registry (14 patterns including `generic_recording`) | 45 min |
| 7 section components with fallback behavior | 45 min |
| SEO meta (`StoryMeta` component) | 10 min |
| `storyPageExists` helper + `subdivision-plats.json` membership lookup | 10 min |
| POPHAM narrative overlay (full) | 20 min |
| 4 other curated overlays (`what_this_means` only) | 15 min |
| Entry points (PersonaRow, ChainOfTitle link, FeaturedParcels secondary link) | 15 min |
| Subscribe stub page + route | 10 min |
| Unit tests (engine + patterns) | 30 min |
| Component tests (StoryPage snapshot, PersonaRow update) | 20 min |
| Manual QA across all 10 story URLs + professional views | 15 min |
| **Subtotal** | **4h 10m** |

This is longer than the 3-hour upper bound the brainstorm initially floated. The honest estimate is 3½–4 hours; the spec reflects that so the implementation plan sizes correctly rather than rushing the last items. If a 3-hour hard cap is needed, the cuttable items (in order) are: (1) manual QA depth → reduce to POPHAM + one neighbor only, (2) 4 non-POPHAM `what_this_means` overlays → ship them with the generic fallback for all four, (3) the secondary "Read the story →" links on the featured-parcels grid. The subscribe stub stays because its CTA is the cheapest traffic-driving hook in the whole spec.

## Traceability to recruiter brief

- *"Focused on innovation and the public portal"* → narrative mode itself is the innovation; it transforms recorded documents into prose, which no county portal (and no title plant) currently does.
- *"Drive traffic back to the county search site"* → SEO-indexable story pages, shareable URLs, internal crosslink graph across 10 pages.
- *"Beat the competition — title plants"* → inline moat callout on every page + MERS transparency note (the single sharpest anti-plant talking point in the corpus) surfaced in prose.
- *"Understand why the industry operates the way it does today"* → the `release_by_third_party` pattern and POPHAM's MERS callout explicitly teach a homeowner *why* a Wells Fargo reconveyance shows up on a VIP Mortgage loan. Few demos would have this.
- *"Research depth over AI surface polish"* → prose is deterministic template rendering, not LLM generation. The pattern registry is inspectable, testable, and version-controlled. Every sentence can be traced back to data plus a specific pattern.
