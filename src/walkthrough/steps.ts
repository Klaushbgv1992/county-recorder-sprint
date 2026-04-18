// Examiner walkthrough — five ordered steps that follow one curated parcel
// (POPHAM, 304-78-386) from search entry to commitment export. The hero
// parcel is chosen because it is the only corpus parcel where the
// candidate-release matcher surfaces a high-scoring, acceptable release
// against an open DOT (lc-002). Changing the hero parcel without an
// equivalent candidate-release fixture will break step 4.

export const WALKTHROUGH_HERO_APN = "304-78-386";
export const WALKTHROUGH_HERO_LIFECYCLE_ID = "lc-002";
export const TOUR_PARAM_VALUE = "examiner";
export const TOTAL_STEPS = 5;

export type WalkthroughStepNumber = 1 | 2 | 3 | 4 | 5;

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
    ctaLabel: `Skip to ${WALKTHROUGH_HERO_APN} (3674 E Palmer St) →`,
    path: `/?tour=${TOUR_PARAM_VALUE}&step=1`,
  },
  {
    step: 2,
    heading: "Read the chain of title",
    why: "Reconstruct ownership — who conveyed to whom, when. Every downstream claim hangs off this spine.",
    ctaLabel: "Check for open encumbrances →",
    path: `/parcel/${WALKTHROUGH_HERO_APN}?tour=${TOUR_PARAM_VALUE}&step=2`,
  },
  {
    step: 3,
    heading: "Spot the open encumbrance",
    why: "A 2021 Deed of Trust has no release on file. This is what blocks a clean commitment until it is resolved.",
    ctaLabel: "Review candidate releases →",
    path: `/parcel/${WALKTHROUGH_HERO_APN}/encumbrances?tour=${TOUR_PARAM_VALUE}&step=3`,
  },
  {
    step: 4,
    heading: "Review the candidate release",
    why: "Cross-reference on borrower name, date proximity, and legal description surfaces a likely release. The examiner reviews the evidence and accepts.",
    ctaLabel: "Export the commitment →",
    path: `/parcel/${WALKTHROUGH_HERO_APN}/encumbrances?tour=${TOUR_PARAM_VALUE}&step=4`,
  },
  {
    step: 5,
    heading: "Export the commitment",
    why: "The abstractor's deliverable — Schedule A + Schedule B-II with county-authoritative citations. Click Export Commitment above.",
    ctaLabel: "Finish walkthrough",
    path: `/parcel/${WALKTHROUGH_HERO_APN}/encumbrances?tour=${TOUR_PARAM_VALUE}&step=5`,
  },
];

export function stepByNumber(n: number): WalkthroughStep | null {
  return STEPS.find((s) => s.step === n) ?? null;
}

export function nextStep(current: WalkthroughStep): WalkthroughStep | null {
  return stepByNumber(current.step + 1) ?? null;
}
