import type { Parcel, Instrument } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

/**
 * R1: Same-day transaction cluster.
 *
 * Groups instruments by recording_date. For each date with >=2 instruments
 * that share at least one party name (case-insensitive), emits one finding
 * per cluster.
 */
export function detectR1(
  parcel: Parcel,
  instruments: Instrument[],
): AnomalyFinding[] {
  const byDate = new Map<string, Instrument[]>();
  for (const inst of instruments) {
    const arr = byDate.get(inst.recording_date) ?? [];
    arr.push(inst);
    byDate.set(inst.recording_date, arr);
  }

  const findings: AnomalyFinding[] = [];
  for (const [date, group] of byDate) {
    if (group.length < 2) continue;

    // Check shared party name across any pair in the group.
    const allNames = group.map(
      (inst) => new Set(inst.parties.map((p) => p.name.toUpperCase())),
    );
    const sharedNames = new Set<string>();
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        for (const name of allNames[i]) {
          if (allNames[j].has(name)) {
            sharedNames.add(name);
          }
        }
      }
    }
    if (sharedNames.size === 0) continue;

    const nums = group.map((g) => g.instrument_number).sort();
    findings.push(
      makeFinding({
        ruleId: "R1",
        parcelApn: parcel.apn,
        evidenceInstruments: nums,
        confidence: 0.95,
        placeholders: {
          a: nums[0],
          b: nums.slice(1).join(", "),
          date,
        },
      }),
    );
  }

  return findings;
}
