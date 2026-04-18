import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CustodianQueryPage } from "./CustodianQueryPage";

afterEach(() => cleanup());

function mount() {
  return render(
    <MemoryRouter initialEntries={["/custodian-query"]}>
      <CustodianQueryPage />
    </MemoryRouter>
  );
}

describe("CustodianQueryPage", () => {
  it("renders the page header", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: /custodian query engine/i })).toBeInTheDocument();
  });

  it("renders two column headers — public API and county internal", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: /public api/i, level: 3 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /county internal/i, level: 3 })).toBeInTheDocument();
  });

  it("renders all 5 party names", async () => {
    mount();
    expect(await screen.findAllByText(/CHRISTOPHER POPHAM/)).not.toHaveLength(0);
    expect(screen.getAllByText(/ASHLEY POPHAM/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BRIAN J MADISON/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TANYA R MADISON/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/LIVING TRUST/).length).toBeGreaterThan(0);
  });

  it("renders the dead-ends strip with 3 indexes", async () => {
    mount();
    await waitFor(() => {
      expect(screen.getByText(/arizona department of revenue/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/irs notices/i)).toBeInTheDocument();
    expect(screen.getByText(/bankruptcy court/i)).toBeInTheDocument();
  });

  it("renders the outcome tile with query counts", async () => {
    mount();
    await waitFor(() => {
      expect(screen.getByText(/20 queries attempted/i)).toBeInTheDocument();
    });
  });

  it("renders the footer deep-link to POPHAM parcel", async () => {
    mount();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /POPHAM.*parcel/i });
      expect(link).toHaveAttribute("href", "/parcel/304-78-386/encumbrances");
    });
  });
});

describe("CustodianQueryPage animation + replay", () => {
  it("renders a Replay button", async () => {
    mount();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /replay sweep/i })).toBeInTheDocument();
    });
  });

  it("first visit sets sessionStorage flag after animation", async () => {
    sessionStorage.removeItem("custodian-query-seen");
    mount();
    await waitFor(() => {
      expect(sessionStorage.getItem("custodian-query-seen")).toBe("1");
    }, { timeout: 3000 });
  });

  it("Replay click resets sessionStorage and re-runs", async () => {
    sessionStorage.setItem("custodian-query-seen", "1");
    mount();
    const btn = await screen.findByRole("button", { name: /replay sweep/i });
    btn.click();
    await waitFor(() => {
      expect(sessionStorage.getItem("custodian-query-seen")).toBe("1");
    }, { timeout: 3000 });
  });
});
