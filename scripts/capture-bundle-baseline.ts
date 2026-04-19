// scripts/capture-bundle-baseline.ts
// Read Vite build manifest + compute per-route chunk-graph aggregated size.
// Run after `npm run build`.
//
// NOTE: All route components are statically imported (no dynamic import() /
// React.lazy) so Vite bundles them into a single entry chunk keyed "index.html"
// in the manifest.  Each route's size is therefore the full static-import
// graph rooted at "index.html".  Dynamic chunks (maplibre-gl, html2canvas,
// dompurify, canvg) are lazy-loaded and excluded — they are not needed to
// paint any route on first load.

import fs from "node:fs";
import path from "node:path";

type Manifest = Record<string, {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
}>;

const ROUTES_TO_TRACK = [
  "src/components/LandingPage.tsx",
  "src/components/ChainOfTitle.tsx",
  "src/components/EncumbranceLifecycle.tsx",
  "src/components/ProofDrawer.tsx",
  "src/components/MoatCompareRoute.tsx",
  "src/components/BringDownPage.tsx",
  "src/components/StaffWorkbench.tsx",
];

// Routes are statically imported → all share the "index.html" entry chunk.
// Map each logical route name to its manifest key.
function manifestKeyFor(_route: string, manifest: Manifest): string {
  // If the route itself is a manifest key (future code-split scenario), use it.
  if (manifest[_route]) return _route;
  // Otherwise fall back to the HTML entry point that bundles everything.
  if (manifest["index.html"]) return "index.html";
  // Last resort: return the route as-is (will produce 0 and surface in validation).
  return _route;
}

function collectChunkSize(
  entryKey: string,
  manifest: Manifest,
  distAssets: string,
  seen: Set<string>,
): number {
  if (seen.has(entryKey)) return 0;
  seen.add(entryKey);
  const entry = manifest[entryKey];
  if (!entry) return 0;
  const filePath = path.join(distAssets, "..", entry.file);
  const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  let total = size;
  for (const imp of entry.imports ?? []) {
    total += collectChunkSize(imp, manifest, distAssets, seen);
  }
  return total;
}

function main() {
  const manifestPath = "dist/.vite/manifest.json";
  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: ${manifestPath} missing. Run 'npm run build' first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  const sizes: Record<string, number> = {};
  for (const route of ROUTES_TO_TRACK) {
    const key = manifestKeyFor(route, manifest);
    sizes[route] = collectChunkSize(key, manifest, "dist/assets", new Set());
  }
  const out = {
    captured_date: new Date().toISOString().slice(0, 10),
    commit: process.env.GIT_COMMIT ?? "unknown",
    per_route_bytes: sizes,
  };
  fs.writeFileSync("tests/baseline-bundle-sizes.json", JSON.stringify(out, null, 2) + "\n");
  console.log("Wrote tests/baseline-bundle-sizes.json");
  for (const [r, b] of Object.entries(sizes)) {
    console.log(`  ${r}  ${b} bytes`);
  }
}

main();
