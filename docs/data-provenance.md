# Data provenance — external citations and operator runbooks

Central registry for every externally-sourced number or dataset in the
portal. Each entry names the constant or file, where it lives in code, the
primary source, and the access-state at retrieval time. If a source is
later found to disagree with the constant, **update the citation first,
then the constant** — never the other way around.

---

## `MARICOPA_BUSINESS_DAY_RECORDING_VOLUME` — County Heartbeat anchor

- **Constant location:** `src/logic/heartbeat-model.ts`
- **Value:** `4000` (documents per business day)
- **Derivation:** 1,000,000 annual documents ÷ 250 U.S. federal business days ≈ 4,000

### Primary source

- **Entity:** Maricopa County Recorder's Office — "About" page
- **URL:** https://recorder.maricopa.gov/site/about.aspx
- **Quoted statement:** "records approximately 1 million documents annually"
- **Access note (2026-04-16):** Direct WebFetch returns HTTP 403 (Cloudflare on
  the `recorder.maricopa.gov` subdomain). Citation was verified via Wikipedia's
  `Maricopa_County_Recorder's_Office` article, which cites this page as its
  Reference [12] with retrieval date 2023-10-31.

### Corroborating source

- **Entity:** Maricopa County official portal — Recorder's Office page
- **URL:** https://www.maricopacountyaz.org/Recorders_Office.html
- **Quoted statement:** "Each year, the office records around a million documents"
- **Access note (2026-04-16):** Direct WebFetch succeeded. Page rendered without
  block; statement verified in-text.

### Business-day divisor

- **Value:** 250
- **Derivation:** 365 calendar days − 104 weekend days − 11 federal holidays ≈ 250
- **Note:** Across any specific year, the count varies between ~249 and ~252
  depending on how holidays fall. This variance (~±1%) is absorbed by the
  "~" prefix on the "~4,000" figure in the provenance caption.

### When to update this entry

- The Maricopa Recorder publishes a materially different figure (≥15% delta).
- A more precise figure becomes available (e.g., the office publishes a
  monthly or quarterly statistic that lets us compute a tighter
  business-day average).
- The `recorder.maricopa.gov` 403 is resolved and the primary source can be
  fetched directly — at which point the access-note above should be updated
  to reflect direct retrieval.

### What NOT to do

- Do **not** update the constant to match a target UI behavior (e.g., "the
  counter ticks too slowly, bump to 5,000"). The constant is anchored to a
  citation; the citation governs the value, not the other way around.
- Do **not** remove this entry if the constant is removed from code. Leave
  a tombstone line: "Constant removed YYYY-MM-DD. See [commit]."

---

# Gilbert Assessor Seed + Seville Recorder Cache — operator runbook

This section is the operator runbook for refreshing the map's external
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
  - Note: FeatureServer returns 200-with-error-body on `/0/query`; MapServer is the working endpoint.
- Bounding box (WGS84): `xmin=-111.755, ymin=33.225, xmax=-111.695, ymax=33.258`
- outFields: APN, APN_DASH, OWNER_NAME, PHYSICAL_STREET_*, PHYSICAL_CITY, PHYSICAL_ZIP,
  SUBNAME, LOT_NUM, DEED_NUMBER, DEED_DATE, SALE_DATE, LAND_SIZE, CONST_YEAR,
  Shape_Length, Shape_Area
- Attribution: Maricopa County Assessor, per A.R.S. § 11-495 (public records).
- Post-run: record count and gzipped file size below.

Record count at capture: 8570
File size (gzipped): 1,078,324 bytes (1.03 MB; budget 2,097,152 bytes)
Capture date: 2026-04-16
Endpoint used: https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0

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
date: 2026-04-16.

| APN | Owner | Recording # 1 | Recording # 2 | Recording # 3 |
|---|---|---|---|---|
| 304-78-406 | BROTHERTON FAMILY TRUST | 20211104802 | 20211104803 | 20211104804 |
| 304-78-338 | SCHERF JESSICA/GARRETT | 20210839272 | 20210839273 | 20210839274 |
| 304-78-369 | KALANITHI/KARUPPIAH | 20201215255 | 20201215256 | 20201215257 |
| 304-78-408 | SOMMERFELD MILTON R JR | 20190726318 | 20190726319 | 20190726320 |
| 304-78-367 | ANGUS SCOTT J | 20200620456 | 20200620457 | (2 only) |

## 5. Seville fetch confirmation

- 5 files under `src/data/api-cache/recorder/`, one per APN, plus `index.json`
- 14 total `/documents/{n}` calls (ANGUS has 2 instruments, all others have 3)
- Total API calls: 14
- Spacing enforced: ≥ 500 ms between calls
- Cap: 30 calls (14 used); halt on 429/5xx

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

---

## Synthetic instrument number reservation

Demo-synthetic instruments use recording numbers in the reserved block `YYYY010000N`:

- Year prefix preserved (matches the real Maricopa recording-number format).
- `010000N` sequence is a deliberate round-number tell so a reader who recognizes the block knows the instrument is synthetic on sight.
- All synthetic instruments also carry `provenance: "demo_synthetic"` on every extracted field and `raw_api_response.synthesized: true` at the instrument root.

Current reservations:

- `20230100000` — PHOENIX ASSOC LIEN (commit `f0c372b`, `d026198`)
- `20190100001` — WARNER junior-lien (an-007, lc-009)
- `20090100001` — LOWRY recorded AOM (an-008)
- `20220100001` — PHOENIX LLC-to-member Q/CL (an-009)
