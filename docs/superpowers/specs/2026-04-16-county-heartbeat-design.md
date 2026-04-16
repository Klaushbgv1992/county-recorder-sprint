# County Heartbeat — design spec

**Date:** 2026-04-16
**Author:** Claude (feature/landing-heartbeat worktree, off `b7f3311`)
**Status:** Approved for implementation

## Mission

Add a "County Heartbeat" band to the landing page that is the single strongest custodian claim the portal makes: a live-feeling, honestly-labeled signal that the recorder is operating right now. A title plant cannot credibly ship this because they don't operate the record — they buy it on a 14–28 day lag.

The heartbeat is the first-thirty-seconds beat of the guided walkthrough. Counter ticks ⇒ the recorder is live. Sparkline shape ⇒ the day has a rhythm. Ribbon ⇒ title plants lag. Provenance caption ⇒ what's real and what's modeled, cited.

## Guiding constraints

- **Parallel execution discipline.** A second agent is redesigning `LandingPage.tsx` for a full-county map. This worktree diverges from `b7f3311` (the fix commit on main) and does **not** rebase/merge main. `<CountyHeartbeat/>` mounts as the **first child** of `<main>` in `LandingPage.tsx`, inside a clearly-delimited block; the existing map/featured-parcels/footer sections are untouched.
- **Existing `<PipelineBanner>` is untouched** — the parallel note supersedes the brief's "remove or simplify" option. A merging human decides later which banner treatment survives.
- **No new dependencies.** No `framer-motion`, no charting library, no date-fns. Hand-rolled SVG polyline pattern already established in `PipelineDashboard.tsx`.
- **Determinism invariant:** the displayed counter at time `T` is a pure function of `T` and a citation-anchored constant. No `Math.random`, no RAF tweens, no catch-up animation. Rapid F5 at the same second returns the same number.
- **Zero new synthesis surfaces.** The counter's total-volume anchor is cited from the Maricopa Recorder's public "About" page. The only synthesized layer is intra-day pacing — a piecewise-linear hour-of-day fraction function, inline-documented as "demo-only pacing model."
- Tailwind v4 only; `recorder-*` and `moat-*` tokens; no new CSS.
- Accessibility: no aria-live on the counter (would spam screen readers at 1Hz). No CSS motion beyond `transition-colors` on links (the project's universal convention).

## Files

### New

```
src/logic/heartbeat-model.ts           — pure functions + constants
src/components/CountyHeartbeat.tsx     — the visual band
src/hooks/useNowOverrideFromSearchParams.ts  — URL-query ?now= parser for screenshots/demo
docs/data-provenance.md                — citation bookkeeping
tests/heartbeat-model.test.ts          — unit tests for pure fns
tests/county-heartbeat.dom.test.tsx    — DOM tests (mirrors pipeline-banner.dom.test.tsx)
```

### Modified

```
src/components/LandingPage.tsx         — mounts <CountyHeartbeat/> inside a clearly-delimited block
```

### Deliberately untouched (asserted via git diff in verification)

```
src/components/RootLayout.tsx
src/components/PipelineBanner.tsx
src/data/pipeline-state.json
src/data/activity-synthetic.json
src/components/CountyMap.tsx         (and all map subcomponents)
```

## Data flow

The counter is anchored to a cited Maricopa Recorder statistic, not to `activity-synthetic.json`. The synthetic file's role remains what it already is: the data source for `/county-activity`'s heatmap. The heartbeat does not import it.

```
MARICOPA_BUSINESS_DAY_RECORDING_VOLUME (=4000, cited constant)
        │
        ▼
fractionOfDayFiled(arizonaHour(now))   ── arizonaHour: America/Phoenix, no DST
        │                               ── fractionOfDayFiled: piecewise-linear curve
        ▼
countAtTime(now)   ── the big number
sparklineBars(now) ── 24 per-hour bars with density + elapsed flag
```

Render guard runs before any hook:

```
currentFreshness(pipelineState).index         → verifiedThrough ("2026-04-09")
pipelineState.plant_lag_reference.lag_days_min → lagMin (14)
pipelineState.plant_lag_reference.lag_days_max → lagMax (28)

shouldRenderHeartbeat({dailyTotal, verifiedThrough, lagMin, lagMax}) → bool
```

If `false`, the component returns `null` — same silent-no-render pattern as `shouldRenderBanner`.

## Pure-function contracts (`src/logic/heartbeat-model.ts`)

### `MARICOPA_BUSINESS_DAY_RECORDING_VOLUME` (constant)

```ts
// Source: Maricopa County Recorder's Office "About" page
// (https://recorder.maricopa.gov/site/about.aspx) — "approximately
// 1 million documents annually". Corroborated at
// https://www.maricopacountyaz.org/Recorders_Office.html
// ("records around a million documents each year").
// Business-day average = 1,000,000 / 250 standard U.S. business days
// ≈ 4,000 docs/day. Used as the counter's total-volume anchor;
// production would tick on per-minute recording timestamps from the
// e-filing queue. See docs/data-provenance.md for full citation.
export const MARICOPA_BUSINESS_DAY_RECORDING_VOLUME = 4000;
```

### `fractionOfDayFiled(hourOfDay: number): number`

```ts
// Returns the fraction [0..1] of the day's recording volume estimated
// to be complete by `hourOfDay` (Arizona time). Piecewise linear:
//   00:00–07:00  → 0      (recorder office closed)
//   07:00–17:00  → 0 → 0.9 (business-hour linear ramp)
//   17:00–24:00  → 0.9 → 1 (after-hours e-filing trickle)
//
// DEMO-ONLY PACING MODEL. Production ticks on real per-minute
// recording timestamps from the recorder's e-filing queue; this
// function exists because the demo replays a business day at
// wall-clock pace and needs SOMETHING to drive the tick. Linear
// pieces chosen for inspectability over realism. Arizona does not
// observe DST, so no DST-edge handling is required.
//
// Clamps hourOfDay: values < 0 treated as 0, values ≥ 24 treated
// as 24 (returns 1). Monotonic non-decreasing by construction.
export function fractionOfDayFiled(hourOfDay: number): number {
  const h = Math.max(0, Math.min(24, hourOfDay));
  if (h < 7)  return 0;
  if (h < 17) return ((h - 7) / 10) * 0.9;
  return 0.9 + ((h - 17) / 7) * 0.1;
}
```

### `arizonaHour(now: number): number`

```ts
// Returns decimal hour-of-day [0, 24) in America/Phoenix local time.
// Arizona does not observe DST, so the offset is constant (UTC-7).
// Implementation reads h/m/s via Intl.DateTimeFormat with
// timeZone: 'America/Phoenix' and returns h + m/60 + s/3600.
export function arizonaHour(now: number): number;
```

### `countAtTime(now: number): number`

```ts
// The counter's displayed integer at wall-clock time `now`.
// Pure function: same input → same output, every call.
export function countAtTime(now: number): number {
  return Math.floor(
    MARICOPA_BUSINESS_DAY_RECORDING_VOLUME *
      fractionOfDayFiled(arizonaHour(now))
  );
}
```

### `sparklineBars(now: number): SparklineBar[]`

```ts
export interface SparklineBar {
  hour: number;          // 0..23
  heightFraction: number; // 0..1, normalized against max business-hour density (0.09)
  elapsed: boolean;       // h < Math.floor(arizonaHour(now))
}

// Returns exactly 24 entries.
// density[h]        = fractionOfDayFiled(h+1) − fractionOfDayFiled(h)
// heightFraction[h] = density[h] / 0.09
// For hours 0..6, density is exactly 0 → heightFraction is 0.
// The <Sparkline> sub-component renders NO <rect> for heightFraction === 0;
// a 1px slate-200 baseline spans the full width so absence of bars reads
// as accounted-for-zero rather than layout gap.
export function sparklineBars(now: number): SparklineBar[];
```

### `shouldRenderHeartbeat({dailyTotal, verifiedThrough, lagMin, lagMax}): boolean`

```ts
// Parallels shouldRenderBanner. Silent no-render on any violation.
// false if:
//   !Number.isFinite(dailyTotal) || dailyTotal <= 0
//   !verifiedThrough  (empty string, undefined coerced)
//   !Number.isFinite(lagMin) || !Number.isFinite(lagMax)
//   lagMin <= 0 || lagMax < lagMin
//
// `daysAhead` from laggingVsPlant is deliberately NOT an input — the
// heartbeat uses the lag range, not the derived delta.
//
// The lagMin=0 guard is a THESIS-PRESERVATION check, not a pure
// data-validity check: lagMin=0 implies title plants are as current
// as the county, which makes the ribbon's claim ("title plants lag
// 0–Nd") false. Hide rather than mislead.
export function shouldRenderHeartbeat(input: {
  dailyTotal: number;
  verifiedThrough: string;
  lagMin: number;
  lagMax: number;
}): boolean;
```

## Component (`src/components/CountyHeartbeat.tsx`)

### Public API

```tsx
export function CountyHeartbeat({ now }: { now?: number }): ReactElement | null;
```

- `now` is epoch milliseconds. **Only this shape** — no `Date`, no ISO string, no union. Callers with a `Date` call `.getTime()`.
- `now === undefined` ⇒ read live clock via `setInterval(1000)`.
- `now === <number>` ⇒ frozen to that value (test/screenshot hatch). No interval registered.

### Lifecycle

```tsx
export function CountyHeartbeat({ now }: { now?: number }): ReactElement | null {
  const freshness = currentFreshness(pipelineState);
  const verifiedThrough = freshness.index;
  const { lag_days_min: lagMin, lag_days_max: lagMax } =
    pipelineState.plant_lag_reference;

  if (!shouldRenderHeartbeat({
    dailyTotal: MARICOPA_BUSINESS_DAY_RECORDING_VOLUME,
    verifiedThrough, lagMin, lagMax,
  })) {
    return null;
  }

  const [t, setT] = useState(() => now ?? Date.now());
  useEffect(() => {
    if (now !== undefined) { setT(now); return; }   // frozen for tests
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, [now]);

  const count = countAtTime(t);
  const bars = sparklineBars(t);
  const elapsedHours = Math.floor(arizonaHour(t));

  return /* Visual layout, §Visual design */;
}
```

### URL-query parser (separate hook, page-level)

```ts
// src/hooks/useNowOverrideFromSearchParams.ts
// Returns epoch ms from ?now=<ISO-with-tz> in the current URL, or undefined.
// Kept out of CountyHeartbeat to preserve the component's prop-only
// public surface (per Q8 lock).
export function useNowOverrideFromSearchParams(): number | undefined;
```

`LandingPage.tsx` calls this hook and passes the result as `<CountyHeartbeat now={…}/>`. The parser intentionally does no prod-vs-dev gating: the affordance is a dev/sprint-owner URL pattern that fails closed (unparseable ⇒ `undefined` ⇒ live clock).

## Visual design

### Desktop (≥ `md:` / 768px)

Single horizontal band, directly below `<PipelineBanner>`, directly above the `<header>` currently at the top of `LandingPage.tsx`.

```
┌─ COUNTY HEARTBEAT (white bg, slate-200 bottom border) ────────────────────┐
│ px-6 py-4                                                                  │
│                                                                            │
│ [ 2,520 ]   [24-h sparkline]       The county operates      [See pipeline →]│
│  documents                         the recording day.                      │
│  filed by                          Title plants refresh                    │
│  this hour                         14–28 days behind.                      │
│                                                                            │
│ Replaying Maricopa's ~4,000-doc business day (~1M/yr, [per the Recorder's  │
│ Office]↗) at this hour · total volume cited; intra-day pacing modeled.     │
└────────────────────────────────────────────────────────────────────────────┘
```

**Columns (flex, horizontal):**

1. **Counter column.** `font-mono tabular-nums text-3xl md:text-4xl font-semibold text-recorder-900` for the number (rendered via `count.toLocaleString()`); small `text-xs text-slate-500` label underneath "documents filed by this hour". The phrase deliberately avoids the word "today" — the replay model narrates a typical business day at this hour, not a calendar claim.
2. **Sparkline column.** Hand-rolled SVG, `~100px` tall, `md:flex-1`. 24 `<rect>` slots side-by-side, but rects are emitted only where `heightFraction > 0` (17 rects total: hours 7–23). Single 1px `stroke="#e2e8f0"` (slate-200) baseline line across the full width. Wrapper `role="img"` with dynamic aria-label.
3. **Ribbon column.** One paragraph. Bold sentence: "The county operates the recording day." followed by "Title plants refresh `{lagMin}`–`{lagMax}` days behind." Numbers interpolated from `plant_lag_reference`.
4. **See pipeline →.** Right-aligned, `text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors duration-150`. `hidden md:inline-block`. Destination `/pipeline`.

**Provenance caption** (below the columns, full-width):

```
Replaying Maricopa's ~4,000-doc business day (~1M/yr, per the Recorder's
Office) at this hour · total volume cited; intra-day pacing modeled.
```

- `id="heartbeat-provenance"`, referenced by section's `aria-describedby`.
- "per the Recorder's Office" is an inline external link: `href="https://recorder.maricopa.gov/site/about.aspx"`, `target="_blank"`, `rel="noopener noreferrer"`. The phrase carries the destination in accessible-name text; no visible external-link icon.
- Mobile: same element present in DOM; `max-md:sr-only` hides it visually while preserving screen-reader + `aria-describedby` semantics.

### Mobile (< `md:` / 768px)

Stacked. Counter centered. Mobile ribbon below. Sparkline hidden. "See pipeline →" hidden.

```
        2,520
   documents filed
    by this hour

  County operates the recording day ·
  title plants lag 14–28d
```

**Copy differences vs desktop:**

| Element | Desktop | Mobile |
|---|---|---|
| Ribbon | "The county operates the recording day. Title plants refresh 14–28 days behind." | "County operates the recording day · title plants lag 14–28d" |

Both ribbons interpolate `{lagMin}` / `{lagMax}`. Natural wrap allowed; **no** `whitespace-nowrap` / ellipsis truncation.

### Copy canonicals (the single source of truth)

| Element | Text |
|---|---|
| Counter caption | `documents filed by this hour` |
| Counter aria-label | `Documents filed by this hour in a Maricopa business day` |
| Sparkline aria-label | ``Filing volume by hour — ${elapsedHours} of 24 hours elapsed, business-hour pacing`` |
| Desktop ribbon | **The county operates the recording day.** Title plants refresh `{lagMin}`–`{lagMax}` days behind. |
| Mobile ribbon | **County operates the recording day** · title plants lag `{lagMin}`–`{lagMax}`d |
| Provenance caption | Replaying Maricopa's ~4,000-doc business day (~1M/yr, [per the Recorder's Office]↗) at this hour · total volume cited; intra-day pacing modeled. |
| Section aria-label | `Maricopa Recorder live-pacing band` |

## Accessibility policy

- **No aria-live anywhere in the heartbeat.** The counter updates at 1Hz; a live region would spam screen readers. Screen readers announce on focus and initial traversal. Calm.
- Section element has `aria-label="Maricopa Recorder live-pacing band"` and `aria-describedby="heartbeat-provenance"`.
- Counter span has `aria-label="Documents filed by this hour in a Maricopa business day"` — deliberately avoids the word "today" to match the visible caption's honesty stance (the replay model narrates a typical business day, not a calendar claim).
- Sparkline SVG wrapper has `role="img"` and a dynamic aria-label that includes the elapsed-hour count.
- Ribbon is a plain `<p>`, read as text.
- External citation link has a visually-hidden suffix ", opens in new tab" appended to its accessible name.
- **Tab order:** desktop — (1) "See pipeline →", (2) citation link. Mobile — (1) citation link only ("See pipeline →" is `md:inline-block`, hidden on mobile).
- **prefers-reduced-motion:** no CSS `animate-*` / `motion-*` at all; no `transition-*` except `transition-colors duration-150` on interactive links (matches project convention project-wide). The 1s React re-render of the integer value is a state change, not an animation — no CSS transitions on the number.

## Test plan

### Unit (`tests/heartbeat-model.test.ts`)

| Function | Cases |
|---|---|
| `fractionOfDayFiled` | Boundaries: `h∈{0, 6.99, 7, 12, 17, 18, 23.99, 24}` with expected values; clamps: `h∈{-1, 25}`; property: monotonic non-decreasing across `[0..24]` step 0.1; determinism: 1000 calls same input → same output. |
| `arizonaHour` | Known fixtures: `Date.parse("2026-04-09T00:00:00-07:00")` → `0`; `"14:30:00-07:00"` → `14.5`; `"23:59:59-07:00"` → `~23.9997`; DST-safety: March + November timestamps return expected values (Arizona does not observe DST). |
| `countAtTime` | `00:00 → 0`; `09:00 → 720`; `14:00 → 2520`; `22:00 → 3885`. Determinism iteration (1000×). |
| `sparklineBars` | Length 24; `bars[3].heightFraction === 0`; `bars[9].heightFraction === 1`; `bars[20].heightFraction ≈ 0.159`; at `now=14:00` — `bars[13].elapsed === true`, `bars[14].elapsed === false`. |
| `shouldRenderHeartbeat` | Valid → true; `dailyTotal=0`→false; `NaN`→false; empty `verifiedThrough`→false; `lagMin=0`→false (thesis-preservation); `lagMax<lagMin`→false. |

### DOM (`tests/county-heartbeat.dom.test.tsx`)

Fixed `now = Date.parse("2026-04-09T14:00:00-07:00")` unless otherwise noted.

- Count rendered as `2,520` via `toLocaleString`.
- Desktop ribbon text contains "The county operates the recording day." + `14–28` (interpolated from fixture).
- Mobile ribbon present in DOM under `md:hidden` class (asserted by class name, not rendered-width — jsdom has no viewport).
- Provenance caption has `id="heartbeat-provenance"`; section has matching `aria-describedby`.
- Citation link: `href="https://recorder.maricopa.gov/site/about.aspx"`, `target="_blank"`, `rel` contains both `noopener` and `noreferrer`.
- "See pipeline →": `href="/pipeline"`, class includes `hidden md:inline-block` (or equivalent visibility pair).
- Sparkline SVG: `role="img"`, aria-label matches `/Filing volume by hour — 14 of 24 hours elapsed, business-hour pacing/`.
- Sparkline rects: exactly 17 `<rect>` elements (hours 7–23); hours 0–6 emit no `<rect>`.
- Sparkline state: `rect[data-hour="13"]` has elapsed-class, `rect[data-hour="14"]` does not.
- **Render guard:** an auxiliary `HeartbeatInner` component (pure, receives all data as props) is rendered directly to assert the rendered output; the guard logic is tested by calling `shouldRenderHeartbeat` with invalid inputs and asserting `false`, matching the pattern in `pipeline-banner.dom.test.tsx`.
- **No `vi.useFakeTimers()`** anywhere. Tests control time via the `now` prop only.

## Preview MCP screenshots

Times parameterized via `?now=<ISO-with-tz>` parsed at LandingPage level (`useNowOverrideFromSearchParams`) and passed as the `now` prop.

| # | Viewport | `now` | Expected state |
|---|---|---|---|
| 1 | Desktop 1280×720 | `2026-04-09T14:00:00-07:00` | Full band: count `2,520`, 7 solid business-hour bars (hours 7–13) + 3 outline business-hour bars (hours 14–16) + 7 outline trickle bars (hours 17–23), desktop ribbon, provenance caption, "See pipeline →" visible. The sparkline aria-label says "14 of 24 hours elapsed" (elapsed-hour count ≠ solid-bar count because hours 0–6 have no rect). |
| 2 | Mobile 375×812 | `2026-04-09T14:00:00-07:00` | Collapsed: count centered, mobile ribbon wrapped, no sparkline, no visible provenance caption, no "See pipeline →" |
| 3 | Desktop 1280×720 | `2026-04-09T14:00:00-07:00`, "See pipeline →" focused via Tab | Visible focus ring on "See pipeline →" link (NOT on the counter — the counter is a `<span>`, intentionally not in tab order) |
| 4 | Desktop 1280×720 | `2026-04-09T09:00:00-07:00` | Replayed morning: count `~720`, 2 solid bars (hours 7–8), 15 outline bars |
| 5 | Desktop 1280×720 | `2026-04-09T16:00:00-07:00` | Late afternoon tipping point: count `~3,240`, 9 solid bars (hours 7–15), 8 outline bars (hour 16 + 7 trickle bars). This is the moment the business-hour curve has one hour of ramp remaining. |
| 6 | Desktop 1280×720 | `2026-04-09T22:00:00-07:00` | Replayed late: count `~3,885`, all 10 business-hour bars solid + 5 of 7 trickle bars solid, 2 trickle bars outline |

## Verification checklist

- `npm run test` — 348 existing tests + new heartbeat tests all pass
- `npx tsc -b` — zero type errors
- All 6 Preview MCP screenshots captured
- Zero new `package.json` dependencies (diff `package.json` to prove)
- Motion hygiene: `rg -P '(animate-|transition-(?!colors)|motion-)' src/components/CountyHeartbeat.tsx` returns empty. (PCRE2 negative lookahead allows `transition-colors` project-wide convention but forbids kinetic motion. If PCRE is unavailable in CI, equivalent: `rg 'animate-|motion-|transition-' src/components/CountyHeartbeat.tsx | rg -v 'transition-colors'` must return empty.)
- Diff check against `b7f3311`: `PipelineBanner.tsx`, `RootLayout.tsx`, `activity-synthetic.json`, `pipeline-state.json`, every map file in `src/components/CountyMap*`, unchanged.
- Branch `feature/landing-heartbeat` diverges from `b7f3311`; no merge/rebase of `main` during development.

## Risks / known limits

- **Replay is not reality.** The counter narrates a typical Maricopa business day at the current wall-clock hour. It does not claim to show *today's* (2026-04-16) filings — the synthetic data ends 2026-04-09. The provenance caption names the replay model explicitly; the word "today" is avoided in user-facing copy. A real production counter would tick on the recorder's e-filing-queue per-minute timestamps.
- **Piecewise-linear is not office behavior.** The curve does not model lunch dips, closing rushes, or inter-municipality variation. Any such modeling would be fabrication in a domain not researched for this sprint. Linear simplicity is the deliberate synthesis-surface-narrowing choice.
- **Weekends and holidays are not special-cased.** The label states "business-day" explicitly; the curve evaluated on a Saturday user visit still replays a business day's shape. One fewer axis of synthesis.
- **`1M ÷ 250 business days` is an approximation.** The ~4,000 figure ignores leap years, federal holidays beyond the standard ~10, and year-to-year volume drift. All error bars within this approximation are absorbed by the "~" in the provenance label. Any production version would pull `avg_business_day_volume` from the recorder's own statistics feed.

## Research citations

See `docs/data-provenance.md` for the full citation block. Primary references for the `MARICOPA_BUSINESS_DAY_RECORDING_VOLUME` constant:

1. Maricopa County Recorder's Office — About page.
   URL: https://recorder.maricopa.gov/site/about.aspx
   Statement: "records approximately 1 million documents annually"
   Access note: Direct fetch 403s (Cloudflare on recorder.maricopa.gov subdomain). Citation was verified via Wikipedia's `Maricopa_County_Recorder's_Office` article (retrieved 2026-04-16), which uses this page as its Reference [12] (retrieval date 2023-10-31). Independent corroboration at source #2.
2. Maricopa County portal — Recorder's Office page.
   URL: https://www.maricopacountyaz.org/Recorders_Office.html
   Statement: "Each year, the office records around a million documents"
   Access note: Direct fetch succeeded on 2026-04-16.

Business-day divisor: 250 is the standard U.S. federal-business-day count (365 − 104 weekend days − 11 federal holidays ≈ 250). Used as the conventional divisor; any variance across years (249–252) falls within the "~" tolerance of the provenance label.

## Decision-log-worthy entries (proposed for CLAUDE.md)

- **Heartbeat anchor is cited, not synthesized.** The counter's total-volume constant comes from the Maricopa Recorder's own public "About" page (~1M/yr). Synthesis is confined to intra-day pacing. Any future tweak to the counter's scale must either update the citation or cite a new source — it may never be adjusted to match a target tick cadence.
- **Determinism invariant is load-bearing.** `countAtTime(T)` is pure of `T`. No tween, no catch-up, no random. F5 × 3 at the same second returns the same number. This is what distinguishes the heartbeat from a fabricated event stream.
- **`lagMin=0` is a thesis-preservation guard.** If the fixture's `plant_lag_reference.lag_days_min` ever reaches 0, the ribbon's claim becomes false and the component hides silently. Parallels `shouldRenderBanner`'s negative-days-ahead guard.
