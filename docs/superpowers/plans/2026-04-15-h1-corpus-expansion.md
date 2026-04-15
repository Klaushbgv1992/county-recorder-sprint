# H1 Corpus Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the parcel corpus from 2 to 5–6 parcels by adding real Maricopa County instruments that demonstrate title scenarios POPHAM and HOGUE do not cover.

**Architecture:** Three phases — (1) API scouting via Maricopa assessor + recorder to confirm recording numbers for each scenario; (2) data curation — instrument JSONs, parcel entries, lifecycle entries; (3) code wiring — `data-loader.ts` static imports + `staff-index.json` update. Each phase is independently testable with `npx tsx scripts/validate-corpus.ts` and `npm test`.

**Tech Stack:** Maricopa public API (`publicapi.recorder.maricopa.gov`), Maricopa assessor (`mcassessor.maricopa.gov`), Zod schema validation (`src/schemas.ts`), Vitest, TypeScript.

---

## File Map

**Created:**
- `data/raw/R-006/pdfs/{N}.pdf` — PDF for each new instrument (P2: 2 files, P3: up to 4 files, P4: 1 file)
- `data/raw/R-006/metadata/{N}.json` — raw API JSON receipt for each new instrument
- `src/data/instruments/{N}.json` — curated instrument record for each new recording number

**Modified:**
- `src/data/parcels.json` — add P1 (tract), P2 (Shea Homes), P3 (HELOC) parcel entries; add predecessor instrument number to HOGUE's `instrument_numbers`
- `src/data/lifecycles.json` — add lc-005 (P2 DOT), lc-006 (P3 1st DOT), lc-007 (P3 2nd DOT/HELOC)
- `src/data/staff-index.json` — append one entry per new instrument
- `src/data-loader.ts` — add `import inst{N}` line and `instrumentsRaw` entry per new instrument

---

## Phase 1 — API Scouting (Tasks 1–5)

Produce the recording numbers needed for Phase 2. Record every confirmed number before moving on.

---

### Task 1: Find Seville Parcel 3 tract APN via Maricopa assessor

**Files:** None modified — this task only records findings.

- [ ] **Step 1: Fetch assessor search for Seville Parcel 3 subdivision**

  Use WebFetch on the Maricopa assessor:
  ```
  https://mcassessor.maricopa.gov/mcs/?q=SEVILLEPARCEL3&mod=pd
  ```
  If that returns no results, try:
  ```
  https://mcassessor.maricopa.gov/mcs/?q=304-78&mod=pd
  ```
  Look for entries whose `SUBDIVISION` field contains "SEVILLE PARCEL 3" and whose address contains "TRACT" (e.g., "TRACT A", "TRACT B", "OPEN SPACE"). These are common-area parcels.

- [ ] **Step 2: Record the tract APN**

  From the assessor response, identify the APN for the common-area tract. It will be in the 304-78-xxx range. Record it as `TRACT_APN`. If multiple tracts exist, choose the one labeled "OPEN SPACE" or "HOA MAINTENANCE" — the one most clearly linked to the subdivision's public easements.

  If the assessor search returns no tracts, try fetching the Maricopa recorder plat image directly and read the tract designations visually:
  ```
  https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=20010093192
  ```
  Tracts are labeled on the plat map — read page 1 for the overall plat legend.

- [ ] **Step 3: Confirm the tract APN exists in the recorder API**

  Fetch:
  ```
  https://publicapi.recorder.maricopa.gov/documents/search?names=SEVILLE+PARCEL+3+TRACT
  ```
  or
  ```
  https://publicapi.recorder.maricopa.gov/documents/search?names=SHEA+HOMES+LIMITED+PARTNERSHIP
  ```
  and look for a document whose legal description mentions "TRACT A" or the confirmed tract designation.

  Record: `TRACT_APN` = _________________

---

### Task 2: Scan 10 Seville Parcel 3 APNs via assessor → flag Shea Homes + HELOC candidates

**Files:** None modified.

The 10 Seville Parcel 3 APNs to check (from `src/data/adjacent-parcels.json`):
- 304-78-381, 304-78-383, 304-78-385, 304-78-387, 304-78-389 (south side)
- 304-78-370, 304-78-372, 304-78-374, 304-78-376, 304-78-378 (north side)

- [ ] **Step 1: For each APN, fetch the assessor parcel detail page**

  URL pattern (strip dashes from APN):
  ```
  https://mcassessor.maricopa.gov/mcs/?q=30478381&mod=pd
  ```
  (repeat for each of the 10 APNs)

  For each parcel, extract:
  - Current owner name
  - Last sale date
  - Last sale price (if shown)
  - Prior owner name (if shown in history)

- [ ] **Step 2: Flag Shea Homes candidate (P2)**

  The Shea Homes candidate is a lot whose **last sale date is 2001–2004** and has had **no resale since**. Current owner = original builder-era purchaser.

  If multiple qualify, prefer the one with the earliest sale date (closest to the plat recording date 2001-02-07).

  Record: `P2_APN` = _______________ `P2_OWNER` = _______________

- [ ] **Step 3: Flag HELOC candidate (P3)**

  The HELOC candidate is a lot owned for **10+ years** by the same owner (purchased no later than 2014). Long tenure maximizes the probability that a 2nd DOT or HELOC exists in the recorder record.

  If multiple qualify, prefer the one with the longest tenure.

  Record: `P3_APN` = _______________ `P3_OWNER` = _______________

- [ ] **Step 4: Check Shamrock Estates APNs if Seville ones are insufficient**

  Only if the Seville scan produces no viable HELOC candidate, scan the 4 Shamrock APNs:
  ```
  304-77-685, 304-77-687, 304-77-691, 304-77-693
  ```
  using the same URL pattern. Otherwise skip this step.

---

### Task 3: Search recorder for P2 (Shea Homes) — confirm recording numbers

**Files:** None modified.

- [ ] **Step 1: Search recorder by "SHEA HOMES LIMITED PARTNERSHIP"**

  ```
  https://publicapi.recorder.maricopa.gov/documents/search?names=SHEA+HOMES+LIMITED+PARTNERSHIP
  ```

  This returns all instruments where Shea Homes appears. Expect many results from 2001–2004 (all Seville lot sales).

- [ ] **Step 2: Filter to P2_APN's lot**

  The P2 parcel's legal description will be "Lot N, SEVILLE PARCEL 3, Book 554 Maps Page 19." From the results, identify the instrument where the names list includes `P2_OWNER` (the person who bought from Shea Homes). That is the warranty deed conveying the lot from the builder.

  Fetch the individual API record to confirm:
  ```
  https://publicapi.recorder.maricopa.gov/documents/{candidate_recording_number}
  ```
  Verify the returned JSON contains both `SHEA HOMES LIMITED PARTNERSHIP` and `P2_OWNER` in `names[]`.

- [ ] **Step 3: Identify the same-day DOT**

  Look for a `DEED TRST` recorded on the same date as the Shea Homes deed, with `P2_OWNER` in `names[]`. This is the purchase-money DOT.

  Fetch:
  ```
  https://publicapi.recorder.maricopa.gov/documents/{recording_number_1_higher_or_lower}
  ```
  (The DOT recording number is typically 1 higher than the deed, per Curation Rule B.)

- [ ] **Step 4: Save API receipts**

  ```bash
  mkdir -p data/raw/R-006/metadata data/raw/R-006/pdfs
  ```

  Fetch and save the API JSON for each confirmed instrument:
  ```
  https://publicapi.recorder.maricopa.gov/documents/{P2_DEED_NUM}
  https://publicapi.recorder.maricopa.gov/documents/{P2_DOT_NUM}
  ```
  Save to `data/raw/R-006/metadata/{N}.json`.

  Record: `P2_DEED_NUM` = _______________ `P2_DOT_NUM` = _______________

---

### Task 4: Search recorder for P3 (HELOC/2nd DOT) — confirm recording numbers

**Files:** None modified.

- [ ] **Step 1: Search recorder by P3_OWNER name**

  ```
  https://publicapi.recorder.maricopa.gov/documents/search?names={P3_OWNER_LAST_NAME}
  ```

  Filter results to those where `names[]` includes `P3_OWNER` (both last and first name if possible). Apply Curation Rule A: the instrument belongs to P3_APN only if names include P3_OWNER and at least one other party appears in a prior/subsequent deed on the same parcel.

- [ ] **Step 2: Identify the 1st DOT and any 2nd DOT/HELOC**

  From the filtered results, find:
  - `P3_DOT1_NUM`: The purchase-money or first refinance `DEED TRST` on this parcel
  - `P3_DOT2_NUM`: A subsequent `DEED TRST` or `HOME EQUITY` instrument (if any)
  - `P3_DEED_NUM`: The warranty deed that started the owner's chain

  Confirm each via individual API fetches:
  ```
  https://publicapi.recorder.maricopa.gov/documents/{candidate}
  ```

  **Hard stop:** If fewer than 2 DOT instruments are found for P3_APN, report back before expanding the search. Do not scan additional APNs.

- [ ] **Step 3: Save API receipts**

  Save the API JSON for each confirmed instrument:
  ```
  https://publicapi.recorder.maricopa.gov/documents/{P3_DEED_NUM}
  https://publicapi.recorder.maricopa.gov/documents/{P3_DOT1_NUM}
  https://publicapi.recorder.maricopa.gov/documents/{P3_DOT2_NUM}
  ```
  Save to `data/raw/R-006/metadata/{N}.json`.

  Record: `P3_DEED_NUM` = ___ `P3_DOT1_NUM` = ___ `P3_DOT2_NUM` = ___

---

### Task 5: Search recorder for LORANCE predecessor → confirm P4 recording number

**Files:** None modified.

- [ ] **Step 1: Search recorder by "LORANCE ROBERT S"**

  ```
  https://publicapi.recorder.maricopa.gov/documents/search?names=LORANCE+ROBERT+S
  ```

  Apply Curation Rule A: the predecessor deed belongs to 304-77-689 only if its `names[]` includes LORANCE and at least one other party who appears in the HOGUE chain. LORANCE is the **grantee** in the predecessor deed (he was buying the property).

- [ ] **Step 2: Confirm the predecessor deed recording number**

  From the results, find the instrument where LORANCE is the buyer (grantee). Fetch it:
  ```
  https://publicapi.recorder.maricopa.gov/documents/{candidate}
  ```
  Confirm `names[]` includes LORANCE and a prior owner. Confirm the document code is a deed type (WAR DEED, GRANT DEED, QC DEED, etc.).

  If LORANCE purchased from the original Shamrock Estates builder (expected: KB Home, Centex, or similar national builder active in Gilbert AZ ~2000–2005), record the builder name for the parcel entry.

- [ ] **Step 3: Save API receipt**

  ```
  https://publicapi.recorder.maricopa.gov/documents/{P4_DEED_NUM}
  ```
  Save to `data/raw/R-006/metadata/{P4_DEED_NUM}.json`.

  Record: `P4_DEED_NUM` = _______________

---

## Phase 2 — PDF Download + Data Curation (Tasks 6–11)

All recording numbers now known. Curate instrument JSONs, parcel entries, and lifecycles.

---

### Task 6: Download all new PDFs

**Files:** `data/raw/R-006/pdfs/*.pdf`

- [ ] **Step 1: Download P2 PDFs (2 files)**

  ```
  https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber={P2_DEED_NUM}
  https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber={P2_DOT_NUM}
  ```
  Save to `data/raw/R-006/pdfs/{N}.pdf`.

- [ ] **Step 2: Download P3 PDFs (2–4 files)**

  ```
  https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber={P3_DEED_NUM}
  https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber={P3_DOT1_NUM}
  https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber={P3_DOT2_NUM}
  ```
  Save to `data/raw/R-006/pdfs/{N}.pdf`.

- [ ] **Step 3: Download P4 PDF (1 file)**

  ```
  https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber={P4_DEED_NUM}
  ```
  Save to `data/raw/R-006/pdfs/{P4_DEED_NUM}.pdf`.

- [ ] **Step 4: Visually read each PDF using the Read tool**

  For each downloaded PDF, use the Read tool (multimodal PDF rendering). Extract:
  - Full grantor/grantee names (not API-truncated)
  - Legal description (lot number, subdivision, book/page)
  - Deed date, notary date
  - Escrow number, title company
  - Loan amount (for DOTs)
  - Vesting clause (how title held: "husband and wife", "a single man", etc.)
  - Any MERS MIN number (for DOTs)
  - Trust name if grantor/grantee is a trust

  All PDF-sourced fields: provenance = `manual_entry`, `source_page` = page number, `source_note` = brief description of what was read. (Decision #39: no Tesseract in this environment.)

---

### Task 7: Create P1 — Seville Parcel 3 tract parcel entry

**Files:** `src/data/parcels.json`

This parcel reuses instruments already in the corpus (20010093192 + 20010849180). No new instrument JSONs needed.

- [ ] **Step 1: Add tract entry to parcels.json**

  Open `src/data/parcels.json` and append:
  ```json
  {
    "apn": "{TRACT_APN}",
    "address": "TRACT A, SEVILLE PARCEL 3",
    "city": "Gilbert",
    "state": "AZ",
    "zip": "85295",
    "legal_description": "TRACT A, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19; Affidavit of Correction recorded in Document No. 2001-0849180",
    "current_owner": "SEVILLE HOMEOWNERS ASSOCIATION",
    "subdivision": "Seville Parcel 3",
    "assessor_url": "https://mcassessor.maricopa.gov/mcs/?q={TRACT_APN_NO_DASHES}&mod=pd",
    "instrument_numbers": [
      "20010093192",
      "20010849180"
    ]
  }
  ```
  Replace `{TRACT_APN}` with the APN found in Task 1. If the actual tract address differs from "TRACT A", use the correct tract label from the assessor. If the owner name differs from "SEVILLE HOMEOWNERS ASSOCIATION", use the actual assessor name. `legal_description` and `instrument_numbers` remain as shown.

- [ ] **Step 2: Verify CC&R lifecycle surfaces on POPHAM**

  POPHAM already has `"20010093192"` in its `instrument_numbers` (line 12 of `parcels.json`). lc-004 in `lifecycles.json` has `root_instrument: "20010093192"`. Because `data-loader.ts` scopes lifecycles to `parcel.instrument_numbers`, lc-004 already surfaces on POPHAM. No change needed. Confirm by checking `src/data/lifecycles.json` lc-004 entry.

- [ ] **Step 3: Run validate-corpus**

  ```bash
  npx tsx scripts/validate-corpus.ts
  ```
  Expected: PASS on parcels (now 3 entries). No instrument errors. The tract parcel references instruments 20010093192 + 20010849180, both already validated.

- [ ] **Step 4: Run tests**

  ```bash
  npm test -- --run
  ```
  Expected: all tests pass. No test hardcodes parcel count; adding a new parcel entry does not break existing tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/data/parcels.json
  git commit -m "feat(h1): add Seville Parcel 3 tract parcel (P1 — subdivision-only)"
  ```

---

### Task 8: Curate P2 — Shea Homes builder deed + purchase-money DOT

**Files:**
- Create: `src/data/instruments/{P2_DEED_NUM}.json`
- Create: `src/data/instruments/{P2_DOT_NUM}.json`
- Modify: `src/data/parcels.json`

- [ ] **Step 1: Create the Shea Homes deed instrument JSON**

  Create `src/data/instruments/{P2_DEED_NUM}.json`:
  ```json
  {
    "instrument_number": "{P2_DEED_NUM}",
    "recording_date": "{YYYY-MM-DD from API}",
    "document_type": "warranty_deed",
    "document_type_raw": "{documentCode from API, e.g. WAR DEED}",
    "bundled_document_types": [],
    "parties": [
      {
        "name": "SHEA HOMES LIMITED PARTNERSHIP",
        "role": "grantor",
        "provenance": "public_api",
        "confidence": 1
      },
      {
        "name": "{BUYER_FIRST} {BUYER_LAST}",
        "role": "grantee",
        "provenance": "manual_entry",
        "confidence": 1
      }
    ],
    "legal_description": {
      "value": "Lot {N}, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19",
      "provenance": "manual_entry",
      "confidence": 1,
      "source_page": 1,
      "source_note": "Visually read from PDF page 1 — scanned image, no embedded text"
    },
    "extracted_fields": {
      "deed_date": {
        "value": "{YYYY-MM-DD read from PDF}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "Deed execution date, page 1"
      },
      "vesting": {
        "value": "{e.g. husband and wife / a single man / etc.}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "Vesting clause, page 1"
      },
      "consideration": {
        "value": "{e.g. $10.00 or actual sale price if stated}",
        "provenance": "manual_entry",
        "confidence": 0.8,
        "source_page": 1,
        "source_note": "Consideration clause, page 1 — builder deeds often state nominal consideration"
      }
    },
    "back_references": ["20010093192"],
    "same_day_group": ["{P2_DOT_NUM}"],
    "source_image_path": "/raw/R-006/pdfs/{P2_DEED_NUM}.pdf",
    "page_count": {pageAmount from API},
    "raw_api_response": {
      "names": {names[] from API},
      "documentCodes": {documentCodes[] from API},
      "recordingDate": "{M-D-YYYY from API}",
      "recordingNumber": "{P2_DEED_NUM}",
      "pageAmount": {pageAmount from API},
      "docketBook": 0,
      "pageMap": 0,
      "affidavitPresent": false,
      "affidavitPageAmount": 0,
      "restricted": false
    },
    "corpus_boundary_note": "County online records searched through 2026-04-09",
    "provenance_summary": {
      "public_api_count": 3,
      "ocr_count": 0,
      "manual_entry_count": 6
    }
  }
  ```
  Replace every `{...}` placeholder with actual values found in Tasks 3 and 6. The `provenance_summary` counts must match the actual number of fields at each provenance level in the finished JSON.

  **Provenance rules:**
  - `instrument_number`, `recording_date`, `document_type_raw`, `page_count`, `raw_api_response`, `names[].name` where it matches the API response verbatim → `public_api`
  - Any field read from the PDF visually → `manual_entry` with `source_page` + `source_note`
  - `grantor/grantee` role assignment (API names[] is flat) → `manual_entry` (Decision #19)

- [ ] **Step 2: Create the purchase-money DOT instrument JSON**

  Create `src/data/instruments/{P2_DOT_NUM}.json`:
  ```json
  {
    "instrument_number": "{P2_DOT_NUM}",
    "recording_date": "{same date as deed}",
    "document_type": "deed_of_trust",
    "document_type_raw": "DEED TRST",
    "bundled_document_types": [],
    "parties": [
      {
        "name": "{BUYER_FIRST} {BUYER_LAST}",
        "role": "trustor",
        "provenance": "manual_entry",
        "confidence": 1
      },
      {
        "name": "{LENDER NAME from PDF}",
        "role": "lender",
        "provenance": "manual_entry",
        "confidence": 1
      },
      {
        "name": "{TRUSTEE NAME from PDF}",
        "role": "trustee",
        "provenance": "manual_entry",
        "confidence": 1
      }
    ],
    "legal_description": {
      "value": "Lot {N}, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19",
      "provenance": "manual_entry",
      "confidence": 1,
      "source_page": 1,
      "source_note": "Visually read from PDF page 1"
    },
    "extracted_fields": {
      "deed_date": {
        "value": "{YYYY-MM-DD}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "DOT execution date, page 1"
      },
      "loan_amount": {
        "value": "{e.g. $185,000.00}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "Loan amount stated on page 1 of DOT"
      }
    },
    "back_references": [],
    "same_day_group": ["{P2_DEED_NUM}"],
    "source_image_path": "/raw/R-006/pdfs/{P2_DOT_NUM}.pdf",
    "page_count": {pageAmount from API},
    "raw_api_response": {
      "names": {names[] from API},
      "documentCodes": ["DEED TRST"],
      "recordingDate": "{M-D-YYYY from API}",
      "recordingNumber": "{P2_DOT_NUM}",
      "pageAmount": {pageAmount from API},
      "docketBook": 0,
      "pageMap": 0,
      "affidavitPresent": false,
      "affidavitPageAmount": 0,
      "restricted": false
    },
    "corpus_boundary_note": "County online records searched through 2026-04-09",
    "provenance_summary": {
      "public_api_count": 3,
      "ocr_count": 0,
      "manual_entry_count": 6
    }
  }
  ```
  If MERS appears in the DOT: add a `nominee` party entry and a `mers_note` field (see `20130183450.json` for the exact pattern).

- [ ] **Step 3: Add P2 parcel entry to parcels.json**

  Append to `src/data/parcels.json`:
  ```json
  {
    "apn": "{P2_APN}",
    "address": "{P2_STREET_ADDRESS}",
    "city": "Gilbert",
    "state": "AZ",
    "zip": "85295",
    "legal_description": "Lot {N}, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19",
    "current_owner": "{P2_OWNER as it appears in the assessor}",
    "subdivision": "Seville Parcel 3",
    "assessor_url": "https://mcassessor.maricopa.gov/mcs/?q={P2_APN_NO_DASHES}&mod=pd",
    "instrument_numbers": [
      "20010093192",
      "{P2_DEED_NUM}",
      "{P2_DOT_NUM}"
    ]
  }
  ```
  Note: `"20010093192"` is listed first so lc-004 (the Seville plat CC&R lifecycle) automatically appears in the Encumbrance panel for this parcel.

- [ ] **Step 4: Run validate-corpus**

  ```bash
  npx tsx scripts/validate-corpus.ts
  ```
  Expected: PASS. Now 4 parcels, 11 instruments.

- [ ] **Step 5: Run tests**

  ```bash
  npm test -- --run
  ```
  Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/data/instruments/{P2_DEED_NUM}.json src/data/instruments/{P2_DOT_NUM}.json src/data/parcels.json data/raw/R-006/
  git commit -m "feat(h1): add P2 Shea Homes builder deed + purchase-money DOT ({P2_APN})"
  ```

---

### Task 9: Curate P3 — HELOC / 2nd DOT stacked on 1st DOT

**Files:**
- Create: `src/data/instruments/{P3_DEED_NUM}.json`
- Create: `src/data/instruments/{P3_DOT1_NUM}.json`
- Create: `src/data/instruments/{P3_DOT2_NUM}.json`
- Modify: `src/data/parcels.json`

- [ ] **Step 1: Create the purchase or resale deed instrument JSON**

  Create `src/data/instruments/{P3_DEED_NUM}.json` using the same pattern as Task 8 Step 1. Fill in:
  - `document_type`: `"warranty_deed"` (or `"quit_claim_deed"` if document_type_raw is "QC DEED")
  - `document_type_raw`: the code from the API response
  - `parties`: grantor (seller) + grantee (P3_OWNER), roles `manual_entry`
  - `legal_description`: from PDF, `manual_entry`
  - `same_day_group`: `["{P3_DOT1_NUM}"]` (purchase-money DOT recorded same day)
  - `back_references`: `["20010093192"]` if in Seville Parcel 3, or the Shamrock plat book/page reference if in Shamrock Estates

- [ ] **Step 2: Create the 1st DOT instrument JSON**

  Create `src/data/instruments/{P3_DOT1_NUM}.json` using the pattern from Task 8 Step 2.
  - `same_day_group`: `["{P3_DEED_NUM}"]`
  - Add `mers_note` if MERS appears as nominee

- [ ] **Step 3: Create the 2nd DOT / HELOC instrument JSON**

  Create `src/data/instruments/{P3_DOT2_NUM}.json`:
  ```json
  {
    "instrument_number": "{P3_DOT2_NUM}",
    "recording_date": "{YYYY-MM-DD from API}",
    "document_type": "deed_of_trust",
    "document_type_raw": "DEED TRST",
    "bundled_document_types": [],
    "parties": [
      {
        "name": "{P3_OWNER first borrower}",
        "role": "trustor",
        "provenance": "manual_entry",
        "confidence": 1
      },
      {
        "name": "{2ND LENDER NAME}",
        "role": "lender",
        "provenance": "manual_entry",
        "confidence": 1
      },
      {
        "name": "{TRUSTEE NAME}",
        "role": "trustee",
        "provenance": "manual_entry",
        "confidence": 1
      }
    ],
    "legal_description": {
      "value": "{same legal desc as P3_DEED}",
      "provenance": "manual_entry",
      "confidence": 1,
      "source_page": 1,
      "source_note": "Visually read from PDF page 1"
    },
    "extracted_fields": {
      "deed_date": {
        "value": "{YYYY-MM-DD}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "2nd DOT execution date, page 1"
      },
      "loan_amount": {
        "value": "{credit line or loan amount}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "2nd DOT/HELOC line amount, page 1"
      },
      "lien_position_note": {
        "value": "Second-position lien recorded after {P3_DOT1_NUM} dated {P3_DOT1 recording date}. First-lien DOT remains open. Both must be cleared at closing.",
        "provenance": "manual_entry",
        "confidence": 1
      }
    },
    "back_references": ["{P3_DOT1_NUM}"],
    "same_day_group": [],
    "source_image_path": "/raw/R-006/pdfs/{P3_DOT2_NUM}.pdf",
    "page_count": {pageAmount from API},
    "raw_api_response": {
      "names": {names[] from API},
      "documentCodes": ["DEED TRST"],
      "recordingDate": "{M-D-YYYY from API}",
      "recordingNumber": "{P3_DOT2_NUM}",
      "pageAmount": {pageAmount from API},
      "docketBook": 0,
      "pageMap": 0,
      "affidavitPresent": false,
      "affidavitPageAmount": 0,
      "restricted": false
    },
    "corpus_boundary_note": "County online records searched through 2026-04-09",
    "provenance_summary": {
      "public_api_count": 3,
      "ocr_count": 0,
      "manual_entry_count": 8
    }
  }
  ```

- [ ] **Step 4: Add P3 parcel entry to parcels.json**

  Append to `src/data/parcels.json`:
  ```json
  {
    "apn": "{P3_APN}",
    "address": "{P3_STREET_ADDRESS}",
    "city": "Gilbert",
    "state": "AZ",
    "zip": "85295",
    "legal_description": "{from deed PDF, manual_entry}",
    "current_owner": "{P3_OWNER as assessor shows}",
    "subdivision": "{Seville Parcel 3 or Shamrock Estates Phase 2A depending on APN}",
    "assessor_url": "https://mcassessor.maricopa.gov/mcs/?q={P3_APN_NO_DASHES}&mod=pd",
    "instrument_numbers": [
      "20010093192",
      "{P3_DEED_NUM}",
      "{P3_DOT1_NUM}",
      "{P3_DOT2_NUM}"
    ]
  }
  ```
  Omit `"20010093192"` if P3_APN is in Shamrock Estates (that parcel is not in Seville Parcel 3 and should not inherit the Seville plat lifecycle).

- [ ] **Step 5: Run validate-corpus**

  ```bash
  npx tsx scripts/validate-corpus.ts
  ```
  Expected: PASS. Now 5 parcels, 14 instruments.

- [ ] **Step 6: Run tests, commit**

  ```bash
  npm test -- --run
  git add src/data/instruments/{P3_DEED_NUM}.json src/data/instruments/{P3_DOT1_NUM}.json src/data/instruments/{P3_DOT2_NUM}.json src/data/parcels.json
  git commit -m "feat(h1): add P3 HELOC/2nd DOT parcel ({P3_APN})"
  ```

---

### Task 10: Expand HOGUE — add P4 LORANCE predecessor deed

**Files:**
- Create: `src/data/instruments/{P4_DEED_NUM}.json`
- Modify: `src/data/parcels.json` (HOGUE entry)

- [ ] **Step 1: Create the LORANCE predecessor deed instrument JSON**

  Create `src/data/instruments/{P4_DEED_NUM}.json`:
  ```json
  {
    "instrument_number": "{P4_DEED_NUM}",
    "recording_date": "{YYYY-MM-DD from API}",
    "document_type": "warranty_deed",
    "document_type_raw": "{documentCode from API}",
    "bundled_document_types": [],
    "parties": [
      {
        "name": "{PRIOR OWNER / BUILDER NAME}",
        "role": "grantor",
        "provenance": "manual_entry",
        "confidence": 1
      },
      {
        "name": "ROBERT S LORANCE",
        "role": "grantee",
        "provenance": "public_api",
        "confidence": 1
      }
    ],
    "legal_description": {
      "value": "Lot 348, of SHAMROCK ESTATES PHASE 2A, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 799 of Maps, Page 38",
      "provenance": "manual_entry",
      "confidence": 1,
      "source_page": 1,
      "source_note": "Visually read from PDF page 1"
    },
    "extracted_fields": {
      "deed_date": {
        "value": "{YYYY-MM-DD}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "Deed execution date, page 1"
      },
      "vesting": {
        "value": "{e.g. a single man / husband and wife}",
        "provenance": "manual_entry",
        "confidence": 1,
        "source_page": 1,
        "source_note": "Vesting clause, page 1"
      }
    },
    "back_references": [],
    "same_day_group": [],
    "source_image_path": "/raw/R-006/pdfs/{P4_DEED_NUM}.pdf",
    "page_count": {pageAmount from API},
    "raw_api_response": {
      "names": {names[] from API},
      "documentCodes": {documentCodes[] from API},
      "recordingDate": "{M-D-YYYY from API}",
      "recordingNumber": "{P4_DEED_NUM}",
      "pageAmount": {pageAmount from API},
      "docketBook": 0,
      "pageMap": 0,
      "affidavitPresent": false,
      "affidavitPageAmount": 0,
      "restricted": false
    },
    "corpus_boundary_note": "County online records searched through 2026-04-09",
    "provenance_summary": {
      "public_api_count": 4,
      "ocr_count": 0,
      "manual_entry_count": 5
    }
  }
  ```

- [ ] **Step 2: Add P4_DEED_NUM to HOGUE's instrument_numbers in parcels.json**

  Open `src/data/parcels.json`. Find the HOGUE entry (apn: "304-77-689"). Add `"{P4_DEED_NUM}"` as the **first** entry in `instrument_numbers` (it is the earliest instrument in the chain):
  ```json
  "instrument_numbers": [
    "{P4_DEED_NUM}",
    "20150516729",
    "20150516730"
  ]
  ```

- [ ] **Step 3: Run validate-corpus**

  ```bash
  npx tsx scripts/validate-corpus.ts
  ```
  Expected: PASS. HOGUE now shows 3 instruments.

- [ ] **Step 4: Run tests, commit**

  ```bash
  npm test -- --run
  git add src/data/instruments/{P4_DEED_NUM}.json src/data/parcels.json
  git commit -m "feat(h1): expand HOGUE chain backward — add LORANCE predecessor deed ({P4_DEED_NUM})"
  ```

---

### Task 11: Add new lifecycles to lifecycles.json

**Files:** `src/data/lifecycles.json`

The current highest lifecycle ID is lc-004. Add lc-005 (P2 DOT), lc-006 (P3 1st DOT), lc-007 (P3 2nd DOT).

- [ ] **Step 1: Append lc-005 for P2 DOT**

  Open `src/data/lifecycles.json`. In the `"lifecycles"` array, append:
  ```json
  {
    "id": "lc-005",
    "root_instrument": "{P2_DOT_NUM}",
    "child_instruments": [],
    "status": "open",
    "status_rationale": "No reconveyance found in corpus for Shea Homes purchase-money DOT {P2_DOT_NUM}. Original owner has held the property since {P2 recording year}; no subsequent sale or refinance recorded in the curated corpus.",
    "examiner_override": null
  }
  ```

- [ ] **Step 2: Append lc-006 for P3 1st DOT**

  Append:
  ```json
  {
    "id": "lc-006",
    "root_instrument": "{P3_DOT1_NUM}",
    "child_instruments": [],
    "status": "open",
    "status_rationale": "No reconveyance found in corpus for {P3_OWNER} first-position DOT {P3_DOT1_NUM}. Second-position DOT {P3_DOT2_NUM} is also open. Both must be cleared at closing.",
    "examiner_override": null
  }
  ```

- [ ] **Step 3: Append lc-007 for P3 2nd DOT / HELOC**

  Append:
  ```json
  {
    "id": "lc-007",
    "root_instrument": "{P3_DOT2_NUM}",
    "child_instruments": [],
    "status": "open",
    "status_rationale": "No termination or release found in corpus for {P3_OWNER} second-position DOT/HELOC {P3_DOT2_NUM}. This is a junior lien stacked on first-position DOT {P3_DOT1_NUM}.",
    "examiner_override": null
  }
  ```

- [ ] **Step 4: Run validate-corpus**

  ```bash
  npx tsx scripts/validate-corpus.ts
  ```
  Expected: PASS.

- [ ] **Step 5: Run tests, commit**

  ```bash
  npm test -- --run
  git add src/data/lifecycles.json
  git commit -m "feat(h1): add lifecycles lc-005 (P2 DOT), lc-006/lc-007 (P3 1st+2nd DOT)"
  ```

---

## Phase 3 — Code Wiring (Tasks 12–13)

---

### Task 12: Update data-loader.ts — add new instrument imports

**Files:** `src/data-loader.ts`

`data-loader.ts` uses static ES module imports. Each new instrument JSON file needs an import line and an entry in `instrumentsRaw`.

- [ ] **Step 1: Add import statements**

  Open `src/data-loader.ts`. After the last existing instrument import (line ~25, `import inst20010849180 ...`), add one import per new instrument:
  ```typescript
  import inst{P2_DEED_NUM} from "./data/instruments/{P2_DEED_NUM}.json";
  import inst{P2_DOT_NUM} from "./data/instruments/{P2_DOT_NUM}.json";
  import inst{P3_DEED_NUM} from "./data/instruments/{P3_DEED_NUM}.json";
  import inst{P3_DOT1_NUM} from "./data/instruments/{P3_DOT1_NUM}.json";
  import inst{P3_DOT2_NUM} from "./data/instruments/{P3_DOT2_NUM}.json";
  import inst{P4_DEED_NUM} from "./data/instruments/{P4_DEED_NUM}.json";
  ```
  (Adjust the list to match exactly which recording numbers you have. Variable name = `inst` + recording number, no separators.)

- [ ] **Step 2: Add to instrumentsRaw array**

  In `data-loader.ts`, find `const instrumentsRaw = [` (around line 29). Add each new import variable to the array:
  ```typescript
  const instrumentsRaw = [
    inst20130183449,
    inst20130183450,
    inst20210057846,
    inst20210057847,
    inst20210075858,
    inst20150516729,
    inst20150516730,
    inst20010093192,
    inst20010849180,
    inst{P2_DEED_NUM},
    inst{P2_DOT_NUM},
    inst{P3_DEED_NUM},
    inst{P3_DOT1_NUM},
    inst{P3_DOT2_NUM},
    inst{P4_DEED_NUM},
  ];
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors. If TypeScript complains about JSON import types, verify the instrument JSON files pass `InstrumentFile.parse()` in validate-corpus.

- [ ] **Step 4: Run tests**

  ```bash
  npm test -- --run
  ```
  Expected: all pass. The new instruments are now available in `loadAllInstruments()` and will be scoped to each parcel via `loadParcelDataByApn()`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/data-loader.ts
  git commit -m "feat(h1): wire new instrument imports into data-loader"
  ```

---

### Task 13: Update staff-index.json — add new instruments to name index

**Files:** `src/data/staff-index.json`

The staff workbench name search (`staff-search.ts`) and cross-parcel release hunt (`cross-parcel-release-hunt.ts`) query this flat index. Add one entry per new instrument in the curated corpus.

- [ ] **Step 1: Append entries for P2 instruments**

  Open `src/data/staff-index.json`. Append one object per new P2 instrument:
  ```json
  {
    "instrument_number": "{P2_DEED_NUM}",
    "recording_date": "{YYYY-MM-DD}",
    "document_type": "{document_type_raw from API, e.g. WAR DEED}",
    "names": {names[] from API — copy verbatim},
    "attributed_parcel_apn": "{P2_APN}",
    "suppressed_same_name_of": null
  },
  {
    "instrument_number": "{P2_DOT_NUM}",
    "recording_date": "{YYYY-MM-DD}",
    "document_type": "DEED TRST",
    "names": {names[] from API — copy verbatim},
    "attributed_parcel_apn": "{P2_APN}",
    "suppressed_same_name_of": null
  }
  ```

- [ ] **Step 2: Append entries for P3 instruments (3 entries)**

  ```json
  {
    "instrument_number": "{P3_DEED_NUM}",
    "recording_date": "{YYYY-MM-DD}",
    "document_type": "{document_type_raw}",
    "names": {names[] from API},
    "attributed_parcel_apn": "{P3_APN}",
    "suppressed_same_name_of": null
  },
  {
    "instrument_number": "{P3_DOT1_NUM}",
    "recording_date": "{YYYY-MM-DD}",
    "document_type": "DEED TRST",
    "names": {names[] from API},
    "attributed_parcel_apn": "{P3_APN}",
    "suppressed_same_name_of": null
  },
  {
    "instrument_number": "{P3_DOT2_NUM}",
    "recording_date": "{YYYY-MM-DD}",
    "document_type": "DEED TRST",
    "names": {names[] from API},
    "attributed_parcel_apn": "{P3_APN}",
    "suppressed_same_name_of": null
  }
  ```

- [ ] **Step 3: Append entry for P4 instrument**

  ```json
  {
    "instrument_number": "{P4_DEED_NUM}",
    "recording_date": "{YYYY-MM-DD}",
    "document_type": "{document_type_raw}",
    "names": {names[] from API},
    "attributed_parcel_apn": "304-77-689",
    "suppressed_same_name_of": null
  }
  ```

- [ ] **Step 4: Run tests, commit**

  ```bash
  npm test -- --run
  git add src/data/staff-index.json
  git commit -m "feat(h1): update staff-index with new corpus instruments"
  ```

---

## Phase 4 — Final Verification (Task 14)

### Task 14: Full validation + smoke test

**Files:** None modified (read-only verification).

- [ ] **Step 1: Run validate-corpus**

  ```bash
  npx tsx scripts/validate-corpus.ts
  ```
  Expected output:
  ```
  === Validating parcels.json ===
    PASS (5 parcels)   ← or 6 if P5 optional was added
      - 304-78-386 ...
      - 304-77-689 ...
      - {TRACT_APN} ...
      - {P2_APN} ...
      - {P3_APN} ...
  === Validating instruments ===
    {N}.json: PASS  (for all instrument files)
  ```
  No FAIL lines. Any FAIL = fix before proceeding.

- [ ] **Step 2: Run full test suite**

  ```bash
  npm test -- --run
  ```
  Expected: all 267 existing tests pass (or more if any new tests were added), 0 failures.

- [ ] **Step 3: Run lint**

  ```bash
  npm run lint
  ```
  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Run build**

  ```bash
  npm run build
  ```
  Expected: build succeeds, no type errors.

- [ ] **Step 5: Dev server smoke test**

  ```bash
  npm run dev
  ```

  Open the app and verify:
  1. `/` — search box. Type each new parcel's APN → one result. Type each new parcel's address → one result. Type each new parcel's owner last name → one result. Type a new instrument number → routes to correct parcel.
  2. `/parcel/{P2_APN}` — Chain of Title renders. Instruments show in chronological order. Shea Homes appears as grantor in the first deed. Same-day group badge links deed to DOT.
  3. `/parcel/{P2_APN}/encumbrances` — lc-004 (Seville CC&R) AND lc-005 (P2 DOT open) both appear in the Encumbrance panel.
  4. `/parcel/{P3_APN}/encumbrances` — lc-006 (1st DOT) and lc-007 (2nd DOT/HELOC) both appear as open lifecycles.
  5. `/parcel/304-77-689` — HOGUE chain shows 3 instruments: predecessor deed → Lorance deed → HOGUE deed.
  6. `/parcel/{TRACT_APN}` — lc-004 appears. No deed chain (chain has 0 conveyances, only subdivision instruments).
  7. Console is clean on all routes above. No React errors.

- [ ] **Step 6: Final commit**

  ```bash
  git add -A
  git commit -m "feat(h1): expand corpus to 5 parcels with scenario variety"
  ```

  Exact commit message: `feat(h1): expand corpus to 5 parcels with scenario variety`
  (Update number to match actual parcel count if P5 optional was added.)

---

## Appendix: Scenario → Success Criteria Cross-Reference

| Scenario | Verified by |
|----------|-------------|
| P1 Subdivision-only (Seville tract) | `/parcel/{TRACT_APN}` renders lc-004, no deed chain |
| P2 Shea Homes same-day pattern | `/parcel/{P2_APN}` shows corporate grantor deed + same-day DOT |
| P2 CC&R on Seville lots | lc-004 appears on POPHAM + P1 + P2 Encumbrance panels |
| P3 HELOC / 2nd DOT | `/parcel/{P3_APN}/encumbrances` shows 2 open DOT lifecycles |
| P4 HOGUE chain extension | `/parcel/304-77-689` shows 3-link chain |
| Search coverage | All new parcels searchable by APN, address, owner, instrument number |
| Build clean | `npm test && npm run lint && npm run build` pass |
