import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { HomeownerHero } from "./HomeownerHero";
import type { Searchable } from "../logic/searchable-index";

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

function Wrap({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>;
}

describe("HomeownerHero", () => {
  afterEach(() => cleanup());

  it("renders homeowner-framed placeholder copy", () => {
    render(<HomeownerHero searchables={[POPHAM]} onResolve={() => {}} />, { wrapper: Wrap });
    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("placeholder", expect.stringMatching(/enter your property address/i));
  });

  it("resolves an address on submit by calling onResolve(apn)", async () => {
    const onResolve = vi.fn();
    render(<HomeownerHero searchables={[POPHAM]} onResolve={onResolve} />, { wrapper: Wrap });
    await userEvent.type(screen.getByRole("searchbox"), "3674 palmer");
    await userEvent.click(screen.getByRole("button", { name: /see what the county knows/i }));
    expect(onResolve).toHaveBeenCalledWith("304-78-386");
  });

  it("shows an inline empty-state when no match", async () => {
    const onResolve = vi.fn();
    render(<HomeownerHero searchables={[POPHAM]} onResolve={onResolve} />, { wrapper: Wrap });
    await userEvent.type(screen.getByRole("searchbox"), "9999 nowhere ave");
    await userEvent.click(screen.getByRole("button", { name: /see what the county knows/i }));
    expect(onResolve).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/no match/i);
  });

  it("uses homeowner-plain language — no 'party', 'grantor', 'instrument', or 'APN' in visible copy", () => {
    render(<HomeownerHero searchables={[POPHAM]} onResolve={() => {}} />, { wrapper: Wrap });
    const visible = document.body.textContent ?? "";
    expect(visible).not.toMatch(/\bparty\b/i);
    expect(visible).not.toMatch(/\bgrantor\b/i);
    expect(visible).not.toMatch(/\binstrument\b/i);
    expect(visible).not.toMatch(/\bAPN\b/);
  });
});
