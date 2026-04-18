import { describe, expect, it } from "vitest";
import { detectR10 } from "../src/logic/rules/r10-open-statutory-lien";
import { loadParcelDataByApn } from "../src/data-loader";

describe("R10 — open statutory lien", () => {
  it("flags the POPHAM federal tax lien as a high-severity open lien", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const findings = detectR10(parcel, instruments, lifecycles);
    const fedTax = findings.find((f) =>
      f.evidence_instruments.includes("20240100001"),
    );
    expect(fedTax).toBeDefined();
    expect(fedTax!.rule_id).toBe("R10");
    expect(fedTax!.severity).toBe("high");
    expect(fedTax!.title).toMatch(/federal tax lien/i);
    expect(fedTax!.examiner_action).toMatch(/668\(Z\)|Certificate of Release/);
  });

  it("does not fire for parcels with no open liens", () => {
    // HOGUE has no tax liens in the corpus.
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-77-689");
    const findings = detectR10(parcel, instruments, lifecycles);
    expect(findings).toEqual([]);
  });

  it("does not fire on a lien whose lifecycle is closed (released)", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const patched = lifecycles.map((lc) =>
      lc.root_instrument === "20240100001" ? { ...lc, status: "released" as const } : lc,
    );
    const findings = detectR10(parcel, instruments, patched);
    expect(findings.filter((f) => f.evidence_instruments.includes("20240100001"))).toEqual([]);
  });
});
