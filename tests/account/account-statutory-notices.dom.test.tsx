import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountStatutoryNotices } from "../../src/components/account/AccountStatutoryNotices";

function mount(watched: { parcels: string[]; parties: string[] }) {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  localStorage.setItem("mcr.account.watchlist.v1", JSON.stringify(watched));
  return render(<MemoryRouter><AuthProvider><AccountStatutoryNotices /></AuthProvider></MemoryRouter>);
}

describe("AccountStatutoryNotices", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows the moat explainer on every visit", () => {
    mount({ parcels: [], parties: [] });
    expect(screen.getByText(/only the county publishes statutory notice/i)).toBeInTheDocument();
  });

  it("filters to notices on or near watched parcels", () => {
    mount({ parcels: ["304-78-386"], parties: [] });
    expect(screen.getByText(/3690 e palmer st/i)).toBeInTheDocument();
    expect(screen.getByText(/2720 e palmer st/i)).toBeInTheDocument();
    expect(screen.queryByText(/hogue estate/i)).not.toBeInTheDocument();
  });
});
