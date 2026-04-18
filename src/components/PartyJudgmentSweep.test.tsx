import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PartyJudgmentSweep } from "./PartyJudgmentSweep";
import { loadAllParcels } from "../data-loader";

const parcels = loadAllParcels();
const POPHAM = parcels.find((p) => p.apn === "304-78-386")!;
const HOGUE = parcels.find((p) => p.apn === "304-77-689")!;

describe("PartyJudgmentSweep", () => {
  afterEach(() => cleanup());

  it("renders the sweep header for POPHAM with verified-through date", () => {
    render(<PartyJudgmentSweep parcel={POPHAM} />);
    expect(screen.getByRole("heading", { name: /party judgment sweep/i })).toBeInTheDocument();
    expect(screen.getByText(/verified through/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2026-04-17/).length).toBeGreaterThan(0);
  });

  it("POPHAM sweep renders the summary metric cards (Parties / Indexes / Raw hits / Dismissed / Need action)", () => {
    render(<PartyJudgmentSweep parcel={POPHAM} />);
    // Each metric label appears in a small label div inside its metric card.
    // "Parties" and "Indexes" also appear in prose in the header; scope by
    // the [11px] label class to get the card labels specifically.
    expect(screen.getAllByText(/^Parties$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Indexes$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Raw hits$/)).toBeInTheDocument();
    expect(screen.getByText(/dismissed \(ai\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^Need action$/)).toBeInTheDocument();
  });

  it("POPHAM sweep shows the probable-false-positive AI judgment for the UCC fixture hit", () => {
    render(<PartyJudgmentSweep parcel={POPHAM} />);
    expect(screen.getByText(/AI: probable false positive/i)).toBeInTheDocument();
    expect(screen.getByText(/SOLARCITY solar lease/i)).toBeInTheDocument();
  });

  it("HOGUE sweep renders the 'blocked by public API' moat banner", () => {
    render(<PartyJudgmentSweep parcel={HOGUE} />);
    expect(screen.getByText(/sweep blocked by public API limitation/i)).toBeInTheDocument();
    expect(screen.getByText(/why this sweep didn't run/i)).toBeInTheDocument();
    expect(screen.getByText(/what a production deploy would do/i)).toBeInTheDocument();
  });

  it("returns null for a parcel with no sweep on file", () => {
    const synthetic = {
      ...POPHAM,
      apn: "999-99-999",
    };
    const { container } = render(<PartyJudgmentSweep parcel={synthetic} />);
    expect(container).toBeEmptyDOMElement();
  });
});
