import { describe, it, expect } from "vitest";
import state from "../src/data/pipeline-state.json";
import {
  currentFreshness,
  laggingVsPlant,
  overSLAStages,
  type PipelineState,
} from "../src/logic/pipeline-selectors";

const fixture = state as unknown as PipelineState;

// Most tests below read from the shipped fixture. When the fixture dates are
// refreshed (e.g. rolling the demo forward a day), the expected values below
// need to roll with them. The "fixture health invariant" describe block at
// the bottom is the contract that shouldn't change.

describe("currentFreshness", () => {
  it("returns index, ocr, and curator verified-through dates from current.stages", () => {
    const f = currentFreshness(fixture);
    expect(f.index).toBe("2026-04-16");
    expect(f.ocr).toBe("2026-04-15");
    expect(f.curator).toBe("2026-04-12");
  });
});

describe("laggingVsPlant", () => {
  it("returns days ahead of the minimum typical plant lag for the reference date", () => {
    // At ref 2026-04-17, index_vt 2026-04-16 is 1 day behind; plantMin(14) - 1 = 13
    const result = laggingVsPlant(fixture, { referenceDate: "2026-04-17" });
    expect(result.days_ahead_of_min_plant_lag).toBe(13);
  });

  it("defaults the reference date to state.current.as_of when not provided", () => {
    // as_of 2026-04-16, index_vt 2026-04-16 → 0 days behind → 14 ahead of plant min
    const result = laggingVsPlant(fixture);
    expect(result.days_ahead_of_min_plant_lag).toBe(14);
  });
});

describe("overSLAStages", () => {
  it("includes stages with days_behind > sla_days for the reference date", () => {
    // At ref 2026-04-30, every stage is far behind its SLA.
    const stages = overSLAStages(fixture, { referenceDate: "2026-04-30" });
    const ids = stages.map((s) => s.stage_id);
    expect(ids).toContain("curator");
    expect(ids).toContain("index");
  });

  it("excludes stages whose verified-through is within SLA of the reference date", () => {
    // Reference date 2026-04-17 — index is exactly at SLA (1 day behind, SLA 1;
    // not strictly greater), image is 2d behind SLA 1 and IS over, everything
    // else still within SLA. Asserts the boundary is correctly exclusive.
    const stages = overSLAStages(fixture, { referenceDate: "2026-04-17" });
    const ids = stages.map((s) => s.stage_id);
    expect(ids).not.toContain("index");
    expect(ids).not.toContain("curator");
    expect(ids).toContain("image");
  });
});

describe("pipeline fixture health invariant", () => {
  // Regression guard: the shipped fixture must represent a healthy pipeline
  // as of its own as_of timestamp. Previously the fixture seeded every
  // stage with a uniform 4-day overshoot vs its SLA, which rendered every
  // stage card with an amber "Over SLA (4d behind)" badge while the banner
  // simultaneously claimed the pipeline was days ahead of title plants —
  // two incompatible narrative claims on the same page. See findings
  // report 2026-04-16 for the full root-cause trace.
  it("no stage is over SLA as of the fixture's own as_of", () => {
    const stages = overSLAStages(fixture);
    expect(stages.map((s) => s.stage_id)).toEqual([]);
  });

  it("laggingVsPlant returns a positive days_ahead_of_min_plant_lag", () => {
    const result = laggingVsPlant(fixture);
    expect(result.days_ahead_of_min_plant_lag).toBeGreaterThan(0);
  });
});
