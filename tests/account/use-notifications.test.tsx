import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "../../src/account/useNotifications";

describe("useNotifications", () => {
  beforeEach(() => localStorage.clear());

  it("seeds with fixture items and exposes an unread count", () => {
    const { result } = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.unreadCount).toBeGreaterThan(0);
  });

  it("filters to items on watched parcels and parties plus universal kinds", () => {
    const { result: watchingAll } = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    const { result: empty } = renderHook(() =>
      useNotifications({ watchedParcels: [], watchedParties: [] }),
    );
    expect(empty.current.items.length).toBeLessThan(watchingAll.current.items.length);
    expect(empty.current.items.some((i) => i.kind === "digest")).toBe(true);
  });

  it("persists read state across remount", () => {
    const first = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    const before = first.result.current.unreadCount;
    act(() => first.result.current.markRead("n-001"));
    first.unmount();
    const second = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    expect(second.result.current.unreadCount).toBe(before - 1);
  });
});
