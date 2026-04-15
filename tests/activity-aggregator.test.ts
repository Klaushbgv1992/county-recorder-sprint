import { describe, it, expect } from "vitest";
import { aggregateActivity } from "../src/logic/activity-aggregator";

const fixture = {
  records: [
    { date: "2026-04-01", municipality: "Gilbert", doc_code: "WAR DEED", count: 40 },
    { date: "2026-04-01", municipality: "Gilbert", doc_code: "DEED TRST", count: 50 },
    { date: "2026-04-02", municipality: "Gilbert", doc_code: "WAR DEED", count: 30 },
    { date: "2026-04-01", municipality: "Phoenix", doc_code: "WAR DEED", count: 150 },
  ],
};

describe("aggregateActivity", () => {
  it("sums counts by municipality within window", () => {
    const out = aggregateActivity(fixture.records, { groupBy: "municipality" });
    expect(out).toEqual([
      { key: "Phoenix", total: 150 },
      { key: "Gilbert", total: 120 },
    ]);
  });

  it("sums counts by date within window, sorted ascending", () => {
    const out = aggregateActivity(fixture.records, { groupBy: "date" });
    expect(out).toEqual([
      { key: "2026-04-01", total: 240 },
      { key: "2026-04-02", total: 30 },
    ]);
  });

  it("respects windowDays filter", () => {
    const out = aggregateActivity(fixture.records, {
      groupBy: "date",
      windowDays: 1,
      referenceDate: "2026-04-02",
    });
    expect(out).toEqual([{ key: "2026-04-02", total: 30 }]);
  });
});
