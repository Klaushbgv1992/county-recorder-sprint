import type { Parcel, Instrument, EncumbranceLifecycle } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

const WINDOW_YEARS = 10;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * R2: Open DOT past expected release window.
 *
 * For each lifecycle with status === "open" whose root instrument is a
 * deed_of_trust and whose recording_date is >= 10 years before `now`,
 * emit a finding. Default now = new Date() (injectable for tests).
 */
export function detectR2(
  parcel: Parcel,
  instruments: Instrument[],
  lifecycles: EncumbranceLifecycle[],
  now: Date = new Date(),
): AnomalyFinding[] {
  const byNumber = new Map(instruments.map((i) => [i.instrument_number, i]));
  const findings: AnomalyFinding[] = [];

  for (const lc of lifecycles) {
    if (lc.status !== "open") continue;
    const root = byNumber.get(lc.root_instrument);
    if (!root) continue;
    if (root.document_type !== "deed_of_trust") continue;

    const recorded = new Date(root.recording_date);
    const years = (now.getTime() - recorded.getTime()) / MS_PER_YEAR;
    if (years < WINDOW_YEARS) continue;

    findings.push(
      makeFinding({
        ruleId: "R2",
        parcelApn: parcel.apn,
        evidenceInstruments: [root.instrument_number],
        confidence: 0.85,
        placeholders: {
          a: root.instrument_number,
          date: root.recording_date,
          lc: lc.id,
          years: years.toFixed(1),
        },
      }),
    );
  }

  return findings;
}
