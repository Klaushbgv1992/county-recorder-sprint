import { describe, it, expect } from "vitest";
import type { Parcel } from "../src/types";
import type { AssessorParcel } from "../src/logic/assessor-parcel";
import {
  buildSearchableIndex,
  searchAll,
  type Searchable,
} from "../src/logic/searchable-index";

const popham: Parcel = {
  apn: "304-78-386",
  address: "3674 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85298",
  legal_description: "Lot 46, SEVILLE PARCEL 3",
  current_owner: "POPHAM CHRISTOPHER / ASHLEY",
  type: "residential",
  subdivision: "Seville Parcel 3",
  assessor_url: "",
  instrument_numbers: ["20130183449", "20130183450", "20210075858"],
};

const cachedPolygon: AssessorParcel = {
  APN: "30478300",
  APN_DASH: "304-78-300",
  OWNER_NAME: "JONES TAYLOR",
  PHYSICAL_STREET_NUM: "3600", PHYSICAL_STREET_DIR: "E",
  PHYSICAL_STREET_NAME: "PALMER", PHYSICAL_STREET_TYPE: "ST",
  PHYSICAL_CITY: "GILBERT", PHYSICAL_ZIP: "85298",
  SUBNAME: "SEVILLE PARCEL 3",
  source: "maricopa_assessor_public_gis",
  source_url: "x", captured_date: "2026-04-16",
};

const assessorOnly: AssessorParcel = {
  APN: "30478999",
  APN_DASH: "304-78-999",
  OWNER_NAME: "SMITH JANE",
  PHYSICAL_STREET_NUM: "3700", PHYSICAL_STREET_DIR: "E",
  PHYSICAL_STREET_NAME: "PALMER", PHYSICAL_STREET_TYPE: "ST",
  PHYSICAL_CITY: "GILBERT", PHYSICAL_ZIP: "85298",
  SUBNAME: "SEVILLE PARCEL 3",
  source: "maricopa_assessor_public_gis",
  source_url: "x", captured_date: "2026-04-16",
};

const index: Searchable[] = buildSearchableIndex(
  [popham],
  new Map([[
    "304-78-300",
    { recent_instruments: [{ recording_number: "20200456789", recording_date: "", doc_type: "", parties: [] }] },
  ]]),
  [cachedPolygon, assessorOnly],
);

describe("buildSearchableIndex", () => {
  it("tags each parcel with the right tier", () => {
    expect(index.find((s) => s.apn === "304-78-386")?.tier).toBe("curated");
    expect(index.find((s) => s.apn === "304-78-300")?.tier).toBe("recorder_cached");
    expect(index.find((s) => s.apn === "304-78-999")?.tier).toBe("assessor_only");
  });
});

describe("searchAll", () => {
  it("11-digit instrument resolves across tiers", () => {
    const r = searchAll("20200456789", index);
    expect(r).toHaveLength(1);
    expect(r[0].searchable.apn).toBe("304-78-300");
    expect(r[0].matchType).toBe("instrument");
  });

  it("APN with dashes matches exact", () => {
    const r = searchAll("304-78-386", index);
    expect(r[0].searchable.apn).toBe("304-78-386");
    expect(r[0].matchType).toBe("apn");
  });

  it("APN without dashes matches exact", () => {
    const r = searchAll("30478386", index);
    expect(r[0].searchable.apn).toBe("304-78-386");
  });

  it("owner multi-token suppressed on assessor_only tier", () => {
    const r = searchAll("smith", index);
    expect(r.find((h) => h.searchable.apn === "304-78-999")).toBeUndefined();
  });

  it("owner match works on curated + cached tiers", () => {
    const rPopham = searchAll("popham", index);
    expect(rPopham[0].searchable.apn).toBe("304-78-386");

    const rJones = searchAll("jones", index);
    expect(rJones[0].searchable.apn).toBe("304-78-300");
  });

  it("address substring matches across tiers", () => {
    const r = searchAll("3700 e palmer", index);
    expect(r[0].searchable.apn).toBe("304-78-999");
    expect(r[0].matchType).toBe("address");
  });

  it("sort order: curated > recorder_cached > assessor_only", () => {
    const r = searchAll("palmer", index);
    const tiers = r.map((h) => h.searchable.tier);
    expect(tiers).toEqual(["curated", "recorder_cached", "assessor_only"]);
  });

  it("limits results to opts.limit", () => {
    const r = searchAll("palmer", index, { limit: 1 });
    expect(r).toHaveLength(1);
  });
});
