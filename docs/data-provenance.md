# Data Provenance — Gilbert Assessor Seed + Seville Recorder Cache

This document is the operator runbook for refreshing the map's external
data. It is also the demo artifact an evaluator opens to verify that we
document our data supply chain end-to-end.

## Run order

1. `npx tsx scripts/fetch-gilbert-parcels.ts`
2. Manually filter candidate neighbor APNs from the fetched file
3. Visit the Maricopa recorder UI; record 3 most-recent instruments per candidate
4. Edit `scripts/lib/neighbor-instruments.ts` with the 5 APN × 3 recording numbers
5. `npx tsx scripts/fetch-seville-neighbors-recorder-cache.ts`
6. Run `npm test` — the `NEIGHBOR_INSTRUMENTS` validation suite must pass.

## 1. Gilbert assessor fetch

- Source: Maricopa County Assessor public ArcGIS FeatureServer
- Endpoint probe order:
  1. `https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer`
  2. `https://maps.mcassessor.maricopa.gov/arcgis/rest/services/`
  3. Open-data indirection via `https://maps-mcassessor.opendata.arcgis.com/`
- Bounding box (WGS84): `xmin=-111.755, ymin=33.225, xmax=-111.695, ymax=33.258`
- outFields: APN, APN_DASH, OWNER_NAME, PHYSICAL_STREET_*, PHYSICAL_CITY, PHYSICAL_ZIP,
  SUBNAME, LOT_NUM, DEED_NUMBER, DEED_DATE, SALE_DATE, LAND_SIZE, CONST_YEAR,
  Shape_Length, Shape_Area
- Attribution: Maricopa County Assessor, per A.R.S. § 11-495 (public records).
- Post-run: record count and gzipped file size below.

Record count at capture: 1000
File size (gzipped): 117,018 bytes (0.11 MB)
Capture date: 2026-04-16
Endpoint used: https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer

## 2. Candidate filter (run once by hand after Gilbert fetch)

From `src/data/gilbert-parcels-geo.json`:

    WHERE properties.SUBNAME contains 'SEVILLE PARCEL 3'
      AND properties.APN_DASH NOT IN
          ('304-78-386', '304-77-689', '304-78-409', '304-78-374', '304-78-383')
    ORDER BY properties.DEED_DATE DESC
    TAKE 5 (prefer 2013–2021 activity)

The 5 curated APNs excluded above are: POPHAM, HOGUE, HOA tract, WARNER, LOWRY.

## 3. Manual recorder-UI research step (Known Gap #2 workaround)

The Maricopa public API has no name- or APN-filtered document search. The
3-most-recent-instruments mapping is produced by hand, once, against the
Maricopa recorder browser UI.

For each candidate APN:

1. Open `https://recorder.maricopa.gov/recording/document-search-results.html`
   and search by the owner name on the polygon (OWNER_NAME property).
2. Scrub the results for instruments that attach to the specific APN
   (cross-reference addresses/legal descriptions; names on unrelated
   parcels are common — see Decision #25).
3. Sort ascending/descending by recording date; take the 3 most-recent.
4. Record the 11-digit recordingNumber, recordingDate, documentCode, and
   names[] for each of the 3.

If a candidate has fewer than 3 recorded instruments on its APN, swap it
out for the next candidate in the filtered list.

## 4. `NEIGHBOR_INSTRUMENTS` mapping

The 5 × 3 = 15 recording numbers live in
`scripts/lib/neighbor-instruments.ts` as a frozen constant. Research
date: (to be filled by operator).

| APN | Owner | Recording # 1 | Recording # 2 | Recording # 3 |
|---|---|---|---|---|
| (to be filled) | | | | |

## 5. Seville fetch confirmation

- 5 files under `src/data/api-cache/recorder/`, one per APN
- 15 total `/documents/{n}` calls
- Total API calls (including probes): (to be filled)
- Spacing enforced: ≥ 500 ms between calls
- Cap: 30 calls; halt on 429/5xx

## 6. Re-run instructions

- Refreshing the Gilbert seed is cheap — re-run the script; `captured_date`
  updates. Bundle budget (2 MB gzipped) is re-checked automatically.
- Refreshing the Seville cache requires the manual step in §3 — the API
  has no automated way to discover "last 3 instruments on this APN."

## 7. Legal

Maricopa County parcel data is public record under A.R.S. § 11-495.
Attribution: "Maricopa County Assessor" is supplied on every surface that
renders a field from this feed. The Maricopa Recorder's public API
(`publicapi.recorder.maricopa.gov`) has been used for research; every
response we cache is stamped with `source_url` and `captured_date`.
