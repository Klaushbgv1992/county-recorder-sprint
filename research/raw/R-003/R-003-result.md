# R-003 Result — Corpus Download for POPHAM 304-78-386

**Date:** 2026-04-13
**Status:** COMPLETE — all 5 instruments downloaded and verified

---

## Download Summary

```yaml
corpus:
  parcel: 304-78-386
  address: 3674 E Palmer St, Gilbert, AZ 85295
  owner: POPHAM CHRISTOPHER / ASHLEY
  total_size_bytes: 3533637
  total_size_mb: 3.4
  instrument_count: 5

instruments:
  - recording_number: "20130183449"
    file_path: research/raw/R-003/pdfs/20130183449.pdf
    file_size_bytes: 174797
    page_count: 5
    api_page_amount: 5
    page_count_match: true
    download_method: publicapi preview/pdf (followed 302 redirect)
    document_type: WAR DEED + AF DISCLS
    verification: PASS
    notes: "Warranty deed + affidavit of disclosure. 2013-era scan, 1692x2204px at 200dpi. Legible."

  - recording_number: "20130183450"
    file_path: research/raw/R-003/pdfs/20130183450.pdf
    file_size_bytes: 1266263
    page_count: 18
    api_page_amount: 18
    page_count_match: true
    download_method: publicapi preview/pdf (followed 302 redirect)
    document_type: DEED TRST
    verification: PASS
    notes: "Purchase DOT. 18 pages is typical for a residential DOT (boilerplate). 2013-era scan."

  - recording_number: "20210057846"
    file_path: research/raw/R-003/pdfs/20210057846.pdf
    file_size_bytes: 156290
    page_count: 2
    api_page_amount: 2
    page_count_match: true
    download_method: publicapi preview/pdf (followed 302 redirect)
    document_type: T FIN ST
    verification: PASS
    notes: "UCC-3 termination (SunPower solar). 2021-era scan, 1700x2800px at 200dpi."

  - recording_number: "20210057847"
    file_path: research/raw/R-003/pdfs/20210057847.pdf
    file_size_bytes: 1870296
    page_count: 12
    api_page_amount: 12
    page_count_match: true
    download_method: publicapi preview/pdf (followed 302 redirect)
    document_type: DEED TRST
    verification: PASS
    notes: "Refi DOT. Bay Equity LLC lender. Loan amount $225,000. Address confirmed: 3674 E Palmer St, Gilbert, AZ 85295. 2021-era scan."

  - recording_number: "20210075858"
    file_path: research/raw/R-003/pdfs/20210075858.pdf
    file_size_bytes: 65991
    page_count: 1
    api_page_amount: 1
    page_count_match: true
    download_method: publicapi preview/pdf (followed 302 redirect)
    document_type: REL D/T
    verification: PASS
    notes: "Release of 2013 DOT (20130183450). Executed by Wells Fargo Home Mortgage / CAS Nationwide Title Clearing. MERS as beneficiary, as nominee for VIP Mortgage. 1 page. 2021-era scan."
```

---

## Recovered Trust Name (Decision #30)

The API returned: `BRIAN J AND TANYA R MADISON LIVING TRUST DATED FEBRUAR` (truncated at ~53 chars)

**Full name from PDF page 1 OCR:**

> **THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006**

Grantors as stated in deed: "BRIAN JOSEPH MADISON and TANYA RENAE MADISON, Trustees of THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006"

Additional details recovered from the warranty deed:
- Escrow No.: 00044857-046-CC
- Recording requested by: American Title Service Agency, LLC
- Legal description: Lot 46, 58 SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19; Affidavit of Correction recorded in Document No. 2001-0849180
- Deed dated: 02/07/2013 (recorded 02/27/2013)
- Grantees: CHRISTOPHER POPHAM and ASHLEY POPHAM, husband and wife

---

## Discrepancies Between API Metadata and PDF Content

1. **Trust name truncation (known).** API: 53 chars. PDF: full name with execution date. Decision #30 applies.
2. **Name variants.** API has "POPHAM ASHLEY" and "POPHAM CHRISTOPHER" but PDF shows "ASHLEY POPHAM" and "CHRISTOPHER POPHAM" (first-last order). The 2021 DOT API response also includes "POPHAM ASHLEY A" and "POPHAM CHRISTOPHER A" middle-initial variants that appear to come from the DOT body itself.
3. **Document codes.** The release (20210075858) API returns "REL D/T" but the PDF header reads "DEED OF RELEASE AND FULL RECONVEYANCE" — confirms the short-code vs. long-form mismatch logged in CLAUDE.md.
4. **No content discrepancies.** All page counts match. No missing pages. No watermark variations — all carry the same "Unofficial Document" watermark.

---

## Image Quality Comparison: 2013 vs 2021

| Attribute | 2013-era (20130183449) | 2021-era (20210057847) |
|-----------|----------------------|----------------------|
| Rendered resolution (200dpi) | 1692 × 2204 px | 1700 × 2800 px |
| Scan quality | Good — fully legible, slight gray background | Excellent — clean white background, sharp text |
| Handwriting | Signatures + mailing address in cursive — legible | Signatures only — legible |
| Preprocessing needed? | No — displayable as-is | No — displayable as-is |

Both eras are display-ready for the prototype without image preprocessing.

---

## Download Method Notes

- **All 5 instruments used the publicapi preview/pdf endpoint** with `-L` (follow redirects). The API returns a 302 redirect to the actual PDF.
- The legacy static URL (`legacy.recorder.maricopa.gov/UnOfficialDocs/pdf/{id}.pdf`) was not tested — the publicapi endpoint worked for all documents including 2013-era.
- The **image preview endpoint** (`/preview/image?recordingNumber={id}&page={n}`) returned HTTP 400 with `{"status":400,"error":"Bad Request"}` — this endpoint may require additional parameters or a different URL format. Not needed since PDFs downloaded successfully.
- All PDFs are **scanned image documents** — no embedded text layer. PyMuPDF text extraction returned only the watermark overlay text. Any text extraction requires OCR.

---

## Text Extraction Status

All 5 documents are scanned image PDFs with no embedded text. The text preview files in `research/raw/R-003/text/` contain a placeholder noting this. Phase 3 curation will assign roles and metadata manually from visual inspection, not from extracted text. This is consistent with the manual-curation-preferred constraint.

---

## Readiness Note

This corpus is **sufficient for the Encumbrance Lifecycle Panel demo.** All 5 Palmer St instruments are downloaded with verified page counts, the trust name is recovered in full, both 2013-era and 2021-era scans are legible and display-ready, and the refi lifecycle pair (20210057847 DOT + 20210075858 release, 3-day turnaround) is intact. No gaps surfaced. Phase 2 can hand off to Phase 3 curation without re-fetching any source documents.

The release document (20210075858) reveals an additional chain detail: the release was executed by Wells Fargo Home Mortgage via CAS Nationwide Title Clearing as servicer, with MERS as beneficiary as nominee for VIP Mortgage Inc. This shows the original VIP Mortgage loan was serviced/sold to Wells Fargo — an assignment chain that may or may not have a recorded ASSIGNMENT OF DEED OF TRUST. This is worth checking in Phase 3 but is not blocking.
