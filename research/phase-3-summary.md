# Phase 3 Summary — Data Structuring + Schema + Curation

**Date:** 2026-04-13
**Status:** COMPLETE
**Parcel:** 304-78-386 (POPHAM), 3674 E Palmer St, Gilbert, AZ

---

## Schema Overview

**File:** `src/schemas.ts` (Zod) + `src/types.ts` (inferred TypeScript types)

The schema deviates from the sprint plan in 5 documented areas:

1. **Provenance enum:** `public_api | ocr | manual_entry` replaces the plan's `index_metadata | ai_extraction | manual_entry | hybrid`. Rationale: no AI extraction exists in the prototype; `public_api` is more precise than `index_metadata`.

2. **Party structure:** `parties: Party[]` with per-party `role`, `provenance`, `confidence`, and optional `nominee_for` replaces the plan's flat `grantor: string[]` / `grantee: string[]`. Rationale: supports MERS nominee pattern (Decision 34), releasing parties (Decision 33), and per-party provenance tracking (all roles are `manual_entry` per Decision 19).

3. **MERS nominee handling:** `nominee_for: { party_name, party_role }` on Party objects. Enables UI rendering of "MERS (as nominee for VIP Mortgage, lender)" with structural type safety.

4. **Raw API preservation:** `raw_api_response: RawApiResponse` on every instrument. Full provenance chain — curated data is traceable to the exact API response.

5. **File layout:** `data/instruments/{recordingNumber}.json` (per-file) instead of a single `data/instruments.json` array.

### Review changes applied (from schema review):
- `nominee_for` strengthened from `string` to `{ party_name, party_role }` object
- `bundled_document_types: DocumentType[]` added for multi-code instruments (e.g., WAR DEED + AF DISCLS)
- `provenance_summary` added (auto-populated by validation script, never hand-entered)
- `OwnerPeriod` moved to derived-types section with comment marking it as runtime-computed

---

## Provenance Breakdown

### Per-Instrument

| Instrument | Type | public_api | ocr | manual_entry | Total |
|------------|------|-----------|-----|-------------|-------|
| 20130183449 | WAR DEED | 6 | 8 | 2 | 16 |
| 20130183450 | DEED TRST | 4 | 6 | 6 | 16 |
| 20210057846 | T FIN ST | 4 | 7 | 2 | 13 |
| 20210057847 | DEED TRST | 4 | 7 | 4 | 15 |
| 20210075858 | REL D/T | 4 | 7 | 4 | 15 |
| **Totals** | | **22** | **35** | **18** | **75** |

### Ratio for Demo Pitch

- **Public API provides:** 22 fields (29%) — instrument identity, dates, page counts, document codes
- **OCR contributes:** 35 fields (47%) — legal descriptions, loan amounts, addresses, trust names, UCC references
- **Manual curation adds:** 18 fields (24%) — party roles, MERS annotations, cross-references, provenance notes

**Pitch framing:** "The county API gives us 29% of what an examiner needs. Our prototype fills the other 71% through document reading and expert curation — and tags every field with its source."

### What public_api counts

The counter counts curated fields that derive from the API response:
- `instrument_number` (from `recordingNumber`)
- `recording_date` (from `recordingDate`, reformatted M-D-YYYY → YYYY-MM-DD)
- `document_type_raw` (from `documentCodes[0]`)
- `page_count` (from `pageAmount`)
- `bundled_document_types` presence (from `documentCodes` beyond index 0, when present — adds 1 for the WAR DEED)
- `affidavitPresent` flag (adds 1 when true — only for the WAR DEED)

The raw API response object itself is preserved in full but not counted — it's a provenance artifact, not a curated field.

---

## Curation Decisions Requiring Judgment

### 1. Trust grantor structure (20130183449)

The API lists 7 names for the warranty deed. The PDF signature block shows BRIAN JOSEPH MADISON and TANYA RENAE MADISON signing **as Trustees** of the trust, not as individual grantors. The trust is the sole grantor entity; Brian and Tanya are signatories in their trustee capacity.

**Decision:** Trust is sole grantor. Brian and Tanya removed from parties array. `signatory_capacity: "trustees_of_trust"` added to extracted_fields.

### 2. ZIP code discrepancy (85298 vs 85295)

The 2013 purchase DOT (20130183450) states the property address as "3674 E. Palmer Street, Gilbert, Arizona 85298." The 2021 refi DOT (20210057847) states "3674 E Palmer St, Gilbert, AZ 85295." The current assessor record shows 85298.

**Decision:** Both values preserved as-is in each instrument's extracted_fields. A `zip_code_note` added to the 2013 DOT explaining the likely USPS reorganization. Parcel.json uses 85298 (current assessor value).

### 3. MERS role inconsistency across instruments

On the 2013 DOT (20130183450), MERS appears with role `nominee` and `nominee_for: { VIP MORTGAGE, lender }`. On the release (20210075858), MERS appears with role `beneficiary` and the same `nominee_for`. Both are technically correct per document content — MERS is the nominee on the DOT and the beneficiary of record on the release.

**Decision:** Both mappings preserved as-is. The `nominee_for` field provides consistency for UI rendering regardless of which role field is set. The UI layer should render "MERS (as nominee for VIP Mortgage)" in both cases by checking `nominee_for` presence.

### 4. same_day_group semantics

Two same-day groups exist in the corpus:

- **2013-02-27:** WAR DEED (20130183449) + DEED TRST (20130183450). This is a legally-linked purchase transaction — the deed of trust finances the warranty deed. The DOT would not exist without the deed.

- **2021-01-19:** T FIN ST (20210057846) + DEED TRST (20210057847). This is a same-day cleanup — the UCC termination cleared the SunPower solar lien to make way for the refi, but was not legally required by the refi DOT itself. The relationship is practical (lender required lien clearance) not legal (the DOT doesn't reference the UCC filing).

**Decision:** Both pairs use the same `same_day_group` field. The semantic difference is noted here but not encoded in the schema — a production system might add a `group_relationship: "financing" | "precondition" | "administrative"` field, but this is out of scope for the prototype.

### 5. UCC termination party roles (20210057846)

UCC financing statements use "debtor" and "secured party" terminology, not "grantor" and "grantee." The current schema maps POPHAM CHRISTOPHER as `grantor` and SPWR USB 2013 2 LLC as `grantee` because the `PartyRole` enum doesn't include UCC-specific roles.

**Decision:** Leave current mapping for Phase 3. A production schema should add `debtor` and `secured_party` to the `PartyRole` enum. The existing mapping is functionally adequate for the prototype demo — the UCC termination appears in the timeline and the party names are correct.

---

## Validation

### Schema validation
All 5 instruments pass Zod schema validation with zero errors.

### Structural integrity checks
- **Rule A** (release targets DOT): PASS — 20210075858 (full_reconveyance) back-references 20130183450 (deed_of_trust)
- **Rule B** (same-day dates match): PASS — both same_day_groups share recording dates
- **Rule C** (nominee_for references exist): PASS — MERS nominee_for VIP MORTGAGE confirmed in both instruments
- **Rule D** (recording number match): PASS — all 5 instrument_numbers match their raw_api_response.recordingNumber

### Provenance summary
Auto-populated by `scripts/validate-corpus.ts` — never hand-entered. Re-validated after population.

---

## Corpus Structure

```
data/
├── parcel.json                           # Parcel identity + assessor data
└── instruments/
    ├── 20130183449.json                  # WAR DEED — purchase (MADISON → POPHAM)
    ├── 20130183450.json                  # DEED TRST — purchase financing (VIP Mortgage)
    ├── 20210057846.json                  # T FIN ST — UCC termination (SunPower solar)
    ├── 20210057847.json                  # DEED TRST — refi (Bay Equity, $225K)
    └── 20210075858.json                  # REL D/T — release of 2013 DOT (Wells Fargo)
```

---

## Readiness Assessment for Phase 4

**READY.** The corpus is sufficient for all 4 mandatory screens:

1. **Search Entry:** `parcel.json` provides APN, address, owner, subdivision for search results display.

2. **Chain-of-Title Timeline:** 5 instruments span 2013–2021 with clear ownership chain (MADISON TRUST → POPHAM, still current). Two same-day transaction groups provide visual clustering. The trust-to-individual transfer adds legal nuance.

3. **Encumbrance Lifecycle Panel:** The 2013 DOT → 2021 release is a clean lifecycle pair (3-day turnaround). The 2021 refi DOT is currently open (no release in corpus — status: "open"). MERS beneficiary handling per Decision 34 is structurally represented. The UCC termination adds an unusual instrument type.

4. **Document Proof Drawer:** All 5 PDFs are locally served at `/raw/R-003/pdfs/{id}.pdf`. Page counts verified against API. `source_image_path` fields point to correct locations. Both 2013-era and 2021-era scans are legible without preprocessing.

### Remaining Phase 3 tasks per sprint plan

Tasks 3.5–3.9 (chain builder logic, lifecycle status logic, citation formatter, links/lifecycles curation, data loader hook) are implementation tasks that build on this curated data. They can proceed without additional curation.
