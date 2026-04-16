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

describe("WhyPage — Section 2 moat claims", () => {
  afterEach(() => cleanup());

  it("renders all four moat bullets with the verbatim phrasing", () => {
    renderWhy();
    const section = document.getElementById("plants-cannot");
    expect(section).toBeTruthy();
    const txt = section?.textContent ?? "";
    expect(txt).toMatch(/Lien search by recording code is literally impossible/i);
    expect(txt).toMatch(/RE FED TX/);
    expect(txt).toMatch(/FED TAX L/);
    expect(txt).toMatch(/LIEN/);
    expect(txt).toMatch(/MED LIEN/);
    expect(txt).toMatch(/totalResults:\s*0/);
    expect(txt).toMatch(/Title plants host copies; the county hosts originals/i);
    expect(txt).toMatch(/publicapi\.recorder\.maricopa\.gov/);
    expect(txt).toMatch(/14–28-day lag/);
    expect(txt).toMatch(/publishes same-day/i);
    expect(txt).toMatch(/Pipeline transparency is custodian-only/i);
    expect(txt).toMatch(/five verified-through dates/i);
  });

  it("links to /moat-compare at the end of Section 2", () => {
    renderWhy();
    const section = document.getElementById("plants-cannot");
    expect(section).toBeTruthy();
    const link = section!.querySelector('a[href="/moat-compare"]');
    expect(link).toBeTruthy();
  });
});

describe("WhyPage — Section 3 receipts", () => {
  afterEach(() => cleanup());

  it("renders both hunt narratives with all the verbatim numbers", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    expect(section).toBeTruthy();
    const txt = section?.textContent ?? "";

    expect(txt).toMatch(/45 minutes/);
    expect(txt).toMatch(/20 minutes/);
    expect(txt).toMatch(/50,000 pages/);
    expect(txt).toMatch(/1947/);
    expect(txt).toMatch(/__VIEWSTATE/);

    expect(txt).toMatch(/141 of 200 calls/);
    expect(txt).toMatch(/20010093192/);
    expect(txt).toMatch(/Book 553, Page 15/);
    expect(txt).toMatch(/94 sample points/);
    expect(txt).toMatch(/20000600000.{0,3}20010100000/);

    expect(txt).toMatch(/indexable but unsearchable/i);
  });

  it("enumerates the five API layers as a numbered list", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    const text = section?.textContent ?? "";
    expect(text).toMatch(/documentCode.*filter.*silently dropped/is);
    expect(text).toMatch(/docketBook.*pageMap.*silently dropped/is);
    expect(text).toMatch(/pagination broken/i);
    expect(text).toMatch(/404/);
    expect(text).toMatch(/Cloudflare/);
  });

  it("renders two collapsed <details> elements holding the raw hunt logs", () => {
    renderWhy();
    const details = document.querySelectorAll(
      "#receipts details",
    ) as NodeListOf<HTMLDetailsElement>;
    expect(details.length).toBe(2);
    details.forEach((el) => {
      expect(el.open).toBe(false);
      const summary = el.querySelector("summary");
      expect(summary?.textContent?.toLowerCase() ?? "").toMatch(/full log/);
    });
  });

  it("renders a muted source-file citation under each hunt log", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    const txt = section?.textContent ?? "";
    expect(txt).toMatch(/docs\/hunt-log-known-gap-2\.md/);
    expect(txt).toMatch(/data\/raw\/R-005\/hunt-log\.md/);
  });

  it("renders the closing paragraph with the 'authoritative source records' phrasing", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    expect(section?.textContent).toMatch(/Two failed hunts at adjacent tiers/i);
    expect(section?.textContent).toMatch(/authoritative source records and the ingestion pipeline/i);
  });
});
