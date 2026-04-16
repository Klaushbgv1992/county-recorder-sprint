import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TerminologyProvider, useTerminology } from "./TerminologyContext";

function Probe() {
  const { mode, setMode } = useTerminology();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode("plain")}>plain</button>
      <button onClick={() => setMode("professional")}>pro</button>
    </div>
  );
}

describe("TerminologyContext.setMode", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("setMode('plain') updates state and persists", () => {
    render(
      <TerminologyProvider>
        <Probe />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("professional");
    act(() => screen.getByText("plain").click());
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });

  it("setMode('professional') updates state and persists", () => {
    localStorage.setItem("terminology-mode", "plain");
    render(
      <TerminologyProvider>
        <Probe />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    act(() => screen.getByText("pro").click());
    expect(screen.getByTestId("mode")).toHaveTextContent("professional");
    expect(localStorage.getItem("terminology-mode")).toBe("professional");
  });
});
