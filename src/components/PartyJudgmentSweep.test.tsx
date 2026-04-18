import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PartyJudgmentSweep } from "./PartyJudgmentSweep";
import { loadAllParcels } from "../data-loader";

const parcels = loadAllParcels();
const POPHAM = parcels.find((p) => p.apn === "304-78-386")!;
const HOGUE = parcels.find((p) => p.apn === "304-77-689")!;

function mount(parcel: typeof POPHAM) {
  return render(
    <MemoryRouter>
      <PartyJudgmentSweep parcel={parcel} />
    </MemoryRouter>
  );
}

describe("PartyJudgmentSweep", () => {
  afterEach(() => cleanup());

  it("renders the sweep header for POPHAM with verified-through date", async () => {
    mount(POPHAM);
    expect(
      await screen.findByRole("heading", { name: /party judgment sweep/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/verified through/i)).toBeInTheDocument();
    });
  });

  it("POPHAM sweep renders the summary metric cards", async () => {
    mount(POPHAM);
    await waitFor(() => {
      expect(screen.getAllByText(/^Parties$/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/^Indexes$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Raw hits$/)).toBeInTheDocument();
    expect(screen.getByText(/dismissed \(ai\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^Need action$/)).toBeInTheDocument();
  });

  it("POPHAM sweep shows either the AI dismissal badge or an all-clear banner", async () => {
    // When the fixture contains the Madison collision, the sweep shows an
    // AI: probable-false-positive badge. When the capture fell to the Phase C
    // verified-zero fallback (spec §5.2), the sweep shows "All clear after AI
    // judgment" instead. Both are valid demo states.
    mount(POPHAM);
    await waitFor(() => {
      const badge = screen.queryByText(/AI: probable false positive/i);
      const allClear = screen.queryByText(/all clear after AI judgment/i);
      expect(badge ?? allClear).not.toBeNull();
    });
  });

  it("POPHAM sweep footer links to /custodian-query", async () => {
    mount(POPHAM);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /how this sweep works/i });
      expect(link.getAttribute("href")).toMatch(/\/custodian-query/);
    });
  });

  it("HOGUE sweep renders the 'blocked by public API' moat banner", async () => {
    mount(HOGUE);
    await waitFor(() => {
      expect(screen.getByText(/sweep blocked by public API limitation/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/why this sweep didn't run/i)).toBeInTheDocument();
    expect(screen.getByText(/what a production deploy would do/i)).toBeInTheDocument();
  });

  it("HOGUE sweep footer links to /custodian-query showpiece", async () => {
    mount(HOGUE);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /see the engine in action/i });
      expect(link).toHaveAttribute("href", "/custodian-query");
    });
  });

  it("returns null for a parcel with no sweep on file", async () => {
    const synthetic = { ...POPHAM, apn: "999-99-999" };
    const { container } = mount(synthetic);
    // Wait a bit to let the engine resolve (null).
    await new Promise((r) => setTimeout(r, 400));
    expect(container).toBeEmptyDOMElement();
  });
});
