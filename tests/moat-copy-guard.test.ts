import { describe, it, expect } from "vitest";
import lifecyclesRaw from "../src/data/lifecycles.json";
import { buildEmptyStateRationale } from "../src/logic/release-candidate-matcher";
import type { Parcel } from "../src/types";

// Regression guard for the moat talking points. These exact strings are
// quoted in docs/demo-script.md and docs/known-gaps.md and named in
// CLAUDE.md Decision #37 as the HOGUE empty-state rationale that
// surfaces the name-search API limitation. If they drift silently, the
// demo script no longer matches the running app — these tests fail loud.

const EXPECTED_LC003_RATIONALE =
  "No release, assignment, or reconveyance located in the searched " +
  "corpus for HOGUE 2015 DOT. Maricopa public API does not support " +
  "name-filtered document search, so a release outside the curated " +
  "HOGUE chain cannot be ruled out via the API alone.";

const HOGUE_PARCEL: Parcel = {
  apn: "304-77-689",
  address: "2715 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85298",
  legal_description: "Lot 348 Shamrock Estates Phase 2A",
  current_owner: "HOGUE JASON / MICHELE",
  subdivision: "Shamrock Estates Phase 2A",
};

const EXPECTED_HOGUE_EMPTY_RATIONALE =
  "Cross-parcel scan: scanned Shamrock Estates Phase 2A parcel corpus, " +
  "0 reconveyance candidates above threshold. " +
  "The public API cannot search for releases filed against " +
  "HOGUE JASON / MICHELE outside this parcel — a county-internal " +
  "full-name scan across the entire recorded index closes this gap.";

describe("HOGUE lc-003 moat-rationale regression guard", () => {
  it("lc-003.status_rationale in lifecycles.json matches the demo-script copy verbatim", () => {
    const lc003 = lifecyclesRaw.lifecycles.find((lc) => lc.id === "lc-003");
    expect(lc003).toBeDefined();
    expect(lc003!.status_rationale).toBe(EXPECTED_LC003_RATIONALE);
  });

  it("buildEmptyStateRationale(HOGUE) returns the demo-script copy verbatim", () => {
    expect(buildEmptyStateRationale(HOGUE_PARCEL)).toBe(
      EXPECTED_HOGUE_EMPTY_RATIONALE,
    );
  });
});
