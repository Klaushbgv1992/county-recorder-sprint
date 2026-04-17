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
| 31 | R-003 corpus complete — 5 instruments, 3.4MB, all scanned image PDFs | No embedded text in any document — all are scanned images with "Unofficial Document" watermark. Text extraction requires OCR. Manual curation from visual inspection is consistent with manual-curation-preferred constraint. | 2026-04-13 |
| 32 | Trust name recovered: THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006 | Full name with execution date extracted from PDF page 1. API had truncated to 53 chars. Legal desc also recovered: Lot 46, 58 SEVILLE PARCEL 3, Book 554 Maps Page 19. | 2026-04-13 |
| 33 | Release executed by Wells Fargo / CAS Nationwide, not VIP Mortgage directly | 20210075858 shows VIP Mortgage loan was serviced or sold to Wells Fargo. MERS as beneficiary as nominee for VIP. Possible unrecorded ASSIGNMENT OF DEED OF TRUST — check in Phase 3 but not blocking. | 2026-04-13 |
| 34 | MERS beneficiary handling in Encumbrance Lifecycle Panel | 2013 DOT (20130183450) shows MERS as beneficiary as nominee for VIP Mortgage. Release (20210075858) executed by Wells Fargo via CAS Nationwide Title Clearing. No recorded assignment of DOT between VIP and Wells Fargo — note was transferred via MERS outside the public record. Display rule: show beneficiary as "MERS as nominee for VIP Mortgage" on the 2013 DOT, and display the release with the actual releasing party (Wells Fargo), not the originator. Add a small "MERS note" annotation explaining that the note may have transferred outside the public record. This is a prototype feature, not a bug — making MERS visible is itself a disintermediation talking point. | 2026-04-13 |
| 35 | Phase 3 complete, corpus provenance ratio locked | 5 POPHAM instruments curated and validated. Provenance split: 22 public_api (29%) / 35 ocr (47%) / 18 manual_entry (24%). This ratio is the core disintermediation talking point for the MLG pitch — the county provides a minority of the fields an examiner needs, OCR recovers another ~half from documents the county already hosts, and the remainder requires judgment the prototype demonstrates with hand curation. | 2026-04-13 |
| 36 | Deep-linkable routes via client-side react-router v7 | URL is source of truth for parcel + instrument navigation. `/parcel/:apn` and `/parcel/:apn/instrument/:n` are pasteable canonical addresses. `/instrument/:n` resolves client-side to the owning parcel via a resolver component — this produces a one-frame "Resolving instrument…" placeholder before redirect. A production version would use react-router loaders or a server-side 302 to eliminate the flash. Family: Decision #16 (snapshot vs live sync — server-side features stubbed in prototype). Sub-note: `src/router.tsx` exports `routes` but does not instantiate the browser router; that lives in `src/main.tsx` so `router.tsx` remains import-safe from vitest. | 2026-04-14 |
| 37 | Candidate release pool is parcel-local in the prototype | The release-candidate matcher runs against reconveyances in the same parcel's curated corpus only. A real missing release could live in an unrelated parcel's corpus if parcel attribution upstream was wrong. Cross-parcel search with strong guards (name-aware scoping, legal-description cross-check) is production scope, not prototype. Same family as Decisions #15 (name entity resolution mention-only) and #16 (data freshness mention-only). The HOGUE lc-003 empty-state rationale surfaces this limit inline as a moat demonstration — the public API cannot search for releases filed against a name outside the parcel; a county-internal full-name scan closes that gap. | 2026-04-14 |
| 38 | Tier 1-A pivot: lien hunt → Seville Parcel 3 subdivision encumbrances | 45-minute federal-tax-lien hunt against `publicapi.recorder.maricopa.gov` hit the exact structural blocker already documented as Known Gap #2 (no name- or code-filtered search, no functional date-range filter, modern search UI Cloudflare-gated, legacy UI ASP.NET WebForms needing `__VIEWSTATE` replay). Per sprint-owner directive, pivoted to recorded subdivision encumbrances already cited in POPHAM's legal description: the 2001 Affidavit of Correction (20010849180) and, via OCR of that affidavit's body text, the Seville Parcel 3 plat itself (20010093192, Book 554 Maps Page 19, SHEA HOMES dedicator). Both are now curated as POPHAM instruments and surfaced as lifecycle `lc-004`. The hunt log was promoted to `docs/hunt-log-known-gap-2.md` as a first-class demo asset (Beat 7c) — concrete disintermediation evidence you cannot fabricate. Rationale: the pivot produces a stronger demo than a replacement lien would have, because it *demonstrates* Known Gap #2 instead of asserting it. | 2026-04-14 |
| 39 | Tesseract OCR not available in `feature-lien-corpus` worktree environment | `which tesseract`, `pdftotext` (poppler text-extraction layer for image PDFs), and `python -c "import pytesseract"` all fail in this Windows worktree. All recorder PDFs in the corpus are scanned-image PDFs with no embedded text layer. Implication: any Tier 1-B-scope text recovery from a captured PDF must use visual transcription via the Read tool (multimodal PDF rendering) and be tagged `manual_entry` provenance with `source_page` + `source_note` traceability — not `ocr` provenance. Curation rule: do not invent provenance values; if a field came from visually reading the rendered page, it is `manual_entry`. | 2026-04-14 |
| 40 | Tier 1-B Seville Master Plat hunt: NOT FOUND, pivoted to Candidate C (defer + surface) | Sprint owner approved a 200-call API budget against `publicapi.recorder.maricopa.gov` to locate the recording number for "Book 553, Page 15" — the Seville master plat that the Parcel 3 final plat (20010093192) explicitly resubdivides ("BEING A RESUBDIVISION OF A PORTION OF SEVILLE TRACT H AS RECORDED IN BOOK 553, PAGE 15"). Hunt stopped at ~141 of 200 calls with zero hits. Five separate API layers blocked the lookup: (a) `documentCode` filter on `/documents/search` silently dropped, (b) `docketBook`/`pageMap` filters silently dropped, (c) `/documents/search` pagination broken (page 10 returns the same 1947 seed as page 1), (d) hypothesised `byBook/page` and `book/{n}/{p}` endpoints both 404, (e) legacy book/page bridge URL Cloudflare-gated. Bracket-scan of `GET /documents/{recordingNumber}` across ~94 sample points in the approved range `20000600000–20010100000` found no Book 553 plats — plats are 1-in-thousands sparse with no usable index. Per pre-approved decision tree, pivoted to Candidate C: the hunt itself is the deliverable. R-005 hunt log lives at `data/raw/R-005/hunt-log.md` and serves as a *second* disintermediation receipt to pair with Tier 1-A's `docs/hunt-log-known-gap-2.md` — same Known Gap #2, different question, deeper failure surface. No new lifecycle (lc-005), no new instrument JSON, no schema extension. Side discovery: `FED TAX L`, `LIEN`, and `MED LIEN` are valid documentCodes (refines but does not contradict Tier 1-A's framing of Known Gap #2 — the codes are indexable but unsearchable, because the search filter ignores all inputs). | 2026-04-14 |
| 41 | Linked lifecycles have no examiner-unlink action (Known Gap #15) | Accept on an open lifecycle creates an in-memory link (Gap #14). Rejecting or unlinking a *curated* link (status: `linked`, sourced from `src/data/links.json`) is intentionally not wired. Curated links represent the county's indexed record; disputing one is a QA workflow with audit trail and second-examiner sign-off in production, not an inline examiner action. The already-linked release renders the same matcher feature bars as a freshly-accepted candidate (`src/components/LinkEvidenceBars.tsx`), so the evidence for the link is visible without offering a one-click revocation. Same family as Decisions #16 (live sync mention-only) and #36 (server-side features stubbed). | 2026-04-14 |
| 42 | Commitment Export delivers the abstractor's actual deliverable | "Copy Citation" produces a single-instrument string; an abstractor produces a parcel-level chain-and-encumbrance abstract. New Export Commitment for Parcel button on Proof Drawer + Encumbrance panel emits a jsPDF document with Schedule A + Schedule B-II, inline (provenance, confidence) footnotes matching on-screen UI verbatim, county-authoritative PDF URLs cited per row, and per-instrument metadata URLs in a Sources block prefixed by recording number. Schedule B-I is intentionally absent (Known Gap #16) — the header note explains B-I is transaction-scoped and each open B-II row carries a Closing impact: sentence in lieu. | 2026-04-14 |
| 44 | Seeded Gilbert parcel polygons from Maricopa Assessor public GIS | Build-time fetch of 8,570 Gilbert/Chandler parcels via OBJECTID-based pagination against `gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0`. Every feature stamped with `source: "maricopa_assessor_public_gis"`, `source_url`, `captured_date: "2026-04-16"`. A.R.S. § 11-495 public record; attribution in `docs/data-provenance.md`. Gzipped 1,089 KB (49% of 2 MB budget). Post-fetch integrity assertion confirms all 5 curated APNs present. MapServer confirmed (FeatureServer returns 200-with-error-body — see Known Gap #2 family). Scripts at `scripts/fetch-gilbert-parcels.ts` + `scripts/lib/gilbert-fetch.ts` (16 unit tests). | 2026-04-16 |
| 45 | 5 Seville Parcel 3 neighbors with pre-fetched recorder-API responses + tiered drawer model | 14 `/documents/{n}` responses cached for 5 Seville neighbors (BROTHERTON 304-78-406, SCHERF 304-78-338, KALANITHI 304-78-369, SOMMERFELD 304-78-408, ANGUS 304-78-367). Selection frozen in `scripts/lib/neighbor-instruments.ts`. Variable instrument count (2–3 per APN, not exactly 3): ANGUS (lot 45, POPHAM's literal next-door neighbor) has 2 instruments; uniform counts would have been cherry-picking. Doc-type mix: WAR DEED ×5, DEED TRST ×5, T FIN ST ×3, DISCLAIMR ×1, Q/CL DEED ×1. Tiered drawer: `Curated · full chain` (5) / `Recorder · cached` (5) / `Assessor · public GIS` (~8,570). Owner autocomplete silently suppressed on assessor tier. Overlays: encumbrance (default ON), anomaly (OFF), lastdeed (OFF). URL state unified in `useLandingUrlState` (`?q`, `?apn`, `?overlay`). Research budget: ~60 API calls across ~20 candidates at 1s spacing (15% hit rate for 3-instrument sets — SolarCity UCC termination pattern). | 2026-04-16 |

## Active Skill State
- **Current Phase:** Phase 3 complete, ready for Phase 4: UI Build (Day 2)
- **Active Skill:** executing-plans
- **Brainstorm Sign-off:** approved (2026-04-13)
- **Plan Sign-off:** approved (2026-04-13) — 6 fixes applied (Tailwind v4, resolveLifecycleStatus, time budget, copy-cite verified, test rename, measurable-win rule)

## Research Request Tracker
| ID | Phase | Status | Summary |
|----|-------|--------|---------|
| R-001 | 1 | COMPLETE | Maricopa portal scout — all 5 criteria pass, public API discovered, 1974 lookback |
| R-002 | 1 | COMPLETE | Parcel hunting — POPHAM 304-78-386 locked primary, HOGUE 304-77-689 backup |
| R-003 | 2 | COMPLETE | Corpus download — 5 instruments, 3.4MB total, all PDFs verified, trust name recovered |
| R-004 | 4 | COMPLETE | Tier 1-A Seville Parcel 3 subdivision encumbrances added (plat + Affidavit of Correction) → lc-004 |
| R-005 | 4 | NOT FOUND — pivoted | Tier 1-B Seville master plat (Book 553 P15) hunt — 5 API layers blocked, ~141/200 calls used, hunt log promoted to demo asset (`data/raw/R-005/hunt-log.md`); see Decision #40 |

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

## App Routes

- `/` — Search entry
- `/parcel/:apn` — Chain of Title for a parcel
- `/parcel/:apn/instrument/:instrumentNumber` — Chain + Proof Drawer
- `/parcel/:apn/encumbrances` — Encumbrance Lifecycle panel
- `/parcel/:apn/encumbrances/instrument/:instrumentNumber` — Encumbrance + Proof Drawer
- `/instrument/:instrumentNumber` — client-side redirect to the owning parcel URL (one-frame "Resolving instrument…" placeholder; see Decision #36)
- anything else — "Not in this corpus" panel with link back to `/`

## Known hygiene gaps

_(none currently tracked)_
