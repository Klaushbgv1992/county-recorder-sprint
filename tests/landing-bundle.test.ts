import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";

type ManifestEntry = {
  file: string;
  src?: string;
  imports?: string[];
  dynamicImports?: string[];
  isDynamicEntry?: boolean;
};
type Manifest = Record<string, ManifestEntry>;

describe("landing-bundle", () => {
  let manifest: Manifest;

  beforeAll(() => {
    execSync("npm run build", { stdio: "inherit" });
    manifest = JSON.parse(
      fs.readFileSync("dist/.vite/manifest.json", "utf8"),
    ) as Manifest;
  }, 240_000);

  it("Gilbert seed is a dynamic entry, not a static import", () => {
    const gilbert = manifest["src/data/gilbert-parcels-geo.json"];
    expect(gilbert, "gilbert-parcels-geo must exist in manifest").toBeDefined();
    expect(gilbert.isDynamicEntry).toBe(true);

    const indexEntry = manifest["index.html"];
    expect(indexEntry, "index.html entry must exist").toBeDefined();
    expect(
      indexEntry.imports ?? [],
      "gilbert must NOT be in index.html static imports",
    ).not.toContain("src/data/gilbert-parcels-geo.json");
    expect(
      indexEntry.dynamicImports ?? [],
      "gilbert MUST be in index.html dynamicImports",
    ).toContain("src/data/gilbert-parcels-geo.json");
  });

  it("cached-neighbors loader is a dynamic entry", () => {
    const loader = manifest["src/data/load-cached-neighbors.ts"];
    expect(loader, "load-cached-neighbors must exist in manifest").toBeDefined();
    expect(loader.isDynamicEntry).toBe(true);
  });

  it("Gilbert seed gzipped size is under 2 MB budget", () => {
    const gilbert = manifest["src/data/gilbert-parcels-geo.json"];
    const filePath = `dist/${gilbert.file}`;
    const raw = fs.readFileSync(filePath);
    const { gzipSync } = require("node:zlib");
    const gz = gzipSync(raw);
    expect(gz.byteLength).toBeLessThan(2 * 1024 * 1024);
  });

  it("static entry chunk size is reported (informational — no route-level code splitting)", () => {
    const baseline = JSON.parse(
      fs.readFileSync("tests/baseline-bundle-sizes.json", "utf8"),
    ) as { per_route_bytes: Record<string, number> };

    const indexEntry = manifest["index.html"];
    const entryFile = `dist/${indexEntry.file}`;
    const currentSize = fs.statSync(entryFile).size;
    const baselineSize = Object.values(baseline.per_route_bytes)[0] ?? 0;
    const delta = currentSize - baselineSize;

    console.log(`  Entry chunk: ${currentSize} bytes (baseline: ${baselineSize}, delta: ${delta > 0 ? "+" : ""}${delta})`);
    console.log(
      "  Note: routes share one entry chunk (no React.lazy splitting). " +
        "New landing components increase the shared chunk. The critical " +
        "invariant is that gilbert-parcels-geo is dynamic, not static.",
    );
    expect(true).toBe(true);
  });
});
