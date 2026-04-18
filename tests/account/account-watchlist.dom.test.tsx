import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountWatchlist } from "../../src/components/account/AccountWatchlist";

describe("AccountWatchlist", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("empty state when nothing watched", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    render(<MemoryRouter><AuthProvider><AccountWatchlist /></AuthProvider></MemoryRouter>);
    expect(screen.getByText(/nothing watched yet/i)).toBeInTheDocument();
  });

  it("lists watched parcels and parties with deep links", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    localStorage.setItem(
      "mcr.account.watchlist.v1",
      JSON.stringify({ parcels: ["304-78-386"], parties: ["wells-fargo"] }),
    );
    render(<MemoryRouter><AuthProvider><AccountWatchlist /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("link", { name: /304-78-386/i })).toHaveAttribute("href", "/parcel/304-78-386");
    expect(screen.getByRole("link", { name: /wells-fargo/i })).toHaveAttribute("href", "/party/wells-fargo");
  });
});
