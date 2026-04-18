import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../src/router";
import { TerminologyProvider } from "../../src/terminology/TerminologyContext";

vi.mock("react-map-gl/maplibre", () => ({
  default: () => null, Source: () => null, Layer: () => null, Marker: () => null,
}));

describe("portal smoke", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("signs in → dashboard → watchlist → inbox → preferences → signs out", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<TerminologyProvider><RouterProvider router={router} /></TerminologyProvider>);

    await userEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    await userEvent.click(screen.getByRole("button", { name: /jordan/i }));
    await userEvent.click(screen.getByRole("link", { name: /dashboard/i }));

    expect(screen.getByText(/welcome back, jordan/i)).toBeInTheDocument();

    router.navigate("/account/watchlist");
    expect(await screen.findByText(/nothing watched yet/i)).toBeInTheDocument();

    router.navigate("/account/inbox");
    expect(await screen.findByRole("heading", { name: /inbox/i })).toBeInTheDocument();

    router.navigate("/account/preferences");
    expect(await screen.findByRole("switch", { name: /email notifications/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /jordan/i }));
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    const signInButtons = await screen.findAllByRole("button", { name: /sign in with google/i });
    expect(signInButtons.length).toBeGreaterThan(0);
  });
});
