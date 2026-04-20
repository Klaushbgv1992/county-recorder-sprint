/**
 * Verifies that toggling between Professional and Plain English modes
 * changes actual content labels — not just page headings — across the
 * key components: StatusBadge, ProofDrawer field labels, AnomalyPanel,
 * MoatBanner, OverrideMenu, and MersCallout.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import {
  TerminologyProvider,
  useTerminology,
} from "../src/terminology/TerminologyContext";
import { StatusBadge } from "../src/components/StatusBadge";
import { AnomalyPanel } from "../src/components/AnomalyPanel";
import { MoatBanner } from "../src/components/MoatBanner";
import type { AnomalyFinding } from "../src/types/anomaly";
import type { PipelineStatus } from "../src/types";

/* ------------------------------------------------------------------ */
/*  Toggle button wired into the provider                             */
/* ------------------------------------------------------------------ */
function ToggleButton() {
  const { mode, toggle } = useTerminology();
  return (
    <button onClick={toggle} data-testid="toggle">
      {mode}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */
describe("StatusBadge content toggles", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("shows 'Open' in professional and 'Outstanding' in plain mode", async () => {
    const user = userEvent.setup();
    render(
      <TerminologyProvider>
        <ToggleButton />
        <StatusBadge status="open" />
      </TerminologyProvider>,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByText("Outstanding")).toBeInTheDocument();
    expect(screen.queryByText("Open")).not.toBeInTheDocument();
  });

  it("shows 'Released' in professional and 'Paid Off / Released' in plain mode", async () => {
    const user = userEvent.setup();
    render(
      <TerminologyProvider>
        <ToggleButton />
        <StatusBadge status="released" />
      </TerminologyProvider>,
    );
    expect(screen.getByText("Released")).toBeInTheDocument();

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByText("Paid Off / Released")).toBeInTheDocument();
  });

  it("shows 'Unresolved' in professional and 'Needs Review' in plain mode", async () => {
    const user = userEvent.setup();
    render(
      <TerminologyProvider>
        <ToggleButton />
        <StatusBadge status="unresolved" />
      </TerminologyProvider>,
    );
    expect(screen.getByText("Unresolved")).toBeInTheDocument();

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByText("Needs Review")).toBeInTheDocument();
  });

  it("translates '(override)' to '(Change)' in plain mode", async () => {
    const user = userEvent.setup();
    render(
      <TerminologyProvider>
        <ToggleButton />
        <StatusBadge status="open" overridden />
      </TerminologyProvider>,
    );
    expect(screen.getByText("(override)")).toBeInTheDocument();

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByText("(Change)")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  MoatBanner                                                         */
/* ------------------------------------------------------------------ */
describe("MoatBanner content toggles", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  const pipeline: PipelineStatus = {
    current_stage: "indexed",
    verified_through_date: "2026-04-09",
  };

  it("shows professional pipeline header by default", () => {
    render(
      <TerminologyProvider>
        <MoatBanner pipelineStatus={pipeline} />
      </TerminologyProvider>,
    );
    expect(screen.getByText("County Recording Pipeline Status")).toBeInTheDocument();
  });

  it("shows plain pipeline header after toggle", async () => {
    const user = userEvent.setup();
    render(
      <TerminologyProvider>
        <ToggleButton />
        <MoatBanner pipelineStatus={pipeline} />
      </TerminologyProvider>,
    );

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByText("County Document Processing Status")).toBeInTheDocument();
    expect(screen.queryByText("County Recording Pipeline Status")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  AnomalyPanel                                                       */
/* ------------------------------------------------------------------ */
describe("AnomalyPanel content toggles", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  const finding: AnomalyFinding = {
    rule_id: "R1",
    parcel_apn: "304-78-386",
    severity: "medium",
    title: "Same-day transaction pair",
    description: "Warranty Deed and Deed of Trust recorded same day.",
    evidence_instruments: ["20210057846"],
    examiner_action: "Confirm the DOT financed the WAR DEED.",
    detection_provenance: {
      rule_name: "same-day transaction",
      rule_version: "1.0.0",
      confidence: 0.9,
    },
  };

  it("shows '1 anomaly' in professional mode", () => {
    render(
      <MemoryRouter>
        <TerminologyProvider>
          <AnomalyPanel findings={[finding]} apn="304-78-386" />
        </TerminologyProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/1 anomaly\b/i)).toBeInTheDocument();
  });

  it("shows '1 Issue' in plain mode", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TerminologyProvider>
          <ToggleButton />
          <AnomalyPanel findings={[finding]} apn="304-78-386" />
        </TerminologyProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByText(/1 Issue\b/)).toBeInTheDocument();
  });

  it("translates 'Evidence' and 'Examiner action' labels in plain mode", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TerminologyProvider>
          <ToggleButton />
          <AnomalyPanel findings={[finding]} apn="304-78-386" />
        </TerminologyProvider>
      </MemoryRouter>,
    );

    // Expand the panel
    const showBtn = screen.getByRole("button", { name: /show details/i });
    await user.click(showBtn);

    // Professional mode: original labels
    expect(screen.getByText("Evidence:")).toBeInTheDocument();
    expect(screen.getByText("Examiner action:")).toBeInTheDocument();

    // Toggle to plain
    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByText("Supporting Documents:")).toBeInTheDocument();
    expect(screen.getByText("What To Do:")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Glossary round-trip: every new entry translates AND reverts         */
/* ------------------------------------------------------------------ */
describe("Glossary round-trip for new content entries", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  function TranslationProbe({ term }: { term: string }) {
    const { t } = useTerminology();
    return <span data-testid={`t-${term}`}>{t(term)}</span>;
  }

  const NEW_CONTENT_ENTRIES: [string, string][] = [
    ["Lender", "Lender"],
    ["Releasing Party", "Company That Released the Mortgage"],
    ["Recording Date", "Date Recorded"],
    ["Legal Description", "Property Description (Legal)"],
    ["Back References", "Related Prior Documents"],
    ["Extracted Fields", "Document Details"],
    ["Additional Fields", "More Details"],
    ["Related Instruments", "Related Documents"],
    ["Open", "Outstanding"],
    ["Released", "Paid Off / Released"],
    ["Unresolved", "Needs Review"],
    ["Examiner review required", "Needs review"],
    ["Unrecorded transfer", "Missing Public Record"],
    ["Copy Citation", "Copy Reference"],
    ["Same-day transaction", "Same-Day Filing"],
    ["Cross-parcel scan", "Search Across Properties"],
    ["Override", "Change"],
    ["Override status", "Change Status"],
    ["County Recording Pipeline Status", "County Document Processing Status"],
  ];

  it.each(NEW_CONTENT_ENTRIES)(
    "translates '%s' → '%s' in plain mode and reverts in professional",
    async (professional, plain) => {
      const user = userEvent.setup();
      render(
        <TerminologyProvider>
          <ToggleButton />
          <TranslationProbe term={professional} />
        </TerminologyProvider>,
      );

      // Professional mode: shows original
      expect(screen.getByTestId(`t-${professional}`)).toHaveTextContent(professional);

      // Toggle to plain
      await user.click(screen.getByTestId("toggle"));
      expect(screen.getByTestId(`t-${professional}`)).toHaveTextContent(plain);

      // Toggle back to professional
      await user.click(screen.getByTestId("toggle"));
      expect(screen.getByTestId(`t-${professional}`)).toHaveTextContent(professional);
    },
  );
});
