// src/components/homeowner/HomeownerCardPage.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { HomeownerCardPage } from "./HomeownerCardPage";

afterEach(() => cleanup());

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/parcel/:apn/home" element={<HomeownerCardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomeownerCardPage", () => {
  it("renders the parcel address + all four question headings for POPHAM", () => {
    renderAt("/parcel/304-78-386/home");
    expect(screen.getByText(/3674 E Palmer St/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /is the title clean/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /when was the last sale/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /open liens/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /lent against/i })).toBeInTheDocument();
  });

  it("shows a not-in-corpus panel for unknown APN", () => {
    renderAt("/parcel/999-99-999/home");
    expect(screen.getByText(/not in (the )?corpus/i)).toBeInTheDocument();
  });

  it("links to examiner chain view at the bottom", () => {
    renderAt("/parcel/304-78-386/home");
    expect(screen.getByRole("link", { name: /open examiner view/i }))
      .toHaveAttribute("href", "/parcel/304-78-386?mode=examiner");
  });
});
