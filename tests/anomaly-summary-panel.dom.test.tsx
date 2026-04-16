import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AnomalySummaryPanel } from "../src/components/map/AnomalySummaryPanel";

const anomalies = [
  { id: "a1", parcel_apn: "304-78-386", severity: "high" as const, title: "Mismatch", description: "" },
  { id: "a2", parcel_apn: "304-78-386", severity: "medium" as const, title: "Same-name", description: "" },
  { id: "a3", parcel_apn: "304-77-689", severity: "high" as const, title: "Missing release", description: "" },
];

function wrap(children: React.ReactNode) { return <MemoryRouter>{children}</MemoryRouter>; }

describe("AnomalySummaryPanel", () => {
  beforeEach(() => cleanup());

  it("groups anomalies by APN with severity dots", () => {
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open onClose={() => {}} />));
    expect(screen.getByText("304-78-386")).toBeInTheDocument();
    expect(screen.getByText("304-77-689")).toBeInTheDocument();
    expect(screen.getByText("Mismatch")).toBeInTheDocument();
  });

  it("close button dismisses", () => {
    const onClose = vi.fn();
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open onClose={onClose} />));
    const closeButton = screen.getByLabelText("Close anomaly panel");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape dismisses", () => {
    const onClose = vi.fn();
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open onClose={onClose} />));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open={false} onClose={() => {}} />));
    expect(screen.queryByText("304-78-386")).not.toBeInTheDocument();
  });

  it("renders severity dots with correct aria-label", () => {
    render(wrap(<AnomalySummaryPanel anomalies={anomalies} open onClose={() => {}} />));
    const highDots = screen.getAllByLabelText("high");
    expect(highDots.length).toBe(2);
    const medDots = screen.getAllByLabelText("medium");
    expect(medDots.length).toBe(1);
  });
});
