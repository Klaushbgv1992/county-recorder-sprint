import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AiSummaryStatic } from "../src/components/AiSummaryStatic";
import type { Parcel } from "../src/types";

vi.mock("../src/data/ai-summaries/304-78-386/summary.md?raw", () => ({
  default:
    "POPHAM chain: 2013 DOT [20130183450] released by [20210075858].",
}));
vi.mock("../src/data/ai-summaries/304-78-386/prompt.txt?raw", () => ({
  default: "PROMPT_TXT",
}));
vi.mock("../src/data/ai-summaries/304-78-386/metadata.json", () => ({
  default: {
    generated_at: "2026-04-17T12:00:00Z",
    model_id: "claude-opus-4-7",
    input_token_count: 1000,
    output_token_count: 200,
    prompt_hash: "deadbeef",
  },
}));

describe("AiSummaryStatic", () => {
  const parcel = { apn: "304-78-386" } as Parcel;

  it("renders summary prose with clickable citation", () => {
    const opens: string[] = [];
    render(
      <AiSummaryStatic
        parcel={parcel}
        knownInstruments={new Set(["20210075858", "20130183450"])}
        onOpenDocument={(n) => opens.push(n)}
      />,
    );
    expect(screen.getByText(/POPHAM chain/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "20210075858" }));
    expect(opens).toEqual(["20210075858"]);
  });

  it("renders footer with date and model id", () => {
    const { container } = render(
      <AiSummaryStatic
        parcel={parcel}
        knownInstruments={new Set()}
        onOpenDocument={() => {}}
      />,
    );
    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer!.textContent).toMatch(/claude-opus-4-7/);
    expect(footer!.textContent).toMatch(/2026-04-17/);
  });
});

describe("AiSummaryStatic — synthetic-disclosure banner", () => {
  afterEach(() => cleanup());

  const renderForApn = (apn: string) =>
    render(
      <AiSummaryStatic
        parcel={{ apn } as Parcel}
        knownInstruments={new Set()}
        onOpenDocument={() => {}}
      />,
    );

  it("renders the amber banner on WARNER (304-78-374)", () => {
    renderForApn("304-78-374");
    const banner = screen.getByTestId("ai-summary-synthetic-banner");
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/synthetic/i);
    expect(banner.textContent).toMatch(/demo-only/i);
    // Banner pulls from the same amber/yellow palette as the ProofDrawer pill.
    expect(banner.className).toMatch(/amber/);
  });

  it("renders the amber banner on LOWRY (304-78-383)", () => {
    renderForApn("304-78-383");
    expect(screen.getByTestId("ai-summary-synthetic-banner")).toBeInTheDocument();
  });

  it("renders the amber banner on PHOENIX (304-78-367)", () => {
    renderForApn("304-78-367");
    expect(screen.getByTestId("ai-summary-synthetic-banner")).toBeInTheDocument();
  });

  it("does NOT render the banner on POPHAM (304-78-386)", () => {
    renderForApn("304-78-386");
    expect(
      screen.queryByTestId("ai-summary-synthetic-banner"),
    ).not.toBeInTheDocument();
  });

  it("does NOT render the banner on HOGUE (304-77-689)", () => {
    renderForApn("304-77-689");
    expect(
      screen.queryByTestId("ai-summary-synthetic-banner"),
    ).not.toBeInTheDocument();
  });

  it("does NOT render the banner on the HOA parcel (304-78-409)", () => {
    renderForApn("304-78-409");
    expect(
      screen.queryByTestId("ai-summary-synthetic-banner"),
    ).not.toBeInTheDocument();
  });
});
