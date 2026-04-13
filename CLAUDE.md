# County Recorder AI-Enhanced Search Portal — Sprint Context

## Mission
Deliver a credible working prototype and demo story for an AI-enhanced county recorder search portal aimed at residential title examiners and abstractors. The demo must feel like title work product, not a document browser with AI sprinkled on top.

## Three Claims to Prove
1. Practitioner-level understanding of title workflow (click-by-click examiner chain reconstruction)
2. AI turns passive recorded documents into structured linked title work (chain assembly, release matching, provenance)
3. County-owned portal beats title plants via custodial moat (authoritative provenance, pipeline status, verified-through dates)

## Hard Constraints
- 2-day build window
- 1 primary + 1 backup county
- 1 primary + 1 backup parcel
- Manual curation preferred over flaky automation
- Serve captured source documents locally (no live portal dependency)
- Out of scope: cross-county search, intake, payments, internal ops, general platform features

## Target User
Residential title examiner / abstractor

## Mandatory Screens (build priority order)
1. Search Entry
2. Chain-of-Title Timeline
3. Encumbrance Lifecycle Panel
4. Parcel Dossier
5. Document Proof Drawer

## County Selection
- **Primary:** Maricopa AZ (CONFIRMED via R-001 — free images to 1974, public API discovered)
- **Backup:** Clark NV
- **Skipped:** Salt Lake UT, Franklin OH (only scout if both primary + backup fail)
- **Auto-flip rule:** If Maricopa images are paywalled or require account creation, flip to Clark without roundtrip — log in decision table

## Parcel Selection
- **Primary:** 304-78-386 — 3674 E Palmer St, Gilbert — POPHAM CHRISTOPHER/ASHLEY — Seville Parcel 3
- **Backup:** 304-77-689 — 2715 E Palmer St, Gilbert — HOGUE JASON/MICHELE — Shamrock Estates Ph 2A
- **Dropped:** 304-78-400 — GARCIA — no DOT in 2020-2022 window

## Decision Log
| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | Project scaffold created | Phase 0 setup | 2026-04-13 |
| 2 | Primary county: Maricopa AZ | Highest confidence on free images, clean metadata, DOT-state terminology, massive residential volume, strong assessor-APN bridge | 2026-04-13 |
| 3 | Backup county: Clark NV | Same DOT-state advantage, fallback if Maricopa images paywalled | 2026-04-13 |
| 4 | Skip Salt Lake UT + Franklin OH scouting | Saves 2 handoffs / half day. Only scout if both Maricopa + Clark fail. | 2026-04-13 |
| 5 | Auto-flip rule on image access | If R-001 shows paywalled/account-gated images, flip to Clark immediately without asking | 2026-04-13 |
| 6 | Hero scenario: refinance pattern IS the target | Chase refi pattern (guarantees Scenario B min), not Scenario A directly. Unreleased DOT is upside, not goal. | 2026-04-13 |
| 7 | Refi window: 2020-2022 | Rate bottoms drove volume; balances reconveyance-lag plausibility vs demo credibility. 2023+ too recent. | 2026-04-13 |
| 8 | HELOCs/2nd DOTs: bonus not disqualifier | Second lifecycle more likely to have ambiguous release. Prioritize if found, don't hunt. | 2026-04-13 |
| 9 | Exclude NOD/Trustee Sale/REO parcels | Bankruptcy/court-order noise outside residential examiner normal workflow | 2026-04-13 |
| 10 | R-001 must capture image lookback depth | If images only go to ~2005, parcel selection must account for it | 2026-04-13 |
| 11 | 4-screen firm commitment, Dossier is stretch | ~11.5h budget for Search + Chain + Encumbrance + Proof Drawer. Dossier only if Day 2 morning ahead of schedule. | 2026-04-13 |
| 12 | County moat locked on Screen 3 from start | Verified-through + pipeline status always on Encumbrance Lifecycle, not conditional on Dossier | 2026-04-13 |
| 13 | Proof Drawer schema fields baked into instruments.json from Phase 3 | Local image paths, extracted-field JSON, provenance tags, confidence scores, instrument→image bridge | 2026-04-13 |
| 14 | Measurable-win numbers from handoff evidence | "Before" counts (searches, tabs, pain points) captured during Phase 1-2 research, not invented on Day 2 | 2026-04-13 |
| 15 | Name normalization / entity resolution: mention-only | Verbal reference in demo, zero code. Single most time-consuming examiner task. | 2026-04-13 |
| 16 | Data freshness / live sync: mention-only | Prototype uses snapshot. Production syncs real-time — that's the moat narrative. | 2026-04-13 |
| 17 | Confidence scores hand-assigned during curation | No model-based confidence estimation in prototype | 2026-04-13 |
| 18 | R-001: Maricopa CONFIRMED — all 5 criteria pass | Free images to 1974, public REST API discovered, 272 doc types, name index 1871-2026 | 2026-04-13 |
| 19 | DATA-MODEL: No grantor/grantee distinction in Maricopa API | names[] is flat array, no roles. Grantor/grantee assignment is always `manual_entry` provenance. Demo-strengthening gap. | 2026-04-13 |
| 20 | DATA-MODEL: No legal description in structured data | Only in PDF body. Every legal description is `manual_entry` or `ai_extraction`, never `index_metadata`. | 2026-04-13 |
| 21 | DATA-MODEL: No APN in recorder system | Assessor→recorder link is one-way via legacy docketBook/pageMap. No bidirectional APN bridge. This IS the moat moment — prototype fixes this gap. | 2026-04-13 |
| 22 | Public API: publicapi.recorder.maricopa.gov | Undocumented REST API, no auth, JSON metadata + deterministic PDF/PNG URLs. Disintermediation thesis verified. | 2026-04-13 |
| 23 | R-002 v1 reconnaissance complete, hunting scope narrowed | Street+city search strategy discovered (subdivision search too noisy). 10 APNs pre-qualified on E Palmer St Gilbert. Splitting R-002 into v2 (3 specific APNs) + API verification via curl. | 2026-04-13 |
| 24 | Parcel lock: POPHAM primary, HOGUE backup, GARCIA dropped | POPHAM 304-78-386 primary (2021 DOT w/ 3-day release, living trust purchase, UCC filing). HOGUE 304-77-689 backup (2020 DOT, more same-name noise). GARCIA 304-78-400 dropped (no DOT in 2020-2022 window). | 2026-04-13 |
| 25 | Same-name instrument contamination finding | Recorder name search returns instruments from ALL properties owned by a person. Phase 3 curation must scrub. This is a demo-strengthening finding — concrete proof that parcel-keyed indexing beats name-based search. | 2026-04-13 |
| 26 | Curation rule A: parcel attribution | An instrument belongs to the locked parcel only if its names list includes the parcel's owner AND at least one other party appears on a prior/subsequent deed in the DEED-button-confirmed chain. | 2026-04-13 |
| 27 | Curation rule B: same-day transaction linking | Same-day recording number groups (e.g., WAR DEED + DEED TRST) are linked transactions. The DEED TRST is the financing for that deed. | 2026-04-13 |
| 28 | POPHAM selected primary over HOGUE | (a) 2021 DOT has 3-day release creating clean lifecycle pair, (b) purchase from living trust adds legal nuance, (c) UCC filing chain is demo-differentiating, (d) HOGUE has more same-name contamination. | 2026-04-13 |
| 29 | DOT name ordering unreliable for role inference | Public API returns DOT names alphabetized by entity, not grantor-first. Role inference from name order works for deed-to-deed but fails for DOTs with institutional parties (trustee, MERS, lender, borrower all interleaved). Prototype uses manual curation for the 5 POPHAM instruments. Production would need document-type heuristics (DEED TRST → individual name is borrower, institutional name is lender) plus OCR fallback on the PDF body. This is a known scope limit, not a bug. | 2026-04-13 |
| 30 | Trust name truncation handled in Phase 2 via OCR, not Phase 3 via hand-typing | Public API truncates long entity names at ~53 chars. Recovering via OCR during corpus download keeps displayed data traceable to source. Hand-typing during curation would create provenance gaps. | 2026-04-13 |

## Active Skill State
- **Current Phase:** Phase 1 — County + Parcel Lock
- **Active Skill:** executing-plans
- **Brainstorm Sign-off:** approved (2026-04-13)
- **Plan Sign-off:** approved (2026-04-13) — 6 fixes applied (Tailwind v4, resolveLifecycleStatus, time budget, copy-cite verified, test rename, measurable-win rule)

## Research Request Tracker
| ID | Phase | Status | Summary |
|----|-------|--------|---------|
| R-001 | 1 | COMPLETE | Maricopa portal scout — all 5 criteria pass, public API discovered, 1974 lookback |

## Schema Notes (pre-Phase 3)
- Grantor/grantee provenance is ALWAYS `manual_entry` for Maricopa data (flat names[] in API)
- Legal description provenance is ALWAYS `manual_entry` or `ai_extraction` (not in structured data)
- No APN cross-reference in recorder — assessor bridge is manual curation
- Schema update deferred to Phase 3 Task 3.2

## Terminology Notes (Maricopa AZ)
- **Instrument number format:** 11 digits, YYYY + 7-digit sequence, no separators (e.g., 20210234567)
- **Recording date format (API):** M-D-YYYY (no leading zeros) — normalize to YYYY-MM-DD
- **Name index coverage:** 1871-06-01 through 2026-04-09
- **Corpus boundary date:** 2026-04-09
- **APN format:** NNN-NN-NNN[X] (e.g., 112-19-038A). URL form strips dashes.
- **Document types (deed family):** DEED/USE WITH ANY GENERAL DEED TYPE, GRANT DEED, QUIT CLAIM DEED, JOINT TENANCY DEED, BARGAIN AND SALE DEED, BENEFICIARY DEED, COMMUNITY PROPERTY DEED, DEED OF TRUST, ASSIGNMENT OF DEED OF TRUST, DEED OF RELEASE & FULL RECONVEYANCE OF D/TR, + others (272 total codes)
- **Release label:** "DEED OF RELEASE & FULL RECONVEYANCE OF D/TR"
- **Assignment label:** "ASSIGNMENT OF DEED OF TRUST"
- **Image formats:** PDF (all pages) or PNG (per page). "Unofficial Document" watermark.
- **Image lookback depth:** April 1974 (confirmed)
- **Additional document codes (from R-002 API verification):**
  - **REL D/T** → "Release of Deed of Trust" (UI dropdown label: "DEED OF RELEASE & FULL RECONVEYANCE OF D/TR"). The API returns the short code while the UI dropdown uses the long form — another instance of the backend/UI taxonomy mismatch already logged in Decision #21.
  - **T FIN ST** → "Termination of Financing Statement" (UCC-3 termination). In the POPHAM chain this terminated a SunPower solar lease UCC filing.
  - **AF DISCLS** → "Affidavit of Disclosure" (Arizona A.R.S. § 33-422 seller disclosure affidavit, often recorded alongside rural deeds).

## Key Endpoints
- Recorder API: `https://publicapi.recorder.maricopa.gov`
  - `GET /documents/{recordingNumber}` → JSON metadata
  - `GET /preview/pdf?recordingNumber={id}` → full PDF
  - `GET /preview/image?recordingNumber={id}&page={n}` → page PNG
- Legacy static: `https://legacy.recorder.maricopa.gov/UnOfficialDocs/pdf/{recordingNumber}.pdf` (recent only)
- Assessor: `https://mcassessor.maricopa.gov/mcs/?q={APN-no-dashes}&mod=pd`
- Assessor→recorder: `https://recorder.maricopa.gov/recording/document-search-results.html?mode=book&docketBook={book}&pageMap={page}`
