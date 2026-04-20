import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadAllInstruments } from "../src/data-loader";

// Every instrument's source_image_path is a URL-form string served by Vite's
// publicDir (./data). A missing or mis-pathed reference in curated JSON would
// render a broken image in the Proof Drawer at demo time — catch it at test
// time instead. See vite.config.ts:10 (publicDir = "data").

const PUBLIC_DIR = resolve(__dirname, "..", "data");

describe("instrument source_image_path integrity", () => {
  const instruments = loadAllInstruments();

  it("covers every instrument in the corpus (sanity)", () => {
    expect(instruments.length).toBeGreaterThan(40);
  });

  it("resolves every non-null source_image_path to a real file under publicDir", () => {
    const broken: Array<{ instrument: string; path: string; reason: string }> =
      [];
    for (const inst of instruments) {
      const p = inst.source_image_path;
      if (p === null) continue;
      if (!p.startsWith("/")) {
        broken.push({
          instrument: inst.instrument_number,
          path: p,
          reason: "must be an absolute URL path starting with '/'",
        });
        continue;
      }
      const fsPath = join(PUBLIC_DIR, p.slice(1));
      if (!existsSync(fsPath)) {
        broken.push({
          instrument: inst.instrument_number,
          path: p,
          reason: `file not found at ${fsPath}`,
        });
        continue;
      }
      const stats = statSync(fsPath);
      if (!stats.isFile() || stats.size === 0) {
        broken.push({
          instrument: inst.instrument_number,
          path: p,
          reason: "path exists but is not a non-empty file",
        });
      }
    }
    if (broken.length > 0) {
      throw new Error(
        `Broken source_image_path references:\n${broken
          .map(
            (b) => `  ${b.instrument} → ${b.path}  (${b.reason})`,
          )
          .join("\n")}`,
      );
    }
  });
});
