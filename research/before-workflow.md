# Before Workflow — Examiner Pain Points

Source: R-001 Maricopa County portal scouting (2026-04-13)

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

## Data Governance Gaps

1. **No grantor/grantee role distinction.** Public API returns a flat `names[]` array per document. No way to know who is grantor vs grantee without reading the actual document.

2. **No legal description in structured data.** Only extractable via OCR from the PDF body.

3. **No parcel cross-reference.** Recorder has zero APN data. Assessor has APN but bridges to recorder via legacy book/page only.

4. **272-code taxonomy with duplicates and typos.** Document code dropdown is a legacy hand-curated list with no hierarchy or code families.

5. **Assessor cross-links use legacy format.** docketBook/pageMap instead of modern recording numbers.

## Measurable-Win Evidence (from R-001)

These counts will be supplemented by R-002 parcel-specific counts:

- **Domains touched for one document lookup:** 3 (assessor → recorder search → recorder modal)
- **Tab spawl potential:** At minimum 2 tabs (assessor + recorder), likely 3+ when comparing instruments
- **Deep-link availability:** NONE — no URL per document in the recorder UI
- **API documentation:** NONE — undocumented public API exists but is invisible to users
- **Grantor/grantee role assignment:** MANUAL for every document — not provided by county data
