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
