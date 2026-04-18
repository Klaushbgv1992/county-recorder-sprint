import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "../../src/components/RootLayout";

vi.mock("react-map-gl/maplibre", () => ({
  default: () => null, Source: () => null, Layer: () => null, Marker: () => null,
}));

function mount(url: string) {
  const router = createMemoryRouter(
    [{
      element: <RootLayout />,
      children: [
        { path: "/", element: <div data-testid="outlet">PUBLIC</div> },
        { path: "account", element: <div>ACCOUNT</div> },
      ],
    }],
    { initialEntries: [url] },
  );
  return render(<RouterProvider router={router} />);
}

describe("HeaderBar in RootLayout", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows the sign-in button when signed out", () => {
    mount("/");
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("flips to avatar menu after sign-in", async () => {
    mount("/");
    await userEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    expect(screen.getByRole("button", { name: /jordan/i })).toBeInTheDocument();
  });

  it("preserves the existing PipelineBanner on public routes", () => {
    mount("/");
    expect(screen.getByRole("link", { name: /see pipeline/i })).toBeInTheDocument();
  });
});
