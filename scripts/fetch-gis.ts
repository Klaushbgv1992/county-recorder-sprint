// scripts/fetch-gis.ts
// One-time capture of county boundary + parcel polygons from Maricopa Open Data.
// Run via: npx tsx scripts/fetch-gis.ts

import fs from "node:fs";
import path from "node:path";

const COUNTY_LAYER =
  "https://gis.maricopa.gov/arcgis/rest/services/IndividualService/CountyMaricopa/MapServer/0/query";
const PARCEL_LAYER =
  "https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query";

const PARCELS = [
  { apn: "304-78-386", owner: "POPHAM CHRISTOPHER/ASHLEY", status: "primary" },
  { apn: "304-77-689", owner: "HOGUE JASON/MICHELE", status: "backup" },
];

async function fetchGeoJson(url: string, where: string): Promise<unknown> {
  const params = new URLSearchParams({
    where,
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function main() {
  const outDir = path.join("src", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const county = await fetchGeoJson(COUNTY_LAYER, "1=1");
  fs.writeFileSync(
    path.join(outDir, "maricopa-county-boundary.json"),
    JSON.stringify(county, null, 2),
  );

  const parcels: Array<unknown> = [];
  for (const p of PARCELS) {
    const fc = (await fetchGeoJson(
      PARCEL_LAYER,
      `APN_DASH='${p.apn}'`,
    )) as { features: Array<{ properties: Record<string, unknown>; geometry: unknown }> };
    if (!fc.features?.length) {
      throw new Error(`No parcel for ${p.apn}`);
    }
    const feat = fc.features[0];
    feat.properties = {
      ...feat.properties,
      apn: p.apn,
      owner: p.owner,
      corpus_status: p.status,
    };
    parcels.push(feat);
  }

  fs.writeFileSync(
    path.join(outDir, "parcels-geo.json"),
    JSON.stringify({ type: "FeatureCollection", features: parcels }, null, 2),
  );

  console.log("Captured county + parcels.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
