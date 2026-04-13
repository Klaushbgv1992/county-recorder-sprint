# R-001 Raw Result — Maricopa County Portal Scout

Date: 2026-04-13
Status: COMPLETE — All 5 acceptance criteria PASS

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Images free, no login | PASS — verified for 2026, 2000, and 1974 deeds |
| 2 | Index metadata minimum | PASS — recording#, date, type, names, pages (caveat: no grantor/grantee distinction, no legal description, no APN) |
| 3 | 5+ distinct doc types | PASS — 272 codes, 17+ deed-family labels |
| 4 | Image lookback >= 2005 | PASS — reaches April 1974 (31 years beyond criterion) |
| 5 | Assessor shows APN | PASS — APN, owner, address, subdivision, property type displayed; DEED cross-link to recorder |

## Endpoints

### Recorder Public API (undocumented, no auth)
- Base: https://publicapi.recorder.maricopa.gov
- GET /documents/{11-digit recordingNumber} → JSON metadata
- GET /preview/pdf?recordingNumber={id} → full PDF (all pages)
- GET /preview/image?recordingNumber={id}&page={n} → page PNG

### Recorder User-Facing
- Homepage: https://recorder.maricopa.gov/
- Search: https://recorder.maricopa.gov/recording/document-search.html#tab-doc-search
- Results: GET /recording/document-search-results.html?documentTypeSelector=code&documentCode={CODE}&beginDate=YYYY-MM-DD&endDate=YYYY-MM-DD
- Book search: GET /recording/document-search-results.html?mode=book&docketBook={book}&pageMap={page}
- Preview: GET /recording/document-preview.html?recordingNumber={id}&suffix=&pages={n}

### Legacy Static
- https://legacy.recorder.maricopa.gov/UnOfficialDocs/pdf/{recordingNumber}.pdf
- Works for recent docs (2026 confirmed), 404s for older docs

### Assessor
- Homepage: https://mcassessor.maricopa.gov/
- Search: GET /mcs/?q={address or parcel}
- Parcel detail: GET /mcs/?q={APN without dashes}&mod=pd
- Recorder cross-link via DEED button: constructs recorder book/page search URL

## Recorder Data Model (from /documents/{id})

Fields:
- names: array of strings — FLAT, NO ROLE LABELS
- documentCodes: array of strings
- recordingDate: string, M-D-YYYY format (no leading zeros)
- recordingNumber: string, 11-digit
- pageAmount: number
- docketBook: number
- pageMap: number
- affidavitPresent: boolean
- affidavitPageAmount: number
- restricted: boolean (A.R.S. section 11-483 flag)

Governance gaps:
- No grantor/grantee distinction — just flat names array
- No legal description field (only in PDF body, OCR-extractable)
- No APN / parcel cross-reference
- No cross-referenced document links
- Flat documentCodes array with no hierarchy

## Assessor Data Model (verbatim labels)

Summary: APN (Parcel #), Property classification, Address, Owner, Subdivision, MCR #, Full cash value
Actions: MAPS, PICTOMETRY, VIEW/PAY TAX BILL, DEED, OWNER, VALUATIONS, ADDITIONAL INFO, SKETCHES, MAP FERRET, SIMILAR PARCELS, REGISTER RENTAL, PRINT DETAILS
Property info: MCR #, Description, Lat/Long, Lot Size, Lot #, High School District, Elementary School District, Local Jurisdiction

## Instrument Number Format
11 digits, YYYY + 7-digit sequence, no separators
Examples: 19740075524, 20000000756, 20000002268, 20260150820, 20260155983

## APN Format
NNN-NN-NNN[X] (3 digits book, 2 digits map, 3 digits parcel, optional letter suffix)
URL form strips dashes: 11219038A
Examples: 112-05-091B, 112-19-127, 112-19-038A, 105-56-065B

## Document Code Dropdown (deed family, verbatim)
ACCEPTANCE OF COMMUNITY PROPERTY DEED, ASSIGNMENT OF DEED OF TRUST, BARGAIN AND SALE DEED, BENEFICIARY DEED, COMMUNITY PROPERTY DEED, CONSERVATORS DEED, DEED OF RELEASE & FULL RECONVEYANCE OF D/TR, DEED OF TRUST, DEED/USE WITH ANY GENERAL DEED TYPE, DIVORCE DEED, GIFT DEED, GRANT DEED, JOINT TENANCY DEED, MINERAL DEED, PROBATE DEED OF ANY TYPE/USED TO TRANSFER PROP, QUIT CLAIM DEED, ROYALTY DEED

Total document codes in dropdown: 272

## Name Index Coverage
1871-06-01 through 2026-04-09 (155 years)

## Corpus Boundary Date
2026-04-09

## Image Access
- Formats: PDF (all pages single file), PNG (page-by-page)
- Watermark: "Unofficial Document" overlay
- Auth: None
- Confirmed eras: 2026 (legacy static PDF), 2000 (preview PNG), 1974 (preview PNG)

## Pain Points

### Architectural
- Three separate domains for same workflow, no unified access
- Detail view is Bootstrap modal with no deep-linkable URL per document
- Public API exists but is NOT documented or surfaced
- Assessor→recorder cross-link is a SEARCH, not a deep link
- Recorder has NO cross-link back to assessor — no APN field

### UI Friction
- <a href='#'> with JS-only handlers breaks right-click, middle-click, keyboard nav
- Modal stacks restricted/free/purchase UI filtered by visibility
- "Buy Options" header spans both FREE PDF/PNG links AND paid Cart flow
- Two clicks from homepage to reach usable search form

### Data Governance
- No grantor/grantee distinction in public API
- No legal description in structured data
- No APN / parcel cross-reference between recorder and assessor
- Document code taxonomy has typos and 272 codes with duplicated backend values
- Assessor cross-links use legacy docketBook/pageMap, not recording number

## Volume Samples
- DEED, 30 days (2026-03-15 to 2026-04-13): 134 results
- DEED, 31 days (2000-01-01 to 2000-01-31): 500+ results
- DEED by book 10581 page 0144: 1 result

## MLG Framing
Maricopa is a model case for the disintermediation thesis. The county has a clean REST API (undocumented), free deep-linkable document images back to 1974, and a name index back to 1871. But all of this is trapped behind a modal-only UI, JS-only anchor handlers, a "Buy Options" label implying payment where none exists, and zero public documentation of the underlying API. Commercial aggregators scrape this public API and re-wrap it as paid products.
