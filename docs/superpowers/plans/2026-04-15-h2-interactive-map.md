# H2 Interactive Map + Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three tightly-scoped UI fixes — landing-map polygons clickable with hover affordance, map loading overlay to mask cold-load tile fade-in, and a toast notification on PDF export.

**Architecture:** Surgical edits to `CountyMap.tsx` (Fix 1 + Fix 2) and `ExportCommitmentButton.tsx` (Fix 3). One new component file: `src/components/Toast.tsx`. No new npm dependencies. No router or main.tsx changes.

**Tech Stack:** React 19 + react-router v7 + react-map-gl/maplibre 8 + Tailwind v4 + vitest + jspdf.

**Strict scope reminder:** DO NOT refactor map architecture. DO NOT add mobile responsiveness. DO NOT add heatmaps or animations. DO NOT modify main. DO NOT merge.

---

## Pre-flight observations from reading the code

- `LandingPage.tsx:30` already passes `onParcelClick={(apn) => navigate(\`/parcel/${apn}\`)}` to `CountyMap`. Click handler exists; navigation already works. **Fix 1 is purely about the visual + cursor affordance** — proving the polygons *look* clickable, not just that they are.
- `CountyMap.tsx` already wires `interactiveLayerIds` and an `onClick` handler that resolves the APN out of the layer id pattern `parcel-{apn}-fill`.
- `parcels-geo.json` contains exactly 2 polygons today: `304-78-386` (POPHAM) and `304-77-689` (HOGUE). The other 3 corpus parcels have no GeoJSON, so they don't render — that is acceptable per spec.
- `ExportCommitmentButton.tsx` is a single component used by `EncumbranceLifecycle.tsx`, `ProofDrawer.tsx`, and `TransactionWizard.tsx`. Adding the toast inside this component fixes all 3 sites at once.
- `renderCommitmentPdf` is **synchronous** (returns a Blob, not a Promise). To make the "Generating…" state actually visible before flipping to "Downloaded:", we must defer the synchronous work with `requestAnimationFrame` (or `setTimeout(0)`) so React has a chance to paint the first toast frame.
- No toast library exists in `package.json`. Build a minimal inline component per spec.
- `parcel.current_owner` is the field for the toast's owner name (confirmed from `src/schemas.ts:122`).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/components/CountyMap.tsx` | Map render + interactivity | Modify — add hovered-APN state, hover layers, cursor handling, loading overlay |
| `src/components/Toast.tsx` | Reusable inline toast UI | Create — minimal fixed-position toast component |
| `src/components/ExportCommitmentButton.tsx` | Triggers commitment download | Modify — wrap click handler with toast lifecycle |
| `tests/county-map.dom.test.tsx` | CountyMap unit tests | Modify — add hover layer + loading overlay assertions |
| `src/components/Toast.test.tsx` | Toast unit test | Create — verify render + auto-dismiss |
| `src/components/ExportCommitmentButton.test.tsx` | Export button tests | Modify — add a DOM test that asserts toast text shows after click |

---

## Task 1 — Fix 1: Map polygon hover + click feedback

**Files:**
- Modify: `src/components/CountyMap.tsx`
- Modify: `tests/county-map.dom.test.tsx`

**Approach:** track a `hoveredApn` in component state. Use react-map-gl's `onMouseMove` (filtered to `interactiveLayerIds`) to set it; `onMouseLeave` on the map to clear it. Drive `cursor` via the `cursor` prop on `MapGL`. Add a *second* outline layer per parcel (`parcel-{apn}-outline-hover`) whose `line-width` paint expression is wider when the APN is the hovered one, plus brighten the fill via paint expression on the existing fill layer. This is the simplest pattern that does not require feature-state plumbing.

- [ ] **Step 1: Write the failing test for hover layers**

Edit `tests/county-map.dom.test.tsx` and append a third test case inside the `describe("CountyMap", ...)` block:

```tsx
it("renders a hover-outline layer per highlighted parcel", () => {
  const { getByTestId } = render(
    <CountyMap
      highlightedParcels={[
        { apn: "304-78-386", status: "primary" },
        { apn: "304-77-689", status: "backup" },
      ]}
      onParcelClick={vi.fn()}
    />,
  );
  expect(getByTestId("layer-parcel-304-78-386-outline-hover")).toBeInTheDocument();
  expect(getByTestId("layer-parcel-304-77-689-outline-hover")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npx vitest run tests/county-map.dom.test.tsx -t "hover-outline"`
Expected: FAIL — `Unable to find element by: data-testid="layer-parcel-304-78-386-outline-hover"`

- [ ] **Step 3: Implement hover state, cursor, hover layers, and brightened fill in CountyMap.tsx**

Replace the entire body of `src/components/CountyMap.tsx` with:

```tsx
// src/components/CountyMap.tsx
import { useMemo, useCallback, useState } from "react";
import MapGL, { Source, Layer } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
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
  const [hoveredApn, setHoveredApn] = useState<string | null>(null);

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

  const handleMouseLeave = useCallback(() => {
    setHoveredApn(null);
  }, []);

  return (
    <MapGL
      initialViewState={initialViewState}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={interactiveLayerIds}
      cursor={hoveredApn ? "pointer" : "grab"}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
        const isHovered = hoveredApn === p.apn;
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
                "fill-opacity": isHovered ? 0.75 : 0.55,
              }}
            />
            <Layer
              id={`parcel-${p.apn}-outline`}
              type="line"
              paint={{ "line-color": STATUS_FILL[p.status], "line-width": 2 }}
            />
            <Layer
              id={`parcel-${p.apn}-outline-hover`}
              type="line"
              paint={{
                "line-color": STATUS_FILL[p.status],
                "line-width": isHovered ? 5 : 0,
              }}
            />
          </Source>
        );
      })}
    </MapGL>
  );
}
```

Notes:
- Hover/cursor logic uses local React state — no `feature-state` plumbing needed because each parcel has its own dedicated source/layers already.
- The hover-outline layer always exists (so tests can find it) but its `line-width` is 0 when not hovered, making it invisible. When hovered, width jumps to 5px.
- Fill opacity bump from 0.55 → 0.75 brightens the polygon visibly.
- `cursor` prop on `MapGL` swaps to `"pointer"` when over a highlighted parcel, `"grab"` otherwise (matching MapLibre's default pannable cursor).

- [ ] **Step 4: Run the full county-map test file to verify all 3 tests pass**

Run: `npx vitest run tests/county-map.dom.test.tsx`
Expected: 3/3 pass.

- [ ] **Step 5: Sanity-check that landing-page tests still pass**

Run: `npx vitest run tests/landing-page.dom.test.tsx`
Expected: 3/3 pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/CountyMap.tsx tests/county-map.dom.test.tsx
git commit -m "feat(h2): map polygon hover state + cursor pointer affordance"
```

---

## Task 2 — Fix 2: Map tile loading overlay

**Files:**
- Modify: `src/components/CountyMap.tsx`
- Modify: `tests/county-map.dom.test.tsx`

**Approach:** Track a `mapReady` boolean in CountyMap. Wire it via `onLoad` (fired when the style is loaded — earlier than tiles, but adequate for the first paint) AND `onIdle` (fired when all rendering is complete). Use whichever fires first to flip `mapReady` true. While false, render an absolutely-positioned overlay sibling above the map with the `Loading county map…` copy. The overlay uses Tailwind opacity transition for a fade-out.

**Why both onLoad and onIdle:** `onIdle` is the canonical "tiles done" signal but during fast loads it might not fire before the user starts interacting. `onLoad` fires on style ready. Setting `mapReady = true` from either is safe — once true, it stays true.

- [ ] **Step 1: Update test mock to expose onLoad/onIdle props, then write failing test**

Edit `tests/county-map.dom.test.tsx`. Replace the `vi.mock(...)` block at the top with a richer mock that calls `onLoad` synchronously when present, AND exposes a `data-map-ready` attribute on the root for assertions:

```tsx
vi.mock("react-map-gl/maplibre", () => ({
  default: ({
    children,
    onLoad,
  }: {
    children: React.ReactNode;
    onLoad?: () => void;
  }) => {
    // Default mock: do NOT call onLoad — leaves the map in "loading" state
    // so tests can assert on the overlay. Tests that need the loaded state
    // can call the onLoad ref via a separate spy if needed.
    void onLoad;
    return <div data-testid="map">{children}</div>;
  },
  Source: ({ children }: { children: React.ReactNode }) => <div data-testid="source">{children}</div>,
  Layer: (props: { id: string }) => <div data-testid={`layer-${props.id}`} />,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
}));
```

Then append a fourth test inside the `describe("CountyMap", ...)` block:

```tsx
it("renders a loading overlay until the map fires onLoad", () => {
  const { getByText } = render(
    <CountyMap
      highlightedParcels={[]}
      onParcelClick={vi.fn()}
    />,
  );
  expect(getByText(/Loading county map/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npx vitest run tests/county-map.dom.test.tsx -t "loading overlay"`
Expected: FAIL — `Unable to find an element with the text: /Loading county map/i`

- [ ] **Step 3: Add overlay + onLoad/onIdle handlers in CountyMap.tsx**

Make these surgical edits to `src/components/CountyMap.tsx` from Task 1's final state:

(a) Add to the existing imports — change `import { useMemo, useCallback, useState } from "react";` line is unchanged; nothing new needed.

(b) Inside the component, immediately after `const [hoveredApn, setHoveredApn] = useState<string | null>(null);` add:

```tsx
  const [mapReady, setMapReady] = useState(false);
  const handleReady = useCallback(() => setMapReady(true), []);
```

(c) Add `onLoad={handleReady}` and `onIdle={handleReady}` to the `<MapGL ...>` props (alongside the existing `onClick`, `onMouseMove`, `onMouseLeave`).

(d) Wrap the entire `<MapGL>` in a positioned container so the overlay can sit on top:

Replace the `return ( <MapGL ...> ... </MapGL> );` block with:

```tsx
  return (
    <div className="relative h-full w-full">
      <MapGL
        initialViewState={initialViewState}
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
        {/* ...existing Source/Layer children unchanged... */}
      </MapGL>
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
```

Keep the `<Source>` / `<Layer>` children of `<MapGL>` exactly as Task 1 left them — this step only wraps the existing tree and adds the overlay sibling.

- [ ] **Step 4: Run county-map tests to verify all 4 pass**

Run: `npx vitest run tests/county-map.dom.test.tsx`
Expected: 4/4 pass.

- [ ] **Step 5: Sanity-check the landing-page test**

Run: `npx vitest run tests/landing-page.dom.test.tsx`
Expected: 3/3 pass. (The new wrapper `<div>` doesn't change the search-region or copy assertions.)

- [ ] **Step 6: Commit**

```bash
git add src/components/CountyMap.tsx tests/county-map.dom.test.tsx
git commit -m "feat(h2): map loading overlay until tiles ready"
```

---

## Task 3 — Fix 3: PDF export toast

**Files:**
- Create: `src/components/Toast.tsx`
- Create: `src/components/Toast.test.tsx`
- Modify: `src/components/ExportCommitmentButton.tsx`
- Modify: `src/components/ExportCommitmentButton.test.tsx`

**Approach:** Build a tiny self-contained `Toast` component with two variants (`info` for "Generating…", `success` for "Downloaded"). It positions itself fixed bottom-right. Inside `ExportCommitmentButton`, hold toast state. On click: set toast to "Generating…", then `requestAnimationFrame(() => triggerCommitmentDownload(...))` so the toast paints before the synchronous PDF work blocks the thread. Once `triggerCommitmentDownload` returns, set toast to "Downloaded: {filename}.pdf". After 3000 ms, clear it.

**Why per-button toast (not a global provider):** The button is the single entry point used by all 3 export sites. Per-button state is the smallest valid change, doesn't require touching `main.tsx` or a context, and keeps the strict-scope rule ("DO NOT modify main") trivially satisfied. Multiple simultaneous toasts are not a real concern because the user can only click one button at a time and the operation is synchronous-ish (≤ a few hundred ms).

- [ ] **Step 1: Write failing tests for the Toast component**

Create `src/components/Toast.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Toast } from "./Toast";

describe("Toast", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the message text", () => {
    render(<Toast message="Hello world" variant="info" onDismiss={vi.fn()} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("calls onDismiss after 3000ms when variant is success", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Done" variant="success" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does NOT auto-dismiss while variant is info", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Generating" variant="info" onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run new test to confirm failure**

Run: `npx vitest run src/components/Toast.test.tsx`
Expected: FAIL — `Cannot find module './Toast'`.

- [ ] **Step 3: Implement Toast.tsx**

Create `src/components/Toast.tsx`:

```tsx
import { useEffect } from "react";

export type ToastVariant = "info" | "success";

export interface ToastProps {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
}

export function Toast({ message, variant, onDismiss }: ToastProps) {
  useEffect(() => {
    if (variant !== "success") return;
    const id = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(id);
  }, [variant, onDismiss]);

  const colorClass =
    variant === "success"
      ? "bg-emerald-600 text-white"
      : "bg-slate-800 text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-md px-4 py-3 text-sm font-medium shadow-lg ${colorClass}`}
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 4: Run Toast tests to verify all pass**

Run: `npx vitest run src/components/Toast.test.tsx`
Expected: 3/3 pass.

- [ ] **Step 5: Write failing test for the toast wired into ExportCommitmentButton**

Append to `src/components/ExportCommitmentButton.test.tsx` a new `describe` block at the bottom of the file (after the existing `describe("triggerCommitmentDownload", ...)`):

```tsx
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { ExportCommitmentButton } from "./ExportCommitmentButton";
import { afterEach } from "vitest";

describe("ExportCommitmentButton — toast UX", () => {
  const data = loadParcelDataByApn("304-78-386");

  beforeEach(() => {
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => cleanup());

  it("shows a 'Downloaded:' toast with the filename after click resolves", async () => {
    const user = userEvent.setup();
    render(
      <ExportCommitmentButton
        parcel={data.parcel}
        instruments={data.instruments}
        links={data.links}
        lifecycles={data.lifecycles}
        pipelineStatus={data.pipelineStatus}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Export Commitment/i }));
    // Allow the queued requestAnimationFrame callback + downstream state update
    // to flush. We poll because the exact tick timing depends on jsdom.
    await screen.findByText(/Downloaded: commitment-30478386-/i, undefined, { timeout: 2000 });
  });
});
```

- [ ] **Step 6: Run the new test to verify it fails**

Run: `npx vitest run src/components/ExportCommitmentButton.test.tsx -t "toast UX"`
Expected: FAIL — `Unable to find an element with text /Downloaded: commitment-30478386-/i`.

- [ ] **Step 7: Wire the toast into ExportCommitmentButton.tsx**

Replace the entire body of `src/components/ExportCommitmentButton.tsx` with:

```tsx
import { useCallback, useState } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
} from "../types";
import type { BIItem, TransactionInputs } from "../types/commitment";
import {
  buildCommitment,
  type CommitmentDocument,
  type ClosingImpactTemplate,
} from "../logic/commitment-builder";
import { renderCommitmentPdf } from "../logic/commitment-pdf";
import closingImpactTemplates from "../data/closing-impact-templates.json";
import { Toast, type ToastVariant } from "./Toast";

export interface TriggerInput {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  closingImpactTemplates: ClosingImpactTemplate[];
  generatedAt: string;
  viewedInstrumentNumber?: string;
  biItems?: BIItem[];
  transactionInputs?: TransactionInputs;
  download: (blob: Blob, filename: string) => void;
}

export interface TriggerResult {
  doc: CommitmentDocument;
  blob: Blob;
  filename: string;
}

export function triggerCommitmentDownload(input: TriggerInput): TriggerResult {
  const doc = buildCommitment({
    parcel: input.parcel,
    instruments: input.instruments,
    links: input.links,
    lifecycles: input.lifecycles,
    pipelineStatus: input.pipelineStatus,
    closingImpactTemplates: input.closingImpactTemplates,
    generatedAt: input.generatedAt,
    viewedInstrumentNumber: input.viewedInstrumentNumber,
  });
  const blob = renderCommitmentPdf(doc, {
    biItems: input.biItems,
    transactionInputs: input.transactionInputs,
  });
  const apnNoDashes = input.parcel.apn.replace(/-/g, "");
  const filename = `commitment-${apnNoDashes}-${input.pipelineStatus.verified_through_date}.pdf`;
  input.download(blob, filename);
  return { doc, blob, filename };
}

export function browserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface ButtonProps {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  viewedInstrumentNumber?: string;
  biItems?: BIItem[];
  transactionInputs?: TransactionInputs;
  label?: string;
}

interface ToastState {
  message: string;
  variant: ToastVariant;
}

function deferToNextFrame(cb: () => void): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => cb());
  } else {
    setTimeout(cb, 0);
  }
}

export function ExportCommitmentButton(props: ButtonProps) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleClick = useCallback(() => {
    setToast({
      message: `Generating commitment for ${props.parcel.current_owner} \u2014 ${props.parcel.apn}\u2026`,
      variant: "info",
    });
    deferToNextFrame(() => {
      try {
        const { filename } = triggerCommitmentDownload({
          parcel: props.parcel,
          instruments: props.instruments,
          links: props.links,
          lifecycles: props.lifecycles,
          pipelineStatus: props.pipelineStatus,
          closingImpactTemplates: closingImpactTemplates as ClosingImpactTemplate[],
          generatedAt: new Date().toISOString(),
          viewedInstrumentNumber: props.viewedInstrumentNumber,
          biItems: props.biItems,
          transactionInputs: props.transactionInputs,
          download: browserDownload,
        });
        setToast({ message: `Downloaded: ${filename}`, variant: "success" });
      } catch (err) {
        setToast({
          message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
          variant: "success", // re-use auto-dismiss behavior
        });
      }
    });
  }, [
    props.parcel,
    props.instruments,
    props.links,
    props.lifecycles,
    props.pipelineStatus,
    props.viewedInstrumentNumber,
    props.biItems,
    props.transactionInputs,
  ]);

  const cls =
    "px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors";
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cls}
        title="Download a PDF chain-and-encumbrance abstract for this parcel"
      >
        {props.label ?? "Export Commitment for Parcel"}
      </button>
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
```

Notes on the design:
- The `triggerCommitmentDownload` exported function is unchanged in signature and behavior — existing tests that call it directly continue to pass.
- The button now wraps its return value in a fragment so the Toast can render as a sibling to the button. The toast itself is `position: fixed`, so DOM placement does not affect layout.
- An error path still sets a toast (variant `success` so it auto-dismisses) — this is purely a safety net and not in scope for separate testing.

- [ ] **Step 8: Run the new toast UX test to verify pass**

Run: `npx vitest run src/components/ExportCommitmentButton.test.tsx -t "toast UX"`
Expected: PASS — toast text appears.

- [ ] **Step 9: Run the full ExportCommitmentButton test file**

Run: `npx vitest run src/components/ExportCommitmentButton.test.tsx`
Expected: All previous + new tests pass (5 tests total).

- [ ] **Step 10: Commit**

```bash
git add src/components/Toast.tsx src/components/Toast.test.tsx \
        src/components/ExportCommitmentButton.tsx \
        src/components/ExportCommitmentButton.test.tsx
git commit -m "feat(h2): toast feedback on PDF commitment export"
```

---

## Task 4 — Verify, code-review, final commit

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass; no new failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Manual smoke check via dev server**

Start: `npm run dev` (background)

Verify:
- Visit `/` → polygon hover thickens outline + cursor becomes pointer.
- Click POPHAM polygon → URL becomes `/parcel/304-78-386`.
- Click HOGUE polygon → URL becomes `/parcel/304-77-689`.
- On a hard refresh of `/`, "Loading county map…" is briefly visible until tiles paint.
- Visit `/parcel/304-78-386/encumbrances`, click `Export Commitment for Parcel` → toast appears bottom-right with "Generating…" then "Downloaded: commitment-30478386-…pdf", auto-dismisses ~3s later.
- Repeat the export from a Proof Drawer view (`/parcel/304-78-386/instrument/20210075858`) and from Transaction Wizard step 4 (`/parcel/304-78-386/wizard` if route exists; otherwise verify by inspection that `TransactionWizard.tsx` still uses `ExportCommitmentButton`, which guarantees identical behavior).
- Browser console clean on each page.

Stop the dev server when done.

- [ ] **Step 5: Use superpowers:requesting-code-review skill**

Invoke the code-reviewer per the skill instructions. Pass the diff and the success criteria from the original prompt. Address any blocking findings before commit.

- [ ] **Step 6: Final aggregate commit (only if Tasks 1-3 commits already exist; otherwise this is a no-op)**

Only if the per-task commits in Tasks 1-3 were skipped, or if the code reviewer required follow-up edits, create one final commit with the message specified in the original prompt:

```bash
git add -A
git commit -m "feat(h2): interactive map parcel selection + tile loading state + PDF export toast"
```

If Tasks 1-3 each committed individually, this step is unnecessary — the branch already has the per-fix commits. Per the original spec, the final commit message is: `feat(h2): interactive map parcel selection + tile loading state + PDF export toast`. **Do NOT merge.** **Do NOT push.**

---

## Self-Review Checklist

**Spec coverage:**
- Fix 1 (clickable polygons + hover): Task 1 ✓
- Fix 2 (loading overlay until idle): Task 2 ✓
- Fix 3 (toast on PDF export): Task 3 ✓
- POPHAM + HOGUE specifically navigable: confirmed by `parcels-geo.json` content + URL assertion in smoke check ✓
- Other 3 parcels lack GeoJSON → no clickable polygons rendered: confirmed by `parcels-geo.json` content ✓
- No new npm dependency: Toast is a hand-rolled component ✓
- Toast text format `Generating commitment for {owner} — {APN}…` and `Downloaded: {filename}.pdf`: Step 7 string templates ✓
- Toast auto-dismiss after 3s: Toast.tsx setTimeout(3000) ✓
- Works at all 3 export sites: single-component change in `ExportCommitmentButton` ✓
- npm test, lint, build pass: Task 4 ✓
- Browser console clean: Task 4 Step 4 ✓
- Final commit message + no merge: Task 4 Step 6 ✓

**Placeholder scan:** No "TBD", "implement later", or "similar to Task N" — every step has the actual code.

**Type consistency:** `ToastVariant`, `ToastProps`, `ToastState` and `triggerCommitmentDownload` signature all consistent across files.
