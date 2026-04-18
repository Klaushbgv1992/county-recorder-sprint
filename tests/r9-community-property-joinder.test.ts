import { describe, expect, it } from "vitest";
import { detectR9 } from "../src/logic/rules/r9-community-property-joinder";
import { loadParcelDataByApn } from "../src/data-loader";

describe("R9 — AZ community-property joinder check", () => {
  it("emits a positive-pass info finding on POPHAM (both spouses on every deed)", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-78-386");
    const findings = detectR9(parcel, instruments);
    // POPHAM has both CHRISTOPHER and ASHLEY on every deed and DOT.
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe("R9");
    expect(findings[0].severity).toBe("info");
    expect(findings[0].title).toMatch(/both spouses joined/i);
    expect(findings[0].examiner_action).toMatch(/25-214/);
  });

  it("flags a defect when only one spouse joins a conveyance", () => {
    const { parcel, instruments } = loadParcelDataByApn("304-78-386");
    // Drop ASHLEY from one deed to simulate a joinder defect.
    const patched = instruments.map((inst) => {
      if (inst.instrument_number !== "20130183450") return inst;
      return {
        ...inst,
        parties: inst.parties.filter(
          (p) => !(p.role === "trustor" && p.name.includes("ASHLEY")),
        ),
      };
    });
    const findings = detectR9(parcel, patched);
    const defects = findings.filter((f) => f.title.includes("joinder defect"));
    expect(defects.length).toBeGreaterThan(0);
    expect(defects[0].examiner_action).toMatch(/ratification deed|quit-claim/);
  });

  it("returns no findings for parcels with a single owner (no pair)", () => {
    const singleOwnerParcel = {
      apn: "999-99-999",
      address: "X",
      city: "X",
      state: "AZ",
      zip: "00000",
      legal_description: "X",
      current_owner: "SMITH JOHN",
      subdivision: "X",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(detectR9(singleOwnerParcel as any, [])).toEqual([]);
  });
});
