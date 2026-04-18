import type { Instrument, OwnerPeriod } from "../types";
import { getGrantees } from "./party-roles";

// Conveyance instruments that establish a new ownership period in the chain
// of title. `trustees_deed` covers both A.R.S. § 33-404 trust-administration
// transfers (e.g. successor-trustee distribution after a trustor's death)
// AND A.R.S. § 33-811 trustee's deeds upon foreclosure sale — both vest
// title in the grantee. The doc-code ambiguity is preserved in document_type_raw.
const DEED_TYPES = new Set([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
  "trustees_deed",
]);

export function buildOwnerPeriods(instruments: Instrument[]): OwnerPeriod[] {
  const deeds = instruments
    .filter((i) => DEED_TYPES.has(i.document_type))
    .sort(
      (a, b) =>
        new Date(a.recording_date).getTime() -
        new Date(b.recording_date).getTime(),
    );

  if (deeds.length === 0) return [];

  const periods: OwnerPeriod[] = [];

  for (let i = 0; i < deeds.length; i++) {
    const deed = deeds[i];
    const nextDeed = deeds[i + 1] ?? null;
    const grantees = getGrantees(deed);
    const owner =
      grantees.length > 1 ? grantees.join(" & ") : grantees[0];

    periods.push({
      owner,
      start_instrument: deed.instrument_number,
      start_date: deed.recording_date,
      end_instrument: nextDeed?.instrument_number ?? null,
      end_date: nextDeed?.recording_date ?? null,
      is_current: nextDeed === null,
    });
  }

  return periods;
}
