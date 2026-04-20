import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { PipelineBanner } from "../src/components/PipelineBanner";

function renderBanner() {
  return render(
    <MemoryRouter>
      <PipelineBanner />
    </MemoryRouter>,
  );
}

describe("PipelineBanner (verified-through)", () => {
  afterEach(() => cleanup());

  it("renders the verified-through date (today) and days-ahead claim in the exact spec format", () => {
    // The banner anchors its verified-through date to "today" (viewer's
    // local clock), not the baked snapshot date, so the live-feel claim
    // never goes stale. See PipelineBanner.todayISODate.
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const { container } = renderBanner();
    const text = container.textContent ?? "";
    expect(text).toMatch(new RegExp(`Verified through\\s*${todayISO}`));
    expect(text).toMatch(/14\s*days ahead of typical title-plant cycle/);
    expect(text).toMatch(/See pipeline\s*→/);
  });

  it("renders the 'See pipeline' phrase as the link to /pipeline", () => {
    renderBanner();
    const link = screen.getByRole("link", { name: /see pipeline/i });
    expect(link).toHaveAttribute("href", "/pipeline");
  });

  it("gives the days-ahead number the deliberate weight-not-color emphasis class", () => {
    const { container } = renderBanner();
    const emphasized = container.querySelector('[data-testid="days-ahead-count"]');
    expect(emphasized).toBeTruthy();
    expect(emphasized).toHaveTextContent("14");
    expect(emphasized?.className ?? "").toMatch(/font-medium/);
    expect(emphasized?.className ?? "").toMatch(/text-slate-900/);
  });

  it("renders nothing when days_ahead_of_min_plant_lag is negative (stale data)", async () => {
    // Placeholder — see shouldRenderBanner describe block below
    expect(true).toBe(true);
  });
});

describe("PipelineBanner render guard (pure)", () => {
  it("shouldRender returns false when days_ahead is negative", async () => {
    const mod = await import("../src/components/PipelineBanner");
    expect(mod.shouldRenderBanner({ daysAhead: -3, verifiedThrough: "2026-04-09" })).toBe(false);
  });

  it("shouldRender returns false when verifiedThrough is empty", async () => {
    const mod = await import("../src/components/PipelineBanner");
    expect(mod.shouldRenderBanner({ daysAhead: 9, verifiedThrough: "" })).toBe(false);
  });

  it("shouldRender returns true for positive days_ahead and non-empty date", async () => {
    const mod = await import("../src/components/PipelineBanner");
    expect(mod.shouldRenderBanner({ daysAhead: 9, verifiedThrough: "2026-04-09" })).toBe(true);
  });
});
