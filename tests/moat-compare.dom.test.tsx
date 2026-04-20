import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { MoatCompareRoute } from "../src/components/MoatCompareRoute";

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/moat-compare"]}>
      <MoatCompareRoute />
    </MemoryRouter>,
  );
}

const ROW_LABELS = [
  "Current owner of record",
  "Open encumbrances (DOTs / liens)",
  "Lien search by recording code",
  "Document image source",
  "Index freshness",
  "Spatial custody",
  "Pipeline transparency",
  "Chain judgment",
  "Internal search flip",
];

describe("MoatCompareRoute scaffold", () => {
  afterEach(() => cleanup());

  it("renders the page header", () => {
    renderRoute();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Moat comparison/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the parcel subtitle naming POPHAM 304-78-386", () => {
    renderRoute();
    const subtitle = document.querySelector("header p") as HTMLElement;
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toMatch(/304-78-386/);
    expect(subtitle.textContent).toMatch(/POPHAM/);
    expect(subtitle.textContent).toMatch(/3674 E Palmer/);
  });

  it("renders all nine row labels", () => {
    renderRoute();
    for (const label of ROW_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});

describe("MoatCompareRoute row content", () => {
  afterEach(() => cleanup());

  it("Row 1 prints the same owner string on both sides with different provenance tags", () => {
    renderRoute();
    const row1 = document.querySelector('[data-row-id="row-1"]') as HTMLElement;
    expect(row1).not.toBeNull();
    const ownerNodes = Array.from(row1.querySelectorAll("*")).filter(
      (el) => el.textContent?.trim() === "POPHAM CHRISTOPHER / ASHLEY",
    );
    expect(ownerNodes.length).toBeGreaterThanOrEqual(2);
    expect(row1.textContent).toMatch(/aggregator index/);
    expect(row1.textContent).toMatch(/County Deed/);
  });

  it("Row 2 names the two POPHAM lifecycles on the prototype side", () => {
    renderRoute();
    const row2 = document.querySelector('[data-row-id="row-2"]') as HTMLElement;
    expect(row2).not.toBeNull();
    expect(row2.textContent).toMatch(/lc-001/);
    expect(row2.textContent).toMatch(/lc-002/);
    expect(row2.textContent).toMatch(/released/i);
    expect(row2.textContent).toMatch(/no reconveyance/i);
  });

  it("Row 3 cites both hunt-log paths on the prototype side", () => {
    renderRoute();
    const row3 = document.querySelector('[data-row-id="row-3"]') as HTMLElement;
    expect(row3).not.toBeNull();
    expect(row3.textContent).toMatch(/hunt-log-known-gap-2\.md/);
    expect(row3.textContent).toMatch(/R-005\/hunt-log\.md/);
    expect(row3.textContent).toMatch(/FED TAX L|LIEN/);
  });

  it("Row 4 prototype side links to the county PDF for instrument 20130183449", () => {
    renderRoute();
    const row4 = document.querySelector('[data-row-id="row-4"]') as HTMLElement;
    expect(row4).not.toBeNull();
    const link = row4.querySelector(
      'a[href*="publicapi.recorder.maricopa.gov"]',
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toMatch(/recordingNumber=20130183449/);
  });

  it("Row 5 prototype side renders the MoatBanner verified-through date", () => {
    renderRoute();
    const row5 = document.querySelector('[data-row-id="row-5"]') as HTMLElement;
    expect(row5).not.toBeNull();
    expect(row5.textContent).toMatch(/Records verified through/);
    expect(row5.textContent).toMatch(/2026-04-12/);
  });

  it("renders the 4 new moat claim rows", () => {
    renderRoute();
    expect(screen.getByText("Spatial custody")).toBeInTheDocument();
    expect(screen.getByText("Pipeline transparency")).toBeInTheDocument();
    expect(screen.getByText("Chain judgment")).toBeInTheDocument();
    expect(screen.getByText("Internal search flip")).toBeInTheDocument();
  });

  it("aggregator column contains zero ProvenanceTag chips (visual asymmetry preserved)", () => {
    renderRoute();
    const aggregatorCells = document.querySelectorAll(
      '[data-side="aggregator"]',
    );
    expect(aggregatorCells.length).toBeGreaterThan(0);
    for (const cell of Array.from(aggregatorCells)) {
      expect(cell.textContent).not.toMatch(
        /\bCounty API \d+%|\bOCR \d+%|\bHand-Curated \d+%|\bMatcher \d+%/,
      );
    }
  });
});

describe("MoatCompareRoute callouts", () => {
  afterEach(() => cleanup());

  const CALLOUTS = [
    {
      anchor: "row-3",
      headlineRegex: /They can't search liens/i,
    },
    {
      anchor: "row-4",
      headlineRegex: /They host a copy\. We host the original/i,
    },
    {
      anchor: "row-5",
      headlineRegex: /They index monthly\. The county publishes same-day/i,
    },
  ];

  it("renders all three callouts with correct headlines", () => {
    renderRoute();
    for (const c of CALLOUTS) {
      expect(screen.getByText(c.headlineRegex)).toBeInTheDocument();
    }
  });

  it("each callout's data-callout-anchor matches an existing row's data-row-id", () => {
    renderRoute();
    for (const c of CALLOUTS) {
      const callout = document.querySelector(
        `[data-callout-anchor="${c.anchor}"]`,
      );
      expect(callout).not.toBeNull();
      const row = document.querySelector(`[data-row-id="${c.anchor}"]`);
      expect(row).not.toBeNull();
    }
  });

  it("each callout's DOM position is immediately adjacent to its anchor row", () => {
    renderRoute();
    for (const c of CALLOUTS) {
      const callout = document.querySelector(
        `[data-callout-anchor="${c.anchor}"]`,
      ) as HTMLElement;
      const row = document.querySelector(
        `[data-row-id="${c.anchor}"]`,
      ) as HTMLElement;
      const lastCellOfRow = row.lastElementChild as HTMLElement;
      expect(lastCellOfRow).not.toBeNull();
      const positionRelation =
        lastCellOfRow.compareDocumentPosition(callout);
      expect(positionRelation & Node.DOCUMENT_POSITION_FOLLOWING).toBe(4);
    }
  });
});

describe("MoatCompareRoute viewport fallback + closing footer", () => {
  afterEach(() => cleanup());

  it("renders a viewport fallback message that names the 1024px breakpoint", () => {
    renderRoute();
    expect(
      screen.getByText(
        /designed for a presenter display.*at least 1024px/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the Tier 1-C closing footer with a link to the POPHAM parcel page", () => {
    renderRoute();
    expect(
      screen.getByText(/Schedule A \+ B-II title commitment/i),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /Export Commitment/i,
    }) as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/parcel/304-78-386");
  });
});
