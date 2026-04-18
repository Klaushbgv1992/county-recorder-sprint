import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountInbox } from "../../src/components/account/AccountInbox";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  localStorage.setItem(
    "mcr.account.watchlist.v1",
    JSON.stringify({ parcels: ["304-78-386"], parties: ["wells-fargo"] }),
  );
  return render(<MemoryRouter><AuthProvider><AccountInbox /></AuthProvider></MemoryRouter>);
}

describe("AccountInbox", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("lists seeded notifications with a preview pill", () => {
    mount();
    expect(screen.getByText(/new instrument recorded/i)).toBeInTheDocument();
    expect(screen.getAllByText(/preview/i).length).toBeGreaterThan(0);
  });

  it("mark-all-read zeroes the unread count", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    expect(screen.getByTestId("unread-count")).toHaveTextContent("0");
  });
});
