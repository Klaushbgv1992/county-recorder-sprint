import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { StoryPage } from "./StoryPage";
import "../../narrative/register-overlays";

afterEach(() => cleanup());

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/parcel/:apn/story" element={<StoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StoryPage", () => {
  it("renders the hero one-liner for POPHAM", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the 'not in this corpus' fallback for unknown APN", () => {
    renderAt("/parcel/999-99-999/story");
    expect(screen.getByText(/not in this corpus/i)).toBeInTheDocument();
  });
});

describe("StoryPage integration — POPHAM (curated)", () => {
  it("renders all 7 sections", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/3674 E Palmer St/i);
    expect(screen.getByRole("heading", { name: /ownership history/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /currently open claims/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /in your neighborhood/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what this means for you/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /why this comes from the county/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /actions for this parcel/i })).toBeInTheDocument();
  });

  it("includes the MERS transparency callout in prose", () => {
    renderAt("/parcel/304-78-386/story");
    // MERS appears in the timeline callout and the moat/what-this-means prose
    expect(screen.getAllByText(/MERS/i).length).toBeGreaterThan(0);
  });

  it("links to /moat-compare from the moat callout", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("link", { name: /compare to a title plant/i })).toHaveAttribute("href", "/moat-compare");
  });

  it("links to 4 footer CTAs including subscribe", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("link", { name: /examiner's detailed chain/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /export as commitment/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all claims/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /subscribe to new filings/i })).toBeInTheDocument();
  });
});

describe("StoryPage integration — 304-78-406 (cached neighbor, partial)", () => {
  it("renders the partial-chain disclosure", () => {
    renderAt("/parcel/304-78-406/story");
    expect(screen.getByText(/the county has \d+ recorded document/i)).toBeInTheDocument();
  });

  it("renders a partial-specific empty state for currently open claims", () => {
    renderAt("/parcel/304-78-406/story");
    expect(screen.getByText(/don't have enough documents/i)).toBeInTheDocument();
  });
});
