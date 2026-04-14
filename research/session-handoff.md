# Session Handoff — County Recorder Sprint

## Where we are

This is a 2-day sprint to build a working prototype of an AI-enhanced county recorder search portal for residential title examiners. The target is an MLG (county custodianship) pitch demonstrating that counties can close the gap between raw recorded documents and structured title work product. Phases 1–3 are complete. Phase 4 is the UI build: 4 screens (Search Entry, Chain-of-Title Timeline, Encumbrance Lifecycle Panel, Document Proof Drawer) using Vite + React 18 + TypeScript + Tailwind v4, consuming precomputed JSON data files. No backend.

## What's done

- **Phase 1 — County + Parcel Lock (R-001, R-002):** Maricopa AZ confirmed as primary county. Public REST API discovered at publicapi.recorder.maricopa.gov (undocumented, no auth, free images to 1974). Primary parcel locked: POPHAM 304-78-386, 3674 E Palmer St, Gilbert. Backup: HOGUE 304-77-689.
- **Phase 2 — Corpus Assembly (R-003):** 5 instruments downloaded as PDF (3.4MB total, 38 pages). Trust name recovered via OCR: THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006. All scanned image PDFs — no embedded text.
- **Phase 3 — Schema + Curation:** Zod schema at `src/schemas.ts` with 5 deviations from sprint plan (documented in commit). 5 instrument JSON files curated, validated with structural integrity checks (4 rules), provenance_summary auto-populated. Provenance ratio locked.

## The headline numbers

- **115+ discrete interactions** to assemble a chain of title for one parcel via current county portals (browser-plugin measured, conservative ~46 clicks)
- **Provenance ratio:** 22 public_api (29%) / 35 ocr (47%) / 18 manual_entry (24%) across the 5-instrument corpus
- **POPHAM chain:** 5 instruments spanning 2013–2021. Purchase from living trust (2013) + VIP Mortgage DOT → refi with Bay Equity (2021-01-19) + release of original DOT (2021-01-22, 3-day turnaround). UCC solar termination same day as refi. MERS nominee handling throughout.

## The core thesis

Counties already have the data and already host the documents. The gap is that structured fields aren't exposed, grantor/grantee roles aren't assigned, and lifecycle relationships aren't surfaced. A custodianship portal closes that gap without replacing the county's role as the source of truth.

## Active files to know about

- `CLAUDE.md` — Decision log (35 entries), active state, research tracker, terminology notes, key endpoints
- `plans/sprint-plan.md` — Phase definitions, task specs, exit criteria, time budget
- `research/raw/R-00{1,2,3}/` — Research outputs (portal scout, parcel hunting, corpus download)
- `research/phase-3-summary.md` — Schema design rationale, curation judgment calls, provenance breakdown
- `research/measurable-win.md` — 115+ interaction count, before/after comparison table
- `research/before-workflow.md` — Pain point catalog (architectural, UI friction, search/indexing, data governance)
- `src/data/instruments/*.json` — 5 curated instruments (source of truth for Phase 4+)
- `data/parcel.json` — Parcel identity and assessor data
- `src/schemas.ts` — Zod schema definitions (Instrument, Party, Parcel, DocumentLink, EncumbranceLifecycle, etc.)
- `src/types.ts` — TypeScript types inferred from Zod schemas
- `scripts/validate-corpus.ts` — Structural integrity validator with provenance_summary auto-population

## Known open items

- **Decision 33:** Wells Fargo executed the release of the VIP Mortgage DOT — no recorded assignment between them. Loan transferred via MERS outside public record. Not blocking; this is a Phase 4 demo talking point (MERS visibility is a feature).
- **UCC termination party roles:** 20210057846 uses grantor/grantee as placeholders. Production schema should add `debtor` and `secured_party` to PartyRole enum.
- **Same-day-group semantics:** 2013 pair (WAR DEED + DEED TRST) is a legally-linked purchase transaction. 2021 pair (T FIN ST + DEED TRST) is same-day cleanup (lender required solar lien clearance). UI should acknowledge this distinction.
- **Sprint plan Tasks 3.5–3.9** (chain builder, lifecycle status, citation formatter, links/lifecycles data, data loader hook) are implementation tasks that run as part of Phase 4 prep or during Phase 4 itself.

## First prompt for the next conversation

```
I'm resuming a sprint on a county recorder portal prototype. Read
research/session-handoff.md and CLAUDE.md to get oriented, then read
plans/sprint-plan.md Phase 4 section. Don't start Phase 4 until I
confirm — tell me back what you understand about the current state
first so I can catch any gaps. Key things to verify: the 5-instrument
POPHAM chain, the provenance ratio, the MERS handling decision, and
what screens Phase 4 needs to build.
```
