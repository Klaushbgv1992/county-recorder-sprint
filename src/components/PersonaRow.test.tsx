import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { PersonaRow } from "./PersonaRow";
import { TerminologyProvider } from "../terminology/TerminologyContext";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TerminologyProvider>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <PersonaRow />
                <LocationProbe />
              </>
            }
          />
          <Route path="/parcel/:apn" element={<LocationProbe />} />
          <Route
            path="/parcel/:apn/encumbrances"
            element={<LocationProbe />}
          />
          <Route path="/staff" element={<LocationProbe />} />
        </Routes>
      </TerminologyProvider>
    </MemoryRouter>,
  );
}

describe("PersonaRow", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders three persona pills", () => {
    renderWithRouter();
    expect(
      screen.getByRole("button", { name: /homeowners/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /title professionals/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /county staff/i }),
    ).toBeInTheDocument();
  });

  it("homeowner pill routes to chain view and sets plain English", async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByRole("button", { name: /homeowners/i }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/parcel/304-78-386");
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });

  it("title-professional pill routes to encumbrances and sets professional", async () => {
    const user = userEvent.setup();
    localStorage.setItem("terminology-mode", "plain");
    renderWithRouter();
    await user.click(
      screen.getByRole("button", { name: /title professionals/i }),
    );
    expect(screen.getByTestId("loc")).toHaveTextContent(
      "/parcel/304-78-386/encumbrances",
    );
    expect(localStorage.getItem("terminology-mode")).toBe("professional");
  });

  it("county-staff pill routes to /staff and leaves terminology untouched", async () => {
    const user = userEvent.setup();
    localStorage.setItem("terminology-mode", "plain");
    renderWithRouter();
    await user.click(screen.getByRole("button", { name: /county staff/i }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/staff");
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });
});
