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

  it("renders SearchHero above the map section", () => {
    // SearchHero is now the first child of <main> (CountyHeartbeat was
    // removed — the slim verified-through strip in RootLayout carries the
    // moat claim on its own). Verify SearchHero precedes the map section.
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

  it("renders a single 'Why this is different' entry point in place of the old marketing tiles", () => {
    // The three marketing tiles (Spatial custody / Verified freshness /
    // Chain intelligence) now live on /why. A single slim link between
    // FeaturedParcels and the footer is the landing's sole signpost to
    // that narrative — the map + search are the hero, not the pitch.
    render(wrap(<LandingPage />));
    const link = screen.getByRole("link", { name: /why this is different/i });
    expect(link).toHaveAttribute("href", "/why");
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

describe("LandingPage — CountyHeartbeat removed", () => {
  afterEach(() => cleanup());

  it("does not render the heartbeat band on the landing page", () => {
    render(
      <MemoryRouter>
        <TerminologyProvider>
          <LandingPage />
        </TerminologyProvider>
      </MemoryRouter>,
    );
    // The heartbeat band was removed from the landing page because its
    // big counter + "recording day" paragraph competed with the primary
    // search task. The one-line verified-through strip (PipelineBanner in
    // RootLayout) carries the moat claim without the dashboard framing.
    const section = document.querySelector(
      'section[aria-label="Maricopa Recorder live-pacing band"]',
    );
    expect(section).toBeNull();
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
