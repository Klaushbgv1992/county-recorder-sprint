import { describe, it, expect } from "vitest";
import {
  stampFeature,
  shrinkBboxTowardCentroid,
  enforceGzippedBudget,
  nextPage,
} from "../../scripts/lib/gilbert-fetch";

describe("stampFeature", () => {
  it("adds source, source_url, captured_date to feature.properties", () => {
    const f = { type: "Feature", properties: { APN_DASH: "304-78-386" }, geometry: null };
    const stamped = stampFeature(f, {
      source_url: "https://example/query?...",
      captured_date: "2026-04-16",
    });
    expect(stamped.properties.source).toBe("maricopa_assessor_public_gis");
    expect(stamped.properties.source_url).toBe("https://example/query?...");
    expect(stamped.properties.captured_date).toBe("2026-04-16");
    expect(stamped.properties.APN_DASH).toBe("304-78-386");
  });

  it("does not mutate the input feature", () => {
    const f = { type: "Feature" as const, properties: { APN: "1" }, geometry: null };
    stampFeature(f, { source_url: "u", captured_date: "d" });
    expect(f.properties).toEqual({ APN: "1" });
  });
});

describe("shrinkBboxTowardCentroid", () => {
  it("shrinks each side 25% toward the centroid", () => {
    const out = shrinkBboxTowardCentroid({
      xmin: -111.8, ymin: 33.2, xmax: -111.6, ymax: 33.3,
    });
    expect(out.xmin).toBeCloseTo(-111.775, 3);
    expect(out.xmax).toBeCloseTo(-111.625, 3);
    expect(out.ymin).toBeCloseTo(33.2125, 3);
    expect(out.ymax).toBeCloseTo(33.2875, 3);
  });
});

describe("enforceGzippedBudget", () => {
  it("returns ok when under 2MB", () => {
    const tiny = Buffer.from("{}");
    expect(() => enforceGzippedBudget(tiny, 2 * 1024 * 1024)).not.toThrow();
  });
  it("throws with a concrete retry bbox when over budget", () => {
    const big = Buffer.alloc(3 * 1024 * 1024, 0x20);
    expect(() =>
      enforceGzippedBudget(big, 2 * 1024 * 1024, {
        bbox: { xmin: -111.8, ymin: 33.2, xmax: -111.6, ymax: 33.3 },
      }),
    ).toThrow(/Suggested retry bbox/);
  });
});

describe("nextPage", () => {
  it("returns the next offset when exceededTransferLimit is true", () => {
    expect(nextPage({ exceededTransferLimit: true, count: 2000 }, 0)).toBe(2000);
    expect(nextPage({ exceededTransferLimit: true, count: 2000 }, 4000)).toBe(6000);
  });
  it("returns null to end pagination", () => {
    expect(nextPage({ exceededTransferLimit: false, count: 1234 }, 2000)).toBeNull();
  });
  it("returns null when exceededTransferLimit but count is 0 (pathological)", () => {
    expect(nextPage({ exceededTransferLimit: true, count: 0 }, 2000)).toBeNull();
  });
});
