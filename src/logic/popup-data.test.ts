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
    // POPHAM has 2 open lifecycles: lc-002 (DOT 20210057847) and
    // lc-015 (demo-only NFTL 20240100001 — federal tax lien).
    expect(data!.openLifecycleCount).toBe(2);
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
    // POPHAM corpus latest is 2024-03-12 — the demo-only NFTL
    // (20240100001) added to demonstrate R10 open-statutory-lien
    // handling. Prior to that addition the latest was 2021-01-22.
    expect(data!.lastRecordingDate).toBe("2024-03-12");
  });
});
