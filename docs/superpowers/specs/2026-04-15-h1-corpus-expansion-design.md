# H1 Corpus Expansion — Design Spec

**Date:** 2026-04-15  
**Branch:** claude/h1-corpus  
**Scope:** Add 3–4 new parcel entries to the corpus (5–6 total), with scenario variety. No schema changes. No platform features.

---

## Goal

Expand the corpus from 2 parcels (POPHAM + HOGUE) to 5–6 parcels by adding real Maricopa County instruments that demonstrate title scenarios POPHAM does not cover. Every new instrument must match existing schema and provenance rigor (Decisions #13, #26, #27, #39).

---

## Scenario → Parcel Mapping

| ID | Scenario | Strategy | New entry? |
|----|----------|----------|------------|
| P1 | Subdivision-only — Seville Parcel 3 common-area tract | Find tract APN via Maricopa assessor (1–2 calls). Instruments = 20010093192 + 20010849180 already curated. Add parcel entry + surface plat CC&R encumbrance on ALL Seville lots in corpus. | New parcel entry, no new instrument PDFs |
| P2 | Shea Homes builder deed + purchase-money DOT | Scan 14 scouted Seville APNs for a lot with a 2001–2004 corporate grantor deed and no resale. Download + visually transcribe 2 PDFs. | New parcel + 2 new instruments |
| P3 | HELOC / 2nd DOT stacked on 1st DOT | Same API scan — find a parcel with 3+ instruments including multiple DOTs. Download + visually transcribe up to 4 PDFs. | New parcel + up to 4 new instruments |
| P4 | HOGUE chain extension (Lorance → predecessor) | Name search LORANCE in Maricopa recorder; find deed conveying 304-77-689 to Lorance. Add instrument to existing HOGUE parcel. | Existing parcel expanded, 1 new instrument |
| P5 | Optional 4th new parcel from API scan | If a Shamrock Estates adjacent APN (304-77-685/687/691/693) reveals a multi-resale chain or distinct scenario, add it. Otherwise 5 parcels total is the floor. | Conditional |

---

## HOA Covenant / CC&R Encumbrance

The Seville Parcel 3 plat (20010093192) dedicates public utility easements, HOA-maintained tracts, and building setbacks that run with the land and bind every lot in the subdivision. This is the authoritative HOA-origin encumbrance.

**Rule:** Every Seville parcel in the corpus (POPHAM + P1 tract + P2 Shea Homes lot) must surface this as a subdivision-level encumbrance in the Encumbrance Lifecycle panel, sourced to instrument 20010093192. This does not require a new lifecycle entry per parcel — it is a shared lifecycle that appears on all Seville lots.

---

## API Budget

- Approach A: neighbor-focused, all from 14 already-scouted APNs on E Palmer St.
- Hard stop at 14 APNs. Escalate to user before expanding.
- Estimated calls: ~35 total.
  - Tract APN lookup: 1–2
  - 14 Seville APN instrument scans: up to 14
  - LORANCE name search: 1–3
  - PDF fetches for confirmed candidates: up to 16
  - Buffer: 5

---

## Parcel Selection Constraints

- **Seville Parcel 3 APNs available:** 304-78-381, 304-78-383, 304-78-385, 304-78-387, 304-78-389, 304-78-370, 304-78-372, 304-78-374, 304-78-376, 304-78-378
- **Shamrock Estates APNs available:** 304-77-685, 304-77-687, 304-77-691, 304-77-693
- **P2 (Shea Homes):** Must be Seville Parcel 3. Must have no resale since original 2001–2004 purchase. Corporate grantor (Shea Homes Limited Partnership or equivalent) required.
- **P3 (HELOC):** Any of the 14. Must have an identifiable 2nd DOT or HELOC instrument in the recorder record.
- **P4 (LORANCE):** Instrument must convey 304-77-689 (Shamrock Estates Lot 348) to LORANCE. Not a new parcel entry.

---

## Curation Rules (per CLAUDE.md)

- Provenance: `public_api` / `ocr` / `manual_entry` only.
- No Tesseract available (Decision #39): PDF field recovery → `manual_entry` with `source_page` + `source_note`.
- Curation Rule A (Decision #26): An instrument belongs to a parcel only if names include the parcel owner AND at least one other party appears in the confirmed chain.
- Curation Rule B (Decision #27): Same-day recording groups are linked transactions.
- Confidence scores: hand-assigned per Decision #17.

---

## Success Criteria

1. 5–6 parcels total in `src/data/parcels.json`, each with complete instrument_numbers list.
2. Every new instrument has a corresponding JSON file in `src/data/instruments/`.
3. Search by address, APN, owner name, and instrument number works for each new parcel.
4. Every Seville parcel surfaces the plat-derived CC&R encumbrance in the Encumbrance panel.
5. HOGUE renders a 3-link chain (predecessor → Lorance → Hogue).
6. No console errors on any new parcel's Chain-of-Title or Encumbrance routes.
7. `npm test && npm run lint && npm run build` pass.

---

## Out of Scope

- Federal tax lien search (Known Gap #2 — API blocks it).
- Schema changes.
- New platform features or UI components.
- Cross-county parcels.
- Parcels outside the 14 scouted APNs without explicit user approval.
