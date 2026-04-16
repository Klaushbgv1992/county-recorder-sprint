export type DrawerVariant =
  | "curated"
  | "recorder_cached"
  | "assessor_only"
  | "not_in_seeded_area";

export function resolveDrawerVariant(
  apn: string,
  opts: {
    curatedApns: Set<string>;
    cachedApns: Set<string>;
    seededApns: Set<string>;
  },
): DrawerVariant {
  if (opts.curatedApns.has(apn)) return "curated";
  if (opts.cachedApns.has(apn)) return "recorder_cached";
  if (opts.seededApns.has(apn)) return "assessor_only";
  return "not_in_seeded_area";
}
