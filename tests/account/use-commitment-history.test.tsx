import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommitmentHistory } from "../../src/account/useCommitmentHistory";

describe("useCommitmentHistory", () => {
  beforeEach(() => localStorage.clear());

  it("records exports newest-first", () => {
    const { result } = renderHook(() => useCommitmentHistory());
    act(() => {
      result.current.record({ parcel_apn: "A", instrument_count: 1, open_encumbrance_count: 0 });
      result.current.record({ parcel_apn: "B", instrument_count: 2, open_encumbrance_count: 1 });
    });
    expect(result.current.items.map((i) => i.parcel_apn)).toEqual(["B", "A"]);
  });
});
