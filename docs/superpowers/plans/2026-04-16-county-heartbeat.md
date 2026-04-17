# County Heartbeat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `<CountyHeartbeat/>` band on the landing page — a citation-anchored, live-feeling signal that the recorder is operating right now. The counter ticks from a pure function of wall-clock time; the 24-hour sparkline renders from the same curve; the ribbon sources its lag range from `pipeline-state.json`; every number traces to either a citation or a named pacing function.

**Architecture:** A pure-function module (`src/logic/heartbeat-model.ts`) owns the counter math, the hour-of-day curve, the Arizona timezone handling, the sparkline bar shape, and the render guard. The visual `CountyHeartbeat.tsx` component re-reads that module every 1s via `setInterval` (or uses a `now` prop for tests/screenshots), renders counter + SVG sparkline + ribbon + provenance caption, and mounts as the first child of `<main>` inside `LandingPage.tsx` in a clearly-delimited block. `<PipelineBanner/>` and `<RootLayout/>` are untouched per parallel-execution discipline with the map-redesign agent.

**Tech Stack:** React 19.2, react-router v7, Tailwind v4 (`recorder-*` / `moat-*` tokens only), vitest 4 + `@testing-library/react`, hand-rolled SVG (no charting lib), no new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-04-16-county-heartbeat-design.md`.
**Data provenance:** `docs/data-provenance.md`.
**Branch base:** `b7f3311` — do not rebase or merge `main` during implementation.

---

## File map

| Path | Status | Responsibility |
|---|---|---|
| `src/logic/heartbeat-model.ts` | NEW | Pure-function module: `MARICOPA_BUSINESS_DAY_RECORDING_VOLUME`, `fractionOfDayFiled`, `arizonaHour`, `countAtTime`, `sparklineBars`, `shouldRenderHeartbeat`. |
| `src/hooks/useNowOverrideFromSearchParams.ts` | NEW | Parses `?now=<ISO-with-tz>` → epoch ms or undefined. Used only by `LandingPage` to freeze the clock for screenshots/demos. |
| `src/components/CountyHeartbeat.tsx` | NEW | Visual band: counter, sparkline, ribbon, provenance caption, "See pipeline →" link. Accepts `now?: number` prop. |
| `src/components/LandingPage.tsx` | modify | Mount `<CountyHeartbeat/>` inside a clearly-delimited block at the top of `<main>`. Pass `now` from `useNowOverrideFromSearchParams`. |
| `tests/heartbeat-model.test.ts` | NEW | Unit tests for all 5 pure-function exports. |
| `tests/use-now-override.test.tsx` | NEW | Hook tests (valid ISO, invalid ISO, missing param). |
| `tests/county-heartbeat.dom.test.tsx` | NEW | DOM tests mirroring `pipeline-banner.dom.test.tsx` — layout, copy, render guard, citation link, sparkline role/rect count. |
| `tests/landing-page.dom.test.tsx` | modify | Add one assertion that `<CountyHeartbeat/>` mounts above the existing map section. |
| `docs/data-provenance.md` | already exists (committed in spec) | Citation registry. No change in this plan. |

**Deliberately untouched** (asserted by diff check against `b7f3311` in Task 5):
- `src/components/RootLayout.tsx`
- `src/components/PipelineBanner.tsx`
- `src/data/pipeline-state.json`
- `src/data/activity-synthetic.json`
- `src/components/CountyMap.tsx` and all map subcomponents
- `src/router.tsx`, `src/main.tsx`

---

## Task 1: Pure-function model — `heartbeat-model.ts` + unit tests

**Files:**
- Create: `tests/heartbeat-model.test.ts`
- Create: `src/logic/heartbeat-model.ts`

- [ ] **Step 1: Write the full test file**

Create `tests/heartbeat-model.test.ts` with this exact content:

```ts
import { describe, it, expect } from "vitest";
import {
  MARICOPA_BUSINESS_DAY_RECORDING_VOLUME,
  fractionOfDayFiled,
  arizonaHour,
  countAtTime,
  sparklineBars,
  shouldRenderHeartbeat,
} from "../src/logic/heartbeat-model";

describe("MARICOPA_BUSINESS_DAY_RECORDING_VOLUME", () => {
  it("is 4000 — anchored to the Recorder's Office ~1M/yr citation / 250 biz days", () => {
    expect(MARICOPA_BUSINESS_DAY_RECORDING_VOLUME).toBe(4000);
  });
});

describe("fractionOfDayFiled — piecewise linear business-day curve", () => {
  it("returns 0 before 07:00", () => {
    expect(fractionOfDayFiled(0)).toBe(0);
    expect(fractionOfDayFiled(6.99)).toBe(0);
  });

  it("equals 0 at exactly 07:00 (start of business-hour ramp)", () => {
    expect(fractionOfDayFiled(7)).toBe(0);
  });

  it("returns 0.45 at noon — midpoint of business-hour ramp", () => {
    expect(fractionOfDayFiled(12)).toBeCloseTo(0.45, 10);
  });

  it("returns 0.9 at exactly 17:00 — end of business-hour ramp", () => {
    expect(fractionOfDayFiled(17)).toBeCloseTo(0.9, 10);
  });

  it("advances in the trickle segment between 17:00 and midnight", () => {
    expect(fractionOfDayFiled(18)).toBeCloseTo(0.9 + 0.1 / 7, 10);
    expect(fractionOfDayFiled(23.99)).toBeLessThan(1);
    expect(fractionOfDayFiled(23.99)).toBeGreaterThan(0.99);
  });

  it("clamps: negative input → 0, input ≥ 24 → 1", () => {
    expect(fractionOfDayFiled(-1)).toBe(0);
    expect(fractionOfDayFiled(25)).toBe(1);
    expect(fractionOfDayFiled(24)).toBe(1);
  });

  it("is monotonic non-decreasing across the full day", () => {
    let prev = -1;
    for (let h = 0; h <= 24; h += 0.1) {
      const v = fractionOfDayFiled(h);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("is deterministic: same input returns same output across 1000 calls", () => {
    const expected = fractionOfDayFiled(14.5);
    for (let i = 0; i < 1000; i++) {
      expect(fractionOfDayFiled(14.5)).toBe(expected);
    }
  });
});

describe("arizonaHour — Intl-based America/Phoenix hour extraction", () => {
  it("returns 0 at midnight Arizona time", () => {
    expect(arizonaHour(Date.parse("2026-04-09T00:00:00-07:00"))).toBeCloseTo(0, 5);
  });

  it("returns 14.5 at 14:30 Arizona time", () => {
    expect(arizonaHour(Date.parse("2026-04-09T14:30:00-07:00"))).toBeCloseTo(14.5, 5);
  });

  it("returns ~23.9997 at 23:59:59 Arizona time", () => {
    const h = arizonaHour(Date.parse("2026-04-09T23:59:59-07:00"));
    expect(h).toBeGreaterThan(23.99);
    expect(h).toBeLessThan(24);
  });

  it("does not shift across DST boundaries — Arizona observes no DST", () => {
    // March 9, 2026 is when DST starts in most of the US. Arizona ignores it.
    // Both the March-before-DST and March-after-DST timestamps should land
    // at the same Arizona local hour when expressed as UTC-7.
    const marchNoon = Date.parse("2026-03-09T12:00:00-07:00");
    const novemberNoon = Date.parse("2026-11-02T12:00:00-07:00");
    expect(arizonaHour(marchNoon)).toBeCloseTo(12, 5);
    expect(arizonaHour(novemberNoon)).toBeCloseTo(12, 5);
  });
});

describe("countAtTime — citation-anchored, hour-of-day-scaled counter", () => {
  it("is 0 at midnight", () => {
    expect(countAtTime(Date.parse("2026-04-09T00:00:00-07:00"))).toBe(0);
  });

  it("is 720 at 09:00 Arizona time (4000 × 0.18)", () => {
    expect(countAtTime(Date.parse("2026-04-09T09:00:00-07:00"))).toBe(720);
  });

  it("is 2520 at 14:00 Arizona time (4000 × 0.63)", () => {
    expect(countAtTime(Date.parse("2026-04-09T14:00:00-07:00"))).toBe(2520);
  });

  it("is 3885 at 22:00 Arizona time (floor(4000 × (0.9 + 5/7 × 0.1)))", () => {
    expect(countAtTime(Date.parse("2026-04-09T22:00:00-07:00"))).toBe(3885);
  });

  it("is deterministic: same input returns same output across 1000 calls", () => {
    const t = Date.parse("2026-04-09T14:30:00-07:00");
    const expected = countAtTime(t);
    for (let i = 0; i < 1000; i++) {
      expect(countAtTime(t)).toBe(expected);
    }
  });
});

describe("sparklineBars — 24 entries describing each hour's density + elapsed state", () => {
  const at0900 = Date.parse("2026-04-09T09:00:00-07:00");
  const at1400 = Date.parse("2026-04-09T14:00:00-07:00");

  it("returns exactly 24 entries", () => {
    expect(sparklineBars(at1400)).toHaveLength(24);
  });

  it("bars 0..6 have heightFraction exactly 0 (pre-business density)", () => {
    const bars = sparklineBars(at1400);
    for (let h = 0; h < 7; h++) {
      expect(bars[h].heightFraction).toBe(0);
    }
  });

  it("bars 7..16 have heightFraction exactly 1 (max business-hour density)", () => {
    const bars = sparklineBars(at1400);
    for (let h = 7; h < 17; h++) {
      expect(bars[h].heightFraction).toBeCloseTo(1, 10);
    }
  });

  it("bar 20 has heightFraction ≈ 0.159 (trickle density / business density)", () => {
    const bars = sparklineBars(at1400);
    expect(bars[20].heightFraction).toBeCloseTo((0.1 / 7) / 0.09, 5);
  });

  it("at 14:00 Arizona, bars with h < 14 are elapsed, bars with h >= 14 are not", () => {
    const bars = sparklineBars(at1400);
    expect(bars[13].elapsed).toBe(true);
    expect(bars[14].elapsed).toBe(false);
  });

  it("at 09:00 Arizona, only hours 0..8 are elapsed", () => {
    const bars = sparklineBars(at0900);
    expect(bars[8].elapsed).toBe(true);
    expect(bars[9].elapsed).toBe(false);
  });

  it("hour fields are sequential 0..23", () => {
    const bars = sparklineBars(at1400);
    bars.forEach((b, idx) => expect(b.hour).toBe(idx));
  });
});

describe("shouldRenderHeartbeat — parallels shouldRenderBanner", () => {
  const valid = {
    dailyTotal: 4000,
    verifiedThrough: "2026-04-09",
    lagMin: 14,
    lagMax: 28,
  };

  it("returns true for valid fixture inputs", () => {
    expect(shouldRenderHeartbeat(valid)).toBe(true);
  });

  it("returns false when dailyTotal is 0", () => {
    expect(shouldRenderHeartbeat({ ...valid, dailyTotal: 0 })).toBe(false);
  });

  it("returns false when dailyTotal is negative", () => {
    expect(shouldRenderHeartbeat({ ...valid, dailyTotal: -1 })).toBe(false);
  });

  it("returns false when dailyTotal is NaN", () => {
    expect(shouldRenderHeartbeat({ ...valid, dailyTotal: Number.NaN })).toBe(false);
  });

  it("returns false when verifiedThrough is empty", () => {
    expect(shouldRenderHeartbeat({ ...valid, verifiedThrough: "" })).toBe(false);
  });

  it("returns false when lagMin is 0 (thesis-preservation: plants equally current)", () => {
    expect(shouldRenderHeartbeat({ ...valid, lagMin: 0 })).toBe(false);
  });

  it("returns false when lagMax < lagMin (inverted range)", () => {
    expect(shouldRenderHeartbeat({ ...valid, lagMin: 28, lagMax: 14 })).toBe(false);
  });

  it("returns false when lagMin is NaN", () => {
    expect(shouldRenderHeartbeat({ ...valid, lagMin: Number.NaN })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test — expect failure (module not found)**

Run: `npm run test -- --run tests/heartbeat-model.test.ts`
Expected: FAIL with "Cannot find module '../src/logic/heartbeat-model'" or equivalent.

- [ ] **Step 3: Create the implementation file**

Create `src/logic/heartbeat-model.ts` with this exact content:

```ts
/**
 * County Heartbeat pure-function model.
 *
 * Single source of truth for the ticking document counter and the
 * 24-hour sparkline on the landing page. Every function here is a
 * pure function of its arguments; <CountyHeartbeat/> re-reads this
 * module's outputs every 1s to produce visible ticks.
 *
 * Determinism invariant: countAtTime(T) and sparklineBars(T) are
 * pure of T. Rapid F5 at the same second returns the same numbers.
 */

/**
 * Source: Maricopa County Recorder's Office "About" page
 * (https://recorder.maricopa.gov/site/about.aspx) — "approximately
 * 1 million documents annually". Corroborated at
 * https://www.maricopacountyaz.org/Recorders_Office.html
 * ("records around a million documents each year").
 * Business-day average = 1,000,000 / 250 standard U.S. business days
 * ≈ 4,000 docs/day. Used as the counter's total-volume anchor;
 * production would tick on per-minute recording timestamps from the
 * e-filing queue. See docs/data-provenance.md for full citation.
 */
export const MARICOPA_BUSINESS_DAY_RECORDING_VOLUME = 4000;

/**
 * Returns the fraction [0..1] of the day's recording volume estimated
 * to be complete by `hourOfDay` (Arizona time). Piecewise linear:
 *   00:00–07:00  → 0      (recorder office closed)
 *   07:00–17:00  → 0 → 0.9 (business-hour linear ramp)
 *   17:00–24:00  → 0.9 → 1 (after-hours e-filing trickle)
 *
 * DEMO-ONLY PACING MODEL. Production ticks on real per-minute
 * recording timestamps from the recorder's e-filing queue; this
 * function exists because the demo replays a business day at
 * wall-clock pace and needs SOMETHING to drive the tick. Linear
 * pieces chosen for inspectability over realism. Arizona does not
 * observe DST, so no DST-edge handling is required.
 *
 * Clamps hourOfDay: values < 0 treated as 0, values ≥ 24 treated
 * as 24 (returns 1). Monotonic non-decreasing by construction.
 */
export function fractionOfDayFiled(hourOfDay: number): number {
  const h = Math.max(0, Math.min(24, hourOfDay));
  if (h < 7) return 0;
  if (h < 17) return ((h - 7) / 10) * 0.9;
  return 0.9 + ((h - 17) / 7) * 0.1;
}

/**
 * Returns decimal hour-of-day in America/Phoenix local time, range [0, 24).
 * Arizona does not observe DST; offset is constant (UTC-7). Reads h/m/s
 * via Intl.DateTimeFormat rather than local getHours() so that a user
 * in a non-Arizona timezone still sees Arizona pacing.
 */
export function arizonaHour(now: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(new Date(now));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const s = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  // Intl can emit "24" at midnight for hour12:false — normalize to 0.
  const hNorm = h === 24 ? 0 : h;
  return hNorm + m / 60 + s / 3600;
}

/**
 * The counter's displayed integer at wall-clock time `now`.
 * Pure: same input → same output, every call.
 */
export function countAtTime(now: number): number {
  return Math.floor(
    MARICOPA_BUSINESS_DAY_RECORDING_VOLUME *
      fractionOfDayFiled(arizonaHour(now)),
  );
}

export interface SparklineBar {
  hour: number;
  /** 0..1, normalized against max business-hour density (0.09). */
  heightFraction: number;
  elapsed: boolean;
}

/**
 * 24 per-hour entries for the sparkline. Bars where density is zero
 * (hours 0–6) return heightFraction 0 and are rendered as "no rect"
 * by the caller — a 1px baseline line signals absence.
 */
export function sparklineBars(now: number): SparklineBar[] {
  const currentHour = arizonaHour(now);
  const elapsedThreshold = Math.floor(currentHour);
  const MAX_DENSITY = 0.09; // business-hour density: 0.9 / 10 hours
  const bars: SparklineBar[] = [];
  for (let h = 0; h < 24; h++) {
    const density = fractionOfDayFiled(h + 1) - fractionOfDayFiled(h);
    bars.push({
      hour: h,
      heightFraction: density / MAX_DENSITY,
      elapsed: h < elapsedThreshold,
    });
  }
  return bars;
}

/**
 * Render guard. Silent no-render on any violation — parallels
 * shouldRenderBanner in PipelineBanner.tsx.
 *
 * The lagMin=0 guard is a THESIS-PRESERVATION check, not a pure
 * data-validity check: lagMin=0 implies title plants are as current
 * as the county, which makes the ribbon's claim false. Hide rather
 * than mislead.
 */
export function shouldRenderHeartbeat(input: {
  dailyTotal: number;
  verifiedThrough: string;
  lagMin: number;
  lagMax: number;
}): boolean {
  if (!Number.isFinite(input.dailyTotal) || input.dailyTotal <= 0) return false;
  if (!input.verifiedThrough) return false;
  if (!Number.isFinite(input.lagMin) || !Number.isFinite(input.lagMax)) return false;
  if (input.lagMin <= 0 || input.lagMax < input.lagMin) return false;
  return true;
}
```

- [ ] **Step 4: Run the tests — expect all to pass**

Run: `npm run test -- --run tests/heartbeat-model.test.ts`
Expected: PASS. All ~30 cases green.

- [ ] **Step 5: Commit**

```bash
git add tests/heartbeat-model.test.ts src/logic/heartbeat-model.ts
git commit -m "$(cat <<'EOF'
feat(heartbeat): pure-function model — count, curve, sparkline, guard

Introduces src/logic/heartbeat-model.ts — the single source of truth
for the County Heartbeat's counter math and sparkline shape.

- MARICOPA_BUSINESS_DAY_RECORDING_VOLUME = 4000 anchored to the
  Recorder's "About" page (~1M/yr citation); see
  docs/data-provenance.md.
- fractionOfDayFiled: piecewise linear, inspectable, DEMO-ONLY
  PACING MODEL with inline reviewer-friendly documentation.
- arizonaHour: Intl-based America/Phoenix extraction, no DST.
- countAtTime + sparklineBars: pure-of-time derivations.
- shouldRenderHeartbeat: parallel to shouldRenderBanner; lagMin=0
  is a thesis-preservation guard, not just data validity.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: URL-override hook — `useNowOverrideFromSearchParams`

**Files:**
- Create: `tests/use-now-override.test.tsx`
- Create: `src/hooks/useNowOverrideFromSearchParams.ts`

- [ ] **Step 1: Write the test file**

Create `tests/use-now-override.test.tsx` with this exact content:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useNowOverrideFromSearchParams } from "../src/hooks/useNowOverrideFromSearchParams";

function wrap(initialUrl: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  );
}

describe("useNowOverrideFromSearchParams", () => {
  it("returns undefined when ?now= is absent", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/"),
    });
    expect(result.current).toBeUndefined();
  });

  it("returns epoch ms when ?now= is a valid ISO with tz", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/?now=2026-04-09T14:00:00-07:00"),
    });
    expect(result.current).toBe(Date.parse("2026-04-09T14:00:00-07:00"));
  });

  it("returns undefined when ?now= is unparseable", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/?now=not-a-date"),
    });
    expect(result.current).toBeUndefined();
  });

  it("returns undefined when ?now= is empty", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/?now="),
    });
    expect(result.current).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test — expect failure (module not found)**

Run: `npm run test -- --run tests/use-now-override.test.tsx`
Expected: FAIL with "Cannot find module '../src/hooks/useNowOverrideFromSearchParams'".

- [ ] **Step 3: Create the hook**

Create `src/hooks/useNowOverrideFromSearchParams.ts` with this exact content:

```ts
import { useSearchParams } from "react-router";

/**
 * Reads `?now=<ISO-with-tz>` from the current URL and returns the
 * parsed epoch milliseconds, or `undefined` if the query parameter
 * is absent or unparseable.
 *
 * Used by the landing page to freeze the <CountyHeartbeat/> clock
 * for Preview MCP screenshots and guided-walkthrough demos, e.g.
 * `/?now=2026-04-09T14:00:00-07:00`. Fails closed: any parse error
 * yields undefined, which falls back to the live clock.
 *
 * Kept at the page level (not inside CountyHeartbeat) so the
 * component's public surface remains `now?: number` and nothing else.
 */
export function useNowOverrideFromSearchParams(): number | undefined {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get("now");
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}
```

- [ ] **Step 4: Run the test — expect all to pass**

Run: `npm run test -- --run tests/use-now-override.test.tsx`
Expected: PASS — 4 cases green.

- [ ] **Step 5: Commit**

```bash
git add tests/use-now-override.test.tsx src/hooks/useNowOverrideFromSearchParams.ts
git commit -m "$(cat <<'EOF'
feat(heartbeat): add useNowOverrideFromSearchParams hook

Parses ?now=<ISO-with-tz> at the page level for Preview MCP
screenshots and guided-demo clock freezing. Fails closed —
unparseable input yields undefined, which the heartbeat treats
as "read the live clock".

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `CountyHeartbeat` component + DOM tests

**Files:**
- Create: `tests/county-heartbeat.dom.test.tsx`
- Create: `src/components/CountyHeartbeat.tsx`

- [ ] **Step 1: Write the DOM test file**

Create `tests/county-heartbeat.dom.test.tsx` with this exact content:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { CountyHeartbeat } from "../src/components/CountyHeartbeat";

const AT_1400 = Date.parse("2026-04-09T14:00:00-07:00");
const AT_0900 = Date.parse("2026-04-09T09:00:00-07:00");

function renderAt(now: number) {
  return render(
    <MemoryRouter>
      <CountyHeartbeat now={now} />
    </MemoryRouter>,
  );
}

describe("CountyHeartbeat — counter + ribbon + provenance", () => {
  afterEach(() => cleanup());

  it("renders the count at 14:00 as 2,520 with locale-formatted thousands separator", () => {
    renderAt(AT_1400);
    expect(screen.getByText("2,520")).toBeInTheDocument();
  });

  it("renders the count at 09:00 as 720", () => {
    renderAt(AT_0900);
    expect(screen.getByText("720")).toBeInTheDocument();
  });

  it("renders the counter's visible caption without the word 'today'", () => {
    const { container } = renderAt(AT_1400);
    expect(container.textContent).toMatch(/documents filed by this hour/i);
    // Honesty stance: caption deliberately avoids the word 'today'.
    // 'documents filed by this hour' is the canonical text.
  });

  it("gives the counter span an aria-label that matches the caption's honesty stance", () => {
    renderAt(AT_1400);
    expect(
      screen.getByLabelText(/Documents filed by this hour in a Maricopa business day/i),
    ).toBeInTheDocument();
  });

  it("renders the desktop ribbon with {lagMin}–{lagMax} interpolated from pipeline_state.json", () => {
    const { container } = renderAt(AT_1400);
    const text = container.textContent ?? "";
    expect(text).toMatch(/The county operates the recording day\./);
    expect(text).toMatch(/Title plants refresh 14–28 days behind\./);
  });

  it("renders the mobile ribbon with the tightened copy and day abbreviation", () => {
    const { container } = renderAt(AT_1400);
    const text = container.textContent ?? "";
    expect(text).toMatch(/County operates the recording day/);
    expect(text).toMatch(/title plants lag 14–28d/);
  });

  it("gates the mobile ribbon behind md:hidden and the desktop cluster behind hidden md:flex", () => {
    const { container } = renderAt(AT_1400);
    const mobileRibbon = container.querySelector(".md\\:hidden");
    expect(mobileRibbon).toBeTruthy();
    const desktopCluster = container.querySelector(".hidden.md\\:flex");
    expect(desktopCluster).toBeTruthy();
  });

  it("renders the provenance caption with id='heartbeat-provenance' and cites the Recorder's Office via external link", () => {
    renderAt(AT_1400);
    const caption = document.getElementById("heartbeat-provenance");
    expect(caption).not.toBeNull();
    expect(caption!.textContent ?? "").toMatch(/Replaying Maricopa's ~4,000-doc business day/);
    expect(caption!.textContent ?? "").toMatch(/total volume cited; intra-day pacing modeled/);

    const link = caption!.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe(
      "https://recorder.maricopa.gov/site/about.aspx",
    );
    expect(link!.getAttribute("target")).toBe("_blank");
    const rel = link!.getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("sets aria-describedby on the section pointing at the provenance caption", () => {
    const { container } = renderAt(AT_1400);
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-describedby")).toBe("heartbeat-provenance");
  });

  it("renders a 'See pipeline →' link to /pipeline that is visible on desktop only", () => {
    renderAt(AT_1400);
    const link = screen.getByRole("link", { name: /see pipeline/i });
    expect(link).toHaveAttribute("href", "/pipeline");
    expect(link.className).toMatch(/hidden/);
    expect(link.className).toMatch(/md:inline-block|md:inline-flex|md:inline|md:block|md:flex/);
  });
});

describe("CountyHeartbeat sparkline — 24-hour shape and elapsed state", () => {
  afterEach(() => cleanup());

  it("wraps the sparkline SVG with role='img' and a dynamic aria-label", () => {
    renderAt(AT_1400);
    const img = screen.getByRole("img", { name: /Filing volume by hour/i });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("aria-label")).toMatch(
      /14 of 24 hours elapsed, business-hour pacing/,
    );
  });

  it("renders 17 <rect> elements (hours 7..23); hours 0..6 emit no rect", () => {
    const { container } = renderAt(AT_1400);
    const rects = container.querySelectorAll("svg rect");
    expect(rects.length).toBe(17);
    for (let h = 0; h < 7; h++) {
      expect(container.querySelector(`svg rect[data-hour="${h}"]`)).toBeNull();
    }
    for (let h = 7; h < 24; h++) {
      expect(container.querySelector(`svg rect[data-hour="${h}"]`)).not.toBeNull();
    }
  });

  it("marks rects at h < 14 as elapsed at now=14:00", () => {
    const { container } = renderAt(AT_1400);
    expect(
      container.querySelector('svg rect[data-hour="13"]')?.getAttribute("data-elapsed"),
    ).toBe("true");
    expect(
      container.querySelector('svg rect[data-hour="14"]')?.getAttribute("data-elapsed"),
    ).toBe("false");
  });

  it("renders a 1px slate-200 baseline line across the sparkline width", () => {
    const { container } = renderAt(AT_1400);
    const line = container.querySelector("svg line");
    expect(line).not.toBeNull();
    expect(line!.getAttribute("stroke")).toBe("#e2e8f0");
  });
});

describe("CountyHeartbeat — no aria-live anywhere", () => {
  afterEach(() => cleanup());

  it("counter span does not carry aria-live (would spam screen readers at 1Hz)", () => {
    const { container } = renderAt(AT_1400);
    const liveRegions = container.querySelectorAll("[aria-live]");
    expect(liveRegions.length).toBe(0);
  });
});

describe("CountyHeartbeat — determinism under rapid re-render", () => {
  afterEach(() => cleanup());

  it("two renders at the same `now` produce identical count text", () => {
    const { container: a } = renderAt(AT_1400);
    const { container: b } = renderAt(AT_1400);
    const countA = a.querySelector('[aria-label*="Maricopa business day"]')?.textContent;
    const countB = b.querySelector('[aria-label*="Maricopa business day"]')?.textContent;
    expect(countA).toBe(countB);
    expect(countA).toBe("2,520");
  });
});
```

- [ ] **Step 2: Run the test — expect failure (module not found)**

Run: `npm run test -- --run tests/county-heartbeat.dom.test.tsx`
Expected: FAIL with "Cannot find module '../src/components/CountyHeartbeat'".

- [ ] **Step 3: Create the component file**

Create `src/components/CountyHeartbeat.tsx` with this exact content:

```tsx
import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router";
import state from "../data/pipeline-state.json";
import {
  currentFreshness,
  type PipelineState,
} from "../logic/pipeline-selectors";
import {
  MARICOPA_BUSINESS_DAY_RECORDING_VOLUME,
  arizonaHour,
  countAtTime,
  shouldRenderHeartbeat,
  sparklineBars,
  type SparklineBar,
} from "../logic/heartbeat-model";

const pipelineState = state as unknown as PipelineState;

export function CountyHeartbeat({ now }: { now?: number }): ReactElement | null {
  const freshness = currentFreshness(pipelineState);
  const verifiedThrough = freshness.index;
  const { lag_days_min: lagMin, lag_days_max: lagMax } =
    pipelineState.plant_lag_reference;

  // Hooks must not run below a conditional return, so this guard runs first.
  if (
    !shouldRenderHeartbeat({
      dailyTotal: MARICOPA_BUSINESS_DAY_RECORDING_VOLUME,
      verifiedThrough,
      lagMin,
      lagMax,
    })
  ) {
    return null;
  }

  return (
    <HeartbeatInner now={now} lagMin={lagMin} lagMax={lagMax} />
  );
}

function HeartbeatInner({
  now,
  lagMin,
  lagMax,
}: {
  now: number | undefined;
  lagMin: number;
  lagMax: number;
}): ReactElement {
  const [t, setT] = useState<number>(() => now ?? Date.now());

  useEffect(() => {
    if (now !== undefined) {
      setT(now);
      return;
    }
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, [now]);

  const count = countAtTime(t);
  const bars = sparklineBars(t);
  const elapsedHours = Math.floor(arizonaHour(t));

  return (
    <section
      aria-label="Maricopa Recorder live-pacing band"
      aria-describedby="heartbeat-provenance"
      className="border-b border-slate-200 bg-white"
    >
      <div className="px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:gap-8">
        <div className="flex flex-col items-center md:items-start">
          <span
            aria-label="Documents filed by this hour in a Maricopa business day"
            className="font-mono tabular-nums text-3xl md:text-4xl font-semibold text-recorder-900"
          >
            {count.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">
            documents filed by this hour
          </span>
        </div>

        <div className="hidden md:block md:flex-1">
          <Sparkline bars={bars} elapsedHours={elapsedHours} />
        </div>

        <div className="hidden md:flex md:items-center md:gap-6">
          <p className="text-sm text-slate-700 max-w-xs">
            <strong className="font-semibold text-slate-900">
              The county operates the recording day.
            </strong>{" "}
            Title plants refresh {lagMin}–{lagMax} days behind.
          </p>
          <Link
            to="/pipeline"
            className="hidden md:inline-block text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors duration-150 whitespace-nowrap"
          >
            See pipeline →
          </Link>
        </div>

        <p className="md:hidden text-sm text-slate-700 leading-snug mt-2 text-center">
          <strong className="font-semibold text-slate-900">
            County operates the recording day
          </strong>{" "}
          · title plants lag {lagMin}–{lagMax}d
        </p>
      </div>

      <p
        id="heartbeat-provenance"
        className="max-md:sr-only md:block px-6 pb-2 text-[11px] text-slate-500 leading-tight"
      >
        Replaying Maricopa's ~4,000-doc business day (~1M/yr,{" "}
        <a
          href="https://recorder.maricopa.gov/site/about.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-slate-700 transition-colors duration-150"
        >
          per the Recorder's Office
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        ) at this hour · total volume cited; intra-day pacing modeled.
      </p>
    </section>
  );
}

function Sparkline({
  bars,
  elapsedHours,
}: {
  bars: SparklineBar[];
  elapsedHours: number;
}): ReactElement {
  const WIDTH = 240;
  const HEIGHT = 100;
  const BAR_GAP = 2;
  const BAR_WIDTH = (WIDTH - 23 * BAR_GAP) / 24;
  const BASELINE_Y = HEIGHT - 1;

  return (
    <svg
      role="img"
      aria-label={`Filing volume by hour — ${elapsedHours} of 24 hours elapsed, business-hour pacing`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-auto max-h-[100px]"
      preserveAspectRatio="none"
    >
      <line
        x1={0}
        y1={BASELINE_Y}
        x2={WIDTH}
        y2={BASELINE_Y}
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      {bars.map((bar) => {
        if (bar.heightFraction === 0) return null;
        const barHeight = bar.heightFraction * (HEIGHT - 2);
        const x = bar.hour * (BAR_WIDTH + BAR_GAP);
        const y = BASELINE_Y - barHeight;
        const commonProps = {
          key: bar.hour,
          "data-hour": bar.hour,
          "data-elapsed": bar.elapsed ? "true" : "false",
          x,
          y,
          width: BAR_WIDTH,
          height: barHeight,
        } as const;
        return bar.elapsed ? (
          <rect {...commonProps} fill="#475569" />
        ) : (
          <rect {...commonProps} fill="none" stroke="#cbd5e1" strokeWidth={1} />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Run the tests — expect all to pass**

Run: `npm run test -- --run tests/county-heartbeat.dom.test.tsx`
Expected: PASS — all DOM test cases green.

If the "See pipeline →" visibility-class regex fails, inspect the rendered class string and loosen the second half of the assertion pattern (`md:inline-block|md:inline-flex|md:inline|md:block|md:flex`) to match whichever variant you chose — do not change the component if the visible behavior is correct.

- [ ] **Step 5: Commit**

```bash
git add tests/county-heartbeat.dom.test.tsx src/components/CountyHeartbeat.tsx
git commit -m "$(cat <<'EOF'
feat(heartbeat): add CountyHeartbeat component + DOM tests

Visual band mounted above the landing header. Counter re-renders at
1Hz from a pure function of wall-clock time; SVG sparkline renders
the same curve as 24 per-hour bars (17 visible, 7 dropped for the
pre-dawn segment with a 1px baseline across).

Render guard parallels shouldRenderBanner: silent no-render if any
invariant fails, including lagMin<=0 (thesis-preservation).

`now?: number` prop is the only non-defaultable surface — used by
tests and the URL-override hook; production reads the live clock.
No aria-live anywhere (would spam screen readers at 1Hz); screen
readers get focus-on-demand announcements plus the aria-describedby
provenance caption.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Mount `<CountyHeartbeat/>` in LandingPage

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `tests/landing-page.dom.test.tsx`

- [ ] **Step 1: Add a landing-page test for the heartbeat mount**

Append this describe block to `tests/landing-page.dom.test.tsx` (keep all existing content intact):

```tsx
describe("LandingPage — CountyHeartbeat mount", () => {
  afterEach(() => cleanup());

  it("renders the heartbeat band above the map section", () => {
    render(
      <MemoryRouter>
        <TerminologyProvider>
          <LandingPage />
        </TerminologyProvider>
      </MemoryRouter>,
    );
    const section = document.querySelector(
      'section[aria-label="Maricopa Recorder live-pacing band"]',
    );
    expect(section).toBeTruthy();
    // Heartbeat sits before the <header>; <header> sits before the map.
    const main = document.querySelector("main");
    const heartbeatIndex = Array.from(main!.children).findIndex(
      (el) => el.getAttribute("aria-label") === "Maricopa Recorder live-pacing band",
    );
    const headerIndex = Array.from(main!.children).findIndex(
      (el) => el.tagName === "HEADER",
    );
    expect(heartbeatIndex).toBeGreaterThanOrEqual(0);
    expect(headerIndex).toBeGreaterThan(heartbeatIndex);
  });
});
```

- [ ] **Step 2: Run the test — expect failure (heartbeat not mounted yet)**

Run: `npm run test -- --run tests/landing-page.dom.test.tsx`
Expected: The new case FAILs (section aria-label not found). Existing cases still pass.

- [ ] **Step 3: Modify `LandingPage.tsx` to mount the heartbeat**

Open `src/components/LandingPage.tsx`. Add two imports at the top of the file (below existing imports):

```tsx
import { CountyHeartbeat } from "./CountyHeartbeat";
import { useNowOverrideFromSearchParams } from "../hooks/useNowOverrideFromSearchParams";
```

Inside `LandingPage()` above the `return`, read the override:

```tsx
  const nowOverride = useNowOverrideFromSearchParams();
```

In the JSX, immediately inside `<main ...>` and before the existing `<header ...>`, insert the delimited heartbeat block:

```tsx
      {/* === BEGIN CountyHeartbeat block (feature/landing-heartbeat) ===
          Do not refactor this block as part of map-redesign work — it is
          scoped to a single <CountyHeartbeat/> mount so the parallel
          agent's diff path stays clean. === */}
      <CountyHeartbeat now={nowOverride} />
      {/* === END CountyHeartbeat block === */}
```

After the change, the relevant excerpt of `LandingPage.tsx` should read:

```tsx
export function LandingPage() {
  const navigate = useNavigate();
  const parcels = useAllParcels();
  const nowOverride = useNowOverrideFromSearchParams();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      {/* === BEGIN CountyHeartbeat block (feature/landing-heartbeat) ===
          Do not refactor this block as part of map-redesign work — it is
          scoped to a single <CountyHeartbeat/> mount so the parallel
          agent's diff path stays clean. === */}
      <CountyHeartbeat now={nowOverride} />
      {/* === END CountyHeartbeat block === */}

      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        {/* ... existing header unchanged ... */}
```

- [ ] **Step 4: Run the landing-page tests — expect all green**

Run: `npm run test -- --run tests/landing-page.dom.test.tsx`
Expected: PASS. Existing 4 cases plus the 1 new case.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS. Previous baseline was 348 passed / 1 skipped; expected new total is ~378 passed / 1 skipped (exact number depends on how the test counts subtests). Zero failures.

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx tests/landing-page.dom.test.tsx
git commit -m "$(cat <<'EOF'
feat(landing): mount <CountyHeartbeat/> above the map section

Heartbeat lives in a clearly-delimited block as the first child of
<main>, above the existing <header>. Scoped so the parallel
map-redesign agent's diff path touches only code below it.

?now=<ISO-with-tz> parsed at the page level via
useNowOverrideFromSearchParams and threaded as the CountyHeartbeat
`now` prop. Fails closed to live clock.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Verification — tsc, tests, motion-grep, diff-check

No code changes in this task — purely the verification checklist from the spec.

- [ ] **Step 1: Run typecheck**

Run: `npx tsc -b`
Expected: zero errors.

If errors surface, fix them in the relevant file and re-run. Typical sources: `type JSX` missing from React 19 (use `import type { JSX } from "react"` if needed), `SparklineBar` not exported.

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: zero failures. Baseline was 348 passed / 1 skipped; new total should be higher. Note the exact count for the commit message in Task 6 step 4.

- [ ] **Step 3: Run the motion-grep hygiene check**

Run:

```bash
npm run test -- --run 2>/dev/null >/dev/null; \
  ( npx rg 'animate-|motion-|transition-' src/components/CountyHeartbeat.tsx || true ) \
  | npx rg -v 'transition-colors'
```

Expected: empty output.

Equivalent with PCRE2 (if available):

```bash
npx rg -P '(animate-|transition-(?!colors)|motion-)' src/components/CountyHeartbeat.tsx
```

Expected: empty output.

**Interpretation:** The heartbeat component may use `transition-colors duration-150` on interactive links (matches project-wide convention; universally exempt from `prefers-reduced-motion`). Any other `transition-*`, any `animate-*`, any `motion-*` is forbidden — the counter's 1Hz re-render is a state change, not an animation, and must remain so.

- [ ] **Step 4: Diff-check untouched files vs `b7f3311`**

Run:

```bash
git diff --stat b7f3311 -- \
  src/components/RootLayout.tsx \
  src/components/PipelineBanner.tsx \
  src/data/pipeline-state.json \
  src/data/activity-synthetic.json \
  src/router.tsx \
  src/main.tsx
```

Expected: empty output (no changes to any of these files).

Run also:

```bash
git diff --stat b7f3311 -- 'src/components/CountyMap*'
```

Expected: empty output.

- [ ] **Step 5: Confirm no new dependencies were added**

Run: `git diff b7f3311 -- package.json package-lock.json`
Expected: empty output (no dependency changes).

- [ ] **Step 6: If all five checks pass, commit a verification stamp (no file changes)**

If any of the above checks fail, stop and report — do not paper over a regression. If all pass:

```bash
git commit --allow-empty -m "$(cat <<'EOF'
chore(heartbeat): verification pass — tsc clean, tests green, motion hygiene clean, untouched files unchanged

- npx tsc -b: 0 errors
- npm run test: all cases pass
- motion grep (excluding transition-colors): empty
- diff vs b7f3311 for RootLayout, PipelineBanner, pipeline-state.json,
  activity-synthetic.json, router.tsx, main.tsx, CountyMap*: empty
- package.json / package-lock.json: unchanged (no new deps)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Manual verification in dev server + Preview MCP screenshots

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Leave it running. The default URL is `http://localhost:5173/`.

- [ ] **Step 2: Capture the six spec-mandated screenshots**

For each URL, use the Preview MCP tool to capture a screenshot at the specified viewport:

| # | URL | Viewport | Expected state |
|---|---|---|---|
| 1 | `http://localhost:5173/?now=2026-04-09T14:00:00-07:00` | 1280×720 | Full band: count `2,520`, 7 solid business-hour bars + 10 outline bars, desktop ribbon, "See pipeline →" visible, provenance caption with link |
| 2 | `http://localhost:5173/?now=2026-04-09T14:00:00-07:00` | 375×812 | Collapsed: count centered, mobile ribbon wrapped, no sparkline, no visible provenance caption, no "See pipeline →" |
| 3 | `http://localhost:5173/?now=2026-04-09T14:00:00-07:00` | 1280×720, focused on "See pipeline →" via Tab | Focus ring visible on the link |
| 4 | `http://localhost:5173/?now=2026-04-09T09:00:00-07:00` | 1280×720 | Morning: count `~720`, 2 solid + 15 outline bars |
| 5 | `http://localhost:5173/?now=2026-04-09T16:00:00-07:00` | 1280×720 | Late afternoon: count `~3,240`, 9 solid + 8 outline bars |
| 6 | `http://localhost:5173/?now=2026-04-09T22:00:00-07:00` | 1280×720 | Replayed late: count `~3,885`, 15 solid + 2 outline bars |

- [ ] **Step 3: Visually sanity-check three properties across the shots**

For each of the six shots, confirm by eye:

1. **Counter format** — the displayed number has the correct thousands separator comma (e.g., `2,520` not `2520` or `2.520`).
2. **Bar shape** — the 7 pre-dawn hours are truly blank (no rect visible); the 10 business-hour bars have equal height; the 7 trickle bars are visibly shorter; the baseline line spans the full sparkline width.
3. **Citation link** — hovering "per the Recorder's Office" in the provenance caption shows an underline + the external-link target in the browser status bar.

- [ ] **Step 4: Capture the exact "all tests passing" count and append a release-ready commit**

Run: `npm run test`
Note the final count (e.g., "362 passed, 1 skipped").

Commit the screenshots — put them in `docs/screenshots/heartbeat/` and reference them from a short `docs/screenshots/heartbeat/README.md` keyed to the table above. Commit:

```bash
git add docs/screenshots/heartbeat/
git commit -m "$(cat <<'EOF'
docs(heartbeat): add six Preview MCP screenshots for demo/QA

Canonical visual states for the CountyHeartbeat band:
1. Desktop afternoon (14:00) — hero shot
2. Mobile afternoon (14:00) — collapse state
3. Focus ring on "See pipeline →"
4. Morning (09:00) — early pacing
5. Late afternoon (16:00) — curve-tipping point
6. Late evening (22:00) — trickle nearly complete

Each URL includes ?now=<ISO> for deterministic rendering.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Stop the dev server and confirm final state**

Run:

```bash
git log --oneline b7f3311..HEAD
```

Expected: 7 commits on `feature/landing-heartbeat` ahead of `b7f3311`:

1. `docs(heartbeat): design spec + data-provenance registry`
2. `feat(heartbeat): pure-function model — count, curve, sparkline, guard`
3. `feat(heartbeat): add useNowOverrideFromSearchParams hook`
4. `feat(heartbeat): add CountyHeartbeat component + DOM tests`
5. `feat(landing): mount <CountyHeartbeat/> above the map section`
6. `chore(heartbeat): verification pass — tsc clean, tests green, motion hygiene clean, untouched files unchanged`
7. `docs(heartbeat): add six Preview MCP screenshots for demo/QA`

Report the final commit SHA and the test-count delta (e.g., "348 → 362, +14") to the sprint owner. Do **not** push, do **not** rebase onto main, do **not** open a PR — that is the merging human's call after the parallel map agent lands.

---

## Self-review checklist (to run before handing off the plan)

- [x] **Spec coverage** — every section of `2026-04-16-county-heartbeat-design.md` maps to a task:
  - Pure-function contracts (§Pure-function contracts) → Task 1
  - URL query hook (§Component Lifecycle subsection) → Task 2
  - Component + visual layout + a11y (§Visual design + §Accessibility policy) → Task 3
  - Landing mount (§Files > Modified) → Task 4
  - Verification checklist (§Verification checklist) → Task 5
  - Screenshots (§Preview MCP screenshots) → Task 6
- [x] **Placeholder scan** — no "TBD", "TODO", "fill in", or "similar to Task N" references. Every step has complete code or complete commands.
- [x] **Type consistency** — `SparklineBar` exported from `heartbeat-model.ts`, imported by `CountyHeartbeat.tsx`; `now?: number` on the component matches the `nowOverride` return type (`number | undefined`) of the hook.
- [x] **Risk-specific notes** — project uses `ReactElement` (not `JSX.Element`) per `TransactionWizard.tsx`; implementation matches. Motion-grep PCRE vs non-PCRE fallback documented. "See pipeline →" visibility class regex is deliberately loose; override instructions included.
