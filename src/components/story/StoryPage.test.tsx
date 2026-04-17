import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { StoryPage } from "./StoryPage";

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
