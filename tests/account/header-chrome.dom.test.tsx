import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { SignInButton } from "../../src/components/account/SignInButton";
import { AccountMenu } from "../../src/components/account/AccountMenu";
import { NotificationBell } from "../../src/components/account/NotificationBell";

describe("header chrome", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("SignInButton renders with Google label and demo tag", () => {
    render(<AuthProvider><SignInButton /></AuthProvider>);
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByText(/demo/i)).toBeInTheDocument();
  });

  it("AccountMenu hides when signed out, shows user when signed in", () => {
    const { unmount } = render(
      <MemoryRouter>
        <AuthProvider><AccountMenu /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /jordan/i })).not.toBeInTheDocument();
    unmount();
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    render(
      <MemoryRouter>
        <AuthProvider><AccountMenu /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /jordan/i })).toBeInTheDocument();
  });

  it("NotificationBell shows unread count badge when signed in with watchlist items", async () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    localStorage.setItem(
      "mcr.account.watchlist.v1",
      JSON.stringify({ parcels: ["304-78-386"], parties: ["wells-fargo"] }),
    );
    render(
      <MemoryRouter>
        <AuthProvider><NotificationBell /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /inbox/i })).toBeInTheDocument();
    expect(screen.getByTestId("bell-badge")).toBeInTheDocument();
  });
});
