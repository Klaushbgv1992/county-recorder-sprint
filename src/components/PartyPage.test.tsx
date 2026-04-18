import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Routes, Route } from "react-router";
import { PartyPage } from "./PartyPage";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import {
  buildInstrumentToApnMap,
  searchParties,
} from "../logic/party-search";

describe("PartyPage", () => {
  afterEach(() => cleanup());

  it("renders the party header and instrument table for Wells Fargo Home Mortgage", () => {
    const parcels = loadAllParcels();
    const instruments = loadAllInstruments();
    const instrumentToApn = buildInstrumentToApnMap(parcels);
    const wf = searchParties("Wells Fargo Home Mortgage", instruments, instrumentToApn).find(
      (h) => h.displayName.toUpperCase() === "WELLS FARGO HOME MORTGAGE",
    );
    expect(wf).toBeDefined();

    render(
      <MemoryRouter initialEntries={[`/party/${wf!.normalizedName}`]}>
        <Routes>
          <Route path="/party/:normalizedName" element={<PartyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /WELLS FARGO HOME MORTGAGE/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("20210075858")).toBeInTheDocument();
    expect(screen.getByText(/APN 304-78-386/)).toBeInTheDocument();
  });

  it("renders the empty state for an unknown party", () => {
    render(
      <MemoryRouter initialEntries={["/party/no-such-party"]}>
        <Routes>
          <Route path="/party/:normalizedName" element={<PartyPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/No matching party in this corpus/i)).toBeInTheDocument();
  });
});
