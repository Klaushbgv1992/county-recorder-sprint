import type { Parcel } from "./types";
import { searchParcels } from "./logic/search";

/**
 * Resolve a bare 11-digit instrument number to the APN of the single
 * parcel that owns it. Returns null when the input isn't an 11-digit
 * number, or when no parcel in the corpus owns the instrument.
 */
export function resolveInstrumentToApn(
  instrumentNumber: string,
  parcels: Parcel[],
): string | null {
  const results = searchParcels(instrumentNumber, parcels);
  if (results.length !== 1) return null;
  const only = results[0];
  if (only.matchType !== "instrument") return null;
  return only.parcel.apn;
}

/**
 * Target URL for the /instrument/:n redirect, or null when the
 * instrument can't be attributed to a single parcel. Pure function so
 * the resolver component is a trivial wrapper around it + navigate().
 */
export function redirectTargetForInstrument(
  instrumentNumber: string,
  parcels: Parcel[],
): string | null {
  const apn = resolveInstrumentToApn(instrumentNumber, parcels);
  return apn ? `/parcel/${apn}/instrument/${instrumentNumber}` : null;
}
