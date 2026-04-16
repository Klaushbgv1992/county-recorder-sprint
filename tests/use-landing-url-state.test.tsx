import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useLandingUrlState } from "../src/hooks/useLandingUrlState";
import type { ReactNode } from "react";

function wrapper({ children, initial = "/" }: { children: ReactNode; initial?: string }) {
  return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
}

describe("useLandingUrlState", () => {
  it("reads q, apn, overlay from the URL", () => {
    const { result } = renderHook(() => useLandingUrlState(), {
      wrapper: ({ children }) =>
        wrapper({ children, initial: "/?q=popham&apn=304-78-386&overlay=encumbrance,anomaly" }),
    });
    expect(result.current.query).toBe("popham");
    expect(result.current.selectedApn).toBe("304-78-386");
    expect(result.current.overlays.has("encumbrance")).toBe(true);
    expect(result.current.overlays.has("anomaly")).toBe(true);
  });

  it("setQuery updates ?q", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => result.current.setQuery("hogue"));
    expect(result.current.query).toBe("hogue");
  });

  it("setSelectedApn updates ?apn", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => result.current.setSelectedApn("304-77-689"));
    expect(result.current.selectedApn).toBe("304-77-689");
  });

  it("setSelectedApn(null) clears ?apn", () => {
    const { result } = renderHook(() => useLandingUrlState(), {
      wrapper: ({ children }) => wrapper({ children, initial: "/?apn=304-78-386" }),
    });
    act(() => result.current.setSelectedApn(null));
    expect(result.current.selectedApn).toBeNull();
  });

  it("toggleOverlay flips state for a single overlay", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => result.current.toggleOverlay("anomaly"));
    expect(result.current.overlays.has("anomaly")).toBe(true);
    act(() => result.current.toggleOverlay("anomaly"));
    expect(result.current.overlays.has("anomaly")).toBe(false);
  });

  it("setting query and apn in sequence does not drop either", () => {
    const { result } = renderHook(() => useLandingUrlState(), { wrapper });
    act(() => {
      result.current.setQuery("popham");
      result.current.setSelectedApn("304-78-386");
    });
    expect(result.current.query).toBe("popham");
    expect(result.current.selectedApn).toBe("304-78-386");
  });
});
