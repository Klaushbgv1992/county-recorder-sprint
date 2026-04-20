import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AnomalyPanel } from "../src/components/AnomalyPanel";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";
import type { AnomalyFinding } from "../src/types/anomaly";

const APN = "304-78-386";

function renderPanel(findings: AnomalyFinding[]) {
  return render(
    <MemoryRouter>
      <TerminologyProvider>
        <AnomalyPanel findings={findings} apn={APN} />
      </TerminologyProvider>
    </MemoryRouter>,
  );
}

function makeFinding(overrides: Partial<AnomalyFinding> = {}): AnomalyFinding {
  return {
    rule_id: "R1",
    parcel_apn: APN,
    severity: "medium",
    title: "Same-day transaction pair",
    description: "Warranty Deed and Deed of Trust recorded same day.",
    evidence_instruments: ["20210057846", "20210057847"],
    examiner_action: "Confirm the DOT financed the WAR DEED.",
    detection_provenance: {
      rule_name: "same-day transaction",
      rule_version: "1.0.0",
      confidence: 0.9,
    },
    ...overrides,
  };
}

describe("AnomalyPanel", () => {
  afterEach(() => cleanup());

  it("renders an empty state when findings is empty", () => {
    renderPanel([]);
    expect(
      screen.getByText(/No anomalies detected/i),
    ).toBeInTheDocument();
  });

  it("renders total count and per-severity badges for mixed findings", () => {
    const findings: AnomalyFinding[] = [
      makeFinding({ rule_id: "R1", severity: "medium" }),
      makeFinding({ rule_id: "R3", severity: "info" }),
      makeFinding({ rule_id: "R7", severity: "info" }),
    ];
    renderPanel(findings);
    expect(screen.getByText(/3 anomalies/i)).toBeInTheDocument();
    expect(screen.getByText(/1 medium/i)).toBeInTheDocument();
    expect(screen.getByText(/2 info/i)).toBeInTheDocument();
  });

  it("uses singular wording for a single finding", () => {
    renderPanel([makeFinding()]);
    expect(screen.getByText(/1 anomaly\b/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 anomalies/i)).not.toBeInTheDocument();
  });

  it("is collapsed initially and expands to show detail cards on click", async () => {
    const user = userEvent.setup();
    const findings = [
      makeFinding({
        title: "Same-day transaction pair",
        description: "Warranty Deed and Deed of Trust recorded same day.",
        examiner_action: "Confirm the DOT financed the WAR DEED.",
      }),
    ];
    renderPanel(findings);
    // Collapsed: title should not be visible.
    expect(screen.queryByText("Same-day transaction pair")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /expand|show details/i });
    await user.click(toggle);

    expect(screen.getByText("Same-day transaction pair")).toBeInTheDocument();
    expect(
      screen.getByText(/Warranty Deed and Deed of Trust recorded same day/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Confirm the DOT financed the WAR DEED\./i),
    ).toBeInTheDocument();
  });

  it("omits the evidence row when evidence_instruments is empty", async () => {
    const user = userEvent.setup();
    renderPanel([
      makeFinding({
        rule_id: "R7",
        title: "Same-name contamination",
        evidence_instruments: [],
      }),
    ]);
    await user.click(
      screen.getByRole("button", { name: /expand|show details/i }),
    );
    // The finding card renders, but no evidence section.
    expect(screen.getByText("Same-name contamination")).toBeInTheDocument();
    expect(screen.queryByText(/Evidence:/i)).not.toBeInTheDocument();
  });

  it("renders evidence instruments as links to the parcel instrument route", async () => {
    const user = userEvent.setup();
    renderPanel([
      makeFinding({
        evidence_instruments: ["20130183450"],
      }),
    ]);
    await user.click(
      screen.getByRole("button", { name: /expand|show details/i }),
    );
    const link = screen.getByRole("link", { name: "20130183450" });
    expect(link).toHaveAttribute(
      "href",
      `/parcel/${APN}/instrument/20130183450`,
    );
  });

  it("renders rule provenance (name, version, confidence) in detail view", async () => {
    const user = userEvent.setup();
    renderPanel([
      makeFinding({
        detection_provenance: {
          rule_name: "same-day transaction",
          rule_version: "1.0.0",
          confidence: 0.9,
        },
      }),
    ]);
    await user.click(
      screen.getByRole("button", { name: /expand|show details/i }),
    );
    const provenance = screen.getByText((_, node) => {
      if (!node || node.tagName !== "P") return false;
      const text = node.textContent ?? "";
      return /Rule: same-day transaction v1\.0\.0 \(confidence: 0\.9\)/.test(
        text,
      );
    });
    expect(provenance).toBeInTheDocument();
  });
});
