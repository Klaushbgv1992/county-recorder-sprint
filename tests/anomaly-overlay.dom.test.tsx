import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { AnomalyOverlayLayer } from "../src/components/map/AnomalyOverlayLayer";

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

const anomalies = [
  { parcel_apn: "304-78-386", severity: "high" as const },
  { parcel_apn: "304-78-386", severity: "medium" as const },
  { parcel_apn: "304-77-689", severity: "high" as const },
];

describe("AnomalyOverlayLayer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when not active", () => {
    const { container } = render(
      <AnomalyOverlayLayer active={false} anomalies={anomalies} parcelsGeo={geo} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders source with only anomaly-carrying parcels when active", () => {
    const { getByTestId } = render(
      <AnomalyOverlayLayer active={true} anomalies={anomalies} parcelsGeo={geo} />,
    );
    expect(getByTestId("source-overlay-anomaly").getAttribute("data-features")).toBe("2");
  });

  it("renders the outline layer", () => {
    const { getAllByTestId } = render(
      <AnomalyOverlayLayer active={true} anomalies={anomalies} parcelsGeo={geo} />,
    );
    const layers = getAllByTestId("layer-overlay-anomaly-outline");
    expect(layers.length).toBeGreaterThan(0);
  });

  it("renders nothing when no anomalies match any parcel", () => {
    const noMatch = [{ parcel_apn: "999-99-999", severity: "low" as const }];
    const { container } = render(
      <AnomalyOverlayLayer active={true} anomalies={noMatch} parcelsGeo={geo} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
