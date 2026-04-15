import { describe, it, expect } from "vitest";
import state from "../src/data/pipeline-state.json";
import {
  currentFreshness,
  laggingVsPlant,
  overSLAStages,
  type PipelineState,
} from "../src/logic/pipeline-selectors";

const fixture = state as unknown as PipelineState;

describe("currentFreshness", () => {
  it("returns index, ocr, and curator verified-through dates from current.stages", () => {
    const f = currentFreshness(fixture);
    expect(f.index).toBe("2026-04-09");
    expect(f.ocr).toBe("2026-04-08");
    expect(f.curator).toBe("2026-04-05");
  });
});

describe("laggingVsPlant", () => {
  it("returns days ahead of the minimum typical plant lag for the reference date", () => {
    const result = laggingVsPlant(fixture, { referenceDate: "2026-04-14" });
    expect(result.days_ahead_of_min_plant_lag).toBe(9);
  });

  it("defaults the reference date to state.current.as_of when not provided", () => {
    const result = laggingVsPlant(fixture);
    expect(result.days_ahead_of_min_plant_lag).toBe(9);
  });
});

describe("overSLAStages", () => {
  it("includes curator when the reference date is 9 days past the curator verified-through", () => {
    const stages = overSLAStages(fixture, { referenceDate: "2026-04-14" });
    const ids = stages.map((s) => s.stage_id);
    expect(ids).toContain("curator");
  });

  it("excludes stages whose verified-through is within SLA of the reference date", () => {
    // Reference date 2026-04-09 — only curator (4 days behind, SLA 5) is
    // within SLA; index/image/ocr/entity_resolution are all at or over.
    const stages = overSLAStages(fixture, { referenceDate: "2026-04-09" });
    const ids = stages.map((s) => s.stage_id);
    expect(ids).not.toContain("curator");
  });
});
