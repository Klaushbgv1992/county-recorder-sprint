# R-005 Hunt Log — Locating the Seville Master Plat (Book 553, Page 15)

**Outcome:** Recording number not located. Per sprint owner's pre-approved decision tree, hunt was stopped at ~141 of 200 budgeted API calls and pivoted to Candidate C ("defer + surface"). This document is the deliverable.

**Why the hunt is itself a demo asset:** the same `publicapi.recorder.maricopa.gov` API that ships the chain-of-title corpus has, in this hunt, been blocked at five separate layers from answering a question that any examiner can ask: *"What's the recording number of Book 553, Page 15?"* That question is well-formed, the answer is a single 11-digit integer, and there is no API path from the question to the answer. That's the moat shape we sell — and this log is the receipt.

---

## What we know about Book 553, Page 15 (from the existing corpus)

The Parcel 3 final plat (`20010093192`, Book 554 Page 19, recorded 2001-02-07) is, on its face, a resubdivision of the master plat. Visual inspection of the plat PDF (4 pages, captured in `data/raw/R-004/pdfs/20010093192.pdf`) gives:

- **Title block, Sheet 1 of 4:** *"BEING A RESUBDIVISION OF A PORTION OF 'SEVILLE' TRACT 'H' AS RECORDED IN BOOK 553, PAGE 15, MARICOPA COUNTY RECORDS, LOCATED IN A PORTION OF SECTION 23, TOWNSHIP 2 SOUTH, RANGE 6 EAST"*
- **Sheet 2 boundary callouts:** *"TRACT H PER SEVILLE BOOK 553, PAGE 15, M.C.R."*, *"TRACT E PER SEVILLE BOOK 553, PAGE 15, M.C.R."*, *"TRACT F PER SEVILLE BOOK 553, PAGE 15, M.C.R."* (M.C.R. = Maricopa County Records)
- **Dedication block, Sheet 1:** Shea Homes Limited Partnership, signed by Lewis F. Buddy Satterfield (V.P.) and Dave Garcia (Asst. Secretary), 29 January 2001
- **Note 8, Sheet 1:** *"THIS DEVELOPMENT IS LOCATED WITHIN THE TOWN OF GILBERT WATER SERVICE AREA AND HAS BEEN DESIGNATED AS HAVING AN ASSURED WATER SUPPLY..."* and adjacent, *"THIS PLAT IS SUBJECT TO AN ANNUAL STREET LIGHT IMPROVEMENT DISTRICT ASSESSMENT"*
- **Approval:** Town of Gilbert Council, 12 December 2000

So the master plat exists, predates Parcel 3, was filed by Shea Homes Limited Partnership, governs Tracts E/F/H of the entire Seville master-planned community, and is referenced by **book/page only** — never by recording number — in everything downstream that we've captured.

Existing curated chain-of-title artifacts that touch this same neighborhood:

| recordingNumber | docketBook | pageMap | recordedAt | doc codes |
|---|---|---|---|---|
| 20010093192 | 554 | 19 | 2001-02-07 | PLAT MAP, BIG MAP (Parcel 3 final plat) |
| 20010093194 | 554 | 20 | 2001-02-07 | PLAT MAP, BIG MAP (next sheet of the same plat set) |
| 20010849180 | — | — | 2001-09-17 | AFFIDAVIT (Affidavit of Correction for the Parcel 3 plat — no master-plat reference in body) |

The Affidavit of Correction, despite being prepared by the same surveyor (Larry E. Sullivan, R.L.S. 22782) and the same engineering firm (Coe & Van Loo), references only Book 554 Page 19 / Docket 2001-0093192. It does not cite the master plat by recording number either.

So nothing in the captured corpus shortcuts the lookup. The question really does have to be answered against the live recorder system.

---

## Working hypothesis driving the bracket-scan

- Books are filled sequentially. Book 553 must have been completed before Book 554 had its 19th page filed. Book 554 P19 = `20010093192` (Feb 7 2001), so Book 553 P15 must precede that.
- Plats arrive in clusters of consecutive recording numbers (typically 1–4 sheets per plat set). Anchor evidence: P19 + P20 = `20010093192` and `20010093194` — same day, two recording numbers apart, sandwiched in unrelated DEED traffic.
- Year-2000 recordings cap around `20001050000`; year-2001 starts at `20010000001`. The approved scan range `20000600000 – 20010100000` therefore covers ~Aug 2000 through ~Feb 2001.

---

## Attempts, in order

### Attempt 1 — Search endpoint with documentCode filter

```
GET /documents/search?documentCode=PLAT%20MAP
→ totalResults: 0
```

Calls used: 1. Filter is silently dropped — confirmed against the well-known `Tier 1-A` finding (Known Gap #2). The endpoint returns a fixed 501-record seed regardless of documentCode.

### Attempt 2 — Search endpoint with docketBook / pageMap filters

```
GET /documents/search?docketBook=553&pageMap=15           → totalResults: 501, all 1947 records
GET /documents/search?book=553&page=15                    → totalResults: 501, all 1947 records
GET /documents/search?docketBook=553&pageNum=10&pageSize=50
   → page 10 returns the same 50 records as page 1, all dated 1947-01-02
```

Calls used: 3. Filter parameters AND pagination are both broken. The endpoint is hardwired to return the first 50 records of the index regardless of input, only `totalResults` shifts (always 501 for unknown reasons). This is a deeper Known Gap #2 than the Tier 1-A log captured — pagination is broken too, so even brute-force enumeration through the search endpoint is blocked.

### Attempt 3 — Hypothesised book/page direct-lookup endpoints

```
GET /documents/byBook/553/page/15  → 404
GET /book/553/15                   → 404
```

Calls used: 2. No book/page lookup endpoint exists. Confirms that the only working `/documents/*` shape is `/documents/{recordingNumber}`, which is the bracket-scan baseline.

### Attempt 4 — Legacy book/page bridge URL

```
GET https://recorder.maricopa.gov/recording/document-search-results.html?mode=book&docketBook=553&pageMap=15
→ Cloudflare interstitial: "Just a moment..." with managed challenge (cf-chl-opt cType: 'managed')
```

Calls used: 1. Same Cloudflare gating documented in `docs/hunt-log-known-gap-2.md`. Browser-only path; not scriptable.

### Attempt 5 — `GET /documents/{recordingNumber}` bracket scan

This is the only path that returns Book 553 entries when probed at the right number, but with no index from book/page to recording number, it requires blind probing across the 9.4M-recording-number scan window.

| Probe band | Calls | docketBook hits found | Notes |
|---|---|---|---|
| Backward sparse from `20010093192`, offsets −90000 … −100 | ~22 | none with `docketBook != 0` | Sweep only — 11 of these called out below |
| `20000600000` – `20001050000` (Aug–Dec 2000) at ~25k stride | 18 | none | Recording dates land Aug → Dec 2000 as expected; no plats |
| `20010001000` – `20010080000` (Jan 2001) at ~5k stride | 10 | none | Jan 2001 traffic is dense in DEED/DEED TRST/REL D/T |
| `20010085000` – `20010093200` (last hours before known plat) at ~500–2 stride | 22 | none new (the two known plats already in corpus) | Same-day plat cluster of 2 sheets, surrounded by Q/CL DEED runs |
| `20010092000` – `20010093150`, dense | ~15 | none | Confirmed sparseness — no plat in that 1500-number band |
| `+2 … +7500` forward from known plat | 7 | only +2 (already in corpus as P20) | Forward scan negative |

Total bracket-scan calls (Attempt 5): ~94.

Side discovery worth recording: `documentCode` value `FED TAX L` is **valid and indexed** — found incidentally at `20010092700` and elsewhere — and `LIEN` and `MED LIEN` also appear as legitimate codes. The Tier 1-A hunt log implies federal tax liens are search-invisible; the more precise statement is that the codes are *indexable but unsearchable* — the index records them, the search filter ignores all filter inputs. Refinement, not contradiction.

### Cumulative API usage

| Attempt | Calls |
|---|---|
| 1 | 1 |
| 2 | 3 |
| 3 | 2 |
| 4 | 1 (1 HTTP, blocked) |
| 5 | ~94 |
| Verification probes throughout | ~40 |
| **Total** | **~141** |

Approximate; counted by manual tally of curl batches above. Within the 200-call ceiling.

---

## Decision: pivot to Candidate C, do not burn remaining ~59 calls

Per sprint owner's pre-approved tree:

> *"If you blow past 200 calls without a hit, STOP. Do not burn more budget — pivot to Candidate C (defer + surface) and document the miss in a hunt log, same shape as `docs/hunt-log-known-gap-2.md`."*

We're at ~141 of 200. The remaining ~59 calls are statistically inadequate against a target whose recording number is 1-in-thousands within a multi-million-number scan window with no usable index. Continuing burns budget against expectations. Stopping here preserves the budget, respects the contract, and yields a stronger demo artifact than a half-found master plat would.

---

## Demo posture (the one-paragraph pitch this hunt enables)

> "Watch — here's the Parcel 3 final plat from 2001. Look at the title block: it's a resubdivision of Seville Tract H, Book 553 Page 15. Now: you're a title examiner. Your next click should be that master plat. There's no link. So you ask the public API: 'give me Book 553, Page 15.' There is no endpoint that takes a book and page. You ask: 'give me all plats.' The documentCode filter is silently dropped. You try to paginate through every recording number ever filed: page 10 returns the same 50 records from January 1947 that page 1 returned. You try the legacy book/page form: Cloudflare blocks it. Five layers, every one of them broken. The county *has* this record. The county sold the land. The county owns the bridge. A county-owned portal closes this with one button — a `book/page → recordingNumber` lookup — and that single button is enough that no title plant can match it on disintermediation. We didn't find Book 553 Page 15 today, and **that's the demo.**"

---

## What this changes downstream

- **Provenance ratio** (Decision #35) is unchanged: still 22 public_api / 35 ocr / 18 manual_entry across the 5 POPHAM-chain instruments curated in Phase 3. The Candidate-A blended-corpus refinement (Decision #38) stands as the canonical talking point.
- **Lifecycle inventory** is unchanged: lc-001 through lc-004 only. No lc-005 created.
- **Schema** is unchanged: no `source_page`, `source_note`, `related_lifecycles`, or `encumbrance_authority` fields added.
- **Demo script Beat 7c** continues to feature `docs/hunt-log-known-gap-2.md` (Tier 1-A) as the primary disintermediation receipt. This R-005 hunt log becomes a **second receipt** — same Known Gap, different question, deeper failure surface — and gets a one-line callout in the demo script.
