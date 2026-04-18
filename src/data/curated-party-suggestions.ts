// Suggestion chips for the landing-page party-search card.
//
// Every chip MUST resolve to a non-empty PartyHit in the curated corpus —
// see `curated-party-suggestions.test.ts`, which fails the build if a
// `normalizedName` here does not exist in `loadAllInstruments()`. A chip
// that lands on an empty party page would directly contradict the moat
// claim made by the surrounding card copy.
//
// `display` is the short label shown on the chip (the user types this).
// `normalizedName` is the URL slug for `/party/:normalizedName` — keep
// it in sync with `normalizeForUrl(displayNameOfPartyHit)`.

export interface PartySuggestion {
  display: string;
  normalizedName: string;
  blurb: string;
}

export const CURATED_PARTY_SUGGESTIONS: PartySuggestion[] = [
  {
    display: "MERS",
    normalizedName: "mortgage-electronic-registration-systems-inc",
    blurb: "11 instruments · 8 parcels",
  },
  {
    display: "Wells Fargo",
    normalizedName: "wells-fargo-bank-n-a",
    blurb: "Servicer + releasing party",
  },
  {
    display: "VIP Mortgage",
    normalizedName: "v-i-p-mortgage-inc",
    blurb: "Originating lender",
  },
  {
    display: "Madison Living Trust",
    normalizedName: "the-brian-j-and-tanya-r-madison-living-trust-dated-february-23-2006",
    blurb: "Grantor on POPHAM purchase",
  },
];
