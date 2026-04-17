import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { FeaturedParcels } from "./FeaturedParcels";
import type { Parcel } from "../types";

const parcels: Parcel[] = [
  {
    apn: "304-78-386",
    address: "3674 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85234",
    legal_description: "",
    current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    subdivision: "SEVILLE PARCEL 3",
    instrument_numbers: [],
  },
  {
    apn: "304-77-689",
    address: "2715 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85234",
    legal_description: "",
    current_owner: "HOGUE JASON / MICHELE",
    subdivision: "SHAMROCK ESTATES PHASE 2A",
    instrument_numbers: [],
  },
];

function renderUI() {
  return render(
    <MemoryRouter>
      <FeaturedParcels parcels={parcels} />
    </MemoryRouter>,
  );
}

describe("FeaturedParcels", () => {
  afterEach(() => cleanup());

  it("renders the section heading", () => {
    renderUI();
    expect(screen.getByText(/Featured demo parcels/i)).toBeInTheDocument();
  });

  it("renders the explainer pointing to POPHAM", () => {
    renderUI();
    expect(
      screen.getByText(/Click POPHAM to start the recommended demo path/i),
    ).toBeInTheDocument();
  });

  it("renders one card per parcel linking to /parcel/:apn", () => {
    renderUI();
    const popham = screen.getByRole("link", { name: /POPHAM/i });
    expect(popham).toHaveAttribute("href", "/parcel/304-78-386");
    const hogue = screen.getByRole("link", { name: /HOGUE/i });
    expect(hogue).toHaveAttribute("href", "/parcel/304-77-689");
  });

  it("badges POPHAM as the recommended demo", () => {
    renderUI();
    // Match the badge specifically (uppercase letters, not the explainer paragraph)
    const badge = screen.getByText("Recommended demo");
    expect(badge).toBeInTheDocument();
    expect(badge.tagName.toLowerCase()).toBe("span");
  });

  it("renders a 'Read the story' link for each curated parcel", () => {
    renderUI();
    expect(screen.getAllByRole("link", { name: /read the story/i }).length).toBeGreaterThan(0);
  });
});
