import { describe, it, expect, afterEach, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { SpatialContextPanel } from "../src/components/SpatialContextPanel";

// jsdom 29 in this vitest setup ships a localStorage object with no methods.
// Polyfill it so the component's persist-collapse path works in the test env.
beforeAll(() => {
  const store = new Map<string, string>();
  const polyfill: Storage = {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal("localStorage", polyfill);
  Object.defineProperty(window, "localStorage", {
    value: polyfill,
    configurable: true,
  });
});

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

describe("SpatialContextPanel", () => {
  beforeEach(() => {
    window.localStorage.removeItem("spatial-panel-collapsed");
  });
  afterEach(() => cleanup());

  it("renders for POPHAM with subject layer + subdivision layer", () => {
    render(
      <MemoryRouter>
        <SpatialContextPanel apn="304-78-386" />
      </MemoryRouter>,
    );
    expect(
      screen.getByTestId("layer-subject-304-78-386-fill"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("layer-seville-parcel-3-outline"),
    ).toBeInTheDocument();
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
