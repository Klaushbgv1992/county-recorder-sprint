import { describe, it, expect } from "vitest";
import { CURATED_PARTY_SUGGESTIONS } from "./curated-party-suggestions";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import {
  buildInstrumentToApnMap,
  findPartyByNormalizedName,
} from "../logic/party-search";

describe("curated party suggestions", () => {
  const instruments = loadAllInstruments();
  const parcels = loadAllParcels();
  const map = buildInstrumentToApnMap(parcels);

  it("ships at least 4 suggestions", () => {
    expect(CURATED_PARTY_SUGGESTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it.each(CURATED_PARTY_SUGGESTIONS)(
    "$display resolves to a non-empty PartyHit",
    (suggestion) => {
      const hit = findPartyByNormalizedName(
        suggestion.normalizedName,
        instruments,
        map,
      );
      expect(hit, `no PartyHit for ${suggestion.normalizedName}`).not.toBeNull();
      expect(hit!.totalInstruments).toBeGreaterThan(0);
    },
  );

  it("all displays and normalizedNames are unique", () => {
    const displays = new Set(CURATED_PARTY_SUGGESTIONS.map((s) => s.display));
    const slugs = new Set(CURATED_PARTY_SUGGESTIONS.map((s) => s.normalizedName));
    expect(displays.size).toBe(CURATED_PARTY_SUGGESTIONS.length);
    expect(slugs.size).toBe(CURATED_PARTY_SUGGESTIONS.length);
  });
});
