import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PipelineBanner } from "../src/components/PipelineBanner";

function renderBanner() {
  return render(
    <MemoryRouter>
      <PipelineBanner />
    </MemoryRouter>,
  );
}

describe("PipelineBanner", () => {
  it("shows county indexed verified-through date", () => {
    const { container } = renderBanner();
    expect(container.textContent).toMatch(/indexed through\s*2026-04-09/i);
  });

  it("shows OCR verified-through date", () => {
    const { container } = renderBanner();
    expect(container.textContent).toMatch(/OCR'd through\s*2026-04-08/i);
  });

  it("shows curator verified-through date", () => {
    const { container } = renderBanner();
    expect(container.textContent).toMatch(
      /curator-verified through\s*2026-04-05/i,
    );
  });

  it("shows a count of docs awaiting AI extraction", () => {
    const { container } = renderBanner();
    expect(container.textContent).toMatch(/1,247\s*docs awaiting AI extraction/i);
  });

  it("links to /pipeline", () => {
    const { container } = renderBanner();
    const link = container.querySelector('a[href="/pipeline"]');
    expect(link).toBeTruthy();
    expect(link?.textContent?.toLowerCase()).toContain("pipeline");
  });
});
