// tests/bottom-sheet.dom.test.tsx
//
// DOM tests for the reusable BottomSheet shell.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { BottomSheet } from "../src/components/BottomSheet";

describe("BottomSheet", () => {
  afterEach(() => cleanup());

  it("renders as a modal dialog with the provided aria-label and title", () => {
    render(
      <BottomSheet
        onClose={() => {}}
        ariaLabel="Test sheet"
        title="Test title"
      >
        <p>sheet body</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Test sheet");
    expect(screen.getByText("Test title")).toBeInTheDocument();
    expect(screen.getByText("sheet body")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} ariaLabel="x">
        <p />
      </BottomSheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("honors closeButtonLabel override", () => {
    render(
      <BottomSheet
        onClose={() => {}}
        ariaLabel="x"
        closeButtonLabel="Back to map"
      >
        <p />
      </BottomSheet>,
    );
    expect(
      screen.getByRole("button", { name: /back to map/i }),
    ).toBeInTheDocument();
  });

  it("calls onClose when the backdrop scrim is tapped", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} ariaLabel="x">
        <p />
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId("bottom-sheet-scrim"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} ariaLabel="x">
        <p />
      </BottomSheet>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
