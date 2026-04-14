import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { MoatCompareRoute } from "../src/components/MoatCompareRoute";

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/moat-compare"]}>
      <MoatCompareRoute />
    </MemoryRouter>,
  );
}

const ROW_LABELS = [
  "Current owner of record",
  "Open encumbrances (DOTs / liens)",
  "Lien search by recording code",
  "Document image source",
  "Index freshness",
];

describe("MoatCompareRoute scaffold", () => {
  afterEach(() => cleanup());

  it("renders the page header", () => {
    renderRoute();
    expect(
      screen.getByText(/Moat comparison/i),
    ).toBeInTheDocument();
  });

  it("renders the parcel subtitle naming POPHAM 304-78-386", () => {
    renderRoute();
    expect(screen.getByText(/304-78-386/)).toBeInTheDocument();
    expect(screen.getByText(/POPHAM/)).toBeInTheDocument();
  });

  it("renders all five row labels", () => {
    renderRoute();
    for (const label of ROW_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
