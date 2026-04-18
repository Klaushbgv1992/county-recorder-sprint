// One-shot APN rename: the four scenario APNs I originally picked
// (304-78-362, 304-77-555, 304-78-411, 304-78-401) collide with real
// Maricopa Assessor parcels owned by other people. Rename them to the
// clearly-synthetic 999-XX-XXX book range. gilbert-parcels-geo.json is
// EXCLUDED — the real parcels under those APNs live there untouched.

import { readFileSync, writeFileSync, renameSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Old APN → new APN. Both dashed and undashed forms are mapped so URL
// stripping and assessor_url paths update together.
const RENAMES = [
  { old: "304-78-362", new: "999-01-362", undashOld: "30478362", undashNew: "99901362" },
  { old: "304-77-555", new: "999-02-555", undashOld: "30477555", undashNew: "99902555" },
  { old: "304-78-411", new: "999-03-411", undashOld: "30478411", undashNew: "99903411" },
  { old: "304-78-401", new: "999-04-401", undashOld: "30478401", undashNew: "99904401" },
];

// Files to update. gilbert-parcels-geo.json is deliberately excluded.
const FILES = [
  "src/data/parcels.json",
  "src/data/lifecycles.json",
  "src/data/instruments/20080200001.json",
  "src/data/instruments/20080200002.json",
  "src/data/instruments/20190200001.json",
  "src/data/instruments/20230200001.json",
  "src/data/instruments/20240200001.json",
  "src/data/instruments/20160200001.json",
  "src/data/instruments/20160200002.json",
  "src/data/instruments/20210200001.json",
  "src/data/instruments/20210200002.json",
  "src/data/instruments/20220200001.json",
  "src/data/instruments/20170200001.json",
  "src/data/instruments/20170200002.json",
  "src/data/instruments/20220200002.json",
  "src/data/instruments/20220200003.json",
  "src/data/instruments/20220200004.json",
  "src/data/instruments/20050200001.json",
  "src/data/instruments/20050200002.json",
  "src/data/instruments/20220200005.json",
  "src/data/instruments/20230200002.json",
  "src/data/instruments/20230200003.json",
  "src/components/AiSummaryStatic.tsx",
  "src/components/ScenarioPicker.tsx",
  "src/lib/synthetic-instruments.ts",
  "scripts/add-scenario-polygons.mjs",
];

function patchText(text) {
  let changed = text;
  for (const r of RENAMES) {
    changed = changed.split(r.old).join(r.new);
    changed = changed.split(r.undashOld).join(r.undashNew);
  }
  return changed;
}

for (const rel of FILES) {
  const full = resolve(root, rel);
  if (!existsSync(full)) {
    console.log(`skip (missing): ${rel}`);
    continue;
  }
  const before = readFileSync(full, "utf8");
  const after = patchText(before);
  if (before === after) {
    console.log(`unchanged: ${rel}`);
    continue;
  }
  writeFileSync(full, after);
  console.log(`patched: ${rel}`);
}

// Rename AI-summary folders + patch their contents.
const aiRoot = resolve(root, "src/data/ai-summaries");
for (const r of RENAMES) {
  const oldDir = join(aiRoot, r.old);
  const newDir = join(aiRoot, r.new);
  if (existsSync(oldDir)) {
    renameSync(oldDir, newDir);
    console.log(`renamed dir: ${r.old} -> ${r.new}`);
  } else {
    console.log(`skip (missing dir): ${r.old}`);
    continue;
  }
  // Patch files inside the renamed folder.
  for (const entry of readdirSync(newDir)) {
    const file = join(newDir, entry);
    if (!statSync(file).isFile()) continue;
    const before = readFileSync(file, "utf8");
    const after = patchText(before);
    if (before !== after) {
      writeFileSync(file, after);
      console.log(`  patched: ${entry}`);
    }
  }
}

console.log("done.");
