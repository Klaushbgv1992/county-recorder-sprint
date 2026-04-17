import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { CountyHeartbeat } from "../src/components/CountyHeartbeat";

const AT_1400 = Date.parse("2026-04-09T14:00:00-07:00");
const AT_0900 = Date.parse("2026-04-09T09:00:00-07:00");

function renderAt(now: number) {
  return render(
    <MemoryRouter>
      <CountyHeartbeat now={now} />
    </MemoryRouter>,
  );
}

describe("CountyHeartbeat — counter + ribbon + provenance", () => {
  afterEach(() => cleanup());

  it("renders the count at 14:00 as 2,520 with locale-formatted thousands separator", () => {
    renderAt(AT_1400);
    expect(screen.getByText("2,520")).toBeInTheDocument();
  });

  it("renders the count at 09:00 as 720", () => {
    renderAt(AT_0900);
    expect(screen.getByText("720")).toBeInTheDocument();
  });

  it("renders the counter's visible caption without the word 'today'", () => {
    const { container } = renderAt(AT_1400);
    expect(container.textContent).toMatch(/documents filed by this hour/i);
  });

  it("gives the counter span an aria-label that matches the caption's honesty stance", () => {
    renderAt(AT_1400);
    expect(
      screen.getByLabelText(/Documents filed by this hour in a Maricopa business day/i),
    ).toBeInTheDocument();
  });

  it("renders the desktop ribbon with {lagMin}–{lagMax} interpolated from pipeline_state.json", () => {
    const { container } = renderAt(AT_1400);
    const text = container.textContent ?? "";
    expect(text).toMatch(/The county operates the recording day\./);
    expect(text).toMatch(/Title plants refresh 14–28 days behind\./);
  });

  it("renders the mobile ribbon with the tightened copy and day abbreviation", () => {
    const { container } = renderAt(AT_1400);
    const text = container.textContent ?? "";
    expect(text).toMatch(/County operates the recording day/);
    expect(text).toMatch(/title plants lag 14–28d/);
  });

  it("gates the mobile ribbon behind md:hidden and the desktop cluster behind hidden md:flex", () => {
    const { container } = renderAt(AT_1400);
    const mobileRibbon = container.querySelector(".md\\:hidden");
    expect(mobileRibbon).toBeTruthy();
    const desktopCluster = container.querySelector(".hidden.md\\:flex");
    expect(desktopCluster).toBeTruthy();
  });

  it("renders the provenance caption with id='heartbeat-provenance' and cites the Recorder's Office via external link", () => {
    renderAt(AT_1400);
    const caption = document.getElementById("heartbeat-provenance");
    expect(caption).not.toBeNull();
    expect(caption!.textContent ?? "").toMatch(/Replaying Maricopa's ~4,000-doc business day/);
    expect(caption!.textContent ?? "").toMatch(/total volume cited; intra-day pacing modeled/);

    const link = caption!.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe(
      "https://recorder.maricopa.gov/site/about.aspx",
    );
    expect(link!.getAttribute("target")).toBe("_blank");
    const rel = link!.getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("sets aria-describedby on the section pointing at the provenance caption", () => {
    const { container } = renderAt(AT_1400);
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-describedby")).toBe("heartbeat-provenance");
  });

  it("renders a 'See pipeline →' link to /pipeline that is visible on desktop only", () => {
    renderAt(AT_1400);
    const link = screen.getByRole("link", { name: /see pipeline/i });
    expect(link).toHaveAttribute("href", "/pipeline");
    expect(link.className).toMatch(/hidden/);
    expect(link.className).toMatch(/md:inline-block|md:inline-flex|md:inline|md:block|md:flex/);
  });
});

// The 24-hour sparkline was removed from CountyHeartbeat post-merge — user
// feedback that the bars read as decorative rather than informative, and the
// 7-zero + 10-equal + 7-trickle shape was confusing without a visible
// caption or time-axis markers. The pure function `sparklineBars` remains
// in src/logic/heartbeat-model.ts and is still tested in
// tests/heartbeat-model.test.ts — if the sparkline is ever reintroduced
// with proper labeling, the data layer is ready. DOM-level sparkline tests
// are gone because there is no sparkline DOM to assert on.
describe("CountyHeartbeat sparkline — removed, data function retained", () => {
  afterEach(() => cleanup());

  it("does not render any SVG in the heartbeat band", () => {
    const { container } = renderAt(AT_1400);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(0);
  });
});

describe("CountyHeartbeat — no aria-live anywhere", () => {
  afterEach(() => cleanup());

  it("counter span does not carry aria-live (would spam screen readers at 1Hz)", () => {
    const { container } = renderAt(AT_1400);
    const liveRegions = container.querySelectorAll("[aria-live]");
    expect(liveRegions.length).toBe(0);
  });
});

describe("CountyHeartbeat — determinism under rapid re-render", () => {
  afterEach(() => cleanup());

  it("two renders at the same `now` produce identical count text", () => {
    const { container: a } = renderAt(AT_1400);
    const { container: b } = renderAt(AT_1400);
    const countA = a.querySelector('[aria-label*="Maricopa business day"]')?.textContent;
    const countB = b.querySelector('[aria-label*="Maricopa business day"]')?.textContent;
    expect(countA).toBe(countB);
    expect(countA).toBe("2,520");
  });
});
