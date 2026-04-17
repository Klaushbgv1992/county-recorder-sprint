import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SearchHero } from "../src/components/SearchHero";
import type { Searchable } from "../src/logic/searchable-index";

const curated: Searchable = {
  tier: "curated",
  apn: "304-78-386",
  parcel: {
    apn: "304-78-386",
    address: "3674 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: "",
    current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    type: "residential",
    subdivision: "Seville Parcel 3",
    assessor_url: "",
    instrument_numbers: ["20210075858", "20130183450"],
  },
} as unknown as Searchable;

describe("SearchHero", () => {
  it("renders input with the placeholder", () => {
    render(
      <MemoryRouter>
        <SearchHero
          value=""
          onChange={() => {}}
          searchables={[]}
          onSelectCurated={() => {}}
          onSelectDrawer={() => {}}
          onSelectInstrument={() => {}}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByPlaceholderText(/Search APN, address, owner, subdivision/),
    ).toBeInTheDocument();
  });

  it("shows entity-type pill and tier pill on each result", () => {
    render(
      <MemoryRouter>
        <SearchHero
          value="POPHAM"
          onChange={() => {}}
          searchables={[curated]}
          onSelectCurated={() => {}}
          onSelectDrawer={() => {}}
          onSelectInstrument={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Owner$/i)).toBeInTheDocument();
    expect(screen.getByText(/Curated/i)).toBeInTheDocument();
  });

  it("shows the Instrument entity pill for 11-digit query", () => {
    render(
      <MemoryRouter>
        <SearchHero
          value="20210075858"
          onChange={() => {}}
          searchables={[curated]}
          onSelectCurated={() => {}}
          onSelectDrawer={() => {}}
          onSelectInstrument={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Instrument$/i)).toBeInTheDocument();
  });
});
