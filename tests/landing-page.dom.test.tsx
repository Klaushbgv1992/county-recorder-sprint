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

  it("renders SearchHero between CountyHeartbeat and the map section", () => {
    // SearchHero replaced the old <section role="search"> below the map.
    // The search surface is now above the map (between CountyHeartbeat and
    // the map section). Verify it precedes the map section in the DOM.
    render(wrap(<LandingPage />));
    const combobox = screen.getByRole("combobox");
    expect(combobox).toBeInTheDocument();
    const main = document.querySelector("main")!;
    const children = Array.from(main.children);
    const heroIndex = children.findIndex((el) => el.contains(combobox));
    const mapSectionIndex = children.findIndex((el) =>
      el.tagName === "SECTION" && el.querySelector('[data-testid="map"]') !== null
    );
    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(mapSectionIndex).toBeGreaterThan(heroIndex);
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

  // The header's "Why this matters" link was removed alongside the old
  // hero block. The footer link below is the sole landing-page entry
  // point to /why, which is the intended single-path behavior.

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
    // Post-merge, the old <header> is gone; heartbeat sits directly
    // above the full-bleed map section. The heartbeat itself renders as
    // a <section aria-label="Maricopa Recorder live-pacing band"> so
    // "first section" alone doesn't disambiguate — find the first
    // section that is NOT the heartbeat.
    const main = document.querySelector("main");
    const children = Array.from(main!.children);
    const heartbeatIndex = children.findIndex(
      (el) => el.getAttribute("aria-label") === "Maricopa Recorder live-pacing band",
    );
    const mapSectionIndex = children.findIndex(
      (el, i) =>
        el.tagName === "SECTION" &&
        i !== heartbeatIndex &&
        el.getAttribute("aria-label") !== "Maricopa Recorder live-pacing band",
    );
    expect(heartbeatIndex).toBeGreaterThanOrEqual(0);
    expect(mapSectionIndex).toBeGreaterThan(heartbeatIndex);
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
