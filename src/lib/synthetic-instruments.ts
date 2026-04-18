// Known APNs whose curated corpus includes at least one `demo_synthetic`
// instrument. Used to drive inline disclosure affordances (e.g. the banner
// on AiSummaryStatic) without having to parse the baked summary text at
// render time — cheaper, easier to reason about, and won't go stale
// silently as long as the set is kept in sync with the curated corpus.
//
// Current synthetic instruments (see `src/data/instruments/*.json` where
// `raw_api_response.synthesized === true`):
//   20090100001 — LOWRY 304-78-383       (ASSIGN DT — Countrywide → BoA)
//   20190100001 — WARNER 304-78-374      (DEED TRST — junior HELOC)
//   20220100001 — PHOENIX 304-78-367     (Q/CL DEED — LLC → member trust)
//   20230100000 — PHOENIX 304-78-367     (ASSOC LIEN — HOA lien)
//   20080200001-20240200001 — CHEN 304-78-362 (probate scenario, 5 insts)
//   20160200001-20220200001 — MARTINEZ 304-77-555 (divorce Q/CL, 5 insts)
//   20170200001-20220200004 — DELGADO 304-78-411 (LLC conveyance, 5 insts)
//   20050200001-20230200003 — BRYANT  304-78-401 (tax-sale REO, 5 insts)
//
// Source of truth for per-instrument disclosure remains the instrument
// JSON (`raw_api_response.synthesized`) — ProofDrawer reads that directly
// and renders the amber "synthetic · demo-only" pill. This set is a
// parcel-level coarser tag for surfaces that show baked chain prose
// without enumerating instruments.
export const APNS_WITH_SYNTHETIC_INSTRUMENTS: ReadonlySet<string> = new Set([
  "304-78-374", // WARNER
  "304-78-383", // LOWRY
  "304-78-367", // PHOENIX
  "304-78-362", // CHEN (probate)
  "304-77-555", // MARTINEZ (divorce Q/CL)
  "304-78-411", // DELGADO (LLC conveyance)
  "304-78-401", // BRYANT (tax-sale REO)
]);

export function parcelHasSyntheticInstrument(apn: string): boolean {
  return APNS_WITH_SYNTHETIC_INSTRUMENTS.has(apn);
}
