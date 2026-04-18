import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { ToastProvider } from "../../src/components/ui/Toast";
import { FlagInstrumentButton } from "../../src/components/account/FlagInstrumentButton";

function mountSignedIn() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <FlagInstrumentButton instrumentNumber="20210075858" parcelApn="304-78-386" />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FlagInstrumentButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("opens a dialog with reason + note fields", async () => {
    mountSignedIn();
    await userEvent.click(screen.getByRole("button", { name: /report an issue/i }));
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
  });

  it("submits and shows a reference number receipt", async () => {
    mountSignedIn();
    await userEvent.click(screen.getByRole("button", { name: /report an issue/i }));
    await userEvent.selectOptions(screen.getByLabelText(/reason/i), "wrong_party_name");
    await userEvent.type(screen.getByLabelText(/note/i), "The grantor has a typo.");
    await userEvent.click(screen.getByRole("button", { name: /submit flag/i }));
    const refs = await screen.findAllByText(/MCR-REPORT-\d{4}-\d{5}/);
    expect(refs.length).toBeGreaterThan(0);
  });
});
