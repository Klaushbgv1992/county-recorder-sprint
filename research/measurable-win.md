# Measurable Win

Source: R-001 portal scouting + R-002-v2 parcel detail walks (2026-04-13)

## Per-Parcel Workflow Counts (R-002-v2)

### APN 304-77-689 — HOGUE (Backup)
| Metric | Count | Notes |
|--------|-------|-------|
| **(a) Total clicks** assessor → first recorder image | TBD | Pending exact count from browser session |
| **(b) Peak browser tabs** | 3+ | Assessor + recorder search + document image |
| **(c) Separate search sessions** | 3+ | DEED button lookup + current owner name search + prior owner name search |
| **(d) Pain points** | See below | |

Pain points observed:
- DEED button opens a single document reference, not an instrument list for the parcel
- Name search for "HOGUE" returns instruments from multiple properties (same-name contamination)
- HOGUE JASON vs HOGUE JASON A variants create duplicate/ambiguous rows
- No way to filter name search results by address or APN
- Must manually cross-reference each instrument against the assessor parcel to confirm it belongs to Palmer St

### APN 304-78-386 — POPHAM (Primary)
| Metric | Count | Notes |
|--------|-------|-------|
| **(a) Total clicks** assessor → first recorder image | TBD | Pending exact count from browser session |
| **(b) Peak browser tabs** | 3+ | Assessor + recorder search + document image |
| **(c) Separate search sessions** | 3+ | DEED button lookup + current owner name search + prior owner name search |
| **(d) Pain points** | See below | |

Pain points observed:
- DEED button yields single document, not full instrument list for the parcel
- Name search returns instruments from 2004 onward — POPHAM didn't purchase Palmer St until 2013
- Pre-2013 instruments are from other POPHAM properties, but recorder provides no way to distinguish
- POPHAM CHRISTOPHER vs POPHAM CHRISTOPHER A appear as separate index entries for the same recording number
- Must open each instrument individually to verify it relates to Palmer St address
- No back-link from recorder to assessor — context is lost on each tab switch

### APN 304-78-400 — GARCIA (Dropped)
| Metric | Count | Notes |
|--------|-------|-------|
| **(a) Total clicks** | TBD | Partial evaluation before drop |
| **(b) Peak browser tabs** | 3+ | Same pattern |
| **(c) Separate search sessions** | 2+ | DEED button + name search |
| **(d) Pain points** | Same as above | No DOT in 2020-2022, dropped per criteria |

## Aggregate "Before" Numbers (for demo script)

| Metric | Current Workflow | Our Prototype |
|--------|-----------------|---------------|
| Domains touched per parcel evaluation | 3 (assessor, recorder UI, recorder API/image) | 1 |
| Tabs required | 3+ (assessor, recorder search, document viewer) | 1 |
| Search sessions per parcel | 3+ (DEED button, current owner, prior owner) | 1 (parcel-keyed) |
| Same-name disambiguation | Manual — examiner must cross-check each instrument | Automatic — parcel-keyed index eliminates contamination |
| Grantor/grantee role identification | Manual — read each document | Pre-curated with provenance tags |
| APN↔recorder cross-reference | One-way (assessor→recorder only, via legacy book/page) | Bidirectional |
| Deep-linkable document URLs | None (JS modals, no URL per document) | Direct links per instrument |
