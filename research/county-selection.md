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

| County | Role | Score | Rationale |
|--------|------|-------|-----------|
| **Maricopa AZ** | Primary | Highest confidence | Free online recorder with images, DOT state, massive volume, strong assessor portal, clean metadata |
| **Clark NV** | Backup | High confidence | DOT state, recorder portal exists, good assessor APN data |
| Salt Lake UT | Skipped | Medium | Smaller county, less certain on free image access |
| Franklin OH | Skipped | Lower | Mortgage state adds terminology complexity, image access may be paywalled |

## Skip Reasoning (Salt Lake + Franklin)

Salt Lake and Franklin were skipped to save 2 research handoff roundtrips (~half a day).
Both Maricopa and Clark are DOT states with known free or likely-free online recorder portals.
Scouting 4 counties when 2 high-confidence candidates exist is not justified under a 2-day constraint.

**Defensibility:** If asked why not Ohio or Utah — DOT-state terminology (Deed of Trust / Reconveyance) is more common in high-volume western markets and maps more directly to the examiner workflow we're demoing. Maricopa alone records ~2M documents/year, giving us the best odds of finding an ideal hero parcel.

Salt Lake and Franklin remain available if both primary and backup fail R-001 scouting.

## Auto-Flip Rule

If Maricopa R-001 reveals paywalled or account-gated document images, flip to Clark NV immediately. No additional user roundtrip required — log the flip in CLAUDE.md decision log and emit R-002 for Clark.
