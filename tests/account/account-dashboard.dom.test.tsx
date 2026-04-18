import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountDashboard } from "../../src/components/account/AccountDashboard";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider><AccountDashboard /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("AccountDashboard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("greets the user and shows metric cards", () => {
    mount();
    expect(screen.getByText(/welcome back, jordan/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^watchlist$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^inbox$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^statutory notices$/i })).toBeInTheDocument();
  });

  it("renders at least one preview pill", () => {
    mount();
    expect(screen.getAllByText(/preview/i).length).toBeGreaterThan(0);
  });
});
