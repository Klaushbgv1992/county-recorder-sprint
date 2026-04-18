import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentlyViewed } from "../../src/account/useRecentlyViewed";

describe("useRecentlyViewed", () => {
  beforeEach(() => localStorage.clear());

  it("caps at 8 entries", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    for (let i = 0; i < 10; i++) {
      act(() => result.current.record({ kind: "parcel", id: `apn-${i}`, label: `APN ${i}` }));
    }
    expect(result.current.items).toHaveLength(8);
    expect(result.current.items[0].id).toBe("apn-9");
  });

  it("dedupes repeat visits by promoting to front", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.record({ kind: "parcel", id: "A", label: "A" }));
    act(() => result.current.record({ kind: "parcel", id: "B", label: "B" }));
    act(() => result.current.record({ kind: "parcel", id: "A", label: "A" }));
    expect(result.current.items.map((i) => i.id)).toEqual(["A", "B"]);
  });
});
