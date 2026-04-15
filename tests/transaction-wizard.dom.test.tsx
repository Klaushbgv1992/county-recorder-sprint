import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Routes, Route } from "react-router";
import { TransactionWizard } from "../src/components/TransactionWizard";

const POPHAM_APN = "304-78-386";

function renderWizardAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/parcel/:apn/commitment/new"
          element={<TransactionWizard />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TransactionWizard", () => {
  afterEach(() => cleanup());

  it("renders step 1 with Transaction type heading, Refinance option, and disabled Next", () => {
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    expect(
      screen.getByRole("heading", { name: /transaction type/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^refinance$/i }),
    ).toBeInTheDocument();
    const next = screen.getByRole("button", { name: /^next$/i });
    expect(next).toBeDisabled();
  });

  it("enables Next after selecting a type, and clicking Next advances to step 2", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);

    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    const next = screen.getByRole("button", { name: /^next$/i });
    expect(next).not.toBeDisabled();

    await user.click(next);
    // Step 2 shows an effective-date input (type="date").
    expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument();
  });

  it("step 2 requires effective date, buyer, and lender before Next enables", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 2. Buyer auto-fills from parcel.current_owner; lender is empty so
    // Next should stay disabled until user fills lender.
    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    const next = screen.getByRole("button", { name: /^next$/i });
    expect(next).toBeDisabled();

    await user.type(lender, "ACME BANK, N.A.");
    expect(next).not.toBeDisabled();
  });

  it("step 3 renders generated B-I items including BI-TAX-CERT and BAY EQUITY payoff", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    await user.type(lender, "ACME BANK, N.A.");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Heading mentions Schedule B-I
    expect(
      screen.getByRole("heading", { name: /schedule b-i/i }),
    ).toBeInTheDocument();
    // Tax certificate template always emits
    expect(screen.getByText(/tax certificate/i)).toBeInTheDocument();
    // POPHAM open DOT (20210057847) pays off BAY EQUITY LLC
    expect(screen.getByText(/BAY EQUITY LLC/)).toBeInTheDocument();
  });

  it("\"Why this item\" disclosure expands to show why text", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    await user.type(lender, "ACME BANK, N.A.");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // "why" for BI-TAX-CERT is "Required on every residential closing..."
    expect(
      screen.queryByText(/required on every residential closing/i),
    ).not.toBeInTheDocument();

    const whyButtons = screen.getAllByRole("button", {
      name: /why this item/i,
    });
    await user.click(whyButtons[whyButtons.length - 1]);
    expect(
      screen.getByText(/required on every residential closing/i),
    ).toBeInTheDocument();
  });

  it("Back from step 3 returns to step 2 with inputs preserved", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    await user.type(lender, "ACME BANK, N.A.");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // On step 3 — click Back.
    await user.click(screen.getByRole("button", { name: /^back$/i }));

    // Back on step 2 — lender value persisted.
    const lender2 = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    expect(lender2.value).toBe("ACME BANK, N.A.");
  });

  it("step 4 renders a summary block and an Export button", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    await user.type(lender, "ACME BANK, N.A.");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Summary shows lender, buyer, etc.
    expect(screen.getByText(/ACME BANK, N\.A\./)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export commitment pdf/i }),
    ).toBeInTheDocument();
  });

  it("renders Not in this corpus fallback for unknown APN", () => {
    renderWizardAt("/parcel/999-99-999/commitment/new");
    expect(screen.getByText(/not in this corpus/i)).toBeInTheDocument();
  });
});
