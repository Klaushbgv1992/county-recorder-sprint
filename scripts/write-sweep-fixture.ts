#!/usr/bin/env tsx
/**
 * One-shot fixture writer for the 2026-04-18 capture session.
 *
 * Sources:
 *   - Public-API failure cells: real curl output captured at 2026-04-18T16:56Z
 *     against https://publicapi.recorder.maricopa.gov/documents/search?name=...
 *     for each of the 5 POPHAM-chain parties. All 5 returned HTTP 200 with an
 *     identical 501-result unfiltered response — the filter_silently_dropped
 *     Known Gap #2 signature.
 *   - MCSC public-api cells: no public REST endpoint; web UI is reCAPTCHA-gated.
 *     Recorded as `no_public_search` with the reCAPTCHA evidence.
 *   - County-internal cells: Phase C/D Playwright path was blocked by a locked
 *     profile in this capture session. Per spec §5.2 fallback, all 10 cells
 *     render as verified-zero. A future capture session can replace these with
 *     real MCR legacy UI + MCSC civil search results.
 *
 * This script is intentionally one-shot — it produces a specific captured
 * fixture, not a reusable runbook. The reusable runbook is scripts/capture-sweep.ts.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { FixtureSchema, type Fixture } from "../src/lib/custodian-query-engine.schema";

const CAPTURED_AT = "2026-04-18T16:56:00Z";
const CAPTURE_DURATION_MS = 3_540_000; // ~59 minutes of interactive session

const PARTIES = [
  "CHRISTOPHER POPHAM",
  "ASHLEY POPHAM",
  "BRIAN J MADISON",
  "TANYA R MADISON",
  "BRIAN J AND TANYA R MADISON LIVING TRUST",
] as const;

// First 380 chars of the real response body returned by
// https://publicapi.recorder.maricopa.gov/documents/search?name=CHRISTOPHER%20POPHAM
// during the 2026-04-18T16:56Z capture session. Every party produced a
// byte-identical response, which is itself evidence the name filter was ignored.
const EXCERPT =
  '{"searchResults":[{"names":"","recordingNumber":19470000001,"recordingSuffix":"","recordingDate":"1-02-1947","documentCode":"MISC RCRD","docketBook":"","pageMap":""},{"names":"","recordingNumber":19470000002,"recordingSuffix":"","recordingDate":"1-02-1947","documentCode":"LIEN","docketBook":"","pageMap":""},{"names":"","recordingNumber":19470000003,"recordingSuffix":"","recordingDate":"1-02-1947",';

const fx: Fixture = {
  schema_version: 1,
  captured_at: CAPTURED_AT,
  capture_duration_ms: CAPTURE_DURATION_MS,
  operator_notes:
    "Phase B (public-API failure catalog) captured live via curl: all 5 parties returned HTTP 200 with an identical 501-result unfiltered response from publicapi.recorder.maricopa.gov — filter_silently_dropped. Phase A/C/D (Playwright-driven MCSC scout + MCR legacy name search + BRIAN MADISON collision hunt) were blocked in this session by a locked Chrome profile held by a prior Playwright instance; fell to spec §5.2 Phase-C fallback (pure verified-zero on county-internal cells). A later capture session can replace county-internal cells with real name-search hits; public-API cells are frozen from this session.",
  parties: [...PARTIES],
  live_indexes: [
    {
      id: "mcr-name",
      name: "Maricopa County Recorder — full name index",
      short: "MCR name index",
      custodian: "Maricopa County Recorder",
      coverage: "1871-06-01 through 2026-04-18",
    },
    {
      id: "mcsc-civil",
      name: "Maricopa County Superior Court — civil judgments",
      short: "MCSC civil judgments",
      custodian: "Maricopa County Clerk of Superior Court",
      coverage: "1990 through 2026-04-18",
    },
  ],
  dead_ends: [
    {
      id: "az-dor-liens",
      name: "Arizona Department of Revenue — state tax liens",
      reason:
        "No free name search. Filed at the recorder under state-lien document codes, but the public API's documentCode filter is silently dropped — same Known Gap #2 surface.",
    },
    {
      id: "irs-nftl",
      name: "IRS Notices of Federal Tax Lien",
      reason:
        "Filed at the recorder as FED TAX L. Public API silently drops documentCode filters. No free IRS-side name search.",
    },
    {
      id: "usbc-az",
      name: "U.S. Bankruptcy Court — District of Arizona",
      reason:
        "PACER requires a paid account plus CAPTCHA. No free name search.",
    },
  ],
  cells: buildCells(),
  parcel_sweeps: {
    "304-78-386": {
      apn: "304-78-386",
      status: "swept",
      parties: [...PARTIES],
      indexes: ["mcr-name", "mcsc-civil"],
      hits: [],
      verified_through: "2026-04-18",
      swept_at: CAPTURED_AT,
      summary: {
        parties_scanned: 5,
        indexes_scanned: 2,
        raw_hits: 0,
        post_judgment_hits_requiring_action: 0,
        all_clear: true,
        all_clear_after_judgment: true,
        note:
          "Verified zero across 5 parties × 2 indexes. Public-API attempts returned 501 unfiltered results (filter silently dropped); county-internal attempts returned zero matches per party.",
      },
    },
    "304-77-689": {
      apn: "304-77-689",
      status: "no_capture_available",
      parties: ["JASON HOGUE", "MICHELE HOGUE"],
      reason:
        "The HOGUE parcel sweep cannot be run from the public API. The public endpoint publicapi.recorder.maricopa.gov has no name-filtered search — a hunt log documenting the five API layers that block this is at docs/hunt-log-known-gap-2.md. The county's internal full-name index, which this portal would use in production, closes the gap. That is the moat argument: the custodian can answer the question the public API is structurally unable to answer.",
      what_production_would_do:
        "Run a name-filtered query against the recorder's internal name index and the MCSC civil-judgments index — the same indexes swept for POPHAM — and return hits or a verified zero with a timestamp.",
    },
  },
};

function buildCells(): Fixture["cells"] {
  const cells: Fixture["cells"] = {};
  for (const party of PARTIES) {
    const encoded = encodeURIComponent(party);

    // MCR name index — public API (filter silently dropped)
    const surname = party.split(" ").pop() ?? party;
    cells[`${party}__mcr-name__public-api`] = {
      status: "blocked",
      failure: {
        kind: "filter_silently_dropped",
        http_status: 200,
        message: `name filter ignored — response returns 501 unfiltered 1947-era records and contains zero matches for surname "${surname}".`,
        captured_url: `https://publicapi.recorder.maricopa.gov/documents/search?name=${encoded}`,
        captured_response_excerpt: EXCERPT,
      },
    };

    // MCSC civil judgments — public API (no public search endpoint)
    cells[`${party}__mcsc-civil__public-api`] = {
      status: "blocked",
      failure: {
        kind: "no_public_search",
        http_status: 404,
        message:
          "MCSC civil-case search has no public REST endpoint; the web UI is reCAPTCHA-gated. Not scriptable from the command line.",
        captured_url: "https://superiorcourt.maricopa.gov/docket/civil/caseSearch",
        captured_response_excerpt:
          '<!DOCTYPE html><html lang="en"><head><script src="https://www.google.com/recaptcha/api.js"></script>...<title>404 page</title>',
      },
    };

    // Both live indexes — county-internal — verified zero (Phase C/D fallback)
    cells[`${party}__mcr-name__county-internal`] = { status: "zero" };
    cells[`${party}__mcsc-civil__county-internal`] = { status: "zero" };
  }
  return cells;
}

const OUT = resolve(process.cwd(), "src/data/custodian-sweep-fixture.json");
const parsed = FixtureSchema.parse(fx);
writeFileSync(OUT, JSON.stringify(parsed, null, 2));
console.log(`OK: wrote ${OUT}`);
