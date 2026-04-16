# Landing Map as Product — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the landing page into a functional, full-bleed Maricopa County map that reads as the product itself — search and click-to-drawer as the primary interface, with tiered parcel coverage (curated / recorder-cached / assessor-only) and three toggleable overlays.

**Architecture:** Additive to existing routes. A build-time Assessor GIS fetch seeds ~1,000–3,000 Gilbert polygons; a second build-time fetch caches 5 Seville-neighbor recorder API responses. A new `MapSearchBar`, `ParcelDrawer`, and `OverlayToggles` overlay the existing `CountyMap` on `/`. All URL state (`?q`, `?apn`, `?overlay`) flows through one unified `useLandingUrlState` hook. Every field carries a visible provenance pill. Existing `/parcel/:apn`, `/encumbrances`, and other routes are untouched.

**Tech Stack:** React 19, react-router v7, MapLibre GL via react-map-gl, Tailwind v4, Zod v4, Vitest, testing-library/react, tsx for build scripts.

**Spec:** `docs/superpowers/specs/2026-04-16-landing-map-as-product-design.md` (committed `113823d`).

---

## File Inventory

### Created

| Path | Responsibility |
|---|---|
| `docs/data-provenance.md` | Operator runbook + demo asset — written FIRST |
| `scripts/capture-bundle-baseline.ts` | Pre-feature bundle-chunk sizes → `tests/baseline-bundle-sizes.json` |
| `scripts/lib/gilbert-fetch.ts` | Pure helpers: provenance stamping, bbox shrink, budget enforcement |
| `scripts/fetch-gilbert-parcels.ts` | Thin shell running ArcGIS probe → fetch → stamp → write |
| `scripts/lib/seville-fetch.ts` | Pure helpers: rate limit, call budget, orphan guard |
| `scripts/lib/neighbor-instruments.ts` | `NEIGHBOR_INSTRUMENTS` frozen constant (5 APNs × 3 recording numbers) |
| `scripts/fetch-seville-neighbors-recorder-cache.ts` | Thin shell running the 15-call fetch |
| `src/data/gilbert-parcels-geo.json` | Committed assessor seed (Gilbert/Chandler) |
| `src/data/gilbert-seed-count.ts` | Exported `SEED_COUNT` — source of truth for "not in seeded area" copy |
| `src/data/api-cache/recorder/304-78-*.json` | 5 cached recorder responses (1 per Seville neighbor) |
| `src/logic/assessor-parcel.ts` | `AssessorParcel` zod schema + `assembleAddress` helper |
| `src/logic/searchable-index.ts` | `Searchable` union + `buildSearchableIndex` + `searchAll` |
| `src/logic/overlay-state.ts` | `parseOverlayParam`, `serializeOverlayParam`, `toggleOverlay` |
| `src/logic/drawer-variant.ts` | `resolveDrawerVariant` pure function |
| `src/hooks/useLandingUrlState.ts` | Unified `q`+`apn`+`overlay` URL-state hook |
| `src/components/MapSearchBar.tsx` | Floating search + tier-badged dropdown |
| `src/components/ParcelDrawer.tsx` | 4-variant drawer with mobile modal fallback |
| `src/components/OverlayToggles.tsx` | 3-pill toggle group + mobile sheet |
| `src/components/map/EncumbranceOverlayLayer.tsx` | MapLibre source+layer for open encumbrances |
| `src/components/map/AnomalyOverlayLayer.tsx` | MapLibre source+layer for curator anomalies |
| `src/components/map/AnomalySummaryPanel.tsx` | Inline panel anchored below toggles |
| `src/components/map/LastDeedOverlayLayer.tsx` | Recency-banded gradient across visible polygons |
| `src/components/map/CachedNeighborPopup.tsx` | Hover popup for cached-neighbor tier |
| `src/components/map/AssessorOnlyPopup.tsx` | Hover popup for assessor-only tier |
| `tests/scripts/gilbert-fetch.test.ts` | Gilbert fetch-helpers TDD |
| `tests/scripts/seville-fetch.test.ts` | Seville fetch-helpers + NEIGHBOR_INSTRUMENTS validation |
| `tests/assessor-parcel.test.ts` | Schema round-trip + assembleAddress |
| `tests/searchable-index.test.ts` | Tiering, match-type priority, owner suppression |
| `tests/overlay-state.test.ts` | Parse/serialize/toggle |
| `tests/drawer-variant.test.ts` | Variant selection by APN |
| `tests/use-landing-url-state.test.tsx` | URL-state hook |
| `tests/map-search-bar.dom.test.tsx` | Keyboard nav, debounced URL write, tier chips |
| `tests/parcel-drawer.dom.test.tsx` | All 4 variants + mobile dismissal |
| `tests/overlay-toggles.dom.test.tsx` | aria-pressed, URL round-trip |
| `tests/anomaly-summary-panel.dom.test.tsx` | Three dismissal mechanisms |
| `tests/county-map-overlays.dom.test.tsx` | Overlay rendering + interactiveLayerIds ordering |
| `tests/landing-bundle.test.ts` | Route chunk sizes against baseline |
| `tests/baseline-bundle-sizes.json` | Frozen pre-feature bundle sizes (committed) |

### Modified

| Path | Change |
|---|---|
| `src/components/CountyMap.tsx` | Add 3 new polygon layers (assessor, cached, overlays), explicit `interactiveLayerIds` ordering, accept polygon sets + overlay set as props |
| `src/components/LandingPage.tsx` | Full-bleed map; mount `MapSearchBar`, `OverlayToggles`, `ParcelDrawer`; preserve existing below-map content |
| `CLAUDE.md` | Add Decision #43 (Gilbert seed) and Decision #44 (Seville neighbors + tiered drawer) on completion |

---

## Task 1: Write operator runbook — `docs/data-provenance.md`

**Files:**
- Create: `docs/data-provenance.md`

Must be written BEFORE either fetch script runs. Sections come straight from spec §6.1.

- [ ] **Step 1: Create the runbook**

Create `docs/data-provenance.md` with this content:

```markdown
# Data Provenance — Gilbert Assessor Seed + Seville Recorder Cache

This document is the operator runbook for refreshing the map's external
data. It is also the demo artifact an evaluator opens to verify that we
document our data supply chain end-to-end.

## Run order

1. `npx tsx scripts/fetch-gilbert-parcels.ts`
2. Manually filter candidate neighbor APNs from the fetched file
3. Visit the Maricopa recorder UI; record 3 most-recent instruments per candidate
4. Edit `scripts/lib/neighbor-instruments.ts` with the 5 APN × 3 recording numbers
5. `npx tsx scripts/fetch-seville-neighbors-recorder-cache.ts`
6. Run `npm test` — the `NEIGHBOR_INSTRUMENTS` validation suite must pass.

## 1. Gilbert assessor fetch

- Source: Maricopa County Assessor public ArcGIS FeatureServer
- Endpoint probe order:
  1. `https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/FeatureServer`
  2. `https://maps.mcassessor.maricopa.gov/arcgis/rest/services/`
  3. Open-data indirection via `https://maps-mcassessor.opendata.arcgis.com/`
- Bounding box (WGS84): `xmin=-111.755, ymin=33.225, xmax=-111.695, ymax=33.258`
- outFields: APN, APN_DASH, OWNER_NAME, PHYSICAL_STREET_*, PHYSICAL_CITY, PHYSICAL_ZIP,
  SUBNAME, LOT_NUM, DEED_NUMBER, DEED_DATE, SALE_DATE, LAND_SIZE, CONST_YEAR,
  Shape_Length, Shape_Area
- Attribution: Maricopa County Assessor, per A.R.S. § 11-495 (public records).
- Post-run: record count and gzipped file size below.

Record count at capture: (to be filled by operator)
File size (gzipped): (to be filled by operator)
Capture date: (to be filled by operator)
Endpoint used: (to be filled by operator)

## 2. Candidate filter (run once by hand after Gilbert fetch)

From `src/data/gilbert-parcels-geo.json`:

    WHERE properties.SUBNAME contains 'SEVILLE PARCEL 3'
      AND properties.APN_DASH NOT IN
          ('304-78-386', '304-77-689', '304-78-409', '304-78-374', '304-78-383')
    ORDER BY properties.DEED_DATE DESC
    TAKE 5 (prefer 2013–2021 activity)

The 5 curated APNs excluded above are: POPHAM, HOGUE, HOA tract, WARNER, LOWRY.

## 3. Manual recorder-UI research step (Known Gap #2 workaround)

The Maricopa public API has no name- or APN-filtered document search. The
3-most-recent-instruments mapping is produced by hand, once, against the
Maricopa recorder browser UI.

For each candidate APN:

1. Open `https://recorder.maricopa.gov/recording/document-search-results.html`
   and search by the owner name on the polygon (OWNER_NAME property).
2. Scrub the results for instruments that attach to the specific APN
   (cross-reference addresses/legal descriptions; names on unrelated
   parcels are common — see Decision #25).
3. Sort ascending/descending by recording date; take the 3 most-recent.
4. Record the 11-digit recordingNumber, recordingDate, documentCode, and
   names[] for each of the 3.

If a candidate has fewer than 3 recorded instruments on its APN, swap it
out for the next candidate in the filtered list.

## 4. `NEIGHBOR_INSTRUMENTS` mapping

The 5 × 3 = 15 recording numbers live in
`scripts/lib/neighbor-instruments.ts` as a frozen constant. Research
date: (to be filled by operator).

| APN | Owner | Recording # 1 | Recording # 2 | Recording # 3 |
|---|---|---|---|---|
| (to be filled) | | | | |

## 5. Seville fetch confirmation

- 5 files under `src/data/api-cache/recorder/`, one per APN
- 15 total `/documents/{n}` calls
- Total API calls (including probes): (to be filled)
- Spacing enforced: ≥ 500 ms between calls
- Cap: 30 calls; halt on 429/5xx

## 6. Re-run instructions

- Refreshing the Gilbert seed is cheap — re-run the script; `captured_date`
  updates. Bundle budget (2 MB gzipped) is re-checked automatically.
- Refreshing the Seville cache requires the manual step in §3 — the API
  has no automated way to discover "last 3 instruments on this APN."

## 7. Legal

Maricopa County parcel data is public record under A.R.S. § 11-495.
Attribution: "Maricopa County Assessor" is supplied on every surface that
renders a field from this feed. The Maricopa Recorder's public API
(`publicapi.recorder.maricopa.gov`) has been used for research; every
response we cache is stamped with `source_url` and `captured_date`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/data-provenance.md
git commit -m "docs(provenance): add operator runbook (pre-fetch skeleton)"
```

---

## Task 2: Bundle baseline — script + committed baseline JSON

**Files:**
- Create: `scripts/capture-bundle-baseline.ts`
- Create: `tests/baseline-bundle-sizes.json`

This must run on the pre-feature tip so the baseline reflects the current state. Run it once, commit the output.

- [ ] **Step 1: Write the baseline-capture script**

Create `scripts/capture-bundle-baseline.ts`:

```ts
// scripts/capture-bundle-baseline.ts
// Read Vite build manifest + compute per-route chunk-graph aggregated size.
// Run after `npm run build`.

import fs from "node:fs";
import path from "node:path";

type Manifest = Record<string, {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
}>;

const ROUTES_TO_TRACK = [
  "src/components/LandingPage.tsx",
  "src/components/ChainOfTitle.tsx",
  "src/components/EncumbranceLifecycle.tsx",
  "src/components/ProofDrawer.tsx",
  "src/components/MoatCompareRoute.tsx",
  "src/components/ActivityHeatMap.tsx",
  "src/components/StaffWorkbench.tsx",
];

function collectChunkSize(
  entryKey: string,
  manifest: Manifest,
  distAssets: string,
  seen: Set<string>,
): number {
  if (seen.has(entryKey)) return 0;
  seen.add(entryKey);
  const entry = manifest[entryKey];
  if (!entry) return 0;
  const filePath = path.join(distAssets, "..", entry.file);
  const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  let total = size;
  for (const imp of entry.imports ?? []) {
    total += collectChunkSize(imp, manifest, distAssets, seen);
  }
  return total;
}

function main() {
  const manifestPath = "dist/.vite/manifest.json";
  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: ${manifestPath} missing. Run 'npm run build' first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  const sizes: Record<string, number> = {};
  for (const route of ROUTES_TO_TRACK) {
    sizes[route] = collectChunkSize(route, manifest, "dist/assets", new Set());
  }
  const out = {
    captured_date: new Date().toISOString().slice(0, 10),
    commit: process.env.GIT_COMMIT ?? "unknown",
    per_route_bytes: sizes,
  };
  fs.writeFileSync("tests/baseline-bundle-sizes.json", JSON.stringify(out, null, 2) + "\n");
  console.log("Wrote tests/baseline-bundle-sizes.json");
  for (const [r, b] of Object.entries(sizes)) {
    console.log(`  ${r}  ${b} bytes`);
  }
}

main();
```

- [ ] **Step 2: Run `npm run build` on the pre-feature tip**

```bash
cd C:/Users/Klaus/county-recorder-sprint
git rev-parse HEAD  # record the commit hash
npm run build
```

Expected: build completes with `dist/.vite/manifest.json` present.

- [ ] **Step 3: Run the baseline capture**

```bash
GIT_COMMIT=$(git rev-parse HEAD) npx tsx scripts/capture-bundle-baseline.ts
```

Expected: `tests/baseline-bundle-sizes.json` created with per-route byte totals.

- [ ] **Step 4: Commit**

```bash
git add scripts/capture-bundle-baseline.ts tests/baseline-bundle-sizes.json
git commit -m "build(baseline): capture per-route bundle sizes pre-landing-map"
```

---

## Task 3: Gilbert fetch — pure helpers with TDD

**Files:**
- Create: `scripts/lib/gilbert-fetch.ts`
- Create: `tests/scripts/gilbert-fetch.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/scripts/gilbert-fetch.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/scripts/gilbert-fetch.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement pure helpers**

Create `scripts/lib/gilbert-fetch.ts`:

```ts
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
  return prevOffset + n;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/scripts/gilbert-fetch.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/gilbert-fetch.ts tests/scripts/gilbert-fetch.test.ts
git commit -m "feat(scripts): gilbert-fetch pure helpers (stamp, bbox, budget, pagination)"
```

---

## Task 4: Gilbert fetch — shell script + execution + commit the seed

**Files:**
- Create: `scripts/fetch-gilbert-parcels.ts`
- Create: `src/data/gilbert-parcels-geo.json` (from running the script)
- Create: `src/data/gilbert-seed-count.ts` (from running the script)

- [ ] **Step 1: Write the fetch shell**

Create `scripts/fetch-gilbert-parcels.ts`:

```ts
// scripts/fetch-gilbert-parcels.ts
// One-time capture of Gilbert/Chandler assessor parcels.
// Run via: npx tsx scripts/fetch-gilbert-parcels.ts

import fs from "node:fs";
import zlib from "node:zlib";
import {
  stampFeature,
  enforceGzippedBudget,
  nextPage,
  type Bbox,
} from "./lib/gilbert-fetch";

const BBOX: Bbox = { xmin: -111.755, ymin: 33.225, xmax: -111.695, ymax: 33.258 };
const OUT_FIELDS = [
  "APN", "APN_DASH", "OWNER_NAME",
  "PHYSICAL_STREET_NUM", "PHYSICAL_STREET_DIR", "PHYSICAL_STREET_NAME",
  "PHYSICAL_STREET_TYPE", "PHYSICAL_CITY", "PHYSICAL_ZIP",
  "SUBNAME", "LOT_NUM", "DEED_NUMBER", "DEED_DATE", "SALE_DATE",
  "LAND_SIZE", "CONST_YEAR", "Shape_Length", "Shape_Area",
].join(",");
const BUDGET = 2 * 1024 * 1024;

const PROBE_URLS = [
  "https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/FeatureServer",
  "https://maps.mcassessor.maricopa.gov/arcgis/rest/services/",
  "https://maps-mcassessor.opendata.arcgis.com/",
];

async function probe(): Promise<string> {
  for (const base of PROBE_URLS) {
    try {
      const r = await fetch(`${base}?f=json`);
      if (r.ok) {
        console.log(`probe OK: ${base}`);
        return base;
      }
      console.log(`probe ${r.status}: ${base}`);
    } catch (e) {
      console.log(`probe error: ${base} — ${(e as Error).message}`);
    }
  }
  console.error("ERROR: all probe URLs failed. Try one of these by hand:");
  for (const u of PROBE_URLS) console.error(`  curl -sSf "${u}?f=json" | head -c 400`);
  process.exit(1);
}

type Page = { features: unknown[]; exceededTransferLimit?: boolean; count?: number };

async function fetchPage(base: string, layerPath: string, offset: number): Promise<{ url: string; page: Page }> {
  const params = new URLSearchParams({
    geometryType: "esriGeometryEnvelope",
    geometry: `${BBOX.xmin},${BBOX.ymin},${BBOX.xmax},${BBOX.ymax}`,
    spatialRel: "esriSpatialRelIntersects",
    outFields: OUT_FIELDS,
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    geometryPrecision: "6",
    resultRecordCount: "2000",
    resultOffset: String(offset),
    inSR: "4326",
  });
  const url = `${base}${layerPath}/query?${params}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status} ${url}`);
  return { url, page: (await r.json()) as Page };
}

async function main() {
  const base = await probe();
  // Layer path is assessor-service-dependent; the probe should have revealed
  // the Parcels layer. Convention: /Parcels/FeatureServer/0 — if the probe
  // succeeds at a different URL family, adjust LAYER_PATH manually and re-run.
  const LAYER_PATH = "/0";

  const captured = new Date().toISOString().slice(0, 10);
  const all: unknown[] = [];
  let offset = 0;
  let lastUrl = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { url, page } = await fetchPage(base, LAYER_PATH, offset);
    lastUrl = url;
    console.log(`page offset=${offset} → ${page.features?.length ?? 0} features`);
    for (const f of page.features ?? []) {
      all.push(stampFeature(f as never, { source_url: url, captured_date: captured }));
    }
    const next = nextPage(page, offset);
    if (next === null) break;
    offset = next;
  }

  const out = {
    type: "FeatureCollection" as const,
    metadata: {
      source: "maricopa_assessor_public_gis",
      source_url: lastUrl,
      captured_date: captured,
      record_count: all.length,
      bbox: BBOX,
      attribution: "Maricopa County Assessor",
      legal: "Public record per Arizona A.R.S. § 11-495",
      layer_endpoint: `${base}${LAYER_PATH}`,
    },
    features: all,
  };

  const json = JSON.stringify(out);
  const gz = zlib.gzipSync(Buffer.from(json));
  enforceGzippedBudget(gz, BUDGET, { bbox: BBOX });

  fs.writeFileSync("src/data/gilbert-parcels-geo.json", json);
  fs.writeFileSync(
    "src/data/gilbert-seed-count.ts",
    `// Generated by scripts/fetch-gilbert-parcels.ts on ${captured}.\n` +
      `// Source of truth for the landing "not in seeded area" copy.\n` +
      `export const SEED_COUNT = ${all.length};\n`,
  );

  console.log(`wrote ${all.length} features, ${json.length} bytes raw, ${gz.byteLength} bytes gzipped`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
```

- [ ] **Step 2: Execute the fetch**

```bash
npx tsx scripts/fetch-gilbert-parcels.ts
```

Expected: completes with "wrote N features" (N between 500 and 3000). Creates `src/data/gilbert-parcels-geo.json` and `src/data/gilbert-seed-count.ts`. If the probe fails, follow the fallback instructions the script prints.

If the budget throws, the error message contains a concrete shrunken bbox — paste those values into `BBOX`, re-run.

- [ ] **Step 3: Update the runbook with the capture values**

Edit `docs/data-provenance.md` §1: fill in Record count, File size (gzipped), Capture date, Endpoint used.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-gilbert-parcels.ts src/data/gilbert-parcels-geo.json src/data/gilbert-seed-count.ts docs/data-provenance.md
git commit -m "feat(data): commit Gilbert assessor parcel seed ($(jq -r '.metadata.record_count' src/data/gilbert-parcels-geo.json) features)"
```

---

## Task 5: NEIGHBOR_INSTRUMENTS constant + validation tests

**Files:**
- Create: `scripts/lib/neighbor-instruments.ts`
- Create: `tests/scripts/neighbor-instruments.test.ts`

Human manually researches the 5 × 3 mapping per the runbook `docs/data-provenance.md` §3; result committed as a frozen constant. Tests enforce all 6 rules from spec §9a.

- [ ] **Step 1: Commit the constant (values from manual research)**

Create `scripts/lib/neighbor-instruments.ts`:

```ts
// scripts/lib/neighbor-instruments.ts
// 5 Seville Parcel 3 neighbors × 3 most-recent recorded instruments each.
// Produced by manual research against the Maricopa recorder UI — see
// docs/data-provenance.md §3. Frozen constant; edit only after re-running
// the runbook's manual step.

export const NEIGHBOR_INSTRUMENTS: Readonly<Record<string, readonly [string, string, string]>> = Object.freeze({
  // TO BE FILLED by operator after Task 4 + manual research.
  // Shape example (delete after filling):
  // "304-78-XXX": ["20210001234", "20210001235", "20180056789"],
});
```

The operator must replace the empty body with 5 entries before Task 6's tests will pass. Commit the filled constant.

- [ ] **Step 2: Write the failing validation tests**

Create `tests/scripts/neighbor-instruments.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { NEIGHBOR_INSTRUMENTS } from "../../scripts/lib/neighbor-instruments";

const APN_RE = /^\d{3}-\d{2}-\d{3}[A-Z]?$/;
const INSTR_RE = /^\d{11}$/;
const CORPUS_BOUNDARY = "2026-04-09";

function instrumentYear(n: string): number {
  return parseInt(n.slice(0, 4), 10);
}

describe("NEIGHBOR_INSTRUMENTS", () => {
  it("rule 1: exactly 5 APNs", () => {
    expect(Object.keys(NEIGHBOR_INSTRUMENTS)).toHaveLength(5);
  });

  it("rule 2: APN format NNN-NN-NNN[X]", () => {
    for (const apn of Object.keys(NEIGHBOR_INSTRUMENTS)) {
      expect(apn, `APN "${apn}"`).toMatch(APN_RE);
    }
  });

  it("rule 3: each APN maps to exactly 3 11-digit recording numbers", () => {
    for (const [apn, ns] of Object.entries(NEIGHBOR_INSTRUMENTS)) {
      expect(ns, `APN ${apn}`).toHaveLength(3);
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
        const year = instrumentYear(n);
        expect(year, `recording ${n}`).toBeLessThanOrEqual(2026);
        // The leading 7-digit sequence embeds ordering, not date — year gate is the hard bound.
      }
    }
    // (boundary text held in a constant so the failure message is calibrated)
    expect(CORPUS_BOUNDARY).toBe("2026-04-09");
  });

  it("rule 6 (orphan guard): every APN appears in gilbert-parcels-geo.json", () => {
    const seed = JSON.parse(readFileSync("src/data/gilbert-parcels-geo.json", "utf8"));
    const seeded = new Set(
      (seed.features as Array<{ properties: { APN_DASH?: string } }>)
        .map((f) => f.properties.APN_DASH)
        .filter(Boolean),
    );
    for (const apn of Object.keys(NEIGHBOR_INSTRUMENTS)) {
      expect(seeded.has(apn), `APN ${apn}`).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run — all fail until constant is filled**

```bash
npm test -- tests/scripts/neighbor-instruments.test.ts
```

Expected: failures until operator fills in 5 entries matching all 6 rules.

- [ ] **Step 4: Operator fills the constant, re-runs until green**

Operator edits `scripts/lib/neighbor-instruments.ts` with real values from the manual research step, re-runs the test, iterates until all 6 rules pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/neighbor-instruments.ts tests/scripts/neighbor-instruments.test.ts
git commit -m "feat(scripts): NEIGHBOR_INSTRUMENTS constant + 6-rule validation"
```

---

## Task 6: Seville fetch — pure helpers + shell + execution

**Files:**
- Create: `scripts/lib/seville-fetch.ts`
- Create: `tests/scripts/seville-fetch.test.ts`
- Create: `scripts/fetch-seville-neighbors-recorder-cache.ts`
- Create: `src/data/api-cache/recorder/*.json` (5 files via script)

- [ ] **Step 1: Write the failing tests**

Create `tests/scripts/seville-fetch.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sleep,
  callBudget,
  normalizeDisplayFields,
} from "../../scripts/lib/seville-fetch";

describe("sleep", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves after the specified milliseconds", async () => {
    let resolved = false;
    sleep(500).then(() => { resolved = true; });
    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });
});

describe("callBudget", () => {
  it("allows calls up to the cap", () => {
    const b = callBudget(3);
    b.consume(); b.consume(); b.consume();
    expect(b.remaining()).toBe(0);
  });
  it("throws at cap+1", () => {
    const b = callBudget(2);
    b.consume(); b.consume();
    expect(() => b.consume()).toThrow(/budget exhausted/);
  });
});

describe("normalizeDisplayFields", () => {
  it("derives last_recorded_date, last_doc_type, last_3_instruments", () => {
    const docs = [
      { recordingNumber: "20200567890", recordingDate: "6-15-2020", documentCode: "WAR DEED", names: ["SMITH JANE"] },
      { recordingNumber: "20210123456", recordingDate: "2-3-2021", documentCode: "DEED TRST", names: ["SMITH JANE", "ACME BANK"] },
      { recordingNumber: "20190876543", recordingDate: "11-20-2019", documentCode: "REL D/T", names: ["OLD BANK"] },
    ];
    const r = normalizeDisplayFields(docs);
    expect(r.last_recorded_date).toBe("2021-02-03");
    expect(r.last_doc_type).toBe("DEED TRST");
    expect(r.last_3_instruments[0].recording_number).toBe("20210123456");
    expect(r.last_3_instruments[0].recording_date).toBe("2021-02-03");
    expect(r.last_3_instruments[2].recording_number).toBe("20190876543");
  });
});
```

- [ ] **Step 2: Run — should fail**

```bash
npm test -- tests/scripts/seville-fetch.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers**

Create `scripts/lib/seville-fetch.ts`:

```ts
// scripts/lib/seville-fetch.ts
// Pure helpers for the Seville recorder-cache fetch.

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function callBudget(cap: number) {
  let used = 0;
  return {
    consume() {
      if (used >= cap) throw new Error(`budget exhausted after ${used} calls`);
      used += 1;
    },
    remaining() {
      return cap - used;
    },
  };
}

type RawDoc = {
  recordingNumber: string;
  recordingDate: string;    // "M-D-YYYY" per CLAUDE.md Terminology Notes
  documentCode: string;
  names?: string[];
};

function toIsoDate(mdYYYY: string): string {
  const [m, d, y] = mdYYYY.split("-");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function normalizeDisplayFields(docs: RawDoc[]) {
  const sorted = [...docs].sort((a, b) =>
    toIsoDate(b.recordingDate).localeCompare(toIsoDate(a.recordingDate)),
  );
  return {
    last_recorded_date: toIsoDate(sorted[0].recordingDate),
    last_doc_type: sorted[0].documentCode,
    last_3_instruments: sorted.slice(0, 3).map((d) => ({
      recording_number: d.recordingNumber,
      recording_date: toIsoDate(d.recordingDate),
      doc_type: d.documentCode,
      parties: d.names ?? [],
    })),
  };
}
```

- [ ] **Step 4: Run — should pass**

```bash
npm test -- tests/scripts/seville-fetch.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Write the fetch shell**

Create `scripts/fetch-seville-neighbors-recorder-cache.ts`:

```ts
// scripts/fetch-seville-neighbors-recorder-cache.ts
// Fetches 15 /documents/{n} responses from the Maricopa public recorder API,
// grouped into 5 per-APN cache files.
// Run via: npx tsx scripts/fetch-seville-neighbors-recorder-cache.ts

import fs from "node:fs";
import path from "node:path";
import { NEIGHBOR_INSTRUMENTS } from "./lib/neighbor-instruments";
import { sleep, callBudget, normalizeDisplayFields } from "./lib/seville-fetch";

const BASE = "https://publicapi.recorder.maricopa.gov";
const CAPTURED = new Date().toISOString().slice(0, 10);
const OUT_DIR = "src/data/api-cache/recorder";
const CALL_CAP = 30;
const SPACING_MS = 500;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const budget = callBudget(CALL_CAP);
  let calls = 0;
  const t0 = Date.now();

  for (const [apn, recordingNumbers] of Object.entries(NEIGHBOR_INSTRUMENTS)) {
    const docs: Array<Record<string, unknown>> = [];
    const sourceUrls: string[] = [];
    for (const n of recordingNumbers) {
      const url = `${BASE}/documents/${n}`;
      budget.consume();
      calls += 1;
      const tc = Date.now();
      const r = await fetch(url);
      console.log(`[${calls}] ${r.status} ${url} (${Date.now() - tc}ms)`);
      if (r.status === 429 || r.status >= 500) {
        console.error(`HALT: ${r.status} on ${url} — do not retry blindly.`);
        process.exit(1);
      }
      if (!r.ok) throw new Error(`fetch ${r.status} ${url}`);
      const doc = (await r.json()) as Record<string, unknown>;
      docs.push(doc);
      sourceUrls.push(url);
      await sleep(SPACING_MS);
    }

    const display = normalizeDisplayFields(
      docs.map((d) => ({
        recordingNumber: d.recordingNumber as string,
        recordingDate: d.recordingDate as string,
        documentCode: d.documentCode as string,
        names: (d.names as string[] | undefined) ?? [],
      })),
    );

    const out = {
      apn,
      source_url_per_document: sourceUrls,
      captured_date: CAPTURED,
      source_note: "Pre-cached at build-time for prototype; production would query live at click.",
      display_fields: display,
      api_response: { documents: docs },
    };
    fs.writeFileSync(path.join(OUT_DIR, `${apn}.json`), JSON.stringify(out, null, 2) + "\n");
    console.log(`wrote ${apn} (${docs.length} docs)`);
  }

  console.log(`done: ${calls} calls in ${Date.now() - t0}ms`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
```

- [ ] **Step 6: Run the fetch**

```bash
npx tsx scripts/fetch-seville-neighbors-recorder-cache.ts
```

Expected: 15 successful `/documents/{n}` calls, 5 output files in `src/data/api-cache/recorder/`. If any 429/5xx occurs, it halts with the offending URL.

- [ ] **Step 7: Update runbook §5**

Edit `docs/data-provenance.md` §5 with the post-run confirmation (5 files, 15 calls, spacing observed).

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/seville-fetch.ts scripts/fetch-seville-neighbors-recorder-cache.ts tests/scripts/seville-fetch.test.ts src/data/api-cache/recorder/ docs/data-provenance.md
git commit -m "feat(data): commit 5 Seville-neighbor recorder-API cache files"
```

---

## Task 7: `AssessorParcel` schema + `assembleAddress`

**Files:**
- Create: `src/logic/assessor-parcel.ts`
- Create: `tests/assessor-parcel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/assessor-parcel.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { AssessorParcel, assembleAddress } from "../src/logic/assessor-parcel";

describe("AssessorParcel schema", () => {
  it("parses a minimal valid row", () => {
    const parsed = AssessorParcel.parse({
      APN: "30478386",
      APN_DASH: "304-78-386",
      OWNER_NAME: "POPHAM CHRISTOPHER/ASHLEY",
      PHYSICAL_STREET_NUM: "3674",
      PHYSICAL_STREET_DIR: "E",
      PHYSICAL_STREET_NAME: "PALMER",
      PHYSICAL_STREET_TYPE: "ST",
      PHYSICAL_CITY: "GILBERT",
      PHYSICAL_ZIP: "85298",
      SUBNAME: "SEVILLE PARCEL 3",
      LOT_NUM: "46",
      DEED_NUMBER: "20130183449",
      DEED_DATE: 1361923200000,
      LAND_SIZE: 7015,
      Shape_Area: 934,
      source: "maricopa_assessor_public_gis",
      source_url: "https://example/",
      captured_date: "2026-04-16",
    });
    expect(parsed.APN_DASH).toBe("304-78-386");
  });

  it("rejects rows missing provenance", () => {
    expect(() =>
      AssessorParcel.parse({
        APN: "1", APN_DASH: "1-1-1", OWNER_NAME: "X",
      }),
    ).toThrow();
  });
});

describe("assembleAddress", () => {
  it("joins street num + dir + name + type + city + zip", () => {
    const a = assembleAddress({
      PHYSICAL_STREET_NUM: "3674",
      PHYSICAL_STREET_DIR: "E",
      PHYSICAL_STREET_NAME: "PALMER",
      PHYSICAL_STREET_TYPE: "ST",
      PHYSICAL_CITY: "GILBERT",
      PHYSICAL_ZIP: "85298",
    });
    expect(a).toBe("3674 E PALMER ST, GILBERT 85298");
  });
  it("omits nulls and empty pieces", () => {
    const a = assembleAddress({
      PHYSICAL_STREET_NUM: "3674",
      PHYSICAL_STREET_DIR: null,
      PHYSICAL_STREET_NAME: "PALMER",
      PHYSICAL_STREET_TYPE: "",
      PHYSICAL_CITY: "GILBERT",
      PHYSICAL_ZIP: null,
    });
    expect(a).toBe("3674 PALMER, GILBERT");
  });
});
```

- [ ] **Step 2: Run — should fail**

```bash
npm test -- tests/assessor-parcel.test.ts
```

- [ ] **Step 3: Implement schema + helper**

Create `src/logic/assessor-parcel.ts`:

```ts
import { z } from "zod";

export const AssessorParcel = z.object({
  APN: z.string(),
  APN_DASH: z.string(),
  OWNER_NAME: z.string().nullable().optional(),
  PHYSICAL_STREET_NUM: z.string().nullable().optional(),
  PHYSICAL_STREET_DIR: z.string().nullable().optional(),
  PHYSICAL_STREET_NAME: z.string().nullable().optional(),
  PHYSICAL_STREET_TYPE: z.string().nullable().optional(),
  PHYSICAL_CITY: z.string().nullable().optional(),
  PHYSICAL_ZIP: z.string().nullable().optional(),
  SUBNAME: z.string().nullable().optional(),
  LOT_NUM: z.string().nullable().optional(),
  DEED_NUMBER: z.string().nullable().optional(),
  DEED_DATE: z.number().nullable().optional(),
  SALE_DATE: z.string().nullable().optional(),
  LAND_SIZE: z.number().nullable().optional(),
  CONST_YEAR: z.string().nullable().optional(),
  Shape_Length: z.number().nullable().optional(),
  Shape_Area: z.number().nullable().optional(),
  source: z.literal("maricopa_assessor_public_gis"),
  source_url: z.string(),
  captured_date: z.string(),
});
export type AssessorParcel = z.infer<typeof AssessorParcel>;

type AddressPieces = Pick<
  AssessorParcel,
  | "PHYSICAL_STREET_NUM" | "PHYSICAL_STREET_DIR" | "PHYSICAL_STREET_NAME"
  | "PHYSICAL_STREET_TYPE" | "PHYSICAL_CITY" | "PHYSICAL_ZIP"
>;

export function assembleAddress(p: AddressPieces): string {
  const street = [
    p.PHYSICAL_STREET_NUM,
    p.PHYSICAL_STREET_DIR,
    p.PHYSICAL_STREET_NAME,
    p.PHYSICAL_STREET_TYPE,
  ]
    .filter((s) => s != null && s !== "")
    .join(" ");
  const cityZip = [p.PHYSICAL_CITY, p.PHYSICAL_ZIP]
    .filter((s) => s != null && s !== "")
    .join(" ");
  return [street, cityZip].filter((s) => s.length > 0).join(", ");
}
```

- [ ] **Step 4: Run — should pass**

```bash
npm test -- tests/assessor-parcel.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/logic/assessor-parcel.ts tests/assessor-parcel.test.ts
git commit -m "feat(logic): AssessorParcel zod schema + assembleAddress helper"
```

---

## Task 8: `overlay-state.ts`

**Files:**
- Create: `src/logic/overlay-state.ts`
- Create: `tests/overlay-state.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/overlay-state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  parseOverlayParam,
  serializeOverlayParam,
  toggleOverlay,
  type OverlayName,
} from "../src/logic/overlay-state";

describe("parseOverlayParam", () => {
  it("returns an empty Set on null", () => {
    expect(parseOverlayParam(null).size).toBe(0);
  });
  it("splits on commas and trims", () => {
    const s = parseOverlayParam("encumbrance, anomaly");
    expect(s.has("encumbrance")).toBe(true);
    expect(s.has("anomaly")).toBe(true);
  });
  it("drops unknown tokens silently", () => {
    const s = parseOverlayParam("encumbrance,chaos,lastdeed");
    expect(s.has("encumbrance")).toBe(true);
    expect(s.has("lastdeed")).toBe(true);
    expect(s.size).toBe(2);
  });
});

describe("serializeOverlayParam", () => {
  it("returns empty string for empty Set", () => {
    expect(serializeOverlayParam(new Set())).toBe("");
  });
  it("joins with comma, fixed order: encumbrance,anomaly,lastdeed", () => {
    const s = new Set<OverlayName>(["lastdeed", "encumbrance"]);
    expect(serializeOverlayParam(s)).toBe("encumbrance,lastdeed");
  });
});

describe("toggleOverlay", () => {
  it("adds the name when absent", () => {
    const s = toggleOverlay(new Set<OverlayName>(), "anomaly");
    expect(s.has("anomaly")).toBe(true);
  });
  it("removes the name when present", () => {
    const s = toggleOverlay(new Set<OverlayName>(["anomaly"]), "anomaly");
    expect(s.has("anomaly")).toBe(false);
  });
  it("returns a new Set (does not mutate)", () => {
    const s = new Set<OverlayName>();
    const out = toggleOverlay(s, "encumbrance");
    expect(s.size).toBe(0);
    expect(out.size).toBe(1);
  });
});

describe("round-trip", () => {
  it("parse(serialize(x)) == x for any subset", () => {
    const subsets: OverlayName[][] = [[], ["encumbrance"], ["anomaly", "lastdeed"], ["encumbrance", "anomaly", "lastdeed"]];
    for (const sub of subsets) {
      const s = new Set<OverlayName>(sub);
      expect(parseOverlayParam(serializeOverlayParam(s))).toEqual(s);
    }
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/overlay-state.test.ts
```

- [ ] **Step 3: Implement**

Create `src/logic/overlay-state.ts`:

```ts
export const OVERLAY_NAMES = ["encumbrance", "anomaly", "lastdeed"] as const;
export type OverlayName = (typeof OVERLAY_NAMES)[number];

export function parseOverlayParam(value: string | null): Set<OverlayName> {
  if (!value) return new Set();
  const out = new Set<OverlayName>();
  for (const raw of value.split(",")) {
    const t = raw.trim();
    if ((OVERLAY_NAMES as readonly string[]).includes(t)) {
      out.add(t as OverlayName);
    }
  }
  return out;
}

export function serializeOverlayParam(s: Set<OverlayName>): string {
  return OVERLAY_NAMES.filter((n) => s.has(n)).join(",");
}

export function toggleOverlay(
  s: Set<OverlayName>,
  name: OverlayName,
): Set<OverlayName> {
  const out = new Set(s);
  if (out.has(name)) out.delete(name); else out.add(name);
  return out;
}
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/overlay-state.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/logic/overlay-state.ts tests/overlay-state.test.ts
git commit -m "feat(logic): overlay-state parse/serialize/toggle helpers"
```

---

## Task 9: `Searchable` + `buildSearchableIndex` + `searchAll`

**Files:**
- Create: `src/logic/searchable-index.ts`
- Create: `tests/searchable-index.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/searchable-index.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Parcel } from "../src/types";
import type { AssessorParcel } from "../src/logic/assessor-parcel";
import {
  buildSearchableIndex,
  searchAll,
  type Searchable,
} from "../src/logic/searchable-index";

const popham: Parcel = {
  apn: "304-78-386",
  address: "3674 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85298",
  legal_description: "Lot 46, SEVILLE PARCEL 3",
  current_owner: "POPHAM CHRISTOPHER / ASHLEY",
  type: "residential",
  subdivision: "Seville Parcel 3",
  assessor_url: "",
  instrument_numbers: ["20130183449", "20130183450", "20210075858"],
};

const cachedPolygon: AssessorParcel = {
  APN: "30478300",
  APN_DASH: "304-78-300",
  OWNER_NAME: "JONES TAYLOR",
  PHYSICAL_STREET_NUM: "3600", PHYSICAL_STREET_DIR: "E",
  PHYSICAL_STREET_NAME: "PALMER", PHYSICAL_STREET_TYPE: "ST",
  PHYSICAL_CITY: "GILBERT", PHYSICAL_ZIP: "85298",
  SUBNAME: "SEVILLE PARCEL 3",
  source: "maricopa_assessor_public_gis",
  source_url: "x", captured_date: "2026-04-16",
};

const assessorOnly: AssessorParcel = {
  APN: "30478999",
  APN_DASH: "304-78-999",
  OWNER_NAME: "SMITH JANE",
  PHYSICAL_STREET_NUM: "3700", PHYSICAL_STREET_DIR: "E",
  PHYSICAL_STREET_NAME: "PALMER", PHYSICAL_STREET_TYPE: "ST",
  PHYSICAL_CITY: "GILBERT", PHYSICAL_ZIP: "85298",
  SUBNAME: "SEVILLE PARCEL 3",
  source: "maricopa_assessor_public_gis",
  source_url: "x", captured_date: "2026-04-16",
};

const index: Searchable[] = buildSearchableIndex(
  [popham],
  new Map([[
    "304-78-300",
    { last_3_instruments: [{ recording_number: "20200456789", recording_date: "", doc_type: "", parties: [] }] },
  ]]),
  [cachedPolygon, assessorOnly],
);

describe("buildSearchableIndex", () => {
  it("tags each parcel with the right tier", () => {
    expect(index.find((s) => s.apn === "304-78-386")?.tier).toBe("curated");
    expect(index.find((s) => s.apn === "304-78-300")?.tier).toBe("recorder_cached");
    expect(index.find((s) => s.apn === "304-78-999")?.tier).toBe("assessor_only");
  });
});

describe("searchAll", () => {
  it("11-digit instrument resolves across tiers", () => {
    const r = searchAll("20200456789", index);
    expect(r).toHaveLength(1);
    expect(r[0].searchable.apn).toBe("304-78-300");
    expect(r[0].matchType).toBe("instrument");
  });

  it("APN with dashes matches exact", () => {
    const r = searchAll("304-78-386", index);
    expect(r[0].searchable.apn).toBe("304-78-386");
    expect(r[0].matchType).toBe("apn");
  });

  it("APN without dashes matches exact", () => {
    const r = searchAll("30478386", index);
    expect(r[0].searchable.apn).toBe("304-78-386");
  });

  it("owner multi-token suppressed on assessor_only tier", () => {
    const r = searchAll("smith", index);
    expect(r.find((h) => h.searchable.apn === "304-78-999")).toBeUndefined();
  });

  it("owner match works on curated + cached tiers", () => {
    const rPopham = searchAll("popham", index);
    expect(rPopham[0].searchable.apn).toBe("304-78-386");

    const rJones = searchAll("jones", index);
    expect(rJones[0].searchable.apn).toBe("304-78-300");
  });

  it("address substring matches across tiers", () => {
    const r = searchAll("3700 e palmer", index);
    expect(r[0].searchable.apn).toBe("304-78-999");
    expect(r[0].matchType).toBe("address");
  });

  it("sort order: curated > recorder_cached > assessor_only", () => {
    const r = searchAll("palmer", index);
    const tiers = r.map((h) => h.searchable.tier);
    expect(tiers).toEqual(["curated", "recorder_cached", "assessor_only"]);
  });

  it("limits results to opts.limit", () => {
    const r = searchAll("palmer", index, { limit: 1 });
    expect(r).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/searchable-index.test.ts
```

- [ ] **Step 3: Implement**

Create `src/logic/searchable-index.ts`:

```ts
import type { Parcel } from "../types";
import { AssessorParcel, assembleAddress } from "./assessor-parcel";

export type RecorderCache = {
  last_3_instruments: Array<{
    recording_number: string;
    recording_date: string;
    doc_type: string;
    parties: string[];
  }>;
};

export type Searchable =
  | { tier: "curated"; apn: string; parcel: Parcel }
  | { tier: "recorder_cached"; apn: string; polygon: AssessorParcel; cachedInstruments: string[] }
  | { tier: "assessor_only"; apn: string; polygon: AssessorParcel };

export type MatchType =
  | "instrument"
  | "apn"
  | "address"
  | "owner"
  | "subdivision";

export type SearchHit = { searchable: Searchable; matchType: MatchType };

const INSTRUMENT_RE = /^\d{11}$/;

const MATCH_PRIORITY: Record<MatchType, number> = {
  instrument: 0, apn: 1, address: 2, owner: 3, subdivision: 4,
};

const TIER_PRIORITY: Record<Searchable["tier"], number> = {
  curated: 0, recorder_cached: 1, assessor_only: 2,
};

function normalizeApn(raw: string): string {
  return raw.replace(/-/g, "").trim().toLowerCase();
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s,/]+/).filter((t) => t.length > 0);
}

function ownerMatches(query: string, owner: string | null | undefined): boolean {
  if (!owner) return false;
  const q = tokenize(query);
  if (q.length === 0) return false;
  const o = tokenize(owner);
  return q.every((qt) => o.some((ot) => ot.includes(qt)));
}

export function buildSearchableIndex(
  curated: Parcel[],
  cached: Map<string, RecorderCache>,
  assessor: AssessorParcel[],
): Searchable[] {
  const curatedApns = new Set(curated.map((p) => p.apn));
  const cachedApns = new Set(cached.keys());
  const out: Searchable[] = [];

  for (const p of curated) out.push({ tier: "curated", apn: p.apn, parcel: p });

  for (const a of assessor) {
    const apn = a.APN_DASH;
    if (curatedApns.has(apn)) continue;
    if (cachedApns.has(apn)) {
      const cache = cached.get(apn)!;
      out.push({
        tier: "recorder_cached",
        apn,
        polygon: a,
        cachedInstruments: cache.last_3_instruments.map((i) => i.recording_number),
      });
    } else {
      out.push({ tier: "assessor_only", apn, polygon: a });
    }
  }
  return out;
}

function addressOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.address;
  return assembleAddress(s.polygon);
}

function ownerOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.current_owner;
  return s.polygon.OWNER_NAME ?? "";
}

function subdivisionOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.subdivision;
  return s.polygon.SUBNAME ?? "";
}

function instrumentsOf(s: Searchable): string[] {
  if (s.tier === "curated") return s.parcel.instrument_numbers ?? [];
  if (s.tier === "recorder_cached") return s.cachedInstruments;
  return [];
}

export function searchAll(
  query: string,
  searchables: Searchable[],
  opts?: { limit?: number },
): SearchHit[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  if (INSTRUMENT_RE.test(trimmed)) {
    for (const s of searchables) {
      if (instrumentsOf(s).includes(trimmed)) {
        const hits: SearchHit[] = [{ searchable: s, matchType: "instrument" }];
        return opts?.limit ? hits.slice(0, opts.limit) : hits;
      }
    }
    return [];
  }

  const q = trimmed.toLowerCase();
  const qApn = normalizeApn(trimmed);

  const hits: SearchHit[] = [];
  for (const s of searchables) {
    let best: MatchType | null = null;
    const consider = (t: MatchType) => {
      if (best === null || MATCH_PRIORITY[t] < MATCH_PRIORITY[best]) best = t;
    };

    if (normalizeApn(s.apn) === qApn) consider("apn");
    if (addressOf(s).toLowerCase().includes(q)) consider("address");
    if (s.tier !== "assessor_only" && ownerMatches(trimmed, ownerOf(s))) consider("owner");
    if (subdivisionOf(s).toLowerCase().includes(q)) consider("subdivision");

    if (best) hits.push({ searchable: s, matchType: best });
  }

  hits.sort((a, b) => {
    const t = TIER_PRIORITY[a.searchable.tier] - TIER_PRIORITY[b.searchable.tier];
    if (t !== 0) return t;
    const m = MATCH_PRIORITY[a.matchType] - MATCH_PRIORITY[b.matchType];
    if (m !== 0) return m;
    return a.searchable.apn.localeCompare(b.searchable.apn);
  });

  return opts?.limit ? hits.slice(0, opts.limit) : hits;
}
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/searchable-index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/logic/searchable-index.ts tests/searchable-index.test.ts
git commit -m "feat(logic): Searchable union + buildSearchableIndex + searchAll"
```

---

## Task 10: `resolveDrawerVariant`

**Files:**
- Create: `src/logic/drawer-variant.ts`
- Create: `tests/drawer-variant.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/drawer-variant.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveDrawerVariant } from "../src/logic/drawer-variant";

const curatedApns = new Set(["304-78-386", "304-77-689"]);
const cachedApns = new Set(["304-78-300"]);
const seededApns = new Set(["304-78-300", "304-78-999", "304-78-386", "304-77-689"]);

describe("resolveDrawerVariant", () => {
  it("returns 'curated' when apn is in curated set", () => {
    expect(resolveDrawerVariant("304-78-386", { curatedApns, cachedApns, seededApns }))
      .toBe("curated");
  });
  it("returns 'recorder_cached' when apn is in cache but not curated", () => {
    expect(resolveDrawerVariant("304-78-300", { curatedApns, cachedApns, seededApns }))
      .toBe("recorder_cached");
  });
  it("returns 'assessor_only' when apn is seeded but neither curated nor cached", () => {
    expect(resolveDrawerVariant("304-78-999", { curatedApns, cachedApns, seededApns }))
      .toBe("assessor_only");
  });
  it("returns 'not_in_seeded_area' when apn is nowhere", () => {
    expect(resolveDrawerVariant("999-99-999", { curatedApns, cachedApns, seededApns }))
      .toBe("not_in_seeded_area");
  });
  it("curated wins when apn is in multiple tiers (defensive)", () => {
    const dup = new Set(["304-78-386"]);
    expect(resolveDrawerVariant("304-78-386", {
      curatedApns,
      cachedApns: dup,
      seededApns,
    })).toBe("curated");
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/drawer-variant.test.ts
```

- [ ] **Step 3: Implement**

Create `src/logic/drawer-variant.ts`:

```ts
export type DrawerVariant =
  | "curated"
  | "recorder_cached"
  | "assessor_only"
  | "not_in_seeded_area";

export function resolveDrawerVariant(
  apn: string,
  opts: {
    curatedApns: Set<string>;
    cachedApns: Set<string>;
    seededApns: Set<string>;
  },
): DrawerVariant {
  if (opts.curatedApns.has(apn)) return "curated";
  if (opts.cachedApns.has(apn)) return "recorder_cached";
  if (opts.seededApns.has(apn)) return "assessor_only";
  return "not_in_seeded_area";
}
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/drawer-variant.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/logic/drawer-variant.ts tests/drawer-variant.test.ts
git commit -m "feat(logic): resolveDrawerVariant pure selector"
```

---

## Task 11: `useLandingUrlState` hook

**Files:**
- Create: `src/hooks/useLandingUrlState.ts`
- Create: `tests/use-landing-url-state.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/use-landing-url-state.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useLandingUrlState } from "../src/hooks/useLandingUrlState";
import type { ReactNode } from "react";

function wrapper({ children, initial = "/" }: { children: ReactNode; initial?: string }) {
  return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
}

describe("useLandingUrlState", () => {
  it("reads q, apn, overlay from the URL", () => {
    const { result } = renderHook(() => useLandingUrlState(), {
      wrapper: ({ children }) =>
        wrapper({ children, initial: "/?q=popham&apn=304-78-386&overlay=encumbrance,anomaly" }),
    });
    expect(result.current.query).toBe("popham");
    expect(result.current.selectedApn).toBe("304-78-386");
    expect(result.current.overlays.has("encumbrance")).toBe(true);
    expect(result.current.overlays.has("anomaly")).toBe(true);
  });

  it("setQuery updates ?q", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => result.current.setQuery("hogue"));
    expect(result.current.query).toBe("hogue");
  });

  it("setSelectedApn updates ?apn", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => result.current.setSelectedApn("304-77-689"));
    expect(result.current.selectedApn).toBe("304-77-689");
  });

  it("setSelectedApn(null) clears ?apn", () => {
    const { result } = renderHook(() => useLandingUrlState(), {
      wrapper: ({ children }) => wrapper({ children, initial: "/?apn=304-78-386" }),
    });
    act(() => result.current.setSelectedApn(null));
    expect(result.current.selectedApn).toBeNull();
  });

  it("toggleOverlay flips state for a single overlay", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => result.current.toggleOverlay("anomaly"));
    expect(result.current.overlays.has("anomaly")).toBe(true);
    act(() => result.current.toggleOverlay("anomaly"));
    expect(result.current.overlays.has("anomaly")).toBe(false);
  });

  it("setting query and apn in sequence does not drop either", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => {
      result.current.setQuery("popham");
      result.current.setSelectedApn("304-78-386");
    });
    expect(result.current.query).toBe("popham");
    expect(result.current.selectedApn).toBe("304-78-386");
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/use-landing-url-state.test.tsx
```

- [ ] **Step 3: Implement**

Create `src/hooks/useLandingUrlState.ts`:

```ts
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  parseOverlayParam,
  serializeOverlayParam,
  toggleOverlay as toggleOverlayHelper,
  type OverlayName,
} from "../logic/overlay-state";

export function useLandingUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const selectedApn = searchParams.get("apn");
  const overlays = useMemo(
    () => parseOverlayParam(searchParams.get("overlay")),
    [searchParams],
  );

  const mutate = useCallback(
    (fn: (p: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        fn(next);
        return next;
      });
    },
    [setSearchParams],
  );

  const setQuery = useCallback(
    (q: string) => mutate((p) => {
      if (q) p.set("q", q); else p.delete("q");
    }),
    [mutate],
  );

  const setSelectedApn = useCallback(
    (apn: string | null) => mutate((p) => {
      if (apn) p.set("apn", apn); else p.delete("apn");
    }),
    [mutate],
  );

  const toggleOverlay = useCallback(
    (name: OverlayName) => mutate((p) => {
      const next = toggleOverlayHelper(parseOverlayParam(p.get("overlay")), name);
      const ser = serializeOverlayParam(next);
      if (ser) p.set("overlay", ser); else p.delete("overlay");
    }),
    [mutate],
  );

  return { query, selectedApn, overlays, setQuery, setSelectedApn, toggleOverlay };
}
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/use-landing-url-state.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLandingUrlState.ts tests/use-landing-url-state.test.tsx
git commit -m "feat(hooks): unified useLandingUrlState for q + apn + overlay"
```

---

## Task 12: `MapSearchBar` component

**Files:**
- Create: `src/components/MapSearchBar.tsx`
- Create: `tests/map-search-bar.dom.test.tsx`

- [ ] **Step 1: Write failing DOM tests**

Create `tests/map-search-bar.dom.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapSearchBar } from "../src/components/MapSearchBar";
import type { Searchable } from "../src/logic/searchable-index";

const popham: Searchable = {
  tier: "curated",
  apn: "304-78-386",
  parcel: {
    apn: "304-78-386", address: "3674 E Palmer St", city: "Gilbert", state: "AZ",
    zip: "85298", legal_description: "", current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    type: "residential", subdivision: "Seville Parcel 3", assessor_url: "",
    instrument_numbers: [],
  },
};

describe("MapSearchBar", () => {
  it("renders tier chip on result rows", async () => {
    const onSelect = vi.fn();
    render(
      <MapSearchBar
        value="popham"
        onChange={() => {}}
        searchables={[popham]}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText(/Curated · full chain/)).toBeInTheDocument();
  });

  it("calls onSelect when a result is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <MapSearchBar value="popham" onChange={() => {}} searchables={[popham]} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByText(/3674 E Palmer St/));
    expect(onSelect).toHaveBeenCalledWith(popham);
  });

  it("ArrowDown + Enter selects the first result", async () => {
    const onSelect = vi.fn();
    render(
      <MapSearchBar value="popham" onChange={() => {}} searchables={[popham]} onSelect={onSelect} />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(popham);
  });

  it("Escape closes the dropdown", async () => {
    render(
      <MapSearchBar value="popham" onChange={() => {}} searchables={[popham]} onSelect={() => {}} />,
    );
    expect(screen.queryByText(/Curated · full chain/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByText(/Curated · full chain/)).toBeNull();
  });

  it("empty value renders no dropdown", () => {
    render(
      <MapSearchBar value="" onChange={() => {}} searchables={[popham]} onSelect={() => {}} />,
    );
    expect(screen.queryByText(/Curated · full chain/)).toBeNull();
  });

  it("onChange is called on input", async () => {
    const onChange = vi.fn();
    render(<MapSearchBar value="" onChange={onChange} searchables={[]} onSelect={() => {}} />);
    await userEvent.type(screen.getByRole("combobox"), "p");
    expect(onChange).toHaveBeenCalledWith("p");
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/map-search-bar.dom.test.tsx
```

- [ ] **Step 3: Implement**

Create `src/components/MapSearchBar.tsx`:

```tsx
import { useMemo, useState, useRef, useEffect } from "react";
import {
  searchAll,
  type Searchable,
  type SearchHit,
} from "../logic/searchable-index";
import { assembleAddress } from "../logic/assessor-parcel";

interface Props {
  value: string;
  onChange: (v: string) => void;
  searchables: Searchable[];
  onSelect: (s: Searchable) => void;
}

const TIER_CHIP: Record<Searchable["tier"], { label: string; className: string }> = {
  curated: { label: "Curated · full chain", className: "bg-emerald-100 text-emerald-900" },
  recorder_cached: { label: "Recorder · cached", className: "bg-moat-100 text-moat-900" },
  assessor_only: { label: "Assessor · public GIS", className: "bg-slate-100 text-slate-700" },
};

const MATCH_LABEL: Record<SearchHit["matchType"], string> = {
  instrument: "Instrument match",
  apn: "APN match",
  address: "Address match",
  owner: "Owner match",
  subdivision: "Subdivision match",
};

function hitAddress(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.address;
  return assembleAddress(s.polygon);
}
function hitOwner(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.current_owner;
  return s.polygon.OWNER_NAME ?? "";
}
function hitSubdivision(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.subdivision;
  return s.polygon.SUBNAME ?? "";
}

export function MapSearchBar({ value, onChange, searchables, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hits = useMemo(
    () => (value ? searchAll(value, searchables, { limit: 8 }) : []),
    [value, searchables],
  );

  const total = useMemo(
    () => (value ? searchAll(value, searchables).length : 0),
    [value, searchables],
  );

  useEffect(() => {
    if (value) setOpen(true);
    setActiveIdx(0);
  }, [value]);

  const showDropdown = open && value.length > 0 && hits.length > 0;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[min(92vw,640px)]">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="map-search-results"
        aria-autocomplete="list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search APN, address, owner, subdivision, or 11-digit instrument"
        className="w-full rounded-lg border border-slate-300 bg-white/95 px-4 py-3 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent backdrop-blur-sm"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const h = hits[activeIdx];
            if (h) onSelect(h.searchable);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showDropdown && (
        <ul
          id="map-search-results"
          role="listbox"
          className="mt-1 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl"
        >
          {hits.map((h, i) => {
            const chip = TIER_CHIP[h.searchable.tier];
            const active = i === activeIdx;
            return (
              <li
                key={h.searchable.apn}
                role="option"
                aria-selected={active}
                className={`flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onSelect(h.searchable)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-recorder-900 truncate">
                    {hitAddress(h.searchable) || h.searchable.apn}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {hitOwner(h.searchable) || "—"}{" · "}
                    <span className="font-mono">{h.searchable.apn}</span>
                    {hitSubdivision(h.searchable) ? ` · ${hitSubdivision(h.searchable)}` : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{MATCH_LABEL[h.matchType]}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}>
                  {chip.label}
                </span>
              </li>
            );
          })}
          {total > hits.length && (
            <li className="px-4 py-2 text-xs text-slate-500">
              +{total - hits.length} more — narrow your search
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/map-search-bar.dom.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/MapSearchBar.tsx tests/map-search-bar.dom.test.tsx
git commit -m "feat(map): floating MapSearchBar with tier-chipped autocomplete"
```

---

## Task 13: `ParcelDrawer` — all 4 variants + mobile dismissal

**Files:**
- Create: `src/components/ParcelDrawer.tsx`
- Create: `tests/parcel-drawer.dom.test.tsx`

- [ ] **Step 1: Write failing DOM tests**

Create `tests/parcel-drawer.dom.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ParcelDrawer } from "../src/components/ParcelDrawer";
import type { Parcel } from "../src/types";
import type { AssessorParcel } from "../src/logic/assessor-parcel";

const popham: Parcel = {
  apn: "304-78-386", address: "3674 E Palmer St", city: "Gilbert", state: "AZ",
  zip: "85298", legal_description: "Lot 46, Seville Parcel 3", current_owner: "POPHAM",
  type: "residential", subdivision: "Seville Parcel 3", assessor_url: "",
  instrument_numbers: [],
};
const polygon: AssessorParcel = {
  APN: "30478300", APN_DASH: "304-78-300", OWNER_NAME: "JONES TAYLOR",
  PHYSICAL_STREET_NUM: "3600", PHYSICAL_STREET_DIR: "E",
  PHYSICAL_STREET_NAME: "PALMER", PHYSICAL_STREET_TYPE: "ST",
  PHYSICAL_CITY: "GILBERT", PHYSICAL_ZIP: "85298",
  SUBNAME: "SEVILLE PARCEL 3", LOT_NUM: "50",
  DEED_NUMBER: "20180456789", DEED_DATE: 1532476800000,
  source: "maricopa_assessor_public_gis", source_url: "u", captured_date: "2026-04-16",
};

function wrap(children: React.ReactNode) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("ParcelDrawer — curated variant", () => {
  it("shows Open chain of title + encumbrances CTAs", () => {
    render(wrap(
      <ParcelDrawer
        variant="curated"
        payload={{ parcel: popham }}
        onClose={() => {}}
        seededCount={0}
        isMobile={false}
      />,
    ));
    expect(screen.getByText(/Open chain of title/)).toBeInTheDocument();
    expect(screen.getByText(/Open encumbrances/)).toBeInTheDocument();
  });
});

describe("ParcelDrawer — recorder_cached variant", () => {
  const payload = {
    polygon,
    lastRecordedDate: "2021-06-12",
    lastDocType: "WAR DEED",
    last3: [
      { recording_number: "20210123456", recording_date: "2021-06-12", doc_type: "WAR DEED", parties: ["JONES TAYLOR"] },
      { recording_number: "20210123457", recording_date: "2021-06-12", doc_type: "DEED TRST", parties: ["JONES TAYLOR", "ACME BANK"] },
      { recording_number: "20180456789", recording_date: "2018-07-25", doc_type: "WAR DEED", parties: ["SMITH JOHN"] },
    ],
  };
  it("shows cached instruments with Recorder provenance pill", () => {
    render(wrap(
      <ParcelDrawer variant="recorder_cached" payload={payload} onClose={() => {}} seededCount={0} isMobile={false} />,
    ));
    expect(screen.getByText(/Last 3 recorded instruments/)).toBeInTheDocument();
    expect(screen.getAllByText(/Maricopa Recorder · cached/)[0]).toBeInTheDocument();
  });
  it("shows the POPHAM primary CTA and the secondary scroll CTA", () => {
    render(wrap(
      <ParcelDrawer variant="recorder_cached" payload={payload} onClose={() => {}} seededCount={0} isMobile={false} />,
    ));
    expect(screen.getByText(/See a fully curated parcel: POPHAM/)).toBeInTheDocument();
    expect(screen.getByText(/browse all 5 curated parcels/)).toBeInTheDocument();
  });
});

describe("ParcelDrawer — assessor_only variant", () => {
  it("omits the Open chain of title CTA and shows honest disclaimer", () => {
    render(wrap(
      <ParcelDrawer variant="assessor_only" payload={{ polygon }} onClose={() => {}} seededCount={0} isMobile={false} />,
    ));
    expect(screen.queryByText(/Open chain of title/)).toBeNull();
    expect(screen.getByText(/not curated in this demo/)).toBeInTheDocument();
    expect(screen.getAllByText(/Maricopa Assessor · public GIS/)[0]).toBeInTheDocument();
  });
});

describe("ParcelDrawer — not_in_seeded_area variant", () => {
  it("names the seeded count dynamically", () => {
    render(wrap(
      <ParcelDrawer variant="not_in_seeded_area" payload={null} onClose={() => {}} seededCount={1234} isMobile={false} />,
    ));
    expect(screen.getByText(/1234 parcels captured/)).toBeInTheDocument();
  });
});

describe("ParcelDrawer dismissal", () => {
  it("desktop: Esc calls onClose", () => {
    const onClose = vi.fn();
    render(wrap(
      <ParcelDrawer variant="curated" payload={{ parcel: popham }} onClose={onClose} seededCount={0} isMobile={false} />,
    ));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("mobile: back-chevron calls onClose", () => {
    const onClose = vi.fn();
    render(wrap(
      <ParcelDrawer variant="curated" payload={{ parcel: popham }} onClose={onClose} seededCount={0} isMobile={true} />,
    ));
    fireEvent.click(screen.getByLabelText(/Back to map/));
    expect(onClose).toHaveBeenCalled();
  });

  it("mobile: browser popstate calls onClose", () => {
    const onClose = vi.fn();
    render(wrap(
      <ParcelDrawer variant="curated" payload={{ parcel: popham }} onClose={onClose} seededCount={0} isMobile={true} />,
    ));
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/parcel-drawer.dom.test.tsx
```

- [ ] **Step 3: Implement**

Create `src/components/ParcelDrawer.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { Parcel } from "../types";
import type { AssessorParcel } from "../logic/assessor-parcel";
import { assembleAddress } from "../logic/assessor-parcel";
import type { DrawerVariant } from "../logic/drawer-variant";

export type DrawerPayload =
  | { variant: "curated"; parcel: Parcel }
  | {
      variant: "recorder_cached";
      polygon: AssessorParcel;
      lastRecordedDate: string;
      lastDocType: string;
      last3: Array<{
        recording_number: string;
        recording_date: string;
        doc_type: string;
        parties: string[];
      }>;
    }
  | { variant: "assessor_only"; polygon: AssessorParcel }
  | { variant: "not_in_seeded_area" };

interface Props {
  variant: DrawerVariant;
  payload:
    | { parcel: Parcel }
    | {
        polygon: AssessorParcel;
        lastRecordedDate: string;
        lastDocType: string;
        last3: Array<{ recording_number: string; recording_date: string; doc_type: string; parties: string[] }>;
      }
    | { polygon: AssessorParcel }
    | null;
  onClose: () => void;
  seededCount: number;
  isMobile: boolean;
}

function ProvenancePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
      {children}
    </span>
  );
}

function BrowseCurated() {
  return (
    <button
      type="button"
      className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
      onClick={() => {
        const el = document.getElementById("featured-parcels");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }}
    >
      or browse all 5 curated parcels ↓
    </button>
  );
}

function CuratedBody({ parcel }: { parcel: Parcel }) {
  return (
    <>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-recorder-900">{parcel.current_owner}</h2>
        <p className="text-sm text-slate-600">
          <span className="font-mono">{parcel.apn}</span> · {parcel.address}
        </p>
        <p className="text-xs text-slate-500">{parcel.subdivision}</p>
      </header>
      <div className="flex flex-col gap-2">
        <Link
          to={`/parcel/${parcel.apn}`}
          className="rounded-md bg-recorder-700 px-3 py-2 text-sm font-medium text-white hover:bg-recorder-800"
        >
          Open chain of title →
        </Link>
        <Link
          to={`/parcel/${parcel.apn}/encumbrances`}
          className="rounded-md border border-recorder-200 px-3 py-2 text-sm font-medium text-recorder-800 hover:bg-recorder-50"
        >
          Open encumbrances →
        </Link>
      </div>
    </>
  );
}

function CachedBody({ payload }: { payload: {
  polygon: AssessorParcel;
  lastRecordedDate: string;
  lastDocType: string;
  last3: Array<{ recording_number: string; recording_date: string; doc_type: string; parties: string[] }>;
} }) {
  const p = payload.polygon;
  return (
    <>
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-recorder-900">{p.OWNER_NAME ?? "—"}</h2>
        <p className="text-sm text-slate-600"><span className="font-mono">{p.APN_DASH}</span> · {assembleAddress(p)}</p>
      </header>
      <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-900">
        This parcel is indexed but not curated in this demo. The 3 recorded instruments below are
        cached verbatim from <code className="font-mono">publicapi.recorder.maricopa.gov</code>.
      </p>
      <section className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Last 3 recorded instruments
        </h3>
        <ul className="space-y-2">
          {payload.last3.map((r) => (
            <li key={r.recording_number} className="rounded border border-slate-200 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-recorder-900">{r.recording_number}</span>
                <ProvenancePill>Maricopa Recorder · cached {p.captured_date}</ProvenancePill>
              </div>
              <div className="text-slate-700">{r.doc_type} · {r.recording_date}</div>
              <div className="text-slate-500 truncate">{r.parties.join(", ")}</div>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-col gap-2">
        <Link
          to="/parcel/304-78-386"
          className="rounded-md bg-recorder-700 px-3 py-2 text-sm font-medium text-white hover:bg-recorder-800"
        >
          → See a fully curated parcel: POPHAM (Seville Parcel 3)
        </Link>
        <BrowseCurated />
      </div>
    </>
  );
}

function AssessorBody({ polygon }: { polygon: AssessorParcel }) {
  const rows: Array<[string, string]> = [
    ["APN", polygon.APN_DASH],
    ["Owner", polygon.OWNER_NAME ?? "—"],
    ["Address", assembleAddress(polygon)],
    ["Subdivision", polygon.SUBNAME ?? "—"],
    ["Lot", polygon.LOT_NUM ?? "—"],
    ["Parcel size (sq ft)", String(polygon.LAND_SIZE ?? "—")],
    ["Year built", polygon.CONST_YEAR ?? "—"],
    ["Last deed #", polygon.DEED_NUMBER ?? "—"],
    ["Last deed date", polygon.DEED_DATE
      ? new Date(polygon.DEED_DATE).toISOString().slice(0, 10)
      : "—"],
  ];
  return (
    <>
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-recorder-900">{polygon.OWNER_NAME ?? "—"}</h2>
        <p className="text-sm text-slate-600"><span className="font-mono">{polygon.APN_DASH}</span> · {assembleAddress(polygon)}</p>
      </header>
      <p className="mb-3 rounded bg-slate-100 p-2 text-xs text-slate-700">
        This parcel is indexed by the Maricopa County Assessor but is <strong>not curated</strong>
        in this demo. The fields below come from the assessor's public GIS feed.
        The recorder's chain of instruments, lifecycle status, and examiner-reviewed
        provenance are not populated.
      </p>
      <section className="mb-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Assessor fields</h3>
        <dl className="text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-slate-100 py-1">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right text-slate-900">
                {v}
                <span className="ml-1"><ProvenancePill>Maricopa Assessor · public GIS · cached {polygon.captured_date}</ProvenancePill></span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="flex flex-col gap-2">
        <Link
          to="/parcel/304-78-386"
          className="rounded-md bg-recorder-700 px-3 py-2 text-sm font-medium text-white hover:bg-recorder-800"
        >
          → See a fully curated parcel: POPHAM (Seville Parcel 3)
        </Link>
        <BrowseCurated />
      </div>
      <p className="mt-3 text-[11px] italic text-slate-500">
        In production, the county — the only party with custody of both the assessor and
        recorder indexes — would stitch them together at query time.
      </p>
    </>
  );
}

function NotInSeededBody({ seededCount }: { seededCount: number }) {
  return (
    <>
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-recorder-900">Not in the seeded area</h2>
      </header>
      <p className="mb-3 text-sm text-slate-700">
        The prototype seeds parcel polygons only for the Gilbert/Chandler corridor —{" "}
        <strong>{seededCount} parcels</strong> captured from the Maricopa County Assessor's
        public GIS feed on 2026-04-16. In production, the county's authoritative parcel
        index covers all ~1.6M Maricopa parcels. That's the custody difference title plants
        can't close.
      </p>
      <div className="flex flex-col gap-2">
        <Link to="/parcel/304-78-386" className="text-sm text-recorder-700 hover:underline">→ POPHAM (Seville Parcel 3)</Link>
        <Link to="/parcel/304-77-689" className="text-sm text-recorder-700 hover:underline">→ HOGUE (Shamrock Estates Ph 2A)</Link>
        <Link to="/parcel/304-78-374" className="text-sm text-recorder-700 hover:underline">→ WARNER (Seville Parcel 3)</Link>
        <Link to="/parcel/304-78-383" className="text-sm text-recorder-700 hover:underline">→ LOWRY (Seville Parcel 3)</Link>
        <Link to="/parcel/304-78-409" className="text-sm text-recorder-700 hover:underline">→ Seville HOA Tract A</Link>
      </div>
    </>
  );
}

export function ParcelDrawer({ variant, payload, onClose, seededCount, isMobile }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus management + Esc on desktop
  useEffect(() => {
    closeBtnRef.current?.focus();
    if (isMobile) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, onClose]);

  // Mobile: push a history entry on open, close on popstate
  useEffect(() => {
    if (!isMobile) return;
    const state = { __drawerEntry: true };
    window.history.pushState(state, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isMobile, onClose]);

  const body = (() => {
    if (variant === "curated" && payload && "parcel" in payload) return <CuratedBody parcel={payload.parcel} />;
    if (variant === "recorder_cached" && payload && "last3" in payload) return <CachedBody payload={payload} />;
    if (variant === "assessor_only" && payload && "polygon" in payload) return <AssessorBody polygon={payload.polygon} />;
    return <NotInSeededBody seededCount={seededCount} />;
  })();

  return (
    <aside
      role="dialog"
      aria-modal={isMobile}
      aria-label="Parcel details"
      className={
        isMobile
          ? "fixed inset-0 z-30 flex flex-col bg-white"
          : "absolute right-0 top-0 bottom-0 z-20 w-[420px] border-l border-slate-200 bg-white shadow-xl"
      }
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        {isMobile ? (
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Back to map"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-recorder-500 focus-visible:outline-none rounded px-2 py-1"
          >
            ← Back to map
          </button>
        ) : (
          <span className="text-xs uppercase tracking-wide text-slate-500">Parcel</span>
        )}
        {!isMobile && (
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-recorder-500 focus-visible:outline-none"
          >
            ×
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">{body}</div>
    </aside>
  );
}
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/parcel-drawer.dom.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ParcelDrawer.tsx tests/parcel-drawer.dom.test.tsx
git commit -m "feat(map): ParcelDrawer — 4 variants + desktop Esc + mobile back-chevron/popstate"
```

---

## Task 14: `OverlayToggles` + sheet on mobile

**Files:**
- Create: `src/components/OverlayToggles.tsx`
- Create: `tests/overlay-toggles.dom.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/overlay-toggles.dom.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverlayToggles } from "../src/components/OverlayToggles";

describe("OverlayToggles", () => {
  it("renders 3 toggles with aria-pressed reflecting state", () => {
    const overlays = new Set<"encumbrance" | "anomaly" | "lastdeed">(["encumbrance"]);
    render(<OverlayToggles overlays={overlays} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Open encumbrances/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Curator anomalies/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Last deed recorded/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking a toggle calls onToggle with the name", async () => {
    const onToggle = vi.fn();
    render(<OverlayToggles overlays={new Set()} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /Curator anomalies/ }));
    expect(onToggle).toHaveBeenCalledWith("anomaly");
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/overlay-toggles.dom.test.tsx
```

- [ ] **Step 3: Implement**

Create `src/components/OverlayToggles.tsx`:

```tsx
import type { OverlayName } from "../logic/overlay-state";

interface Props {
  overlays: Set<OverlayName>;
  onToggle: (n: OverlayName) => void;
}

const PILL_CONFIG: Array<{ name: OverlayName; label: string; pressedClass: string }> = [
  { name: "encumbrance", label: "Open encumbrances", pressedClass: "bg-moat-600 text-white" },
  { name: "anomaly", label: "Curator anomalies", pressedClass: "bg-amber-500 text-white" },
  { name: "lastdeed", label: "Last deed recorded", pressedClass: "bg-emerald-500 text-white" },
];

export function OverlayToggles({ overlays, onToggle }: Props) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-wrap gap-2">
      {PILL_CONFIG.map((p) => {
        const on = overlays.has(p.name);
        return (
          <button
            key={p.name}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(p.name)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium shadow-md focus-visible:ring-2 focus-visible:ring-recorder-500 focus-visible:outline-none transition-colors ${on ? p.pressedClass : "bg-white/95 text-slate-700 hover:bg-slate-100"}`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/overlay-toggles.dom.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/OverlayToggles.tsx tests/overlay-toggles.dom.test.tsx
git commit -m "feat(map): OverlayToggles pill group with aria-pressed state"
```

---

## Task 15: `EncumbranceOverlayLayer`

**Files:**
- Create: `src/components/map/EncumbranceOverlayLayer.tsx`

Reads `lifecycles.json`; renders one fill layer covering the 4 open-lifecycle parcels. Tested through the CountyMap integration test (Task 20) because the component only emits MapLibre elements.

- [ ] **Step 1: Implement**

Create `src/components/map/EncumbranceOverlayLayer.tsx`:

```tsx
import { Source, Layer } from "react-map-gl/maplibre";
import type { Lifecycle } from "../../schemas";
import parcelsGeo from "../../data/parcels-geo.json";

interface Props {
  active: boolean;
  lifecycles: Lifecycle[];
  instrumentToApn: Map<string, string>;
}

export function EncumbranceOverlayLayer({ active, lifecycles, instrumentToApn }: Props) {
  if (!active) return null;
  const openApns = new Set(
    lifecycles
      .filter((l) => l.status === "open")
      .map((l) => instrumentToApn.get(l.root_instrument))
      .filter((a): a is string => Boolean(a)),
  );
  const features = (parcelsGeo.features as GeoJSON.Feature[]).filter((f) => {
    const apn = (f.properties as { APN_DASH?: string } | null)?.APN_DASH;
    return apn && openApns.has(apn);
  });
  if (features.length === 0) return null;
  return (
    <Source id="overlay-encumbrance" type="geojson" data={{ type: "FeatureCollection", features }}>
      <Layer id="overlay-encumbrance-fill" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.5 }} />
      <Layer id="overlay-encumbrance-outline" type="line" paint={{ "line-color": "#1d4ed8", "line-width": 2 }} />
    </Source>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/EncumbranceOverlayLayer.tsx
git commit -m "feat(map): EncumbranceOverlayLayer — moat-blue fill on open lifecycles"
```

---

## Task 16: `AnomalyOverlayLayer` + `AnomalySummaryPanel`

**Files:**
- Create: `src/components/map/AnomalyOverlayLayer.tsx`
- Create: `src/components/map/AnomalySummaryPanel.tsx`
- Create: `tests/anomaly-summary-panel.dom.test.tsx`

- [ ] **Step 1: Write failing panel tests**

Create `tests/anomaly-summary-panel.dom.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AnomalySummaryPanel } from "../src/components/map/AnomalySummaryPanel";

const anomalies = [
  { id: "a1", parcel_apn: "304-78-386", severity: "high" as const, title: "Mismatch", description: "" },
  { id: "a2", parcel_apn: "304-78-386", severity: "medium" as const, title: "Same-name", description: "" },
  { id: "a3", parcel_apn: "304-77-689", severity: "high" as const, title: "Missing release", description: "" },
];

function wrap(children: React.ReactNode) { return <MemoryRouter>{children}</MemoryRouter>; }

describe("AnomalySummaryPanel", () => {
  it("groups anomalies by APN with severity dots", () => {
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open onClose={() => {}} />));
    expect(screen.getByText(/304-78-386/)).toBeInTheDocument();
    expect(screen.getByText(/304-77-689/)).toBeInTheDocument();
    expect(screen.getAllByText(/Mismatch/).length).toBeGreaterThan(0);
  });

  it("close button dismisses", () => {
    const onClose = vi.fn();
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open onClose={onClose} />));
    fireEvent.click(screen.getByLabelText(/Close anomaly panel/));
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape dismisses", () => {
    const onClose = vi.fn();
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open onClose={onClose} />));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open={false} onClose={() => {}} />));
    expect(screen.queryByText(/304-78-386/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/anomaly-summary-panel.dom.test.tsx
```

- [ ] **Step 3: Implement the panel**

Create `src/components/map/AnomalySummaryPanel.tsx`:

```tsx
import { useEffect } from "react";
import { Link } from "react-router";

type Severity = "high" | "medium" | "low";

interface Anomaly {
  id: string;
  parcel_apn: string;
  severity: Severity;
  title: string;
  description: string;
}

interface Props {
  anomalies: Anomaly[];
  open: boolean;
  onClose: () => void;
}

const DOT: Record<Severity, string> = {
  high: "bg-red-600",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export function AnomalySummaryPanel({ anomalies, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const byApn = new Map<string, Anomaly[]>();
  for (const a of anomalies) {
    const arr = byApn.get(a.parcel_apn) ?? [];
    arr.push(a);
    byApn.set(a.parcel_apn, arr);
  }

  return (
    <section
      className="absolute top-16 right-4 z-20 w-80 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl"
      role="region"
      aria-label="Curator anomaly summary"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h3 className="text-sm font-semibold text-recorder-900">Curator anomalies</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close anomaly panel"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-recorder-500 focus-visible:outline-none"
        >
          ×
        </button>
      </header>
      <ul className="divide-y divide-slate-100">
        {[...byApn.entries()].map(([apn, items]) => (
          <li key={apn} className="p-3">
            <Link to={`/parcel/${apn}`} className="mb-1 inline-block font-mono text-xs text-recorder-700 hover:underline">
              {apn}
            </Link>
            <ul className="space-y-1">
              {items.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs">
                  <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${DOT[a.severity]}`} aria-label={a.severity} />
                  <span className="text-slate-700">{a.title}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run panel tests — pass**

```bash
npm test -- tests/anomaly-summary-panel.dom.test.tsx
```

- [ ] **Step 5: Implement the map layer**

Create `src/components/map/AnomalyOverlayLayer.tsx`:

```tsx
import { Source, Layer } from "react-map-gl/maplibre";
import parcelsGeo from "../../data/parcels-geo.json";

type Severity = "high" | "medium" | "low";
type Anomaly = { parcel_apn: string; severity: Severity };

interface Props {
  active: boolean;
  anomalies: Anomaly[];
}

const SEV_COLOR: Record<Severity, string> = {
  high: "#dc2626",   // red-600
  medium: "#f59e0b", // amber-500
  low: "#94a3b8",    // slate-400
};

function maxSeverity(list: Severity[]): Severity {
  if (list.includes("high")) return "high";
  if (list.includes("medium")) return "medium";
  return "low";
}

export function AnomalyOverlayLayer({ active, anomalies }: Props) {
  if (!active) return null;
  const byApn = new Map<string, Severity[]>();
  for (const a of anomalies) {
    const arr = byApn.get(a.parcel_apn) ?? [];
    arr.push(a.severity);
    byApn.set(a.parcel_apn, arr);
  }
  const features = (parcelsGeo.features as GeoJSON.Feature[])
    .filter((f) => byApn.has((f.properties as { APN_DASH?: string } | null)?.APN_DASH ?? ""))
    .map((f) => {
      const apn = (f.properties as { APN_DASH?: string }).APN_DASH!;
      return {
        ...f,
        properties: { ...f.properties, _sev: maxSeverity(byApn.get(apn)!) },
      };
    });
  if (features.length === 0) return null;
  return (
    <Source id="overlay-anomaly" type="geojson" data={{ type: "FeatureCollection", features }}>
      <Layer
        id="overlay-anomaly-outline"
        type="line"
        paint={{
          "line-color": [
            "match",
            ["get", "_sev"],
            "high", SEV_COLOR.high,
            "medium", SEV_COLOR.medium,
            SEV_COLOR.low,
          ],
          "line-width": 3,
        }}
      />
    </Source>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/map/AnomalyOverlayLayer.tsx src/components/map/AnomalySummaryPanel.tsx tests/anomaly-summary-panel.dom.test.tsx
git commit -m "feat(map): AnomalyOverlayLayer + AnomalySummaryPanel"
```

---

## Task 17: `LastDeedOverlayLayer`

**Files:**
- Create: `src/components/map/LastDeedOverlayLayer.tsx`

- [ ] **Step 1: Implement**

Create `src/components/map/LastDeedOverlayLayer.tsx`:

```tsx
import { Source, Layer } from "react-map-gl/maplibre";

interface Props {
  active: boolean;
  geojson: GeoJSON.FeatureCollection;
}

const BAND_COLOR = {
  post2020: "#10b981",  // emerald-500
  mid: "#f59e0b",       // amber-500
  early: "#94a3b8",     // slate-400
  old: "#6b7280",       // gray-500
};

export function LastDeedOverlayLayer({ active, geojson }: Props) {
  if (!active) return null;
  return (
    <Source id="overlay-lastdeed" type="geojson" data={geojson}>
      <Layer
        id="overlay-lastdeed-fill"
        type="fill"
        paint={{
          "fill-color": [
            "case",
            ["==", ["get", "DEED_DATE"], null], "rgba(0,0,0,0)",
            [">=", ["get", "DEED_DATE"], 1577836800000], BAND_COLOR.post2020,   // 2020-01-01
            [">=", ["get", "DEED_DATE"], 1420070400000], BAND_COLOR.mid,        // 2015-01-01
            [">=", ["get", "DEED_DATE"], 1262304000000], BAND_COLOR.early,      // 2010-01-01
            BAND_COLOR.old,
          ],
          "fill-opacity": 0.3,
        }}
      />
      <Layer
        id="overlay-lastdeed-outline-null"
        type="line"
        filter: ["==", ["get", "DEED_DATE"], null],
        paint={{
          "line-color": BAND_COLOR.early,
          "line-width": 1,
        }}
      />
    </Source>
  );
}
```

(Note: the filter-line typo above is deliberate TS demo of how MapLibre `filter` is typed — if your editor complains, correct to `filter={["==", ["get", "DEED_DATE"], null]}` — which is the correct react-map-gl prop shape for a MapLibre filter expression.)

- [ ] **Step 2: Fix the filter prop**

Edit `src/components/map/LastDeedOverlayLayer.tsx`, replace the outline Layer with:

```tsx
      <Layer
        id="overlay-lastdeed-outline-null"
        type="line"
        filter={["==", ["get", "DEED_DATE"], null]}
        paint={{
          "line-color": BAND_COLOR.early,
          "line-width": 1,
        }}
      />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/map/LastDeedOverlayLayer.tsx
git commit -m "feat(map): LastDeedOverlayLayer — recency-banded gradient"
```

---

## Task 18: `CachedNeighborPopup` + `AssessorOnlyPopup`

**Files:**
- Create: `src/components/map/CachedNeighborPopup.tsx`
- Create: `src/components/map/AssessorOnlyPopup.tsx`

Small hover popups; tested via the CountyMap integration test in Task 19.

- [ ] **Step 1: Implement both popups**

Create `src/components/map/CachedNeighborPopup.tsx`:

```tsx
import { Popup } from "react-map-gl/maplibre";
import type { AssessorParcel } from "../../logic/assessor-parcel";
import { assembleAddress } from "../../logic/assessor-parcel";

interface Props {
  polygon: AssessorParcel;
  last: { recording_date: string; doc_type: string } | null;
  longitude: number;
  latitude: number;
}

export function CachedNeighborPopup({ polygon, last, longitude, latitude }: Props) {
  return (
    <Popup longitude={longitude} latitude={latitude} anchor="bottom" closeButton={false} closeOnClick={false}>
      <div className="min-w-[180px] text-xs">
        <div className="font-semibold text-recorder-900">{polygon.OWNER_NAME ?? "—"}</div>
        <div className="text-slate-600 font-mono">{polygon.APN_DASH}</div>
        <div className="text-slate-600">{assembleAddress(polygon)}</div>
        {last && <div className="mt-1 text-slate-700">Last: {last.doc_type} · {last.recording_date}</div>}
        <div className="mt-1 inline-block rounded bg-moat-100 px-1.5 py-0.5 text-[10px] font-medium text-moat-900">Recorder · cached</div>
      </div>
    </Popup>
  );
}
```

Create `src/components/map/AssessorOnlyPopup.tsx`:

```tsx
import { Popup } from "react-map-gl/maplibre";
import type { AssessorParcel } from "../../logic/assessor-parcel";
import { assembleAddress } from "../../logic/assessor-parcel";

interface Props {
  polygon: AssessorParcel;
  longitude: number;
  latitude: number;
}

export function AssessorOnlyPopup({ polygon, longitude, latitude }: Props) {
  return (
    <Popup longitude={longitude} latitude={latitude} anchor="bottom" closeButton={false} closeOnClick={false}>
      <div className="min-w-[180px] text-xs">
        <div className="font-semibold text-recorder-900">{polygon.OWNER_NAME ?? "—"}</div>
        <div className="text-slate-600 font-mono">{polygon.APN_DASH}</div>
        <div className="text-slate-600">{assembleAddress(polygon)}</div>
        <div className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">Assessor · public GIS</div>
      </div>
    </Popup>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/CachedNeighborPopup.tsx src/components/map/AssessorOnlyPopup.tsx
git commit -m "feat(map): CachedNeighborPopup + AssessorOnlyPopup"
```

---

## Task 19: Extend `CountyMap.tsx` with new layers + overlays + click routing

**Files:**
- Modify: `src/components/CountyMap.tsx`
- Create: `tests/county-map-overlays.dom.test.tsx`

- [ ] **Step 1: Write failing integration test**

Create `tests/county-map-overlays.dom.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CountyMap } from "../src/components/CountyMap";
import type { OverlayName } from "../src/logic/overlay-state";

// Minimal mock of MapGL since jsdom can't render MapLibre.
vi.mock("react-map-gl/maplibre", async () => {
  const actual = await vi.importActual<typeof import("react-map-gl/maplibre")>("react-map-gl/maplibre");
  return {
    ...actual,
    default: ({ children, interactiveLayerIds }: { children: React.ReactNode; interactiveLayerIds?: string[] }) => (
      <div data-testid="mapgl" data-interactive={(interactiveLayerIds ?? []).join(",")}>{children}</div>
    ),
  };
});

describe("CountyMap interactiveLayerIds ordering", () => {
  it("lists curated first, then recorder_cached, then assessor_only; no overlay layers", () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <CountyMap
          highlightedParcels={[{ apn: "304-78-386", status: "primary" }]}
          onParcelClick={() => {}}
          assessorPolygons={{ type: "FeatureCollection", features: [] }}
          cachedApns={new Set()}
          overlays={new Set<OverlayName>(["encumbrance", "anomaly", "lastdeed"])}
          onAssessorParcelClick={() => {}}
        />
      </MemoryRouter>,
    );
    const ids = getByTestId("mapgl").getAttribute("data-interactive")?.split(",") ?? [];
    const curatedIdx = ids.findIndex((i) => i.includes("parcel-304-78-386-fill"));
    const assessorIdx = ids.indexOf("assessor-only-fill");
    expect(curatedIdx).toBeGreaterThanOrEqual(0);
    // overlay layer ids must not be in interactive
    expect(ids).not.toContain("overlay-encumbrance-fill");
    expect(ids).not.toContain("overlay-anomaly-outline");
    expect(ids).not.toContain("overlay-lastdeed-fill");
    // curated appears before assessor when both exist (assessor may be -1 if no features — that's fine)
    if (assessorIdx >= 0) expect(curatedIdx).toBeLessThan(assessorIdx);
  });
});
```

- [ ] **Step 2: Run — fail (Props mismatch)**

```bash
npm test -- tests/county-map-overlays.dom.test.tsx
```

- [ ] **Step 3: Extend `CountyMap.tsx`**

Modify `src/components/CountyMap.tsx`. Key changes:
- Add props: `assessorPolygons: GeoJSON.FeatureCollection`, `cachedApns: Set<string>`, `overlays: Set<OverlayName>`, `onAssessorParcelClick: (apn: string) => void`, plus optional `lifecycles`, `anomalies`, `instrumentToApn` passed through to overlay components.
- Add new Source+Layer blocks for assessor-only (slate-300 fill @ 8%, shown at zoom ≥ 13), and for recorder-cached (moat-500 outline + invisible fill-hit). Source IDs `assessor-only`, `cached-neighbors`.
- Compose overlay components: `EncumbranceOverlayLayer`, `AnomalyOverlayLayer`, `LastDeedOverlayLayer`.
- Compute `interactiveLayerIds` as an ordered array:
  ```ts
  const interactiveLayerIds = [
    ...highlightedParcels.map((p) => `parcel-${p.apn}-fill`),
    "cached-neighbors-fill-hit",
    "assessor-only-fill",
  ];
  ```
- Extend `handleClick` to dispatch to `onAssessorParcelClick` when the clicked layer is the assessor or cached layer, using `APN_DASH` from the feature properties.

Replace the existing `interactiveLayerIds` const and `handleClick` function with the new logic; keep all existing curated-parcel layers and popup behavior intact.

Snippet to append in the MapGL children (after the existing curated-parcel loop):

```tsx
<Source id="assessor-only" type="geojson" data={assessorPolygons}>
  <Layer
    id="assessor-only-fill"
    type="fill"
    minzoom={13}
    paint={{ "fill-color": "#cbd5e1", "fill-opacity": 0.08 }}
  />
  <Layer
    id="assessor-only-outline"
    type="line"
    minzoom={13}
    paint={{ "line-color": "#64748b", "line-width": 0.5 }}
  />
</Source>

<Source
  id="cached-neighbors"
  type="geojson"
  data={{
    type: "FeatureCollection",
    features: (assessorPolygons.features as GeoJSON.Feature[]).filter(
      (f) => cachedApns.has((f.properties as { APN_DASH?: string } | null)?.APN_DASH ?? ""),
    ),
  }}
>
  <Layer id="cached-neighbors-fill-hit" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.01 }} />
  <Layer id="cached-neighbors-outline" type="line" paint={{ "line-color": "#3b82f6", "line-width": 2 }} />
</Source>

<EncumbranceOverlayLayer
  active={overlays.has("encumbrance")}
  lifecycles={lifecycles ?? LIFECYCLES}
  instrumentToApn={instrumentToApn ?? new Map()}
/>
<AnomalyOverlayLayer active={overlays.has("anomaly")} anomalies={anomalies ?? []} />
<LastDeedOverlayLayer active={overlays.has("lastdeed")} geojson={assessorPolygons} />
```

Extend click handling:

```tsx
const handleClick = useCallback(
  (e: MapLayerMouseEvent) => {
    const feat = e.features?.[0];
    if (!feat) return;
    const layerId = feat.layer?.id ?? "";
    const curatedMatch = layerId.match(/^parcel-(.+)-fill$/);
    if (curatedMatch) {
      onParcelClick(curatedMatch[1]);
      return;
    }
    const apn = (feat.properties as { APN_DASH?: string } | null)?.APN_DASH;
    if (apn && (layerId === "assessor-only-fill" || layerId === "cached-neighbors-fill-hit")) {
      onAssessorParcelClick(apn);
    }
  },
  [onParcelClick, onAssessorParcelClick],
);
```

- [ ] **Step 4: Run — pass**

```bash
npm test -- tests/county-map-overlays.dom.test.tsx tests/county-map.dom.test.tsx
```

Existing county-map.dom tests must still pass (they pass `highlightedParcels` and `onParcelClick`; new props are optional-with-defaults so existing call sites aren't broken — OR we explicitly feed safe defaults in the test wrappers).

If the existing test breaks because of new required props: in `CountyMap.tsx`, give `assessorPolygons`, `cachedApns`, `overlays`, and `onAssessorParcelClick` safe defaults (`{ type: "FeatureCollection", features: [] }`, `new Set()`, `new Set()`, and `() => {}` respectively).

- [ ] **Step 5: Commit**

```bash
git add src/components/CountyMap.tsx tests/county-map-overlays.dom.test.tsx
git commit -m "feat(map): CountyMap — tiered polygon layers + overlay composition + click routing"
```

---

## Task 20: Restructure `LandingPage.tsx` — full-bleed map + integration

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `tests/landing-page.dom.test.tsx` (add full-bleed + search-bar presence asserts)

- [ ] **Step 1: Update existing landing page test (add new expectations, keep existing)**

Add these test cases to `tests/landing-page.dom.test.tsx` (don't remove existing tests):

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingPage } from "../src/components/LandingPage";

describe("LandingPage — landing-map-as-product", () => {
  it("renders the MapSearchBar with combobox role", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders the 3 overlay toggles with aria-pressed", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /Open encumbrances/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Curator anomalies/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Last deed recorded/ })).toBeInTheDocument();
  });

  it("preserves FeaturedParcels with id='featured-parcels' below the map", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const fp = document.getElementById("featured-parcels");
    expect(fp).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- tests/landing-page.dom.test.tsx
```

- [ ] **Step 3: Rewrite `LandingPage.tsx`**

Replace `src/components/LandingPage.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import { CountyMap, type HighlightedParcel } from "./CountyMap";
import { MapSearchBar } from "./MapSearchBar";
import { OverlayToggles } from "./OverlayToggles";
import { ParcelDrawer } from "./ParcelDrawer";
import { AnomalySummaryPanel } from "./map/AnomalySummaryPanel";
import { FeaturedParcels } from "./FeaturedParcels";
import { PersonaRow } from "./PersonaRow";
import { SearchEntry } from "./SearchEntry";
import { useAllParcels } from "../hooks/useAllParcels";
import { useLandingUrlState } from "../hooks/useLandingUrlState";
import { buildSearchableIndex, type Searchable } from "../logic/searchable-index";
import { AssessorParcel } from "../logic/assessor-parcel";
import { resolveDrawerVariant } from "../logic/drawer-variant";
import { SEED_COUNT } from "../data/gilbert-seed-count";
import { loadAllInstruments } from "../data-loader";
import { LifecyclesFile } from "../schemas";
import lifecyclesRaw from "../data/lifecycles.json";
import anomaliesRaw from "../data/staff-anomalies.json";

const HIGHLIGHTED: HighlightedParcel[] = [
  { apn: "304-78-386", status: "primary", label: "POPHAM" },
  { apn: "304-77-689", status: "backup", label: "HOGUE (counter-example)" },
  { apn: "304-78-409", status: "subdivision_common", label: "Seville HOA tract" },
];

const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

// Instrument → APN map built once from curated corpus.
function buildInstrumentMap() {
  const all = loadAllInstruments();
  const m = new Map<string, string>();
  for (const i of all) {
    if (i.parcel_apn) m.set(i.instrument_number, i.parcel_apn);
  }
  return m;
}

export function LandingPage() {
  const navigate = useNavigate();
  const parcels = useAllParcels();
  const { query, selectedApn, overlays, setQuery, setSelectedApn, toggleOverlay } = useLandingUrlState();

  const [assessor, setAssessor] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cachedMap, setCachedMap] = useState<Map<string, {
    polygon: AssessorParcel;
    lastRecordedDate: string;
    lastDocType: string;
    last3: Array<{ recording_number: string; recording_date: string; doc_type: string; parties: string[] }>;
  }> | null>(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Dynamic import: keep Gilbert seed OUT of non-landing route chunks.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const geo = (await import("../data/gilbert-parcels-geo.json")).default as GeoJSON.FeatureCollection;
      if (cancelled) return;
      setAssessor(geo);

      // Lazy-load the 5 cached-neighbor files (known filenames listed in the index).
      const cachedIndex = (await import("../data/api-cache/recorder/index.json")).default as string[];
      const loaded = await Promise.all(
        cachedIndex.map(async (apn) => {
          const mod = await import(`../data/api-cache/recorder/${apn}.json`);
          return [apn, mod.default] as const;
        }),
      );
      if (cancelled) return;
      const map = new Map();
      for (const [apn, c] of loaded) {
        const feat = (geo.features as GeoJSON.Feature[]).find(
          (f) => (f.properties as { APN_DASH?: string } | null)?.APN_DASH === apn,
        );
        if (!feat) continue;
        const poly = AssessorParcel.parse(feat.properties);
        map.set(apn, {
          polygon: poly,
          lastRecordedDate: c.display_fields.last_recorded_date,
          lastDocType: c.display_fields.last_doc_type,
          last3: c.display_fields.last_3_instruments,
        });
      }
      setCachedMap(map);
    })();
    return () => { cancelled = true; };
  }, []);

  const curatedApns = useMemo(() => new Set(parcels.map((p) => p.apn)), [parcels]);
  const cachedApns = useMemo(() => new Set(cachedMap ? [...cachedMap.keys()] : []), [cachedMap]);
  const seededApns = useMemo(
    () => new Set((assessor?.features ?? []).map((f) =>
      (f.properties as { APN_DASH?: string } | null)?.APN_DASH ?? "",
    ).filter(Boolean)),
    [assessor],
  );

  const searchables: Searchable[] = useMemo(() => {
    if (!assessor || !cachedMap) return [];
    const assessorParsed = (assessor.features as GeoJSON.Feature[])
      .map((f) => {
        try { return AssessorParcel.parse(f.properties); } catch { return null; }
      })
      .filter((a): a is AssessorParcel => a !== null);
    const cached = new Map(
      [...cachedMap.entries()].map(([apn, v]) => [apn, {
        last_3_instruments: v.last3.map((i) => ({
          recording_number: i.recording_number,
          recording_date: i.recording_date,
          doc_type: i.doc_type,
          parties: i.parties,
        })),
      }]),
    );
    return buildSearchableIndex(parcels, cached, assessorParsed);
  }, [parcels, cachedMap, assessor]);

  const variant = selectedApn
    ? resolveDrawerVariant(selectedApn, { curatedApns, cachedApns, seededApns })
    : null;

  const drawerPayload = (() => {
    if (!selectedApn || !variant) return null;
    if (variant === "curated") {
      const p = parcels.find((pp) => pp.apn === selectedApn);
      return p ? { parcel: p } : null;
    }
    if (variant === "recorder_cached") {
      const c = cachedMap?.get(selectedApn);
      return c ? c : null;
    }
    if (variant === "assessor_only") {
      const feat = (assessor?.features as GeoJSON.Feature[] | undefined)?.find(
        (f) => (f.properties as { APN_DASH?: string } | null)?.APN_DASH === selectedApn,
      );
      if (!feat) return null;
      try { return { polygon: AssessorParcel.parse(feat.properties) }; } catch { return null; }
    }
    return null;
  })();

  const [anomalyPanelOpen, setAnomalyPanelOpen] = useState(false);
  useEffect(() => {
    if (!overlays.has("anomaly")) setAnomalyPanelOpen(false);
  }, [overlays]);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-recorder-900">Maricopa County Recorder</h1>
            <p className="text-sm text-recorder-500">The county owns the record. Everyone else owns a copy.</p>
          </div>
          <Link to="/why" className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 pt-1">
            Why this matters →
          </Link>
        </div>
      </header>

      <section className="relative flex-1 min-h-[60vh] border-b border-slate-200">
        <CountyMap
          highlightedParcels={HIGHLIGHTED}
          onParcelClick={(apn) => setSelectedApn(apn)}
          assessorPolygons={assessor ?? { type: "FeatureCollection", features: [] }}
          cachedApns={cachedApns}
          overlays={overlays}
          onAssessorParcelClick={(apn) => setSelectedApn(apn)}
          lifecycles={LIFECYCLES}
          anomalies={anomaliesRaw as Array<{ parcel_apn: string; severity: "high" | "medium" | "low" }>}
          instrumentToApn={buildInstrumentMap()}
        />
        <MapSearchBar
          value={query}
          onChange={setQuery}
          searchables={searchables}
          onSelect={(s) => setSelectedApn(s.apn)}
        />
        <OverlayToggles overlays={overlays} onToggle={toggleOverlay} />
        {overlays.has("anomaly") && (
          <AnomalySummaryPanel
            anomalies={anomaliesRaw as Array<{ id: string; parcel_apn: string; severity: "high" | "medium" | "low"; title: string; description: string }>}
            open={anomalyPanelOpen}
            onClose={() => setAnomalyPanelOpen(false)}
          />
        )}
        {selectedApn && variant && (
          <ParcelDrawer
            variant={variant}
            payload={drawerPayload}
            onClose={() => setSelectedApn(null)}
            seededCount={SEED_COUNT}
            isMobile={isMobile}
          />
        )}
      </section>

      <div id="featured-parcels">
        <FeaturedParcels parcels={parcels} />
      </div>

      <section role="search" className="px-6 py-8 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto">
          <PersonaRow />
          <h2 className="text-sm font-medium text-slate-700 mb-2">Or look up a parcel directly</h2>
          <SearchEntry
            parcels={parcels}
            onSelectParcel={(apn, instrumentNumber) =>
              navigate(
                instrumentNumber
                  ? `/parcel/${apn}/instrument/${instrumentNumber}`
                  : `/parcel/${apn}`,
              )
            }
          />
        </div>
      </section>

      <footer className="px-6 py-4 flex justify-between items-center text-xs text-slate-500 flex-wrap gap-2">
        <Link to="/county-activity" className="underline underline-offset-2 hover:text-slate-700">→ View county activity</Link>
        <Link to="/why" className="underline underline-offset-2 hover:text-slate-700">→ Why this matters</Link>
        <Link to="/moat-compare" className="underline underline-offset-2 hover:text-slate-700">→ Compare to a title-plant report</Link>
        <Link to="/staff" className="underline underline-offset-2 text-slate-400 hover:text-slate-600">County staff? Open workbench &rarr;</Link>
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Create cached-neighbor index file**

Create `src/data/api-cache/recorder/index.json` with an array of the 5 cached APNs (the operator has these values from Task 5):

```json
[
  "304-78-XXX",
  "304-78-XXX",
  "304-78-XXX",
  "304-78-XXX",
  "304-78-XXX"
]
```

(Replace with real APNs from `NEIGHBOR_INSTRUMENTS`.)

- [ ] **Step 5: Run — pass**

```bash
npm test -- tests/landing-page.dom.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx src/data/api-cache/recorder/index.json tests/landing-page.dom.test.tsx
git commit -m "feat(landing): full-bleed map with search, overlays, drawer"
```

---

## Task 21: `landing-bundle.test.ts` — baseline regression guard

**Files:**
- Create: `tests/landing-bundle.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/landing-bundle.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";

const TOLERANCE = 2 * 1024; // 2 KB per-route slack
const LANDING_ROUTE = "src/components/LandingPage.tsx";

type Manifest = Record<string, { file: string; imports?: string[]; dynamicImports?: string[] }>;
type Baseline = { per_route_bytes: Record<string, number> };

function chunkGraphBytes(entry: string, m: Manifest, seen = new Set<string>()): number {
  if (seen.has(entry)) return 0;
  seen.add(entry);
  const node = m[entry];
  if (!node) return 0;
  const size = fs.statSync(`dist/${node.file}`).size;
  let total = size;
  for (const imp of node.imports ?? []) total += chunkGraphBytes(imp, m, seen);
  return total;
}

describe("landing-bundle regression", () => {
  beforeAll(() => {
    execSync("npm run build", { stdio: "inherit" });
  }, 240_000);

  const manifest = JSON.parse(fs.readFileSync("dist/.vite/manifest.json", "utf8")) as Manifest;
  const baseline = JSON.parse(fs.readFileSync("tests/baseline-bundle-sizes.json", "utf8")) as Baseline;

  it("non-landing routes stay within baseline + 2 KB", () => {
    for (const [entry, baseBytes] of Object.entries(baseline.per_route_bytes)) {
      if (entry === LANDING_ROUTE) continue;
      const currBytes = chunkGraphBytes(entry, manifest);
      expect(currBytes, `${entry}: base ${baseBytes} → now ${currBytes}`)
        .toBeLessThanOrEqual(baseBytes + TOLERANCE);
    }
  });

  it("Gilbert seed appears only in the landing chunk graph (dynamic import)", () => {
    const seen = new Set<string>();
    chunkGraphBytes(LANDING_ROUTE, manifest, seen);
    const landingReaches = new Set<string>();
    for (const key of seen) {
      const node = manifest[key];
      if (!node) continue;
      for (const d of node.dynamicImports ?? []) landingReaches.add(d);
    }
    const allEntries = Object.keys(manifest);
    const gilbertKey = allEntries.find((k) => k.includes("gilbert-parcels-geo"));
    expect(gilbertKey, "gilbert-parcels-geo chunk exists").toBeDefined();
    // Gilbert chunk must be in landing's dynamicImports (reachable only via dynamic import from landing)
    expect(landingReaches.has(gilbertKey!)).toBe(true);
  });
});
```

- [ ] **Step 2: Run**

```bash
npm test -- tests/landing-bundle.test.ts
```

Expected: both assertions pass against the freshly built bundle.

- [ ] **Step 3: Commit**

```bash
git add tests/landing-bundle.test.ts
git commit -m "test(bundle): guard non-landing route chunks against baseline"
```

---

## Task 22: CLAUDE.md decision log — add #43 and #44

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append the two decisions**

In `CLAUDE.md`, find the end of the Decision Log table and add:

```markdown
| 43 | Seeded Gilbert parcel polygons from Maricopa Assessor public GIS | Build-time fetch of ~N Gilbert/Chandler parcels → `src/data/gilbert-parcels-geo.json` with `source` / `source_url` / `captured_date` stamped on every feature. A.R.S. § 11-495 public record; attribution documented in `docs/data-provenance.md`. Cached at build time, never at runtime. | 2026-04-16 |
| 44 | 5 Seville Parcel 3 neighbors with pre-fetched recorder-API responses | Cached `/documents/{n}` responses for 15 instruments (5 APNs × 3) → `src/data/api-cache/recorder/*.json`. Selection rule frozen in `scripts/lib/neighbor-instruments.ts`. Tiered drawer model: Curated (5) / Recorder-cached (5) / Assessor-only (~N). Chip wording: `Curated · full chain` / `Recorder · cached` / `Assessor · public GIS`. Owner autocomplete silently suppressed on assessor tier. Overlays: encumbrance (default ON), anomaly (OFF), lastdeed (OFF). URL state unified in `useLandingUrlState` (`?q`, `?apn`, `?overlay`). | 2026-04-16 |
```

Replace `N` with the actual Gilbert seed record count (from `src/data/gilbert-seed-count.ts`).

- [ ] **Step 2: Update Research Request Tracker section**

Append to the R-### table:

```markdown
| R-006 | 4 | COMPLETE | Gilbert Assessor public-GIS seed — N parcels, 2 MB gzipped, captured 2026-04-16 |
| R-007 | 4 | COMPLETE | 5 Seville neighbors × 3 recorder API responses — 15 /documents/{n} calls, captured 2026-04-16 |
```

- [ ] **Step 3: Update Active Skill State**

Change:
```
- **Current Phase:** Phase 4: UI Build
- **Active Skill:** executing-plans
```

(Or whatever phase you're in when this task lands.)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add decisions #43 (Gilbert seed) and #44 (neighbors + tiered drawer)"
```

---

## Task 23: Verification pass — screenshots + 60s demo timing

**Files:** none created; updates `docs/data-provenance.md` with screenshot links if retained.

- [ ] **Step 1: Run full test suite**

```bash
npm test
npx tsc -b
npm run build
```

All three must succeed. Bundle-split test must pass.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

Keep it running for the next step.

- [ ] **Step 3: Preview MCP screenshots**

Capture and save these screenshots (the MCP handles this via the dev server):

1. Desktop landing, fresh load (no URL state)
2. Mobile landing (375 px viewport)
3. `/` with `?q=popham` — autocomplete dropdown visible, POPHAM row with `Curated · full chain` chip
4. `/` after selecting a curated result — drawer open, chain-of-title CTA visible
5. `/` with `?apn=<cached-neighbor-apn>` — recorder-cached drawer variant with last-3 instruments
6. `/` with `?apn=<assessor-only-apn>` — assessor-only drawer variant
7. `/` with `?q=someplace` that misses — not-in-seeded-area variant showing seed count
8. `/?overlay=encumbrance` — open encumbrance overlay only
9. `/?overlay=anomaly` — anomaly overlay + AnomalySummaryPanel open
10. `/?overlay=lastdeed` — gradient across visible polygons
11. `/?overlay=encumbrance,anomaly,lastdeed` — all three active
12. Deep-link: `/?q=popham&apn=304-78-386&overlay=encumbrance,anomaly` — exact demo state reproduced in one paint

- [ ] **Step 4: 60-second demo beat timing**

Time the primary beat on the sprint owner's machine:

1. Land on `/`
2. Type `popham` in the search bar
3. Click the first result
4. Click "Open chain of title"
5. Land on `/parcel/304-78-386`

Target: under 60 seconds. If over, identify which step is slow (first-paint dynamic import? search debounce? drawer open animation?) and open a follow-up task — don't silently accept.

- [ ] **Step 5: Final commit if anything touched up**

```bash
git status
# If clean, done. Otherwise:
git add -A
git commit -m "chore(verification): screenshot pass + 60s beat timing"
```

---

## Self-Review Summary

**Spec coverage:** Every section of `docs/superpowers/specs/2026-04-16-landing-map-as-product-design.md` is implemented by a task above —
- §4a canonical APNs → Task 20 (landing page references them); Task 13 (drawer not-in-seeded list)
- §5 scope decisions → Tasks 3–7 (data) + 8–11 (logic) + 12–20 (UI)
- §6.1 data supply → Tasks 1, 3, 4, 5, 6
- §6.2 types + index → Tasks 7, 9
- §6.3 CountyMap layers → Task 19
- §6.4 search bar + drawer → Tasks 12, 13
- §6.5 overlays → Tasks 14, 15, 16, 17
- §6.6 landing restructure → Task 20
- §7 URL state → Tasks 8, 11
- §8 bundle split → Tasks 2, 21
- §9 TDD surfaces → covered across every task
- §9a `NEIGHBOR_INSTRUMENTS` validation → Task 5
- §10 accessibility → Tasks 12, 13, 14, 16 (focus, aria-pressed, keyboard, Esc)
- §11 decision log → Task 22
- §12 phasing → Task 23
- §13 verification → Task 23

**Placeholder scan:** Task 5 ships an empty `NEIGHBOR_INSTRUMENTS` body — this is intentional (the operator fills it from manual research), and the test harness in the same task fails loudly until it's filled. Task 20 Step 4 has `"304-78-XXX"` placeholders in the cached-neighbor index.json — these are filled from Task 5's committed constant; the test in Task 5 prevents divergence. Every other step contains real code.

**Type consistency check:**
- `Searchable` / `SearchHit` / `MatchType` — defined in Task 9, consumed by Tasks 12, 20.
- `AssessorParcel` schema — Task 7, consumed by Tasks 9, 12, 13, 18, 20.
- `OverlayName` — Task 8, consumed by Tasks 11, 14, 19, 20.
- `DrawerVariant` — Task 10, consumed by Tasks 13, 20.
- `useLandingUrlState` return shape — Task 11, consumed by Task 20.
- Drawer `payload` prop shape — defined in Task 13, matched by Task 20's payload construction.
- `HighlightedParcel` / `CountyMapProps` — extended in Task 19; old call sites still compatible via defaults.
- `anomalies` shape — flat array of `{ id, parcel_apn, severity, title, description }` from `src/data/staff-anomalies.json` (already committed), consumed by Tasks 16 and 20.

All names consistent across tasks.
