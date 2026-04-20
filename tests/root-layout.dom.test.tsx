import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "../src/components/RootLayout";

// react-map-gl would crash jsdom if a public route mounts a map; stub it
// so RootLayout rendering is independent of downstream component imports.
vi.mock("react-map-gl/maplibre", () => ({
  default: () => null,
  Source: () => null,
  Layer: () => null,
  Marker: () => null,
}));

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [
          { path: "/", element: <div data-testid="public-outlet">PUBLIC</div> },
          { path: "staff", element: <div data-testid="staff-outlet">STAFF</div> },
          { path: "staff/queue", element: <div data-testid="staff-queue-outlet">STAFF-QUEUE</div> },
        ],
      },
    ],
    { initialEntries: [url] },
  );
  return render(<RouterProvider router={router} />);
}

describe("RootLayout", () => {
  afterEach(() => cleanup());

  it("renders the PipelineBanner above the outlet on public routes", () => {
    renderAt("/");
    expect(screen.getByTestId("public-outlet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see pipeline/i })).toBeInTheDocument();
  });

  it("also renders the PipelineBanner on /staff so brand/chrome is consistent", () => {
    renderAt("/staff");
    expect(screen.getByTestId("staff-outlet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see pipeline/i })).toBeInTheDocument();
  });

  it("also renders the PipelineBanner on /staff/queue (nested staff route)", () => {
    renderAt("/staff/queue");
    expect(screen.getByTestId("staff-queue-outlet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see pipeline/i })).toBeInTheDocument();
  });

  it("renders the clickable Land Custodian Portal brand link home on /staff", () => {
    renderAt("/staff");
    const brand = screen.getByRole("link", { name: /land custodian portal.*home/i });
    expect(brand).toHaveAttribute("href", "/");
  });
});
