# Commitment Export — Handoff Summary

**Branch:** `feature-commitment-export`
**Status:** **handoff-ready, gated on manual smoke test (CHECKPOINT 4)**
**Not yet:** merge-ready. Smoke must pass + code review must clear
+ Tier-1-A must merge to main first (rebase pending).

---

## What this branch ships

A parcel-level "Export Commitment for Parcel" button, mounted in
two places (Proof Drawer header, Encumbrance panel header), that
emits a jsPDF document containing:

- **Schedule A** — current owner, legal description, APN,
  subdivision, vesting (when present), each with inline
  `(provenance, confidence)` footnotes that match the on-screen UI
  verbatim.
- **Schedule B-II** — one row per `EncumbranceLifecycle` for the
  parcel, with status badge, root + child instruments, county PDF
  URL per row, party listing with provenance tags, status
  rationale, and (for `open` lifecycles) a `Closing impact:`
  sentence sourced from a curated template file.
- **Header note** — interpolates the corpus's
  `verifiedThroughDate` and explains that Schedule B-I
  (Requirements) is intentionally absent because B-I items are
  transaction-scoped.
- **Sources block** — per-instrument metadata URLs from
  `https://publicapi.recorder.maricopa.gov`, prefixed with their
  recording numbers for human scanning.

Schedule B-I is documented as Known Gap #16 and the
absence is explained inline via the header note + per-row
`Closing impact:` lines.

---

## What's verified

| Dimension | Status | How |
|---|---|---|
| Unit tests | **132 pass + 1 skipped** | `npm test` (Vitest) |
| Skipped test | manual smoke fixture | `commitment-pdf.smoke.test.ts` (`describe.skip`) — generates a PDF to `tmp/` for visual inspection during dev |
| Production build | **clean** | `npm run build` (Vite + tsc -b) |
| TypeScript | **clean** | covered by `tsc -b` inside build |
| PDF text content | verified | Node-side text-extraction during Checkpoint 2 confirmed Schedule A entries, B-II row count, viewed marker, Sources URLs all render correctly |
| PDF layout | **gated on smoke** | text-extraction can't see overlap, orphaned tags, or overflow — the smoke checklist is the verification path |
| Browser click-through | **gated on smoke** | requires a human to click the button in two URLs and inspect the downloaded PDFs |

---

## Commits on branch (10 total ahead of master)

```
72ec36f docs(tier1-c): manual smoke-test checklist for commitment-export — CHECKPOINT 4 gate
cd21428 docs(commitment-export): Known Gap #14 (no Schedule B-I) + Decision #39   [TBD-renumber]
c79282a feat(commitment-export): wire ExportCommitmentButton into ProofDrawer + Encumbrance panel
7eee5bd feat(commitment-export): ExportCommitmentButton with pure trigger separated from React handler
97180e7 feat(commitment-export): jsPDF renderer with Schedule A + B-II + Sources
b10dfb9 feat(commitment-export): pure document-model builder for parcel-level commitment
bf2ceb6 feat(commitment-export): provenance-tag formatter for inline PDF footnotes
405afea deps(commitment-export): add jspdf + jspdf-autotable; closing-impact templates with provenance-discipline README
9124007 plan(commitment-export): 8-task TDD plan with 4 review checkpoints
cb3c22a spec(commitment-export): parcel-level PDF with provenance-preserved Schedule A + B-II
```

The commit story tracks the TDD plan task-by-task (1: deps + data,
2: formatter, 3: builder, 4: renderer, 5: button, 6: wiring, 7:
docs) plus the smoke checklist as a separate post-Checkpoint-3
handoff artifact.

---

## What's gated on the smoke

CHECKPOINT 4 stays in `in_progress` until the smoke checklist
returns clean. The checklist is at
`docs/superpowers/specs/2026-04-14-commitment-export-smoke.md` and
is structured to be runnable by a non-engineer in under 5 minutes.

When smoke results land:

- **All required steps pass** → close CHECKPOINT 4, invoke
  `superpowers:requesting-code-review`. Branch becomes review-ready.
  Status here flips to "merge-ready pending Tier-1-A merge to main +
  rebase".
- **Any failure** → invoke `superpowers:systematic-debugging`,
  root-cause, fix, re-run automated tests, re-issue the failing
  step's smoke instruction.

---

## Pending bookkeeping (for the post-A-merge rebase)

This branch added two numbered entries against pre-merge main:

- `CLAUDE.md` Decision **#39** (Commitment Export decision row)
- `docs/known-gaps.md` entry **#14** (Schedule B-I intentionally absent)

Tier-1-B already added Decisions #39 and #40 to main; Tier-1-A is
about to add Decision #41 + known-gaps entries #14 and #15. After
both merges, this branch's additions will collide and must
renumber to roughly:

- Decision **#42** or higher
- Known Gap **#16** or higher

Both sites are pre-marked with `TBD-RENUMBER` HTML comments and
the original number is preserved as `<!--was 39-->` /
`<!--was 14-->` so the rebase is mechanical:

```
git grep "TBD-RENUMBER" CLAUDE.md docs/known-gaps.md
```

Cross-reference inside the Decision row prose ("Known Gap #14")
also TBD-marks. Resolve all three sites in lockstep.

---

## Files added or modified on this branch

**Added (data + logic):**

- `src/data/closing-impact-templates.json`
- `src/data/closing-impact-templates.README.md`
- `src/logic/format-provenance-tag.ts` + test
- `src/logic/commitment-builder.ts` + test
- `src/logic/commitment-pdf.ts`
- `src/logic/commitment-pdf.smoke.test.ts` (skipped by default)
- `src/components/ExportCommitmentButton.tsx` + test

**Modified (UI wiring):**

- `src/components/ProofDrawer.tsx` (added `headerActions?: ReactNode` prop)
- `src/components/EncumbranceLifecycle.tsx` (added `headerActions?: ReactNode` prop, restructured header)
- `src/router.tsx` (instantiated button in two routes, threaded `viewedInstrumentNumber`)

**Build config:**

- `tsconfig.app.json` — exclude `src/**/*.smoke.test.ts` from app type-check graph
- `.gitignore` — added `tmp/`
- `package.json` — added `jspdf` + `jspdf-autotable`

**Docs:**

- `docs/superpowers/specs/2026-04-14-commitment-export-design.md` (spec, with layout-decision section filled in)
- `docs/superpowers/plans/2026-04-14-commitment-export.md` (8-task TDD plan)
- `docs/superpowers/specs/2026-04-14-commitment-export-smoke.md` (checkpoint-4 gate)
- `docs/superpowers/specs/2026-04-14-commitment-export-implementation-notes.md` (architecture decisions)
- `docs/superpowers/specs/2026-04-14-commitment-export-handoff.md` (this file)
- `docs/known-gaps.md` (entry #16)
- `CLAUDE.md` (Decision row #42)

---

## Reviewer reading order (when CHECKPOINT 4 closes)

1. `2026-04-14-commitment-export-design.md` — what we're building and why
2. `2026-04-14-commitment-export-implementation-notes.md` — decisions taken during build
3. `src/logic/commitment-builder.ts` + test — the document model
4. `src/logic/commitment-pdf.ts` — the renderer (read after builder)
5. `src/components/ExportCommitmentButton.tsx` + test — the React handler
6. `src/router.tsx` diff — the two mount points
7. `docs/known-gaps.md` entry + `CLAUDE.md` Decision row — context for the intentional B-I absence
