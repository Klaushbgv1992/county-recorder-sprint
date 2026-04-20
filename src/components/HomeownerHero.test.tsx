import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { HomeownerHero } from "./HomeownerHero";
import type { Searchable } from "../logic/searchable-index";
import type { Instrument } from "../types";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import { buildInstrumentToApnMap } from "../logic/party-search";

// Use the real curated corpus for party/lender lookups so we exercise
// searchParties against the same data the app ships with (Wells Fargo
// is a releasing party on POPHAM's 2021 reconveyance, 20210075858).
const INSTRUMENTS: Instrument[] = loadAllInstruments();
const INSTRUMENT_TO_APN = buildInstrumentToApnMap(loadAllParcels());

// The actual Searchable["curated"] shape requires a full Parcel object.
// We build a minimal fixture that satisfies the type and gives searchAll
// enough content to match on address tokens.
const POPHAM: Searchable = {
  tier: "curated",
  apn: "304-78-386",
  parcel: {
    apn: "304-78-386",
    address: "3674 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: "Lot 46, SEVILLE PARCEL 3",
    current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    subdivision: "SEVILLE PARCEL 3",
    instrument_numbers: [],
  },
};

function renderHero(overrides?: {
  onResolve?: (apn: string) => void;
  onSelectParty?: (name: string) => void;
  searchables?: Searchable[];
  instruments?: Instrument[];
  instrumentToApn?: Map<string, string>;
}) {
  return render(
    <HomeownerHero
      searchables={overrides?.searchables ?? [POPHAM]}
      instruments={overrides?.instruments ?? INSTRUMENTS}
      instrumentToApn={overrides?.instrumentToApn ?? INSTRUMENT_TO_APN}
      onResolve={overrides?.onResolve ?? (() => {})}
      onSelectParty={overrides?.onSelectParty ?? (() => {})}
    />,
    { wrapper: Wrap },
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>;
}

describe("HomeownerHero", () => {
  afterEach(() => cleanup());

  it("renders homeowner-framed placeholder copy", () => {
    renderHero();
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("placeholder", expect.stringMatching(/address/i));
  });

  it("resolves an address on submit by calling onResolve(apn)", async () => {
    const onResolve = vi.fn();
    renderHero({ onResolve });
    await userEvent.type(screen.getByRole("combobox"), "3674 palmer");
    await userEvent.click(screen.getByRole("button", { name: /see what the county knows/i }));
    expect(onResolve).toHaveBeenCalledWith("304-78-386");
  });

  it("shows an inline empty-state when no match", async () => {
    const onResolve = vi.fn();
    renderHero({ onResolve });
    await userEvent.type(screen.getByRole("combobox"), "9999 nowhere ave");
    await userEvent.click(screen.getByRole("button", { name: /see what the county knows/i }));
    expect(onResolve).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/no match/i);
  });

  it("shows live parcel dropdown suggestions as the user types", async () => {
    renderHero();
    await userEvent.type(screen.getByRole("combobox"), "palmer");
    const listbox = await screen.findByRole("listbox", { name: /matching properties/i });
    expect(listbox).toBeInTheDocument();
    // The address is split across <mark> highlights, so match on the
    // listbox's aggregated textContent rather than a single text node.
    expect(listbox.textContent ?? "").toMatch(/3674.*Palmer/i);
  });

  it("picks a parcel suggestion on click and resolves its parcel", async () => {
    const onResolve = vi.fn();
    renderHero({ onResolve });
    await userEvent.type(screen.getByRole("combobox"), "popham");
    const listbox = await screen.findByRole("listbox", { name: /matching properties/i });
    const option = listbox.querySelector("[role='option']") as HTMLElement;
    await userEvent.click(option);
    expect(onResolve).toHaveBeenCalledWith("304-78-386");
  });

  it("also surfaces party/lender matches (Wells Fargo)", async () => {
    renderHero();
    await userEvent.type(screen.getByRole("combobox"), "wells fargo");
    const namesList = await screen.findByRole("listbox", { name: /matching names/i });
    expect(namesList).toBeInTheDocument();
    expect(namesList).toHaveTextContent(/wells fargo/i);
  });

  it("routes a party suggestion click through onSelectParty", async () => {
    const onSelectParty = vi.fn();
    renderHero({ onSelectParty });
    await userEvent.type(screen.getByRole("combobox"), "wells fargo");
    const namesList = await screen.findByRole("listbox", { name: /matching names/i });
    const option = namesList.querySelector("[role='option']") as HTMLElement;
    await userEvent.click(option);
    expect(onSelectParty).toHaveBeenCalled();
    expect(onSelectParty.mock.calls[0][0]).toMatch(/wells-fargo/);
  });

  it("uses homeowner-plain language on initial render — no 'party', 'grantor', 'instrument', or 'APN' in visible copy", () => {
    renderHero();
    const visible = document.body.textContent ?? "";
    expect(visible).not.toMatch(/\bparty\b/i);
    expect(visible).not.toMatch(/\bgrantor\b/i);
    expect(visible).not.toMatch(/\binstrument\b/i);
    expect(visible).not.toMatch(/\bAPN\b/);
  });
});
