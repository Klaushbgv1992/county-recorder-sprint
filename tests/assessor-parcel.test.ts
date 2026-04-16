import { describe, it, expect } from "vitest";
import { AssessorParcel, assembleAddress } from "../src/logic/assessor-parcel";

describe("AssessorParcel schema", () => {
  it("parses a minimal valid row", () => {
    const parsed = AssessorParcel.parse({
      APN: "30478386",
      APN_DASH: "304-78-386",
      OWNER_NAME: "POPHAM CHRISTOPHER/ASHLEY",
      PHYSICAL_STREET_NUM: "3674",
      PHYSICAL_STREET_DIR: "E",
      PHYSICAL_STREET_NAME: "PALMER",
      PHYSICAL_STREET_TYPE: "ST",
      PHYSICAL_CITY: "GILBERT",
      PHYSICAL_ZIP: "85298",
      SUBNAME: "SEVILLE PARCEL 3",
      LOT_NUM: "46",
      DEED_NUMBER: "20130183449",
      DEED_DATE: 1361923200000,
      LAND_SIZE: 7015,
      Shape_Area: 934,
      source: "maricopa_assessor_public_gis",
      source_url: "https://example/",
      captured_date: "2026-04-16",
    });
    expect(parsed.APN_DASH).toBe("304-78-386");
  });

  it("rejects rows missing provenance", () => {
    expect(() =>
      AssessorParcel.parse({
        APN: "1", APN_DASH: "1-1-1", OWNER_NAME: "X",
      }),
    ).toThrow();
  });
});

describe("assembleAddress", () => {
  it("joins street num + dir + name + type + city + zip", () => {
    const a = assembleAddress({
      PHYSICAL_STREET_NUM: "3674",
      PHYSICAL_STREET_DIR: "E",
      PHYSICAL_STREET_NAME: "PALMER",
      PHYSICAL_STREET_TYPE: "ST",
      PHYSICAL_CITY: "GILBERT",
      PHYSICAL_ZIP: "85298",
    });
    expect(a).toBe("3674 E PALMER ST, GILBERT 85298");
  });
  it("omits nulls and empty pieces", () => {
    const a = assembleAddress({
      PHYSICAL_STREET_NUM: "3674",
      PHYSICAL_STREET_DIR: null,
      PHYSICAL_STREET_NAME: "PALMER",
      PHYSICAL_STREET_TYPE: "",
      PHYSICAL_CITY: "GILBERT",
      PHYSICAL_ZIP: null,
    });
    expect(a).toBe("3674 PALMER, GILBERT");
  });
});
