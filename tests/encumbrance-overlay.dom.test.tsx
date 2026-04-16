import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { EncumbranceOverlayLayer } from "../src/components/map/EncumbranceOverlayLayer";

vi.mock("react-map-gl/maplibre", () => ({
  Source: ({ children, id, data }: { children: React.ReactNode; id: string; data: unknown }) => (
    <div data-testid={`source-${id}`} data-features={JSON.stringify((data as { features?: unknown[] })?.features?.length)}>{children}</div>
  ),
  Layer: ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />,
}));

const geo: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { APN_DASH: "304-78-386" }, geometry: { type: "Point", coordinates: [0, 0] } },
    { type: "Feature", properties: { APN_DASH: "304-77-689" }, geometry: { type: "Point", coordinates: [0, 0] } },
    { type: "Feature", properties: { APN_DASH: "304-78-999" }, geometry: { type: "Point", coordinates: [0, 0] } },
  ],
};

const lifecycles = [
  { id: "lc-001", root_instrument: "20130183450", status: "released" },
  { id: "lc-002", root_instrument: "20210057847", status: "open" },
  { id: "lc-003", root_instrument: "20150516730", status: "open" },
];

const instrumentToApn = new Map([
  ["20130183450", "304-78-386"],
  ["20210057847", "304-78-386"],
  ["20150516730", "304-77-689"],
]);

describe("EncumbranceOverlayLayer", () => {
  it("renders nothing when not active", () => {
    const { container } = render(
      <EncumbranceOverlayLayer active={false} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders source with only open-lifecycle parcels when active", () => {
    const { getByTestId } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    const source = getByTestId("source-overlay-encumbrance");
    expect(source.getAttribute("data-features")).toBe("2");
  });

  it("renders fill and outline layers", () => {
    const { queryAllByTestId } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    const sources = queryAllByTestId("source-overlay-encumbrance");
    const currentSource = sources[sources.length - 1];
    expect(currentSource.querySelector('[data-testid="layer-overlay-encumbrance-fill"]')).toBeDefined();
    expect(currentSource.querySelector('[data-testid="layer-overlay-encumbrance-outline"]')).toBeDefined();
  });

  it("renders nothing when no open lifecycles exist", () => {
    const closedOnly = [{ id: "lc-001", root_instrument: "20130183450", status: "released" }];
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={closedOnly} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
