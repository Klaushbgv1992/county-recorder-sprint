import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { PartySearchHeroCard } from "./PartySearchHeroCard";
import { CURATED_PARTY_SUGGESTIONS } from "../data/curated-party-suggestions";

describe("PartySearchHeroCard", () => {
  afterEach(() => cleanup());

  function renderCard() {
    return render(
      <MemoryRouter>
        <PartySearchHeroCard />
      </MemoryRouter>,
    );
  }

  it("renders one chip per curated suggestion that deep-links to /party/:normalizedName", () => {
    renderCard();
    for (const s of CURATED_PARTY_SUGGESTIONS) {
      const link = screen.getByRole("link", { name: new RegExp(s.display, "i") });
      expect(link).toHaveAttribute("href", `/party/${s.normalizedName}`);
    }
  });

  it("includes the moat explainer paragraph that cites the hunt log", () => {
    renderCard();
    const huntLogLink = screen.getByRole("link", { name: /hunt log/i });
    expect(huntLogLink).toHaveAttribute(
      "href",
      expect.stringContaining("hunt-log-known-gap-2"),
    );
    expect(
      screen.getByText(/no name-filtered search endpoint/i),
    ).toBeInTheDocument();
  });

  it("identifies itself as a cross-parcel feature", () => {
    renderCard();
    expect(
      screen.getByRole("region", { name: /cross-parcel party search/i }),
    ).toBeInTheDocument();
  });
});
