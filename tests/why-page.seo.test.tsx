import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { WhyPage } from "../src/components/WhyPage";

describe("WhyPage SEO", () => {
  afterEach(() => {
    cleanup();
    document.title = "";
    document.querySelectorAll('meta[name="description"]').forEach((el) => el.remove());
  });

  it("sets document.title to the spec-exact title", () => {
    render(
      <MemoryRouter>
        <WhyPage />
      </MemoryRouter>,
    );
    expect(document.title).toBe(
      "Why county-owned title data — Maricopa County Recorder Portal",
    );
  });

  it("renders a meta description with the spec-exact content", () => {
    render(
      <MemoryRouter>
        <WhyPage />
      </MemoryRouter>,
    );
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute("content")).toBe(
      "How county recording, indexing, and title-plant search actually work — plus what the public API blocks, with receipts from two failed hunts against Maricopa's publicapi.recorder.maricopa.gov.",
    );
  });
});
