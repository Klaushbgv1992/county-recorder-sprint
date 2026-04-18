import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  queryIndex,
  getShowpieceShape,
  getSweepForParcel,
  getCaptureMetadata,
  getDeadEnds,
  __resetEngineCacheForTests,
} from "./custodian-query-engine";

beforeEach(() => {
  __resetEngineCacheForTests();
});

describe("custodian-query-engine", () => {
  describe("getShowpieceShape", () => {
    it("returns 5 parties, 2 live indexes, 3 dead-ends", () => {
      const shape = getShowpieceShape();
      expect(shape.parties).toHaveLength(5);
      expect(shape.liveIndexes).toHaveLength(2);
      expect(shape.deadEnds).toHaveLength(3);
      expect(shape.liveIndexes.map((i) => i.id).sort()).toEqual(["mcr-name", "mcsc-civil"]);
      expect(shape.deadEnds.map((d) => d.id).sort()).toEqual(["az-dor-liens", "irs-nftl", "usbc-az"]);
    });
  });

  describe("queryIndex", () => {
    it("resolves for a known (party, liveIndex, approach) tuple", async () => {
      const result = await queryIndex("CHRISTOPHER POPHAM", "mcr-name", "county-internal");
      expect(result.status).toMatch(/zero|hit|blocked|no_capture_available/);
    });

    it("returns BRIAN J MADISON mcsc-civil county-internal as hit or verified zero", async () => {
      // Fixture may contain either a real collision hit (probable_false_positive)
      // or a verified-zero (Phase C fallback per spec §5.2). Both are valid
      // fixture states depending on what the capture session produced.
      const result = await queryIndex("BRIAN J MADISON", "mcsc-civil", "county-internal");
      expect(["hit", "zero"]).toContain(result.status);
      if (result.status === "hit") {
        expect(result.hits.length).toBeGreaterThanOrEqual(1);
        expect(result.hits[0].ai_judgment).toBe("probable_false_positive");
      }
    });

    it("public-api approach cells are blocked", async () => {
      const result = await queryIndex("CHRISTOPHER POPHAM", "mcr-name", "public-api");
      expect(result.status).toBe("blocked");
    });

    it("throws for an unknown party", async () => {
      await expect(
        queryIndex("UNKNOWN PERSON", "mcr-name", "county-internal")
      ).rejects.toThrow(/unknown party/);
    });

    it("applies simulated latency of at least 150 ms", async () => {
      vi.useFakeTimers();
      const promise = queryIndex("CHRISTOPHER POPHAM", "mcr-name", "county-internal");
      // Advance by less than minimum; promise should not have resolved.
      await vi.advanceTimersByTimeAsync(100);
      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);
      // Advance past the max; it must resolve.
      await vi.advanceTimersByTimeAsync(250);
      await expect(promise).resolves.toBeDefined();
      vi.useRealTimers();
    });
  });

  describe("getSweepForParcel", () => {
    it("returns status=swept for POPHAM", async () => {
      const sweep = await getSweepForParcel("304-78-386");
      expect(sweep).not.toBeNull();
      expect(sweep!.status).toBe("swept");
      if (sweep && sweep.status === "swept") {
        expect(sweep.parties).toHaveLength(5);
        expect(sweep.summary.parties_scanned).toBe(5);
      }
    });

    it("returns status=no_capture_available for HOGUE", async () => {
      const sweep = await getSweepForParcel("304-77-689");
      expect(sweep).not.toBeNull();
      expect(sweep!.status).toBe("no_capture_available");
      if (sweep && sweep.status === "no_capture_available") {
        expect(sweep.reason).toMatch(/public API/i);
        expect(sweep.what_production_would_do).toMatch(/internal/i);
      }
    });

    it("returns null for an APN with no fixture entry", async () => {
      const sweep = await getSweepForParcel("999-99-999");
      expect(sweep).toBeNull();
    });
  });

  describe("getCaptureMetadata", () => {
    it("exposes the fixture-level timestamp and notes", () => {
      const meta = getCaptureMetadata();
      expect(meta.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof meta.capture_duration_ms).toBe("number");
    });
  });

  describe("getDeadEnds", () => {
    it("lists 3 dead-end indexes with reasons", () => {
      const deadEnds = getDeadEnds();
      expect(deadEnds).toHaveLength(3);
      expect(deadEnds.every((d) => d.reason.length > 0)).toBe(true);
    });
  });
});
