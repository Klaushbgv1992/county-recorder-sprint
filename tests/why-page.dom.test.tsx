import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { WhyPage } from "../src/components/WhyPage";

function renderWhy() {
  return render(
    <MemoryRouter>
      <WhyPage />
    </MemoryRouter>,
  );
}

describe("WhyPage — page structure", () => {
  afterEach(() => cleanup());

  it("renders the H1 with the spec title", () => {
    renderWhy();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/why county-owned title data/i);
  });

  it("renders three H2 headings matching the three sections", () => {
    renderWhy();
    const h2s = screen.getAllByRole("heading", { level: 2 });
    const text = h2s.map((h) => h.textContent?.toLowerCase() ?? "");
    expect(text.some((t) => t.includes("how county records actually work"))).toBe(true);
    expect(text.some((t) => t.includes("what title plants can't do"))).toBe(true);
    expect(text.some((t) => t.includes("receipts"))).toBe(true);
  });

  it("renders an on-page TOC with three anchor links and read-time estimates", () => {
    renderWhy();
    const toc = screen.getByRole("navigation", { name: /on this page/i });
    expect(within(toc).getByText(/1 min/i)).toBeInTheDocument();
    expect(within(toc).getByText(/45 sec/i)).toBeInTheDocument();
    expect(within(toc).getByText(/3 min/i)).toBeInTheDocument();

    expect(within(toc).getByRole("link", { name: /how county records actually work/i })).toHaveAttribute("href", "#how-records-work");
    expect(within(toc).getByRole("link", { name: /what title plants can't do/i })).toHaveAttribute("href", "#plants-cannot");
    expect(within(toc).getByRole("link", { name: /receipts/i })).toHaveAttribute("href", "#receipts");
  });
});

describe("WhyPage — Section 1 plain-English primer", () => {
  afterEach(() => cleanup());

  it("renders the three cards with their opening phrases", () => {
    renderWhy();
    const section = document.getElementById("how-records-work");
    expect(section).toBeTruthy();
    expect(section?.textContent).toMatch(/recorded.*indexed.*searchable/is);
    expect(section?.textContent).toMatch(/chain of title/i);
    expect(section?.textContent).toMatch(/birth.*release/i);
  });
});
