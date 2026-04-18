// Examiner walkthrough — six ordered steps that follow one curated parcel
// (POPHAM, 304-78-386) from search entry to commitment export, with one
// detour (step 2) onto the cross-parcel party index. The hero parcel is
// chosen because it is the only corpus parcel where the candidate-release
// matcher surfaces a high-scoring, acceptable release against an open DOT
// (lc-002). Changing the hero parcel without an equivalent candidate-
// release fixture will break step 5.
//
// Step 2 deep-links to the MERS party page because MERS shows the largest
// cross-parcel footprint (11 instruments / 8 parcels in the curated
// corpus). The narrative still mentions VIP Mortgage — MERS is recorded
// as nominee for VIP, so the same party page surfaces VIP-originated
// loans alongside loans from other lenders MERS represents. See
// `data/curated-party-suggestions.ts` for the full chip set.

export const WALKTHROUGH_HERO_APN = "304-78-386";
export const WALKTHROUGH_HERO_LIFECYCLE_ID = "lc-002";
export const WALKTHROUGH_PARTY_NORMALIZED_NAME =
  "mortgage-electronic-registration-systems-inc";
export const TOUR_PARAM_VALUE = "examiner";
export const TOTAL_STEPS = 6;

export type WalkthroughStepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface WalkthroughStep {
  step: WalkthroughStepNumber;
  heading: string;
  why: string;
  ctaLabel: string;
  // Absolute URL this step lives on. Used when advancing INTO this step.
  path: string;
}

export const STEPS: WalkthroughStep[] = [
  {
    step: 1,
    heading: "Find the parcel",
    why: "Title work starts at the record. Search by APN, address, owner, or 11-digit instrument.",
    ctaLabel: "See cross-parcel party search →",
    path: `/?tour=${TOUR_PARAM_VALUE}&step=1`,
  },
  {
    step: 2,
    heading: "Find every loan a lender ever originated",
    why: "Type 'VIP Mortgage' or 'MERS' — the cross-parcel party index returns every instrument either party ever signed, with grantor / lender / releasing-party roles attached. The Maricopa public API has no name-filtered search endpoint (Known Gap #2). Only the custodian can answer this.",
    ctaLabel: `Open the parcel chain (${WALKTHROUGH_HERO_APN}) →`,
    path: `/party/${WALKTHROUGH_PARTY_NORMALIZED_NAME}?tour=${TOUR_PARAM_VALUE}&step=2`,
  },
  {
    step: 3,
    heading: "Read the chain of title",
    why: "Reconstruct ownership — who conveyed to whom, when. Every downstream claim hangs off this spine.",
    ctaLabel: "Check for open encumbrances →",
    path: `/parcel/${WALKTHROUGH_HERO_APN}?tour=${TOUR_PARAM_VALUE}&step=3`,
  },
  {
    step: 4,
    heading: "Spot the open encumbrance",
    why: "A 2021 Deed of Trust has no release on file. This is what blocks a clean commitment until it is resolved.",
    ctaLabel: "Review candidate releases →",
    path: `/parcel/${WALKTHROUGH_HERO_APN}/encumbrances?tour=${TOUR_PARAM_VALUE}&step=4`,
  },
  {
    step: 5,
    heading: "Review the candidate release",
    why: "Cross-reference on borrower name, date proximity, and legal description surfaces a likely release. The examiner reviews the evidence and accepts.",
    ctaLabel: "Add transaction scope →",
    path: `/parcel/${WALKTHROUGH_HERO_APN}/encumbrances?tour=${TOUR_PARAM_VALUE}&step=5`,
  },
  {
    step: 6,
    heading: "Fill the transaction scope",
    why: "A raw abstract becomes a real title commitment once buyer, loan, and effective date are bound in. Schedule B-I lists what must happen at closing; Schedule B-II lists what the buyer takes subject to.",
    ctaLabel: "Finish walkthrough",
    path: `/parcel/${WALKTHROUGH_HERO_APN}/commitment/new?tour=${TOUR_PARAM_VALUE}&step=6`,
  },
];

export function stepByNumber(n: number): WalkthroughStep | null {
  return STEPS.find((s) => s.step === n) ?? null;
}

export function nextStep(current: WalkthroughStep): WalkthroughStep | null {
  return stepByNumber(current.step + 1) ?? null;
}
