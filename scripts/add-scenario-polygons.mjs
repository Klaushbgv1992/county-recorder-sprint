// One-shot script: appends 4 synthesized polygons to
//   src/data/parcels-geo.json        (used by SpatialContextPanel on detail pages)
//   src/data/gilbert-parcels-geo.json (used by CountyMap on the landing page)
// Every new feature is tagged `source: "demo_synthesized"` so it cannot be
// mistaken for a real Maricopa Assessor polygon. Idempotent — re-running
// does nothing after the first pass.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Hand-placed positions around the Seville Parcel 3 / Shamrock Estates 2A
// bbox so each polygon lands visibly on the landing map. Tiny 20m squares —
// real parcel outlines are ~7k sqft; we don't pretend to match a real
// boundary because these APNs do not correspond to real Gilbert parcels.
const SCENARIOS = [
  {
    apn_dash: "999-01-362",
    apn: "99901362",
    owner: "CHEN DAVID JAMES",
    street_num: "3650",
    street: "PALMER",
    street_type: "ST",
    subdivision: "SEVILLE PARCEL 3",
    lot: "44",
    lon: -111.7104,
    lat: 33.2363,
  },
  {
    apn_dash: "999-02-555",
    apn: "99902555",
    owner: "MARTINEZ SOFIA ANDREA",
    street_num: "2741",
    street: "PALMER",
    street_type: "ST",
    subdivision: "SHAMROCK ESTATES PHASE 2A",
    lot: "322",
    lon: -111.7210,
    lat: 33.2428,
  },
  {
    apn_dash: "999-03-411",
    apn: "99903411",
    owner: "DELGADO PROPERTY HOLDINGS LLC",
    street_num: "3594",
    street: "PALMER",
    street_type: "ST",
    subdivision: "SEVILLE PARCEL 3",
    lot: "38",
    lon: -111.7099,
    lat: 33.2358,
  },
  {
    apn_dash: "999-04-401",
    apn: "99904401",
    owner: "BRYANT JAMES T",
    street_num: "3722",
    street: "PARKVIEW",
    street_type: "AVE",
    subdivision: "SEVILLE PARCEL 3",
    lot: "56",
    lon: -111.7108,
    lat: 33.2356,
  },
];

// A 20m-square polygon centred on (lon, lat). ~1.8e-4 degrees lon per 20m
// at this latitude; 1.8e-4 lat per 20m. Close enough for demo-map framing.
function squarePolygon(lon, lat) {
  const d = 1.2e-4;
  return {
    type: "Polygon",
    coordinates: [[
      [lon - d, lat - d],
      [lon - d, lat + d],
      [lon + d, lat + d],
      [lon + d, lat - d],
      [lon - d, lat - d],
    ]],
  };
}

function propertiesParcelsGeo(s, objectIdBase) {
  return {
    OBJECTID: objectIdBase,
    APN: s.apn,
    APN_DASH: s.apn_dash,
    apn: s.apn_dash,
    FLOOR: 1,
    BOOK: s.apn.slice(0, 3),
    MAP: s.apn.slice(3, 5),
    ITEM: s.apn.slice(5),
    OWNER_NAME: s.owner,
    owner: s.owner,
    MAIL_ADDR1: `${s.street_num} E ${s.street} ${s.street_type}`,
    MAIL_CITY: "GILBERT",
    MAIL_STATE: "AZ",
    MAIL_ZIP: "85298",
    PHYSICAL_STREET_NUM: s.street_num,
    PHYSICAL_STREET_DIR: "E",
    PHYSICAL_STREET_NAME: s.street,
    PHYSICAL_STREET_TYPE: s.street_type,
    PHYSICAL_CITY: "GILBERT",
    PHYSICAL_ZIP: "85298",
    PHYSICAL_ADDRESS: `${s.street_num} E ${s.street} ${s.street_type}   GILBERT  85298`,
    LONGITUDE: s.lon,
    LATITUDE: s.lat,
    SUBNAME: s.subdivision,
    SUBDIVISION: s.subdivision,
    LOT_NUM: s.lot,
    SITUS_ADDRESS: `${s.street_num} E ${s.street} ${s.street_type}`,
    corpus_status: "scenario_synthesized",
    source: "demo_synthesized",
    source_note: "Demo-only scenario polygon — APN does not correspond to a real Maricopa Assessor parcel. Synthesized to visualize scenario parcels on the landing map and detail pages.",
  };
}

function propertiesGilbertSeed(s) {
  return {
    APN: s.apn,
    APN_DASH: s.apn_dash,
    OWNER_NAME: s.owner,
    PHYSICAL_STREET_NUM: s.street_num,
    PHYSICAL_STREET_DIR: "E",
    PHYSICAL_STREET_NAME: s.street,
    PHYSICAL_STREET_TYPE: s.street_type,
    PHYSICAL_CITY: "GILBERT",
    PHYSICAL_ZIP: "85298",
    SUBNAME: s.subdivision,
    LOT_NUM: s.lot,
    DEED_NUMBER: null,
    DEED_DATE: null,
    SALE_DATE: null,
    LAND_SIZE: 7000,
    CONST_YEAR: "",
    Shape_Length: 96,
    Shape_Area: 576,
    source: "demo_synthesized",
    source_note: "Demo-only scenario polygon — not a real Maricopa Assessor parcel.",
    captured_date: new Date().toISOString().slice(0, 10),
  };
}

function patchFile(relPath, buildFeature) {
  const fullPath = resolve(root, relPath);
  const raw = readFileSync(fullPath, "utf8");
  const obj = JSON.parse(raw);
  const existing = new Set(
    obj.features
      .map((f) => f.properties?.APN_DASH ?? f.properties?.apn)
      .filter(Boolean),
  );
  let added = 0;
  const maxObjectId = obj.features.reduce(
    (max, f) => Math.max(max, f.properties?.OBJECTID ?? 0, f.id ?? 0),
    0,
  );
  SCENARIOS.forEach((s, i) => {
    if (existing.has(s.apn_dash)) return;
    obj.features.push({
      type: "Feature",
      id: maxObjectId + 1 + i,
      geometry: squarePolygon(s.lon, s.lat),
      properties: buildFeature(s, maxObjectId + 1 + i),
    });
    added++;
  });
  if (added === 0) {
    console.log(`${relPath}: already patched (no changes)`);
    return;
  }
  writeFileSync(fullPath, JSON.stringify(obj));
  console.log(`${relPath}: appended ${added} scenario polygons (total features: ${obj.features.length})`);
}

patchFile("src/data/parcels-geo.json", (s, oid) => propertiesParcelsGeo(s, oid));
patchFile("src/data/gilbert-parcels-geo.json", (s) => propertiesGilbertSeed(s));
