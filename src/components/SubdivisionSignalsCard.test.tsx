import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SubdivisionSignalsCard } from "./SubdivisionSignalsCard";
import type { LienSignal } from "../logic/subdivision-signals";

describe("SubdivisionSignalsCard", () => {
  it("renders nothing when signals is empty", () => {
    const { container } = render(
      <MemoryRouter>
        <SubdivisionSignalsCard signals={[]} subdivision="Seville Parcel 3" />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders tile with link to neighbor parcel when 1 signal", () => {
    const signals: LienSignal[] = [
      {
        apn: "304-78-367",
        currentOwner: "PHOENIX VACATION HOUSES LLC",
        subdivision: "Seville Parcel 3",
        documentType: "hoa_lien",
        lifecycleId: "lc-008",
        instrumentNumber: "20230100000",
      },
    ];
    render(
      <MemoryRouter>
        <SubdivisionSignalsCard signals={signals} subdivision="Seville Parcel 3" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Subdivision signals/i)).toBeInTheDocument();
    expect(screen.getByText(/1 active HOA lien/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view lot/i });
    expect(link.getAttribute("href")).toBe("/parcel/304-78-367/encumbrances");
  });
});
