import { describe, it, expect } from "vitest";
import { loadAllParcels } from "../src/data-loader";
import { resolveInstrumentToApn } from "../src/router";

describe("resolveInstrumentToApn", () => {
  const parcels = loadAllParcels();

  it("returns the owning APN for a known 11-digit instrument", () => {
    // 20210075858 is the POPHAM 2021 reconveyance, on parcel 304-78-386
    expect(resolveInstrumentToApn("20210075858", parcels)).toBe("304-78-386");
  });

  it("returns the owning APN for a HOGUE instrument", () => {
    // 20150516729 is the HOGUE 2015 warranty deed, on parcel 304-77-689
    expect(resolveInstrumentToApn("20150516729", parcels)).toBe("304-77-689");
  });

  it("returns null for an 11-digit instrument not in the corpus", () => {
    expect(resolveInstrumentToApn("99999999999", parcels)).toBeNull();
  });

  it("returns null for a non-11-digit input", () => {
    expect(resolveInstrumentToApn("not-a-number", parcels)).toBeNull();
  });
});
