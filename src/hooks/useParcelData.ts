import { useMemo } from "react";
import { loadParcelData, type ParcelData } from "../data-loader";

export function useParcelData(): ParcelData {
  return useMemo(() => loadParcelData(), []);
}
