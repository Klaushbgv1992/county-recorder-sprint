import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCorrectionRequests } from "../../src/account/useCorrectionRequests";
import { useRecordsRequests } from "../../src/account/useRecordsRequests";

describe("request hooks", () => {
  beforeEach(() => localStorage.clear());

  it("useCorrectionRequests mints MCR-CORR refs", () => {
    const { result } = renderHook(() => useCorrectionRequests());
    let ref = "";
    act(() => {
      ref = result.current.submit({
        parcel_apn: "304-78-386",
        claim: "Owner",
        correction: "Name typo",
      }).ref;
    });
    expect(ref).toMatch(/^MCR-CORR-\d{4}-\d{5}$/);
  });

  it("useRecordsRequests mints MCR-FOIA refs", () => {
    const { result } = renderHook(() => useRecordsRequests());
    let ref = "";
    act(() => {
      ref = result.current.submit({ subject: "Plat copy", details: "Book 553 Page 15" }).ref;
    });
    expect(ref).toMatch(/^MCR-FOIA-\d{4}-\d{5}$/);
  });
});
