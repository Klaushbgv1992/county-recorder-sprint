import { describe, it, expect } from "vitest";
import { searchParcels } from "../src/logic/search";
import type { Parcel } from "../src/types";

const POPHAM: Parcel = {
  apn: "304-78-386",
  address: "3674 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85298",
  legal_description: "Lot 46, SEVILLE PARCEL 3",
  current_owner: "POPHAM CHRISTOPHER / ASHLEY",
  subdivision: "Seville Parcel 3",
  instrument_numbers: [
    "20130183449",
    "20130183450",
    "20210057846",
    "20210057847",
    "20210075858",
  ],
};

const HOGUE: Parcel = {
  apn: "304-77-689",
  address: "2715 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85298",
  legal_description: "Lot 348, SHAMROCK ESTATES PHASE 2A",
  current_owner: "HOGUE JASON / MICHELE",
  subdivision: "Shamrock Estates Phase 2A",
  instrument_numbers: ["20150516729", "20150516730"],
};

const parcels: Parcel[] = [POPHAM, HOGUE];

describe("searchParcels — empty and no-match", () => {
  it("returns all parcels for an empty query", () => {
    const results = searchParcels("", parcels);
    expect(results.map((r) => r.parcel.apn)).toEqual([
      "304-78-386",
      "304-77-689",
    ]);
  });

  it("returns all parcels for a whitespace-only query", () => {
    const results = searchParcels("   ", parcels);
    expect(results).toHaveLength(2);
  });

  it("returns empty for a no-match query", () => {
    const results = searchParcels("nonexistent-term-xyz", parcels);
    expect(results).toEqual([]);
  });
});

describe("searchParcels — APN", () => {
  it("matches APN with dashes", () => {
    const results = searchParcels("304-78-386", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
    expect(results[0].matchType).toBe("apn");
  });

  it("matches APN without dashes", () => {
    const results = searchParcels("30478386", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
    expect(results[0].matchType).toBe("apn");
  });

  it("matches the backup parcel's APN", () => {
    const results = searchParcels("30477689", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-77-689");
  });
});

describe("searchParcels — address", () => {
  it("partial 'Palmer' matches both parcels", () => {
    const results = searchParcels("Palmer", parcels);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.matchType === "address")).toBe(true);
    // Stable sort by parcel order within tier.
    expect(results.map((r) => r.parcel.apn)).toEqual([
      "304-78-386",
      "304-77-689",
    ]);
  });

  it("specific address number narrows to one parcel", () => {
    const results = searchParcels("3674", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
  });

  it("is case-insensitive", () => {
    const results = searchParcels("palmer st", parcels);
    expect(results).toHaveLength(2);
  });
});

describe("searchParcels — owner", () => {
  it("matches recorder-format last name ('POPHAM')", () => {
    const results = searchParcels("POPHAM", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
    expect(results[0].matchType).toBe("owner");
  });

  it("matches natural-order lowercase ('christopher popham')", () => {
    const results = searchParcels("christopher popham", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
    expect(results[0].matchType).toBe("owner");
  });

  it("matches multi-token partial ('chris ash')", () => {
    const results = searchParcels("chris ash", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
    expect(results[0].matchType).toBe("owner");
  });

  it("matches the backup parcel owner", () => {
    const results = searchParcels("hogue", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-77-689");
  });

  it("does not cross-match owners", () => {
    const results = searchParcels("hogue christopher", parcels);
    // "hogue" must appear as substring of some POPHAM-owner token, and it
    // doesn't; same for HOGUE and "christopher". So zero matches.
    expect(results).toEqual([]);
  });
});

describe("searchParcels — instrument number", () => {
  it("exact 11-digit match routes to the owning parcel", () => {
    const results = searchParcels("20210057846", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
    expect(results[0].matchType).toBe("instrument");
    expect(results[0].instrumentNumber).toBe("20210057846");
  });

  it("matches a HOGUE instrument to the HOGUE parcel", () => {
    const results = searchParcels("20150516729", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-77-689");
    expect(results[0].instrumentNumber).toBe("20150516729");
  });

  it("returns empty for an 11-digit string that doesn't match any corpus instrument", () => {
    const results = searchParcels("99999999999", parcels);
    expect(results).toEqual([]);
  });

  it("non-11-digit numeric doesn't trigger instrument path", () => {
    // 10 digits — falls through, treated as address/owner/apn candidate.
    // None of those match, so we expect [].
    const results = searchParcels("2021005784", parcels);
    expect(results).toEqual([]);
  });
});

describe("searchParcels — subdivision", () => {
  it("matches 'Seville' to POPHAM", () => {
    const results = searchParcels("Seville", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-78-386");
    expect(results[0].matchType).toBe("subdivision");
  });

  it("matches 'Shamrock' to HOGUE", () => {
    const results = searchParcels("Shamrock", parcels);
    expect(results).toHaveLength(1);
    expect(results[0].parcel.apn).toBe("304-77-689");
  });
});

describe("searchParcels — priority ordering", () => {
  it("APN match beats owner match when both would apply", () => {
    // Construct a parcel whose owner string happens to contain its APN.
    const weird: Parcel = {
      ...POPHAM,
      apn: "111-11-111",
      current_owner: "TEST 111-11-111 OWNER",
    };
    const results = searchParcels("111-11-111", [weird]);
    expect(results).toHaveLength(1);
    expect(results[0].matchType).toBe("apn");
  });
});
