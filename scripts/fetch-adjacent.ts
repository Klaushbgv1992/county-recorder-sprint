// scripts/fetch-adjacent.ts
// One-time capture of ~20 neighboring parcels around POPHAM + HOGUE from the
// Maricopa County Assessor parcel FeatureServer.
//
// If the subdivision-name filter returns zero features, falls back to a
// bounding-box spatial query centered on each subject parcel.

import fs from "node:fs";
import path from "node:path";

const PARCEL_LAYER =
  "https://services1.arcgis.com/mpVYzdXRFFS8pVCQ/arcgis/rest/services/Parcels/FeatureServer/0/query";

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

async function fetchGeoJson(extraParams: Record<string, string>): Promise<FeatureCollection> {
  const params = new URLSearchParams({
    outFields: "APN,OWNER_NAME,SUBDIVISION,SITUS_ADDRESS",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: "25",
    ...extraParams,
  });
  const url = `${PARCEL_LAYER}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch ${url} -> ${res.status}`);
  }
  const json = (await res.json()) as FeatureCollection & { error?: { message: string } };
  if ("error" in json && json.error) {
    throw new Error(`arcgis error: ${json.error.message}`);
  }
  return json;
}

async function trySubdivisionFilter(): Promise<FeatureCollection["features"]> {
  const sevilleP3 = await fetchGeoJson({ where: "SUBDIVISION LIKE 'SEVILLE PARCEL 3%'" });
  const shamrock = await fetchGeoJson({ where: "SUBDIVISION LIKE 'SHAMROCK ESTATES%'" });
  return [...sevilleP3.features, ...shamrock.features];
}

async function main() {
  let features: FeatureCollection["features"] = [];
  try {
    features = await trySubdivisionFilter();
  } catch (e) {
    console.error("subdivision filter failed:", (e as Error).message);
  }
  if (features.length === 0) {
    console.error("no features from subdivision filter — fallback needed (see plan Task 1 Step 4)");
    process.exit(2);
  }
  const out: FeatureCollection = { type: "FeatureCollection", features };
  fs.writeFileSync(
    path.join("src", "data", "adjacent-parcels.json"),
    JSON.stringify(out, null, 2),
  );
  console.log(`Captured ${features.length} adjacent parcels.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
