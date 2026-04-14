import { useMemo } from "react";
import {
  loadParcelData,
  loadParcelDataByApn,
  type ParcelData,
} from "../data-loader";

/**
 * Load a ParcelData bundle. When `apn` is provided, scopes the corpus to
 * that parcel's curated instruments/links/lifecycles. When omitted, falls
 * back to the single-parcel default (POPHAM) for backward compatibility.
 */
export function useParcelData(apn?: string | null): ParcelData {
  return useMemo(
    () => (apn ? loadParcelDataByApn(apn) : loadParcelData()),
    [apn],
  );
}
