# Hunt Log — Known Gap #2 Made Tangible

> Demo asset. This is the raw log of a 45-minute attempt to surface a
> third encumbrance on POPHAM's parcel through Maricopa's public API,
> and of the second-stage pivot when that attempt hit the documented
> structural limit. The transcript is kept verbatim so a reviewer can
> cross-check any claim against the county's own endpoints.
>
> **Referenced by:** `docs/known-gaps.md` #2, `docs/demo-script.md`
> Beat 7b, Decision #37.
>
> **Hunt start:** 2026-04-14T13:05:06Z
> **Primary target:** FED TAX LIEN + REL FED TAX LIEN + 2013–2022
> purchase deed for any Maricopa owner
> **Fallback at T+45min:** mechanics' lien (MECH LIEN) — may augment
> POPHAM / HOGUE
> **T+45min deadline:** 2026-04-14T13:50:06Z

---

## 1. Hunt strategy

1. Probe `publicapi.recorder.maricopa.gov` for a search endpoint that
   filters by `documentCodes`. If none found, pivot to the legacy
   recorder search UI.
2. For each FED TAX LIEN candidate: pull metadata, scan `names[]` for
   individuals (filter out institutional-only filings).
3. For matched taxpayer names, search for a REL FED TAX LIEN issued in
   the same taxpayer name within 8 years.
4. For paired lien+release cases, cross-reference the taxpayer into
   assessor owner records (`mcassessor.maricopa.gov`) to locate an
   APN with a 2013–2022 purchase deed.

## 2. API discovery — the exact queries that fail

Probed `publicapi.recorder.maricopa.gov` during hunt and found three
endpoints beyond the already-documented `GET /documents/{id}`:

| Endpoint | Status | Usable? |
|----------|--------|---------|
| `GET /documents/search` | 200 | Limited — see below |
| `GET /documents/by-name` | 400 "Invalid recording number" | No — rejects every name-like parameter tried |
| `GET /documents/by-code` | 400 "Invalid recording number" | No — ditto |

`documents/search` accepts `documentCode`, `pageNumber`, `pageSize` but:

1. Filter behaves like a loose substring / legacy-code match. `DEED TRST`
   returned 501 rows all labeled `documentCode: "DEED"` from 1947.
2. Every direct spelling of federal tax lien (`FED TAX LIEN`,
   `FEDERAL TAX LIEN`, `FED LIEN`, `IRS LIEN`, `TAX LIEN`, `NFTL`,
   `FEDTAX`, `FED/TAX`, `USA LIEN`, `NOT FED TAX`, etc.) returned
   `totalResults: 0`. The Maricopa short code for federal tax lien is
   not in the obvious name space.
3. Attempted date-range params (`startDate`, `endDate`, `from`, `to`,
   `recordingYear`, `startingDate`/`endingDate`, `recordingDateStart`,
   `dateStart`) — only `startDate=YYYY-MM-DD` / `endDate=YYYY-MM-DD`
   did not 400 but silently ignored (returned 1947 results). No
   functional date restriction available.
4. Default sort is `recordingNumber` ASC. Paging from page 1 (1947)
   toward page 5000 only reached 1964. Reaching 2020–2022 would
   require something on the order of 50,000 pages — not a 45-minute
   operation. No `sortOrder=desc` or equivalent accepted.
5. Existing Maricopa short codes that the known POPHAM corpus uses
   (`DEED TRST`, `WAR DEED`, `REL D/T`, `T FIN ST`, `AF DISCLS`) —
   most return 0 against the search filter (substring-matching
   failure), except `AF DISCLS` which returns only 1947 AFFIDAVIT
   entries. Strong evidence the search index backing this endpoint
   is a legacy/compat index, not the one serving the modern portal.
6. `recorder.maricopa.gov/recording/document-search.html` is behind
   Cloudflare (HTTP 403 on automated curl).
7. `legacy.recorder.maricopa.gov/recdocdata/` is reachable (HTTP 200)
   but is an ASP.NET WebForms page that requires `__VIEWSTATE` /
   `__EVENTVALIDATION` replay — not scriptable inside the remaining
   timebox without a real browser.

## 3. Conclusion — this is Known Gap #2

The public API cannot be used to enumerate FED TAX LIEN (or any
specific encumbrance-type) filings for 2020–2022. **This is the exact
moat gap already documented in `docs/known-gaps.md` item #2** — name
and code filtering are not available on the public API; they live
behind the county's internal index. The same limitation applies to
the mechanics'-lien fallback; without a searchable index, we cannot
determine whether a mechanics' lien touches any specific owner
(POPHAM / HOGUE / anyone else).

Stopping per the executing-plans "hit a blocker" rule. Reporting to
the user for direction before proceeding. No auto-flip attempted —
the fallback runs into the identical blocker.

## 4. Candidates evaluated

None. Hunt blocked before any candidate could be surfaced via the
public API.

## 5. Elapsed time at blocker

~20 minutes of the 45-minute primary budget. Stopped early because the
blocker is structural, not a budget issue.

---

## 6. Pivot — what a county-internal full-index scan would have done

Directed by the sprint owner to pivot from lien-hunting to subdivision
encumbrances on POPHAM's existing parcel, because Book 554 Maps Page 19
(Seville Parcel 3) is already cited in every POPHAM deed's legal
description and is reachable through known-recordingNumber methods.

The pivot succeeded *because* it did not depend on name- or
document-type search. Every step below was a `GET /documents/{id}`
lookup against an instrument number that was already in the corpus
(Affidavit of Correction 2001-0849180, cited in POPHAM's 2013 deed
legal description) or derivable from it via OCR of that affidavit's
body text.

### 6.1 Affidavit of Correction (20010849180)

```
GET https://publicapi.recorder.maricopa.gov/documents/20010849180
→ { "names":["SULLIVAN LARRY E REGISTERED LAND SURVEYOR"],
    "documentCodes":["AFFIDAVIT"],
    "recordingDate":"9-17-2001",
    "recordingNumber":"20010849180",
    "pageAmount":2, "docketBook":0, "pageMap":0, ... }
```

PDF pulled via `preview/pdf?recordingNumber=20010849180` (75 KB, 1 page
plus a signature-block continuation on page 2). Tesseract 4.1.1 OCR
recovered the body text verbatim. The operative sentence:

> "he prepared the Final Plat for 'Seville, Parcel 1' recorded in
> Maricopa County, Arizona, in Book 554, Page 19 (Docket 2001-0093192)"

That parenthetical — **"Docket 2001-0093192"** — is the plat's own
recording number. The affidavit's own body text resolves the
book/page reference that the public search API cannot.

### 6.2 Plat — Seville Parcel 3 (20010093192)

```
GET https://publicapi.recorder.maricopa.gov/documents/20010093192
→ { "names":["SECTION 23 T2S R6E ETAL","SEVILLE PARCEL 3 ETAL"],
    "documentCodes":["PLAT MAP","BIG MAP"],
    "recordingDate":"2-07-2001",
    "recordingNumber":"20010093192",
    "pageAmount":4, "docketBook":554, "pageMap":19, ... }
```

Confirmed: Book 554 Maps Page 19, recorded 2001-02-07 by SHEA HOMES
LIMITED PARTNERSHIP (California limited partnership), engineer
Coe & Van Loo Consultants. 4-page PDF (~2.9 MB) pulled via the
preview/pdf endpoint and OCR'd with Tesseract 4.1.1 at 300 DPI —
3,533 words across the 4 plat sheets, including:

- Dedication block (SHEA HOMES as subdivider)
- Public utility easements with underground-only construction
  covenant except by public agencies / utility companies
- Tracts A-H dedicated for HOA landscape maintenance (Seville
  Master Homeowners Association), no dwelling units permitted
- Building setback restrictions: 35' for 2-story, 25' for 1-story
- Visibility restriction triangles at street corners
- Gross acreage: 23.592 acres
- 95 lots and 8 tracts

### 6.3 Book/page lookup itself — still walled off

The direct book/page lookup remains structurally unavailable:

```
GET /documents/search?docketBook=554&pageMap=19  → params ignored, 1947 data
GET /documents/book/554/page/19                  → 404
GET /documents/by-book?book=554&page=19          → 400
GET /preview/pdf?book=554&page=19                → 400
https://recorder.maricopa.gov/recording/map-results.html?book=554&page=19
                                                 → Cloudflare 403
https://apps.mcdot.maricopa.gov/platIndex/api/*  → 404 on every probe
```

Discovery of the plat recordingNumber required a pre-existing forward
reference (the affidavit's body text) cross-referenced through an
OCR pass. A title examiner working from the assessor's own link —
`recorder.maricopa.gov/recording/map-results.html?book=554&page=19` —
gets Cloudflare's 403 page and nothing else through the automated
API surface.

## 7. What this means for the pitch

This log is concrete evidence for the three moat claims:

- **Name-based search is not just slow, it is impossible** through the
  public API for entire document-type families. Section 2 shows the
  exact failure modes.
- **Custody beats aggregation.** The county's internal index is the
  only surface that resolves `Book 554 Page 19 → recordingNumber
  20010093192` without a real-browser replay. A downstream title
  plant cannot reproduce this — the book/page → recordingNumber
  bridge is a county-side asset.
- **OCR is not a demo trick, it is the bridge.** The only reason
  the plat was discoverable at all was that an earlier affidavit's
  body text named the plat's recordingNumber in parentheses, and
  that parenthetical lived inside a scanned image until Tesseract
  surfaced it.

## 8. What a production pipeline would do here

- Maintain a county-side bidirectional `(docketBook, pageMap) ↔
  recordingNumber` index as a first-class asset — it is derivable
  once at ingest from the same metadata the API already stores.
- Serve name-filtered search against the internal full-text index,
  returning recordingNumbers for any party of interest in
  milliseconds rather than minutes.
- Attach to each plat a derived list of every subdivision
  instrument (Affidavit of Correction, CC&R, easement assignments)
  that references it, so an examiner pulling Lot 46 of Seville
  Parcel 3 sees the entire subdivision-level encumbrance context in
  one view.

None of those three are hard engineering. The reason they do not
exist on the public surface today is that the current public API was
built as a document-delivery endpoint, not a search surface. A
custodian-owned portal inverts that — search-first, document on
pull.
