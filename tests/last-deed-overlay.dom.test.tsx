import { vi } from "vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("react-map-gl/maplibre", () => ({
  Source: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-testid={`source-${id}`}>{children}</div>
  ),
  Layer: ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />,
}));

import { LastDeedOverlayLayer } from "../src/components/map/LastDeedOverlayLayer";

const geo: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { DEED_DATE: 1609459200000 },
      geometry: { type: "Point", coordinates: [0, 0] },
    },
  ],
};

describe("LastDeedOverlayLayer", () => {
  afterEach(() => cleanup());

  it("renders nothing when not active", () => {
    const { container } = render(
      <LastDeedOverlayLayer active={false} geojson={geo} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders source and both layers when active", () => {
    const { getByTestId } = render(
      <LastDeedOverlayLayer active={true} geojson={geo} />
    );
    expect(getByTestId("source-overlay-lastdeed")).toBeDefined();
    expect(getByTestId("layer-overlay-lastdeed-fill")).toBeDefined();
    expect(getByTestId("layer-overlay-lastdeed-outline-null")).toBeDefined();
  });

  it("renders with empty geojson without crashing", () => {
    const empty: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    const { getByTestId } = render(
      <LastDeedOverlayLayer active={true} geojson={empty} />
    );
    expect(getByTestId("source-overlay-lastdeed")).toBeDefined();
  });
});
