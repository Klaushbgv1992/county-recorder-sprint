import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CountyMap } from "../src/components/CountyMap";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";
import type { OverlayName } from "../src/logic/overlay-state";

vi.mock("react-map-gl/maplibre", () => ({
  default: ({
    children,
    interactiveLayerIds,
  }: {
    children: React.ReactNode;
    interactiveLayerIds?: string[];
  }) => (
    <div data-testid="mapgl" data-interactive={JSON.stringify(interactiveLayerIds ?? [])}>
      {children}
    </div>
  ),
  Source: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-testid={`source-${id}`}>{children}</div>
  ),
  Layer: ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ current: undefined }),
}));

afterEach(() => cleanup());

const emptyGeo: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function renderMap(props?: Partial<React.ComponentProps<typeof CountyMap>>) {
  return render(
    <TerminologyProvider>
      <CountyMap
        highlightedParcels={[{ apn: "304-78-386", status: "primary" }]}
        onParcelClick={() => {}}
        {...props}
      />
    </TerminologyProvider>,
  );
}

describe("CountyMap — overlay integration", () => {
  it("interactiveLayerIds: curated first, then cached-hit, then assessor-fill; no overlay layers", () => {
    const { getByTestId } = renderMap({
      assessorPolygons: emptyGeo,
      overlays: new Set<OverlayName>(["encumbrance", "anomaly", "lastdeed"]),
    });
    const ids: string[] = JSON.parse(
      getByTestId("mapgl").getAttribute("data-interactive") ?? "[]",
    );
    const curatedIdx = ids.findIndex((i) => i.includes("parcel-304-78-386-fill"));
    const cachedIdx = ids.indexOf("cached-neighbors-fill-hit");
    const assessorIdx = ids.indexOf("assessor-only-fill");
    expect(curatedIdx).toBeGreaterThanOrEqual(0);
    expect(cachedIdx).toBeGreaterThan(curatedIdx);
    expect(assessorIdx).toBeGreaterThan(cachedIdx);
    // Overlay layer IDs must NOT be in interactiveLayerIds
    expect(ids).not.toContain("overlay-encumbrance-fill");
    expect(ids).not.toContain("overlay-anomaly-outline");
    expect(ids).not.toContain("overlay-lastdeed-fill");
  });

  it("renders assessor-only source when assessorPolygons provided", () => {
    const { getByTestId } = renderMap({ assessorPolygons: emptyGeo });
    expect(getByTestId("source-assessor-only")).toBeDefined();
  });

  it("renders cached-neighbors source", () => {
    const { getByTestId } = renderMap({ assessorPolygons: emptyGeo });
    expect(getByTestId("source-cached-neighbors")).toBeDefined();
  });

  it("backward compat: renders without new props (defaults)", () => {
    const { getByTestId } = renderMap();
    expect(getByTestId("mapgl")).toBeDefined();
  });
});
