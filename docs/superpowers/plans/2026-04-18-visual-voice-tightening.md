# Visual Voice Tightening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove infinite-loop animations, click-celebration flourishes, decorative gradients, and redundant tier chips so the portal reads as a credible title-examiner tool instead of a sales demo.

**Architecture:** Styling-only refactor across 12 component files + 1 CSS file. Edit order: consumers first (so no mid-refactor renders an animation class against a deleted keyframe), CSS last. Each task runs the existing vitest suite to catch regressions; one DOM test needs an assertion update because it currently asserts a chip we're removing.

**Tech Stack:** React 19, Tailwind v4 (`@theme` tokens in `src/index.css`), vitest + @testing-library/react, jsdom.

**Spec:** `docs/superpowers/specs/2026-04-18-visual-voice-tightening-design.md`

---

## Working rules

- **TDD doesn't meaningfully apply to CSS-class deletions.** Where a task removes a class that a test asserts against, update the test in the same commit. Where a task only touches presentational classes with no test coverage, skip the test step — don't fabricate tests for styling.
- **Run `npm test` before every commit.** Non-negotiable. This is the regression guard.
- **Do not change logic, props, navigation, or component boundaries** in any task. If a task seems to require that, stop and flag it.
- **Commit per task** with the listed message. No squashing mid-plan.
- **Do not start the dev server inside these tasks.** Visual spot-check is a single final task (Task 10) by the human reviewer.

---

### Task 1: SearchHero — drop tier chip, row stagger, bounce feedback, blur glow, gradient section bg

**Files:**
- Modify: `src/components/SearchHero.tsx`
- Modify: `tests/search-hero.dom.test.tsx`

- [ ] **Step 1: Update the DOM test assertion that will break**

In `tests/search-hero.dom.test.tsx`, replace the test block at lines 74–92 (`"shows entity-type pill and tier pill on each result"`) with:

```tsx
  it("shows entity-type pill on each result (tier communicated by accent bar, not chip)", () => {
    const { container } = render(
      <MemoryRouter>
        <SearchHero
          value="POPHAM"
          onChange={() => {}}
          searchables={[curated]}
          instruments={noInstruments}
          instrumentToApn={noInstrumentToApn}
          onSelectCurated={() => {}}
          onSelectDrawer={() => {}}
          onSelectInstrument={() => {}}
          onSelectParty={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Owner$/i)).toBeInTheDocument();
    // Tier is no longer rendered as text — no "Curated" pill in the result row.
    expect(screen.queryByText(/^Curated$/)).not.toBeInTheDocument();
    // Curated tier is instead indicated by an emerald left-accent bar on the row.
    expect(container.querySelector(".bg-moat-500")).toBeTruthy();
  });
```

- [ ] **Step 2: Run the updated test — expect it to FAIL against current code**

Run: `npx vitest run tests/search-hero.dom.test.tsx -t "tier communicated by accent bar"`
Expected: FAIL — the old code still renders the `Curated` pill, so `queryByText(/^Curated$/)` finds it.

- [ ] **Step 3: Remove `TIER_CHIP` constant and the tier-chip render site in `SearchHero.tsx`**

In `src/components/SearchHero.tsx`:

(a) Delete lines 20–24 (the `TIER_CHIP` record):

```tsx
const TIER_CHIP: Record<Searchable["tier"], { label: string; className: string }> = {
  curated: { label: "Curated", className: "bg-emerald-100 text-emerald-900" },
  recorder_cached: { label: "Recorder", className: NEUTRAL_CHIP },
  assessor_only: { label: "Assessor", className: NEUTRAL_CHIP },
};
```

(b) Inside the map over `hits` (around line 223), delete the line that reads `const tier = TIER_CHIP[s.tier];`.

(c) Delete the tier `<span>` block (lines 261–267):

```tsx
<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tier.className}`}>
  <span
    aria-hidden="true"
    className={`inline-block w-1.5 h-1.5 rounded-full ${curated ? "bg-moat-500" : "bg-slate-400"}`}
  />
  {tier.label}
</span>
```

The entity-chip `<span>` above it (lines 258–260) stays.

- [ ] **Step 4: Remove row-entry stagger animation and bounce-soft click feedback (parcel rows)**

Around line 233, the `<li>` for parcel rows currently reads:

```tsx
className={`animate-fade-in-up relative flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"} ${isSelected ? "animate-bounce-soft" : ""}`}
style={{ animationDelay: `${i * 20}ms` }}
```

Replace with:

```tsx
className={`relative flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"}`}
```

(`animate-fade-in-up`, `animate-bounce-soft` and the `style` prop all go. The `isSelected` state remains declared but is no longer used for animation — leave the state field in place; it may be referenced by the party-row block in Step 5.)

- [ ] **Step 5: Remove row-entry stagger + bounce-soft and redundant "Party" pill on party rows**

Around line 293, the party-row `<li>` currently reads:

```tsx
className={`animate-fade-in-up flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 hover:bg-slate-50 ${partySelected ? "animate-bounce-soft" : ""}`}
style={{ animationDelay: `${i * 20}ms` }}
```

Replace with:

```tsx
className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 hover:bg-slate-50"
```

Then delete the trailing `<div className="shrink-0">…"Party" pill…</div>` block (lines 315–319). The section header already labels this listbox "Parties · N matches."

Because `partySelected` and `isSelected` are no longer read, also delete the `selectedKey` state and its setters if nothing else consumes them. Search the file for `selectedKey`, `setSelectedKey`, `partySelected`, `isSelected`. If the only remaining references are in the two `onClick` handlers (`setSelectedKey(rowKey); onPick(...)` and `setSelectedKey(partyKey); onSelectParty(...)`), remove the `setSelectedKey(…);` call from each and delete the `useState` declaration `const [selectedKey, setSelectedKey] = useState<string | null>(null);`. If any other reference exists, leave the state in place rather than breaking something unintended.

- [ ] **Step 6: Drop decorative blur glow + gradient section background**

Around line 147 the `<section>` opens with:

```tsx
<section
  aria-label="Parcel search"
  className="relative bg-gradient-to-br from-white via-white to-slate-50 border-b border-slate-200 px-6 py-10 overflow-hidden"
>
```

Replace with:

```tsx
<section
  aria-label="Parcel search"
  className="relative bg-white border-b border-slate-200 px-6 py-10"
>
```

(`overflow-hidden` was only there to clip the glow div — removing both in one edit is safe.)

Delete the entire decorative glow block (lines 151–154):

```tsx
<div
  aria-hidden="true"
  className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[320px] rounded-full bg-moat-200/30 blur-3xl -z-0"
/>
```

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS, including the updated `tests/search-hero.dom.test.tsx` block.

- [ ] **Step 8: Commit**

```bash
git add src/components/SearchHero.tsx tests/search-hero.dom.test.tsx
git commit -m "refactor(search): remove tier chip, row stagger, click bounce, decorative glow

Tier is now communicated solely by the curated left-accent bar; no
second pill saying the same thing. Search result rows appear
instantly (no staggered fade-in) and no longer bounce on click.
Hero section drops the blurred moat glow and gradient background —
content carries the page."
```

---

### Task 2: Replace pulse-glow dots with static emerald dots

**Files:**
- Modify: `src/components/PipelineBanner.tsx` (line 41)
- Modify: `src/components/MoatBanner.tsx` (lines 42, 47)
- Modify: `src/components/LandingPage.tsx` (line 239)

- [ ] **Step 1: PipelineBanner — static live-dot**

In `src/components/PipelineBanner.tsx:41`, change:

```tsx
className="inline-block w-2 h-2 rounded-full bg-moat-500 animate-pulse-glow shrink-0"
```

to:

```tsx
className="inline-block w-2 h-2 rounded-full bg-moat-500 ring-2 ring-moat-100 shrink-0"
```

- [ ] **Step 2: MoatBanner — static active-row treatment**

In `src/components/MoatBanner.tsx` around line 42, find the active-row conditional class:

```tsx
} ${isActive ? "animate-pulse-glow ring-1 ring-moat-300" : ""}`}
```

Replace with:

```tsx
} ${isActive ? "ring-1 ring-moat-300 bg-moat-50" : ""}`}
```

In the same file around line 47, change:

```tsx
className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse-glow"
```

to:

```tsx
className="inline-block w-1.5 h-1.5 rounded-full bg-white ring-2 ring-white/50"
```

- [ ] **Step 3: LandingPage loading dot**

In `src/components/LandingPage.tsx:239`, change:

```tsx
<span className="inline-block w-2 h-2 rounded-full bg-moat-500 animate-pulse-glow" />
```

to:

```tsx
<span className="inline-block w-2 h-2 rounded-full bg-moat-500" />
```

(The skeleton grid above already animates with `shimmer-slide`; the dot doesn't need to pulse to signal "loading.")

- [ ] **Step 4: Run the test suite**

Run: `npx vitest run`
Expected: all PASS. No tests assert against `animate-pulse-glow`.

- [ ] **Step 5: Commit**

```bash
git add src/components/PipelineBanner.tsx src/components/MoatBanner.tsx src/components/LandingPage.tsx
git commit -m "refactor(banners): static emerald indicators, drop pulse-glow loop

Live-data signals use a static ring instead of an infinite pulse.
Meaning cue stays; attention-grab removed."
```

---

### Task 3: TransactionWizard — static ring for active step

**Files:**
- Modify: `src/components/TransactionWizard.tsx` (line 92)

- [ ] **Step 1: Replace pulse-glow with heavier static ring**

In `src/components/TransactionWizard.tsx:92`, find:

```tsx
? "border-2 border-blue-600 text-blue-700 bg-white ring-2 ring-blue-100 animate-pulse-glow"
```

Replace with:

```tsx
? "border-2 border-blue-600 text-blue-700 bg-white ring-2 ring-blue-400"
```

(The `ring-blue-100` → `ring-blue-400` swap compensates for the lost motion cue with a stronger static ring.)

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/TransactionWizard.tsx
git commit -m "refactor(wizard): static ring on active step, drop pulse-glow"
```

---

### Task 4: CountyMap — drop bob, ring-pulse, hover:scale

**Files:**
- Modify: `src/components/CountyMap.tsx` (lines 546, 553, 588, and the animation comment block ~468–470)

- [ ] **Step 1: Remove the `animate-bob` wrapper on the intro bubble**

At line 546, the current structure is:

```tsx
<div className="relative animate-bob">
```

Change to:

```tsx
<div className="relative">
```

- [ ] **Step 2: Remove `hover:scale-105` on the intro card**

At line 553, find:

```tsx
className="pointer-events-auto group relative mb-3 w-72 cursor-pointer rounded-lg border border-moat-200 bg-white px-4 py-3 text-left shadow-xl ring-1 ring-moat-500/10 transition-transform duration-200 hover:scale-105 hover:ring-moat-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
```

Change to:

```tsx
className="pointer-events-auto group relative mb-3 w-72 cursor-pointer rounded-lg border border-moat-200 bg-white px-4 py-3 text-left shadow-xl ring-1 ring-moat-500/10 transition-colors duration-200 hover:ring-moat-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
```

(Drop `hover:scale-105`, swap `transition-transform` → `transition-colors` since we now only transition the ring color.)

- [ ] **Step 3: Replace `animate-ring-pulse` with a static emerald ring on the marker dot**

At line 588, find:

```tsx
<div className="relative h-4 w-4 animate-ring-pulse rounded-full border-2 border-white bg-moat-500 shadow-lg" />
```

Change to:

```tsx
<div className="relative h-4 w-4 rounded-full border-2 border-white bg-moat-500 shadow-lg ring-2 ring-moat-300 ring-offset-1" />
```

- [ ] **Step 4: Update the animation-legend comment block**

Around lines 468–470 there is a comment listing the animations. Update it to reflect the new state:

```tsx
//   - animate-fade-in-up  → mount entrance (no snap-in)
//   - animate-bob         → label bubble drifts ±4px over 3s
//   - animate-ring-pulse  → marker dot radiates an interactive "click me" ring
```

becomes:

```tsx
//   - animate-fade-in-up  → mount entrance (no snap-in)
//   (bob + ring-pulse removed — intro bubble stays static; the marker
//    uses a static ring-moat-300 ring-offset-1 cue instead of an
//    infinite ring emission. Entrance fade-in remains.)
```

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CountyMap.tsx
git commit -m "refactor(map): drop bob/ring-pulse/hover-scale on intro + marker

Intro bubble stops drifting; marker dot uses a static emerald ring
instead of an infinite pulse. Hover on the intro card no longer
scales — the ring-color hover is enough."
```

---

### Task 5: ExportCommitmentButton — static ring instead of pulse

**Files:**
- Modify: `src/components/ExportCommitmentButton.tsx` (line 155)

- [ ] **Step 1: Replace `animate-pulse` with static ring**

At line 155, find:

```tsx
? " ring-2 ring-moat-500 ring-offset-2 animate-pulse"
```

Change to:

```tsx
? " ring-2 ring-moat-500 ring-offset-2"
```

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: all PASS. The `tests/` tree does have an `export-commitment-button.test.tsx` — it should not assert the animation class, but confirm the run is clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExportCommitmentButton.tsx
git commit -m "refactor(export): static ring on active state, drop pulse"
```

---

### Task 6: ParcelDrawer — drop hover-translate on buttons

**Files:**
- Modify: `src/components/ParcelDrawer.tsx`

- [ ] **Step 1: Remove `hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-150` from 4 buttons**

At lines 107, 113, 220, 226, 294, 300 (six occurrences — per spec, four distinct buttons plus their secondary/outlined counterparts), each button has a className that contains:

```
hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-150
```

For every occurrence, delete that substring. Also swap `transition-transform duration-150` → `transition-colors duration-150` on the same lines, since the buttons still want a color transition on hover. The cleanest way: use a multi-line search-and-replace in the editor, but the exact target strings are:

(a) On each primary-filled button (e.g. line 107):

```
hover:bg-moat-700 hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-150
```

→

```
hover:bg-moat-700 transition-colors duration-150
```

(b) On each outlined/secondary button (e.g. line 113):

```
hover:bg-moat-50 hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-150
```

→

```
hover:bg-moat-50 transition-colors duration-150
```

(c) On each slate-outlined button (e.g. line 226):

```
hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-150
```

→

```
hover:bg-slate-50 transition-colors duration-150
```

Apply to all six occurrences. After editing, grep to confirm zero remaining:

Run: `rg "translate-y-0" src/components/ParcelDrawer.tsx`
Expected: no matches.

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ParcelDrawer.tsx
git commit -m "refactor(drawer): drop hover-lift on buttons, use color transition only"
```

---

### Task 7: Swimlane MERS callout — static dashed amber outline

**Files:**
- Modify: `src/components/swimlane/Swimlane.tsx` (around lines 394–401)

- [ ] **Step 1: Replace hover shake with a static dashed amber outline**

At line 394–401, the current structure is:

```tsx
          // The MERS callout is the swimlane's "missing link" indicator.
          // A hover-triggered shake nudges the examiner to investigate it
          // without hijacking attention while they scan elsewhere.
          return (
            <div className="hover:animate-shake">
              <MersCallout gap={mersGap} xPx={(dotX + releaseX) / 2} yCenter={Y_CENTER} />
            </div>
          );
```

Change to:

```tsx
          // The MERS callout is the swimlane's "missing link" indicator.
          // A static dashed amber outline reads as "attention" without
          // motion — visible even before the examiner hovers, which is
          // strictly better for discoverability than a hover-triggered
          // animation.
          return (
            <div className="rounded border-2 border-dashed border-amber-400">
              <MersCallout gap={mersGap} xPx={(dotX + releaseX) / 2} yCenter={Y_CENTER} />
            </div>
          );
```

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: all PASS. No test asserts against `hover:animate-shake`.

- [ ] **Step 3: Commit**

```bash
git add src/components/swimlane/Swimlane.tsx
git commit -m "refactor(swimlane): static dashed amber outline on MERS callout

Replaces hover:animate-shake with a permanent visual cue — better
discoverability and no motion. Pulse-once accept halo is kept
(legitimate user-action receipt)."
```

---

### Task 8: Neutralize decorative gradients (HomeownerHero, LivePushDemo, LandingPage)

**Files:**
- Modify: `src/components/HomeownerHero.tsx` (line 29)
- Modify: `src/components/LivePushDemo.tsx` (line 185)
- Modify: `src/components/LandingPage.tsx` (line 237)

- [ ] **Step 1: HomeownerHero — flat background**

At line 29, change:

```tsx
<section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 px-6 py-12">
```

to:

```tsx
<section className="relative bg-white border-b border-slate-200 px-6 py-12">
```

(Drop `overflow-hidden` — no clipping target remains — and swap the gradient for a flat white.)

- [ ] **Step 2: LivePushDemo — flat background**

At line 185, change:

```tsx
className="border-t border-indigo-200 bg-gradient-to-r from-indigo-50 to-white px-5 py-3 text-xs text-indigo-900 flex items-center gap-3"
```

to:

```tsx
className="border-t border-indigo-200 bg-indigo-50 px-5 py-3 text-xs text-indigo-900 flex items-center gap-3"
```

- [ ] **Step 3: LandingPage loading overlay — drop translucent white gradient**

At line 237, change:

```tsx
<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-transparent via-white/40 to-transparent">
```

to:

```tsx
<div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
```

(The skeleton shimmer below already establishes the loading mood; the second gradient overlay is decoration.)

Leave the skeleton-tile gradient at line 232 (`bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200`) — that one is functional; it's what `animate-shimmer-slide` rides on.

- [ ] **Step 4: Run the test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomeownerHero.tsx src/components/LivePushDemo.tsx src/components/LandingPage.tsx
git commit -m "refactor(surfaces): flatten decorative gradients on hero + banners

Skeleton shimmer gradient kept (functional). Decorative section
gradients removed."
```

---

### Task 9: Remove dead keyframe tokens from index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Confirm consumers are already removed**

Run these four searches. Each must return zero matches before proceeding:

```
rg "animate-pulse-glow" src
rg "animate-bob" src
rg "animate-ring-pulse" src
rg "animate-bounce-soft" src
rg "animate-confetti" src
rg "animate-shake" src
```

If any returns a match, stop — do not delete the corresponding keyframe. Go back and complete the earlier task that was supposed to remove that consumer.

- [ ] **Step 2: Delete the six `--animate-*` token declarations inside `@theme`**

In `src/index.css`, inside the `@theme { … }` block (starts line 6), delete these six lines:

```css
  --animate-pulse-glow: pulse-glow 1.6s ease-in-out infinite;
  --animate-ring-pulse: ring-pulse 2s ease-out infinite;
  --animate-bob: bob 3s ease-in-out infinite;
  --animate-shake: shake 220ms ease-in-out 1;
  --animate-bounce-soft: bounce-soft 320ms cubic-bezier(0.34, 1.56, 0.64, 1) 1;
  --animate-confetti-up: confetti-up 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
```

Leave the other `--animate-*` tokens (`fade-in`, `fade-in-up`, `fade-in-right`, `fade-in-down`, `pulse-once`, `checkmark-draw`, `shimmer-slide`, `track-grow`) untouched.

- [ ] **Step 3: Delete the corresponding `@keyframes` blocks**

Delete these six blocks entirely:

- `@keyframes pulse-glow { … }` (around lines 89–92)
- `@keyframes ring-pulse { … }` (around lines 100–104)
- `@keyframes bob { … }` (around lines 106–109)
- `@keyframes shake { … }` (around lines 111–115)
- `@keyframes bounce-soft { … }` (around lines 127–131)
- `@keyframes confetti-up { … }` (around lines 138–142)

Leave `@keyframes fade-in`, `fade-in-up`, `fade-in-right`, `fade-in-down`, `pulse-once`, `checkmark-draw`, `shimmer-slide`, `track-grow` untouched. Leave the `@media (prefers-reduced-motion: reduce)` block untouched.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: build succeeds. Any dangling reference to a deleted animation token surfaces as a Tailwind v4 resolution failure (tokens resolve to CSS custom properties; the class silently becomes inert, not an error). So a clean build is necessary but not sufficient — the greps in Step 1 are the authoritative check.

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "chore(css): drop 6 dead keyframe tokens (pulse-glow, bob, ring-pulse, shake, bounce-soft, confetti-up)

All consumers removed in earlier commits of this refactor. Token
count drops from 13 to 7."
```

---

### Task 10: Visual spot-check

**Files:** none modified.

This is the human reviewer's visual verification pass. Do not run automatically.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Walk the checklist**

In a fresh browser (no browser is currently attached to the MCP profile, so a regular browser session is fine), visit each URL and confirm the expected post-refactor behavior:

1. `http://localhost:5173/` — Hero is on flat white with no blurred glow; PipelineBanner live dot is static (ring, no pulse); search for `popham`, confirm result rows appear instantly with no stagger, and only the emerald left-accent bar marks the curated row (no `Curated` pill).
2. `http://localhost:5173/` — Map intro bubble is static (no up/down drift); marker dot has a static emerald ring (no outward pulse); hovering the intro card changes ring color but does not scale.
3. `http://localhost:5173/parcel/304-78-386` — Chain of Title renders; the accept-halo pulse-once is untouched if you accept a candidate release.
4. `http://localhost:5173/parcel/304-78-386/encumbrances` — MoatBanner active pipeline row shows a static emerald ring + background tint (no pulse). Swimlane MERS callout has a permanent dashed amber outline.
5. `http://localhost:5173/parcel/304-78-386/instrument/20210075858` — Proof Drawer buttons change color on hover but do not lift; Export Commitment button active state shows a static emerald ring.
6. `http://localhost:5173/county-activity` — LivePushDemo band has a flat indigo-50 background (no gradient sweep).
7. Switch to homeowner mode via the portal toggle — HomeownerHero is flat white (no gradient).

- [ ] **Step 3: If any item fails, file an issue or open a follow-up task; do not amend earlier commits.**

---

## Done criteria

- All 10 tasks complete, each with its own commit.
- `npx vitest run` passes.
- `npm run build` passes.
- The six named greps in Task 9 Step 1 each return zero matches.
- Task 10 spot-check passes for the reviewer.
