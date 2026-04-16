import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { LandingPage } from "../src/components/LandingPage";

vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Source: ({ children }: { children: React.ReactNode }) => <div data-testid="source">{children}</div>,
  Layer: (props: { id: string }) => <div data-testid={`layer-${props.id}`} />,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
}));

describe("LandingPage", () => {
  afterEach(() => cleanup());

  it("renders map region + search box below", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText(/Maricopa County Recorder/i)).toBeInTheDocument();
  });

  it("renders the moat WHY copy for the map", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/assessor's file/i),
    ).toBeInTheDocument();
  });

  it("renders link to /county-activity", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const activityLink = screen.getByRole("link", { name: /county activity/i });
    expect(activityLink).toHaveAttribute("href", "/county-activity");
  });
});

describe("LandingPage — /why links", () => {
  afterEach(() => cleanup());

  it("renders a 'Why this matters' link in the header", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const header = document.querySelector("header");
    expect(header).toBeTruthy();
    const link = header!.querySelector('a[href="/why"]');
    expect(link).toBeTruthy();
    expect(link?.textContent?.toLowerCase()).toContain("why this matters");
  });

  it("renders a 'Why this matters' link in the footer", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const footer = document.querySelector("footer");
    expect(footer).toBeTruthy();
    const link = footer!.querySelector('a[href="/why"]');
    expect(link).toBeTruthy();
    expect(link?.textContent?.toLowerCase()).toContain("why this matters");
  });
});
