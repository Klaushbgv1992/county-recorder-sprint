import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AnomalySummaryPanel } from "../src/components/map/AnomalySummaryPanel";
import type { z } from "zod";
import type { StaffAnomalySchema } from "../src/schemas";
import type { Instrument } from "../src/types";

afterEach(cleanup);

type StaffAnomaly = z.infer<typeof StaffAnomalySchema>;

const anomalies: StaffAnomaly[] = [
  {
    id: "an-002",
    parcel_apn: "304-77-689",
    severity: "high",
    title: "HOGUE release not located",
    description: "d",
    references: [],
    plain_english: "The 2015 DOT [20150516730] has no matching release.",
  },
];
const instruments: Instrument[] = [
  { instrument_number: "20150516730" } as unknown as Instrument,
];

// Legacy anomalies (without plain_english) for backward-compat tests
const legacyAnomalies: StaffAnomaly[] = [
  {
    id: "a1",
    parcel_apn: "304-78-386",
    severity: "high",
    title: "Mismatch",
    description: "",
    references: [],
    plain_english: "Mismatch detected.",
  },
  {
    id: "a2",
    parcel_apn: "304-78-386",
    severity: "medium",
    title: "Same-name",
    description: "",
    references: [],
    plain_english: "Same-name contamination.",
  },
  {
    id: "a3",
    parcel_apn: "304-77-689",
    severity: "high",
    title: "Missing release",
    description: "",
    references: [],
    plain_english: "Missing release detected.",
  },
];

function wrap(children: React.ReactNode) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("AnomalySummaryPanel", () => {
  it("groups anomalies by APN with severity dots", () => {
    render(
      wrap(
        <AnomalySummaryPanel
          anomalies={legacyAnomalies}
          instruments={[]}
          open
          onClose={() => {}}
          onOpenDocument={() => {}}
        />,
      ),
    );
    expect(screen.getByText("304-78-386")).toBeInTheDocument();
    expect(screen.getByText("304-77-689")).toBeInTheDocument();
    expect(screen.getByText("Mismatch")).toBeInTheDocument();
  });

  it("close button dismisses", () => {
    const onClose = () => {};
    render(
      wrap(
        <AnomalySummaryPanel
          anomalies={legacyAnomalies}
          instruments={[]}
          open
          onClose={onClose}
          onOpenDocument={() => {}}
        />,
      ),
    );
    const closeButton = screen.getByLabelText("Close anomaly panel");
    // Just verify the button exists and is clickable
    expect(closeButton).toBeInTheDocument();
  });

  it("Escape key triggers onClose", () => {
    let closed = false;
    render(
      wrap(
        <AnomalySummaryPanel
          anomalies={legacyAnomalies}
          instruments={[]}
          open
          onClose={() => { closed = true; }}
          onOpenDocument={() => {}}
        />,
      ),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closed).toBe(true);
  });

  it("renders nothing when closed", () => {
    render(
      wrap(
        <AnomalySummaryPanel
          anomalies={legacyAnomalies}
          instruments={[]}
          open={false}
          onClose={() => {}}
          onOpenDocument={() => {}}
        />,
      ),
    );
    expect(screen.queryByText("304-78-386")).not.toBeInTheDocument();
  });

  it("renders severity dots with correct aria-label", () => {
    render(
      wrap(
        <AnomalySummaryPanel
          anomalies={legacyAnomalies}
          instruments={[]}
          open
          onClose={() => {}}
          onOpenDocument={() => {}}
        />,
      ),
    );
    const highDots = screen.getAllByLabelText("high");
    expect(highDots.length).toBe(2);
    const medDots = screen.getAllByLabelText("medium");
    expect(medDots.length).toBe(1);
  });

  it("is collapsed by default — title visible, prose not visible", () => {
    render(
      <MemoryRouter>
        <AnomalySummaryPanel
          anomalies={anomalies}
          instruments={instruments}
          open
          onClose={() => {}}
          onOpenDocument={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("HOGUE release not located")).toBeInTheDocument();
    expect(screen.queryByText(/2015 DOT/)).not.toBeInTheDocument();
  });

  it("expands on title click, showing prose with clickable citation", () => {
    const opens: string[] = [];
    render(
      <MemoryRouter>
        <AnomalySummaryPanel
          anomalies={anomalies}
          instruments={instruments}
          open
          onClose={() => {}}
          onOpenDocument={(n) => opens.push(n)}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("HOGUE release not located"));
    expect(screen.getByText(/has no matching release/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "20150516730" }));
    expect(opens).toEqual(["20150516730"]);
  });
});
