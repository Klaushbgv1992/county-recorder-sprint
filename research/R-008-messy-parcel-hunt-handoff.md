# R-008 — Messy-Parcel Hunt Handoff (pre-Playwright MCP)

**Date:** 2026-04-18
**Status:** Handoff after Option A session-tools run. Playwright MCP installed
and pre-warmed; next session should pick up with a real browser.

## Goal

Find ONE Maricopa County parcel whose recorded history contains a "messy"
pattern a name-indexed title plant would fumble — e.g., personal
representative's deed, affidavit of death of joint tenant, trustee's deed upon
sale, federal/state tax lien later released under a different name, lis
pendens with dismissal, or substitution of trustee recorded separately.

Geographic preference (in order):
1. Seville Parcel 3 or Shamrock Estates Ph 2A, Gilbert 85298 (E Palmer St)
2. Any Seville subdivision (Parcels 1–10), Gilbert 85298
3. Any Gilbert 85298 residential parcel

Do NOT use POPHAM (304-78-386) or HOGUE (304-77-689) — already in corpus.

## What's confirmed accessible from this session (no Playwright needed)

- Maricopa Public Recorder API: `GET https://publicapi.recorder.maricopa.gov/documents/{n}` returns clean JSON.
- Maricopa Assessor parcel detail: `https://mcassessor.maricopa.gov/mcs/?q={APN-no-dashes}&mod=pd`.
- Both return identical data when called from WebFetch or a browser.

## What's blocked from session tools (Playwright MCP required)

| Endpoint | Failure mode |
|---|---|
| `recorder.maricopa.gov/recording/document-search-results.html?mode=name&...` | HTTP 403 (Cloudflare). The *public* name search — Known Gap #2. |
| `superiorcourt.maricopa.gov/docket/ProbateCourtCases/caseSearch.asp` | POST-only form; GET returns empty form only. |
| `redfin.com/AZ/Gilbert/...` and `zillow.com/homedetails/...` | HTTP 403 (Cloudflare) on every property history page. |

## Ranked candidates (from 9 un-scouted E Palmer St APNs)

| Rank | APN | Address | Owner | Last Deed | Hold | Signal |
|---|---|---|---|---|---|---|
| 1 | 304-78-388 | 3656 E Palmer | JOHNSON TROY W / JUANITA | 2004-09-30 (20041152880) | **~22 yr** | Original Seville Parcel 3 owner. Zero conveyance since 2004. Highest probability of accumulated messiness. |
| 2 | 304-78-400 | 3683 E Palmer | GARCIA LUIS BELTRAN / CHRISTINE PEREZ | 2008-05-19 (20080441979) | ~17 yr | Crash-era $245K purchase. Strong profile for loan mods, HELOC, delayed release. |
| 3 | 304-78-384 (prior) | 3692 E Palmer | **KAHALAS JEREMY** (sole-name seller to HUGGARD 2022) | 2022-07-18 sale (20220579125) | n/a | Sole-name seller — possible divorce, probate, or estate sale. |
| 4 | 304-77-692 | 2755 E Palmer | KENNEDY JOHN A / ANGEL M | 2011-03-16 (20110228375) | ~15 yr | Post-crash. Medium probability. |
| 5-8 | 304-77-670 HARMON, 304-77-696 NAJOR, 304-78-399 TORRES, 304-77-699 MADSEN, 304-78-384 HUGGARD | — | — | 2018-2023 | Short holds. Deprioritize. |

## Evidence already captured (in this conversation)

- Public recorder API verified against 20210075858 (POPHAM release) — returned expected POPHAM/VIP Mortgage/MERS names.
- 20220579125 (HUGGARD buy) — `{names: ["HUGGARD RANDALL","HUGGARD YVONNE","KAHALAS JEREMY"], documentCodes: ["WAR DEED"], recordingDate: "7-18-2022"}`.
- All 9 un-scouted APNs fetched from Assessor — owner + last-deed data rows above.

## Existing corpus (what a hero candidate slots alongside)

- 15 POPHAM instruments (304-78-386, Seville Parcel 3) — clean 3-day refi/release lifecycle
- 2 HOGUE instruments (304-77-689, Shamrock Estates Ph 2A) — open DOT with honest "no release found" lifecycle
- 14 cached neighbor documents across 5 Seville Parcel 3 APNs (304-78-406, 338, 369, 408, 367)
- 2 Seville-subdivision plats (lc-004 lifecycle)
- All in `src/data/instruments/*.json`, `src/data/parcels.json`, `src/data/links.json`, `src/data/lifecycles.json`

## Schema for a new curated instrument

See any existing file in `src/data/instruments/` (e.g. `20210075858.json`).
Required fields: `recording_number`, `recording_date` (YYYY-MM-DD),
`document_code`, `document_type_label`, `apn`, `parties[]` (with `name`,
`role`, `provenance`), `legal_description`, `extracted_fields{}`, and
per-field provenance tags (`public_api` / `ocr` / `manual_entry`).

## Known-gap framing

A successful hero candidate should let us open a THIRD hunt-log pair (alongside
`docs/hunt-log-known-gap-2.md` and `data/raw/R-005/hunt-log.md`) — the
"name-indexed plant would miss this link" story, rooted in either the probate
docket bridge (case → PR DEED) or a tax-lien/debtor-mismatch release.

## Post-restart agent entry prompt (paste this after Claude Code restart)

See bottom of the parent conversation, or reproduce the prompt the user hands
in on session resume.
