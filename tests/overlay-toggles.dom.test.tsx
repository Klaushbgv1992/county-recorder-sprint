import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { OverlayToggles } from "../src/components/OverlayToggles";

describe("OverlayToggles", () => {
  afterEach(() => cleanup());

  it("renders 3 toggles with aria-pressed reflecting state", () => {
    const overlays = new Set<"encumbrance" | "anomaly" | "lastdeed">(["encumbrance"]);
    render(<OverlayToggles overlays={overlays} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Open encumbrances/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Curator anomalies/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Last deed recorded/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking a toggle calls onToggle with the name", async () => {
    const onToggle = vi.fn();
    render(<OverlayToggles overlays={new Set()} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /Curator anomalies/ }));
    expect(onToggle).toHaveBeenCalledWith("anomaly");
  });

  it("all three buttons are present", () => {
    render(<OverlayToggles overlays={new Set()} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Open encumbrances/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Curator anomalies/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Last deed recorded/ })).toBeDefined();
  });

  it("multiple overlays can be pressed simultaneously", () => {
    const overlays = new Set<"encumbrance" | "anomaly" | "lastdeed">(["encumbrance", "anomaly", "lastdeed"]);
    render(<OverlayToggles overlays={overlays} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Open encumbrances/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Curator anomalies/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Last deed recorded/ })).toHaveAttribute("aria-pressed", "true");
  });

  // --- isMobile=true branch ---------------------------------------------

  it("on mobile, collapses to a single 'Layers' trigger with no visible toggles yet", () => {
    render(
      <OverlayToggles
        overlays={new Set(["encumbrance"])}
        onToggle={() => {}}
        isMobile
      />,
    );
    // Trigger pill is visible; the three toggle pills are not (sheet closed).
    expect(
      screen.getByRole("button", { name: /Map layers — 1 active/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Open encumbrances/ }),
    ).not.toBeInTheDocument();
  });

  it("on mobile, opens a bottom sheet exposing all three toggles", async () => {
    render(
      <OverlayToggles overlays={new Set()} onToggle={() => {}} isMobile />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Map layers/i }));
    expect(screen.getByRole("dialog", { name: /Map layers/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open encumbrances/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Curator anomalies/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Last deed recorded/ })).toBeInTheDocument();
  });

  it("on mobile, clicking a sheet toggle fires onToggle with the overlay name", async () => {
    const onToggle = vi.fn();
    render(<OverlayToggles overlays={new Set()} onToggle={onToggle} isMobile />);
    await userEvent.click(screen.getByRole("button", { name: /Map layers/i }));
    await userEvent.click(screen.getByRole("button", { name: /Curator anomalies/ }));
    expect(onToggle).toHaveBeenCalledWith("anomaly");
  });
});
