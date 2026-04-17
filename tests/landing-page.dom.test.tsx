import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { LandingPage } from "../src/components/LandingPage";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";

vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Source: ({ children }: { children: React.ReactNode }) => <div data-testid="source">{children}</div>,
  Layer: (props: { id: string }) => <div data-testid={`layer-${props.id}`} />,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ current: undefined }),
}));

// Mock dynamic imports so async loading doesn't make tests flaky
vi.mock("../src/data/gilbert-parcels-geo.json", () => ({
  default: { type: "FeatureCollection", features: [], metadata: { record_count: 0 } },
}));

vi.mock("../src/data/load-cached-neighbors", () => ({
  default: new Map(),
}));

function wrap(ui: React.ReactNode, initialEntries?: string[]) {
  return (
    <MemoryRouter initialEntries={initialEntries ?? ["/"]}>
      <TerminologyProvider>{ui}</TerminologyProvider>
    </MemoryRouter>
  );
}

describe("LandingPage", () => {
  afterEach(() => cleanup());

  it("renders map region + search box below", () => {
    render(wrap(<LandingPage />));
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText(/Maricopa County Recorder/i)).toBeInTheDocument();
  });

  it("renders the moat WHY copy for the map", () => {
    render(wrap(<LandingPage />));
    expect(
      screen.getByText(/assessor's file/i),
    ).toBeInTheDocument();
  });

  it("renders link to /county-activity", () => {
    render(wrap(<LandingPage />));
    const activityLink = screen.getByRole("link", { name: /county activity/i });
    expect(activityLink).toHaveAttribute("href", "/county-activity");
  });

  // New: Search bar mounts
  it("renders a search bar with role=combobox", () => {
    render(wrap(<LandingPage />));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  // New: Overlay toggles mount with 3 expected buttons
  it("renders 3 overlay toggle buttons", () => {
    render(wrap(<LandingPage />));
    expect(screen.getByRole("button", { name: /open encumbrances/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /curator anomalies/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /last deed recorded/i })).toBeInTheDocument();
  });

  // New: FeaturedParcels below map
  it("renders the featured-parcels anchor element below the map", () => {
    render(wrap(<LandingPage />));
    const fp = document.getElementById("featured-parcels");
    expect(fp).not.toBeNull();
  });

  // New: Anomaly panel wiring — clicking "Curator anomalies" opens the panel
  it("opens anomaly summary panel when Curator anomalies toggle is clicked", async () => {
    render(wrap(<LandingPage />));
    const toggleBtn = screen.getByRole("button", { name: /curator anomalies/i });
    await act(async () => {
      fireEvent.click(toggleBtn);
    });
    // AnomalySummaryPanel renders an h3 with "Curator anomalies" when open
    expect(screen.getByRole("heading", { name: /curator anomalies/i })).toBeInTheDocument();
  });
});

describe("LandingPage — /why links", () => {
  afterEach(() => cleanup());

  it("renders a 'Why this matters' link in the header", () => {
    render(wrap(<LandingPage />));
    const header = document.querySelector("header");
    expect(header).toBeTruthy();
    const link = header!.querySelector('a[href="/why"]');
    expect(link).toBeTruthy();
    expect(link?.textContent?.toLowerCase()).toContain("why this matters");
  });

  it("renders a 'Why this matters' link in the footer", () => {
    render(wrap(<LandingPage />));
    const footer = document.querySelector("footer");
    expect(footer).toBeTruthy();
    const link = footer!.querySelector('a[href="/why"]');
    expect(link).toBeTruthy();
    expect(link?.textContent?.toLowerCase()).toContain("why this matters");
  });
});

describe("LandingPage — CountyHeartbeat mount", () => {
  afterEach(() => cleanup());

  it("renders the heartbeat band above the map section", () => {
    render(
      <MemoryRouter>
        <TerminologyProvider>
          <LandingPage />
        </TerminologyProvider>
      </MemoryRouter>,
    );
    const section = document.querySelector(
      'section[aria-label="Maricopa Recorder live-pacing band"]',
    );
    expect(section).toBeTruthy();
    // Heartbeat sits before the <header>; <header> sits before the map.
    const main = document.querySelector("main");
    const heartbeatIndex = Array.from(main!.children).findIndex(
      (el) => el.getAttribute("aria-label") === "Maricopa Recorder live-pacing band",
    );
    const headerIndex = Array.from(main!.children).findIndex(
      (el) => el.tagName === "HEADER",
    );
    expect(heartbeatIndex).toBeGreaterThanOrEqual(0);
    expect(headerIndex).toBeGreaterThan(heartbeatIndex);
  });
});

describe("LandingPage — URL state deep-link", () => {
  afterEach(() => cleanup());

  // New: deep-link test — URL ?q=popham should populate the search bar
  it("pre-populates search bar from URL ?q= parameter", () => {
    render(wrap(<LandingPage />, ["/?q=popham&apn=304-78-386&overlay=encumbrance"]));
    const searchBar = screen.getByRole("combobox") as HTMLInputElement;
    expect(searchBar.value).toBe("popham");
  });
});
