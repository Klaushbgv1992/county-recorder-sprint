// scripts/lib/gilbert-fetch.ts
// Pure helpers for the Gilbert parcel fetch. No network, no fs.

export type Bbox = { xmin: number; ymin: number; xmax: number; ymax: number };

export type StampOpts = { source_url: string; captured_date: string };

type Feature = {
  type: "Feature";
  properties: Record<string, unknown> & {
    source?: string;
    source_url?: string;
    captured_date?: string;
  };
  geometry: unknown;
};

export function stampFeature(f: Feature, opts: StampOpts): Feature {
  return {
    ...f,
    properties: {
      ...f.properties,
      source: "maricopa_assessor_public_gis",
      source_url: opts.source_url,
      captured_date: opts.captured_date,
    },
  };
}

export function shrinkBboxTowardCentroid(b: Bbox, factor = 0.25): Bbox {
  const cx = (b.xmin + b.xmax) / 2;
  const cy = (b.ymin + b.ymax) / 2;
  return {
    xmin: b.xmin + (cx - b.xmin) * factor,
    ymin: b.ymin + (cy - b.ymin) * factor,
    xmax: b.xmax - (b.xmax - cx) * factor,
    ymax: b.ymax - (b.ymax - cy) * factor,
  };
}

export function enforceGzippedBudget(
  gzBuf: Buffer,
  maxBytes: number,
  hint?: { bbox: Bbox },
): void {
  if (gzBuf.byteLength <= maxBytes) return;
  const suggestion = hint
    ? (() => {
        const s = shrinkBboxTowardCentroid(hint.bbox);
        return `\nSuggested retry bbox: xmin=${s.xmin.toFixed(4)},ymin=${s.ymin.toFixed(4)},xmax=${s.xmax.toFixed(4)},ymax=${s.ymax.toFixed(4)}`;
      })()
    : "";
  throw new Error(
    `gzipped output ${gzBuf.byteLength} bytes exceeds budget ${maxBytes}.${suggestion}`,
  );
}

export function nextPage(
  page: { exceededTransferLimit?: boolean; count?: number },
  prevOffset: number,
): number | null {
  if (!page.exceededTransferLimit) return null;
  const n = page.count ?? 0;
  if (n <= 0) return null; // pathological: server claims more but delivered none
  return prevOffset + n;
}

// Endpoint probe: try each URL in order, return first that fetches ok.
// Injectable fetch for testability. Network errors (rejections) are caught
// and recorded; HTTP errors (response.ok === false) are recorded too.

export type ProbeResult =
  | { ok: true; base: string }
  | { ok: false; attempts: Array<{ url: string; error: string }> };

export type ProbeFetch = (url: string) => Promise<{ ok: boolean; status: number }>;

export async function probeEndpoint(
  urls: readonly string[],
  doFetch: ProbeFetch,
): Promise<ProbeResult> {
  const attempts: Array<{ url: string; error: string }> = [];
  for (const base of urls) {
    const probeUrl = `${base}?f=json`;
    try {
      const r = await doFetch(probeUrl);
      if (r.ok) return { ok: true, base };
      attempts.push({ url: base, error: `status ${r.status}` });
    } catch (e) {
      attempts.push({ url: base, error: (e as Error).message });
    }
  }
  return { ok: false, attempts };
}

// Pure formatter for the "all probes failed" error output. The shell prints
// this to stderr and exits non-zero.
export function formatFailLoudMessage(urls: readonly string[]): string {
  const lines = ["ERROR: all probe URLs failed. Try one of these by hand:"];
  for (const u of urls) {
    lines.push(`  curl -sSf "${u}?f=json" | head -c 400`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// OBJECTID-based pagination helpers + post-fetch integrity assertion
// ---------------------------------------------------------------------------

// A richer fetch type needed for helpers that call .json() on the response.
// probeEndpoint keeps its narrow ProbeFetch contract.
export type RichFetch = (url: string) => Promise<Response>;

// Report type returned by hasAllRequiredApns.
export type MissingApnsReport =
  | { ok: true }
  | { ok: false; missing: string[] };

// Pure array chunker. No I/O.
export function chunkIds(ids: number[], chunkSize: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    out.push(ids.slice(i, i + chunkSize));
  }
  return out;
}

// Post-fetch integrity check. Returns a report object. No I/O.
export function hasAllRequiredApns(
  features: Array<{ properties: Record<string, unknown> }>,
  requiredApns: readonly string[],
): MissingApnsReport {
  const present = new Set(
    features.map((f) => f.properties.APN_DASH as string).filter(Boolean),
  );
  const missing = requiredApns.filter((apn) => !present.has(apn));
  if (missing.length === 0) return { ok: true };
  return { ok: false, missing };
}

// Async, injectable fetch. Queries returnIdsOnly=true to get the full OBJECTID
// list for a bbox.
export async function fetchObjectIds(
  baseUrl: string,
  layerPath: string,
  bbox: Bbox,
  doFetch: RichFetch,
): Promise<number[]> {
  const params = new URLSearchParams({
    where: "1=1",
    geometryType: "esriGeometryEnvelope",
    geometry: `${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}`,
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnIdsOnly: "true",
    f: "json",
  });
  const url = `${baseUrl}${layerPath}/query?${params}`;
  const r = await doFetch(url);
  if (!r.ok) throw new Error(`fetchObjectIds failed: ${r.status} ${url}`);
  const body = await r.json();
  const ids: unknown = body.objectIds;
  if (!Array.isArray(ids)) {
    throw new Error(`fetchObjectIds: no objectIds array in response from ${url}`);
  }
  return (ids as number[]).sort((a, b) => a - b);
}

// Async, injectable fetch. Fetches features for a specific set of OBJECTIDs.
export async function fetchFeaturesByIdChunk(
  baseUrl: string,
  layerPath: string,
  ids: number[],
  outFields: string,
  doFetch: RichFetch,
): Promise<unknown[]> {
  const params = new URLSearchParams({
    where: `OBJECTID IN (${ids.join(",")})`,
    outFields,
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    geometryPrecision: "6",
  });
  const url = `${baseUrl}${layerPath}/query?${params}`;
  const r = await doFetch(url);
  if (!r.ok) throw new Error(`fetchFeaturesByIdChunk failed: ${r.status} ${url}`);
  const body = await r.json();
  const features = body.features;
  if (!Array.isArray(features)) {
    throw new Error(`fetchFeaturesByIdChunk: no features array in response from ${url}`);
  }
  if (features.length > ids.length) {
    throw new Error(
      `fetchFeaturesByIdChunk: response has ${features.length} features for ${ids.length} requested IDs — unexpected expansion`,
    );
  }
  return features;
}
