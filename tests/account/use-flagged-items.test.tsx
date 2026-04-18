import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlaggedItems, readAllFlaggedItemsFromStorage } from "../../src/account/useFlaggedItems";

describe("useFlaggedItems", () => {
  beforeEach(() => localStorage.clear());

  it("produces a deterministic reference pattern", () => {
    const { result } = renderHook(() => useFlaggedItems());
    let ref = "";
    act(() => {
      ref = result.current.submit({
        instrument_number: "20210075858",
        reason: "wrong grantor",
        note: "typo",
      }).ref;
    });
    expect(ref).toMatch(/^MCR-REPORT-\d{4}-\d{5}$/);
    expect(result.current.items).toHaveLength(1);
  });

  it("surfaces submissions to the staff-queue reader", () => {
    const { result } = renderHook(() => useFlaggedItems());
    act(() => {
      result.current.submit({ instrument_number: "20210075858", reason: "r", note: "" });
    });
    expect(readAllFlaggedItemsFromStorage()).toHaveLength(1);
  });
});
