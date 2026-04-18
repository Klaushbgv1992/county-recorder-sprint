import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/account/AuthContext";
import { StarButton } from "../../src/components/account/StarButton";

function mount() {
  return render(
    <AuthProvider>
      <StarButton kind="parcel" id="304-78-386" label="304-78-386" />
    </AuthProvider>,
  );
}

describe("StarButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("prompts sign-in when signed out", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: /watch/i }));
    expect(screen.getByText(/sign in to watch/i)).toBeInTheDocument();
  });

  it("toggles watched state when signed in", async () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    mount();
    await userEvent.click(screen.getByRole("button", { name: /watch/i }));
    expect(screen.getByRole("button", { name: /watching/i })).toBeInTheDocument();
  });
});
