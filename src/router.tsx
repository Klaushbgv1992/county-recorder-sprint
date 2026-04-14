import type { Parcel } from "./types";
import { searchParcels } from "./logic/search";

/**
 * Resolve a bare 11-digit instrument number to the APN of the single
 * parcel that owns it. Returns null when the input isn't an 11-digit
 * number, or when no parcel in the corpus owns the instrument. Used by
 * the /instrument/:n client-side redirect resolver.
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
