# Parcel Candidates

Source: R-002-v1 reconnaissance + R-002-v2 parcel detail (2026-04-13)

## Scoring Criteria
- Chain depth (number of deeds in last 20 years)
- DOT lifecycle richness (refi in 2020-2022, assignments, releases)
- Absence of NOD/foreclosure noise
- Clean legal description (subdivision lot preferred)
- Bonus: HELOC, assignment chain, ambiguous release, UCC filing

## Candidates

| # | APN | Address | Owner | Subdivision | Deeds | DOTs | Refi 2020-22 | Assignments | Releases | NOD/REO | Bonus | Verdict |
|---|-----|---------|-------|-------------|-------|------|-------------|-------------|----------|---------|-------|---------|
| 1 | 304-77-689 | 2715 E Palmer St, Gilbert | HOGUE JASON/MICHELE | Shamrock Estates Ph 2A | 2+ | 1+ | YES (2020-08-12) | Yes | TBD | None | Assignment chain | BACKUP |
| 2 | 304-78-386 | 3674 E Palmer St, Gilbert | POPHAM CHRISTOPHER/ASHLEY | Seville Parcel 3 | 2+ | 1+ | YES (2021-01-19) | TBD | YES (2021-01-22, 3-day) | None | Living trust purchase, UCC filing, 3-day release lifecycle | PRIMARY |
| 3 | 304-78-400 | 3683 E Palmer St, Gilbert | GARCIA LUIS BELTRAN/CHRISTINE PEREZ | Seville Parcel 3 | TBD | TBD | NO | TBD | TBD | None | N/A | DROPPED |

## Decision

**Primary: 304-78-386 (POPHAM)**
Reasons:
1. 2021-01-19 DOT has a 3-day release (2021-01-22), creating a clean lifecycle pair for the Encumbrance Lifecycle Panel
2. Purchase from a living trust adds legal nuance to the chain-of-title demo
3. UCC filing chain is demo-differentiating (unusual instrument type for residential)
4. Less same-name contamination than HOGUE — cleaner curation path

**Backup: 304-77-689 (HOGUE)**
Reasons:
1. 2020-08-12 DOT is in-window
2. Assignment chain provides assignment-of-DOT demo content
3. More same-name contamination (HOGUE JASON vs HOGUE JASON A variants across properties)

**Dropped: 304-78-400 (GARCIA)**
Reason: No DOT in 2020-2022 window. Per R-002-v2 acceptance criteria, out-of-window candidates are not acceptable.

## Curation Notes

### Same-Name Contamination
Recorder name search returns instruments from ALL properties owned by a person. Instrument counts from name search are inflated. The DEED-button-confirmed chain is ground truth for a specific parcel.

### Curation Rule A
An instrument belongs to the locked parcel only if its names list includes the parcel's owner AND at least one other party appears on a prior/subsequent deed in the DEED-button-confirmed chain.

### Curation Rule B
Same-day recording number groups (e.g., WAR DEED + DEED TRST recorded same day) are linked transactions. The DEED TRST is the financing for that deed.

### Open Verification
Instrument 20150851414 (POPHAM, 2015-12-01, WAR DEED) needs API verification to determine if it's a Palmer St transaction or a different POPHAM property.
