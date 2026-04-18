// src/logic/homeowner-answers.test.ts
import { describe, it, expect } from "vitest";
import { computeHomeownerAnswers } from "./homeowner-answers";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import lifecyclesRaw from "../data/lifecycles.json";
import { LifecyclesFile } from "../schemas";
import type { Parcel } from "../types";

const POPHAM_APN = "304-78-386";
const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

describe("computeHomeownerAnswers — POPHAM", () => {
  const parcel = loadAllParcels().find((p) => p.apn === POPHAM_APN)!;
  const instruments = loadAllInstruments().filter((i) =>
    parcel.instrument_numbers?.includes(i.instrument_number),
  );
  const a = computeHomeownerAnswers(parcel, instruments, LIFECYCLES);

  it("title-clean reflects open lifecycles tied to this parcel's instruments", () => {
    // lc-002 (root: 20210057847, status: open) is in POPHAM's instrument list.
    // So titleClean.clean is false and openCount is 1.
    expect(a.titleClean.clean).toBe(false);
    expect(a.titleClean.openCount).toBe(1);
    expect(a.titleClean.openLifecycleIds).toContain("lc-002");
  });

  it("last-sale returns the latest warranty deed (20130183449, 2013)", () => {
    expect(a.lastSale.found).toBe(true);
    expect(a.lastSale.year).toBe("2013");
    expect(a.lastSale.recordingNumber).toMatch(/^\d{11}$/);
  });

  it("open-liens matches titleClean.openCount", () => {
    expect(a.openLiens.count).toBe(a.titleClean.openCount);
  });

  it("lender-history lists at least one lender entry with year", () => {
    expect(a.lenderHistory.entries.length).toBeGreaterThanOrEqual(1);
    for (const e of a.lenderHistory.entries) {
      expect(e.year).toMatch(/^\d{4}$/);
      expect(e.lenderDisplayName).toBeTruthy();
      expect(e.recordingNumber).toMatch(/^\d{11}$/);
    }
  });
});

describe("computeHomeownerAnswers — empty parcel safety", () => {
  it("returns sensible defaults when no instruments", () => {
    const parcel: Parcel = {
      apn: "000-00-000",
      address: "Nowhere",
      city: "Gilbert",
      state: "AZ",
      zip: "00000",
      legal_description: "",
      current_owner: "",
      subdivision: "",
      instrument_numbers: [],
    };
    const a = computeHomeownerAnswers(parcel, [], []);
    expect(a.titleClean.clean).toBe(true);
    expect(a.lastSale.found).toBe(false);
    expect(a.openLiens.count).toBe(0);
    expect(a.lenderHistory.entries).toEqual([]);
  });
});
