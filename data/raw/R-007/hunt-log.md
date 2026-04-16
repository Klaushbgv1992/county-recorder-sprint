# R-007 Hunt Log — LORANCE Predecessor Deed (P4)

**Date:** 2026-04-15  
**Goal:** Find the instrument that conveyed Lot 348, Shamrock Estates Phase 2A (APN 304-77-689) to ROBERT S LORANCE before the 2015 HOGUE purchase.  
**Result:** NOT FOUND — Known Gap #2 (third demonstration)  
**Calls used:** ~12 (bracket scan + endpoint discovery)

---

## Context

The HOGUE parcel (304-77-689) has two curated instruments:
- **20150516729** — WARRANTY DEED, LORANCE ROBERT S (An Unmarried Man) → JASON & MICHELE HOGUE, dated June 16, 2015
- **20150516730** — DEED OF TRUST, HOGUE (borrowers), PINNACLE CAPITAL MORTGAGE LLC

Sprint goal was to extend the HOGUE chain to 3 links by finding the deed that conveyed Lot 348 to LORANCE — ideally showing LORANCE buying from the original Shamrock Estates builder (KB Home, Centex, or similar), which would add a second subdivision-origin transaction to the corpus.

---

## Attempts

### 1. Maricopa Assessor — Prior Deed History
`https://mcassessor.maricopa.gov/mcs/?q=30477689&mod=pd`  
Result: Shows only current deed (20150516729, HOGUE). No prior owner history on the assessor parcel detail page.

### 2. Maricopa Assessor — Sales History Variant
`https://mcassessor.maricopa.gov/mcs/?q=30477689&mod=sales`  
Result: Returns assessor homepage — `mod=sales` parameter not recognized.

### 3. Maricopa Recorder — Name Search (Known Gap #2)
`https://publicapi.recorder.maricopa.gov/documents/search?names=LORANCE+ROBERT+S`  
Result: Returns 1947 seed records (recording numbers 19470000001–19470000020) with empty names arrays. The `names` filter is silently dropped by the recorder API. Identical behavior to R-004 (2023 lien hunt) and R-005 (Seville master plat hunt).

### 4. Assessor→Recorder Bridge — Plat Book/Page
`https://recorder.maricopa.gov/recording/document-search-results.html?mode=book&docketBook=799&pageMap=38`  
Result: HTTP 403 — Cloudflare-gated. Known to be inaccessible (same failure documented in R-005 for legacy book/page bridge).

### 5. Public API — Parcel Endpoint Discovery
`https://publicapi.recorder.maricopa.gov/parcel/30477689`  
Result: HTTP 404 — endpoint does not exist.

### 6. Assessor — Deed History Variant
`https://mcassessor.maricopa.gov/mcs/?q=30477689&mod=deed`  
Result: Returns assessor homepage — `mod=deed` parameter not recognized.

### 7. Bracket Scan — Shamrock Estates Era (2005–2010)
Probed 6 recording numbers in estimated ranges for when LORANCE would have purchased:
- 20050473000 (2005-04-13): DEED TRST, Nardi/Wells Fargo — unrelated
- 20050700000 (2005-05-26): CORR D/T, Lever/First Magnus — unrelated
- 20060500000 (2006-04-13): DEED TRST, Budd/San Diego Cornerstone — unrelated
- 20070500000 (2007-04-30): WAR DEED, Burnett/Hoe — unrelated
- 20080500000 (2008-06-05): N/TR SALE, Anderson/ReconTrust/Wells Fargo — unrelated
- 20100400000 (2010-05-11): MUNI DOC ASSIGNMNT, Mitchell/MERS — unrelated

All bracket points returned unrelated Maricopa County instruments. Without an indexed search by parcel/address, finding 1 specific deed among ~2,500 daily recordings requires thousands of probes.

### 8. Physical Deed Review
Read the existing HOGUE purchase deed PDF (20150516729, already in corpus at `data/raw/R-003/pdfs/20150516729.pdf`). The deed is a bare-form warranty deed with no prior recording number cited. Legal description: "Lot 348, of SHAMROCK ESTATES PHASE 2A ... BOOK 799 OF MAPS, PAGE 38." No back-reference to predecessor deed.

---

## Known Gap #2 Surface Area — This Hunt vs. Prior Hunts

| Hunt | Question | API Layers Blocked |
|------|----------|-------------------|
| R-004 (Tier 1-A) | Federal tax liens against POPHAM name | names filter dropped, date filter dropped, modern UI Cloudflare-gated, legacy UI requires __VIEWSTATE replay |
| R-005 (Tier 1-B) | Seville master plat (Book 553, Page 15) | documentCode filter dropped, docketBook/pageMap filters dropped, pagination broken (page 10 = page 1), hypothesized book/page endpoints 404, legacy bridge Cloudflare-gated |
| **R-007 (H1 P4)** | **Predecessor deed for 304-77-689 (LORANCE)** | **names filter dropped, assessor no prior-owner history, bridge URL 403, parcel endpoint 404, bracket scan infeasible** |

---

## Demo Implication

This failure closes the same moat argument as R-004 and R-005:

> "Who owned this property before LORANCE?" is a question every title examiner must answer. The Maricopa public API cannot answer it without a working name-indexed search or parcel-scoped document lookup. The county's internal system has both. That's the moat.

The HOGUE chain remains at 2 instruments (LORANCE → HOGUE). This is honest: the predecessor link exists in the public record but is unreachable via the API.

---

## Recommendation

Surface this as a third Beat 7c asset alongside the R-004 and R-005 hunt logs in the demo script. Three independent hunts, three identical blockers, three demonstrations of the same structural gap.
