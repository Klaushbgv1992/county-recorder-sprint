import { describe, expect, it } from "vitest";
import { resolvePopupData } from "./popup-data";
import { loadAllParcels, loadAllInstruments } from "../data-loader";
import lifecyclesRaw from "../data/lifecycles.json";
import { LifecyclesFile } from "../schemas";

const parcels = loadAllParcels();
const instruments = loadAllInstruments();
const lifecycles = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

describe("resolvePopupData", () => {
  it("returns residential variant for POPHAM with correct fields", () => {
    const data = resolvePopupData("304-78-386", { parcels, instruments, lifecycles });
    expect(data).not.toBeNull();
    expect(data!.type).toBe("residential");
    expect(data!.owner).toBe("POPHAM CHRISTOPHER / ASHLEY");
    expect(data!.address).toBe("3674 E Palmer St");
    expect(data!.apn).toBe("304-78-386");
    // POPHAM has lc-002 open (DOT 20210057847)
    expect(data!.openLifecycleCount).toBe(1);
    expect(data!.lastRecordingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns subdivision_common variant for HOA tract", () => {
    const data = resolvePopupData("304-78-409", { parcels, instruments, lifecycles });
    expect(data).not.toBeNull();
    expect(data!.type).toBe("subdivision_common");
    expect(data!.owner).toBe("SEVILLE HOMEOWNERS ASSOCIATION");
    // HOA tract has lc-004 RELEASED (no open lifecycles)
    expect(data!.openLifecycleCount).toBe(0);
  });

  it("returns null for an APN not in the corpus", () => {
    const data = resolvePopupData("000-00-000", { parcels, instruments, lifecycles });
    expect(data).toBeNull();
  });

  it("treats missing parcel.type as residential", () => {
    const fakeParcels = [{
      ...parcels[0],
      apn: "999-99-999",
      type: undefined,
    }];
    const data = resolvePopupData("999-99-999", {
      parcels: fakeParcels,
      instruments: [],
      lifecycles: [],
    });
    expect(data!.type).toBe("residential");
  });

  it("returns the latest recording_date among the parcel's curated instruments", () => {
    const data = resolvePopupData("304-78-386", { parcels, instruments, lifecycles });
    // POPHAM corpus latest is 2021-01-22 (release 20210075858 recorded
    // 3 days after the 2021-01-19 deed + DOT pair).
    expect(data!.lastRecordingDate).toBe("2021-01-22");
  });
});
