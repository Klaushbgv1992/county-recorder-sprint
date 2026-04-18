import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { ToastProvider } from "../../src/components/ui/Toast";
import { CorrectionRequestButton } from "../../src/components/account/CorrectionRequestButton";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <CorrectionRequestButton parcelApn="304-78-386" />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CorrectionRequestButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("submits a correction and returns a ref", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: /request correction/i }));
    await userEvent.type(screen.getByLabelText(/claim/i), "I am the record owner.");
    await userEvent.type(screen.getByLabelText(/^requested correction$/i), "Name typo.");
    await userEvent.click(screen.getByRole("button", { name: /submit correction/i }));
    const refs = await screen.findAllByText(/MCR-CORR-\d{4}-\d{5}/);
    expect(refs.length).toBeGreaterThan(0);
  });
});
