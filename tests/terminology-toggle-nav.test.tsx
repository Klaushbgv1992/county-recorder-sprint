import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";
import { AppShell } from "../src/App";

function renderWithRouter(initialPath = "/parcel/304-78-386") {
  return render(
    <TerminologyProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="parcel/:apn" element={<div>chain content</div>} />
            <Route path="parcel/:apn/encumbrances" element={<div>enc content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TerminologyProvider>,
  );
}

describe("Nav terminology toggle", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("shows professional labels by default", () => {
    renderWithRouter();
    expect(screen.getByText("Chain of Title")).toBeInTheDocument();
    expect(screen.getByText("Encumbrances")).toBeInTheDocument();
  });

  it("switches to plain-English labels on toggle", async () => {
    renderWithRouter();
    await userEvent.click(screen.getByText("Plain English"));
    expect(screen.getByText("Ownership History")).toBeInTheDocument();
    expect(screen.getByText("Claims Against Property")).toBeInTheDocument();
  });

  it("toggles back to professional", async () => {
    renderWithRouter();
    await userEvent.click(screen.getByText("Plain English"));
    await userEvent.click(screen.getByText("Professional"));
    expect(screen.getByText("Chain of Title")).toBeInTheDocument();
  });
});
