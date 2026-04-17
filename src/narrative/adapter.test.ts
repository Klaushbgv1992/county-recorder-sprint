import { describe, it, expect } from "vitest";
import { loadCachedNeighborInstruments } from "./adapter";

describe("loadCachedNeighborInstruments", () => {
  it("returns normalized instruments for a known cached APN", () => {
    const instruments = loadCachedNeighborInstruments("304-78-406");
    expect(instruments.length).toBeGreaterThan(0);
    for (const inst of instruments) {
      expect(inst.instrument_number).toMatch(/^\d{11}$/);
      expect(inst.recording_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(inst.parties).toEqual([]);
      expect(inst.raw_api_response.names.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for an unknown APN", () => {
    expect(loadCachedNeighborInstruments("999-99-999")).toEqual([]);
  });

  it("normalizes MM-DD-YYYY recording date to YYYY-MM-DD", () => {
    const instruments = loadCachedNeighborInstruments("304-78-406");
    for (const inst of instruments) {
      const [y, m, d] = inst.recording_date.split("-");
      expect(Number(y)).toBeGreaterThan(2000);
      expect(Number(m)).toBeGreaterThanOrEqual(1);
      expect(Number(m)).toBeLessThanOrEqual(12);
      expect(Number(d)).toBeGreaterThanOrEqual(1);
      expect(Number(d)).toBeLessThanOrEqual(31);
    }
  });
});
