# /moat-compare Route — Tier 1-D, D1 Design

**Status:** Approved 2026-04-14
**Target file:** new `src/components/MoatCompareRoute.tsx`; `src/router.tsx` route entry; sibling test file
**Scope:** Static side-by-side comparison of an aggregator-style ("DataTree") property report vs. the prototype's surfacing of the same fields for parcel 304-78-386. No live third-party integration. Direct realization of `docs/prompt-fit-analysis.md` Section 3.2.

---

## Why this route

The prompt-fit analysis names the gap explicitly: *"the demo tells you a title plant can't do this. It doesn't show you a title plant's output next to the prototype's output. A split-screen … would make the moat visceral. Today the moat is a green badge and a rationale string."* Section 3.2 prescribes the fix as a static screen with field-by-field provenance deltas — D1 is the literal implementation of that prescription.

The route serves a single demo moment: the presenter says "now look at `/moat-compare`," lands on the comparison, and the audience sees the moat in one screen. Every design choice below optimizes for that one moment.

---

## The five rows

Same row labels on both sides, so the eye saccades horizontally. Tier anchors named because each row exists to render the receipt of one of the three merged tiers.

### Row 1 — Current owner of record

**This row carries moat signal, not fairness signal.** Both sides print the same owner string. The delta is *provenance depth*: the aggregator can name the owner but cannot show its work. The prototype names the owner and renders the source instrument as a clickable recording number with the deed date.

DataTree side:
> POPHAM CHRISTOPHER / ASHLEY
> `[ProvenanceTag: aggregator index]`

Prototype side:
> POPHAM CHRISTOPHER / ASHLEY
> `[ProvenanceTag: County Deed]`
> `↗ recording 20130183449` · 2013-02-27

This row substitutes for the redundant Callout A ("they estimate, we verify") — the framing makes the point structurally instead of editorially. **Do not use the existing `ProvenanceTag` component for the DataTree side**; create a single-purpose `AggregatorTag` (gray, italic, no confidence number, label `aggregator index`) so the visual asymmetry between the two sides is unmistakable.

### Row 2 — Open encumbrances (DOTs / liens)

**Tier 1-A anchor** (LinkedMatchEvidence + release-candidate scorer).

DataTree side:
> 1 open mortgage (estimated)
> `[AggregatorTag: aggregator index]`

Prototype side:
> 2 lifecycles tracked
> • lc-001 (2013 DOT) → released 2021-01-22
> • lc-002 (2021 DOT) → open · "no reconveyance found in corpus"
> `[ProvenanceTag: Hand-Curated 100%]`
> `↗ recording 20210075858`

### Row 3 — Lien search by recording code

**Tier 1-B anchor** (hunt log + REL FED TAX L / LIEN / MED LIEN documentCode receipts).

DataTree side:
> No federal-tax-lien hits (estimated; refresh cadence 30 days)
> `[AggregatorTag: aggregator index]`

Prototype side:
> No FED TAX L / LIEN / MED LIEN matches in this parcel's curated corpus
> "Public API documentCode filter is silently dropped — see `docs/hunt-log-known-gap-2.md` and `data/raw/R-005/hunt-log.md`. A county-internal index closes this gap."
> `[ProvenanceTag: County API + Hunt Log]`

### Row 4 — Document image source

DataTree side:
> Aggregated copy stored on the aggregator's CDN; subscription required for full-resolution download
> `[AggregatorTag: aggregator copy]`

Prototype side:
> Canonical county PDF served by `publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=20130183449`
> `[ProvenanceTag: County API 100%]`
> `↗ open authoritative PDF`

### Row 5 — Index freshness

**Tier-general anchor** (visual precedent: `MoatBanner`).

DataTree side:
> Indexed monthly (typical aggregator cadence)
> `[AggregatorTag: aggregator index]`

Prototype side:
> Reuse the existing `MoatBanner` component verbatim, fed the parcel's `pipelineStatus`. Renders the five-stage pipeline + "Records verified through 2026-04-09."

---

## The three callouts

Inserted **between rows**, anchored to the row each one explains. Each callout carries a `data-callout-anchor` attribute that names the row it is bound to so the binding is testable.

| Anchor row | Callout text |
|------------|--------------|
| `row-3` (lien-search) | "**They can't search liens.** The taxonomy lives in the county's own system." |
| `row-4` (document image) | "**They host a copy. We host the original.**" |
| `row-5` (index freshness) | "**They index monthly. The county publishes same-day.**" |

Visual style: a thin horizontal band spanning both columns, with a small "› why this matters" left-aligned label and the bolded callout text. Reuse the MoatBanner blue palette for the band background at low intensity (`bg-blue-50` body, `text-blue-900` text) so the callout reads as part of the moat narrative without overpowering the rows.

---

## The closing Tier 1-C callout

A footer band below Row 5, distinct from the three structural-delta callouts:

> "Both surfaces produce a property report. Only the prototype emits a Schedule A + B-II title commitment with per-row provenance and authoritative county PDF URLs. Generate one from any parcel page via `Export Commitment for Parcel`."

This footer is **not** anchored to a row (it summarizes the abstract output, not a row delta) and does not carry a `data-callout-anchor`. It links to `/parcel/304-78-386` so the presenter can pivot from the comparison to the export demo.

---

## Visual hierarchy

Hard vertical divider. Two columns. Centered narrow gutter for row labels.

- Outer container: `max-w-7xl mx-auto px-6 py-8`
- Two columns: each column `flex-1`, divided by a `border-l border-gray-300` between them
- DataTree column container: neutral `bg-gray-50` tint
- Prototype column container: faint `bg-blue-50` tint, inheriting the MoatBanner color identity at low intensity
- Row labels: centered between the two columns in a narrow `w-48` gutter, sticky-aligned to row top
- Callouts: full-width band that spans both columns, breaking the divider visually so the eye registers them as a *cross-column statement* rather than belonging to either side

---

## Header and subtitle

Above the comparison:

> ### Moat comparison: aggregator vs. county-owned portal
> *Showing parcel 304-78-386 — POPHAM CHRISTOPHER / ASHLEY, 3674 E Palmer Street, Gilbert. Prototype corpus contains two parcels; the second (HOGUE 304-77-689) is reachable via [Search](/).*

The DataTree side never prints the word "DataTree" or "First American" or any product name. It is labeled *"Aggregator-style property report"* and the AggregatorTag prints `aggregator index` / `aggregator copy`. This is honest framing — we are not impersonating a product, we are showing the field-category shape of the aggregator output.

---

## Empty-state / route population

`/moat-compare` always renders the POPHAM 304-78-386 comparison. No picker, no `:apn` parameter, no redirect to `/`. The route is a deep-link demo moment; a picker or a redirect would defeat the deep-link.

---

## Viewport constraint (Refinement #2)

Single min-width breakpoint at **1024px**. Below that, the route renders a one-line fallback:

> *"Moat comparison is designed for a presenter display. Widen the window to at least 1024px."*

Implementation: a single CSS media query (or Tailwind `lg:` breakpoint pattern with a fallback `<div>` shown only at smaller widths). No responsive reflow — explicitly out of scope. The fallback `<div>` is itself testable (rendered when viewport is narrow).

---

## Router.tsx integration

Single new route entry inserted into the existing `routes` array as a sibling of `/parcel/:apn`. No structural rework, no shell changes. The route reuses `AppShell` so the header (Search link, etc.) remains available.

```typescript
{
  id: "moat-compare",
  path: "moat-compare",
  element: <MoatCompareRoute />,
},
```

Position: after `instrument-resolver`, before `not-found` (so the catch-all stays last).

---

## Test strategy

Tests live in `src/components/MoatCompareRoute.test.tsx`. Use the existing test patterns from `src/components/EncumbranceLifecycle.test.tsx` (memory router + RTL render).

1. **Route renders at `/moat-compare`** — render with `MemoryRouter initialEntries={["/moat-compare"]}`, assert the comparison header text is present.
2. **Comparison table contains the five expected row labels** — assert by `findByText` for each row label string.
3. **Prototype-side cells render `ProvenanceTag` chips with the correct provenance kinds** — assert the chips for `public_api`, `manual_entry`, etc., are present in the prototype column.
4. **The three callouts render with correct text** — assert the bolded headings of B, C, D appear.
5. **Callout-to-row binding (Refinement #3)** — for each callout, assert that the row it claims to anchor (`data-callout-anchor="row-3"`, `row-4`, `row-5`) exists in the DOM, and that the callout's anchor attribute matches the corresponding row's `data-row-id` attribute. Use `getByTestId` or `querySelector` on the `data-` attributes; this guards against a future polish pass moving a callout away from its row without the test failing.
6. **Aggregator-side cells use `AggregatorTag`, not `ProvenanceTag`** — assert visual asymmetry is preserved. The DataTree column must contain zero `ProvenanceTag` nodes.
7. **Viewport fallback (Refinement #2)** — render the component, simulate a narrow viewport (or assert presence of the fallback `<div>` via class-based assertion since jsdom doesn't run media queries — see implementation note below), assert the fallback text is present in the DOM. The actual hide/show is CSS-driven; the test confirms the fallback element exists in the rendered tree.
8. **Closing Tier 1-C callout** — assert the footer text is present and contains a link to `/parcel/304-78-386`.

**Implementation note for test 7:** jsdom does not evaluate CSS media queries, so we render the fallback `<div>` unconditionally and let CSS hide it on `lg:` widths and hide the comparison on smaller widths. The test asserts both elements are in the DOM; CSS handles the runtime visibility. This is the same pattern the existing app uses for responsive show/hide.

---

## Out of scope

- No live DataTree integration, no scraping, no API calls to any third party.
- No mobile reflow. The fallback div is the entire mobile story.
- No additional parcels — the route renders only POPHAM 304-78-386.
- No edits to existing components beyond `router.tsx`, `MoatBanner.tsx` (used as-is, no edits), `ProvenanceTag.tsx` (used as-is, no edits).
- No animations, transitions, or interactivity beyond the existing route navigation.

---

## File structure

- New: `src/components/MoatCompareRoute.tsx` — the route component, including the inline `AggregatorTag` and inline `ComparisonRow` / `Callout` helpers (kept inline because they are not reused elsewhere)
- New: `src/components/MoatCompareRoute.test.tsx` — vitest + RTL test file
- Modified: `src/router.tsx` — single new route entry
- No new data files, no new types, no new logic modules

The whole feature is one component file + one test file + one route line. Bounded.

---

## Six review checkpoints (drives the implementation plan)

1. **Scaffold:** `MoatCompareRoute` component renders an empty two-column container with the five row labels in the gutter. No content yet. Tests 1, 2 pass.
2. **Rows populated:** all five rows have DataTree and prototype-side content with their `ProvenanceTag` / `AggregatorTag` chips. Tests 3, 6 pass.
3. **Callouts anchored:** the three callouts render with their `data-callout-anchor` attributes wired to row `data-row-id`s. Tests 4, 5 pass.
4. **Viewport fallback:** narrow-viewport fallback div renders, hidden via CSS at `lg:` widths. Test 7 passes.
5. **Router wired:** route entry added to `src/router.tsx`. Manual smoke: navigate to `/moat-compare` in dev server. Closing Tier 1-C callout present (test 8).
6. **Pre-code-review gate:** `npm test` green, `npm run build` clean, dev-server visual sanity for the comparison and the fallback. Then invoke `superpowers:requesting-code-review`.

---

## Commit message (final merge)

```
merge tier 1-D: /moat-compare route + demo-script rewrite (Beat 0 opener, Beat 4 provenance-drift callout, Beat 9 callback); static POPHAM comparison with split-screen and three structural-delta callouts
```
