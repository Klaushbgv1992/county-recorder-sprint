import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Toast } from "./Toast";

describe("Toast", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the message text", () => {
    render(<Toast message="Hello world" variant="info" onDismiss={vi.fn()} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("calls onDismiss after 3000ms when variant is success", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Done" variant="success" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does NOT auto-dismiss while variant is info", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Generating" variant="info" onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
