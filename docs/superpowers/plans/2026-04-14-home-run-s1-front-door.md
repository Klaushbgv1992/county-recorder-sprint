# S1 — Public Front Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bland Search Entry with a visually striking county-level map landing at `/`, plus a public county-activity heat map at `/county-activity`. Clicking a highlighted parcel polygon deep-links to its Chain view. Drives public traffic while preserving the abstractor's deep-link workflow beneath.

**Architecture:** One `scripts/fetch-gis.ts` capture script runs once to pull county boundary + parcel polygons from the Maricopa Open Data Portal (ArcGIS REST) into static GeoJSON. Three new components — `CountyMap.tsx` (presentational map wrapper), `LandingPage.tsx` (replaces current Search Entry composition), `ActivityHeatMap.tsx` (county-wide density viz). MapLibre GL via `react-map-gl/maplibre` renders vector tiles + GeoJSON sources. Synthesized activity data in `activity-synthetic.json`. Router gets one new `/county-activity` entry; `/` keeps its path but its component swaps to `LandingPage`.

**Tech Stack:** React 19, react-router v7, Tailwind v4, `maplibre-gl` + `react-map-gl`, vitest + @testing-library/react, TypeScript.

**Spec reference:** `docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md` §4.1.

---

## File Structure

- Create: `scripts/fetch-gis.ts` — ArcGIS REST capture script (standalone node tsx)
- Create: `src/data/maricopa-county-boundary.json` — county outline GeoJSON (from script)
- Create: `src/data/parcels-geo.json` — POPHAM + HOGUE polygons (from script)
- Create: `src/data/activity-synthetic.json` — 30-day plausible recording activity
- Create: `src/components/CountyMap.tsx` — presentational map
- Create: `src/components/LandingPage.tsx` — new `/` composition
- Create: `src/components/ActivityHeatMap.tsx` — `/county-activity` page
- Create: `src/logic/activity-aggregator.ts` — pure bucket-by-day/municipality aggregator (TDD)
- Create: `tests/activity-aggregator.test.ts` — TDD for aggregator
- Create: `tests/county-map.dom.test.tsx` — map click → navigate assertion
- Create: `tests/landing-page.dom.test.tsx` — WHY copy + search-below-map assertions
- Modify: `src/router.tsx` — swap `/` component, add `/county-activity`
- Modify: `src/App.tsx` — may need MapLibre CSS import
- Modify: `tests/routing.test.ts` — assert `/county-activity` matches
- Modify: `package.json` — add `maplibre-gl`, `react-map-gl`, `tsx` (devDep for script)

---

### Task 1: Worktree + dependencies (CHECKPOINT 1)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Create worktree**

Run from repo root (not inside another worktree):
```bash
git worktree add .claude/worktrees/home-run-s1-front-door -b home-run/s1-front-door claude/angry-buck
cd .claude/worktrees/home-run-s1-front-door
```

- [ ] **Step 2: Install deps**

```bash
npm install maplibre-gl@^4 react-map-gl@^7
npm install -D tsx@^4
```

Expected: no peer conflict warnings. `maplibre-gl` ships CSS at `maplibre-gl/dist/maplibre-gl.css`.

- [ ] **Step 3: Import MapLibre CSS in App.tsx**

Modify `src/App.tsx`, add at top (after existing imports):
```typescript
import "maplibre-gl/dist/maplibre-gl.css";
```

- [ ] **Step 4: Verify build still passes**

```bash
npm run build
```
Expected: TypeScript compiles, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/App.tsx
git commit -m "feat(s1): add maplibre-gl + react-map-gl deps and global CSS import"
```

---

### Task 2: fetch-gis.ts capture script (CHECKPOINT 2)

**Files:**
- Create: `scripts/fetch-gis.ts`
- Create: `src/data/maricopa-county-boundary.json`
- Create: `src/data/parcels-geo.json`

Goal: run once, produce static GeoJSON. Script must be committed alongside data so the capture is reproducible.

- [ ] **Step 1: Write fetch-gis.ts**

Create `scripts/fetch-gis.ts`:

```typescript
// scripts/fetch-gis.ts
// One-time capture of county boundary + parcel polygons from Maricopa Open Data.
// Run via: npx tsx scripts/fetch-gis.ts

import fs from "node:fs";
import path from "node:path";

const COUNTY_LAYER =
  "https://services1.arcgis.com/mpVYzdXRFFS8pVCQ/arcgis/rest/services/County_Boundary/FeatureServer/0/query";
const PARCEL_LAYER =
  "https://services1.arcgis.com/mpVYzdXRFFS8pVCQ/arcgis/rest/services/Parcels/FeatureServer/0/query";

const PARCELS = [
  { apn: "304-78-386", owner: "POPHAM CHRISTOPHER/ASHLEY", status: "primary" },
  { apn: "304-77-689", owner: "HOGUE JASON/MICHELE", status: "backup" },
];

async function fetchGeoJson(url: string, where: string): Promise<unknown> {
  const params = new URLSearchParams({
    where,
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function main() {
  const outDir = path.join("src", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const county = await fetchGeoJson(COUNTY_LAYER, "1=1");
  fs.writeFileSync(
    path.join(outDir, "maricopa-county-boundary.json"),
    JSON.stringify(county, null, 2),
  );

  const parcels: Array<unknown> = [];
  for (const p of PARCELS) {
    const apnNoDashes = p.apn.replace(/-/g, "");
    const fc = (await fetchGeoJson(
      PARCEL_LAYER,
      `APN='${apnNoDashes}'`,
    )) as { features: Array<{ properties: Record<string, unknown>; geometry: unknown }> };
    if (!fc.features?.length) {
      throw new Error(`No parcel for ${p.apn}`);
    }
    const feat = fc.features[0];
    feat.properties = {
      ...feat.properties,
      apn: p.apn,
      owner: p.owner,
      corpus_status: p.status,
    };
    parcels.push(feat);
  }

  fs.writeFileSync(
    path.join(outDir, "parcels-geo.json"),
    JSON.stringify({ type: "FeatureCollection", features: parcels }, null, 2),
  );

  console.log("Captured county + parcels.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script**

```bash
npx tsx scripts/fetch-gis.ts
```

Expected output:
```
Captured county + parcels.
```

Expected files:
- `src/data/maricopa-county-boundary.json` with a FeatureCollection of 1 polygon
- `src/data/parcels-geo.json` with a FeatureCollection of 2 parcels

- [ ] **Step 3: Verify parcel polygons have geometry**

Quick sanity inspection:
```bash
node -e "const j=require('./src/data/parcels-geo.json'); console.log(j.features.length, j.features.map(f=>f.properties.apn))"
```
Expected: `2 [ '304-78-386', '304-77-689' ]`

- [ ] **Step 4: If ArcGIS layer URLs 404**

Fallback path if the URLs have drifted — DO NOT fabricate polygons. Instead:
1. Visit `https://gis.maricopa.gov/` and find the current Parcels + County Boundary layers
2. Update the two `*_LAYER` constants in `scripts/fetch-gis.ts`
3. Re-run
4. If still blocked, hand-trace POPHAM + HOGUE from MC Assessor aerial into GeoJSON rings and tag `provenance: "manual_trace"` on properties — document the fallback in a commit message.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-gis.ts src/data/maricopa-county-boundary.json src/data/parcels-geo.json
git commit -m "feat(s1): capture Maricopa county boundary + POPHAM/HOGUE parcels via ArcGIS REST"
```

---

### Task 3: activity-synthetic.json + aggregator (TDD) (CHECKPOINT 3)

**Files:**
- Create: `src/data/activity-synthetic.json`
- Create: `src/logic/activity-aggregator.ts`
- Create: `tests/activity-aggregator.test.ts`

Goal: synthesize 30 days of plausible recording activity, write a pure aggregator, TDD it.

- [ ] **Step 1: Write activity-synthetic.json**

Create `src/data/activity-synthetic.json` with 30-day window ending 2026-04-09 (corpus boundary). Shape:

```json
{
  "generated_at": "2026-04-14",
  "source": "synthetic",
  "window_days": 30,
  "records": [
    { "date": "2026-03-11", "municipality": "Gilbert", "doc_code": "WAR DEED", "count": 47 },
    { "date": "2026-03-11", "municipality": "Gilbert", "doc_code": "DEED TRST", "count": 52 },
    { "date": "2026-03-11", "municipality": "Phoenix", "doc_code": "WAR DEED", "count": 138 }
  ]
}
```

Populate ~30 days × 5 municipalities × 4 doc codes = ~600 records. Use a deterministic generator (do this inline — do not commit the generator script, commit only the data). Distribution target: ~300 instruments/day county-wide, weighted ~45% Phoenix, ~15% Mesa, ~12% Scottsdale, ~10% Chandler, ~8% Gilbert, ~10% other.

- [ ] **Step 2: Write failing aggregator test**

Create `tests/activity-aggregator.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run, verify failure**

```bash
npm test -- tests/activity-aggregator.test.ts
```
Expected: FAIL — `aggregateActivity` not defined.

- [ ] **Step 4: Implement aggregator**

Create `src/logic/activity-aggregator.ts`:

```typescript
// src/logic/activity-aggregator.ts
export interface ActivityRecord {
  date: string; // YYYY-MM-DD
  municipality: string;
  doc_code: string;
  count: number;
}

export interface AggregateOptions {
  groupBy: "municipality" | "date" | "doc_code";
  windowDays?: number;
  referenceDate?: string;
}

export interface AggregateBucket {
  key: string;
  total: number;
}

export function aggregateActivity(
  records: ActivityRecord[],
  opts: AggregateOptions,
): AggregateBucket[] {
  const filtered = opts.windowDays
    ? records.filter((r) => withinWindow(r.date, opts.windowDays!, opts.referenceDate))
    : records;

  const map = new Map<string, number>();
  for (const r of filtered) {
    const k = r[opts.groupBy];
    map.set(k, (map.get(k) ?? 0) + r.count);
  }

  const sorted = [...map.entries()].map(([key, total]) => ({ key, total }));
  if (opts.groupBy === "date") {
    sorted.sort((a, b) => a.key.localeCompare(b.key));
  } else {
    sorted.sort((a, b) => b.total - a.total);
  }
  return sorted;
}

function withinWindow(dateStr: string, windowDays: number, ref?: string): boolean {
  const referenceDate = ref ? new Date(ref) : new Date();
  const target = new Date(dateStr);
  const diffMs = referenceDate.getTime() - target.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < windowDays;
}
```

- [ ] **Step 5: Run, verify pass**

```bash
npm test -- tests/activity-aggregator.test.ts
```
Expected: PASS all 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/data/activity-synthetic.json src/logic/activity-aggregator.ts tests/activity-aggregator.test.ts
git commit -m "feat(s1): 30-day synthetic activity data + TDD aggregator"
```

---

### Task 4: CountyMap component + tests (CHECKPOINT 4)

**Files:**
- Create: `src/components/CountyMap.tsx`
- Create: `tests/county-map.dom.test.tsx`

Goal: presentational map wrapper that takes `highlightedParcels` prop and emits `onParcelClick(apn)`. MapLibre interactions mocked in tests.

- [ ] **Step 1: Write failing test**

Create `tests/county-map.dom.test.tsx`:

```typescript
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CountyMap } from "../src/components/CountyMap";

vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Source: ({ children }: { children: React.ReactNode }) => <div data-testid="source">{children}</div>,
  Layer: (props: { id: string }) => <div data-testid={`layer-${props.id}`} />,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
}));

describe("CountyMap", () => {
  afterEach(() => cleanup());

  it("renders county boundary layer", () => {
    const { getByTestId } = render(
      <CountyMap
        highlightedParcels={[]}
        onParcelClick={vi.fn()}
      />,
    );
    expect(getByTestId("layer-county-boundary-outline")).toBeInTheDocument();
  });

  it("renders a layer per highlighted parcel", () => {
    const { getByTestId } = render(
      <CountyMap
        highlightedParcels={[
          { apn: "304-78-386", status: "primary" },
          { apn: "304-77-689", status: "backup" },
        ]}
        onParcelClick={vi.fn()}
      />,
    );
    expect(getByTestId("layer-parcel-304-78-386-fill")).toBeInTheDocument();
    expect(getByTestId("layer-parcel-304-77-689-fill")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npm test -- tests/county-map.dom.test.tsx
```
Expected: FAIL — `CountyMap` not defined.

- [ ] **Step 3: Implement CountyMap**

Create `src/components/CountyMap.tsx`:

```typescript
// src/components/CountyMap.tsx
import { useMemo, useCallback } from "react";
import Map, { Source, Layer, Marker, MapLayerMouseEvent } from "react-map-gl/maplibre";
import countyBoundary from "../data/maricopa-county-boundary.json";
import parcelsGeo from "../data/parcels-geo.json";

export interface HighlightedParcel {
  apn: string;
  status: "primary" | "backup";
  label?: string;
}

export interface CountyMapProps {
  highlightedParcels: HighlightedParcel[];
  onParcelClick: (apn: string) => void;
  initialViewState?: { longitude: number; latitude: number; zoom: number };
}

const DEFAULT_VIEW = { longitude: -112.05, latitude: 33.45, zoom: 8.5 };

const STATUS_FILL: Record<HighlightedParcel["status"], string> = {
  primary: "#10b981", // emerald-500
  backup: "#f59e0b", // amber-500
};

export function CountyMap({
  highlightedParcels,
  onParcelClick,
  initialViewState = DEFAULT_VIEW,
}: CountyMapProps) {
  const parcelById = useMemo(() => {
    const m = new Map<string, GeoJSON.Feature>();
    for (const f of parcelsGeo.features as GeoJSON.Feature[]) {
      const apn = (f.properties as { apn: string } | null)?.apn;
      if (apn) m.set(apn, f);
    }
    return m;
  }, []);

  const interactiveLayerIds = useMemo(
    () => highlightedParcels.map((p) => `parcel-${p.apn}-fill`),
    [highlightedParcels],
  );

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const layerId = feat.layer?.id ?? "";
      const match = layerId.match(/^parcel-(.+)-fill$/);
      if (match) onParcelClick(match[1]);
    },
    [onParcelClick],
  );

  return (
    <Map
      initialViewState={initialViewState}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={interactiveLayerIds}
      onClick={handleClick}
    >
      <Source id="county-boundary" type="geojson" data={countyBoundary as GeoJSON.FeatureCollection}>
        <Layer
          id="county-boundary-outline"
          type="line"
          paint={{ "line-color": "#1e293b", "line-width": 1.5 }}
        />
      </Source>

      {highlightedParcels.map((p) => {
        const feat = parcelById.get(p.apn);
        if (!feat) return null;
        return (
          <Source
            key={p.apn}
            id={`parcel-${p.apn}`}
            type="geojson"
            data={{ type: "FeatureCollection", features: [feat] }}
          >
            <Layer
              id={`parcel-${p.apn}-fill`}
              type="fill"
              paint={{ "fill-color": STATUS_FILL[p.status], "fill-opacity": 0.55 }}
            />
            <Layer
              id={`parcel-${p.apn}-outline`}
              type="line"
              paint={{ "line-color": STATUS_FILL[p.status], "line-width": 2 }}
            />
          </Source>
        );
      })}
    </Map>
  );
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npm test -- tests/county-map.dom.test.tsx
```
Expected: PASS both tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/CountyMap.tsx tests/county-map.dom.test.tsx
git commit -m "feat(s1): CountyMap with county boundary + parcel highlights"
```

---

### Task 5: LandingPage + route swap (CHECKPOINT 5)

**Files:**
- Create: `src/components/LandingPage.tsx`
- Create: `tests/landing-page.dom.test.tsx`
- Modify: `src/router.tsx`

Goal: replace current `/` search-only view with map-first landing. Map top, existing search input preserved beneath, WHY tooltip on parcel hover.

- [ ] **Step 1: Write failing test**

Create `tests/landing-page.dom.test.tsx`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { LandingPage } from "../src/components/LandingPage";

describe("LandingPage", () => {
  afterEach(() => cleanup());

  it("renders map region + search box below", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText(/Land Custodian Portal/i)).toBeInTheDocument();
  });

  it("renders the moat WHY copy for the map", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/assessor's file/i),
    ).toBeInTheDocument();
  });

  it("renders link to /county-activity", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const activityLink = screen.getByRole("link", { name: /county activity/i });
    expect(activityLink).toHaveAttribute("href", "/county-activity");
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npm test -- tests/landing-page.dom.test.tsx
```
Expected: FAIL — `LandingPage` not defined.

- [ ] **Step 3: Implement LandingPage**

Create `src/components/LandingPage.tsx`:

```typescript
// src/components/LandingPage.tsx
import { useNavigate, Link } from "react-router";
import { CountyMap, HighlightedParcel } from "./CountyMap";
import { SearchEntry } from "./SearchEntry";

const HIGHLIGHTED: HighlightedParcel[] = [
  { apn: "304-78-386", status: "primary", label: "POPHAM" },
  { apn: "304-77-689", status: "backup", label: "HOGUE (counter-example)" },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-semibold text-slate-900">Land Custodian Portal</h1>
        <p className="text-sm text-slate-600">
          Maricopa County Recorder · the authoritative source, presented spatially
        </p>
      </header>

      <section className="relative h-[60vh] min-h-[420px] border-b border-slate-200">
        <CountyMap
          highlightedParcels={HIGHLIGHTED}
          onParcelClick={(apn) => navigate(`/parcel/${apn}`)}
        />
        <aside className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md rounded-lg bg-white/95 p-4 shadow-lg border border-slate-200 backdrop-blur-sm">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Why this map matters.</strong>{" "}
            These polygons come from the county assessor's file. Title plants
            license them via third parties. The recorder system has no APN
            bridge (Known Gap #7) — the county is the only party that can
            serve this spatial layer authoritatively.
          </p>
        </aside>
      </section>

      <section className="px-6 py-8 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-medium text-slate-700 mb-2">
            Or enter a parcel or instrument number directly
          </h2>
          <SearchEntry />
        </div>
      </section>

      <footer className="px-6 py-4 flex justify-between items-center text-xs text-slate-500">
        <Link
          to="/county-activity"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → View county-wide recording activity
        </Link>
        <Link
          to="/moat-compare"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → Compare to a title-plant report
        </Link>
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Wire into router**

Modify `src/router.tsx`. Replace the `/` route component with `LandingPage` and add `/county-activity` (component placeholder until Task 6). Find existing routes array and update:

```typescript
import { LandingPage } from "./components/LandingPage";
// ActivityHeatMap import added in Task 6

export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  // existing routes unchanged
  // /county-activity added in Task 6
];
```

- [ ] **Step 5: Run, verify pass**

```bash
npm test -- tests/landing-page.dom.test.tsx
```
Expected: PASS all 3 tests.

- [ ] **Step 6: Smoke in dev**

```bash
npm run dev
```
Open `http://localhost:5173/`. Verify:
- Map renders with county outline + 2 parcel polygons (green POPHAM, amber HOGUE)
- Clicking POPHAM navigates to `/parcel/304-78-386`
- Search input still works for typed APN entry

- [ ] **Step 7: Commit**

```bash
git add src/components/LandingPage.tsx tests/landing-page.dom.test.tsx src/router.tsx
git commit -m "feat(s1): LandingPage with CountyMap front-door + preserved search below"
```

---

### Task 6: ActivityHeatMap + /county-activity route (CHECKPOINT 6)

**Files:**
- Create: `src/components/ActivityHeatMap.tsx`
- Modify: `src/router.tsx`
- Modify: `tests/routing.test.ts`

Goal: public county-wide density viz with 30/60/90-day filter.

- [ ] **Step 1: Extend routing test**

Add to `tests/routing.test.ts`:

```typescript
it("matches /county-activity", () => {
  const match = matchPath("/county-activity", routes);
  expect(match?.route.path).toBe("/county-activity");
});
```

- [ ] **Step 2: Run, verify failure**

Expected: FAIL — route not yet in `routes[]`.

- [ ] **Step 3: Implement ActivityHeatMap**

Create `src/components/ActivityHeatMap.tsx`:

```typescript
// src/components/ActivityHeatMap.tsx
import { useState, useMemo } from "react";
import { Link } from "react-router";
import activity from "../data/activity-synthetic.json";
import {
  aggregateActivity,
  ActivityRecord,
} from "../logic/activity-aggregator";

const WINDOWS = [30, 60, 90] as const;

export function ActivityHeatMap() {
  const [windowDays, setWindowDays] = useState<number>(30);

  const byMunicipality = useMemo(
    () =>
      aggregateActivity(activity.records as ActivityRecord[], {
        groupBy: "municipality",
        windowDays,
        referenceDate: "2026-04-09",
      }),
    [windowDays],
  );

  const byDate = useMemo(
    () =>
      aggregateActivity(activity.records as ActivityRecord[], {
        groupBy: "date",
        windowDays,
        referenceDate: "2026-04-09",
      }),
    [windowDays],
  );

  const max = Math.max(...byMunicipality.map((b) => b.total), 1);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <nav className="mb-6 text-sm">
        <Link to="/" className="text-slate-600 underline underline-offset-2">
          ← Back to portal
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          County Recording Activity
        </h1>
        <p className="text-sm text-slate-600">
          Last 30 days · indexed through 2026-04-09 · synthesized for demo
        </p>
      </header>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-slate-700">Window:</span>
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWindowDays(w)}
            className={`px-3 py-1 text-sm rounded-md border ${
              windowDays === w
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300"
            }`}
          >
            {w} days
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            By municipality
          </h2>
          <ul className="space-y-2">
            {byMunicipality.map((b) => (
              <li key={b.key} className="flex items-center gap-3">
                <span className="w-28 text-xs text-slate-700">{b.key}</span>
                <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(b.total / max) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-mono text-slate-900">
                  {b.total.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Daily volume
          </h2>
          <p className="text-xs text-slate-500 mb-2">
            Title plants typically lag indexing by 14–28 days.{" "}
            <strong>This view updates nightly.</strong>
          </p>
          <div className="flex items-end gap-px h-32">
            {byDate.map((b) => (
              <div
                key={b.key}
                title={`${b.key}: ${b.total}`}
                className="flex-1 bg-slate-700"
                style={{
                  height: `${(b.total / Math.max(...byDate.map((x) => x.total))) * 100}%`,
                  minHeight: "2px",
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Add route**

Modify `src/router.tsx`:

```typescript
import { ActivityHeatMap } from "./components/ActivityHeatMap";

// add to routes[]:
{ path: "/county-activity", element: <ActivityHeatMap /> },
```

- [ ] **Step 5: Run, verify routing test passes**

```bash
npm test -- tests/routing.test.ts
```
Expected: PASS.

- [ ] **Step 6: Smoke in dev**

Open `http://localhost:5173/county-activity`. Verify:
- Municipality bars render (Phoenix largest)
- Daily volume bars render
- 30/60/90 toggle updates both charts

- [ ] **Step 7: Commit**

```bash
git add src/components/ActivityHeatMap.tsx src/router.tsx tests/routing.test.ts
git commit -m "feat(s1): /county-activity public heat map with window filter"
```

---

### Task 7: Integration smoke + accessibility polish (CHECKPOINT 7)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: clean build, no type errors.

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: clean.

- [ ] **Step 4: Manual checklist**

- [ ] `/` landing renders map + search below
- [ ] POPHAM click → `/parcel/304-78-386`
- [ ] HOGUE click → `/parcel/304-77-689`
- [ ] Clicking outside highlighted parcels does nothing
- [ ] `/county-activity` renders both charts
- [ ] 30 / 60 / 90 toggle re-renders both charts
- [ ] Footer links to `/moat-compare` + `/county-activity`
- [ ] WHY tooltip copy is readable and specific (mentions assessor file + Gap #7)
- [ ] Mobile viewport (Chrome DevTools 375px width) — map usable, search box reachable, no horizontal scroll

- [ ] **Step 5: Verification skill**

Invoke `superpowers:verification-before-completion` to confirm no false success claims.

- [ ] **Step 6: Request code review**

Invoke `superpowers:requesting-code-review` per its checklist. Address findings.

- [ ] **Step 7: Ready-to-merge commit**

```bash
git commit --allow-empty -m "chore(s1): ready to merge — CHECKPOINT 7 passed"
```

---

## Merge handoff

- Branch: `home-run/s1-front-door`
- Consumer of this work: **S2** reads `src/data/parcels-geo.json` directly; no refactor needed on S2's side.
- Merge order position: **first** (per spec §5.2).
- After merge, consolidator runs: `npm test && npm run lint && npm run build`.
