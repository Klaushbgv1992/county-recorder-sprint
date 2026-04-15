import { describe, it, expect } from "vitest";
import { loadParcelDataByApn } from "../../src/data-loader";
import { detectR7 } from "../../src/logic/rules/r7-same-name-suppressed";

describe("R7 same-name contamination suppressed", () => {
  it("fires on POPHAM — multi-person owner", () => {
    const { parcel } = loadParcelDataByApn("304-78-386");
    const findings = detectR7(parcel);
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.rule_id).toBe("R7");
    expect(f.severity).toBe("info");
    expect(f.parcel_apn).toBe("304-78-386");
    expect(f.description).toContain("Decision #26");
    expect(f.description).toContain("suppressed during curation");
    expect(f.detection_provenance.confidence).toBe(0.7);
  });

  it("fires on HOGUE — multi-person owner", () => {
    const { parcel } = loadParcelDataByApn("304-77-689");
    const findings = detectR7(parcel);
    expect(findings).toHaveLength(1);
    expect(findings[0].parcel_apn).toBe("304-77-689");
  });

  it("does not fire when owner is single person", () => {
    const parcel = {
      apn: "test",
      current_owner: "SOLO OWNER",
    } as unknown as import("../../src/types").Parcel;
    expect(detectR7(parcel)).toEqual([]);
  });
});
