import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MapSearchBar } from "../src/components/MapSearchBar";
import type { Searchable } from "../src/logic/searchable-index";

const popham: Searchable = {
  tier: "curated",
  apn: "304-78-386",
  parcel: {
    apn: "304-78-386", address: "3674 E Palmer St", city: "Gilbert", state: "AZ",
    zip: "85298", legal_description: "", current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    type: "residential", subdivision: "Seville Parcel 3", assessor_url: "",
    instrument_numbers: [],
  },
};

describe("MapSearchBar", () => {
  afterEach(() => cleanup());

  it("renders tier chip on result rows", () => {
    render(
      <MapSearchBar
        value="popham"
        onChange={() => {}}
        searchables={[popham]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/Curated · full chain/)).toBeInTheDocument();
  });

  it("calls onSelect when a result is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <MapSearchBar value="popham" onChange={() => {}} searchables={[popham]} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByText(/3674 E Palmer St/));
    expect(onSelect).toHaveBeenCalledWith(popham);
  });

  it("ArrowDown + Enter selects the first result", () => {
    const onSelect = vi.fn();
    render(
      <MapSearchBar value="popham" onChange={() => {}} searchables={[popham]} onSelect={onSelect} />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(popham);
  });

  it("Escape closes the dropdown", () => {
    render(
      <MapSearchBar value="popham" onChange={() => {}} searchables={[popham]} onSelect={() => {}} />,
    );
    expect(screen.queryByText(/Curated · full chain/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByText(/Curated · full chain/)).toBeNull();
  });

  it("empty value renders no dropdown", () => {
    render(
      <MapSearchBar value="" onChange={() => {}} searchables={[popham]} onSelect={() => {}} />,
    );
    expect(screen.queryByText(/Curated · full chain/)).toBeNull();
  });

  it("onChange is called on input", async () => {
    const onChange = vi.fn();
    render(<MapSearchBar value="" onChange={onChange} searchables={[]} onSelect={() => {}} />);
    await userEvent.type(screen.getByRole("combobox"), "p");
    expect(onChange).toHaveBeenCalledWith("p");
  });

  it("shows +N more when total exceeds displayed hits", () => {
    const many: Searchable[] = Array.from({ length: 12 }, (_, i) => ({
      tier: "assessor_only" as const,
      apn: `304-78-${String(i).padStart(3, "0")}`,
      polygon: {
        APN: `30478${String(i).padStart(3, "0")}`,
        APN_DASH: `304-78-${String(i).padStart(3, "0")}`,
        OWNER_NAME: "TEST",
        PHYSICAL_STREET_NUM: String(3600 + i),
        PHYSICAL_STREET_DIR: "E",
        PHYSICAL_STREET_NAME: "PALMER",
        PHYSICAL_STREET_TYPE: "ST",
        PHYSICAL_CITY: "GILBERT",
        PHYSICAL_ZIP: "85298",
        SUBNAME: "SEVILLE PARCEL 3",
        source: "maricopa_assessor_public_gis" as const,
        source_url: "x",
        captured_date: "2026-04-16",
      },
    }));
    render(
      <MapSearchBar value="palmer" onChange={() => {}} searchables={many} onSelect={() => {}} />,
    );
    expect(screen.getByText(/\+4 more/)).toBeInTheDocument();
  });
});
