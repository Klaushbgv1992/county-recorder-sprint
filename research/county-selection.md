# County Selection — Decision Table

## Scoring Criteria (weighted by sprint risk)

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Free document images | Critical | Paywalled = dead demo |
| Clean index metadata | Critical | Need structured grantor/grantee, instrument type, recording date |
| APN/address bridge | High | Examiner starts address → APN → instruments |
| Instrument type clarity | High | Distinct labels for deeds, DOTs, assignments, releases |
| Image quality | Medium | Legible scans for proof drawer |
| Online history depth | Medium | Need >=15 years for full chain |
| Mortgage lifecycle likelihood | Medium | DOT states slightly preferred |

## Decision

| County | Role | Status | Rationale |
|--------|------|--------|-----------|
| **Maricopa AZ** | Primary | CONFIRMED (R-001) | Free images to 1974, undocumented public REST API with JSON metadata + deterministic PDF/PNG URLs, 272 document types, name index 1871-2026, assessor shows APN with DEED cross-link |
| Clark NV | Backup | Not needed | Maricopa confirmed on all criteria |
| Salt Lake UT | Skipped | Not needed | Maricopa confirmed on all criteria |
| Franklin OH | Skipped | Not needed | Maricopa confirmed on all criteria |

## Confirmed Scores (Maricopa, from R-001)

| Criterion | Score | Evidence |
|-----------|-------|----------|
| Free document images | PASS | No login, no payment. PDF + PNG. Verified for 2026, 2000, 1974. |
| Clean index metadata | PASS (with caveats) | Recording#, date, type, names, pages present. BUT: no grantor/grantee distinction (flat names[]), no legal description, no APN. |
| APN/address bridge | PARTIAL | Assessor shows APN + has DEED button linking to recorder via legacy book/page search. One-way only — recorder has no APN field. |
| Instrument type clarity | PASS | 272 document codes. Deed family has 17+ distinct labels including DEED OF TRUST, ASSIGNMENT OF DEED OF TRUST, DEED OF RELEASE & FULL RECONVEYANCE OF D/TR. |
| Image quality | PASS | PDF and PNG with "Unofficial Document" watermark. Legible. |
| Online history depth | PASS++ | Images to April 1974. Name index to June 1871. 31 years beyond our 2005 minimum. |
| Mortgage lifecycle likelihood | HIGH | Massive residential volume (134 deeds in 30 days, 500+ in Jan 2000). DOT state. |

## Skip Reasoning (Salt Lake + Franklin + Clark)

All three backup/skipped counties are no longer needed. Maricopa passed all 5 acceptance criteria with extraordinary margins (1974 lookback vs 2005 minimum, 272 doc types vs 5 minimum). Additionally, the discovery of an undocumented public REST API providing clean JSON metadata and deterministic image URLs makes Maricopa significantly stronger than any backup candidate for demo data quality.

Salt Lake, Franklin, and Clark remain theoretically available if Maricopa's portal goes down during the sprint, but this is mitigated by our local-serving architecture — all demo data and images are captured locally.

## Data-Model Findings That Affect Schema

1. **No grantor/grantee distinction** — Maricopa API returns flat `names[]` array. Role assignment requires reading document images. All grantor/grantee fields get `provenance: "manual_entry"`.
2. **No legal description in structured data** — Only in PDF body. Every legal description is `manual_entry` or `ai_extraction`.
3. **No APN in recorder** — Assessor→recorder link is one-way via legacy docketBook/pageMap. Prototype's bidirectional APN bridge is the concrete moat moment.
