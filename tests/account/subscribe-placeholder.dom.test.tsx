import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { SubscribePlaceholder } from "../../src/components/SubscribePlaceholder";

describe("SubscribePlaceholder", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("signed-out shows sign-in copy", () => {
    render(
      <MemoryRouter initialEntries={["/subscribe?apn=304-78-386"]}>
        <AuthProvider><SubscribePlaceholder /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/sign in to subscribe/i)).toBeInTheDocument();
  });

  it("signed-in links into watchlist and preferences", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    render(
      <MemoryRouter initialEntries={["/subscribe?apn=304-78-386"]}>
        <AuthProvider><SubscribePlaceholder /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /open watchlist/i })).toHaveAttribute("href", "/account/watchlist");
    expect(screen.getByRole("link", { name: /notification preferences/i })).toHaveAttribute("href", "/account/preferences");
  });
});
