import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useNowOverrideFromSearchParams } from "../src/hooks/useNowOverrideFromSearchParams";

function wrap(initialUrl: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  );
}

describe("useNowOverrideFromSearchParams", () => {
  it("returns undefined when ?now= is absent", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/"),
    });
    expect(result.current).toBeUndefined();
  });

  it("returns epoch ms when ?now= is a valid ISO with tz", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/?now=2026-04-09T14:00:00-07:00"),
    });
    expect(result.current).toBe(Date.parse("2026-04-09T14:00:00-07:00"));
  });

  it("returns undefined when ?now= is unparseable", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/?now=not-a-date"),
    });
    expect(result.current).toBeUndefined();
  });

  it("returns undefined when ?now= is empty", () => {
    const { result } = renderHook(() => useNowOverrideFromSearchParams(), {
      wrapper: wrap("/?now="),
    });
    expect(result.current).toBeUndefined();
  });
});
