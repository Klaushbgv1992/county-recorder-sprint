/*
 * Build-time bake of per-parcel Claude summaries.
 * Run with: npm run bake:summaries [-- --force]
 *
 * Reads ANTHROPIC_API_KEY from .env.local. For each curated parcel, calls
 * Claude Opus 4.7 with prompt caching on SYSTEM_PROMPT, and writes three
 * artifacts per parcel:
 *   src/data/ai-summaries/{apn}/summary.md
 *   src/data/ai-summaries/{apn}/prompt.txt
 *   src/data/ai-summaries/{apn}/metadata.json
 *
 * Idempotent: skips parcels whose metadata.json prompt_hash already matches
 * canonicalJson(SummaryInput). Re-run with --force to overwrite.
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { promptHash } from "./lib/canonical-json";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  type SummaryInput,
} from "../src/lib/claude-summary";
import { ParcelsFile, InstrumentFile, LifecyclesFile, StaffAnomalyFileSchema } from "../src/schemas";
import type { Parcel, Instrument, EncumbranceLifecycle } from "../src/types";
import type { StaffAnomaly } from "../src/schemas";

const MODEL_ID = "claude-opus-4-7";
const MAX_TOKENS = 2048;
const DATA_DIR = path.resolve("src/data");
const OUT_BASE = path.resolve("src/data/ai-summaries");

function loadEnvLocal(): void {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found — create one with ANTHROPIC_API_KEY=...");
  }
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

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

async function bakeOne(
  client: Anthropic,
  apn: string,
  input: SummaryInput,
  force: boolean,
): Promise<void> {
  const outDir = path.join(OUT_BASE, apn);
  const metaPath = path.join(outDir, "metadata.json");
  const hash = promptHash(input);

  if (fs.existsSync(metaPath) && !force) {
    const existing = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (existing.prompt_hash === hash) {
      console.log(`[${apn}] cache hit — skip`);
      return;
    }
    console.log(
      `[${apn}] prompt_hash mismatch: would regenerate. Re-run with --force to overwrite.`,
    );
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const userMessage = buildUserMessage(input);
  fs.writeFileSync(path.join(outDir, "prompt.txt"), userMessage, "utf8");

  const res = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const summary = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  fs.writeFileSync(path.join(outDir, "summary.md"), summary, "utf8");
  const metadata = {
    generated_at: new Date().toISOString(),
    model_id: MODEL_ID,
    input_token_count: res.usage.input_tokens,
    output_token_count: res.usage.output_tokens,
    cache_read_input_tokens: res.usage.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: res.usage.cache_creation_input_tokens ?? 0,
    prompt_hash: hash,
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf8");
  console.log(
    `[${apn}] generated · in=${res.usage.input_tokens} out=${res.usage.output_tokens} cache_read=${metadata.cache_read_input_tokens}`,
  );
}

async function main(): Promise<void> {
  loadEnvLocal();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing from .env.local");
  }
  const force = process.argv.includes("--force");

  const parcels = loadParcels();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  for (const parcel of parcels) {
    const instruments = loadInstrumentsByApn(parcel);
    const instrumentIds = new Set(instruments.map((i) => i.instrument_number));
    const lifecycles = loadLifecyclesForApn(instrumentIds);
    const findings = loadAnomaliesForApn(parcel.apn);

    const input: SummaryInput = { parcel, instruments, lifecycles, findings };
    await bakeOne(client, parcel.apn, input, force);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
