import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CountyMap } from "../src/components/CountyMap";

vi.mock("react-map-gl/maplibre", () => ({
  default: ({
    children,
    onLoad,
  }: {
    children: React.ReactNode;
    onLoad?: () => void;
  }) => {
    // Default mock: do NOT call onLoad — leaves the map in "loading" state
    // so tests can assert on the overlay.
    void onLoad;
    return <div data-testid="map">{children}</div>;
  },
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

  it("renders a loading overlay until the map fires onLoad", () => {
    const { getByText } = render(
      <CountyMap
        highlightedParcels={[]}
        onParcelClick={vi.fn()}
      />,
    );
    expect(getByText(/Loading county map/i)).toBeInTheDocument();
  });
});
