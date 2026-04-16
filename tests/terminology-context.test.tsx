import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import {
  TerminologyProvider,
  useTerminology,
} from "../src/terminology/TerminologyContext";

function TestHarness() {
  const { mode, toggle, t } = useTerminology();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="translated">{t("Deed of Trust")}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}

describe("TerminologyContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("defaults to professional mode", () => {
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("professional");
    expect(screen.getByTestId("translated")).toHaveTextContent("Deed of Trust");
  });

  it("translates in plain mode", async () => {
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    await userEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    expect(screen.getByTestId("translated")).toHaveTextContent("Mortgage");
  });

  it("persists mode to localStorage", async () => {
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    await userEvent.click(screen.getByText("Toggle"));
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });

  it("reads initial mode from localStorage", () => {
    localStorage.setItem("terminology-mode", "plain");
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    expect(screen.getByTestId("translated")).toHaveTextContent("Mortgage");
  });
});
