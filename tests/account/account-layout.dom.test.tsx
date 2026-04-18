import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountLayout } from "../../src/components/account/AccountLayout";

function mount(signedIn: boolean) {
  if (signedIn) localStorage.setItem("mcr.account.signedIn.v1", "1");
  const router = createMemoryRouter(
    [{
      element: <AuthProvider><AccountLayout /></AuthProvider>,
      children: [{ path: "account", element: <div>DASH</div> }],
    }],
    { initialEntries: ["/account"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("AccountLayout", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows sign-in prompt when signed out", () => {
    mount(false);
    expect(screen.getByText(/sign in to access your account/i)).toBeInTheDocument();
  });

  it("renders the full nav when signed in", () => {
    mount(true);
    for (const name of ["Dashboard","Watchlist","Inbox","Statutory notices","Preferences","Records requests","My commitments"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });
});
