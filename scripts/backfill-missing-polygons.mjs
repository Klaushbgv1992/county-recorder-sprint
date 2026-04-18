// One-shot: copy real Maricopa Assessor polygons for WARNER, LOWRY, PHOENIX
// from src/data/gilbert-parcels-geo.json into src/data/parcels-geo.json so the
// SpatialContextPanel renders a polygon on those detail pages instead of the
// "No spatial data" fallback. These APNs are real — polygons are sourced
// directly from the county GIS; no synthesis. Idempotent.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const APNS = ["304-78-367", "304-78-374", "304-78-383"];

const seed = JSON.parse(
  readFileSync(resolve(root, "src/data/gilbert-parcels-geo.json"), "utf8"),
);
const detail = JSON.parse(
  readFileSync(resolve(root, "src/data/parcels-geo.json"), "utf8"),
);

const existing = new Set(
  detail.features
    .map((f) => f.properties?.APN_DASH ?? f.properties?.apn)
    .filter(Boolean),
);

const maxId = detail.features.reduce(
  (m, f) => Math.max(m, f.id ?? 0, f.properties?.OBJECTID ?? 0),
  0,
);

let added = 0;
APNS.forEach((apn, i) => {
  if (existing.has(apn)) {
    console.log(`${apn}: already in parcels-geo.json — skip`);
    return;
  }
  const seedFeat = seed.features.find(
    (f) => f.properties?.APN_DASH === apn,
  );
  if (!seedFeat) {
    console.log(`${apn}: NOT FOUND in gilbert seed — skip`);
    return;
  }
  // Copy geometry + core attributes. Lowercase apn / owner duplicates for
  // compatibility with the SubjectProperties reader in SpatialContextPanel.
  const props = seedFeat.properties;
  detail.features.push({
    type: "Feature",
    id: maxId + 1 + i,
    geometry: seedFeat.geometry,
    properties: {
      ...props,
      apn: apn,
      owner: props.OWNER_NAME,
      corpus_status: "real_assessor",
      source: "maricopa_assessor_public_gis_backfill",
    },
  });
  added++;
});

if (added > 0) {
  writeFileSync(resolve(root, "src/data/parcels-geo.json"), JSON.stringify(detail));
  console.log(
    `parcels-geo.json: backfilled ${added} real polygons (total features: ${detail.features.length})`,
  );
} else {
  console.log("parcels-geo.json: no changes");
}
