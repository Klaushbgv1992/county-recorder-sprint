import type { Instrument } from "../types";

export type AnomalyPatternInput = {
  references: string[];
  instruments: Instrument[];
};

type PatternFn = (input: AnomalyPatternInput) => string;

export function findInst(
  ins: Instrument[],
  n: string
): Instrument | undefined {
  return ins.find((i) => i.instrument_number === n);
}

export const anomalyPatterns: Record<string, PatternFn> = {
  "mers-beneficiary-gap": ({ references }) => {
    const [release, dot] = references;
    return `The release [${release}] was executed by a servicer that is not the original beneficiary on the ${dot ? `deed of trust [${dot}]` : "underlying deed of trust"}. The DOT names MERS as nominee for the lender of record; the note travelled through MERS to the releasing servicer without a recorded assignment.`;
  },
  "ocr-trust-recovery": ({ references }) => {
    const [dot] = references;
    return `The public API returned the grantor name on [${dot}] truncated at 53 characters. OCR on the recorded image recovered the full trust name plus the execution date. Provenance on the recovered value is tagged OCR so a curator can spot-check before publishing.`;
  },
  "junior-lien-priority": ({ references }) => {
    const [junior, senior] = references;
    return `Two open lifecycles overlap on this parcel: a senior [${senior}] and a junior [${junior}]. Priority runs by recording date — the senior was recorded first. Closing impact is on both: either both are released, or both are addressed by payoff or subordination. A chain that shows only the most recent DOT misses the junior.`;
  },
  "recorded-assignment-chain": ({ references }) => {
    const [aom, dot] = references;
    return `The original DOT [${dot}] was assigned of record to a successor beneficiary via [${aom}]. Unlike a MERS-only transfer, this assignment is in the public record — the chain is clean on its face. The servicer-history path is visible without opening the note.`;
  },
  "llc-to-member-retitle": ({ references }) => {
    const [qcl, purchase] = references;
    return `The entity that took title at acquisition [${purchase}] later re-titled to an individual member via quit-claim [${qcl}]. Some underwriters treat LLC-to-member re-titlings inside 24 months of purchase as a cloud until the member's interest seasons. Flag for underwriter consultation, not a defect per se.`;
  },
};
