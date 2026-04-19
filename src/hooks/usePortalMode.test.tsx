// src/hooks/usePortalMode.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, useSearchParams } from "react-router";
import { usePortalMode } from "./usePortalMode";
import type { ReactNode } from "react";

function wrapper(initialEntries: string[]) {
  return function W({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

function useModeAndSearchParams() {
  const [params] = useSearchParams();
  const hook = usePortalMode();
  return { ...hook, urlMode: params.get("mode") };
}

describe("usePortalMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to homeowner when URL + localStorage empty", () => {
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.mode).toBe("homeowner");
  });

  it("reads ?mode=examiner from the URL", () => {
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/?mode=examiner"]),
    });
    expect(result.current.mode).toBe("examiner");
  });

  it("URL beats localStorage when both set", () => {
    localStorage.setItem("portalMode", "homeowner");
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/?mode=examiner"]),
    });
    expect(result.current.mode).toBe("examiner");
  });

  it("reads mode from localStorage when URL absent", () => {
    localStorage.setItem("portalMode", "examiner");
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.mode).toBe("examiner");
  });

  it("setMode persists to localStorage and mirrors into ?mode= on the URL", () => {
    const { result } = renderHook(() => useModeAndSearchParams(), {
      wrapper: wrapper(["/"]),
    });
    act(() => {
      result.current.setMode("examiner");
    });
    expect(localStorage.getItem("portalMode")).toBe("examiner");
    expect(result.current.mode).toBe("examiner");
    // URL mirroring — the shareable-link story requires ?mode=<> on the URL.
    expect(result.current.urlMode).toBe("examiner");
  });

  it("ignores invalid localStorage values", () => {
    localStorage.setItem("portalMode", "bogus");
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.mode).toBe("homeowner");
  });
});
