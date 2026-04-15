import type { Parcel } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

/**
 * R7: Same-name contamination suppressed.
 *
 * Decisions #25 and #26 document that the public recorder name-search API
 * returns instruments from all properties owned by a person, which were
 * suppressed during curation. There is no machine-readable
 * suppressed_same_name_instruments[] field on the corpus, so for the demo
 * we fire one informational finding per parcel whose current_owner
 * contains "/" (multi-person co-ownership — the cohort most exposed to
 * same-name contamination). The count is not fabricated as a number —
 * it is the string "suppressed during curation (see Decision #25)".
 */
export function detectR7(parcel: Parcel): AnomalyFinding[] {
  if (!parcel.current_owner.includes("/")) return [];

  return [
    makeFinding({
      ruleId: "R7",
      parcelApn: parcel.apn,
      evidenceInstruments: [],
      confidence: 0.7,
      placeholders: {
        count: "suppressed during curation (see Decision #25)",
      },
    }),
  ];
}
