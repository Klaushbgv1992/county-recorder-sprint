import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Routes, Route } from "react-router";
import { ReceiptsPage } from "./ReceiptsPage";

vi.mock("../../docs/hunt-log-known-gap-2.md?raw", () => ({
  default: "# Hunt Log — Known Gap #2\n\nFED TAX L returns totalResults: 0.\n",
}));
vi.mock("../../data/raw/R-005/hunt-log.md?raw", () => ({
  default: "# R-005 Hunt Log\n\nFive API layers blocked.\n",
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/receipts/:slug" element={<ReceiptsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReceiptsPage", () => {
  afterEach(() => cleanup());

  it("renders the federal-tax-lien hunt log when slug is federal-tax-lien", () => {
    renderAt("/receipts/federal-tax-lien");
    expect(screen.getByText(/FED TAX L returns totalResults: 0/)).toBeInTheDocument();
  });

  it("renders the Seville master-plat hunt log when slug is seville-master-plat", () => {
    renderAt("/receipts/seville-master-plat");
    expect(screen.getByText(/Five API layers blocked/)).toBeInTheDocument();
  });

  it("shows a not-found message for unknown slugs", () => {
    renderAt("/receipts/does-not-exist");
    expect(screen.getByText(/no such receipt|not found/i)).toBeInTheDocument();
  });
});
