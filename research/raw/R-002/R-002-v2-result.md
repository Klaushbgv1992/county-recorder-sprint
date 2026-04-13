# R-002-v2 Results — Parcel Detail + Recorder Walk

**Date:** 2026-04-13
**Status:** COMPLETE — 2 of 3 APNs meet DOT-window criterion
**Scope:** 3 pre-qualified APNs from R-002-v1 reconnaissance

---

## Candidate Summary

| # | APN | Address | Owner | Instruments (est.) | DOT 2020-2022 | Bonus | Status |
|---|-----|---------|-------|--------------------|----------------|-------|--------|
| 1 | 304-77-689 | 2715 E Palmer St, Gilbert | HOGUE JASON/MICHELE | ~31 (inflated by same-name contamination) | YES — 2020-08-12 | Assignment chain | BACKUP |
| 2 | 304-78-386 | 3674 E Palmer St, Gilbert | POPHAM CHRISTOPHER/ASHLEY | ~10-12 (Palmer-specific from 2013+) | YES — 2021-01-19 | 3-day release lifecycle, living trust purchase, UCC filing | PRIMARY |
| 3 | 304-78-400 | 3683 E Palmer St, Gilbert | GARCIA LUIS BELTRAN/CHRISTINE PEREZ | TBD | NO — out of window | N/A | DROPPED |

## Critical Finding: Same-Name Instrument Contamination

The recorder name search returns instruments from ALL properties owned by a person, not just the target parcel. This inflates instrument counts and introduces noise.

### APN 1 (HOGUE)
- Name search for "HOGUE" returned 31 instruments
- Includes HOGUE JASON A (middle-initial variant) from different properties
- DEED-button-confirmed chain for Palmer St is the ground truth
- Pre-2015 instruments and "HOGUE JASON A" entries are suspect

### APN 2 (POPHAM)
- Instruments 1-10 (2004-2012) are almost certainly from other POPHAM properties
- POPHAM CHRISTOPHER has Maricopa records back to 2004
- Palmer St purchased 2013-02-27 — chain starts there
- Palmer-specific chain is ~10-12 instruments from 2013 onward
- **Instrument 20150851414** (2015-12-01, WAR DEED) needs API verification: could be interim Palmer St sale OR different POPHAM property

### APN 3 (GARCIA)
- Dropped: no DOT in 2020-2022 window per acceptance criteria

## Demo Significance

This contamination finding is a **demo strength**:
- Concrete example of the disintermediation thesis
- County's name-based search cannot distinguish between multiple properties owned by the same person
- Our prototype's parcel-keyed indexing fixes this exact problem
- Goes directly into pain-point documentation and demo script

## POPHAM Key Instruments (pending API verification)

| Recording Number | Date | Type | Notes |
|------------------|------|------|-------|
| 20130183449 | 2013-02-27 | (deed — purchase) | Palmer St acquisition |
| 20130183450 | 2013-02-27 | (deed of trust) | Purchase financing |
| 20150851414 | 2015-12-01 | WAR DEED | NEEDS VERIFICATION — Palmer or other property? |
| 20210057846 | 2021-01-19 | (deed of trust) | Refi DOT — in window |
| 20210057847 | 2021-01-19 | (related) | Same-day group |
| 20210075858 | 2021-01-22 | (release) | 3-day release — clean lifecycle pair |

## Parcel Lock Recommendation

- **Primary:** 304-78-386 (POPHAM) — 2021 DOT with 3-day release, living trust purchase, UCC filing chain, less same-name contamination
- **Backup:** 304-77-689 (HOGUE) — 2020 DOT, more same-name noise but viable fallback
- **Dropped:** 304-78-400 (GARCIA) — no DOT in 2020-2022 window
