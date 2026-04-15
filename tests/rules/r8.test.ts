import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR8 } from "../../src/logic/rules/r8-chain-stale";

const NOW = new Date("2026-04-14");

describe("R8 chain stale", () => {
  it("fires on HOGUE — last instrument 2015-07-17 (>7 years stale on 2026-04-14)", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-77-689");
    const findings = detectR8(parcel, instruments, NOW);
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.rule_id).toBe("R8");
    expect(f.severity).toBe("low");
    expect(f.description).toContain("304-77-689");
    expect(f.description).toContain("2015-07-17");
    expect(f.detection_provenance.confidence).toBe(0.9);
  });

  it("does NOT fire on POPHAM — last instrument 2021-01-22 (~5.2 years, below 7-year threshold)", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-78-386");
    const findings = detectR8(parcel, instruments, NOW);
    expect(findings).toEqual([]);
  });

  it("does not fire when parcel has no instruments", () => {
    const parcel = { apn: "test" } as unknown as import("../../src/types").Parcel;
    expect(detectR8(parcel, [], NOW)).toEqual([]);
  });
});
