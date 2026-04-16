# Landing Map — Functional Street-Level Entry Point — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-04-15-landing-map-functional-design.md`

**Goal:** Convert the homepage map from a county-wide decoration into a functional street-level entry point — three visible parcel polygons (POPHAM, HOGUE, HOA tract), a hover popup with examiner-relevant context, a legend that doubles as the click affordance, and a "Fit county" zoom-out escape hatch.

**Architecture:** Default zoom 15 centered on the computed midpoint of POPHAM↔HOGUE centroids. Mobile (<768px) falls back to fitBounds with `maxZoom: 15`. Hover popup renders one of two variants based on a `parcel.type` flag (residential vs subdivision_common). Legend lives top-right with mobile collapse to a `ⓘ` icon. No activity overlay (redundant with Terminal 3's verified-through banner). All labels respect the Plain-English `<Term>` toggle.

**Tech Stack:** React 19, TypeScript, MapLibre GL via `react-map-gl/maplibre`, Tailwind v4, vitest, Zod schemas.

**Coordination:** PR #2 (Terminal 4 / landing-credibility) recently merged to `main` adding a persona row, Featured framing, and OG meta tags to `LandingPage.tsx` and `index.html`. **Rebase this branch onto current `main` before opening a PR** — Task 1 below.

---

## File Plan

| File | Responsibility | New/Modified |
|---|---|---|
| `scripts/fetch-gis.ts` | Add `304-78-409` to `PARCELS` array; re-run to fetch HOA tract polygon | Modified |
| `src/data/parcels-geo.json` | Now contains 3 features (POPHAM + HOGUE + HOA tract) | Regenerated |
| `src/data/parcels.json` | Add `type: "residential" \| "subdivision_common"` field; HOA tract gets `subdivision_common` | Modified |
| `src/schemas.ts` | Extend `Parcel` schema with optional `type` field | Modified |
| `src/terminology/glossary.ts` | Add `"lifecycle"` singular entry | Modified |
| `src/logic/compute-map-center.ts` | Pure function: midpoint of N parcel centroids | New (TDD) |
| `src/logic/popup-data.ts` | Pure resolver: APN → popup display fields | New (TDD) |
| `src/components/MapLegend.tsx` | Top-right legend panel + mobile `ⓘ` collapse | New |
| `src/components/MapPopup.tsx` | Hover popup with two variants | New |
| `src/components/MapZoomControls.tsx` | "Fit county" + "Reset view" custom map controls | New |
| `src/components/CountyMap.tsx` | Zoom 15 default, mobile fitBounds fallback, HOA tract layer, popup wiring, legend wiring, controls wiring | Modified |
| `src/components/LandingPage.tsx` | Pass 3 highlighted parcels (add HOA tract) | Modified |

---

## Task 1: Rebase onto current `main`

**Why:** PR #2 (Terminal 4) recently merged. The current worktree was branched before that merge and may conflict during PR review.

- [ ] **Step 1: Fetch latest main**

```bash
git fetch origin main
```

- [ ] **Step 2: Show what's new on main since branch point**

```bash
git log --oneline HEAD..origin/main
```

Expected: a few commits from Terminal 4 (persona row, Featured framing, OG meta tags) and possibly Terminal 3 progress.

- [ ] **Step 3: Rebase**

```bash
git rebase origin/main
```

- [ ] **Step 4: If rebase has conflicts, resolve them**

Most likely conflict file: `src/components/LandingPage.tsx` (Terminal 4 added persona row). Resolve by keeping Terminal 4's persona row in place; this plan's changes to `LandingPage.tsx` (Task 9) are limited to the `<HIGHLIGHTED>` constant and don't touch the persona row region.

If conflict: edit, then `git add <file>` and `git rebase --continue`.

- [ ] **Step 5: Verify the rebase finished cleanly**

```bash
git status
```

Expected: `On branch feature/landing-map. Your branch is ahead of 'origin/main' by N commits.`

- [ ] **Step 6: Re-run baseline tests after rebase**

```bash
npm test 2>&1 | tail -10
```

Expected: 0 failures (rebased changes shouldn't break tests).

---

## Task 2: Fetch the HOA tract polygon

**Files:**
- Modify: `scripts/fetch-gis.ts`
- Regenerate: `src/data/parcels-geo.json`

- [ ] **Step 1: Extend the PARCELS array in `scripts/fetch-gis.ts`**

Open `scripts/fetch-gis.ts:13-16`. Replace the `PARCELS` array with:

```typescript
const PARCELS = [
  { apn: "304-78-386", owner: "POPHAM CHRISTOPHER/ASHLEY", status: "primary" },
  { apn: "304-77-689", owner: "HOGUE JASON/MICHELE", status: "backup" },
  { apn: "304-78-409", owner: "SEVILLE HOMEOWNERS ASSOCIATION", status: "subdivision_common" },
];
```

- [ ] **Step 2: Run the fetcher**

```bash
npx tsx scripts/fetch-gis.ts
```

Expected: `Captured county + parcels.` and no error.

If the request 404s for `304-78-409`, fall back to **Task 2-Fallback** below.

- [ ] **Step 3: Verify `parcels-geo.json` now contains 3 features**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('src/data/parcels-geo.json','utf8')).features.length)"
```

Expected: `3`

- [ ] **Step 4: Verify the HOA feature has the right APN and owner**

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('src/data/parcels-geo.json','utf8'));const f=d.features.find(x=>x.properties.apn==='304-78-409');console.log(f?.properties?.owner, f?.properties?.corpus_status)"
```

Expected: `SEVILLE HOMEOWNERS ASSOCIATION subdivision_common`

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-gis.ts src/data/parcels-geo.json
git commit -m "data(landing-map): add HOA tract polygon (304-78-409) to parcels-geo

Re-runs scripts/fetch-gis.ts with TRACT A added to PARCELS. Source:
Maricopa County Assessor parcels GIS layer, same source as POPHAM
and HOGUE. Tagged corpus_status: subdivision_common."
```

### Task 2-Fallback (only if Step 2 returns no features)

If `gis.mcassessor.maricopa.gov` does not return a feature for `APN_DASH='304-78-409'`, do this manually:

- [ ] Go to `https://mcassessor.maricopa.gov/mcs/?q=30478409&mod=pd` in a browser
- [ ] Open the assessor parcel viewer; eyeball the tract polygon shape next to POPHAM (which is Lot 46 immediately north or south)
- [ ] Open `src/data/parcels-geo.json` and append a feature with a hand-traced 5-vertex polygon approximating the tract bounds, with `properties.apn = "304-78-409"`, `properties.owner = "SEVILLE HOMEOWNERS ASSOCIATION"`, `properties.corpus_status = "subdivision_common"`, and `properties.provenance = "manual_trace"` so the data origin is honest
- [ ] Verify the polygon renders by running `npm run dev` and inspecting the map; if the tract overlaps POPHAM weirdly, adjust the vertices

Either path produces the same `parcels-geo.json` shape; downstream tasks don't care which.

---

## Task 3: Extend `Parcel` schema with `type` field

**Files:**
- Modify: `src/schemas.ts:115-130`
- Modify: `src/data/parcels.json`

- [ ] **Step 1: Add `type` to the `Parcel` Zod schema**

Open `src/schemas.ts:115-130`. Replace the `Parcel` block with:

```typescript
export const Parcel = z.object({
  apn: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string().length(2),
  zip: z.string(),
  legal_description: z.string(),
  current_owner: z.string(),
  subdivision: z.string(),
  // Display variant. Drives popup variant on landing map and any future
  // per-type rendering. Omit for legacy residential records (defaults
  // applied at consumer site).
  type: z.enum(["residential", "subdivision_common"]).optional(),
  assessor_url: z.string().optional(),
  recorder_url: z.string().optional(),
  // List of instruments curated for this parcel. Used by multi-parcel
  // data-loader to scope instruments/links/lifecycles to one parcel.
  // Optional for backward compatibility with single-parcel corpora.
  instrument_numbers: z.array(z.string()).optional(),
});
```

- [ ] **Step 2: Set `type` field on each entry in `src/data/parcels.json`**

Open `src/data/parcels.json`. For each parcel object, insert a `"type"` field after `"current_owner"`:

- `304-78-386` (POPHAM): `"type": "residential"`
- `304-77-689` (HOGUE): `"type": "residential"`
- `304-78-409` (HOA tract): `"type": "subdivision_common"`
- `304-78-374` (WARNER): `"type": "residential"`
- `304-78-383` (LOWRY): `"type": "residential"`

Example for the HOA tract:

```json
{
  "apn": "304-78-409",
  "address": "TRACT A, SEVILLE PARCEL 3",
  "city": "Gilbert",
  "state": "AZ",
  "zip": "85295",
  "legal_description": "TRACT A, SEVILLE PARCEL 3, ...",
  "current_owner": "SEVILLE HOMEOWNERS ASSOCIATION",
  "type": "subdivision_common",
  "subdivision": "Seville Parcel 3",
  "assessor_url": "https://mcassessor.maricopa.gov/mcs/?q=30478409&mod=pd",
  "instrument_numbers": ["20010093192", "20010849180"]
}
```

- [ ] **Step 3: Run the existing tests to confirm nothing breaks**

```bash
npm test 2>&1 | tail -10
```

Expected: 0 failures (the field is optional and existing consumers ignore it).

- [ ] **Step 4: Commit**

```bash
git add src/schemas.ts src/data/parcels.json
git commit -m "schema(parcel): add optional type field; set on all 5 parcels

Drives the per-type popup variant in the upcoming landing-map work.
HOA tract gets subdivision_common; other 4 are residential."
```

---

## Task 4: `compute-map-center.ts` (TDD)

**Files:**
- Create: `src/logic/compute-map-center.ts`
- Create: `src/logic/compute-map-center.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/logic/compute-map-center.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  computePolygonCentroid,
  computeMidpoint,
  computeLandingMapCenter,
} from "./compute-map-center";
import parcelsGeo from "../data/parcels-geo.json";

describe("computePolygonCentroid", () => {
  it("returns the average of polygon vertices (excluding the closing vertex)", () => {
    // Square with corners at (0,0), (2,0), (2,2), (0,2), and closing (0,0)
    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
    };
    const c = computePolygonCentroid(polygon);
    expect(c.longitude).toBeCloseTo(1, 6);
    expect(c.latitude).toBeCloseTo(1, 6);
  });

  it("ignores the duplicate closing vertex", () => {
    // Triangle (0,0), (3,0), (0,3), closing (0,0)
    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [3, 0], [0, 3], [0, 0]]],
    };
    const c = computePolygonCentroid(polygon);
    expect(c.longitude).toBeCloseTo(1, 6); // (0+3+0)/3
    expect(c.latitude).toBeCloseTo(1, 6); // (0+0+3)/3
  });
});

describe("computeMidpoint", () => {
  it("averages two coordinates", () => {
    const m = computeMidpoint(
      { longitude: -111.71, latitude: 33.235 },
      { longitude: -111.73, latitude: 33.236 },
    );
    expect(m.longitude).toBeCloseTo(-111.72, 6);
    expect(m.latitude).toBeCloseTo(33.2355, 6);
  });
});

describe("computeLandingMapCenter", () => {
  it("returns the midpoint of POPHAM and HOGUE centroids", () => {
    const c = computeLandingMapCenter(
      ["304-78-386", "304-77-689"],
      parcelsGeo as GeoJSON.FeatureCollection,
    );
    // Sanity: should land between the two known centroids in Gilbert
    expect(c.longitude).toBeGreaterThan(-111.74);
    expect(c.longitude).toBeLessThan(-111.70);
    expect(c.latitude).toBeGreaterThan(33.23);
    expect(c.latitude).toBeLessThan(33.24);
  });

  it("returns the single centroid for a one-APN list", () => {
    const c = computeLandingMapCenter(
      ["304-78-386"],
      parcelsGeo as GeoJSON.FeatureCollection,
    );
    expect(c.longitude).toBeCloseTo(-111.7103, 3);
    expect(c.latitude).toBeCloseTo(33.2358, 3);
  });

  it("throws when an APN is missing from the FeatureCollection", () => {
    expect(() =>
      computeLandingMapCenter(
        ["999-99-999"],
        parcelsGeo as GeoJSON.FeatureCollection,
      ),
    ).toThrow(/999-99-999/);
  });

  it("throws when given an empty APN list", () => {
    expect(() =>
      computeLandingMapCenter([], parcelsGeo as GeoJSON.FeatureCollection),
    ).toThrow(/at least one/i);
  });
});
```

- [ ] **Step 2: Run tests; verify they fail**

```bash
npx vitest run src/logic/compute-map-center.test.ts 2>&1 | tail -10
```

Expected: import errors / fail with "compute-map-center" not found.

- [ ] **Step 3: Implement `compute-map-center.ts`**

Create `src/logic/compute-map-center.ts`:

```typescript
export interface MapCoord {
  longitude: number;
  latitude: number;
}

export function computePolygonCentroid(polygon: GeoJSON.Polygon): MapCoord {
  const ring = polygon.coordinates[0];
  // Exclude the closing vertex (which equals the first vertex by GeoJSON spec).
  const verts = ring.slice(0, -1);
  let lonSum = 0;
  let latSum = 0;
  for (const [lon, lat] of verts) {
    lonSum += lon;
    latSum += lat;
  }
  return {
    longitude: lonSum / verts.length,
    latitude: latSum / verts.length,
  };
}

export function computeMidpoint(a: MapCoord, b: MapCoord): MapCoord {
  return {
    longitude: (a.longitude + b.longitude) / 2,
    latitude: (a.latitude + b.latitude) / 2,
  };
}

export function computeLandingMapCenter(
  apns: string[],
  fc: GeoJSON.FeatureCollection,
): MapCoord {
  if (apns.length === 0) {
    throw new Error("computeLandingMapCenter: requires at least one APN");
  }
  const centroids: MapCoord[] = apns.map((apn) => {
    const feat = fc.features.find(
      (f) => (f.properties as { apn?: string } | null)?.apn === apn,
    );
    if (!feat) {
      throw new Error(`computeLandingMapCenter: APN not found: ${apn}`);
    }
    if (feat.geometry.type !== "Polygon") {
      throw new Error(
        `computeLandingMapCenter: ${apn} geometry is ${feat.geometry.type}, expected Polygon`,
      );
    }
    return computePolygonCentroid(feat.geometry as GeoJSON.Polygon);
  });
  if (centroids.length === 1) return centroids[0];
  // Reduce by repeatedly midpointing — for the locked 2-parcel case this is
  // exactly midpoint(POPHAM, HOGUE). For >2 it averages all centroids.
  const lonAvg = centroids.reduce((s, c) => s + c.longitude, 0) / centroids.length;
  const latAvg = centroids.reduce((s, c) => s + c.latitude, 0) / centroids.length;
  return { longitude: lonAvg, latitude: latAvg };
}
```

- [ ] **Step 4: Run tests; verify they pass**

```bash
npx vitest run src/logic/compute-map-center.test.ts 2>&1 | tail -10
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/compute-map-center.ts src/logic/compute-map-center.test.ts
git commit -m "feat(logic): compute-map-center for landing map

Pure function: takes APN list + parcels-geo FeatureCollection,
returns the centroid-of-centroids midpoint. Used to derive the
landing map's static center constant from data, not magic numbers."
```

---

## Task 5: `popup-data.ts` (TDD)

**Files:**
- Create: `src/logic/popup-data.ts`
- Create: `src/logic/popup-data.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/logic/popup-data.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { resolvePopupData } from "./popup-data";
import { loadAllParcels, loadAllInstruments } from "../data-loader";
import lifecyclesRaw from "../data/lifecycles.json";
import { LifecyclesFile } from "../schemas";

const parcels = loadAllParcels();
const instruments = loadAllInstruments();
const lifecycles = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

describe("resolvePopupData", () => {
  it("returns residential variant for POPHAM with correct fields", () => {
    const data = resolvePopupData("304-78-386", { parcels, instruments, lifecycles });
    expect(data).not.toBeNull();
    expect(data!.type).toBe("residential");
    expect(data!.owner).toBe("POPHAM CHRISTOPHER / ASHLEY");
    expect(data!.address).toBe("3674 E Palmer St");
    expect(data!.apn).toBe("304-78-386");
    // POPHAM has lc-002 open (DOT 20210057847)
    expect(data!.openLifecycleCount).toBe(1);
    // Last recording date among POPHAM instruments (2021-04-... per links)
    expect(data!.lastRecordingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns subdivision_common variant for HOA tract", () => {
    const data = resolvePopupData("304-78-409", { parcels, instruments, lifecycles });
    expect(data).not.toBeNull();
    expect(data!.type).toBe("subdivision_common");
    expect(data!.owner).toBe("SEVILLE HOMEOWNERS ASSOCIATION");
    // HOA tract has lc-004 RELEASED (no open lifecycles)
    expect(data!.openLifecycleCount).toBe(0);
  });

  it("returns null for an APN not in the corpus", () => {
    const data = resolvePopupData("000-00-000", { parcels, instruments, lifecycles });
    expect(data).toBeNull();
  });

  it("treats missing parcel.type as residential", () => {
    const fakeParcels = [{
      ...parcels[0],
      apn: "999-99-999",
      type: undefined,
    }];
    const data = resolvePopupData("999-99-999", {
      parcels: fakeParcels,
      instruments: [],
      lifecycles: [],
    });
    expect(data!.type).toBe("residential");
  });

  it("returns latest recording_date as ISO YYYY-MM-DD", () => {
    const data = resolvePopupData("304-78-386", { parcels, instruments, lifecycles });
    // POPHAM corpus latest is 2021-04-20 (release 20210075858)
    expect(data!.lastRecordingDate).toBe("2021-04-20");
  });
});
```

> **Note:** the `lastRecordingDate` value may differ from `2021-04-20` depending on the actual instrument data. Run the tests first; if they fail with a different date, update the assertion to whatever the loader actually returns. Same for the POPHAM owner string — copy the exact string from `parcels.json` if formatting differs from the assertion.

- [ ] **Step 2: Run tests; verify they fail**

```bash
npx vitest run src/logic/popup-data.test.ts 2>&1 | tail -10
```

Expected: import error / module not found.

- [ ] **Step 3: Implement `popup-data.ts`**

Create `src/logic/popup-data.ts`:

```typescript
import type { Parcel, Instrument, EncumbranceLifecycle } from "../types";

export type PopupVariant = "residential" | "subdivision_common";

export interface PopupData {
  apn: string;
  type: PopupVariant;
  owner: string;
  address: string;
  lastRecordingDate: string | null;
  openLifecycleCount: number;
}

export interface PopupDataInputs {
  parcels: Parcel[];
  instruments: Instrument[];
  lifecycles: EncumbranceLifecycle[];
}

export function resolvePopupData(
  apn: string,
  inputs: PopupDataInputs,
): PopupData | null {
  const parcel = inputs.parcels.find((p) => p.apn === apn);
  if (!parcel) return null;

  const parcelInstrumentIds = new Set(parcel.instrument_numbers ?? []);

  const parcelInstruments = inputs.instruments.filter((i) =>
    parcelInstrumentIds.has(i.instrument_number),
  );
  const lastRecordingDate =
    parcelInstruments.length === 0
      ? null
      : parcelInstruments
          .map((i) => i.recording_date)
          .sort()
          .at(-1) ?? null;

  const openLifecycleCount = inputs.lifecycles.filter(
    (lc) =>
      parcelInstrumentIds.has(lc.root_instrument) && lc.status === "open",
  ).length;

  return {
    apn,
    type: parcel.type ?? "residential",
    owner: parcel.current_owner,
    address: parcel.address,
    lastRecordingDate,
    openLifecycleCount,
  };
}
```

- [ ] **Step 4: Run tests; verify they pass**

```bash
npx vitest run src/logic/popup-data.test.ts 2>&1 | tail -10
```

Expected: all 5 tests pass. If `lastRecordingDate` assertion fails, replace `2021-04-20` with the actual returned value.

- [ ] **Step 5: Commit**

```bash
git add src/logic/popup-data.ts src/logic/popup-data.test.ts
git commit -m "feat(logic): popup-data resolver

Pure function: APN + corpus inputs -> PopupData with owner, address,
type, last recording date, open lifecycle count. Returns null if APN
not in corpus. Drives MapPopup variant + display fields."
```

---

## Task 6: Extend glossary with "lifecycle"

**Files:**
- Modify: `src/terminology/glossary.ts`

- [ ] **Step 1: Add singular `lifecycle` entry**

Open `src/terminology/glossary.ts:1-18`. Add this entry to the `GLOSSARY` object (alphabetically near "encumbrance lifecycles"):

```typescript
"lifecycle": "claim against property",
"lifecycles": "claims against property",
```

- [ ] **Step 2: Run tests**

```bash
npm test 2>&1 | tail -10
```

Expected: 0 failures.

- [ ] **Step 3: Commit**

```bash
git add src/terminology/glossary.ts
git commit -m "feat(terminology): add lifecycle/lifecycles singular+plural mappings

Used by the upcoming MapPopup component which displays
'N open lifecycle' / 'N open lifecycles' inline."
```

---

## Task 7: `MapZoomControls.tsx`

**Files:**
- Create: `src/components/MapZoomControls.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/MapZoomControls.tsx`:

```typescript
import { useMap } from "react-map-gl/maplibre";
import countyBoundary from "../data/maricopa-county-boundary.json";

export interface MapZoomControlsProps {
  defaultCenter: { longitude: number; latitude: number };
  defaultZoom: number;
}

function computeBboxFromFeatureCollection(
  fc: GeoJSON.FeatureCollection,
): [number, number, number, number] {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const feat of fc.features) {
    const geom = feat.geometry;
    const rings: number[][][] =
      geom.type === "Polygon"
        ? geom.coordinates
        : geom.type === "MultiPolygon"
          ? geom.coordinates.flat()
          : [];
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

export function MapZoomControls({
  defaultCenter,
  defaultZoom,
}: MapZoomControlsProps) {
  const { current: map } = useMap();

  function fitCounty() {
    if (!map) return;
    const [minLon, minLat, maxLon, maxLat] = computeBboxFromFeatureCollection(
      countyBoundary as GeoJSON.FeatureCollection,
    );
    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 32, duration: 700 },
    );
  }

  function resetView() {
    if (!map) return;
    map.flyTo({
      center: [defaultCenter.longitude, defaultCenter.latitude],
      zoom: defaultZoom,
      duration: 700,
    });
  }

  const currentZoom = map?.getZoom() ?? defaultZoom;
  const showReset = currentZoom < 13;

  return (
    <div className="absolute top-20 left-2 z-10 flex flex-col gap-1">
      <button
        type="button"
        onClick={fitCounty}
        title="Zoom out to see all of Maricopa County."
        className="px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded shadow hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        Fit county
      </button>
      {showReset && (
        <button
          type="button"
          onClick={resetView}
          title="Return to street-level view of the example parcels."
          className="px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded shadow hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        >
          Reset view
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "MapZoomControls|error" | head -5
```

Expected: no errors specific to this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/MapZoomControls.tsx
git commit -m "feat(map): MapZoomControls — Fit county + Reset view buttons

Custom react-map-gl controls stacked top-left below default zoom
controls. Fit county uses fitBounds over the county boundary
FeatureCollection. Reset view appears only when zoom < 13."
```

---

## Task 8: `MapLegend.tsx`

**Files:**
- Create: `src/components/MapLegend.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/MapLegend.tsx`:

```typescript
import { useState, useEffect } from "react";
import { Term, TermSection } from "../terminology/Term";

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

const SWATCH_BASE =
  "inline-block w-3.5 h-3.5 mr-2 align-middle border-2";

function PophamSwatch() {
  return (
    <span
      aria-hidden="true"
      className={SWATCH_BASE}
      style={{
        backgroundColor: "rgba(16, 185, 129, 0.55)", // emerald-500 @ 55%
        borderColor: "#10b981",
      }}
    />
  );
}

function HogueSwatch() {
  return (
    <span
      aria-hidden="true"
      className={SWATCH_BASE}
      style={{
        backgroundColor: "rgba(245, 158, 11, 0.55)", // amber-500 @ 55%
        borderColor: "#f59e0b",
      }}
    />
  );
}

function HoaSwatch() {
  return (
    <span
      aria-hidden="true"
      className={SWATCH_BASE}
      style={{
        backgroundColor: "rgba(148, 163, 184, 0.35)", // slate-400 @ 35%
        borderColor: "#64748b", // slate-500
        borderStyle: "dashed",
      }}
    />
  );
}

function LegendBody() {
  return (
    <TermSection id="map-legend">
      <p className="text-xs font-medium text-slate-900 mb-2 leading-snug">
        Click any <Term professional="parcel" /> to open its{" "}
        <Term professional="chain of title" />
      </p>
      <ul className="text-[11px] text-slate-700 space-y-1">
        <li><PophamSwatch />POPHAM &mdash; example</li>
        <li><HogueSwatch />HOGUE &mdash; counter-example</li>
        <li><HoaSwatch />Seville HOA tract</li>
      </ul>
    </TermSection>
  );
}

export function MapLegend() {
  const [mobile, setMobile] = useState(isMobileViewport);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (mobile && !expanded) {
    return (
      <button
        type="button"
        aria-label="Show map legend"
        onClick={() => setExpanded(true)}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white border border-slate-300 shadow text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        &#9432;
      </button>
    );
  }

  return (
    <div
      className="absolute top-2 right-2 z-10 w-[200px] bg-white border border-slate-200 rounded shadow p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {mobile && (
        <button
          type="button"
          aria-label="Hide map legend"
          onClick={() => setExpanded(false)}
          className="absolute top-1 right-1 text-slate-400 hover:text-slate-700 text-sm leading-none"
        >
          &times;
        </button>
      )}
      <LegendBody />
    </div>
  );
}
```

> **Note:** the glossary doesn't yet have a `"parcel"` entry; `<Term professional="parcel">` will render "parcel" verbatim in plain mode. Add `"parcel": "property"` to the glossary if/when you want it translated. (Out of scope for this plan; mention in implementation notes.)

- [ ] **Step 2: Add `"parcel": "property"` to glossary while we're here**

Open `src/terminology/glossary.ts`. Add:

```typescript
"parcel": "property",
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "MapLegend|error" | head -5
```

Expected: no errors specific to MapLegend.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapLegend.tsx src/terminology/glossary.ts
git commit -m "feat(map): MapLegend with mobile collapse + Plain-English

Top-right legend with click hint + 3 swatches matching polygon
treatments (solid emerald/amber, dashed slate). Below 768px
collapses to an info icon with tap-to-expand. Adds parcel/property
glossary mapping."
```

---

## Task 9: `MapPopup.tsx`

**Files:**
- Create: `src/components/MapPopup.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/MapPopup.tsx`:

```typescript
import { Popup } from "react-map-gl/maplibre";
import { Term, TermSection } from "../terminology/Term";
import type { PopupData } from "../logic/popup-data";

export interface MapPopupProps {
  data: PopupData;
  longitude: number;
  latitude: number;
}

function ResidentialBody({ data }: { data: PopupData }) {
  const { owner, apn, address, openLifecycleCount, lastRecordingDate } = data;
  const isOpen = openLifecycleCount > 0;
  const lifecycleWord = openLifecycleCount === 1 ? "lifecycle" : "lifecycles";
  const countClass = isOpen
    ? "text-amber-700 font-medium"
    : "text-slate-500";

  return (
    <TermSection id={`popup-${apn}`}>
      <p className="text-sm font-medium text-slate-900 truncate" title={owner}>
        {owner}
      </p>
      <p className="text-xs text-slate-600 truncate">
        <span className="font-mono">{apn}</span> &middot; {address}
      </p>
      <p className="text-xs mt-1">
        <span className={countClass}>
          {openLifecycleCount} open <Term professional={lifecycleWord} />
        </span>
        {lastRecordingDate && (
          <>
            <span className="text-slate-400"> &middot; </span>
            <span className="text-slate-600">
              last filed <span className="font-mono">{lastRecordingDate}</span>
            </span>
          </>
        )}
      </p>
      <p className="text-xs mt-2 text-moat-700 font-medium">
        &rarr; Open <Term professional="chain of title" />
      </p>
    </TermSection>
  );
}

function SubdivisionCommonBody({ data }: { data: PopupData }) {
  return (
    <TermSection id={`popup-${data.apn}`}>
      <p className="text-sm font-medium text-slate-900">
        Subdivision common area
      </p>
      <p className="text-xs text-slate-600 truncate">
        <span className="font-mono">{data.apn}</span> &middot; {data.address}
      </p>
      <p className="text-xs mt-1 text-slate-600">
        Holds plat <Term professional="encumbrances" /> (lc-004)
      </p>
      <p className="text-xs mt-2 text-moat-700 font-medium">
        &rarr; Open parcel record
      </p>
    </TermSection>
  );
}

export function MapPopup({ data, longitude, latitude }: MapPopupProps) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      closeButton={false}
      closeOnClick={false}
      anchor="bottom"
      offset={12}
      maxWidth="220px"
      className="county-recorder-map-popup"
    >
      <div className="w-[200px] py-1 px-1 pointer-events-none">
        {data.type === "subdivision_common" ? (
          <SubdivisionCommonBody data={data} />
        ) : (
          <ResidentialBody data={data} />
        )}
      </div>
    </Popup>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "MapPopup|error" | head -5
```

Expected: no errors specific to MapPopup.

- [ ] **Step 3: Commit**

```bash
git add src/components/MapPopup.tsx
git commit -m "feat(map): MapPopup hover card with two variants

Residential variant (POPHAM/HOGUE) shows owner + APN + address +
amber-weighted open-count + ISO mono last-filed date + chain
affordance. Subdivision_common variant (HOA tract) shows
context-appropriate copy. Each popup wraps body in its own
TermSection for per-mount first-occurrence dedup."
```

---

## Task 10: Modify `CountyMap.tsx` — landing-mode rewrite

**Files:**
- Modify: `src/components/CountyMap.tsx` (substantial)

- [ ] **Step 1: Replace the entire file with the landing-mode version**

Open `src/components/CountyMap.tsx`. Replace the file contents with:

```typescript
// src/components/CountyMap.tsx
import { useMemo, useCallback, useState, useEffect } from "react";
import MapGL, { Source, Layer, useMap } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import countyBoundary from "../data/maricopa-county-boundary.json";
import parcelsGeo from "../data/parcels-geo.json";
import { computeLandingMapCenter } from "../logic/compute-map-center";
import { resolvePopupData } from "../logic/popup-data";
import { loadAllParcels, loadAllInstruments } from "../data-loader";
import { LifecyclesFile } from "../schemas";
import lifecyclesRaw from "../data/lifecycles.json";
import { MapPopup } from "./MapPopup";
import { MapLegend } from "./MapLegend";
import { MapZoomControls } from "./MapZoomControls";

export interface HighlightedParcel {
  apn: string;
  status: "primary" | "backup" | "subdivision_common";
  label?: string;
}

export interface CountyMapProps {
  highlightedParcels: HighlightedParcel[];
  onParcelClick: (apn: string) => void;
}

// Derived from midpoint of POPHAM (304-78-386) ↔ HOGUE (304-77-689) centroids.
// Recompute via computeLandingMapCenter() if the highlighted parcel set changes.
const LANDING_MAP_CENTER = computeLandingMapCenter(
  ["304-78-386", "304-77-689"],
  parcelsGeo as GeoJSON.FeatureCollection,
);
const LANDING_MAP_ZOOM = 15;

const STATUS_FILL: Record<HighlightedParcel["status"], string> = {
  primary: "#10b981", // emerald-500
  backup: "#f59e0b", // amber-500
  subdivision_common: "#94a3b8", // slate-400
};

const STATUS_OUTLINE: Record<HighlightedParcel["status"], string> = {
  primary: "#10b981",
  backup: "#f59e0b",
  subdivision_common: "#64748b", // slate-500
};

const STATUS_FILL_OPACITY: Record<HighlightedParcel["status"], number> = {
  primary: 0.55,
  backup: 0.55,
  subdivision_common: 0.35,
};

// Used at module load; safe because corpus is static.
const PARCELS = loadAllParcels();
const INSTRUMENTS = loadAllInstruments();
const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

function useViewport(): { isMobile: boolean } {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return { isMobile };
}

interface MobileBoundsFitterProps {
  apns: string[];
}

function MobileBoundsFitter({ apns }: MobileBoundsFitterProps) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map) return;
    const features = (parcelsGeo.features as GeoJSON.Feature[]).filter((f) =>
      apns.includes((f.properties as { apn?: string } | null)?.apn ?? ""),
    );
    if (features.length === 0) return;
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const f of features) {
      if (f.geometry.type !== "Polygon") continue;
      for (const [lon, lat] of (f.geometry as GeoJSON.Polygon).coordinates[0]) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
    map.fitBounds(
      [[minLon, minLat], [maxLon, maxLat]],
      { padding: 24, maxZoom: 15, duration: 0 },
    );
  }, [map, apns]);
  return null;
}

export function CountyMap({
  highlightedParcels,
  onParcelClick,
}: CountyMapProps) {
  const { isMobile } = useViewport();
  const [hoveredApn, setHoveredApn] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const handleReady = useCallback(() => setMapReady(true), []);

  const parcelById = useMemo(() => {
    const m = new Map<string, GeoJSON.Feature>();
    for (const f of parcelsGeo.features as GeoJSON.Feature[]) {
      const apn = (f.properties as { apn?: string } | null)?.apn;
      if (apn) m.set(apn, f);
    }
    return m;
  }, []);

  const interactiveLayerIds = useMemo(
    () => highlightedParcels.map((p) => `parcel-${p.apn}-fill`),
    [highlightedParcels],
  );

  const apnFromEvent = (e: MapLayerMouseEvent): string | null => {
    const feat = e.features?.[0];
    if (!feat) return null;
    const layerId = feat.layer?.id ?? "";
    const match = layerId.match(/^parcel-(.+)-fill$/);
    return match ? match[1] : null;
  };

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const apn = apnFromEvent(e);
      if (apn) onParcelClick(apn);
    },
    [onParcelClick],
  );

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const apn = apnFromEvent(e);
    setHoveredApn((prev) => (prev === apn ? prev : apn));
  }, []);

  const handleMouseLeave = useCallback(() => setHoveredApn(null), []);

  const popupData = hoveredApn
    ? resolvePopupData(hoveredApn, {
        parcels: PARCELS,
        instruments: INSTRUMENTS,
        lifecycles: LIFECYCLES,
      })
    : null;
  const popupFeature = hoveredApn ? parcelById.get(hoveredApn) : undefined;
  const popupCoord = popupFeature
    ? (() => {
        const ring = (popupFeature.geometry as GeoJSON.Polygon).coordinates[0];
        const verts = ring.slice(0, -1);
        const lon = verts.reduce((s, v) => s + v[0], 0) / verts.length;
        const lat = verts.reduce((s, v) => s + v[1], 0) / verts.length;
        return { longitude: lon, latitude: lat };
      })()
    : null;

  // Activity overlay intentionally omitted (spec 2026-04-15-landing-map §10):
  // - municipality-grained, not parcel-grained (unit mismatch on parcel-zoom)
  // - already rendered at /county-activity (ActivityHeatMap)
  // - freshness signal already covered by Terminal 3's verified-through banner
  // Future: parcel-grained activity belongs in the popup, not as global overlay.

  return (
    <div className="relative h-full w-full">
      <MapGL
        initialViewState={{
          longitude: LANDING_MAP_CENTER.longitude,
          latitude: LANDING_MAP_CENTER.latitude,
          zoom: LANDING_MAP_ZOOM,
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={interactiveLayerIds}
        cursor={hoveredApn ? "pointer" : "grab"}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onLoad={handleReady}
        onIdle={handleReady}
      >
        {isMobile && (
          <MobileBoundsFitter apns={highlightedParcels.map((p) => p.apn)} />
        )}

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
          const isHovered = hoveredApn === p.apn;
          const dashedOutline = p.status === "subdivision_common";
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
                paint={{
                  "fill-color": STATUS_FILL[p.status],
                  "fill-opacity": isHovered
                    ? STATUS_FILL_OPACITY[p.status] + 0.2
                    : STATUS_FILL_OPACITY[p.status],
                }}
              />
              <Layer
                id={`parcel-${p.apn}-outline`}
                type="line"
                paint={{
                  "line-color": STATUS_OUTLINE[p.status],
                  "line-width": 2,
                  ...(dashedOutline ? { "line-dasharray": [2, 2] } : {}),
                }}
              />
              <Layer
                id={`parcel-${p.apn}-outline-hover`}
                type="line"
                paint={{
                  "line-color": STATUS_OUTLINE[p.status],
                  "line-width": isHovered ? 5 : 0,
                }}
              />
            </Source>
          );
        })}

        {popupData && popupCoord && (
          <MapPopup
            data={popupData}
            longitude={popupCoord.longitude}
            latitude={popupCoord.latitude}
          />
        )}

        <MapZoomControls
          defaultCenter={LANDING_MAP_CENTER}
          defaultZoom={LANDING_MAP_ZOOM}
        />
      </MapGL>
      <MapLegend />
      <div
        aria-hidden={mapReady}
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/85 transition-opacity duration-500 ${
          mapReady ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-sm font-medium text-slate-600">
          Loading county map&hellip;
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors. If `subdivision_common` triggers a type narrowing issue in some downstream consumer, add a non-null assertion or fix the call site.

- [ ] **Step 3: Run all tests**

```bash
npm test 2>&1 | tail -10
```

Expected: 0 failures. (Existing tests don't reach into CountyMap rendering.)

- [ ] **Step 4: Commit**

```bash
git add src/components/CountyMap.tsx
git commit -m "feat(map): landing-mode CountyMap — zoom 15, popup, legend, controls

Default view: zoom 15 centered on computed midpoint of POPHAM↔HOGUE
centroids. Below 768px falls back to fitBounds with maxZoom 15.
Adds subdivision_common status with slate-400/dashed treatment for
the HOA tract. Wires MapPopup, MapLegend, MapZoomControls. Activity
overlay explicitly omitted (rationale comment inline)."
```

---

## Task 11: Update `LandingPage.tsx` to highlight 3 parcels

**Files:**
- Modify: `src/components/LandingPage.tsx:7-10`

- [ ] **Step 1: Add HOA tract to HIGHLIGHTED**

Open `src/components/LandingPage.tsx:7-10`. Replace the `HIGHLIGHTED` constant with:

```typescript
const HIGHLIGHTED: HighlightedParcel[] = [
  { apn: "304-78-386", status: "primary", label: "POPHAM" },
  { apn: "304-77-689", status: "backup", label: "HOGUE (counter-example)" },
  { apn: "304-78-409", status: "subdivision_common", label: "Seville HOA tract" },
];
```

- [ ] **Step 2: Run dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:5173/`. Within 3 seconds you should see:
- 3 visible polygons (green POPHAM, amber HOGUE, slate-dashed HOA tract)
- Top-right legend with click hint and 3 swatches
- Top-left zoom controls + "Fit county" button
- Bottom-left "Why this map matters" caption
- Street labels including "E Palmer St" rendered by Carto Positron

**Verification gate (Q2):** confirm "E Palmer St" street name is readable on the map at zoom 15. If not, change `LANDING_MAP_ZOOM` in `CountyMap.tsx` to 16 and document the change in the PR description.

Hover each polygon and confirm:
- POPHAM popup: residential variant, "1 open lifecycle" amber-weighted
- HOGUE popup: residential variant, "1 open lifecycle" amber-weighted
- HOA tract popup: subdivision_common variant, "Holds plat encumbrances (lc-004)"

Click each polygon and confirm navigation to `/parcel/<apn>`.

Toggle Plain-English mode (terminology toggle in header). Re-hover and confirm:
- "chain of title" → "Ownership History"
- "lifecycle" → "claim against property"
- Legend "Click any parcel to open its chain of title" → "Click any property to open its Ownership History"

Click "Fit county" — map should smoothly zoom out to county outline, "Reset view" button should appear.

- [ ] **Step 3: Resize the browser to <768px wide**

Confirm:
- Legend collapses to a small `ⓘ` icon top-right
- Map fits the 3 parcels via fitBounds (rather than hardcoded zoom 15)
- Tap the icon — legend expands; tap × to collapse

- [ ] **Step 4: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(landing): add HOA tract to highlighted parcels

3 polygons now render: POPHAM (green primary example), HOGUE
(amber counter-example), Seville HOA tract (slate dashed
context). Beat 1 of demo-script.md narration ('these polygons')
is now visually grounded."
```

---

## Task 12: Beat 1 demo-script verification

**Files:**
- Read: `docs/demo-script.md` (lines 8-17)

- [ ] **Step 1: Re-read Beat 1 narration**

Open `docs/demo-script.md:8-17`. Read the narration aloud while looking at the landing page. Confirm:

- "Point to the landing page map." — three polygons visible ✓
- "The polygons you see are from the Maricopa County Assessor's file" — visible polygons exist ✓
- "Click the POPHAM polygon... The Chain-of-Title panel opens." — confirm clicking POPHAM lands on `/parcel/304-78-386` and the chain page renders ✓

- [ ] **Step 2: If the narration breaks anywhere, fix the impl, not the script**

The script is the contract. If "polygons you see" doesn't match what the user actually sees, the impl is wrong.

- [ ] **Step 3: Update the demo-script fallback note if relevant**

Open `docs/demo-script.md:118-122` (Fallback section). The current note says: `"If the map fails to load (GIS fetch failure): use the parcel search box directly and skip Beat 1's spatial point."` — this stays unchanged; the legend + popup are additive.

- [ ] **Step 4: No commit needed if no edits were made.**

---

## Task 13: Lighthouse regression check

- [ ] **Step 1: Build and serve production bundle**

```bash
npm run build && npm run preview 2>&1 | head -3
```

The preview server URL appears in the output (typically `http://localhost:4173`).

- [ ] **Step 2: Run Lighthouse on `/`**

In Chrome DevTools → Lighthouse → Generate report against `http://localhost:4173/`. Or via CLI if available:

```bash
npx lighthouse http://localhost:4173/ --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-landing-after.json --chrome-flags="--headless"
```

Record the four scores in the PR description.

- [ ] **Step 3: Compare to baseline**

If a `lighthouse-landing-before.json` exists in the repo or the prior Lighthouse run was logged, compare. Acceptance: each category does not regress more than 5 points.

If a baseline does not exist, capture the after-scores as the new baseline; note in the PR description that this is the baseline going forward.

- [ ] **Step 4: If a category regressed >5 points, investigate**

Likely culprits:
- New components mounted on landing → bundle size growth → Performance hit
- Map popup re-renders on every mouse move → CPU usage during interaction
- Legend tap handler missing keyboard support → Accessibility hit

Fix and re-measure. Don't ship a regression >5 points.

- [ ] **Step 5: Stop the preview server**

```
Ctrl+C  (in the npm run preview terminal)
```

---

## Self-Review

**Spec coverage:**
- §1 Default zoom + computed centerpoint → Tasks 4, 10
- §2 Mobile fallback → Task 10 (`MobileBoundsFitter`)
- §3 "Show full county" affordance → Task 7
- §4 HOA tract polygon enrichment → Tasks 2, 3
- §5 Hover popup (variants, ISO date, plain-English, dedup scoping, collision) → Tasks 5, 9, 10 (collision clamp deferred — see Risks below)
- §6 Legend panel → Task 8
- §7 County boundary outline → unchanged in Task 10 ✓
- §8 "Why this map matters" caption → unchanged (`LandingPage.tsx` aside element preserved) ✓
- §9 Map element layout → Task 10 + Task 8 corner placements ✓
- §10 Activity overlay cut → Task 10 (rationale comment inline) ✓
- §11 Things deliberately not done → respected (no dismiss button, no fly-to on load, no pulse) ✓

**Placeholder scan:** none found.

**Type consistency:** `HighlightedParcel.status` extended to `"primary" | "backup" | "subdivision_common"` consistently in Task 10. `PopupData` shape from Task 5 matches consumer in Task 9. `LANDING_MAP_CENTER`, `LANDING_MAP_ZOOM` constants used consistently in Tasks 7 and 10. `parcel.type` field on Parcel schema used by Task 5's resolver and matches data file values from Task 3.

**One spec→plan delta worth flagging during execution:**
- §5 "popup-legend collision clamp" is described in the spec but not explicitly implemented in Task 10 — the popup anchors `bottom` and the legend lives top-right, so collisions are unlikely in practice. If during Task 11 verification the popup overlaps the legend (e.g., when hovering POPHAM near the top of the viewport), add an offset adjustment in `MapPopup.tsx`. Logged here as a verification-time decision rather than a speculative implementation.

---

## Plan Done

Final state after all tasks:
- 3 polygons render at landing
- Hover shows 2-variant popup with examiner-relevant context
- Legend conveys clickability + color key, collapses on mobile
- "Fit county" zoom-out + "Reset view" return-trip
- Plain-English toggle works on legend + popup
- Mobile fitBounds fallback below 768px
- Activity overlay explicitly cut with rationale comment
- Beat 1 of demo-script.md narrates correctly
- All unit tests pass; Lighthouse within 5 points of baseline
