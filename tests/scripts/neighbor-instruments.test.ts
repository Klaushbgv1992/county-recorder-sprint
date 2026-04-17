import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { NEIGHBOR_INSTRUMENTS } from "../../scripts/lib/neighbor-instruments";

const APN_RE = /^\d{3}-\d{2}-\d{3}[A-Z]?$/;
const INSTR_RE = /^\d{11}$/;

describe("NEIGHBOR_INSTRUMENTS", () => {
  it("rule 1: exactly 5 APNs", () => {
    expect(Object.keys(NEIGHBOR_INSTRUMENTS)).toHaveLength(5);
  });

  it("rule 2: APN format NNN-NN-NNN[X]", () => {
    for (const apn of Object.keys(NEIGHBOR_INSTRUMENTS)) {
      expect(apn, `APN "${apn}"`).toMatch(APN_RE);
    }
  });

  it("rule 3: each APN maps to 2 or 3 11-digit recording numbers", () => {
    for (const [apn, ns] of Object.entries(NEIGHBOR_INSTRUMENTS)) {
      expect(ns.length, `APN ${apn} has ${ns.length} instruments`).toBeGreaterThanOrEqual(2);
      expect(ns.length, `APN ${apn} has ${ns.length} instruments`).toBeLessThanOrEqual(3);
      for (const n of ns) expect(n, `APN ${apn} recording ${n}`).toMatch(INSTR_RE);
    }
  });

  it("rule 4: no recording number appears under two APNs", () => {
    const flat = Object.values(NEIGHBOR_INSTRUMENTS).flat();
    expect(new Set(flat).size).toBe(flat.length);
  });

  it("rule 5: no recording number later than corpus boundary 2026-04-09", () => {
    for (const ns of Object.values(NEIGHBOR_INSTRUMENTS)) {
      for (const n of ns) {
        const year = parseInt(n.slice(0, 4), 10);
        expect(year, `recording ${n}`).toBeLessThanOrEqual(2026);
      }
    }
  });

  it("rule 6 (orphan guard): every APN appears in gilbert-parcels-geo.json", () => {
    const seed = JSON.parse(readFileSync("src/data/gilbert-parcels-geo.json", "utf8"));
    const seeded = new Set(
      (seed.features as Array<{ properties: { APN_DASH?: string } }>)
        .map((f) => f.properties.APN_DASH)
        .filter(Boolean),
    );
    for (const apn of Object.keys(NEIGHBOR_INSTRUMENTS)) {
      expect(seeded.has(apn), `APN ${apn} must exist in the Gilbert seed`).toBe(true);
    }
  });
});
