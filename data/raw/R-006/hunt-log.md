# R-006 — ANGUS lien + release hunt

**Goal:** Locate (a) an HOA lien against ANGUS Lot 45 or Phoenix Vacation Houses LLC, and (b) a release/reconveyance of recording number 20200620457 (the ANGUS United Wholesale Mortgage DOT).
**Budget:** 15 minutes wall-clock, ~120 API calls.
**Endpoint:** `https://publicapi.recorder.maricopa.gov`
**Started:** 2026-04-17T14:05Z
**Ended:** 2026-04-17T14:07Z
**Total calls used:** 14
**Operator:** Sprint owner (inline, during Task 2 of the ANGUS lien + live matcher demo plan)

---

## Pre-hunt baseline

Confirmed the public API is reachable and the known ANGUS records still resolve against `/documents/{recordingNumber}`:

```
GET /documents/20200620456  →  200 OK
{
  "names": ["ANGUS SCOTT J", "PHOENIX VACATION HOUSES"],
  "documentCodes": ["Q/CL DEED"],
  "recordingDate": "7-13-2020",
  ...
}
```

Baseline confirms: the record-by-id endpoint works. Any failure to find the lien or the release is a *search* gap, not an *availability* gap.

---

## Sub-hunt 1 — ANGUS HOA lien

### Intended strategy
Bracket-walk `/documents/{n}` across 2021-09 through 2024-12 (~40 calls) filtering returned documents for `documentCodes: ASSOC LIEN | HOA LIEN | LIEN | MECHL LIEN | MED LIEN` and names containing ANGUS, PHOENIX VACATION HOUSES, or SEVILLE HOMEOWNERS.

### Actual finding: strategy infeasible at step 0

Without a server-side name or APN filter, random bracket-walking has a per-call hit probability on the order of 1:N where N ≈ 4,000 (docs per day) × 1,000 (days in the window) = 4,000,000. A 40-call random walk has effectively zero probability of landing on the right instrument.

Probed the following endpoints to confirm there is no filtered-search fallback:

```
GET /documents/search?name=PHOENIX%20VACATION%20HOUSES&limit=20   → 200 OK
GET /documents/search?name=SEVILLE%20HOMEOWNERS                    → 200 OK
GET /documents/search?documentCodes=ASSOC%20LIEN&limit=20          → 200 OK
GET /documents/search?recordingDate=2023-01-03&limit=5             → 200 OK
```

**All four responses were byte-for-byte identical**, returning the first page of the 1947-seeded record set (`recordingNumber: 19470000001` onward). The `/documents/search` endpoint silently drops every filter parameter — this is the exact failure mode recorded in Decision #40 (Tier 1-B Seville master plat hunt), reproduced in live form as of 2026-04-17.

Probed hypothesised alternate endpoints:

```
GET /names/ANGUS                            → 404 Not Found
GET /parties/ANGUS                          → 404 Not Found
GET /by-apn/304-78-367                      → 404 Not Found
GET /parcels/304-78-367                     → 404 Not Found
GET /apn/304-78-367                         → 404 Not Found
GET /documents/by-party?name=ANGUS          → 400 "Invalid recording number"
                                              (matched /documents/{recordingNumber} route
                                              and tried to parse "by-party" as an integer)
GET /documents/date/2023-01-03              → 404 Not Found
GET /documents?recordingDate=2023-01-03     → 404 Not Found
GET /search?date=2023-01-03                 → 404 Not Found
```

No alternate search facility exists on the public API. Combined with Decision #40's earlier finding that the modern recorder search UI is Cloudflare-gated and the legacy ASP.NET UI requires `__VIEWSTATE` replay, there is no practical public path from "Phoenix Vacation Houses LLC" or "Seville Homeowners Association" to a recording number in the post-2020 window.

### Outcome

**MISS — unambiguous.** No HOA lien located. Falls to spec Branch B: synthesize the lien, tag every field `demo_synthetic`, Proof Drawer amber banner disclosure, `source_note` reference to this hunt log.

---

## Sub-hunt 2 — Release of 20200620457 UWM DOT

### Intended strategy
Same bracket-walk window, filtering returned `documentCodes` for `REL D/T | SUBST TR | ASSIGN D/T` with names including ANGUS, PHOENIX VACATION HOUSES, or UNITED WHOLESALE MORTGAGE.

### Actual finding: same API gap, same infeasibility

The sub-hunt 1 probes ruled out any endpoint that accepts a name, document-code, or date filter. Sub-hunt 2 would hit the same wall — without a way to narrow to records mentioning UNITED WHOLESALE MORTGAGE or PHOENIX VACATION HOUSES, random bracket-walking does not have useful hit probability.

No additional calls were spent on sub-hunt 2. The API gap generalises across both sub-hunts, so the additional evidence would have been duplicative.

### Outcome

**MISS.** No reconveyance located for 20200620457. Falls to spec Branch D: lc-007 remains `open` with empty `child_instruments`, status rationale explicitly names this hunt. Matcher's `CandidateReleasesPanel` will render its cross-parcel empty-state moat note on lc-007 (pool = 0 reconveyances in ANGUS's corpus).

---

## Sub-hunt 3 — Any Seville Parcel 3 HOA-lien precedent

### Intended strategy
Backup evidence for the Branch B synthetic-lien framing — finding even one real HOA lien against any Seville Parcel 3 lot would let the synthetic lien's `source_note` say "pattern precedent: real record 20XXYYYYYY confirms that SEVILLE HOMEOWNERS ASSOCIATION does record liens against delinquent lots in this subdivision."

### Outcome

**MISS — same API gap.** No precedent found. Sub-hunts 1 and 2 already established that the public API does not support the kind of search sub-hunt 3 would need. The synthetic lien stands on the ownership-pattern reasoning already in the plan (investor / STR purchase on 2020-07-13 → HOA friction is a well-documented pattern in covenant-restricted Arizona subdivisions), without needing to cite a neighboring-lot precedent.

---

## Master outcome

| Sub-hunt | Outcome | Plan branch |
|----------|---------|-------------|
| 1 — ANGUS HOA lien | MISS | **Branch B** (synthetic lien) |
| 2 — Release of UWM DOT | MISS | **Branch D** (lc-007 open, matcher empty-state) |
| 3 — Seville Parcel 3 lien precedent | MISS | No source-note enhancement |

**Effective calls used:** 14 (four `/documents/{n}` baseline + ten endpoint probes). Well under budget — the hunt terminated on a structural finding rather than an exhaustion.

---

## What this proves for the demo

This hunt log is a first-class demo asset in the same family as `docs/hunt-log-known-gap-2.md` (Decision #38, federal tax lien hunt) and `data/raw/R-005/hunt-log.md` (Decision #40, Book 553 master plat hunt). Together they give three independent reproductions of Known Gap #2 — *the Maricopa public API exposes every filing but does not expose any way to search across filings*.

The synthetic ANGUS HOA lien that follows in Task 4 (Branch B) is not a compromise on data honesty. It is a demonstration of exactly the gap the moat thesis closes: a county-owned portal that *does* index spatially can surface "there is an open HOA lien on the lot next to yours" — which this public API cannot, even though the underlying record (were it real) would be sitting in the same `/documents/{n}` bucket as every other document the API serves.

The live-matcher demo that follows in Task 5 (Branch D) inherits the same framing: the matcher's `CandidateReleasesPanel` will render its cross-parcel empty-state note on ANGUS lc-007, and that empty state *is* the demonstration — the API cannot find a release against PHOENIX VACATION HOUSES LLC outside this parcel's corpus, so the matcher's moat note is strictly truthful.

---

## Notes for future hunters

- `/documents/search` returns HTTP 200 with a body that looks valid. Do not trust the 200. Compare the first `recordingNumber` in `searchResults` — if it's `19470000001`, your filter was silently dropped.
- There is no public API name index. Future hunts against this endpoint for a specific party should start by probing the search endpoint with a filter that *must* return zero results if honored (e.g., `name=ZZZZZZZZZZZ`); if the first recording number is still `19470000001`, abandon name-based strategies immediately.
- A county-internal name index would close every gap surfaced in R-004, R-005, and R-006. That internal tool is the moat.
