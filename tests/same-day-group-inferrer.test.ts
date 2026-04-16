import { describe, it, expect } from "vitest";
import { inferSameDayGroups } from "../src/logic/same-day-group-inferrer";

describe("inferSameDayGroups", () => {
  it("groups two same-day instruments with overlapping names under one group_id", () => {
    const input = [
      { instrument_number: "20210075857", recording_date: "2021-01-22", names: ["POPHAM CHRISTOPHER"] },
      { instrument_number: "20210075858", recording_date: "2021-01-22", names: ["POPHAM CHRISTOPHER", "VIP MORTGAGE"] },
    ];
    const grouped = inferSameDayGroups(input);
    expect(grouped[0].same_day_group_id).toBe(grouped[1].same_day_group_id);
    expect(grouped[0].same_day_group_id).toBeDefined();
    expect(grouped[0].same_day_group_id).not.toBeNull();
  });

  it("does not group same-day instruments with no name overlap", () => {
    const input = [
      { instrument_number: "A", recording_date: "2021-01-22", names: ["ALICE"] },
      { instrument_number: "B", recording_date: "2021-01-22", names: ["BOB"] },
    ];
    const grouped = inferSameDayGroups(input);
    expect(grouped[0].same_day_group_id).toBeNull();
    expect(grouped[1].same_day_group_id).toBeNull();
  });

  it("leaves single-instrument days with null group_id", () => {
    const input = [{ instrument_number: "X", recording_date: "2020-01-01", names: ["X"] }];
    const grouped = inferSameDayGroups(input);
    expect(grouped[0].same_day_group_id).toBeNull();
  });
});
