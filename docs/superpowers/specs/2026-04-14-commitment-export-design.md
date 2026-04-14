# Commitment Export — Design Spec

**Date:** 2026-04-14
**Branch:** `feature-commitment-export`
**Goal:** Give the abstractor persona their actual deliverable. A "Copy
Citation" button is not what an abstractor produces; a parcel-level
chain-and-encumbrance abstract (in the structural shape of an ALTA title
commitment) is.

---

## Why this exists

The current Proof Drawer ends at "Copy Citation." That button is the
right surface for *one instrument* but it does not produce the artifact
a residential title examiner hands to a client. This feature closes
that gap: a one-click PDF that an abstractor would recognize as their
own work product, with full provenance footnotes preserved from the
on-screen data.

Three demo claims this strengthens:

1. **Practitioner-level workflow understanding** — the deliverable
   matches what an examiner ships, not what a document browser can
   render.
2. **AI turning passive records into structured linked title work** —
   the assembled chain, lifecycle pairings, and per-field provenance
   all flow into the PDF.
3. **County-owned portal beats title plants via custodial moat** — every
   instrument cited in the PDF carries the
   `publicapi.recorder.maricopa.gov` PDF URL inline (Decision #22). A
   downstream title plant cannot serve those URLs authoritatively.

---

## Scope

**In scope:**

- Parcel-level commitment-style PDF export (Schedule A + Schedule B-II).
- Two button surfaces, both calling the same generator:
  1. Proof Drawer header (next to existing Copy Citation).
  2. Encumbrance Lifecycle panel header (no instrument context required).
- When launched from a Proof Drawer with an open instrument, the
  Schedule B-II row that owns that instrument receives a small
  `← viewed` marker and a scroll anchor — no other visual emphasis.
- All on-screen provenance + confidence values flow through to PDF
  footnotes verbatim. **No silent rounding. No provenance stripping.**
- Per-row inline citation of the county-authoritative PDF URL.
- Sources block at the bottom listing per-instrument metadata URLs
  prefixed with the recording number.

**Out of scope:**

- Schedule B-I (Requirements). B-I is transaction-scoped — items are
  generated when a closing opens against a specific buyer, lender, and
  effective date, none of which are in the recorded corpus. The PDF
  header note explains this verbatim. A new `docs/known-gaps.md` entry
  (#14) records the decision.
- Schedule C, Schedule D, endorsements.
- Print stylesheet for browser print (separate feature).
- History of generated commitments — deliverable is download-and-go.
- Localization, theming, font customization.
- Any cross-parcel content. Each PDF is one parcel.

---

## Architecture

Three units, each with one clear responsibility:

### 1. `src/logic/commitment-builder.ts` — pure document-model builder

Signature:

```ts
export function buildCommitment(input: {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  closingImpactTemplates: ClosingImpactTemplate[];
  generatedAt: string;        // ISO 8601, injected for testability
  viewedInstrumentNumber?: string;
}): CommitmentDocument;
```

- **Pure.** No DOM, no PDF, no `Date.now()`, no I/O.
- All inputs are already loaded by `data-loader.ts`; this function
  composes them into a typed document model.
- Fully unit-testable with the existing fixtures.

### 2. `src/logic/commitment-pdf.ts` — pure PDF renderer

Signature:

```ts
export function renderCommitmentPdf(doc: CommitmentDocument): Blob;
```

- Takes the document model, produces a `Blob` with `application/pdf`.
- Uses `jspdf` + `jspdf-autotable`.
- No model decisions made here — layout only.
- Snapshotting the layout is deliberately out of scope (brittle, low
  value). Smoke-tested in the dev server during the verification step.

### 3. `src/components/ExportCommitmentButton.tsx` — UI surface

Props:

```ts
interface Props {
  parcel: Parcel;
  viewedInstrumentNumber?: string;  // present when launched from Proof Drawer
  variant?: 'drawer' | 'panel';     // controls label + styling, not behavior
}
```

- Mounted in `ProofDrawer.tsx` header (variant `drawer`) and
  `EncumbranceLifecycle.tsx` panel header (variant `panel`).
- Label: **"Export Commitment for Parcel"** in both surfaces. The
  word "Parcel" makes scope unambiguous at click time, especially in
  the drawer where the user just had a single instrument focused.
- On click: calls `buildCommitment(...)` → `renderCommitmentPdf(...)` →
  triggers download via `URL.createObjectURL` + anchor click.
- Filename pattern: `commitment-{apn-no-dashes}-{YYYY-MM-DD}.pdf`
  (e.g., `commitment-30478386-2026-04-14.pdf`).
- Existing `Copy Citation` button stays. Both buttons sit side-by-side
  in the drawer header.

---

## Document Model

```ts
interface CommitmentDocument {
  header: {
    countyName: string;                    // "Maricopa County, AZ"
    parcelApn: string;                     // "304-78-386"
    parcelAddress: string;                 // "3674 E Palmer St, Gilbert, AZ 85298"
    verifiedThroughDate: string;           // pulled from pipelineStatus
    generatedAt: string;                   // ISO 8601
    headerNote: string;                    // verbatim transaction-scoped note
    countyAuthoritativeUrls: {
      assessorUrl: string;                 // from parcel.assessor_url
      recorderApiBase: string;             // "https://publicapi.recorder.maricopa.gov"
    };
  };
  scheduleA: {
    currentOwner: FieldWithProvenance;     // string + provenance + confidence
    legalDescription: FieldWithProvenance;
    apn: string;
    subdivision: string;
    vesting?: FieldWithProvenance;         // best-effort from latest deed's extracted_fields.vesting
  };
  scheduleB2: ScheduleB2Row[];
  sources: {
    countyApiBase: string;
    perInstrumentMetadataUrls: Array<{
      recordingNumber: string;             // prefix key for matching back to B-II
      url: string;                         // .../documents/{n}
    }>;
  };
}

interface ScheduleB2Row {
  lifecycleId: string;
  status: 'open' | 'released' | 'assigned';
  rootInstrument: B2InstrumentRef;
  childInstruments: B2InstrumentRef[];
  rationale: string;                       // verbatim from lifecycles.json
  closingImpact?: string;                  // only when status === 'open'
  parties: Array<{
    role: string;
    name: string;
    provenance: ProvenanceKind;
    confidence: number;
  }>;
  viewedMarker: boolean;                   // true when row owns viewedInstrumentNumber
}

interface B2InstrumentRef {
  recordingNumber: string;
  documentType: string;                    // e.g. "Deed of Trust"
  recordingDate: string;
  pdfUrl: string;                          // .../preview/pdf?recordingNumber={n}
}

interface ClosingImpactTemplate {
  status: 'open';
  rootDocType: string;                     // e.g. "deed_of_trust"
  template: string;                        // sentence rendered into the row
}
```

---

## Schedule B-II row composition rules

- One row per `EncumbranceLifecycle` whose `root_instrument` belongs to
  the parcel. Order: matches `lifecycles.json` order (which is already
  curator-meaningful — root recording date ascending).
- **Released lifecycle** (e.g., `lc-001`):
  - Root instrument rendered with strikethrough + `(released)` tag.
  - Each `child_instrument` rendered below as the release line.
  - No `closingImpact` field.
- **Open lifecycle** (e.g., `lc-002`, `lc-003`):
  - Root instrument rendered normally (no strikethrough).
  - `rationale` from `lifecycles.json` shown verbatim.
  - `closingImpact` sentence rendered immediately below the rationale,
    prefixed with the literal label `Closing impact:`.
- **Subdivision-encumbrance lifecycle** (`lc-004`):
  - Subtype label rendered: `(subdivision encumbrance)` next to the
    lifecycle ID. The schema has no `subtype` field today, and
    `document_type` for the plat is `"other"` (confirmed by reading
    instrument JSONs — values present are `warranty_deed`,
    `deed_of_trust`, `full_reconveyance`, `ucc_termination`, `other`).
    `"other"` is too broad to use as a subtype signal. Implementation:
    a small explicit allow-list `SUBDIVISION_ENCUMBRANCE_ROOTS:
    Set<string>` defined inside `commitment-builder.ts`, currently
    `{ '20010093192' }`. When a future plat is added, curator updates
    the allow-list. This is intentionally explicit — better than a
    fragile inference rule.

### `viewedMarker` rule

When `viewedInstrumentNumber` is supplied, find the unique row whose
`rootInstrument.recordingNumber === viewedInstrumentNumber` OR whose
`childInstruments` contain it. Set `viewedMarker = true` on exactly one
row. Renderer adds `← viewed` text after the lifecycle ID. No bold, no
color, no other emphasis.

---

## Provenance footnote format (inline)

Per Question 4 resolution:

- `public_api` / `manual_entry` → `(api)` or `(manual)` — confidence is
  implicitly 1.0 and not rendered.
- `ocr` / `ai_extraction` → `(ocr, 0.92)` or `(ai, 0.88)` — confidence
  rendered to **2 decimal places** to match the on-screen UI.

Renderer helper:

```ts
function formatProvenanceTag(p: ProvenanceKind, c: number): string {
  if (p === 'public_api') return '(api)';
  if (p === 'manual_entry') return '(manual)';
  return `(${p === 'ocr' ? 'ocr' : 'ai'}, ${c.toFixed(2)})`;
}
```

The contract test for this helper goes alongside the builder tests.

---

## Header note (verbatim)

```
This report is a chain-and-encumbrance abstract of the recorded corpus
as of {verified_through_date}. Schedule B-I (Requirements) is
transaction-scoped — items such as payoff of open deeds of trust,
satisfaction of assignments, or curative affidavits are generated when
a closing opens against a specific buyer, lender, and effective date.
Those inputs are not part of the recorded corpus and are out of scope
for this abstract.
```

`{verified_through_date}` is interpolated from
`lifecycles.json` → `pipeline_status.verified_through_date`. The text
contains no other dynamic values.

---

## Closing-impact templates

Stored in `src/data/closing-impact-templates.json`. Sibling
`src/data/closing-impact-templates.README.md` documents:

1. **Why templates exist.** B-I is transaction-scoped; these are the
   closest honest approximation per open-lifecycle status, co-located
   with the encumbrance they attach to instead of fabricating a B-I
   section.
2. **Key shape.** `status` + `root_doc_type` is the composite key.
3. **Review rule.** Templates are reviewed by a human before merge. No
   auto-generation. New templates added when a new open-lifecycle
   shape appears in the corpus.

Initial template set (3 entries — covers POPHAM and HOGUE corpora):

| status | root_doc_type      | template                                                                                                                                  |
|--------|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| open   | `deed_of_trust`    | At transaction opening, this open DOT would require a payoff statement and recorded reconveyance prior to insuring the new lender's position. |
| open   | `assignment`       | At transaction opening, an unreleased assignment requires a corresponding satisfaction or release before the chain can close.             |
| open   | `lien`             | At transaction opening, this open lien requires payoff and recorded release before clear title can be insured.                            |

Lookup is O(n) over a 3-row array. Fast enough; readability wins.

---

## URL flavors per Decision #22

Per user direction:

- **Inline per Schedule B-II row:** the PDF URL —
  `https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber={n}`
  — rendered as a clickable link in the table cell. One click target
  per instrument.
- **Sources block (bottom of PDF):**
  - Single line: county API base URL.
  - One line per instrument cited in the report:
    `{recordingNumber}: https://publicapi.recorder.maricopa.gov/documents/{n}`
  - Recording-number prefix is mandatory — it lets a reviewer verifying
    a specific row find that row's metadata URL in three seconds, not
    by scanning a numbered list.

The legacy static URL
(`legacy.recorder.maricopa.gov/UnOfficialDocs/pdf/{n}.pdf`) is **not**
cited — it's coverage-incomplete (recent only) and citing it could
mislead.

---

## TDD plan

Tests written **before** any implementation in the file under test.

### Suite 1 — `commitment-builder.test.ts`

1. `buildCommitment(POPHAM, ...)` returns a complete document with:
   - `header.parcelApn === '304-78-386'`
   - `header.verifiedThroughDate === '2026-04-09'` (from
     `lifecycles.json`)
   - `header.headerNote` contains the verbatim transaction-scoped
     paragraph (asserted by substring match on the
     `transaction-scoped` phrase + the date interpolation).
2. Schedule A `currentOwner.value === 'POPHAM CHRISTOPHER / ASHLEY'`,
   provenance preserved from parcel record.
3. Schedule A `legalDescription.value` matches the parcel's
   `legal_description` exactly. Provenance + confidence preserved.
4. Schedule B-II contains exactly 4 rows for POPHAM (lc-001 through
   lc-004), in `lifecycles.json` order.
5. lc-001 (released) row has `closingImpact === undefined`.
6. lc-002 (open, root is DEED OF TRUST) has `closingImpact` containing
   the substring `payoff statement and recorded reconveyance` (matches
   the template).
7. lc-002 row when `viewedInstrumentNumber === '20210057847'` (the
   root) has `viewedMarker === true`; all other rows `false`.
8. lc-001 row when `viewedInstrumentNumber === '20210075858'` (the
   release child) has `viewedMarker === true` (child match works too).
9. Sources block has one entry per unique instrument cited in B-II;
   each entry is shaped `{ recordingNumber, url }` with the URL
   prefixed by `https://publicapi.recorder.maricopa.gov/documents/`.
10. **HOGUE regression** (narrow, per user direction):
    - `buildCommitment(hogue, ...)` returns without throwing.
    - `scheduleB2.find(r => r.lifecycleId === 'lc-003')` is defined.
    - That row's `rationale` contains the verbatim phrase
      `Maricopa public API does not support name-filtered document search`
      (pulled from `lifecycles.json`, not re-typed in the test).
    - **No assertions** on document size, field counts, or row order.

### Suite 2 — `commitment-pdf.test.ts`

1. `renderCommitmentPdf(POPHAM_DOC)` returns a `Blob`.
2. `blob.type === 'application/pdf'`.
3. First 5 bytes of the blob equal `%PDF-` (magic-number sanity).
4. Blob size > 1KB (sanity — empty PDFs are ~600 bytes).

No layout assertions. Layout verified manually in the dev server per
the verification step.

### Suite 3 — `format-provenance-tag.test.ts` (unit, alongside builder)

| Input                                | Output           |
|--------------------------------------|------------------|
| `('public_api', 1)`                  | `(api)`          |
| `('manual_entry', 1)`                | `(manual)`       |
| `('ocr', 0.92)`                      | `(ocr, 0.92)`    |
| `('ocr', 0.8)`                       | `(ocr, 0.80)`    |
| `('ai_extraction', 0.881)`           | `(ai, 0.88)`     |

The `0.8 → 0.80` row is critical — confirms 2-decimal padding, not
casual `toString()`.

### Suite 4 — `ExportCommitmentButton.test.tsx`

1. Renders with label `Export Commitment for Parcel`.
2. Click invokes a mocked builder + renderer in sequence; no real PDF
   generated in test.
3. When `viewedInstrumentNumber` prop is set, the value is forwarded
   to the mocked builder.
4. When prop is absent, builder is called with `viewedInstrumentNumber:
   undefined`.

---

## Layout risk + mitigation

**Known risk:** jsPDF + autotable wraps long text within table cells
imperfectly. The Seville Parcel 3 legal description is ~250 chars —
should fit a 2-line cell at standard column width.

**Mitigation branch decision (made during verification):**

- **Branch A (preferred):** legal description rendered as a wrapped
  cell inside Schedule A's two-column table. Smoke-tested first.
- **Branch B (fallback):** if Branch A produces an overflow or visually
  ugly wrap, lift legal description into a stand-alone bordered block
  immediately *above* Schedule A's table.

Whichever branch ships, this spec gets a one-line update in the
"Layout decision" section below so a future contributor knows which
branch was taken and why. Empty until verification step decides.

### Layout decision (filled at verification)

_(empty until commitment-pdf.ts smoke test in dev server resolves
Branch A vs Branch B)_

---

## File inventory

**New files:**

- `src/logic/commitment-builder.ts`
- `src/logic/commitment-builder.test.ts`
- `src/logic/commitment-pdf.ts`
- `src/logic/commitment-pdf.test.ts`
- `src/logic/format-provenance-tag.ts` (or co-located with builder)
- `src/logic/format-provenance-tag.test.ts`
- `src/components/ExportCommitmentButton.tsx`
- `src/components/ExportCommitmentButton.test.tsx`
- `src/data/closing-impact-templates.json`
- `src/data/closing-impact-templates.README.md`
- `docs/superpowers/specs/2026-04-14-commitment-export-design.md` (this file)

**Modified files:**

- `src/components/ProofDrawer.tsx` — mount `ExportCommitmentButton`
  in header next to `Copy Citation`.
- `src/components/EncumbranceLifecycle.tsx` — mount
  `ExportCommitmentButton` in panel header.
- `package.json` — add `jspdf` + `jspdf-autotable` dependencies.
- `src/schemas.ts` — add zod schema for `ClosingImpactTemplate` if
  enforcement is wanted (optional, low priority).
- `docs/known-gaps.md` — add entry #14 for "No Schedule B-I
  generation."
- `CLAUDE.md` — Decision #39 entry recording the abstractor-
  deliverable choice.

---

## What this spec is NOT promising

- No print stylesheet.
- No print preview UI.
- No commitment history / audit log.
- No B-I, B-III, Schedule C, Schedule D, endorsements.
- No batch export ("export all parcels").
- No email-on-export.
- No saved-filter presets.
- No model-derived confidence on any new field.
- No layout snapshot tests (deliberately — too brittle).

Every item above is a real product feature; none of them are within
the 1-hour budget for this branch.

---

## Approval trail

- **Q1 (scope):** Parcel-level only. Approved.
- **Q2 (sections):** Schedule A + Schedule B-II only; no B-I; B-II rows
  for open lifecycles carry a `Closing impact:` sentence.
- **Q3 (library):** jsPDF + jspdf-autotable.
- **Q4 (footnotes):** Inline; `(api)` / `(manual)` / `(ocr, X.XX)` /
  `(ai, X.XX)`. Confidence rendered to 2 decimals.
- **Sources URL flavor:** PDF URL inline per row; metadata URLs in
  Sources block prefixed with recording number.
- **Layout fallback:** Branch A first, Branch B if it overflows.
