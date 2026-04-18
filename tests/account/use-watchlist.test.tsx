import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWatchlist } from "../../src/account/useWatchlist";

describe("useWatchlist", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    const { result } = renderHook(() => useWatchlist());
    expect(result.current.parcels).toEqual([]);
    expect(result.current.parties).toEqual([]);
  });

  it("toggles parcels idempotently", () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => result.current.toggleParcel("304-78-386"));
    expect(result.current.isParcelWatched("304-78-386")).toBe(true);
    act(() => result.current.toggleParcel("304-78-386"));
    expect(result.current.isParcelWatched("304-78-386")).toBe(false);
  });

  it("persists across remounts", () => {
    const first = renderHook(() => useWatchlist());
    act(() => first.result.current.toggleParcel("304-78-386"));
    act(() => first.result.current.toggleParty("wells-fargo"));
    first.unmount();
    const second = renderHook(() => useWatchlist());
    expect(second.result.current.parcels).toEqual(["304-78-386"]);
    expect(second.result.current.parties).toEqual(["wells-fargo"]);
  });
});
