import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SearchHero } from "./SearchHero";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import { buildSearchableIndex } from "../logic/searchable-index";
import { buildInstrumentToApnMap } from "../logic/party-search";

const parcels = loadAllParcels();
const instruments = loadAllInstruments();
const instrumentToApn = buildInstrumentToApnMap(parcels);
const searchables = buildSearchableIndex(parcels, new Map(), []);

function noop() {}

function renderHero(value: string) {
  return render(
    <MemoryRouter>
      <SearchHero
        value={value}
        onChange={noop}
        searchables={searchables}
        instruments={instruments}
        instrumentToApn={instrumentToApn}
        onSelectCurated={noop}
        onSelectDrawer={noop}
        onSelectInstrument={noop}
        onSelectParty={noop}
      />
    </MemoryRouter>,
  );
}

describe("SearchHero party section", () => {
  afterEach(() => cleanup());

  it("renders a Parties section for 'Wells Fargo'", () => {
    renderHero("Wells Fargo");
    const partySection = screen.getByLabelText(/Matching parties/i);
    expect(partySection).toBeInTheDocument();
    expect(within(partySection).getAllByText(/wells fargo/i).length).toBeGreaterThan(0);
  });

  it("renders a Parties section for 'Madison'", () => {
    renderHero("Madison");
    const partySection = screen.getByLabelText(/Matching parties/i);
    expect(partySection).toBeInTheDocument();
    expect(within(partySection).getAllByText(/madison/i).length).toBeGreaterThan(0);
  });

  it("clicking a party row invokes onSelectParty with normalizedName", async () => {
    const onSelectParty = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SearchHero
          value="Madison"
          onChange={noop}
          searchables={searchables}
          instruments={instruments}
          instrumentToApn={instrumentToApn}
          onSelectCurated={noop}
          onSelectDrawer={noop}
          onSelectInstrument={noop}
          onSelectParty={onSelectParty}
        />
      </MemoryRouter>,
    );
    const partySection = screen.getByLabelText(/Matching parties/i);
    const rows = within(partySection).getAllByRole("option");
    await user.click(rows[0]);
    expect(onSelectParty).toHaveBeenCalledTimes(1);
    expect(onSelectParty.mock.calls[0][0]).toMatch(/^[a-z0-9-]+$/);
  });

  it("does not render a Parties section when no party matches", () => {
    renderHero("zzzznosuchparty");
    expect(screen.queryByLabelText(/Matching parties/i)).not.toBeInTheDocument();
  });
});
