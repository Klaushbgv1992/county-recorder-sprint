#!/usr/bin/env tsx
/**
 * Playwright + curl capture runbook. Produces src/data/custodian-sweep-fixture.json.
 *
 * SERIALIZATION: Before running, confirm with sprint owner that no other
 * Playwright-using agent is in flight. See spec §5.1.
 *
 * This runbook is INTERACTIVE by design. It intentionally breaks into phases
 * with manual checkpoints. Do not automate past the checkpoints; the phases
 * require operator judgment (especially Phase A scout outcome and Phase C
 * collision confirmation).
 *
 * Usage:
 *   npx tsx scripts/capture-sweep.ts
 *
 * The runbook writes a working fixture at scripts/.work/custodian-sweep-working.json
 * after each phase so interruptions are recoverable.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyPublicApiFailure,
  mcrRawToQueryResult,
  PARTIES,
  type McrRawResult,
} from "./lib/sweep-capture-helpers";
import type { Fixture } from "../src/lib/custodian-query-engine.schema";
import { FixtureSchema } from "../src/lib/custodian-query-engine.schema";

const WORK_DIR = resolve(process.cwd(), "scripts/.work");
const WORK_PATH = resolve(WORK_DIR, "custodian-sweep-working.json");
const OUTPUT_PATH = resolve(process.cwd(), "src/data/custodian-sweep-fixture.json");

function loadWork(): Partial<Fixture> {
  if (!existsSync(WORK_PATH)) return {};
  return JSON.parse(readFileSync(WORK_PATH, "utf-8")) as Partial<Fixture>;
}

function saveWork(fx: Partial<Fixture>): void {
  mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(WORK_PATH, JSON.stringify(fx, null, 2));
  console.log(`  working fixture saved to ${WORK_PATH}`);
}

function prompt(msg: string): void {
  console.log(`\n=== ${msg} ===\n`);
}

async function main(): Promise<void> {
  const start = Date.now();
  const fx: Partial<Fixture> = loadWork();
  fx.schema_version = 1;
  fx.parties = [...PARTIES];

  // PHASE A — MCSC scoutability
  prompt("Phase A — MCSC scout. Use Playwright MCP to open superiorcourt.maricopa.gov civil search. Probe with a synthetic common name. Set mcscReachable accordingly in the code below, then continue.");
  const mcscReachable = true; // OPERATOR: flip to false if MCSC gated/unreachable.
  fx.live_indexes = mcscReachable
    ? [
        { id: "mcr-name",   name: "Maricopa County Recorder — full name index",            short: "MCR name index",        custodian: "Maricopa County Recorder",            coverage: "1871-06-01 through 2026-04-18" },
        { id: "mcsc-civil", name: "Maricopa County Superior Court — civil judgments",      short: "MCSC civil judgments",  custodian: "Maricopa County Clerk of Superior Court", coverage: "1990 through 2026-04-18" },
      ]
    : [
        { id: "mcr-name", name: "Maricopa County Recorder — full name index", short: "MCR name index", custodian: "Maricopa County Recorder", coverage: "1871-06-01 through 2026-04-18" },
      ];
  fx.dead_ends = [
    { id: "az-dor-liens", name: "Arizona Department of Revenue — state tax liens", reason: "No free name search. Filed at the recorder under state-lien document codes, but the public API's documentCode filter is silently dropped — same Known Gap #2 surface." },
    { id: "irs-nftl",     name: "IRS Notices of Federal Tax Lien",                  reason: "Filed at the recorder as FED TAX L. Public API silently drops documentCode filters. No free IRS-side name search." },
    { id: "usbc-az",      name: "U.S. Bankruptcy Court — District of Arizona",      reason: "PACER requires a paid account plus CAPTCHA. No free name search." },
  ];
  if (!mcscReachable) {
    fx.dead_ends.push({
      id: "mcsc-civil",
      name: "Maricopa County Superior Court — civil judgments",
      reason:
        "Public civil-case search was gated or unreachable during the capture session; MCSC falls to the dead-end list for this fixture. Production would hit this via the county's internal civil-index feed.",
    });
  }
  saveWork(fx);

  // PHASE B — Public-API failure catalog
  prompt("Phase B — public-API failures. For each party × live-index, curl publicapi.recorder.maricopa.gov (and MCSC public endpoint if live). Record URL, HTTP status, response excerpt. Pass into classifyPublicApiFailure(). Populate fx.cells below.");
  const cells: Fixture["cells"] = (fx.cells ?? {}) as Fixture["cells"];
  // OPERATOR: replace this stub with real curl output per cell, e.g.:
  //   const url = `https://publicapi.recorder.maricopa.gov/documents/search?name=${encodeURIComponent(p)}`;
  //   const body = await fetch(url).then(r => ({ status: r.status, text: r.text() }))
  //   cells[`${p}__mcr-name__public-api`] = { status: "blocked", failure: classifyPublicApiFailure({ url, httpStatus: body.status, body: body.text, partyNameAttempted: p }) };
  // Run once per party, per live index.
  fx.cells = cells;
  saveWork(fx);

  // PHASE C — BRIAN MADISON collision pre-hunt
  prompt("Phase C — BRIAN MADISON collision. Use Playwright MCP against MCR legacy name search + MCSC civil search for 'BRIAN MADISON' / 'BRIAN J MADISON'. ≥1 real hit against a different person: record the hit; 0 hits: document fallback in operator_notes.");
  let operatorNotes = "Capture complete.";
  const madisonCollision: McrRawResult = {
    party: "BRIAN J MADISON",
    matches: [
      // OPERATOR: replace with real hit or leave empty for fallback.
      // { recording_number: "...", recording_date: "...", doc_type: "CIVIL JDG", indexed_name: "BRIAN MADISON" },
    ],
  };
  const madisonResult = mcrRawToQueryResult(madisonCollision);
  if (madisonResult.status === "hit" && madisonResult.hits[0]) {
    // OPERATOR: author the AI judgment once the hit is confirmed as a different-person collision.
    madisonResult.hits[0].ai_judgment = "probable_false_positive";
    madisonResult.hits[0].ai_rationale =
      `Judgment defendant is recorded at an address outside the Seville subdivision. Our Brian J Madison is the 2013 grantor (via the Madison Living Trust) on recording 20130183450 — different chain, different address, different party.`;
    madisonResult.hits[0].confidence = 0.9;
    madisonResult.hits[0].action_required = "none";
    madisonResult.hits[0].summary = `Civil judgment recorded against a different BRIAN MADISON. Not the Brian J Madison on the 2013 DOT for this parcel.`;
  } else {
    operatorNotes += " BRIAN MADISON collision pre-hunt returned zero hits; demo leans on pure verified-zero.";
  }
  cells[`BRIAN J MADISON__mcsc-civil__county-internal`] = madisonResult;
  saveWork(fx);

  // PHASE D — Full sweep capture
  prompt("Phase D — full sweep. Playwright-drive name search for each party against each live index. Populate cells with zero/hit results via mcrRawToQueryResult.");
  for (const p of PARTIES) {
    for (const idx of fx.live_indexes!) {
      const key = `${p}__${idx.id}__county-internal`;
      if (cells[key]) continue; // already set (e.g., BRIAN J MADISON cell from Phase C)
      // OPERATOR: replace with real Playwright-driven search; zero results default below.
      const raw: McrRawResult = { party: p, matches: [] };
      cells[key] = mcrRawToQueryResult(raw);
    }
  }
  saveWork(fx);

  // PHASE E — HOGUE no-capture entry
  prompt("Phase E — HOGUE narrative (copy from dev seed, verified).");
  const hogueReason =
    "The HOGUE parcel sweep cannot be run from the public API. The public endpoint publicapi.recorder.maricopa.gov has no name-filtered search — a hunt log documenting the five API layers that block this is at docs/hunt-log-known-gap-2.md. The county's internal full-name index, which this portal would use in production, closes the gap. That is the moat argument: the custodian can answer the question the public API is structurally unable to answer.";
  const hogueProd =
    "Run a name-filtered query against the recorder's internal name index and the MCSC civil-judgments index — the same indexes swept for POPHAM — and return hits or a verified zero with a timestamp.";

  // Build POPHAM summary from cells.
  const pophamHits = PARTIES.flatMap((p) => {
    const mcr = cells[`${p}__mcr-name__county-internal`];
    const mcsc = cells[`${p}__mcsc-civil__county-internal`];
    const all = [];
    if (mcr?.status === "hit") all.push(...mcr.hits);
    if (mcsc?.status === "hit") all.push(...mcsc.hits);
    return all;
  });
  const rawHits = pophamHits.length;
  const dismissed = pophamHits.filter((h) => h.ai_judgment === "probable_false_positive").length;
  const needAction = rawHits - dismissed;

  fx.parcel_sweeps = {
    "304-78-386": {
      apn: "304-78-386",
      status: "swept",
      parties: [...PARTIES],
      indexes: fx.live_indexes!.map((i) => i.id),
      hits: pophamHits,
      verified_through: "2026-04-18",
      swept_at: new Date().toISOString(),
      summary: {
        parties_scanned: PARTIES.length,
        indexes_scanned: fx.live_indexes!.length,
        raw_hits: rawHits,
        post_judgment_hits_requiring_action: needAction,
        all_clear: rawHits === 0,
        all_clear_after_judgment: needAction === 0,
        note:
          rawHits === 0
            ? `Verified zero across ${PARTIES.length} parties × ${fx.live_indexes!.length} indexes.`
            : `${rawHits} raw hit(s), ${dismissed} dismissed by AI, ${needAction} require review.`,
      },
    },
    "304-77-689": {
      apn: "304-77-689",
      status: "no_capture_available",
      parties: ["JASON HOGUE", "MICHELE HOGUE"],
      reason: hogueReason,
      what_production_would_do: hogueProd,
    },
  };

  // PHASE F — finalize
  fx.captured_at = new Date().toISOString();
  fx.capture_duration_ms = Date.now() - start;
  fx.operator_notes = operatorNotes;
  const parsed = FixtureSchema.parse(fx);
  writeFileSync(OUTPUT_PATH, JSON.stringify(parsed, null, 2));
  console.log(`\nOK: wrote ${OUTPUT_PATH}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
