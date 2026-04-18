#!/usr/bin/env tsx
/**
 * Validates src/data/custodian-sweep-fixture.json against the engine's Zod
 * schema, and cross-checks invariants the schema alone can't express.
 *
 * Exits 0 on pass, 1 on any failure. Run standalone or from npm test via the
 * schema test suite.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FixtureSchema, type Fixture } from "../src/lib/custodian-query-engine.schema";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function main(): void {
  const path = resolve(process.cwd(), "src/data/custodian-sweep-fixture.json");
  const raw = readFileSync(path, "utf-8");
  const json: unknown = JSON.parse(raw);

  let fx: Fixture;
  try {
    fx = FixtureSchema.parse(json);
  } catch (e) {
    fail(`Zod schema rejected the fixture:\n${e instanceof Error ? e.message : String(e)}`);
  }

  // Invariant 1: every (party × liveIndex × approach) has a cell.
  const approaches = ["public-api", "county-internal"] as const;
  const expectedCells: string[] = [];
  for (const party of fx.parties) {
    for (const idx of fx.live_indexes) {
      for (const a of approaches) {
        expectedCells.push(`${party}__${idx.id}__${a}`);
      }
    }
  }
  const actualCells = new Set(Object.keys(fx.cells));
  const missing = expectedCells.filter((k) => !actualCells.has(k));
  if (missing.length > 0) {
    fail(`Missing ${missing.length} cell(s). First: ${missing[0]}`);
  }

  // Invariant 2: no orphan cells.
  const expectedSet = new Set(expectedCells);
  const orphans = [...actualCells].filter((k) => !expectedSet.has(k));
  if (orphans.length > 0) {
    fail(`Orphan cell keys: ${orphans.slice(0, 3).join(", ")}${orphans.length > 3 ? "…" : ""}`);
  }

  // Invariant 3: POPHAM sweep parties subset of top-level parties.
  const pop = fx.parcel_sweeps["304-78-386"];
  if (pop && pop.status === "swept") {
    const top = new Set(fx.parties);
    const extra = pop.parties.filter((p) => !top.has(p));
    if (extra.length > 0) {
      fail(`POPHAM sweep references parties not in top-level list: ${extra.join(", ")}`);
    }
  }

  // Invariant 4: captured_at must not be in the future.
  const capturedAt = Date.parse(fx.captured_at);
  if (capturedAt > Date.now() + 60_000) {
    fail(`captured_at (${fx.captured_at}) is in the future.`);
  }

  console.log(
    `OK: ${fx.parties.length} parties × ${fx.live_indexes.length} live indexes × 2 approaches = ${expectedCells.length} cells. ${fx.dead_ends.length} dead-ends. Captured at ${fx.captured_at}.`
  );
}

main();
