import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";
import { Term, TermSection } from "../src/terminology/Term";

function renderPlain(ui: React.ReactElement) {
  localStorage.setItem("terminology-mode", "plain");
  return render(<TerminologyProvider>{ui}</TerminologyProvider>);
}

function renderPro(ui: React.ReactElement) {
  localStorage.setItem("terminology-mode", "professional");
  return render(<TerminologyProvider>{ui}</TerminologyProvider>);
}

describe("Term", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("renders original text in professional mode", () => {
    renderPro(
      <TermSection id="test">
        <Term professional="Deed of Trust" />
      </TermSection>,
    );
    expect(screen.getByText("Deed of Trust")).toBeInTheDocument();
    expect(screen.queryByTitle(/Professional term/)).not.toBeInTheDocument();
  });

  it("renders translated text with ? icon in plain mode", () => {
    renderPlain(
      <TermSection id="test">
        <Term professional="Deed of Trust" />
      </TermSection>,
    );
    expect(screen.getByText("Mortgage")).toBeInTheDocument();
    const hint = screen.getByTitle("Professional term: Deed of Trust");
    expect(hint).toBeInTheDocument();
  });

  it("shows ? icon only on first occurrence per section", () => {
    renderPlain(
      <TermSection id="test">
        <div data-testid="a"><Term professional="Deed of Trust" /></div>
        <div data-testid="b"><Term professional="Deed of Trust" /></div>
        <div data-testid="c"><Term professional="Deed of Trust" /></div>
      </TermSection>,
    );
    const hints = screen.getAllByTitle("Professional term: Deed of Trust");
    expect(hints).toHaveLength(1);
    expect(screen.getByTestId("a")).toHaveTextContent("Mortgage?");
    expect(screen.getByTestId("b")).toHaveTextContent("Mortgage");
    expect(screen.getByTestId("c")).toHaveTextContent("Mortgage");
    expect(screen.getByTestId("b").querySelector("[title]")).toBeNull();
    expect(screen.getByTestId("c").querySelector("[title]")).toBeNull();
  });

  it("resets ? icon across different sections", () => {
    renderPlain(
      <>
        <TermSection id="section-a">
          <Term professional="Grantor" />
        </TermSection>
        <TermSection id="section-b">
          <Term professional="Grantor" />
        </TermSection>
      </>,
    );
    const hints = screen.getAllByTitle("Professional term: Grantor");
    expect(hints).toHaveLength(2);
  });
});
