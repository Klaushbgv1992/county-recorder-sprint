# Parcel Candidates

Source: R-002-v1 reconnaissance + R-002-v2 parcel detail (2026-04-13)

---

## Correction (2026-04-14)

**Claim corrected:** the original R-002 write-up below asserted that
HOGUE parcel `304-77-689` had a DOT recorded on **2020-08-12**. That
claim was **wrong**. It was the result of name-search contamination
during R-002 reconnaissance — the 2020-08-12 DOT was recorded against a
different HOGUE person on a different parcel, and was incorrectly
attributed to `304-77-689` in the candidates table.

**Ground truth for `304-77-689` in the curated corpus:**

- **2015-07-17** — warranty deed `20150516729` (HOGUE purchase)
- **2015-07-17** — deed of trust `20150516730` (same-day financing)
- **No post-2015 activity located in the searched corpus.**

HOGUE's lifecycle entry in `data/lifecycles.json` (`lc-003`) is marked
**open** with the rationale: "No release, assignment, or reconveyance
located in the searched corpus for HOGUE 2015 DOT. Maricopa public API
does not support name-filtered document search, so a release outside
the curated HOGUE chain cannot be ruled out via the API alone."

The original candidate-table text below is preserved for audit. The
specific "YES (2020-08-12)" cell in the table is the contaminated
assertion; treat it as retracted. This correction is itself a
demo-strengthening finding — concrete proof of the same-name
contamination issue logged as Decision #25.

---

## Original write-up (preserved for audit; 2020-08-12 DOT claim is
corrected above)

## Scoring Criteria
- Chain depth (number of deeds in last 20 years)
- DOT lifecycle richness (refi in 2020-2022, assignments, releases)
- Absence of NOD/foreclosure noise
- Clean legal description (subdivision lot preferred)
- Bonus: HELOC, assignment chain, ambiguous release, UCC filing

## Candidates

| # | APN | Address | Owner | Subdivision | Deeds | DOTs | Refi 2020-22 | Assignments | Releases | NOD/REO | Bonus | Verdict |
|---|-----|---------|-------|-------------|-------|------|-------------|-------------|----------|---------|-------|---------|
| 1 | 304-77-689 | 2715 E Palmer St, Gilbert | HOGUE JASON/MICHELE | Shamrock Estates Ph 2A | 2+ | 1+ | ~~YES (2020-08-12)~~ *(corrected: no refi on this parcel — contamination)* | Yes | TBD | None | Assignment chain | BACKUP |
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
Reasons (as originally written — reason #1 is now corrected above):
1. ~~2020-08-12 DOT is in-window~~ *(corrected: that DOT was not on this parcel; HOGUE on 304-77-689 is purchase-only in the corpus)*
2. Assignment chain provides assignment-of-DOT demo content
3. More same-name contamination (HOGUE JASON vs HOGUE JASON A variants across properties)

**Dropped: 304-78-400 (GARCIA)**
Reason: No DOT in 2020-2022 window. Per R-002-v2 acceptance criteria, out-of-window candidates are not acceptable.

## Curation Notes

### Same-Name Contamination
Recorder name search returns instruments from ALL properties owned by a person. Instrument counts from name search are inflated. The DEED-button-confirmed chain is ground truth for a specific parcel.

**The 2020-08-12 DOT attribution error at the top of this file is a
first-hand example of this exact contamination pattern.**

### Curation Rule A
An instrument belongs to the locked parcel only if its names list includes the parcel's owner AND at least one other party appears on a prior/subsequent deed in the DEED-button-confirmed chain.

### Curation Rule B
Same-day recording number groups (e.g., WAR DEED + DEED TRST recorded same day) are linked transactions. The DEED TRST is the financing for that deed.

### Open Verification
Instrument 20150851414 (POPHAM, 2015-12-01, WAR DEED) needs API verification to determine if it's a Palmer St transaction or a different POPHAM property.
