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
