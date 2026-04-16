# Encumbrance Lifecycle Swimlane Diagram — Design

**Date:** 2026-04-15
**Status:** Draft (pending user approval)
**Scope:** Convert `src/components/EncumbranceLifecycle.tsx` from a vertical card list into a horizontal swimlane diagram. Page route: `/parcel/:apn/encumbrances`.

## Problem

The Encumbrance Lifecycle page is Beat 3 of the demo — proof of Claim #2 ("AI turns passive recorded documents into structured linked title work"). Today it reads as a checklist with status badges. The narrative arc (opening instrument → optional assignment(s) → release/reconveyance) is not visible; the MERS-as-nominee gap on lc-001 is buried in an amber annotation at the bottom of a card rather than rendered as the structural judgment it is.

## Goal

One swimlane per lifecycle, six total. The parcel's encumbrance history is visually graspable in ~5 seconds by someone who has never seen the page. lc-001's MERS gap renders as a literal break in the chain between the 2013 DOT and the 2021 release. Every existing beat of the demo (Beat 3 narration, Beat 6 HOGUE honest-zero on lc-003, Decision #41 no-unlink, Decision #42 Export Commitment) continues to work.

## Hard constraints

Carried from the brief and from the existing CLAUDE.md decision log:

- Anomaly banner (`AnomalyPanel`) at top of page stays exactly as it is.
- Export Commitment button stays visible and functional (Decision #42).
- Plain-English terminology toggle swaps every label in the diagram (existing `useTerminology` + `Term` component).
- No unlink affordance on curated links (Decision #41).
- lc-003 renders with cross-parcel-scan "scanned > 0, found 0" empty state intact (Decision #37).
- No new lifecycles, no schema changes, no curation-rule changes. Work with the 6 existing `lc-*` objects.
- No other pages restyled.

## Data facts verified against the corpus

Root recording dates (from `src/data/instruments/*.json`):

| Lifecycle | Root | Date       | Doc type   | Status   | Children                   |
|-----------|------|------------|------------|----------|----------------------------|
| lc-004    | 20010093192 | 2001-02-07 | PLAT MAP   | released | [20010849180] (Affidavit)  |
| lc-006    | 20070834755 | 2007-07-24 | DOT        | open     | []                         |
| lc-005    | 20130087109 | 2013-01-28 | DOT        | open     | []                         |
| lc-001    | 20130183450 | 2013-02-27 | DOT        | released | [20210075858] (Reconveyance) |
| lc-003    | 20150516730 | 2015-07-17 | DOT        | open     | []                         |
| lc-002    | 20210057847 | 2021-01-19 | DOT        | open     | []                         |

lc-005 and lc-001 are 30 days apart. Adjacent in chronological order; visual differentiation required.

MERS gap on lc-001 is already computed by `src/logic/rules/r4-assignment-chain-break.ts` (R4 detects originator VIP Mortgage ≠ releaser Wells Fargo, no `assignment_of_dot` in instruments). The swimlane callout sources from R4 findings; no duplicate copy.

Cross-parcel scan exists for lifecycles fed through `huntCrossParcelRelease` (returns `scanned_party_count`, `candidates`). This is the data signal for Q3 refinement #1.

## Architecture

### Locked design decisions (from brainstorm Q1–Q6)

**Q1. Time axis.** Shared global x-axis across all swimlanes, spanning 2001-01-01 → 2026-04-15. One axis rendered at the top of the page, tick marks every 5 years (2005, 2010, 2015, 2020, 2025), light vertical grid lines extending down through every swimlane at the major ticks. Same-day groups render as a single composite node with a ×N stack badge (Decision #27 says they are linked transactions; visualizing as one event is more accurate than offset clusters). Composite nodes expand on click.

**Q2. MERS gap visualization.** Broken line with inline callout box on lc-001's track between the DOT and release nodes. Callout contains three chips: `VIP Mortgage` (solid, recorded), `via MERS · not in public record` (dashed border, muted, chain-break icon, semantically distinct), `Wells Fargo` (solid, recorded). Line style narrates the gap: solid-from-DOT → solid-into-callout → dashed-through-callout → solid-out-of-callout → solid-to-release. Width ~180–220px. Always visible at rest (no hover-only reveal). Content sourced from R4 finding, not hardcoded.

**Q3. Candidate matcher placement.** Hybrid B+C: open lifecycle with ≥1 candidate row → expanded fan anchored to the open right-end of the track with dashed connector; open lifecycle with 0 candidates but `scanned_party_count > 0` → expanded empty-state showing Beat 6 honest-zero; open lifecycle with 0 candidates and no scan data → collapsed pill `Matcher · scanned N instruments · 0 above 0.6 threshold · Expand →`. lc-001's accepted curated release is NOT a fan — it is the release node on the track, click/hover reveals `LinkEvidenceBars` in a popover, no unlink (Decision #41).

**Q4. Back-references.** Hybrid C+A: small `↗ cites lc-NNN` chip on the specific citing instrument node (source-side only — direction is conceptually one-way). Per-swimlane expand row below the track labeled `▸ N citations`, visible only when `inbound_count + outbound_count > 0`. Expanded row shows `Cited by` (inbound, e.g., lc-004 shows "20130183449 in lc-001 (×2)") and `Cites` (outbound). Jump-to-lifecycle scrolls + flashes the target swimlane border; flash respects `prefers-reduced-motion: reduce`. Glossary terms added: back-reference → citation, inbound references → cited by, outbound references → cites.

**Q5. Lifecycle order.** Chronological ascending by `root_instrument.recording_date`. Sort lives at the swimlane-render site with an inline comment noting AnomalyPanel carries MERS prominence so chronological order is safe. Page reads top-down as parcel history; top swimlane's nodes cluster left, bottom swimlane's nodes drift right, diagonal flow = history.

**Q6. Examiner action controls.** Two-tier reveal: `⋯` menu always-visible-but-quiet (`text-slate-300` at rest, `text-slate-700 bg-slate-100` on hover/focus) on the right edge of each swimlane title row opens a mini-menu with override buttons (open/released/unresolved) and the status rationale text as a subheading. Per-link Accept/Reject/Unresolved lives in a popover anchored to a small midpoint chevron (~14px, `text-slate-400`) on the link line, with the line wrapped in a 16px-tall transparent hit zone so the click target is not 2px. Status rationale ALSO renders at rest as `text-xs italic text-slate-500` below each track, before the back-references row. Anomaly-banner→swimlane jumps scroll and flash the swimlane border, never auto-open the `⋯` menu.

### Component decomposition

Today `EncumbranceLifecycle.tsx` is 421 lines with inline JSX for the card, MERS annotation, child instruments, link action controls, candidate panel, and override buttons. The swimlane rewrite decomposes into:

```
EncumbranceLifecycle (existing, becomes page shell)
├── AnomalyPanel (existing — unchanged)
├── ExportCommitmentButton (existing — unchanged)
├── MoatBanner (existing — unchanged)
└── SwimlaneDiagram (new)
    ├── TimeAxis (new) — shared 2001→2026 axis + grid lines
    └── Swimlane (new, rendered per lifecycle in chronological order)
        ├── SwimlaneTitle — status badge, root doc label, instrument#, ⋯ menu trigger
        ├── SwimlaneTrack — the horizontal timeline with nodes + connectors
        │   ├── InstrumentNode (new) — handles composite ×N badge, back-ref chip, click-to-open-doc
        │   ├── LinkConnector (new) — solid/dashed line + midpoint chevron with popover
        │   └── MersCallout (new, lc-001 only) — 3-chip inline callout
        ├── StatusRationale — always-visible italic text below track
        ├── CandidateMatcherSlot (new) — resolves expanded-fan vs expanded-empty vs collapsed-pill via data-driven rule; delegates content to existing CandidateReleasesPanel when expanded
        ├── CitationsRow (new) — toggle + expanded list of inbound/outbound back-references
        └── OverrideMenu (new) — ⋯ menu for override buttons
```

Existing components preserved:
- `CandidateReleasesPanel` — still renders candidate rows with feature bars. Wrapped (not replaced) by `CandidateMatcherSlot`, which owns the collapsed/expanded/empty-state decision.
- `LinkEvidenceBars` — rendered inside the link-line popover and inside the lc-001 release-node click-reveal.
- `InstrumentRow` — retained for the `⋯` menu's expanded instrument-details view. Swimlane nodes themselves render a more compact representation (`InstrumentNode`).
- `StatusBadge`, `ProvenanceTag`, `MoatBanner`, `AnomalyPanel`, `ExportCommitmentButton` — unchanged.

Existing logic preserved:
- `computeLifecycleStatus` + `resolveLifecycleStatus` in `src/logic/lifecycle-status.ts` — unchanged. Swimlane reads the same result.
- `buildCandidateRows`, `buildEmptyStateRationale`, `synthesizeAlgorithmicLink`, `buildAcceptedRationale` — unchanged.
- `getGrantors`, `getTrustors`, `getLenders`, `getReleasingParties`, `getPartiesByRole` in `src/logic/party-roles.ts` — unchanged.
- `useExaminerActions` hook + link/override state model — unchanged. Control surfaces are thin renderers.

### New pure logic (extracted, TDD)

Three pieces of logic land in `src/logic/swimlane-layout.ts` because they are pure and benefit from unit testing:

1. **`computeTimeAxisDomain(instruments)`** — returns `[startDate, endDate]` for the shared axis. Pads 6 months on each side of min/max recording date, snaps to year boundaries.
2. **`computeNodeX(date, domain, pxWidth)`** — maps a date to an x-coordinate in a given track width. Pure arithmetic, not React.
3. **`groupSameDayInstruments(children)`** — collapses consecutive instruments sharing a recording date into composite `{ kind: "composite", count, instruments[] }` vs `{ kind: "single", instrument }` nodes. Deterministic ordering.
4. **`detectMersGap(rootInst, releaseInst, findings)`** — returns `{ originator, releaser, rule_finding_id } | null`. Consumes R4 finding rather than re-deriving.
5. **`resolveMatcherSlotState({ rows, scannedPartyCount, hasAcceptedRelease })`** — returns `"expanded-fan" | "expanded-empty-with-scan" | "collapsed-pill"`. Data-driven per Q3 refinement #1. Irrelevant for closed lifecycles.

Each gets a test file colocated (`swimlane-layout.test.ts`).

### Rendering concerns

- **SVG vs CSS.** Swimlane track + connectors + MERS callout lines render as inline SVG (one `<svg>` per swimlane, not one page-wide). Nodes and chips render as absolutely-positioned HTML elements on top of the SVG for easy Tailwind + focus management. This hybrid avoids the "everything is SVG" accessibility tax and the "everything is CSS" curve-drawing pain.
- **Responsive.** Below 1024px viewport width, swimlane tracks become horizontally scrollable within the page (each track is a scroll container; the shared axis scrolls in sync). Mobile is not a demo target — the goal is "does not crash on a phone," not "works well on a phone."
- **Reduced motion.** Flash-on-jump checks `prefers-reduced-motion: reduce` and degrades to a static 1-second border-color persist (no pulse).
- **Keyboard.** Swimlane title is a focusable landmark (`<section aria-labelledby=>`); each node is a focusable button. Tab order: axis → swimlane-1 (title → nodes → ⋯ → citations) → swimlane-2 → …

## Data flow

Unchanged from today:

```
App → loads parcels/instruments/links/lifecycles from src/data/
  → EncumbranceLifecycle page
    → passes lifecycles[] in JSON order to SwimlaneDiagram
      → SwimlaneDiagram sorts chronologically (one-line comment; Q5)
      → for each lifecycle: computes status via existing logic, finds R4 finding by lc id, renders Swimlane
        → Swimlane passes props down; no new global state
```

Only new client state is the existing `candidateActions` + `acceptedCandidate` maps, moved from the old `EncumbranceLifecycle` into `SwimlaneDiagram`. Same `useState` scope, identical semantics.

## Error handling

- Missing root instrument → skip the swimlane (matches existing `if (!rootInst) return null`).
- Missing R4 finding on lc-001 → render the DOT and release with a solid connector and no callout. This is a fail-safe; R4 is deterministic on the current corpus so the callout will always fire, but we do not hard-crash if it does not.
- Zero lifecycles → existing empty state logic (inherited).

## Testing

Unit tests for `swimlane-layout.ts` (TDD).

Visual verification: dev server + manual pass across all 6 lifecycles. Specific must-sees:
- lc-001: MERS callout visible at rest, three chips visually distinct, line style narrates gap.
- lc-002: candidate fan anchored to right-end (same-day group shows ×2 badge for 20210057846+20210057847).
- lc-003: expanded empty-state visible with cross-parcel `scanned N · 0 found` copy.
- lc-004: `(×2)` multiplicity in citations row, modification link solid, back-ref chip present on lc-001's 2013 deed.
- lc-005 vs lc-001: adjacent swimlanes with different status badges + different root doc labels; visually distinct.
- lc-006: collapsed pill for matcher (no scan data).
- Plain-English toggle: "citations" ↔ "back-references", "DOT" ↔ "Deed of Trust", "Release" ↔ "Reconveyance" all swap.
- Anomaly banner jump: click banner item for lc-001 → page scrolls, swimlane border flashes (or statically persists with reduced motion), `⋯` menu does NOT open.

Existing Vitest suite (288 passing) must still pass unchanged.

## Out of scope (explicitly)

- Landing-page map, Beat 1/2 visuals, parcel polygons.
- New anomaly rules, new lifecycle schema fields.
- Mobile-optimized swimlane layout (phone is "does not crash," not "looks great").
- Cross-swimlane SVG connectors for back-references (considered, rejected per Q4 — the shared time axis already provides the lattice visual).
- Server-side route resolution for `/instrument/:n` (Decision #36).
- Any change to `AnomalyPanel`, `ExportCommitmentButton`, `MoatBanner`.

## Risks

1. **Visual similarity of adjacent swimlanes (lc-005 vs lc-001).** Both are 2013 DOTs, 30 days apart, with institutional lenders. Mitigation: status badge + root doc parties line must be prominent enough to differentiate at a glance. Verify in dev server before committing.
2. **Popover focus management.** Link-line midpoint popovers and `⋯` menus both need trap/restore. Use a single popover primitive (already present? if not, headlessui). Non-negotiable for accessibility.
3. **R4 finding shape coupling.** `MersCallout` reads from R4 rule output. If R4's `placeholders` keys change, callout breaks. Mitigation: test `detectMersGap` against a stable fixture.
4. **Time-axis crush on narrow viewports.** Below 1024px the shared axis compresses. Fallback: horizontal scroll on each track. Not a demo risk (demo is desktop).
5. **lc-001 is the only lifecycle that exercises several new paths** (MERS callout, curated-link popover, R4 coupling). Tests must not only pass for lc-001 — the "closed lifecycle with no MERS gap" branch needs fixture coverage too (lc-004 is that branch — plat with modification_of link, no MERS concept).

## Commit plan

Separate commits so review is scoped:

1. Extract pure logic + tests (`swimlane-layout.ts`, `swimlane-layout.test.ts`).
2. Add new components (`SwimlaneDiagram`, `TimeAxis`, `Swimlane`, `InstrumentNode`, `LinkConnector`, `MersCallout`, `CandidateMatcherSlot`, `CitationsRow`, `OverrideMenu`) — wired but not yet rendered by the page.
3. Terminology glossary additions (`citation`, `cites`, `cited by`).
4. Replace `EncumbranceLifecycle.tsx` body with `SwimlaneDiagram`; preserve page header, AnomalyPanel, ExportCommitment, MoatBanner.
5. Delete dead code from the old vertical-list rendering if any.

## Open questions

None. Brainstorm closed Q1–Q6 with explicit refinements.
