import { describe, expect, it } from "vitest";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import {
  buildInstrumentToApnMap,
  findPartyByNormalizedName,
  normalizeForUrl,
  searchParties,
} from "./party-search";

const instruments = loadAllInstruments();
const parcels = loadAllParcels();
const instrumentToApn = buildInstrumentToApnMap(parcels);

describe("normalizeForUrl", () => {
  it("lowercases, replaces punctuation with dashes, collapses runs", () => {
    expect(normalizeForUrl("WELLS FARGO HOME MORTGAGE")).toBe(
      "wells-fargo-home-mortgage",
    );
    expect(normalizeForUrl("V I P MORTGAGE INC")).toBe("v-i-p-mortgage-inc");
    expect(normalizeForUrl("Foo / Bar, Baz.")).toBe("foo-bar-baz");
  });

  it("trims leading/trailing dashes", () => {
    expect(normalizeForUrl(",Foo,")).toBe("foo");
  });
});

describe("searchParties", () => {
  it("returns empty for empty query", () => {
    expect(searchParties("", instruments, instrumentToApn)).toEqual([]);
    expect(searchParties("   ", instruments, instrumentToApn)).toEqual([]);
  });

  it("matches Madison trust on POPHAM 20130183449 as grantor", () => {
    const hits = searchParties("Madison", instruments, instrumentToApn);
    expect(hits.length).toBeGreaterThan(0);
    const trust = hits.find((h) => h.displayName.includes("MADISON"));
    expect(trust).toBeDefined();
    const popham = trust!.instruments.find(
      (i) => i.apn === "304-78-386" && i.instrumentNumber === "20130183449",
    );
    expect(popham).toBeDefined();
    expect(popham!.role).toBe("grantor");
  });

  it("is case-insensitive", () => {
    const lower = searchParties("madison", instruments, instrumentToApn);
    const upper = searchParties("MADISON", instruments, instrumentToApn);
    expect(lower.map((h) => h.normalizedName).sort()).toEqual(
      upper.map((h) => h.normalizedName).sort(),
    );
  });

  it("supports multi-token prefix matching: 'wells far' finds Wells Fargo", () => {
    const hits = searchParties("wells far", instruments, instrumentToApn);
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.some((h) => h.displayName.toUpperCase().includes("WELLS FARGO")),
    ).toBe(true);
  });

  it("Wells Fargo includes 20210075858 as releasing_party on POPHAM", () => {
    const hits = searchParties("Wells Fargo", instruments, instrumentToApn);
    expect(hits.length).toBeGreaterThan(0);
    // The corpus has several Wells Fargo variants (Home Mortgage / Home Mortgage Inc /
    // Bank NA / Bank, N.A.) — "Wells Fargo Home Mortgage" is the releasing party
    // on the POPHAM 2021 reconveyance.
    const release = hits
      .filter((h) => h.displayName.toUpperCase().includes("WELLS FARGO"))
      .flatMap((h) => h.instruments)
      .find((i) => i.instrumentNumber === "20210075858");
    expect(release).toBeDefined();
    expect(release!.role).toBe("releasing_party");
    expect(release!.apn).toBe("304-78-386");
  });

  it("VIP Mortgage matches 20130183450 as lender", () => {
    const hits = searchParties("VIP", instruments, instrumentToApn);
    const vip = hits.find((h) => h.displayName.toUpperCase().includes("V I P"));
    expect(vip).toBeDefined();
    const dot = vip!.instruments.find(
      (i) => i.instrumentNumber === "20130183450",
    );
    expect(dot).toBeDefined();
    expect(dot!.role).toBe("lender");
  });

  it("MERS query finds MORTGAGE ELECTRONIC REGISTRATION SYSTEMS as nominee", () => {
    const hits = searchParties("MERS", instruments, instrumentToApn);
    const mers = hits.find((h) =>
      h.displayName.toUpperCase().includes("MORTGAGE ELECTRONIC"),
    );
    expect(mers).toBeDefined();
    const dot = mers!.instruments.find(
      (i) => i.instrumentNumber === "20130183450",
    );
    expect(dot).toBeDefined();
    expect(dot!.role).toBe("nominee");
    expect(dot!.nomineeFor?.partyName).toBe("V I P MORTGAGE INC");
  });

  it("rolls up byRole counts and parcel/instrument totals", () => {
    const hits = searchParties("Wells Fargo", instruments, instrumentToApn);
    const wf = hits.find((h) => h.displayName.toUpperCase().includes("WELLS FARGO"));
    expect(wf).toBeDefined();
    expect(wf!.totalInstruments).toBe(wf!.instruments.length);
    const apns = new Set(wf!.instruments.map((i) => i.apn));
    expect(wf!.parcels).toBe(apns.size);
    const expectedReleasing = wf!.instruments.filter(
      (i) => i.role === "releasing_party",
    ).length;
    if (expectedReleasing > 0) {
      expect(wf!.byRole.releasing_party).toBe(expectedReleasing);
    }
  });

  it("returns hits sorted by total instruments descending then displayName", () => {
    const hits = searchParties("LLC", instruments, instrumentToApn);
    for (let i = 1; i < hits.length; i++) {
      const prev = hits[i - 1];
      const cur = hits[i];
      expect(prev.totalInstruments).toBeGreaterThanOrEqual(cur.totalInstruments);
    }
  });
});

describe("findPartyByNormalizedName", () => {
  it("resolves a known party by its normalizedName", () => {
    const wells = searchParties("Wells Fargo Home Mortgage", instruments, instrumentToApn).find(
      (h) => h.displayName.toUpperCase() === "WELLS FARGO HOME MORTGAGE",
    );
    expect(wells).toBeDefined();
    const found = findPartyByNormalizedName(
      wells!.normalizedName,
      instruments,
      instrumentToApn,
    );
    expect(found).not.toBeNull();
    expect(found!.displayName.toUpperCase()).toBe("WELLS FARGO HOME MORTGAGE");
  });

  it("returns null for unknown party", () => {
    const found = findPartyByNormalizedName(
      "no-such-party-exists-here",
      instruments,
      instrumentToApn,
    );
    expect(found).toBeNull();
  });
});

describe("buildInstrumentToApnMap", () => {
  it("maps each parcel's instruments to its APN", () => {
    const m = buildInstrumentToApnMap(parcels);
    expect(m.get("20130183449")).toBe("304-78-386");
    expect(m.get("20210075858")).toBe("304-78-386");
  });
});
