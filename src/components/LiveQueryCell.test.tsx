import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LiveQueryCell } from "./LiveQueryCell";
import type { QueryResult } from "../lib/custodian-query-engine.schema";

afterEach(() => cleanup());

const ZERO: QueryResult = { status: "zero" };
const HIT: QueryResult = {
  status: "hit",
  hits: [{
    id: "h1", party_name: "BRIAN MADISON", summary: "A different Brian",
    ai_judgment: "probable_false_positive", ai_rationale: "Different address",
    confidence: 0.91, provenance: "county_internal_index", action_required: "none",
  }],
};
const BLOCKED: QueryResult = {
  status: "blocked",
  failure: {
    kind: "filter_silently_dropped",
    message: "name filter ignored",
    captured_url: "https://publicapi.recorder.maricopa.gov/documents/search?name=POPHAM",
    captured_response_excerpt: '{"page":1,"items":[...]}',
  },
};

function renderHitCell(party = "BRIAN J MADISON") {
  return render(
    <MemoryRouter>
      <LiveQueryCell state="resolved" party={party} indexShort="MCSC" result={HIT} coverage="1990-2026" />
    </MemoryRouter>
  );
}

describe("LiveQueryCell", () => {
  it("idle state shows 'awaiting sweep'", () => {
    render(<LiveQueryCell state="idle" party="CHRISTOPHER POPHAM" indexShort="MCR" />);
    expect(screen.getByText(/awaiting sweep/i)).toBeInTheDocument();
  });

  it("loading state shows a spinner and 'querying'", () => {
    render(<LiveQueryCell state="loading" party="CHRISTOPHER POPHAM" indexShort="MCR" />);
    expect(screen.getByText(/querying/i)).toBeInTheDocument();
  });

  it("zero state shows 'verified zero'", () => {
    render(<LiveQueryCell state="resolved" party="CHRISTOPHER POPHAM" indexShort="MCR" result={ZERO} coverage="1871-2026" />);
    expect(screen.getByText(/verified zero/i)).toBeInTheDocument();
  });

  it("hit (false-positive) state shows AI dismissal badge", () => {
    renderHitCell();
    expect(screen.getByText(/AI: false positive/i)).toBeInTheDocument();
  });

  it("blocked state shows failure message", () => {
    render(<LiveQueryCell state="resolved" party="CHRISTOPHER POPHAM" indexShort="MCR" result={BLOCKED} coverage="" />);
    expect(screen.getByText(/name filter ignored/i)).toBeInTheDocument();
  });

  it("blocked cell click opens a popover with the captured URL", () => {
    render(<LiveQueryCell state="resolved" party="CHRISTOPHER POPHAM" indexShort="MCR" result={BLOCKED} coverage="" />);
    fireEvent.click(screen.getByRole("button", { name: /failure details/i }));
    expect(screen.getByText(/publicapi\.recorder\.maricopa\.gov/)).toBeInTheDocument();
  });

  it("hit cell click toggles the detail card", () => {
    renderHitCell();
    const btn = screen.getByRole("button", { name: /hit details/i });
    fireEvent.click(btn);
    expect(screen.getByText(/Different address/)).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText(/Different address/)).not.toBeInTheDocument();
  });

  it("hit detail card shows deep-link to 2013 DOT for BRIAN J MADISON collision", () => {
    renderHitCell("BRIAN J MADISON");
    fireEvent.click(screen.getByRole("button", { name: /hit details/i }));
    const link = screen.getByRole("link", { name: /2013 DOT/i });
    expect(link).toHaveAttribute("href", "/parcel/304-78-386/instrument/20130183450");
  });
});
