import type { Parcel, Instrument } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

/**
 * R8: Chain stale.
 *
 * If (now - max(recording_date)) >= STALE_YEARS, emit finding with the
 * last date + computed years-since. Threshold chosen at 7 years as the
 * midpoint of the "5-10 years" range the description template cites —
 * the template says "typical residential parcels see refinance or sale
 * activity every 5-10 years," so firing at exactly 5 would surface
 * findings on any parcel refinanced on the longer end of the normal
 * window. 7 years keeps the rule informational-low-severity for genuinely
 * stale chains (HOGUE 2015, >10 years) without flagging parcels still
 * inside the typical residential activity cadence (POPHAM 2021, ~5.2
 * years as of 2026-04-14).
 */
const STALE_YEARS = 7;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function detectR8(
  parcel: Parcel,
  instruments: Instrument[],
  now: Date = new Date(),
): AnomalyFinding[] {
  if (instruments.length === 0) return [];

  let latest: Instrument | null = null;
  for (const inst of instruments) {
    if (latest === null) {
      latest = inst;
      continue;
    }
    if (inst.recording_date > latest.recording_date) {
      latest = inst;
    } else if (
      inst.recording_date === latest.recording_date &&
      inst.instrument_number > latest.instrument_number
    ) {
      // Same-day tie: prefer the higher instrument number (later sequence in day).
      latest = inst;
    }
  }
  if (!latest) return [];

  const latestDate = latest.recording_date;
  const years = (now.getTime() - new Date(latestDate).getTime()) / MS_PER_YEAR;
  if (years < STALE_YEARS) return [];

  return [
    makeFinding({
      ruleId: "R8",
      parcelApn: parcel.apn,
      evidenceInstruments: [latest.instrument_number],
      confidence: 0.9,
      placeholders: {
        apn: parcel.apn,
        last_date: latestDate,
        years: years.toFixed(1),
      },
    }),
  ];
}
