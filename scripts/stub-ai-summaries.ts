/*
 * Stub generator for ai-summaries artifacts — DRAFT-PR ONLY.
 *
 * When Anthropic credits are unavailable, this script writes placeholder
 * summary.md + metadata.json and a REAL prompt.txt for each curated parcel.
 * The real bake (scripts/bake-ai-summaries.ts) detects the stub prompt_hash
 * mismatch and requires --force to overwrite.
 *
 * Do NOT merge a PR while any parcel's metadata.json shows
 *   prompt_hash: "STUB_REBAKE_BEFORE_MERGE".
 */

import fs from "node:fs";
import path from "node:path";
import { buildUserMessage, type SummaryInput } from "../src/lib/claude-summary";
import {
  ParcelsFile,
  InstrumentFile,
  LifecyclesFile,
  StaffAnomalyFileSchema,
} from "../src/schemas";
import type { Parcel, Instrument, EncumbranceLifecycle } from "../src/types";
import type { StaffAnomaly } from "../src/schemas";

const STUB_HASH = "STUB_REBAKE_BEFORE_MERGE";
const STUB_MODEL_ID = "claude-opus-4-7";
const DATA_DIR = path.resolve("src/data");
const OUT_BASE = path.resolve("src/data/ai-summaries");

function readJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, rel), "utf8"));
}

function loadParcels(): Parcel[] {
  return ParcelsFile.parse(readJson("parcels.json"));
}

function loadInstrumentsByApn(parcel: Parcel): Instrument[] {
  const ids = parcel.instrument_numbers ?? [];
  const instruments: Instrument[] = [];
  for (const id of ids) {
    const filePath = path.join(DATA_DIR, "instruments", `${id}.json`);
    if (!fs.existsSync(filePath)) continue;
    instruments.push(InstrumentFile.parse(JSON.parse(fs.readFileSync(filePath, "utf8"))));
  }
  return instruments;
}

function loadLifecyclesForApn(instrumentIds: Set<string>): EncumbranceLifecycle[] {
  const file = LifecyclesFile.parse(readJson("lifecycles.json"));
  return file.lifecycles.filter((lc) => instrumentIds.has(lc.root_instrument));
}

function loadAnomaliesForApn(apn: string): StaffAnomaly[] {
  const all = StaffAnomalyFileSchema.parse(readJson("staff-anomalies.json"));
  return all.filter((a) => a.parcel_apn === apn);
}

function stubSummary(apn: string): string {
  return `STUB — re-bake before merging this PR.

This file is a placeholder for the real Claude-generated chain-of-title summary
for parcel ${apn}. The real content is produced by
\`npm run bake:summaries -- --force\` once Anthropic credits are available.

When you see this text in the UI, the PR is not yet ready to merge. See
\`docs/superpowers/plans/2026-04-17-post-demo-polish.md\` task D.4 and the
commit that introduced this stub.`;
}

function main(): void {
  const parcels = loadParcels();
  for (const parcel of parcels) {
    const instruments = loadInstrumentsByApn(parcel);
    const instrumentIds = new Set(instruments.map((i) => i.instrument_number));
    const lifecycles = loadLifecyclesForApn(instrumentIds);
    const findings = loadAnomaliesForApn(parcel.apn);

    const input: SummaryInput = { parcel, instruments, lifecycles, findings };
    const userMessage = buildUserMessage(input);

    const outDir = path.join(OUT_BASE, parcel.apn);
    fs.mkdirSync(outDir, { recursive: true });

    // prompt.txt is REAL — it's what will be sent to Claude when the real bake runs.
    fs.writeFileSync(path.join(outDir, "prompt.txt"), userMessage, "utf8");
    fs.writeFileSync(path.join(outDir, "summary.md"), stubSummary(parcel.apn), "utf8");
    fs.writeFileSync(
      path.join(outDir, "metadata.json"),
      JSON.stringify(
        {
          generated_at: "1970-01-01T00:00:00Z",
          model_id: STUB_MODEL_ID,
          input_token_count: 0,
          output_token_count: 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
          prompt_hash: STUB_HASH,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`[${parcel.apn}] stubbed`);
  }
}

main();
