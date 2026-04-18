import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { ToastProvider } from "../../src/components/ui/Toast";
import { AccountRecordsRequest } from "../../src/components/account/AccountRecordsRequest";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AccountRecordsRequest />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AccountRecordsRequest", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders the form", () => {
    mount();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/details/i)).toBeInTheDocument();
  });

  it("submits and shows the returned reference in the history list", async () => {
    mount();
    await userEvent.type(screen.getByLabelText(/subject/i), "Copy of plat");
    await userEvent.type(screen.getByLabelText(/details/i), "Seville master plat");
    await userEvent.click(screen.getByRole("button", { name: /submit request/i }));
    const refs = await screen.findAllByText(/MCR-FOIA-\d{4}-\d{5}/);
    expect(refs.length).toBeGreaterThan(0);
  });
});
