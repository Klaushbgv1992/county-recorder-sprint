# Red Team Review

Skeptical-buyer questions and the honest answers. Every answer here points
at a specific file, decision, or verifiable external URL. If an answer is
"we can't", the question stays in the deck — we don't sand off the corners.

---

## Q1: Is the county data real?

**Yes.** The corpus is 7 PDFs and 7 JSON metadata records pulled from the
Maricopa County Recorder public REST API
(`publicapi.recorder.maricopa.gov`, Decision #22). Files live in this
repo at:

- `data/raw/R-003/pdfs/20130183449.pdf` (POPHAM 2013 warranty deed)
- `data/raw/R-003/pdfs/20130183450.pdf` (POPHAM 2013 deed of trust)
- `data/raw/R-003/pdfs/20210057846.pdf` (POPHAM 2021 warranty deed)
- `data/raw/R-003/pdfs/20210057847.pdf` (POPHAM 2021 deed of trust)
- `data/raw/R-003/pdfs/20210075858.pdf` (POPHAM 2021 full reconveyance)
- `data/raw/R-003/pdfs/20150516729.pdf` (HOGUE 2015 warranty deed)
- `data/raw/R-003/pdfs/20150516730.pdf` (HOGUE 2015 deed of trust)

Spot-check any of them:

```bash
curl -s https://publicapi.recorder.maricopa.gov/documents/20210075858
curl -s https://publicapi.recorder.maricopa.gov/documents/20130183450
curl -s https://publicapi.recorder.maricopa.gov/documents/20150516729
```

Compare the returned `names`, `documentCodes`, `recordingDate`, and
`pageAmount` to each instrument's `raw_api_response` block in
`data/instruments/*.json`. They match.

## Q2: Did you fabricate any extracted fields?

**No.** The real-OCR trace for the 2013 warranty deed is stored
verbatim at `data/extraction-traces/20130183449.trace.json`, produced by
Tesseract 4.1.1, timestamped `2026-04-14T02:30:33Z`. The trace contains
the raw page-level OCR text, word counts, and the extracted-field values
with the source snippet each came from.

Proof that we don't hide OCR noise: the trace shows `legal_description`
extracted as `Lot 65, of SEVILLE PARCEL 3, ...` on page 1, while the same
document's page 3 OCR'd the lot as `Lot 687`. The curated ground truth in
`data/instruments/20130183449.json` is **`Lot 46`**, matching the parcel's
plat reference. All three readings are preserved:

- Raw page-1 OCR: "Lot 65" (trace `pages[0].raw_text`)
- Raw page-3 OCR: "Lot 687" (trace `pages[2].raw_text`)
- Extraction entry: `Lot 65, ...` with confidence **0.88** and
  provenance **`ocr`** (trace `extractions[0]`)
- Curated instrument: `Lot 46, SEVILLE PARCEL 3, ...` (instrument JSON
  `legal_description.value`)

We show this discrepancy on stage. It's the live argument for why
provenance + confidence + a visible source snippet are not optional.

The HOGUE trace at `data/extraction-traces/20150516729.trace.json`
extracts `trust_name: null` because the HOGUE warranty deed is
individual-to-individual — no trust was present to recover. We don't
invent one.

## Q3: What happens on a parcel you didn't prep?

**Honest answer: this is a 2-parcel prototype.** POPHAM
(`304-78-386`, 3674 E Palmer St, Gilbert) and HOGUE (`304-77-689`,
2715 E Palmer St, Gilbert) are both real Maricopa County parcels with
real recorded instruments. A third parcel would look identical in the
UI; the pipeline that curated these two (API pull → PDF download → OCR
trace → manual curation → instrument JSON) is the same pipeline that
would scale.

What's *not* automated today:

- DOT party-role assignment (Decision #29 — requires doc-type heuristics
  plus OCR fallback)
- Release matching at scale (the scorer exists in
  `src/logic/release-candidate-matcher.ts` with 12 tests; manual curation
  drives the shown link for this parcel)
- Name-filtered "did we miss a release?" search (Decision #16, and
  Maricopa public API does not expose it)

We don't claim "upload any APN and it works." We claim "we built a
principled pipeline and showed it end-to-end on two real parcels."

## Q4: Why should we believe the release-matching?

Two reasons.

First, the shown link is curated and auditable. `data/links.json`
contains the release edge:

```json
{
  "id": "link-002",
  "source_instrument": "20210075858",
  "target_instrument": "20130183450",
  "link_type": "release_of",
  "provenance": "ocr",
  "confidence": 0.97,
  "examiner_action": "accepted"
}
```

The `20210075858` instrument's own `extracted_fields.released_instrument`
resolves to `20130183450` via OCR — that's the OCR-derived provenance
cited in `links.json`. Ground truth was confirmed by manual inspection
of the PDF.

Second, the scorer that would drive release-matching at scale exists and
is tested. `src/logic/release-candidate-matcher.ts` has 12 tests in
`tests/release-candidate-matcher.test.ts` (verified by `npm run test`).
Manual curation drives the shown link today; the scorer demonstrates
how the same decision would be reproduced across thousands of
lifecycles.

## Q5: Can title plants do this?

No — and the argument rests on three claims, not one:

1. **Verified-through date.** `data/lifecycles.json` contains
   `pipeline_status.verified_through_date: "2026-04-09"` and the
   Encumbrance Lifecycle Panel surfaces it. A title plant can claim
   "indexed through date X" but not "county-authoritatively searched
   through date X" — they don't have custody.
2. **Pipeline status.** Same file: `current_stage: "published"`,
   `last_updated: "2026-04-09"`. A custodian can project pipeline state
   to users; a downstream indexer cannot without making it up.
3. **Authoritative image URLs.** Decision #22: the Maricopa public API
   serves JSON metadata *and* deterministic PDF/PNG URLs. Our prototype
   serves the captured PDFs from `data/raw/R-003/pdfs/`, but the
   authoritative URL a production county portal would serve is
   `https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=NNN`.
   A title plant hosts its own re-scans; only the county hosts the
   official image at a canonical URL.

All three of those claims are visible on the Encumbrance Lifecycle
Panel (Decision #12 — that screen was locked with the moat story from
the start of the build).

## Q6: What about MERS?

Decision #34 is the display rule. Instrument `20210075858` JSON shows
MERS handled correctly:

- `parties[]` lists MERS with role `beneficiary` and a
  `nominee_for: { party_name: "V I P MORTGAGE INC", party_role: "lender" }`
  pointer.
- The same JSON has a `mers_note` field: "MERS is the beneficiary of
  record as nominee for V.I.P. Mortgage, Inc. This release was executed
  by Wells Fargo Home Mortgage via CAS Nationwide Title Clearing, Inc.,
  indicating the loan was transferred from VIP Mortgage to Wells Fargo
  outside the county recording system via MERS."
- The release (20210075858) shows the **actual releasing party** — Wells
  Fargo / CAS Nationwide — not the originator.
- The 2013 DOT (20130183450) shows **MERS as nominee for VIP**, not
  Wells Fargo.

The HOGUE 2015 DOT (`data/instruments/20150516730.json`) has the same
treatment: MERS as nominee for Pinnacle Capital Mortgage LLC, with a
`mers_note` explaining the note may have transferred outside the public
record.

Making MERS visible is itself a disintermediation talking point: the
prototype reveals what the public record can and cannot tell you about
loan ownership chains. That's Decision #34 verbatim.

## Q7: What does the build actually do? Prove it.

Verified on the current worktree branch:

- `npm run build` — TypeScript project references compile clean,
  Vite production build emits `dist/index.html`, `dist/assets/*.css`
  (23.60 kB), `dist/assets/*.js` (323.45 kB). Build time ~224 ms.
- `npm run test` — `Test Files 7 passed (7), Tests 69 passed (69)`.
  Test files: `chain-builder.test.ts`, `citation-formatter.test.ts`,
  `extraction-trace.test.ts`, `lifecycle-status.test.ts`,
  `party-roles.test.ts`, `release-candidate-matcher.test.ts`,
  `search.test.ts`.

Numbers above were captured on this worktree at docs-write time; rerun
locally to verify.

## Q8: Why only Maricopa? What about Clark NV?

Decision #5 ("auto-flip rule") said: if R-001 found Maricopa images
paywalled or account-gated, flip to Clark without asking. Decision #18
recorded the outcome: **Maricopa confirmed on all five criteria** — free
images to 1974, public REST API discovered, 272 document types, name
index 1871–2026. The flip never tripped.

Clark NV remains a documented fallback (Decision #3) but required no
work. If an audience member asks "can you do this in Clark?", the
answer is "the same pipeline would apply; the specific image-URL
patterns and document-code vocabularies differ, and we would scout them
the way R-001 scouted Maricopa."

## Q9: The provenance ratio — is that a real number or marketing?

Real. Decision #35 locks it: across the 5 POPHAM instruments,
provenance splits **22 `public_api` (29%) / 35 `ocr` (47%) / 18
`manual_entry` (24%)**. Each instrument JSON carries its own
`provenance_summary` block — sum them yourself across the POPHAM five
and the numbers match.

The pitch line: the county provides a minority of the fields an
examiner needs. OCR recovers roughly half from documents the county
*already hosts*. The remainder is judgment. The prototype demonstrates
each tier explicitly.
