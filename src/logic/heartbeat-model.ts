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
