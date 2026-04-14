# R-004 Parcel Hunt Log — Tier 1-A

Start: 2026-04-14T13:05:06Z
Primary target: FED TAX LIEN + REL FED TAX LIEN + 2013–2022 purchase deed
Fallback at T+45min: mechanics' lien (MECH LIEN), may augment POPHAM/HOGUE
T+45min deadline: 2026-04-14T13:50:06Z

## Hunt strategy

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

## API discovery notes

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

## Conclusion

The public API cannot be used to enumerate FED TAX LIEN (or any
specific encumbrance-type) filings for 2020–2022. This is **the exact
moat gap already documented in `docs/known-gaps.md` item #2** — name
and code filtering are not available on the public API; they live
behind the county's internal index. The same limitation applies to
the mechanics'-lien fallback; without a searchable index, we cannot
determine whether a mechanics' lien touches any specific owner (POPHAM
/ HOGUE / anyone else).

Stopping per the executing-plans "hit a blocker" rule. Reporting to
the user for direction before proceeding. No auto-flip attempted —
the fallback runs into the identical blocker.

## Candidates evaluated

None. Hunt blocked before any candidate could be surfaced.

## Elapsed time at stop

~20 minutes of the 45-minute primary budget. Stopping early because
the blocker is structural, not a budget issue.
