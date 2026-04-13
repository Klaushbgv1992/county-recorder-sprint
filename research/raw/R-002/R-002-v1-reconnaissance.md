# R-002 v1 Reconnaissance Results

**Date:** 2026-04-13
**Status:** Partial success (tool-use cap hit before instrument retrieval)
**No fabrication:** Browser session returned real findings and refused to make up instrument data.

## Findings

### 1. Assessor Endpoint Confirmed
- URL pattern: `https://mcassessor.maricopa.gov/mcs/?q={query}&mod=pd`
- Works for address search, APN lookup, and parcel detail

### 2. Search Strategy Discovery
- **Subdivision-name searches are too noisy:** "SEVILLE GILBERT" returned 3,156 HOA-common-area results
- **Street-name + city searches are clean:** "E PALMER ST GILBERT" returned residential single-family rows directly
- **Conclusion:** Use street+city search, not subdivision search

### 3. Prior APN 112-19-038A
- This is the Maricopa County government building — ignore

### 4. Pre-Qualified Shortlist

All on E Palmer St, Gilbert 85298. Individual owners (no trusts). Two subdivisions represented.

#### Shamrock Estates Ph 2A
| APN | Address | Owner |
|-----|---------|-------|
| 304-77-670 | 2819 E Palmer St | HARMON JONATHAN D/GENEAN A |
| 304-77-689 | 2715 E Palmer St | HOGUE JASON/MICHELE |
| 304-77-692 | 2755 E Palmer St | KENNEDY JOHN A/ANGEL M |
| 304-77-696 | 2752 E Palmer St | NAJOR DAVID JOE/LINA LUISE |
| 304-77-699 | 2716 E Palmer St | MADSEN JACOB R/ALLIE |

#### Seville Parcel 3
| APN | Address | Owner |
|-----|---------|-------|
| 304-78-384 | 3692 E Palmer St | HUGGARD RANDALL/YVONNE |
| 304-78-386 | 3674 E Palmer St | POPHAM CHRISTOPHER/ASHLEY |
| 304-78-388 | 3656 E Palmer St | JOHNSON TROY W/JUANITA |
| 304-78-399 | 3691 E Palmer St | TORRES RAMON E/LIZETH C |
| 304-78-400 | 3683 E Palmer St | GARCIA LUIS BELTRAN/CHRISTINE PEREZ |
