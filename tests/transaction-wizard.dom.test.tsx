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

  it("step 2 requires all refinance fields before Next enables", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 2. Borrower auto-fills from parcel.current_owner; lender, loan
    // amount, and existing DOT lifecycle are empty so Next stays disabled.
    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    const loanAmt = screen.getByLabelText(/new loan amount/i) as HTMLInputElement;
    const dotSelect = screen.getByLabelText(/existing dot lifecycle/i) as HTMLSelectElement;
    const next = screen.getByRole("button", { name: /^next$/i });
    expect(next).toBeDisabled();

    await user.type(lender, "ACME BANK, N.A.");
    expect(next).toBeDisabled(); // still missing loan amount + lifecycle

    await user.type(loanAmt, "$350,000");
    expect(next).toBeDisabled(); // still missing lifecycle

    // Select the first open lifecycle option
    const option = dotSelect.options[1]; // index 0 is "— select —"
    await user.selectOptions(dotSelect, option.value);
    expect(next).not.toBeDisabled();
  });

  it("step 3 renders generated B-I items including BI-TAX-CERT and BAY EQUITY payoff", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    await user.type(lender, "ACME BANK, N.A.");
    await user.type(screen.getByLabelText(/new loan amount/i), "$350,000");
    const dotSelect = screen.getByLabelText(/existing dot lifecycle/i) as HTMLSelectElement;
    await user.selectOptions(dotSelect, dotSelect.options[1].value);
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
    await user.type(screen.getByLabelText(/new loan amount/i), "$350,000");
    const dotSelect = screen.getByLabelText(/existing dot lifecycle/i) as HTMLSelectElement;
    await user.selectOptions(dotSelect, dotSelect.options[1].value);
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // "why" text is hidden until expanded. Clicking a "Why this item" button
    // toggles it to "Hide why" and reveals the explanation paragraph.
    const whyButtons = screen.getAllByRole("button", {
      name: /why this item/i,
    });
    expect(whyButtons.length).toBeGreaterThan(0);

    await user.click(whyButtons[0]);
    // After clicking, the button label changes to "Hide why"
    expect(
      screen.getByRole("button", { name: /hide why/i }),
    ).toBeInTheDocument();
  });

  it("Back from step 3 returns to step 2 with inputs preserved", async () => {
    const user = userEvent.setup();
    renderWizardAt(`/parcel/${POPHAM_APN}/commitment/new`);
    await user.click(screen.getByRole("button", { name: /^refinance$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    const lender = screen.getByLabelText(/new lender/i) as HTMLInputElement;
    await user.type(lender, "ACME BANK, N.A.");
    await user.type(screen.getByLabelText(/new loan amount/i), "$350,000");
    const dotSelect = screen.getByLabelText(/existing dot lifecycle/i) as HTMLSelectElement;
    await user.selectOptions(dotSelect, dotSelect.options[1].value);
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
    await user.type(screen.getByLabelText(/new loan amount/i), "$350,000");
    const dotSelect = screen.getByLabelText(/existing dot lifecycle/i) as HTMLSelectElement;
    await user.selectOptions(dotSelect, dotSelect.options[1].value);
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Summary shows lender, borrower, etc.
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
