import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { CuratorQueue } from "../../src/components/CuratorQueue";

describe("CuratorQueue — user-filed flag bridge", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders user-filed flags from localStorage alongside seeded anomalies", () => {
    localStorage.setItem(
      "mcr.account.flaggedItems.v1",
      JSON.stringify([{
        id: "x",
        ref: "MCR-REPORT-2026-00001",
        instrument_number: "20210075858",
        parcel_apn: "304-78-386",
        reason: "wrong_party_name",
        note: "typo in grantor",
        submitted_at: "2026-04-18T00:00:00Z",
        status: "pending",
      }]),
    );
    render(<MemoryRouter><CuratorQueue /></MemoryRouter>);
    expect(screen.getByText(/MCR-REPORT-2026-00001/)).toBeInTheDocument();
    expect(screen.getByText(/typo in grantor/i)).toBeInTheDocument();
  });
});
