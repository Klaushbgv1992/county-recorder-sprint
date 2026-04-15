# S2 — Spatial Context on Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/parcel/:apn` and `/parcel/:apn/encumbrances`, add a resizable right-hand `SpatialContextPanel` that shows the subject parcel polygon, the Seville Parcel 3 subdivision boundary, adjacent parcels, and instrument pins. Clicking the subdivision line opens the Proof Drawer on the plat `20010093192`; clicking the affidavit pin opens `20010849180`; clicking the subject polygon opens the most recent instrument. Hover tooltip shows APN + lot + subdivision + acreage + book/page.

**Architecture:** One new presentational component `SpatialContextPanel.tsx`, one pure logic module `instrument-markers.ts` (maps parcel geometry + instrument list → marker positions, TDD'd), two new data files (subdivision boundary + adjacent parcels). The panel is mounted as a right column on the two chain routes with `localStorage`-persisted collapse state. Instrument-pin click dispatches the existing Proof Drawer open event; subject-polygon click resolves to the most recent instrument via the existing parcel loader.

**Tech Stack:** React 19, react-router v7, Tailwind v4, `maplibre-gl` + `react-map-gl`, vitest + @testing-library/react, TypeScript.

**Spec reference:** `docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md` §4.2.

**Upstream dependency:** S1 has landed `src/data/parcels-geo.json`. If developing in parallel before S1 merges, stub that file with two hand-traced polygons and delete the stub before merging to integration branch.

---

## File Structure

- Create: `src/components/SpatialContextPanel.tsx` — the map panel
- Create: `src/logic/instrument-markers.ts` — pure pin-placement logic (centroid, offset, clamp)
- Create: `src/data/subdivision-plats.json` — Seville Parcel 3 boundary GeoJSON
- Create: `src/data/adjacent-parcels.json` — ~20 neighbor polygons from ArcGIS
- Create: `tests/instrument-markers.test.ts` — TDD for pin placement
- Create: `tests/spatial-context-panel.dom.test.tsx` — panel interaction tests
- Modify: `scripts/fetch-gis.ts` (owned by S1) — extend to also fetch adjacent parcels; if script already merged, add a `scripts/fetch-adjacent.ts` instead
- Modify: `src/components/ChainOfTitle.tsx` — mount the panel on right column
- Modify: `src/components/EncumbranceLifecycle.tsx` — mount the panel on right column

---

### Task 1: Worktree + adjacent-parcels capture (CHECKPOINT 1)

**Files:**
- Create: `scripts/fetch-adjacent.ts`
- Create: `src/data/adjacent-parcels.json`

- [ ] **Step 1: Create worktree**

From repo root:
```bash
git worktree add .claude/worktrees/home-run-s2-spatial-context -b home-run/s2-spatial-context claude/angry-buck
cd .claude/worktrees/home-run-s2-spatial-context
```

- [ ] **Step 2: Write fetch-adjacent.ts**

Create `scripts/fetch-adjacent.ts`:

```typescript
// scripts/fetch-adjacent.ts
// One-time capture of ~20 neighboring parcels around POPHAM + HOGUE.

import fs from "node:fs";
import path from "node:path";

const PARCEL_LAYER =
  "https://services1.arcgis.com/mpVYzdXRFFS8pVCQ/arcgis/rest/services/Parcels/FeatureServer/0/query";

async function fetchGeoJson(where: string): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({
    where,
    outFields: "APN,OWNER_NAME,SUBDIVISION,SITUS_ADDRESS",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: "25",
  });
  const res = await fetch(`${PARCEL_LAYER}?${params}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function main() {
  const sevilleP3 = await fetchGeoJson("SUBDIVISION LIKE 'SEVILLE PARCEL 3%'");
  const shamrock = await fetchGeoJson("SUBDIVISION LIKE 'SHAMROCK ESTATES%'");
  const all = [...sevilleP3.features, ...shamrock.features];
  fs.writeFileSync(
    path.join("src", "data", "adjacent-parcels.json"),
    JSON.stringify({ type: "FeatureCollection", features: all }, null, 2),
  );
  console.log(`Captured ${all.length} adjacent parcels.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run the script**

```bash
npx tsx scripts/fetch-adjacent.ts
```
Expected: `Captured NN adjacent parcels.` where NN is between 15 and 50.

- [ ] **Step 4: Fallback if subdivision filter fails**

If `SUBDIVISION LIKE` returns 0, try spatial query instead. Replace the two fetches with a bounding-box query around each subject parcel (pull POPHAM + HOGUE centroids from `src/data/parcels-geo.json`, expand by ~400m, `geometry=<envelope>&spatialRel=esriSpatialRelIntersects`). Document the fallback in the commit message.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-adjacent.ts src/data/adjacent-parcels.json
git commit -m "feat(s2): capture ~20 adjacent parcels for Seville Parcel 3 + Shamrock Estates"
```

---

### Task 2: Seville Parcel 3 subdivision boundary (CHECKPOINT 2)

**Files:**
- Create: `src/data/subdivision-plats.json`

Goal: capture the Seville Parcel 3 boundary as GeoJSON with provenance. Hand-traced from plat PDF if ArcGIS subdivision layer is unreachable.

- [ ] **Step 1: Try ArcGIS subdivision layer first**

Extend `scripts/fetch-adjacent.ts` or write `scripts/fetch-subdivisions.ts` that queries the Maricopa Open Data Portal subdivisions FeatureServer (search for "Subdivisions" layer). Query:
```
where=SUBDIVISION_NAME LIKE 'SEVILLE PARCEL 3%'
```

- [ ] **Step 2: If layer missing, derive boundary from union of adjacent parcels**

Compute the geometric union of all `adjacent-parcels.json` features with `SUBDIVISION = 'SEVILLE PARCEL 3'` using a lightweight utility like `@turf/turf` (`turf.union`). Install ad-hoc for this step only:
```bash
npm install -D @turf/turf
```

- [ ] **Step 3: Write subdivision-plats.json**

Shape:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "subdivision_id": "seville-parcel-3",
        "display_name": "Seville Parcel 3",
        "plat_instrument": "20010093192",
        "plat_book": "554",
        "plat_page": "19",
        "dedicated_by": "SHEA HOMES",
        "dedication_date": "2001-01-30",
        "parent_plat_reference": "Book 553 Page 15 (Seville Tract H)",
        "parent_plat_recoverable": false,
        "parent_plat_hunt_log": "data/raw/R-005/hunt-log.md",
        "provenance": "api_union",
        "source": "Maricopa Open Data Parcels layer, union by SUBDIVISION"
      },
      "geometry": { "type": "Polygon", "coordinates": [[/* ring */]] }
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/data/subdivision-plats.json scripts/fetch-subdivisions.ts
git commit -m "feat(s2): Seville Parcel 3 boundary with plat + parent-plat provenance"
```

If @turf/turf was installed only for capture, uninstall before commit:
```bash
npm uninstall @turf/turf
```

---

### Task 3: instrument-markers.ts TDD (CHECKPOINT 3)

**Files:**
- Create: `src/logic/instrument-markers.ts`
- Create: `tests/instrument-markers.test.ts`

Goal: pure function taking a parcel polygon + instrument list → marker positions. Used to place pins for the plat instrument (subdivision centroid), the affidavit of correction (on affected lot), and future instruments.

- [ ] **Step 1: Write failing tests**

Create `tests/instrument-markers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  markerForInstrument,
  MarkerInput,
} from "../src/logic/instrument-markers";

const square: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
};

describe("markerForInstrument", () => {
  it("places a subdivision-plat marker at polygon centroid", () => {
    const input: MarkerInput = {
      instrument_number: "20010093192",
      document_type: "SUBDIVISION PLAT",
      geometry: square,
    };
    const pos = markerForInstrument(input);
    expect(pos.longitude).toBeCloseTo(5, 2);
    expect(pos.latitude).toBeCloseTo(5, 2);
  });

  it("places an affidavit-of-correction marker offset from centroid", () => {
    const input: MarkerInput = {
      instrument_number: "20010849180",
      document_type: "AFFIDAVIT OF CORRECTION",
      geometry: square,
    };
    const pos = markerForInstrument(input);
    // Offset should be non-zero to avoid overlap with plat marker
    expect(pos.longitude).not.toBeCloseTo(5, 2);
  });

  it("returns null for instrument with no geometry", () => {
    const input: MarkerInput = {
      instrument_number: "X",
      document_type: "WAR DEED",
      geometry: null,
    };
    expect(markerForInstrument(input)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npm test -- tests/instrument-markers.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement marker placement**

Create `src/logic/instrument-markers.ts`:

```typescript
// src/logic/instrument-markers.ts
export interface MarkerInput {
  instrument_number: string;
  document_type: string;
  geometry: GeoJSON.Polygon | null;
}

export interface MarkerPosition {
  instrument_number: string;
  longitude: number;
  latitude: number;
  icon: "plat" | "correction" | "instrument";
}

const CORRECTION_OFFSET: [number, number] = [0.0001, 0.0001];

export function markerForInstrument(input: MarkerInput): MarkerPosition | null {
  if (!input.geometry) return null;
  const centroid = polygonCentroid(input.geometry);
  const icon = iconFor(input.document_type);
  const offset = icon === "correction" ? CORRECTION_OFFSET : [0, 0];
  return {
    instrument_number: input.instrument_number,
    longitude: centroid[0] + offset[0],
    latitude: centroid[1] + offset[1],
    icon,
  };
}

function iconFor(docType: string): MarkerPosition["icon"] {
  if (/SUBDIV|PLAT/i.test(docType)) return "plat";
  if (/AFFID.*CORRECT/i.test(docType)) return "correction";
  return "instrument";
}

function polygonCentroid(poly: GeoJSON.Polygon): [number, number] {
  const ring = poly.coordinates[0];
  let x = 0;
  let y = 0;
  const n = ring.length - 1; // last point repeats first
  for (let i = 0; i < n; i++) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return [x / n, y / n];
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npm test -- tests/instrument-markers.test.ts
```
Expected: PASS all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/logic/instrument-markers.ts tests/instrument-markers.test.ts
git commit -m "feat(s2): instrument-markers pure placement logic with TDD"
```

---

### Task 4: SpatialContextPanel component (CHECKPOINT 4)

**Files:**
- Create: `src/components/SpatialContextPanel.tsx`
- Create: `tests/spatial-context-panel.dom.test.tsx`

Goal: render layered map + tooltip + click handlers that navigate to `/parcel/:apn/instrument/:n`. Collapse state persists to localStorage.

- [ ] **Step 1: Write failing test**

Create `tests/spatial-context-panel.dom.test.tsx`:

```typescript
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { SpatialContextPanel } from "../src/components/SpatialContextPanel";

vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Source: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Layer: (props: { id: string }) => <div data-testid={`layer-${props.id}`} />,
  Marker: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick} data-testid="marker">{children}</button>
  ),
}));

describe("SpatialContextPanel", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders for POPHAM with subject layer + subdivision layer", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("layer-subject-304-78-386-fill")).toBeInTheDocument();
    expect(screen.getByTestId("layer-seville-parcel-3-outline")).toBeInTheDocument();
  });

  it("shows WHY copy about custody chain", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/custody chain/i)).toBeInTheDocument();
  });

  it("toggle button collapses panel and persists state", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    const toggle = screen.getByRole("button", { name: /collapse panel/i });
    fireEvent.click(toggle);
    expect(localStorage.getItem("spatial-panel-collapsed")).toBe("true");
  });

  it("links to Maricopa Assessor in a new tab", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /open in mc assessor/i });
    expect(link).toHaveAttribute("href", "https://mcassessor.maricopa.gov/mcs/?q=30478386&mod=pd");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npm test -- tests/spatial-context-panel.dom.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement panel**

Create `src/components/SpatialContextPanel.tsx`:

```typescript
// src/components/SpatialContextPanel.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import parcelsGeo from "../data/parcels-geo.json";
import subdivisionPlats from "../data/subdivision-plats.json";
import adjacentParcels from "../data/adjacent-parcels.json";
import { markerForInstrument, MarkerInput } from "../logic/instrument-markers";

const COLLAPSE_KEY = "spatial-panel-collapsed";

const MARKER_INPUTS: MarkerInput[] = [
  {
    instrument_number: "20010093192",
    document_type: "SUBDIVISION PLAT",
    geometry: (subdivisionPlats.features[0].geometry as GeoJSON.Polygon) ?? null,
  },
  {
    instrument_number: "20010849180",
    document_type: "AFFIDAVIT OF CORRECTION",
    geometry: (subdivisionPlats.features[0].geometry as GeoJSON.Polygon) ?? null,
  },
];

const SUBDIVISION_BY_APN: Record<string, string> = {
  "304-78-386": "seville-parcel-3",
};

export interface SpatialContextPanelProps {
  apn: string;
}

export function SpatialContextPanel({ apn }: SpatialContextPanelProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === "true",
  );

  const subject = useMemo(
    () =>
      (parcelsGeo.features as GeoJSON.Feature[]).find(
        (f) => (f.properties as { apn?: string } | null)?.apn === apn,
      ),
    [apn],
  );

  const subdivisionId = SUBDIVISION_BY_APN[apn];
  const subdivision = useMemo(
    () =>
      subdivisionId
        ? subdivisionPlats.features.find(
            (f) => (f.properties as { subdivision_id?: string } | null)?.subdivision_id === subdivisionId,
          )
        : undefined,
    [subdivisionId],
  );

  const markers = useMemo(
    () => MARKER_INPUTS.map(markerForInstrument).filter(Boolean),
    [],
  );

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, String(next));
  }

  if (!subject) {
    return (
      <aside className="border-l border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No spatial data for APN {apn}.
      </aside>
    );
  }

  const props = subject.properties as {
    apn?: string;
    SITUS_ADDRESS?: string;
    SUBDIVISION?: string;
    OWNER_NAME?: string;
  } | null;

  return (
    <aside
      className={`border-l border-slate-200 bg-white flex flex-col ${
        collapsed ? "w-10" : "w-full md:w-[40%]"
      }`}
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <h3 className={`text-sm font-semibold text-slate-900 ${collapsed ? "sr-only" : ""}`}>
          Spatial context
        </h3>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          className="text-slate-500 hover:text-slate-900 text-lg"
        >
          {collapsed ? "»" : "«"}
        </button>
      </header>

      {!collapsed && (
        <>
          <div className="flex-1 min-h-[320px] relative">
            <Map
              initialViewState={{ longitude: -111.75, latitude: 33.345, zoom: 15 }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              style={{ width: "100%", height: "100%" }}
            >
              <Source id="adjacent" type="geojson" data={adjacentParcels as GeoJSON.FeatureCollection}>
                <Layer
                  id="adjacent-outline"
                  type="line"
                  paint={{ "line-color": "#94a3b8", "line-width": 0.5 }}
                />
              </Source>

              {subdivision && (
                <Source id="subdivision" type="geojson" data={{ type: "FeatureCollection", features: [subdivision] }}>
                  <Layer
                    id="seville-parcel-3-outline"
                    type="line"
                    paint={{ "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [2, 2] }}
                  />
                </Source>
              )}

              <Source id="subject" type="geojson" data={{ type: "FeatureCollection", features: [subject] }}>
                <Layer
                  id={`subject-${apn}-fill`}
                  type="fill"
                  paint={{ "fill-color": "#10b981", "fill-opacity": 0.45 }}
                />
                <Layer
                  id={`subject-${apn}-outline`}
                  type="line"
                  paint={{ "line-color": "#065f46", "line-width": 2 }}
                />
              </Source>

              {markers.map((m) => (
                <Marker
                  key={m!.instrument_number}
                  longitude={m!.longitude}
                  latitude={m!.latitude}
                  onClick={() => navigate(`/parcel/${apn}/instrument/${m!.instrument_number}`)}
                >
                  <span
                    title={m!.icon === "plat" ? "Subdivision plat" : m!.icon === "correction" ? "Affidavit of correction" : "Instrument"}
                    className="inline-block w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow"
                  />
                </Marker>
              ))}
            </Map>
          </div>

          <section className="px-3 py-3 border-t border-slate-200 text-xs text-slate-700 space-y-1">
            <div>
              <strong className="font-mono text-slate-900">{props?.apn ?? apn}</strong>
              {props?.SITUS_ADDRESS && <span> · {props.SITUS_ADDRESS}</span>}
            </div>
            {props?.SUBDIVISION && <div>{props.SUBDIVISION}</div>}
            <p className="text-[11px] text-slate-600 leading-snug pt-2">
              <strong>Why this layer.</strong> Subdivision plat recorded
              2001-01-30 as resubdivision of SEVILLE TRACT H (Book 553 P15).
              That root plat exists only in the county's book index — not
              recoverable via public API. The moat isn't the polygon, it's
              the custody chain behind it.
            </p>
            <a
              href={`https://mcassessor.maricopa.gov/mcs/?q=${apn.replace(/-/g, "")}&mod=pd`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-[11px] underline underline-offset-2 text-slate-700"
            >
              Open in MC Assessor →
            </a>
          </section>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npm test -- tests/spatial-context-panel.dom.test.tsx
```
Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/SpatialContextPanel.tsx tests/spatial-context-panel.dom.test.tsx
git commit -m "feat(s2): SpatialContextPanel with layered map + WHY copy + persist collapse"
```

---

### Task 5: Wire panel into Chain + Encumbrance routes (CHECKPOINT 5)

**Files:**
- Modify: `src/components/ChainOfTitle.tsx`
- Modify: `src/components/EncumbranceLifecycle.tsx`

Goal: mount the panel on the right side of both parcel-scoped routes. Chain timeline stays primary ~60%, panel ~40%. Mobile collapses panel by default.

- [ ] **Step 1: Add panel to ChainOfTitle**

Modify `src/components/ChainOfTitle.tsx`. Find the outer layout container and wrap it plus the new panel in a flex row:

```typescript
import { SpatialContextPanel } from "./SpatialContextPanel";

// inside the component's return:
return (
  <div className="flex min-h-screen">
    <div className="flex-1 min-w-0">
      {/* existing Chain-of-Title content */}
    </div>
    <SpatialContextPanel apn={apn} />
  </div>
);
```

- [ ] **Step 2: Add panel to EncumbranceLifecycle**

Same pattern in `src/components/EncumbranceLifecycle.tsx`.

- [ ] **Step 3: Run existing tests to ensure no regression**

```bash
npm test
```
Expected: all tests pass. If any existing Chain/Encumbrance DOM tests query by layout (unlikely), fix by wrapping in the new flex layout-aware matchers.

- [ ] **Step 4: Smoke in dev**

```bash
npm run dev
```
Navigate to `http://localhost:5173/parcel/304-78-386` and `/parcel/304-78-386/encumbrances`. Verify:
- Chain renders on left
- Map renders on right with green POPHAM polygon
- Seville Parcel 3 dashed amber boundary visible
- Two pins visible (plat centroid + correction offset)
- Clicking a pin opens Proof Drawer on that instrument
- Hover on subject polygon shows APN + address
- Collapse button shrinks panel to 40px strip; reload keeps it collapsed

- [ ] **Step 5: Commit**

```bash
git add src/components/ChainOfTitle.tsx src/components/EncumbranceLifecycle.tsx
git commit -m "feat(s2): mount SpatialContextPanel on Chain + Encumbrance routes"
```

---

### Task 6: Integration smoke + ready-to-merge (CHECKPOINT 6)

- [ ] **Step 1: Full test run**

```bash
npm test && npm run lint && npm run build
```
Expected: clean.

- [ ] **Step 2: Manual checklist**

- [ ] `/parcel/304-78-386` — panel right-side renders with POPHAM polygon
- [ ] `/parcel/304-78-386/encumbrances` — same panel renders
- [ ] Seville Parcel 3 dashed amber boundary visible
- [ ] Plat pin click → Proof Drawer opens on `20010093192`
- [ ] Affidavit pin click → Proof Drawer opens on `20010849180`
- [ ] MC Assessor link opens `mcassessor.maricopa.gov/mcs/?q=30478386&mod=pd` in new tab
- [ ] Collapse → reload → still collapsed
- [ ] HOGUE parcel `/parcel/304-77-689` — panel renders (no subdivision overlay, no pins — subdivision lookup for HOGUE returns undefined, panel still shows subject polygon)
- [ ] Mobile viewport: panel collapsed by default when `window.innerWidth < 768`

If HOGUE panel needs its own copy about "no linked subdivision in corpus", add an inline message in the tail `<section>`.

- [ ] **Step 3: Verification skill**

Invoke `superpowers:verification-before-completion`.

- [ ] **Step 4: Code review**

Invoke `superpowers:requesting-code-review`. Address findings.

- [ ] **Step 5: Ready-to-merge**

```bash
git commit --allow-empty -m "chore(s2): ready to merge — CHECKPOINT 6 passed"
```

---

## Merge handoff

- Branch: `home-run/s2-spatial-context`
- Upstream consumer: none
- Upstream dependency: `src/data/parcels-geo.json` from **S1** (merged first per §5.2)
- Merge order position: **fourth** (after S1, S4B banner, S3A anomaly)
- After merge, consolidator runs: `npm test && npm run lint && npm run build`.
