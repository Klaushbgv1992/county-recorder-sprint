import type { StoryMode } from "./types";
import parcelsRaw from "../data/parcels.json";
import cachedNeighborIndex from "../data/api-cache/recorder/index.json";

const CURATED_APNS: ReadonlySet<string> = new Set(
  (parcelsRaw as Array<{ apn: string }>).map((p) => p.apn),
);
const CACHED_NEIGHBOR_APNS: ReadonlySet<string> = new Set(
  cachedNeighborIndex as string[],
);

export function storyPageExists(apn: string): boolean {
  return CURATED_APNS.has(apn) || CACHED_NEIGHBOR_APNS.has(apn);
}

export function getStoryMode(apn: string): StoryMode | null {
  if (CURATED_APNS.has(apn)) return "curated";
  if (CACHED_NEIGHBOR_APNS.has(apn)) return "partial";
  return null;
}
