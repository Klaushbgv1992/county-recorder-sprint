import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SearchHero } from "../src/components/SearchHero";

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
});
