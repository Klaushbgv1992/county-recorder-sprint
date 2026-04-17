import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SEED_COUNT } from "../src/data/gilbert-seed-count";

describe("gilbert-seed-count", () => {
  it("SEED_COUNT matches gilbert-parcels-geo.json feature count", () => {
    const geo = JSON.parse(readFileSync("src/data/gilbert-parcels-geo.json", "utf8"));
    const actualCount = (geo.features as unknown[]).length;
    expect(SEED_COUNT).toBe(actualCount);
  });

  it("SEED_COUNT is a positive integer", () => {
    expect(Number.isInteger(SEED_COUNT)).toBe(true);
    expect(SEED_COUNT).toBeGreaterThan(0);
  });
});
