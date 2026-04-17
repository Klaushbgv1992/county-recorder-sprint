import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStoryData } from "./useStoryData";

describe("useStoryData", () => {
  it("returns curated data for POPHAM", () => {
    const { result } = renderHook(() => useStoryData("304-78-386"));
    expect(result.current).not.toBeNull();
    expect(result.current!.mode).toBe("curated");
    expect(result.current!.parcel.current_owner).toContain("POPHAM");
    expect(result.current!.timelineBlocks.length).toBeGreaterThan(0);
  });

  it("returns partial-mode data for a cached neighbor", () => {
    const { result } = renderHook(() => useStoryData("304-78-406"));
    expect(result.current).not.toBeNull();
    expect(result.current!.mode).toBe("partial");
    expect(result.current!.timelineBlocks[0].pattern_id).toBe("partial_chain_disclosure");
  });

  it("returns null for unknown APN", () => {
    const { result } = renderHook(() => useStoryData("999-99-999"));
    expect(result.current).toBeNull();
  });
});
