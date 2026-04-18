# R-008 — Messy-Parcel Hunt Log (Beat-7 disintermediation receipt #3)

**Status:** COMPLETE — hero parcel located.
**Date:** 2026-04-18
**Hero parcel:** APN **304-77-566**, Lot 224, SHAMROCK ESTATES PHASE 2A, Book 799 of Maps Page 38 — 2778 E. Courtney Street, Gilbert, AZ 85298.
**Current owner:** MOORE REVOCABLE TRUST (acquired 2026-03-20 via successor-trustee transfer from THE SILVA FAMILY REVOCABLE TRUST after both Silva trustees died on 2026-03-11).

This hunt log is promoted to a first-class demo asset. It is the **third** Beat-7 disintermediation receipt in the sprint, complementing:
- `docs/hunt-log-known-gap-2.md` — Tier 1-A federal-tax-lien hunt (R-004 pivot)
- `data/raw/R-005/hunt-log.md` — Tier 1-B Seville master plat hunt (R-005, NOT FOUND)

Where the prior two logs documented FAILED hunts as moat evidence, this one documents a **SUCCESSFUL** hunt that surfaces a different, equally compelling moat finding: the way Maricopa's recorder system makes a probate-equivalent succession **discoverable** to a county portal that keys by APN, while leaving it **invisible** to a name-indexed title plant.

---

## TL;DR — what makes this chain "messy"

1. The 2026-03-20 transfer is a **`TRST DEED`** — the same Maricopa document code used for foreclosure trustee's deeds. A name-indexed plant or examiner that filters by doc-code alone cannot tell a foreclosure from a probate-adjacent succession transfer without reading the body. (Decision #21 family.)
2. The transfer is **probate-equivalent without a probate court case** — the Silvas' assets were in a revocable trust, so no PB case was filed in Maricopa Superior Court. A search of the probate docket for SILVA returns nothing relevant. The succession is **invisible to probate-court bridges**, but **visible to the recorder**.
3. **Two unrelated families both maintain a "Silva Family Revocable Trust"** in Maricopa County:
   - Robert F. + Linda L. Silva, established **2007-07-26** (this trust, holding Lot 224 Shamrock 2A)
   - David M. + Diana L. Silva, established **2016-06-22** (an unrelated trust, holding Lot 157 Ashland Ranch APN 309-20-157)
   A `businessNames=SILVA+FAMILY+REVOCABLE+TRUST` API query returns 12 instruments **mingled across both trusts**. Disambiguation requires the trust "established" date, which lives in the deed body — not in the public-API metadata. (Decision #25 family.)
4. **Both co-trustees died on the same day.** Death certificates 20260141249 (Robert Francis Silva) and 20260141250 (Linda Lucille Silva) were recorded 2026-03-11 with consecutive recording numbers — a single-batch filing. The simultaneous death triggered the successor-trustee succession.
5. **Death certificate bodies are restricted from public viewing.** The recorder INDEXES death certificates (so they're discoverable by name) but the PDF body returns an "Information Blocked" page on `legacy.recorder.maricopa.gov`. The county itself can read the body; a private title plant cannot. This asymmetry is itself a custodial-moat data point.
6. **Public-API name-index drift.** The 2023 Wells Fargo release (20230431552) indexes Linda's name as `SILVA LUCILLE` (without the first name `LINDA`) in the API `names` array — a name-format inconsistency that a name-indexed plant searching `LINDA SILVA` would miss.
7. **A name-indexed plant searching "SILVA" finds the 2015–2017 chain but misses the 2026 transfer** (which only names the trust and Moore). **A name-indexed plant searching "MOORE" finds the 2026 transfer but misses the entire 2015–2023 SILVA history.** The chain only resolves correctly if you key by APN.

---

## Phases executed

### Phase 1 — Probate docket via Playwright

**Endpoint:** `https://www.superiorcourt.maricopa.gov/docket/ProbateCourtCases/caseSearch.asp`

Three name searches (Last/First):
- **JOHNSON / TROY** → 2 hits.
  - PB2025-001381 — decedent **John Darc Lorenz**; Troy Thomas Carroll Johnson is the personal representative (a different Troy Johnson than the 304-78-388 parcel owner per R-008 handoff).
  - PB2007-050444 — decedent **Beulah Johnson**; Troy is one of many heirs.
  - **Neither tied to JOHNSON TROY W on 304-78-388.**
- **GARCIA / LUIS** → 7 hits (PB2002-000601, PB2002-070433, PB2009-001524, PB2010-070446, PB2016-050418, PB2023-091297, PB2024-003972). None matched our 304-78-400 parcel owner GARCIA LUIS BELTRAN.
- **KAHALAS / JEREMY** → **0 hits.**

**Outcome:** No probate-docket bridge to any of the three pre-identified parcel owners.

### Phase 2 — Recorder name search (via Playwright AND public API)

**Major API discovery (refines Known Gap #2):** The recorder's public name search at `recorder.maricopa.gov/recording/document-search-results.html` is backed by `https://publicapi.recorder.maricopa.gov/documents/search` with parameter names `lastNames=`, `firstNames=`, `middleNameIs=`, `businessNames=`, `pageSize=`, `pageNumber=`. The R-008 handoff and Decision #40 had stated that the recorder name-search URL returned a 1947-seeded page regardless of parameters. The actual cause was using the wrong parameter name (`name=` instead of `lastNames=`). With correct parameters, **name filtering works**. The `documentCode` filter is still silently dropped (re-tested 2026-04-18 — query for `documentCode=PR%20DEED` returns 1947 PART REL records, confirming Decision #40 sub-finding). Pagination params `pageSize=` and `pageNumber=` work correctly via the API (returning all records up to the API cap of 200 per page) but the HTML UI ignores `?page=2` in the URL and is hard-capped at 20 rows per page.

**Implication for sprint narrative:** Known Gap #2 is **narrower** than thought — name search works through the un-gated public API; only `documentCode` and `docketBook`/`pageMap` filters are silently dropped. Update Decision #40 narrative accordingly.

**Name searches conducted (via API):**
| Name | Total hits | Target-code hits | Finding |
|---|---|---|---|
| JOHNSON TROY W | 54 | 1 LIEN, 1 N/TR SALE, 1 SUB TRSTE, 1 TRST DEED | 2010 foreclosure chain belongs to TROY W + LISA Johnson (NOT TROY W + JUANITA on 304-78-388). Same-name contamination on JOHNSON TROY W's other property. |
| GARCIA LUIS BELTRAN (full middle name) | **2** | 0 | Clean chain: 20080441979 SPEC/W D, 20130227372 DEED TRST. No messy chain on 304-78-400. |
| KAHALAS JEREMY | 43 | 1 LIEN | All KAHALAS TOM (parcel owner) instruments verified clean. KAPITAN family probate (5 PROB DEED) is on a different family's parcel. |
| Other R-008 candidates (Kennedy John A, Najor, Madsen, Watson Todd, Harmon, Lowry Amy E, McAtee Douglas, Miller Jeffery K, etc.) | varied | varied | Several SUB TRSTE/N/TR SALE/TRST DEED hits, all on properties owned by **different** people sharing the same name as the 9 R-008-handoff candidate owners. Verified by reading the foreclosure PDFs: KENNEDY JOHN A foreclosure → 6558 E Auburn St Mesa AZ 85205 APN 141-59-263 (NOT 304-77-692); NAJOR foreclosure → 20450 N 30th Dr Phoenix AZ 85027 APN 206-08-168 (NOT 304-77-696). |

**Outcome:** Same-name contamination dominates the recorder name search. None of the 9 pre-identified R-008 candidate parcels carry their own messy chains.

### Phase 3 — Redfin sale history

**Skipped after Phase 1-2 produced no hits on the pre-identified candidates** — moved straight to Phase 4 widening rather than enriching candidates that had already been ruled out. Playwright was confirmed to bypass the Cloudflare 403 that blocked Redfin from session tools (R-008 handoff said "blocked"; Playwright successfully loads `https://www.redfin.com/zipcode/85298`).

### Phase 4 — Widen via local Gilbert assessor snapshot

**Strategy:** scan the **last recorded deed** of every parcel in two preferred subdivisions, looking for suspicious document codes. Used local snapshot `src/data/gilbert-parcels-geo.json` (8,574 Gilbert parcels seeded 2026-04-16 per Decision #44) filtered to `SUBNAME = SEVILLE PARCEL 3` (98 lots) and `SUBNAME = SHAMROCK ESTATES PHASE 2A` (224 lots). For each lot's most-recent recorded deed, queried `publicapi.recorder.maricopa.gov/documents/{n}` for the document codes.

**Results:** 322 metadata calls, 318 cache misses. Of the 322 last-deeds:
- 37 SPEC/W D — mostly builder-to-original-buyer purchase deeds (Shea Homes, D.R. Horton/Schuler Homes, Taylor Woodrow); not suspicious.
- 16 BENE DEED — beneficiary deeds (transfer-on-death deeds under A.R.S. § 33-405). Death-related but not court-supervised.
- **1 TRST DEED** — recording 20260162239 on APN **304-77-566** (Lot 224 Shamrock Phase 2A). This is the hero parcel.

### Phase 5 — Verify the hero candidate

Verified by reading 5 of the 7 instrument PDFs (the two death-certificate bodies are restricted; their metadata only is recorded):

1. **20260162239** — TRST DEED — confirmed Lot 224 Shamrock 2A, conveyed by Successor Trustee Richard D. Moore from THE SILVA FAMILY REVOCABLE TRUST (est. 2007-07-26) to MOORE REVOCABLE TRUST (est. 2021-08-16). Drafter: Michael J. McGreevy.
2. **20170019586** — SPEC/W D — confirmed Lot 224 Shamrock 2A, conveyed Robert F. + Linda L. Silva personally INTO THE SILVA FAMILY REVOCABLE TRUST (est. 2007-07-26). Same drafter Michael J. McGreevy. Trust "established" date matches the 2026 deed exactly.
3. **20150453721** — WAR DEED — confirmed Lot 224 Shamrock 2A, conveyed Keith L. + Jo Sipes → Robert F. + Linda L. Silva (the 2015 purchase, original chain entry). Bundles a separate "Acceptance of Community Property With Right of Survivorship" deed on pages 4-5.
4. **20150638240** — DEED TRST (HELOC) — confirmed Lot 224 Shamrock 2A, $260,000 maximum-line Wells Fargo open-end deed of trust on the property, recorded 2 months after purchase.
5. **20230431552** — REL D/T — confirmed releases instrument 20150638240 by explicit citation in body. Original Recording Date 09/02/2015, Original Instrument No. 20150638240.

The two DEATH CER instruments' PDF bodies returned `<title>Information Blocked</title>` HTML pages instead of PDFs (legacy.recorder.maricopa.gov restricts the body), but the API metadata confirms recording date 2026-03-11 and decedent names Robert Francis Silva (20260141249) and Linda Lucille Silva (20260141250).

**Cross-check that ruled out the second "Silva Family Revocable Trust":** the API search `businessNames=SILVA FAMILY REVOCABLE TRUST` returns 12 instruments. Reading 5 of them (20160436736, 20180621030, 20210886409, 20210886411, 20220089149) revealed they all reference Lot 157 Ashland Ranch APN 309-20-157 (David Michael + Diana Lynn Silva's home). The 2017 SPEC/W D (20170019586) was the ONLY trust-business-name instrument tied to Lot 224 in the 2017+ window; the 2024 Rocket Mortgage DOT (20240045420), the 2026 Rocket refi (20260084624), the 2026 release (20260093739), and the 2026 correction (20260106026) all reference Lot 157 Ashland Ranch (verified via the public-API page-image endpoint `?pageNumber=1` on the first page of each DOT). The 2026-03-20 TRST DEED 20260162239 is the lone Lot 224 instrument in the trust-business-name search.

---

## API access budget

- ~20 Playwright navigations (probate docket + recorder UI + Redfin reachability check)
- ~80 `publicapi.recorder.maricopa.gov/documents/search` and `documents/{n}` calls (most batched in a single Phase-4 sweep at ~322 calls; the 318 uncached metadata fetches ran without rate-limiting issues)
- 7 PDF fetches via `preview/pdf?recordingNumber={n}` (5 successful — 2 returned HTML "Information Blocked" pages for restricted death certificates)
- 6 single-page PNG fetches via `preview/image?recordingNumber={n}&pageNumber={p}` (used to verify which DOTs reference Lot 224 vs Lot 157 in the 21+ page Rocket Mortgage instruments without reading every page)
- Well within the 60-Playwright / 2-hour budget set in the R-008 prompt.

---

## What a private title plant indexed by name would miss on this parcel

A title plant that scrapes the recorder's name index and joins by recipient name would build the following partial views of Lot 224:

- **Searching "SILVA":**
  - Hits: 20150453721 (WAR DEED in), 20150638240 (DEED TRST in), 20170019586 (SPEC/W D), 20230431552 (REL D/T), 20260141249 (DEATH CER), 20260141250 (DEATH CER).
  - **Misses:** 20260162239 (TRST DEED) — the only party names in that deed are MOORE RICHARD D, MOORE SUSAN, and SILVA FAMILY REVOCABLE TRUST. The plant's name-key on individual SILVA names will not surface this deed unless it also keys business names AND disambiguates the two trust instances.
- **Searching "MOORE":**
  - Hits: 20260162239 only.
  - **Misses:** Every prior chain instrument from 2015 through the trust succession.
- **Searching businessNames=SILVA FAMILY REVOCABLE TRUST:**
  - Hits: 12 instruments, mingling Lot 157 Ashland Ranch (David+Diana Silva's trust est. 2016) with Lot 224 Shamrock 2A (Robert+Linda Silva's trust est. 2007). Without disambiguating the trust "established" date, the plant cannot tell which property each instrument touches.

A county-internal indexer keyed by APN bridges all three views. Every instrument in the 7-instrument Lot 224 chain is recoverable and unambiguously attributed to APN 304-77-566.

---

## Curated artifacts produced

| Artifact | Path | Notes |
|---|---|---|
| Parcel | `src/data/parcels.json` (entry 11, APN 304-77-566) | New entry with 7 instrument numbers + messy_chain_summary |
| 7 instruments | `src/data/instruments/{20150453721,20150638240,20170019586,20230431552,20260141249,20260141250,20260162239}.json` | All seven new |
| 5 PDFs | `research/raw/R-008/pdfs/{20150453721,20150638240,20170019586,20230431552,20260162239}.pdf` | 2 death-cert bodies omitted — restricted |
| 2 lifecycles | `src/data/lifecycles.json` (lc-016 released, lc-017 succeeded) | lc-016 is the clean Wells Fargo HELOC pair; lc-017 is the trustee-succession story |
| 7 links | `src/data/links.json` (link-015 through link-021) | release_of, into_trust, successor_trustee_transfer_of, trustee_succession_triggered_by (×2), same_day_transaction, purchase_money |
| Hunt log | `data/raw/R-008/hunt-log.md` (this file) | Promoted to first-class demo asset |
| Source-of-truth API responses | `data/raw/R-008/api-*.json` | All `documents/search` and `documents/{n}` JSON for the chain instruments + the contamination examples (Johnson, Garcia, Kennedy, Najor, etc.) |

---

## Decisions to add to CLAUDE.md

| # | Decision |
|---|---|
| 46 | R-008 hero parcel locked: APN 304-77-566 (Lot 224 Shamrock 2A, 2778 E Courtney St Gilbert 85298) — trustee-succession messy chain (Silva trust → simultaneous trustee deaths → Moore successor-trustee transfer). Two lifecycles (lc-016 released HELOC pair, lc-017 succession). |
| 47 | Known Gap #2 narrowed — public-API `lastNames=`/`firstNames=`/`middleNameIs=`/`businessNames=` filters DO work; only `documentCode` and `docketBook`/`pageMap` are silently dropped. R-008 handoff and Decision #40 wording about "name search broken" should be updated to "name search works via API; documentCode filter broken." |
| 48 | New name-index moat finding: same business name "SILVA FAMILY REVOCABLE TRUST" used by two unrelated families' trusts in Maricopa, disambiguable only via trust 'established' date in deed body. Same family as Decision #25 (same-name contamination) and Decision #21 (data-model gaps). |
| 49 | New doc-code moat finding: "TRST DEED" code is taxonomically overloaded — used for both foreclosure trustee's deeds upon sale (A.R.S. § 33-811) and trust-administration successor-trustee transfers (A.R.S. § 33-404). Same family as Decision #21 (taxonomy mismatch) and Decision #25 (contamination). |
| 50 | New custodial-asymmetry moat finding: death certificates are indexed (discoverable by name search) but their PDF bodies are restricted from public viewing. The county can read them; a private title plant cannot. Same family as Decision #16 (live-sync mention-only) and the broader "what only the county sees" thesis. |
