import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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

afterEach(cleanup);

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

  it("exposes a Parcel search landmark for screen readers", () => {
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
    expect(screen.getByRole("region", { name: "Parcel search" })).toBeInTheDocument();
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

  it("Enter on a curated owner-match routes to /parcel/:apn", () => {
    const picks: string[] = [];
    render(
      <MemoryRouter>
        <SearchHero
          value="POPHAM"
          onChange={() => {}}
          searchables={[curated]}
          onSelectCurated={(apn) => picks.push(apn)}
          onSelectDrawer={() => {}}
          onSelectInstrument={() => {}}
        />
      </MemoryRouter>,
    );
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(picks).toEqual(["304-78-386"]);
  });

  it("Enter on an instrument match routes to onSelectInstrument with both apn and instrument number", () => {
    const picks: Array<[string, string]> = [];
    render(
      <MemoryRouter>
        <SearchHero
          value="20210075858"
          onChange={() => {}}
          searchables={[curated]}
          onSelectCurated={() => {}}
          onSelectDrawer={() => {}}
          onSelectInstrument={(apn, n) => picks.push([apn, n])}
        />
      </MemoryRouter>,
    );
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(picks).toEqual([["304-78-386", "20210075858"]]);
  });

  it("ArrowDown clamps activeIdx to hits.length - 1", () => {
    const picks: string[] = [];
    // ArrowDown past the end of a single-hit list must clamp, not run activeIdx off the end.
    render(
      <MemoryRouter>
        <SearchHero
          value="POPHAM"
          onChange={() => {}}
          searchables={[curated]}
          onSelectCurated={(apn) => picks.push(apn)}
          onSelectDrawer={() => {}}
          onSelectInstrument={() => {}}
        />
      </MemoryRouter>,
    );
    // Press ArrowDown a few times to try to set activeIdx past the end,
    // then Enter. Component should clamp; the single hit should still be picked.
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(picks).toEqual(["304-78-386"]);
  });
});
