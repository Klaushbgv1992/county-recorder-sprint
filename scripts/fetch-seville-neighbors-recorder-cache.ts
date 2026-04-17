// scripts/fetch-seville-neighbors-recorder-cache.ts
// Fetches /documents/{n} responses from Maricopa recorder API for each
// instrument in the NEIGHBOR_INSTRUMENTS constant, grouped by APN.
// Run via: npx tsx scripts/fetch-seville-neighbors-recorder-cache.ts

import fs from "node:fs";
import path from "node:path";
import { NEIGHBOR_INSTRUMENTS } from "./lib/neighbor-instruments";
import { sleep, callBudget, normalizeDisplayFields } from "./lib/seville-fetch";

const BASE = "https://publicapi.recorder.maricopa.gov";
const CAPTURED = new Date().toISOString().slice(0, 10);
const OUT_DIR = "src/data/api-cache/recorder";
const CALL_CAP = 30;
const SPACING_MS = 500;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const budget = callBudget(CALL_CAP);
  let calls = 0;
  const t0 = Date.now();

  const apnList: string[] = [];

  for (const [apn, recordingNumbers] of Object.entries(NEIGHBOR_INSTRUMENTS)) {
    const docs: Array<Record<string, unknown>> = [];
    const sourceUrls: string[] = [];
    for (const n of recordingNumbers) {
      const url = `${BASE}/documents/${n}`;
      budget.consume();
      calls += 1;
      const tc = Date.now();
      const r = await fetch(url);
      console.log(`[${calls}] ${r.status} ${url} (${Date.now() - tc}ms)`);
      if (r.status === 429 || r.status >= 500) {
        console.error(`HALT: ${r.status} on ${url} — do not retry blindly.`);
        process.exit(1);
      }
      if (!r.ok) throw new Error(`fetch ${r.status} ${url}`);
      const doc = (await r.json()) as Record<string, unknown>;
      docs.push(doc);
      sourceUrls.push(url);
      await sleep(SPACING_MS);
    }

    const display = normalizeDisplayFields(
      docs.map((d) => ({
        recordingNumber: d.recordingNumber as string,
        recordingDate: d.recordingDate as string,
        documentCode: ((d.documentCodes as string[]) ?? [])[0] ?? "",
        names: (d.names as string[] | undefined) ?? [],
      })),
    );

    const out = {
      apn,
      source_url_per_document: sourceUrls,
      captured_date: CAPTURED,
      source_note:
        "Pre-cached at build-time for prototype; production would query live at click.",
      display_fields: display,
      api_response: { documents: docs },
    };
    const outPath = path.join(OUT_DIR, `${apn}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
    console.log(`wrote ${apn} (${docs.length} docs)`);
    apnList.push(apn);
  }

  // Write the index file for dynamic import
  const indexPath = path.join(OUT_DIR, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(apnList, null, 2) + "\n");
  console.log(`wrote index.json (${apnList.length} APNs)`);

  console.log(`done: ${calls} calls in ${Date.now() - t0}ms`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
