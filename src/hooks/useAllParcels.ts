import { useMemo } from "react";
import { loadAllParcels } from "../data-loader";
import type { Parcel } from "../types";

export function useAllParcels(): Parcel[] {
  return useMemo(() => loadAllParcels(), []);
}
