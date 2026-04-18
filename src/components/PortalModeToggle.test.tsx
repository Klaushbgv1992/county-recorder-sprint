// src/components/PortalModeToggle.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortalModeToggle } from "./PortalModeToggle";

describe("PortalModeToggle", () => {
  afterEach(() => cleanup());

  it("shows 'Open examiner view' when in homeowner mode", () => {
    render(<PortalModeToggle mode="homeowner" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent(/examiner view/i);
  });

  it("shows 'Homeowner view' when in examiner mode", () => {
    render(<PortalModeToggle mode="examiner" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent(/homeowner view/i);
  });

  it("clicking toggles the opposite mode via onChange", async () => {
    const onChange = vi.fn();
    render(<PortalModeToggle mode="homeowner" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("examiner");
  });
});
