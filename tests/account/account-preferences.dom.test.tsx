import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountPreferences } from "../../src/components/account/AccountPreferences";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(<MemoryRouter><AuthProvider><AccountPreferences /></AuthProvider></MemoryRouter>);
}

describe("AccountPreferences", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders email and SMS switches", () => {
    mount();
    expect(screen.getByRole("switch", { name: /email notifications/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /sms notifications/i })).toBeInTheDocument();
  });

  it("persists toggle state", async () => {
    const { unmount } = mount();
    const sms = screen.getByRole("switch", { name: /sms notifications/i });
    await userEvent.click(sms);
    unmount();
    mount();
    expect(screen.getByRole("switch", { name: /sms notifications/i })).toHaveAttribute("aria-checked", "true");
  });
});
