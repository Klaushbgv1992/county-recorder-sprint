import { describe, it, expect } from "vitest";
import {
  stampFeature,
  shrinkBboxTowardCentroid,
  enforceGzippedBudget,
  nextPage,
  probeEndpoint,
  formatFailLoudMessage,
  chunkIds,
  hasAllRequiredApns,
  fetchObjectIds,
  fetchFeaturesByIdChunk,
  type Bbox,
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

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number }>;

describe("probeEndpoint", () => {
  it("returns first success with correct base URL", async () => {
    const fetch: FetchLike = async () => ({ ok: true, status: 200 });
    const r = await probeEndpoint(["https://a/", "https://b/"], fetch);
    expect(r).toEqual({ ok: true, base: "https://a/" });
  });

  it("falls through all N failures when every endpoint returns !ok", async () => {
    const fetch: FetchLike = async () => ({ ok: false, status: 404 });
    const r = await probeEndpoint(
      ["https://a/", "https://b/", "https://c/"],
      fetch,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.attempts).toHaveLength(3);
      expect(r.attempts.every((a) => a.error === "status 404")).toBe(true);
    }
  });

  it("catches fetch throws (DNS/network/CORS) and continues to next URL", async () => {
    const fetch: FetchLike = async (url) => {
      if (url.includes("a/")) throw new Error("DNS lookup failed");
      return { ok: true, status: 200 };
    };
    const r = await probeEndpoint(["https://a/", "https://b/"], fetch);
    expect(r).toEqual({ ok: true, base: "https://b/" });
  });

  it("records attempts in order across the fallback chain, preserving error source", async () => {
    const fetch: FetchLike = async (url) => {
      if (url.includes("a/")) return { ok: false, status: 404 };
      if (url.includes("b/")) throw new Error("network timeout");
      return { ok: false, status: 500 };
    };
    const r = await probeEndpoint(
      ["https://a/", "https://b/", "https://c/"],
      fetch,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.attempts.map((a) => a.url)).toEqual([
        "https://a/",
        "https://b/",
        "https://c/",
      ]);
      expect(r.attempts[0].error).toBe("status 404");
      expect(r.attempts[1].error).toBe("network timeout");
      expect(r.attempts[2].error).toBe("status 500");
    }
  });

  it("stops after first success (does not call subsequent URLs)", async () => {
    const calls: string[] = [];
    const fetch: FetchLike = async (url) => {
      calls.push(url);
      return { ok: true, status: 200 };
    };
    await probeEndpoint(
      ["https://a/", "https://b/", "https://c/"],
      fetch,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe("https://a/?f=json");
  });
});

describe("formatFailLoudMessage", () => {
  it("includes all N URLs in the output", () => {
    const msg = formatFailLoudMessage([
      "https://a/",
      "https://b/",
      "https://c/",
    ]);
    expect(msg).toContain("https://a/");
    expect(msg).toContain("https://b/");
    expect(msg).toContain("https://c/");
  });

  it("includes a runnable curl command for each URL", () => {
    const msg = formatFailLoudMessage(["https://a/", "https://b/"]);
    expect(msg).toMatch(/curl -sSf "https:\/\/a\/\?f=json"/);
    expect(msg).toMatch(/curl -sSf "https:\/\/b\/\?f=json"/);
  });

  it("produces stable, deterministic output (no timestamps or random fields)", () => {
    const urls = ["https://a/", "https://b/"];
    expect(formatFailLoudMessage(urls)).toBe(formatFailLoudMessage(urls));
  });
});

describe("chunkIds", () => {
  it("returns [] for empty array", () => {
    expect(chunkIds([], 100)).toEqual([]);
  });
  it("returns [[all]] when length === chunkSize", () => {
    expect(chunkIds([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });
  it("returns [[all]] when length < chunkSize", () => {
    expect(chunkIds([1, 2], 5)).toEqual([[1, 2]]);
  });
  it("splits into multiple chunks when length > chunkSize", () => {
    expect(chunkIds([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("exact multiple produces no trailing short chunk", () => {
    expect(chunkIds([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
  });
  it("flattening chunks preserves original order", () => {
    const ids = [10, 20, 30, 40, 50, 60, 70];
    expect(chunkIds(ids, 3).flat()).toEqual(ids);
  });
});

describe("hasAllRequiredApns", () => {
  const feat = (apn: string) => ({ properties: { APN_DASH: apn } });

  it("returns ok when all required APNs are present", () => {
    const features = [feat("304-78-386"), feat("304-77-689"), feat("999-99-999")];
    expect(hasAllRequiredApns(features, ["304-78-386", "304-77-689"])).toEqual({ ok: true });
  });

  it("returns missing APNs when some are absent", () => {
    const features = [feat("304-78-386"), feat("999-99-999")];
    const r = hasAllRequiredApns(features, ["304-78-386", "304-77-689", "304-78-409"]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing).toEqual(["304-77-689", "304-78-409"]);
    }
  });

  it("handles empty feature set", () => {
    const r = hasAllRequiredApns([], ["304-78-386"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["304-78-386"]);
  });

  it("handles features with missing APN_DASH property", () => {
    const features = [{ properties: { OTHER: "val" } }];
    const r = hasAllRequiredApns(features, ["304-78-386"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["304-78-386"]);
  });
});

describe("fetchObjectIds", () => {
  const bbox: Bbox = { xmin: -112, ymin: 33, xmax: -111, ymax: 34 };

  function mockResponse(body: unknown, ok = true, status = 200): Response {
    return { ok, status, json: async () => body } as unknown as Response;
  }

  it("returns sorted objectIds from a normal response", async () => {
    const doFetch = async () => mockResponse({ objectIds: [300, 100, 200] });
    const ids = await fetchObjectIds("https://gis/", "/0", bbox, doFetch);
    expect(ids).toEqual([100, 200, 300]);
  });

  it("throws on non-ok response", async () => {
    const doFetch = async () => mockResponse(null, false, 500);
    await expect(fetchObjectIds("https://gis/", "/0", bbox, doFetch)).rejects.toThrow(/failed: 500/);
  });

  it("throws when response has no objectIds array", async () => {
    const doFetch = async () => mockResponse({ error: "no layer" });
    await expect(fetchObjectIds("https://gis/", "/0", bbox, doFetch)).rejects.toThrow(/no objectIds array/);
  });

  it("returns empty array when objectIds is []", async () => {
    const doFetch = async () => mockResponse({ objectIds: [] });
    const ids = await fetchObjectIds("https://gis/", "/0", bbox, doFetch);
    expect(ids).toEqual([]);
  });
});

describe("fetchFeaturesByIdChunk", () => {
  function mockResponse(body: unknown, ok = true, status = 200): Response {
    return { ok, status, json: async () => body } as unknown as Response;
  }

  it("returns features from a normal response", async () => {
    const doFetch = async () => mockResponse({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { APN: "1" }, geometry: null }],
    });
    const feats = await fetchFeaturesByIdChunk("https://gis/", "/0", [100], "APN", doFetch);
    expect(feats).toHaveLength(1);
  });

  it("throws on non-ok response", async () => {
    const doFetch = async () => mockResponse(null, false, 404);
    await expect(fetchFeaturesByIdChunk("https://gis/", "/0", [1], "APN", doFetch)).rejects.toThrow(/failed: 404/);
  });

  it("throws when response features exceed requested IDs (unexpected expansion)", async () => {
    const doFetch = async () => mockResponse({
      features: [{ properties: {} }, { properties: {} }, { properties: {} }],
    });
    await expect(fetchFeaturesByIdChunk("https://gis/", "/0", [1, 2], "APN", doFetch))
      .rejects.toThrow(/unexpected expansion/);
  });

  it("accepts fewer features than IDs (some IDs may be invalid)", async () => {
    const doFetch = async () => mockResponse({
      features: [{ properties: { APN: "1" } }],
    });
    const feats = await fetchFeaturesByIdChunk("https://gis/", "/0", [100, 200], "APN", doFetch);
    expect(feats).toHaveLength(1);
  });
});
