import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountCommitments } from "../../src/components/account/AccountCommitments";

describe("AccountCommitments", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows the empty state when nothing exported", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    render(<MemoryRouter><AuthProvider><AccountCommitments /></AuthProvider></MemoryRouter>);
    expect(screen.getByText(/no commitments exported yet/i)).toBeInTheDocument();
  });

  it("lists past exports with a re-export link", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    localStorage.setItem(
      "mcr.account.commitmentHistory.v1",
      JSON.stringify([{
        id: "x",
        parcel_apn: "304-78-386",
        exported_at: "2026-04-17T10:00:00Z",
        instrument_count: 12,
        open_encumbrance_count: 2,
      }]),
    );
    render(<MemoryRouter><AuthProvider><AccountCommitments /></AuthProvider></MemoryRouter>);
    expect(screen.getByText(/304-78-386/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /re-export/i })).toBeInTheDocument();
  });
});
