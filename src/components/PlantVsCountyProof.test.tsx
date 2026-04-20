import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { PlantVsCountyProof } from "./PlantVsCountyProof";
import type { PipelineState } from "../logic/pipeline-selectors";

// Deterministic fixture so the date math doesn't drift if pipeline-state.json
// is rolled forward in a future commit. Mirrors the real schema 1:1 — index
// stage at 2026-04-16, plant lag 14–28 days.
const FIXTURE: PipelineState = {
  current: {
    as_of: "2026-04-16T10:30:00-07:00",
    stages: [
      { stage_id: "index", label: "County index", verified_through: "2026-04-16", docs_behind: 0, sla_days: 1 },
      { stage_id: "image", label: "Image capture", verified_through: "2026-04-15", docs_behind: 210, sla_days: 1 },
      { stage_id: "ocr", label: "OCR extraction", verified_through: "2026-04-15", docs_behind: 385, sla_days: 2 },
      { stage_id: "entity_resolution", label: "Entity resolution", verified_through: "2026-04-14", docs_behind: 820, sla_days: 3 },
      { stage_id: "curator", label: "Curator sign-off", verified_through: "2026-04-12", docs_behind: 1540, sla_days: 5 },
    ],
  },
  history_30d: [],
  plant_lag_reference: {
    vendor: "typical_title_plant",
    lag_days_min: 14,
    lag_days_max: 28,
    source_note: "Industry reporting; plant SLAs vary by market",
  },
};

function renderUI(state: PipelineState = FIXTURE) {
  return render(
    <MemoryRouter>
      <PlantVsCountyProof state={state} />
    </MemoryRouter>,
  );
}

describe("PlantVsCountyProof — three beats", () => {
  afterEach(() => cleanup());

  it("renders the side-by-side clock with derived plant cached-through date", () => {
    renderUI();
    // Plant cached through ~ index verified_through (2026-04-16) minus 14d
    // = 2026-04-02. The date appears in two places (the clock value and the
    // gap-narrative below) — both are intended.
    expect(screen.getAllByText(/2026-04-02/).length).toBeGreaterThan(0);
    // County side renders the actual verified_through.
    expect(screen.getAllByText(/2026-04-16/).length).toBeGreaterThan(0);
    // Gap indicator names the day count.
    expect(screen.getByText(/14 days of documents the plant hasn't seen/i)).toBeInTheDocument();
  });

  it("derives the plant cached window when verified_through changes", () => {
    const tweaked: PipelineState = {
      ...FIXTURE,
      current: {
        ...FIXTURE.current,
        stages: FIXTURE.current.stages.map((s) =>
          s.stage_id === "index" ? { ...s, verified_through: "2026-05-01" } : s,
        ),
      },
    };
    renderUI(tweaked);
    // 2026-05-01 minus 14d = 2026-04-17
    expect(screen.getAllByText(/2026-04-17/).length).toBeGreaterThan(0);
  });

  it("shows the POPHAM 2021 refinance instrument with both recording numbers as clickable links", () => {
    renderUI();
    // The DOT
    const dotLink = screen.getByRole("link", { name: /20210057847/ });
    expect(dotLink).toHaveAttribute(
      "href",
      "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=20210057847",
    );
    expect(dotLink).toHaveAttribute("target", "_blank");
    expect(dotLink).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // The reconveyance
    const relLink = screen.getByRole("link", { name: /20210075858/ });
    expect(relLink).toHaveAttribute(
      "href",
      "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=20210075858",
    );
  });

  it("links the reconveyance into the parcel proof drawer", () => {
    renderUI();
    // Per acceptance criteria: at least one click must land on the parcel
    // deep link so a reviewer can verify the instrument against the corpus.
    const parcelLink = screen.getByRole("link", {
      name: /open in parcel|verify in corpus|view in corpus/i,
    });
    expect(parcelLink).toHaveAttribute(
      "href",
      "/parcel/304-78-386/instrument/20210075858",
    );
  });

  it("describes the 3-day release vs 14–28 day plant refresh in plain copy", () => {
    renderUI();
    // The narrative beat. The dates render inside <span> children so the
    // raw text is broken across nodes — match against full textContent so
    // a reformatter can split or unify spans without breaking the assert.
    const textContent = document.body.textContent ?? "";
    expect(textContent).toMatch(/recorded the Deed of Trust on\s+2021-01-19/);
    expect(textContent).toMatch(/Full Reconveyance 3 days later on\s+2021-01-22/);
  });

  it("labels the plant column generically, not by vendor name", () => {
    renderUI();
    // No fabricated vendor names — keep the language generic so the band
    // reads as industry-condition framing, not a competitor swipe.
    const plantHeading = screen.getByText(/title plant/i);
    expect(plantHeading.textContent?.toLowerCase()).not.toContain("datatree");
    expect(plantHeading.textContent?.toLowerCase()).not.toContain("first american");
  });

  it("renders inside an aria-labeled section so the band is a discoverable landmark", () => {
    renderUI();
    const region = screen.getByRole("region", { name: /plant.*county|county.*plant/i });
    expect(region).toBeInTheDocument();
    // Sanity: the region contains the remaining two beats.
    expect(within(region).getByText(/2026-04-16/)).toBeInTheDocument();
    expect(within(region).getByText(/2021-01-22/)).toBeInTheDocument();
  });
});
