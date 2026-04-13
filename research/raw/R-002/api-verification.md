# R-002 API Verification — POPHAM Critical Instruments

**Date:** 2026-04-13
**Endpoint:** `GET https://publicapi.recorder.maricopa.gov/documents/{recordingNumber}`
**Result:** All 6 instruments returned 200 with valid JSON.

---

## 20130183449 — Palmer St Purchase Deed

```json
{
    "names": [
        "BRIAN J AND TANYA R MADISON LIVING TRUST DATED FEBRUAR",
        "MADISON BRIAN J",
        "MADISON BRIAN JOSEPH",
        "MADISON TANYA R",
        "MADISON TANYA RENAE",
        "POPHAM ASHLEY",
        "POPHAM CHRISTOPHER"
    ],
    "documentCodes": ["WAR DEED", "AF DISCLS"],
    "recordingDate": "2-27-2013",
    "recordingNumber": "20130183449",
    "pageAmount": 5,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": true,
    "affidavitPageAmount": 1,
    "restricted": false
}
```

**Analysis:** WAR DEED from MADISON LIVING TRUST → POPHAM CHRISTOPHER/ASHLEY. This is the Palmer St purchase. Confirms living-trust-to-individual transfer. AF DISCLS (Affidavit of Disclosure) is bundled — common in AZ residential. Names array: MADISON variants first (grantors per convention), POPHAM last (grantees). Note: trust name truncated at 53 chars — "DATED FEBRUAR" is cut off.

---

## 20130183450 — Purchase Financing DOT

```json
{
    "names": [
        "AMERICAN TITLE SERVICE AGENCY LLC",
        "MORTGAGE ELECTRONIC REGISTRATION SYSTEMS INC MERS",
        "POPHAM ASHLEY",
        "POPHAM CHRISTOPHER",
        "V I P MORTGAGE INC"
    ],
    "documentCodes": ["DEED TRST"],
    "recordingDate": "2-27-2013",
    "recordingNumber": "20130183450",
    "pageAmount": 18,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": false,
    "affidavitPageAmount": 0,
    "restricted": false
}
```

**Analysis:** Same-day as WAR DEED — linked purchase financing (Curation Rule B confirmed). POPHAM as borrowers, VIP MORTGAGE INC as lender, MERS as nominee, AMERICAN TITLE SERVICE AGENCY as trustee. This is the DOT that gets released in 2021. Note: names are alphabetized by entity in the API, NOT in grantor-first convention — the "weak role signal" from name ordering does NOT hold for DOTs with multiple institutional parties.

---

## 20150851414 — WAR DEED (NOT Palmer St)

```json
{
    "names": [
        "POPHAM ASHLEY A",
        "POPHAM CHRISTOPHER",
        "SIVLEY DWANE A",
        "SIVLEY ERENDIRA"
    ],
    "documentCodes": ["WAR DEED"],
    "recordingDate": "12-01-2015",
    "recordingNumber": "20150851414",
    "pageAmount": 2,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": true,
    "affidavitPageAmount": 2,
    "restricted": false
}
```

**Analysis:** POPHAM → SIVLEY. Since the assessor still shows POPHAM as owner of Palmer St, this WAR DEED is for a DIFFERENT POPHAM property. **This confirms the same-name contamination thesis.** This instrument does NOT belong in the Palmer St chain. POPHAM is grantor (selling), SIVLEY is grantee (buying). Note: POPHAM ASHLEY A (with middle initial) vs POPHAM ASHLEY (without) — name variant issue confirmed.

**VERDICT: EXCLUDE from Palmer St chain. Same-name contamination — different property.**

---

## 20210057846 — UCC Termination (Solar Panel Lease)

```json
{
    "names": [
        "POPHAM CHRISTOPHER",
        "SPWR USB 2013 2 LLC"
    ],
    "documentCodes": ["T FIN ST"],
    "recordingDate": "1-19-2021",
    "recordingNumber": "20210057846",
    "pageAmount": 2,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": false,
    "affidavitPageAmount": 0,
    "restricted": false
}
```

**Analysis:** T FIN ST = Termination of Financing Statement (UCC filing). SPWR = SunPower — solar panel lease/PPA termination. Same day as the refi DOT — likely a refi requirement (clear the solar lien before new DOT). This is an unusual instrument type for residential and adds demo color. Document code "T FIN ST" is different from the doc-type list in CLAUDE.md terminology notes — need to add.

---

## 20210057847 — Refi DOT (IN WINDOW: 2021-01-19)

```json
{
    "names": [
        "BAY EQUITY LLC",
        "POPHAM ASHLEY",
        "POPHAM ASHLEY A",
        "POPHAM CHRISTOPHER",
        "POPHAM CHRISTOPHER A"
    ],
    "documentCodes": ["DEED TRST"],
    "recordingDate": "1-19-2021",
    "recordingNumber": "20210057847",
    "pageAmount": 12,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": false,
    "affidavitPageAmount": 0,
    "restricted": false
}
```

**Analysis:** The refi DOT. BAY EQUITY LLC is the lender. POPHAM appears in 4 name variants (ASHLEY, ASHLEY A, CHRISTOPHER, CHRISTOPHER A) — all in the same instrument. This confirms the name-variant fragmentation finding. Recording date 2021-01-19 is IN the 2020-2022 window. Same day as the UCC termination (solar cleared before new DOT).

---

## 20210075858 — Release of 2013 DOT (3-Day Turnaround)

```json
{
    "names": [
        "MORTGAGE ELECTRONIC REGISTRATION SYSTEMS INC",
        "POPHAM ASHLEY",
        "POPHAM CHRISTOPHER",
        "V I P MORTGAGE INC"
    ],
    "documentCodes": ["REL D/T"],
    "recordingDate": "1-22-2021",
    "recordingNumber": "20210075858",
    "pageAmount": 1,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": false,
    "affidavitPageAmount": 0,
    "restricted": false
}
```

**Analysis:** Release of the 2013 purchase DOT (20130183450). VIP MORTGAGE INC + MERS releasing. 3 days after the new refi DOT (2021-01-19 → 2021-01-22). Clean lifecycle pair confirmed. Document code is "REL D/T" — shorter than the "DEED OF RELEASE & FULL RECONVEYANCE OF D/TR" label in CLAUDE.md terminology notes. Both codes exist in the 272-code taxonomy.

---

## Summary

| Recording # | Date | Type | Palmer St? | Chain Role |
|-------------|------|------|-----------|------------|
| 20130183449 | 2013-02-27 | WAR DEED | YES | Purchase deed: MADISON TRUST → POPHAM |
| 20130183450 | 2013-02-27 | DEED TRST | YES | Purchase financing: VIP MORTGAGE |
| 20150851414 | 2015-12-01 | WAR DEED | **NO** | Different property: POPHAM → SIVLEY |
| 20210057846 | 2021-01-19 | T FIN ST | Likely YES | UCC termination: SunPower solar |
| 20210057847 | 2021-01-19 | DEED TRST | YES | Refi DOT: BAY EQUITY (IN WINDOW) |
| 20210075858 | 2021-01-22 | REL D/T | YES | Release of 2013 DOT: VIP MORTGAGE |

## Chain Integrity

The Palmer St chain from 2013 onward is **CLEAN**:
1. 2013-02-27: MADISON LIVING TRUST → POPHAM (WAR DEED) + VIP MORTGAGE DOT
2. 2021-01-19: SunPower UCC termination + BAY EQUITY refi DOT
3. 2021-01-22: VIP MORTGAGE DOT released (3-day turnaround)
4. Current: POPHAM still owns (per assessor)

**20150851414 does NOT create a gap.** It is confirmed same-name contamination from a different property.

## Terminology Notes
- "REL D/T" is a shorter code variant of "DEED OF RELEASE & FULL RECONVEYANCE OF D/TR"
- "T FIN ST" = Termination of Financing Statement (UCC filing)
- "AF DISCLS" = Affidavit of Disclosure (bundled with AZ residential deeds)
- Trust names truncated at ~53 characters in the API

## Open Items

- **20130183449 trust name truncation.** Public API truncates grantor trust name at ~53 chars. The full trust name (with execution date) is needed for provenance accuracy in the demo. DECISION: recover the full trust name during Phase 2 corpus download by OCR-extracting the first page of the PDF, NOT by hand-typing during Phase 3 curation. Rationale: (a) Phase 2 is already downloading all PDFs, so OCR is additive not new work; (b) hand-typing during Phase 3 creates a provenance gap — the corpus would not match the displayed data; (c) this surfaces a second API limitation worth documenting.
