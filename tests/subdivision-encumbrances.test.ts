import { describe, it, expect } from "vitest";
import { loadAllInstruments, loadParcelDataByApn } from "../src/data-loader";

describe("subdivision encumbrances — lc-004 on POPHAM", () => {
  it("lc-004 references the plat (20010093192) and affidavit (20010849180) with status released", () => {
    const { lifecycles } = loadParcelDataByApn("304-78-386");
    const lc004 = lifecycles.find((lc) => lc.id === "lc-004");
    expect(lc004).toBeDefined();
    expect(lc004!.root_instrument).toBe("20010093192");
    expect(lc004!.child_instruments).toContain("20010849180");
    expect(lc004!.status).toBe("released");
  });

  it("both pivot instruments load through the data loader", () => {
    const byNumber = new Map(
      loadAllInstruments().map((i) => [i.instrument_number, i]),
    );
    expect(byNumber.get("20010093192")).toBeDefined();
    expect(byNumber.get("20010849180")).toBeDefined();
  });
});
