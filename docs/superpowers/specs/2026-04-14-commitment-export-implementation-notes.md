# Commitment Export — Implementation Notes

Companion to `2026-04-14-commitment-export-design.md`. Records the
architectural decisions taken during implementation that the spec
either left open or deferred to "decide during build". A reviewer
should read this before reading the diff.

---

## 1. Module split: pure logic vs React/DOM

The feature is three layers, each in its own module:

| Layer | File | Imports DOM? | Imports React? |
|---|---|---|---|
| Document model | `src/logic/commitment-builder.ts` | no | no |
| PDF renderer | `src/logic/commitment-pdf.ts` | no (jsPDF emits Blob, no `window` access at call time) | no |
| React handler | `src/components/ExportCommitmentButton.tsx` | yes (only inside `browserDownload`) | yes |

`triggerCommitmentDownload(input)` exported from
`ExportCommitmentButton.tsx` is itself a pure function — it accepts
a `download` callback in its input. The component supplies
`browserDownload` (which uses `URL.createObjectURL` + `<a>.click()`)
as the default; tests supply `vi.fn()`. This is the same pattern
the existing `formatCitation` helper uses — testable in jsdom
without coupling document construction to the DOM.

**Why not have the component build the document inline?** The
whole point of the parcel-level abstract is that its content is
deterministic from inputs the test suite already loads
(`loadParcelDataByApn`). Keeping `buildCommitment` and the
PDF-emission code as pure functions means every assertion the spec
makes about content (Schedule A entries, B-II row count, viewed
marker, Sources URLs) is testable without rendering React.

---

## 2. Library choice: jsPDF + jspdf-autotable

Two real options were on the table:

- **jsPDF + jspdf-autotable** — drawing primitives + a table
  helper. Final-bundle-impact: ~150 kB gzipped (plus html2canvas,
  pulled in by jsPDF for image support even when unused).
- **react-pdf** (`@react-pdf/renderer`) — declarative React
  components rendered to PDF. Bundle impact comparable.

Picked jsPDF because the feature's three constraints all cut its
way:

1. **Content is already a plain object.** `CommitmentDocument` is
   the source of truth; rendering it is a flat mapping from object
   to drawing calls. A second React render tree (one for screen,
   one for PDF) would be incidental complexity.
2. **Inline-provenance footnotes are inline text annotations**,
   not structural elements. Drawing primitives express that more
   directly than a paragraph component would.
3. **autoTable handles wrapping for unknown-length values
   automatically**, which mattered for Schedule A's 224-character
   legal description.

The bundle warning at build time (`chunk > 500 kB`) is pre-existing
— jsPDF + html2canvas were the dominant contributors before this
feature shipped. Code-splitting the PDF renderer behind a dynamic
import is a sensible follow-up but not in scope for this branch.

---

## 3. Layout decision: legal description inline (Branch A)

The spec listed two branches for Schedule A:

- **A.** Two-column table: `Field | Value`, value cell auto-wraps.
- **B.** Field above value, multi-line block layout.

Branch A shipped. Validation: a Node-side text dump of the
generated POPHAM PDF (during Checkpoint 2) confirmed the legal
description (224 chars) wraps to exactly 2 lines inside the
auto-width value column, no overflow into the next row, no overlap
with subsequent Schedule A fields. The decision is recorded in the
spec's "Layout decision" section.

The smoke checklist's step **A7** is the visual re-confirmation —
text-dump verification cannot catch overlap or orphaned tags.

---

## 4. Closing-impact templates: data-driven, allow-listed by status + doc-type

`src/data/closing-impact-templates.json` is a small array of
records keyed by `(status, root_doc_type)`. `findClosingImpact()`
in `commitment-builder.ts`:

- Returns `undefined` when `status !== "open"` (released and
  unresolved lifecycles do not generate Closing impact lines).
- Otherwise returns the template matching `(status,
  root_doc_type)` or `undefined` if no match.

**Provenance discipline rule:** every template row must derive
from a published title-practice pattern, not an LLM paraphrase.
This is documented in
`src/data/closing-impact-templates.README.md` so future template
additions can't drift into fabricated lender-speak. The README is
the gating artifact, not the JSON itself — adding a row without
reading the README is the failure mode.

The `ClosingImpactTemplate.status` field is typed as `string`
(not the literal `"open"`) because the JSON import widens at the
boundary, and the runtime guard in `findClosingImpact` is the
actual safety net. Tightening the type back to `"open"` would
require either an `as const` cast on the JSON or a runtime
narrowing — neither paid for itself for a file this small.

---

## 5. `viewedInstrumentNumber` semantics

The Proof Drawer mount in `ChainRouteInner` and
`EncumbranceRouteInner` passes the URL's `:instrumentNumber` as
`viewedInstrumentNumber` to the export button. The Encumbrance
**panel** mount in the same routes passes `undefined` — the panel
header has no instrument context.

`buildCommitment` sets `viewedMarker: true` on the Schedule B-II
row whose lifecycle has the instrument as either its
`root_instrument` or in `child_instruments`. This is why the smoke
checklist's path A (drawer mount, instrument 20210075858 = release
child of lc-001) anchors lc-001, while path B (panel mount, no
instrument) anchors nothing.

The renderer renders the marker as a literal `← viewed` suffix on
the row's heading line. No row should ever have it in path B —
that's smoke step **B4**, and it directly tests the contract that
the panel-mount button does not silently inherit the drawer's
instrument.

---

## 6. Subdivision-encumbrance subtype: explicit allow-list, not heuristic

`SUBDIVISION_ENCUMBRANCE_ROOTS` in `commitment-builder.ts` is a
hard-coded `Set<string>` containing the Seville Parcel 3 plat
recording number (`20010093192`). When a lifecycle's
`root_instrument` is in the set, the row's `subtype` becomes
`"subdivision_encumbrance"`, which the renderer prints in the row
heading.

This is the right shape for the prototype. The taxonomy that would
let a heuristic identify subdivision encumbrances generically
(plat references in legal description, Book/Page citations, plat
document codes) does not exist in the curated corpus at sufficient
density to support a rule. An explicit allow-list is honest
manual curation and stays consistent with Decision #17 (confidence
scores hand-assigned during curation).

Adding a second subdivision encumbrance later is a one-line set
addition, not an architecture change.

---

## 7. Header note: transaction-scoped explainer is non-negotiable

The header note (built by `buildHeaderNote`) interpolates the
`verifiedThroughDate` and explicitly states that Schedule B-I is
intentionally absent because it's transaction-scoped. This text
is the contract that makes Known Gap #16 defensible
on stage — without it, a reviewer's first question is "where's
Schedule B-I?". With it, the answer is in the document itself.

The exact wording is asserted by a unit test in
`src/logic/commitment-builder.test.ts` — changing it requires
changing the test, which is the right level of friction.

---

## 8. Sources block: per-instrument metadata URLs prefixed with recording number

Spec called for the Sources block to "cite each instrument's
metadata URL". Implementation prefixes each line with the
recording number (e.g.,
`20130183450: https://publicapi.recorder.maricopa.gov/documents/20130183450`)
because the URL alone is not human-scannable — recording numbers
are how examiners cross-reference, not URL substrings. This is a
spec-strengthening choice the user explicitly approved during
brainstorming.

The list is deduplicated (multiple lifecycles can cite the same
instrument) via a `Set` and sorted lexicographically before
rendering. Sort stability matters for snapshot-style review of
generated PDFs.

---

## 9. Smoke test scoping

The PDF's deterministic content (text, structure, URLs, viewed
marker) is fully covered by Vitest assertions against
`buildCommitment` and Node-side text-extraction of the rendered
PDF (Checkpoint 2). The smoke checklist
(`2026-04-14-commitment-export-smoke.md`) covers only the three
dimensions automation cannot:

- Browser click → file actually downloads.
- PDF visual layout (no overflow, no orphaned tags, clean wrap).
- Both UI mount points actually render the button in the right
  place.

This is why Checkpoint 4 is gated on the smoke and not on a
re-run of the test suite.
