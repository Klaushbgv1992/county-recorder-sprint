# Visual Voice Tightening — Design

**Date:** 2026-04-18
**Status:** Approved, ready for implementation plan
**Scope:** Styling-only refactor across landing + parcel detail pages

## Problem

The app mixes two visual voices. Palette and typography (Inter, recorder-slate, neutral chips) read "credible government portal." But animation tokens, decorative gradients, and chip stacking lean "product-marketing demo": infinite pulse/bob/ring-pulse loops on static indicators, staggered fade-ins on every search keystroke, bouncy click celebrations on search rows, hover-lift on drawer buttons, a blurred moat-colored glow behind the search hero, and redundant tier-chips on search results whose tier is already communicated by a left-border accent.

A residential title examiner — the target user — wants the first voice. The second voice undermines the prototype's credibility thesis ("county as authoritative custodian, not a plant mirror").

## Principles

1. **Motion earns its place.** Keep motion that serves orientation (entrance, loading) or confirms a user action. Remove motion that runs without a user trigger or celebrates routine clicks.
2. **One signal per thing.** If two visual treatments communicate the same fact, drop one.
3. **Decoration declares itself.** Drop purely ornamental surfaces. Let content carry the page.
4. **Brand hook preserved.** The emerald `moat` accent stays — just sparingly and always static, so it reads as meaning ("this is the county advantage") rather than mascot.

## Non-goals

- No typography changes.
- No palette changes.
- No layout or information-architecture changes.
- No component behavior changes (same props, same interactions, same navigation).
- No audit of staff routes (`/staff/*`). Principles apply opportunistically if a clear violation is encountered in a touched file.

## Changes

### 1. `src/index.css` — keyframe tokens

**Delete** (and their `@keyframes` blocks):
- `--animate-pulse-glow`
- `--animate-bob`
- `--animate-ring-pulse`
- `--animate-bounce-soft`
- `--animate-confetti-up` (dead code — never referenced)
- `--animate-shake` (dead after MERS refactor below)

**Keep:**
- `fade-in`, `fade-in-up`, `fade-in-right`, `fade-in-down` — drawer/panel entrances
- `pulse-once` — one-shot user-action receipt (swimlane accept halo)
- `checkmark-draw` — step completion in TransactionWizard
- `shimmer-slide` — map loading skeleton
- `track-grow` — swimlane connector reveal (one-shot, orients)

Net: 13 tokens → 7. The `prefers-reduced-motion` block stays; it becomes largely a no-op, which is the goal.

### 2. Animation-site replacements

| Site | Old | New |
|---|---|---|
| `PipelineBanner.tsx:41` | `animate-pulse-glow` dot | Static `bg-moat-500 ring-2 ring-moat-100` dot |
| `MoatBanner.tsx:42,47` active row | `animate-pulse-glow ring-1 ring-moat-300` | Static `ring-1 ring-moat-300 bg-moat-50` |
| `LandingPage.tsx:239` loading dot | `animate-pulse-glow` | Plain emerald dot (skeleton already has shimmer) |
| `TransactionWizard.tsx:92` active step | `animate-pulse-glow` | Heavier static ring: `ring-2 ring-blue-400` |
| `CountyMap.tsx:546` intro bubble | `animate-bob` | Remove; bubble stays static |
| `CountyMap.tsx:588` marker ring | `animate-ring-pulse` | Static `ring-2 ring-moat-300 ring-offset-1` |
| `CountyMap.tsx:553` intro card | `hover:scale-105` | Remove (card already has `hover:ring-moat-500/30`) |
| `ExportCommitmentButton.tsx:155` | `animate-pulse` (Tailwind default) | Static `ring-2 ring-moat-500 ring-offset-2` |
| `SearchHero.tsx:233,293` rows | staggered `animate-fade-in-up` (20ms delay per row) + `animate-bounce-soft` on click | Remove both; rows appear instantly, no click celebration |
| `ParcelDrawer.tsx:107,113,220,226,294,300,…` buttons | `hover:-translate-y-0.5 active:translate-y-0` | Remove; keep background-color hover transition |
| `Swimlane.tsx:398` MERS callout | `hover:animate-shake` | Dashed amber outline on the callout (static, reads "attention") |
| `Swimlane.tsx:420` accept ring | `animate-pulse-once` | **Keep** — legitimate user-action receipt |

### 3. Decorative-surface cleanup

| File | Change |
|---|---|
| `SearchHero.tsx:147` | Drop `bg-gradient-to-br from-white via-white to-slate-50`; use flat `bg-white` on the section |
| `SearchHero.tsx:151–154` | **Delete** the `blur-3xl bg-moat-200/30` decorative glow div entirely |
| `HomeownerHero.tsx:29` | Drop `bg-gradient-to-b from-white to-slate-50`; flat `bg-white` |
| `LandingPage.tsx:237` | Drop `bg-gradient-to-b from-transparent via-white/40 to-transparent` overlay on the loading state |
| `LivePushDemo.tsx:185` | Drop `bg-gradient-to-r from-indigo-50 to-white`; flat `bg-indigo-50` |
| `AiSummaryStatic.tsx:124` | **Keep** — functional fade-out for clamped text |

### 4. Chip consolidation in `SearchHero.tsx`

**Current state per result row:** entity chip + tier chip + colored dot inside the tier chip + curated left-accent bar — four signals, two of which communicate the same fact.

**New rule:**
- Tier is communicated only by the emerald left-accent bar on curated rows. Non-curated rows show no tier indicator — their neutrality *is* the signal.
- Entity chip (`Instrument`, `APN`, `Address`, `Owner`, `Subdivision`) stays — it disambiguates *what matched* within the row, which is functional, not decorative.

**Edits:**
- Remove the `TIER_CHIP` constant (lines 20–24).
- Remove the tier-chip `<span>` (lines 261–267) including its internal dot.
- Keep the curated left-border accent (241–246) as the sole curated indicator.
- Keep the entity chip (258–260).

**Party rows:**
- Per-role chips (`2× grantor`, `1× lender`, …) are informational — keep unchanged.
- Remove the trailing `Party` pill (316–318) — redundant with the section header "Parties · N matches."

## Files touched

1. `src/index.css`
2. `src/components/PipelineBanner.tsx`
3. `src/components/MoatBanner.tsx`
4. `src/components/LandingPage.tsx`
5. `src/components/TransactionWizard.tsx`
6. `src/components/CountyMap.tsx`
7. `src/components/ExportCommitmentButton.tsx`
8. `src/components/SearchHero.tsx`
9. `src/components/ParcelDrawer.tsx`
10. `src/components/swimlane/Swimlane.tsx`
11. `src/components/HomeownerHero.tsx`
12. `src/components/LivePushDemo.tsx`

Approximately 12 files, all styling-layer edits. No logic changes, no prop changes, no new components.

## Verification

- `npm test` — existing vitest + DOM tests should pass unchanged. The search-hero DOM test (`tests/search-hero.dom.test.tsx`) may reference the tier chip or animation classes; update assertions if so. No test should need a *behavioral* rewrite.
- Visual spot-check after implementation, in this order:
  1. `/` — hero, search dropdown with query `popham`, map intro bubble + marker, pipeline banner dot
  2. `/parcel/304-78-386` — Chain of Title swimlane, anomaly panel
  3. `/parcel/304-78-386/encumbrances` — MoatBanner, SwimlaneDiagram, MERS callout (hover it)
  4. `/parcel/304-78-386/instrument/20210075858` — ProofDrawer, ExportCommitmentButton
  5. `/party/popham-christopher` — party page
  6. `/county-activity` — LivePushDemo band
- Accessibility: verify `prefers-reduced-motion: reduce` still neutralizes the surviving animations (it does — the CSS block is generic).

## Risk register

- **Test breakage from removed classes.** Mitigation: update DOM-test selectors that assert animation classes; no behavioral tests should be affected.
- **Loss of "aliveness."** The landing page loses several motion cues at once. Mitigation: the map skeleton shimmer, swimlane connector grow, and drawer entrance fade all survive — enough motion to feel responsive, not inert. If a reviewer reports the landing feels flat post-change, reinstating one token (most likely `pulse-glow` on the PipelineBanner live-dot to signal "this is the live data source") is cheap and scoped.
- **MERS shake loss reduces "investigate me" nudge.** Mitigation: static dashed amber outline replaces the motion nudge with a color/pattern cue that works without hover — actually a net improvement for discoverability.

## Out of scope (documented for future passes)

- Landing-page hierarchy (my Option A in the original review)
- Parcel-detail way-finding / breadcrumbs (Option B)
- Search-result polish beyond chip consolidation (Option D)

These remain available as follow-up designs.
