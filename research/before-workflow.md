# Before Workflow — Examiner Pain Points

Source: R-001 Maricopa County portal scouting + R-002-v2 parcel detail walks (2026-04-13)

## Architectural Pain Points

1. **Three separate domains for one workflow.** Recorder (recorder.maricopa.gov), public API (publicapi.recorder.maricopa.gov), and assessor (mcassessor.maricopa.gov) are completely disconnected systems. An examiner starting with an address must navigate all three.

2. **No deep-linkable document URLs.** Document detail view is a Bootstrap modal — no URL per document. Cannot bookmark, share, or reference a specific instrument by URL. Right-click and middle-click broken by `<a href='#'>` JS-only handlers.

3. **Undocumented public API.** A clean REST API exists at publicapi.recorder.maricopa.gov with JSON metadata and deterministic PDF/PNG URLs — but the county does not document or surface it. Commercial aggregators discover and scrape it; individual examiners never know it exists.

4. **One-way assessor→recorder link.** Assessor has a DEED button that constructs a recorder book/page search, but the recorder has NO cross-link back. No APN field anywhere in the recorder system. Examiner must manually maintain the assessor↔recorder context.

5. **Legacy book/page bridging only.** The assessor→recorder cross-link uses docketBook/pageMap (pre-2003 system), not the modern 11-digit recording number. It's a search, not a deep link — may return multiple results.

## UI Friction Points

1. **"Buy Options" header misleads.** Both FREE PDF/PNG download links AND paid certified-copy cart flow appear under the same "Buy Options" header. An examiner unfamiliar with the portal may assume all document access is paywalled.

2. **Two clicks from homepage to search form.** Homepage does not directly expose the document search. Must navigate to the search page first.

3. **JS-only click handlers.** `<a href='#'>` elements with JavaScript-only handlers break standard browser navigation (right-click → open in new tab, middle-click, keyboard navigation).

4. **Modal stacks.** Document detail is rendered in a modal that layers restricted/free/purchase UI filtered by CSS visibility. Cluttered and confusing.

5. **DEED button opens single document, not instrument list.** The assessor's DEED button routes to a recorder book/page search that returns a single document reference — NOT a full list of instruments for the parcel. Examiner must then start a separate name search to find all instruments. (Discovered in R-002-v2)

6. **New tab per DEED click, no back-link.** Each DEED button click opens a new browser tab. The recorder page has no link back to the assessor parcel. Context is lost — examiner must manually switch tabs to cross-reference. (Discovered in R-002-v2)

## Search & Indexing Pain Points (from R-002-v2)

1. **No APN/address filter on recorder name search.** Recorder name search returns ALL instruments where a person appears, across ALL properties they have ever owned. There is no way to filter by parcel, address, or APN. An examiner evaluating a single property must manually inspect every result to determine which instruments relate to the target parcel.

2. **Name variant fragmentation.** The same person may be indexed under multiple name variants (e.g., POPHAM CHRISTOPHER vs POPHAM CHRISTOPHER A, HOGUE JASON vs HOGUE JASON A). Each variant is a separate index entry. The examiner must search for all variants and deduplicate results manually.

3. **Duplicate rows for name variants.** A single recording number may appear multiple times in name search results — once per name variant. This inflates result counts and obscures the actual instrument count for a person.

4. **Same-name contamination across properties.** When an owner has held multiple Maricopa properties, their name search returns instruments from all of them interleaved chronologically. There is no visual indicator of which property an instrument relates to. The examiner must open each instrument and read the legal description to determine the property. (E.g., POPHAM name search returns records from 2004, but Palmer St was purchased in 2013 — the 2004-2012 instruments are from other properties.)

## Data Governance Gaps

1. **No grantor/grantee role distinction.** Public API returns a flat `names[]` array per document. No way to know who is grantor vs grantee without reading the actual document.

2. **No legal description in structured data.** Only extractable via OCR from the PDF body.

3. **No parcel cross-reference.** Recorder has zero APN data. Assessor has APN but bridges to recorder via legacy book/page only.

4. **272-code taxonomy with duplicates and typos.** Document code dropdown is a legacy hand-curated list with no hierarchy or code families.

5. **Assessor cross-links use legacy format.** docketBook/pageMap instead of modern recording numbers.

## Measurable-Win Evidence

### From R-001 (Portal-Level)
- **Domains touched for one document lookup:** 3 (assessor → recorder search → recorder modal)
- **Tab spawl potential:** At minimum 2 tabs (assessor + recorder), likely 3+ when comparing instruments
- **Deep-link availability:** NONE — no URL per document in the recorder UI
- **API documentation:** NONE — undocumented public API exists but is invisible to users
- **Grantor/grantee role assignment:** MANUAL for every document — not provided by county data

### From R-002-v2 (Parcel-Level)
- **Search sessions per parcel evaluation:** 3+ (DEED button, current owner name search, prior owner name search)
- **Same-name disambiguation effort:** Manual inspection of every name search result to filter out other-property instruments
- **Name variant searches required:** Multiple per owner (must try all known variants)
- **False positive rate in name search:** High — POPHAM returned ~20 instruments, only ~10-12 relate to Palmer St (50% noise)
