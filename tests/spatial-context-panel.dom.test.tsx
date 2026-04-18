import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { SpatialContextPanel } from "../src/components/SpatialContextPanel";

// localStorage polyfill is installed globally via tests/setup.ts

vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  Source: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Layer: (props: { id: string }) => <div data-testid={`layer-${props.id}`} />,
  Marker: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} data-testid="marker">
      {children}
    </button>
  ),
}));

// Default state is collapsed — tests that need the map/layers/WHY copy must
// expand the panel first via the "Show spatial context" button.
function expand() {
  const expander = screen.getByRole("button", { name: /show spatial context/i });
  fireEvent.click(expander);
}

describe("SpatialContextPanel", () => {
  beforeEach(() => {
    window.localStorage.removeItem("spatial-panel-collapsed");
  });
  afterEach(() => cleanup());

  it("defaults to collapsed with a 'Show spatial context' expander", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: /show spatial context/i }),
    ).toBeInTheDocument();
    // Map polygon layers are not rendered when collapsed.
    expect(
      screen.queryByTestId("layer-subject-304-78-386-fill"),
    ).not.toBeInTheDocument();
  });

  it("renders for POPHAM with subject layer + subdivision layer once expanded", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expand();
    expect(
      screen.getByTestId("layer-subject-304-78-386-fill"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("layer-seville-parcel-3-outline"),
    ).toBeInTheDocument();
  });

  it("shows WHY copy about custody chain once expanded", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expand();
    expect(screen.getByText(/custody chain/i)).toBeInTheDocument();
  });

  it("toggle button expands panel and persists state", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    const toggle = screen.getByRole("button", { name: /show spatial context/i });
    fireEvent.click(toggle);
    expect(localStorage.getItem("spatial-panel-collapsed")).toBe("false");
  });

  it("collapses again when the close button is clicked", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expand();
    const collapseBtn = screen.getByRole("button", { name: /collapse panel/i });
    fireEvent.click(collapseBtn);
    expect(localStorage.getItem("spatial-panel-collapsed")).toBe("true");
  });

  it("links to Maricopa Assessor in a new tab", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expand();
    const link = screen.getByRole("link", { name: /open in mc assessor/i });
    expect(link).toHaveAttribute(
      "href",
      "https://mcassessor.maricopa.gov/mcs/?q=30478386&mod=pd",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
  });

  it("renders for HOGUE with subject layer but no subdivision overlay", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-77-689" />
      </MemoryRouter>,
    );
    expand();
    expect(
      screen.getByTestId("layer-subject-304-77-689-fill"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("layer-seville-parcel-3-outline"),
    ).not.toBeInTheDocument();
  });

  it("shows no-spatial-data fallback for unknown APN", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="000-00-000" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no spatial data/i)).toBeInTheDocument();
  });
});
