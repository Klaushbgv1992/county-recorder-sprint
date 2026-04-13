# County Recorder Portal — Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a 4-screen working prototype of an AI-enhanced county recorder search portal using real Maricopa County instrument data, serving a residential title examiner audience.

**Architecture:** Static single-page React app consuming precomputed JSON data files. No backend. All document images served locally. Data layer validated with Zod schemas and tested with Vitest. Examiner actions (accept/reject/unresolved) stored in React state (no persistence needed for demo).

**Tech Stack:** Vite + React 18 + TypeScript + Zod (schema validation) + Vitest (testing) + Tailwind CSS (styling)

**Tech stack rationale:** React's component model maps directly to 4 screens + slide-out drawer. TypeScript + Zod give us compile-time and runtime type safety for the data model, which is critical since manually curated JSON is our single source of truth — a schema error corrupts the entire demo. Vitest shares Vite's config, zero additional setup. Tailwind avoids CSS file management overhead on a 2-day sprint.

---

## Time Budget

| Phase | Time | Day | Window |
|-------|------|-----|--------|
| Phase 1: County + Parcel Lock | ~3h | Day 1 | Morning |
| Phase 2: Corpus Assembly | ~2h | Day 1 | Early afternoon |
| Phase 3: Data Structuring + Schema + TDD | ~5-6h | Day 1 | Late afternoon through evening |
| Phase 4: UI Build (4 firm screens) | ~8-10h | Day 2 | Full day |
| Phase 5: Demo Polish + Red Team | ~2-3h | Day 2 | End of day |

**Mid-sprint escalation rule (end of Day 1):** If Phase 3 is not complete by end of Day 1, STOP and reassess scope. Consider cutting TDD on citation-formatter (Task 3.7) to recover time. Data layer TDD on schemas, chain builder, and lifecycle status (Tasks 3.3, 3.5, 3.6) is **non-negotiable** — those are thesis logic and must have coverage.

---

## File Structure

```
/
├── CLAUDE.md                          # Sprint context, decision log
├── plans/sprint-plan.md               # This file
├── research/
│   ├── county-selection.md            # County scoring + decision
│   ├── parcel-candidates.md           # Parcel options from R-002
│   ├── before-workflow.md             # Pain-point screenshots + counts
│   ├── measurable-win.md              # Before/after numbers
│   └── raw/R-###/                     # Raw handoff artifacts per request
├── data/
│   ├── parcel.json                    # Single parcel record
│   ├── instruments.json               # 8-15 instruments with full schema
│   ├── links.json                     # DocumentLink records
│   ├── lifecycles.json                # EncumbranceLifecycle records
│   └── raw/                           # Source document images (jpg/png/pdf)
├── docs/
│   ├── demo-script.md                 # Final demo narrative
│   ├── red-team.md                    # Adversarial review
│   └── risks-and-fallbacks.md         # Risk register
├── src/
│   ├── main.tsx                       # React app entry
│   ├── App.tsx                        # Router / screen switching
│   ├── types.ts                       # TypeScript interfaces (generated from Zod)
│   ├── schemas.ts                     # Zod schemas for all data files
│   ├── data-loader.ts                 # JSON import + validation
│   ├── logic/
│   │   ├── chain-builder.ts           # Build owner-period chain from deeds
│   │   ├── lifecycle-status.ts        # Compute encumbrance statuses
│   │   └── citation-formatter.ts      # Format instrument citation strings
│   ├── components/
│   │   ├── SearchEntry.tsx            # Screen 1
│   │   ├── ChainOfTitle.tsx           # Screen 2
│   │   ├── EncumbranceLifecycle.tsx   # Screen 3
│   │   ├── ProofDrawer.tsx            # Screen 4 (slide-out)
│   │   ├── ParcelDossier.tsx          # Stretch screen 5
│   │   ├── MoatBanner.tsx             # County moat header bar
│   │   ├── StatusBadge.tsx            # Lifecycle status badge
│   │   ├── InstrumentRow.tsx          # Reusable instrument display row
│   │   └── ProvenanceTag.tsx          # Provenance + confidence indicator
│   └── hooks/
│       ├── useParcelData.ts           # Load + validate all JSON data
│       └── useExaminerActions.ts      # Accept/reject/unresolved state
├── tests/
│   ├── schemas.test.ts               # Schema validation tests
│   ├── chain-builder.test.ts          # Chain assembly logic tests
│   ├── lifecycle-status.test.ts       # Lifecycle status rule tests
│   └── citation-formatter.test.ts     # Citation formatting tests
├── index.html                         # Vite entry HTML
├── vite.config.ts                     # Vite config (includes Tailwind v4 plugin)
├── tsconfig.json                      # TypeScript config
└── package.json
```

**Responsibility boundaries:**
- `schemas.ts` owns all data shape definitions. Every other file imports types from here.
- `logic/` is pure functions, no React imports, no side effects. Fully testable.
- `components/` is React rendering only — no data transformation beyond what hooks provide.
- `hooks/` bridges data layer to components. `useParcelData` loads+validates; `useExaminerActions` manages UI state.
- `data/` is curated JSON — never modified by the app at runtime.

---

## Phase 1: County + Parcel Lock via Research Handoff

### Task 1.1: Emit R-001 — Maricopa County Portal Scout

**Files:**
- Create: `research/raw/R-001/` (directory for returned artifacts)

- [ ] **Step 1: Emit the R-001 research request**

Emit the following `<research_request>` block and STOP. Do not proceed to Task 1.2 until the user returns a `<research_result id="R-001">`.

```
<research_request id="R-001" phase="1" blocking="yes">
GOAL: Confirm Maricopa County Recorder portal supports free document image access, and inventory the search surface for parcel hunting.
TARGET:
  - Maricopa County Recorder: https://recorder.maricopa.gov/
  - Maricopa County Assessor: https://mcassessor.maricopa.gov/
STEPS FOR THE CHROME-PLUGIN SESSION:
  1. Go to https://recorder.maricopa.gov/ — note the main search page layout
  2. Try an Official Records search (any recent residential deed — search by document type "Deed" in the last 30 days, pick the first result)
  3. Click into the result — capture the index metadata fields displayed (instrument number format, recording date, document type label, grantor/grantee, legal description, any cross-references)
  4. Attempt to view/download the document image. Note: is it free? Does it require login? What format (PDF, TIFF, JPEG)? What is the URL pattern?
  5. Check the earliest available document image — search for a deed from 2000 or earlier. Note the oldest year that returns an image. This is the image lookback depth.
  6. Search for document types available in the dropdown/filter — list every instrument type label the portal offers (Deed, Deed of Trust, Assignment, Reconveyance, Substitution of Trustee, etc.)
  7. Go to https://mcassessor.maricopa.gov/ — search for any residential address. Note: does the result show APN? Does it link to the recorder? What fields are displayed?
  8. Take a screenshot of: (a) the recorder search page, (b) a search result list, (c) a document detail page with metadata, (d) a document image viewer, (e) the assessor result page
CAPTURE:
  - Instrument number format (e.g., 20260001234 or 2026-0001234)
  - All index metadata field names exactly as labeled on screen
  - Document type dropdown options (complete list)
  - Image access: free/paywalled/login-required, format (PDF/TIFF/JPEG), resolution quality
  - Image lookback depth: oldest year with available images
  - Assessor fields: APN format, address, owner name, any recorder cross-link
  - URL patterns for: search, detail page, image viewer
  - Count of search results for a sample deed search (gives a sense of volume)
  - Any pain points observed: slow loading, confusing navigation, tab sprawl, unclear labels
RETURN FORMAT:
  - Structured fields in a fenced code block
  - Screenshot filenames with 1-line captions
  - Terminology observed verbatim (exact field labels as they appear on screen)
ACCEPTANCE:
  - FIRST CRITERION: Document images are free to view/download without login or payment. If this fails, note it clearly and do NOT continue — we flip to Clark NV.
  - Index metadata includes at minimum: instrument number, recording date, document type, grantor, grantee
  - At least 5 distinct document type labels available in search
  - Image lookback depth reaches at least 2005
  - Assessor shows APN for a residential address
</research_request>
```

- [ ] **Step 2: Wait for research result**

BLOCKED until user returns `<research_result id="R-001">`.

### Task 1.2: Process R-001 Results

**Files:**
- Create: `research/raw/R-001/` (save screenshots + data)
- Modify: `CLAUDE.md` (update decision log, terminology notes)
- Modify: `research/county-selection.md` (record confirmed scores)
- Modify: `research/before-workflow.md` (pain-point screenshots)

- [ ] **Step 1: Evaluate auto-flip criterion**

Read the returned result. Check: are document images free to view/download without login or payment?
- **YES** → Maricopa confirmed as primary. Proceed to Step 2.
- **NO** → Auto-flip to Clark NV. Update CLAUDE.md decision log with: `| 18 | Auto-flip: Maricopa → Clark NV | Images paywalled/login-gated per R-001 | <date> |`. Emit R-001B for Clark NV (same request template, different URLs). STOP until Clark result returns.

- [ ] **Step 2: Save artifacts to disk**

Save all screenshots to `research/raw/R-001/` with descriptive filenames:
- `R-001-recorder-search.png`
- `R-001-result-list.png`
- `R-001-document-detail.png`
- `R-001-image-viewer.png`
- `R-001-assessor-result.png`

- [ ] **Step 3: Update CLAUDE.md terminology notes**

Replace the `TBD` in Terminology Notes with the exact field labels observed:
```markdown
## Terminology Notes (Maricopa AZ)
- Instrument number format: [from R-001]
- Document types available: [list from R-001]
- Deed of Trust label: [exact label]
- Release/Reconveyance label: [exact label]
- Assignment label: [exact label]
- Assessor APN format: [from R-001]
- Image format: [PDF/TIFF/JPEG]
- Image lookback depth: [oldest year]
- Corpus boundary: "County online records searched through [date from R-001]"
```

- [ ] **Step 4: Record pain points for measurable-win evidence**

Update `research/before-workflow.md` with observed pain points from R-001:
- Note tab count needed for a single search
- Note click count from search → document image
- Note any confusing navigation, missing cross-references, or slow loading
- Reference screenshot filenames as evidence

- [ ] **Step 5: Update county-selection.md with confirmed scores**

Fill in the actual scores in `research/county-selection.md` based on R-001 findings.

- [ ] **Step 6: Commit**

```bash
git add research/raw/R-001/ research/before-workflow.md research/county-selection.md CLAUDE.md
git commit -m "feat: process R-001 Maricopa portal scout results"
```

### Task 1.3: Emit R-002 — Parcel Hunting

**Files:**
- Create: `research/raw/R-002/` (directory for returned artifacts)

**Depends on:** Task 1.2 (need confirmed county + terminology to write parcel search instructions)

- [ ] **Step 1: Emit the R-002 research request**

Use the terminology and URL patterns captured in R-001 to construct a targeted parcel-hunting request. The request must instruct the Chrome plugin session to:

1. Go to the Maricopa assessor portal
2. Search for 2-3 residential single-family addresses in different subdivisions
3. For each, get the APN, then cross to the recorder portal
4. Search the APN or owner name in the recorder for deeds and DOTs
5. Identify parcels matching our refi pattern criteria:
   - At least 2 deeds (sales) in the last 20 years
   - At least 1 DOT in the 2020-2022 window
   - No NOD/Trustee's Sale/REO documents
   - Preferably subdivision lot
   - Bonus: HELOC or second DOT
6. For each candidate parcel, capture:
   - APN, address, current owner
   - List of all recorded instruments (instrument number, date, type, grantor/grantee)
   - Count of total instruments
   - Whether a refinance pattern is visible
   - Any bonus features (HELOC, assignment chain, missing release)
7. Take screenshots of:
   - Each parcel's instrument list in the recorder
   - The assessor detail page for each parcel
   - Any pain points (tab switching, multiple searches needed, unclear cross-references)
8. Capture measurable-win evidence: how many searches, tabs, and clicks did it take to evaluate each parcel?

**UNCERTAINTY FLAG:** The exact search approach depends on R-001 results. If Maricopa's recorder doesn't support APN search, the request must route through grantor/grantee name search from the assessor owner. Adjust the R-002 request based on what R-001 revealed about search capabilities.

- [ ] **Step 2: Wait for research result**

BLOCKED until user returns `<research_result id="R-002">`.

### Task 1.4: Process R-002 and Lock Parcel

**Files:**
- Create: `research/raw/R-002/` (save screenshots + data)
- Modify: `research/parcel-candidates.md` (document candidates)
- Modify: `research/before-workflow.md` (add more pain-point evidence)
- Modify: `research/measurable-win.md` (record search/tab/click counts)
- Modify: `CLAUDE.md` (lock primary + backup parcel)

- [ ] **Step 1: Save R-002 artifacts to disk**

Save all screenshots and data to `research/raw/R-002/`.

- [ ] **Step 2: Score parcel candidates**

Write `research/parcel-candidates.md` with a decision table:

```markdown
# Parcel Candidates

## Scoring Criteria
- Chain depth (number of deeds in last 20 years)
- DOT lifecycle richness (refi in 2020-2022, assignments, releases)
- Absence of NOD/foreclosure noise
- Clean legal description (subdivision lot preferred)
- Bonus: HELOC, assignment chain, ambiguous release

## Candidates

| # | APN | Address | Owner | Deeds | DOTs | Refi 2020-22 | Assignments | Releases | NOD/REO | Bonus | Score |
|---|-----|---------|-------|-------|------|-------------|-------------|----------|---------|-------|-------|
| 1 | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

## Decision
Primary: [parcel # and why]
Backup: [parcel # and why]
```

- [ ] **Step 3: Record measurable-win evidence**

Update `research/measurable-win.md` with real counts from the parcel hunting session:
```markdown
# Measurable Win — Before/After Evidence

## "Before" Numbers (from R-001 + R-002 handoffs)
- Searches required to evaluate one parcel: [count]
- Browser tabs open during evaluation: [count]
- Clicks from address → complete instrument list: [count]
- Time to identify a refinance pattern: [estimate]
- Cross-references manually traced: [count]
- Pain points observed: [list with screenshot references]

## Source Evidence
- R-001 screenshots: [list]
- R-002 screenshots: [list]
```

- [ ] **Step 4: Lock parcel in CLAUDE.md**

Update the Parcel Selection section and add decision log entries.

- [ ] **Step 5: Commit**

```bash
git add research/ CLAUDE.md
git commit -m "feat: lock primary + backup parcel from R-002 results"
```

---

## Review Checkpoint: Phase 1 → Phase 2

**Gate:** Before proceeding to corpus assembly, verify:
- [ ] Primary county confirmed (Maricopa or flipped to Clark)
- [ ] Primary + backup parcel locked with rationale
- [ ] Terminology notes filled in CLAUDE.md
- [ ] Pain-point evidence captured with real counts
- [ ] No NOD/foreclosure noise on selected parcel
- [ ] Parcel has at least 2 deeds + 1 DOT in 2020-2022 window

**If any gate fails:** Emit a follow-up research request targeting the specific gap. Do not proceed to Phase 2 with incomplete data.

---

## Phase 2: Corpus Assembly via Handoff

### Task 2.1: Emit R-003 — Instrument Corpus Download

**Files:**
- Create: `research/raw/R-003/` (directory for returned artifacts)

**Depends on:** Task 1.4 (need locked parcel APN + instrument list)

- [ ] **Step 1: Emit the R-003 research request**

Using the locked parcel's instrument list from R-002, construct a request to download all instruments. The request must:

1. List every instrument number to capture (from the R-002 result)
2. For each instrument, capture:
   - Full index metadata (all fields displayed on the detail page)
   - Document image download (save as `[instrument_number].[format]`)
   - Back-reference / cross-reference fields if displayed
   - All party names exactly as indexed
3. Group by document type: deeds first, then DOTs, then assignments, then releases/reconveyances, then any others
4. Take a screenshot of each document's detail/metadata page
5. Note any instruments where the image is missing, illegible, or truncated

**UNCERTAINTY FLAG:** If the parcel has more than 15 instruments, prioritize: all deeds, all DOTs, all assignments of DOT, all releases/reconveyances, then the most recent of any remaining types. Skip old mechanic's liens, subordination agreements, or other non-thesis instruments unless they look relevant.

- [ ] **Step 2: Wait for research result**

BLOCKED until user returns `<research_result id="R-003">`.

### Task 2.2: Process R-003 and Verify Corpus

**Files:**
- Create: `research/raw/R-003/` (save all images + metadata)
- Create: `data/raw/` (copy source images here for serving)
- Modify: `CLAUDE.md` (update corpus status)

- [ ] **Step 1: Save all artifacts**

Save images to `data/raw/` with naming convention: `[instrument_number].[format]`
Save metadata screenshots to `research/raw/R-003/`

- [ ] **Step 2: Verify corpus completeness**

Check that the corpus supports the demo story:
- [ ] At least 1 vesting deed (current owner)
- [ ] At least 1 prior deed (chain depth)
- [ ] At least 1 DOT from 2020-2022 refi window
- [ ] At least 1 of: assignment, modification, or substitution of trustee
- [ ] Release/reconveyance status known (present, absent, or ambiguous)
- [ ] All instruments have both index metadata AND source images
- [ ] No gaps that would break the chain narrative

If any gap exists, emit a targeted follow-up request (R-004) for the specific missing instruments.

- [ ] **Step 3: Commit raw corpus**

```bash
git add data/raw/ research/raw/R-003/
git commit -m "feat: add instrument corpus — source images + metadata"
```

### Task 2.3: Emit R-003B if Needed — Gap Fill

Only execute if Task 2.2 Step 2 found gaps. Emit a targeted follow-up for specific missing instruments.

---

## Review Checkpoint: Phase 2 → Phase 3

**Gate:** Before proceeding to data structuring, verify:
- [ ] 8-15 instruments captured with source images
- [ ] Corpus supports: backward deed chain, forward owner-period search, encumbrance lifecycle
- [ ] At least one DOT lifecycle has an assignment or release to demo
- [ ] All images are legible and downloadable
- [ ] Corpus boundary date recorded (latest recording date in the index)

---

## Phase 3: Data Structuring + Schema + TDD

### Task 3.1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`

- [ ] **Step 1: Initialize project**

```bash
npm create vite@latest . -- --template react-ts
```

If the directory is non-empty, Vite may prompt. Use `--force` or answer yes to overwrite.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install zod
```

- [ ] **Step 3: Configure Tailwind**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "data",
});
```

Note: `publicDir: "data"` serves `data/raw/` images at `/raw/[filename]` during dev. This avoids copying images into a separate public folder.

`src/index.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 4: Verify dev server starts**

```bash
npx vite --open
```

Expected: browser opens with Vite default page. Kill server after confirming.

- [ ] **Step 5: Commit scaffold**

```bash
git add package.json vite.config.ts tsconfig.json index.html src/
git commit -m "feat: Vite + React + TypeScript + Tailwind v4 scaffold"
```

### Task 3.2: Define Zod Schemas + TypeScript Types

**Files:**
- Create: `src/schemas.ts`
- Create: `src/types.ts`

**TDD GATE: This task defines the source-of-truth schemas. All subsequent data tasks validate against these.**

- [ ] **Step 1: Write schemas**

`src/schemas.ts`:
```ts
import { z } from "zod";

// -- Provenance + Confidence --

export const ProvenanceKind = z.enum([
  "index_metadata",
  "ai_extraction",
  "manual_entry",
  "hybrid",
]);

export const FieldWithProvenance = z.object({
  value: z.string(),
  provenance: ProvenanceKind,
  confidence: z.number().min(0).max(1),
});

// -- Party --

export const PartyRole = z.enum([
  "grantor",
  "grantee",
  "trustor",
  "trustee",
  "beneficiary",
]);

export const Party = z.object({
  name: z.string(),
  role: PartyRole,
});

// -- Instrument --

export const DocumentType = z.enum([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
  "deed_of_trust",
  "assignment_of_dot",
  "substitution_of_trustee",
  "full_reconveyance",
  "partial_reconveyance",
  "modification",
  "heloc_dot",
  "other",
]);

export const Instrument = z.object({
  instrument_number: z.string(),
  recording_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  document_type: DocumentType,
  grantor: z.array(z.string()).min(1),
  grantee: z.array(z.string()).min(1),
  legal_description: FieldWithProvenance.optional(),
  back_references: z.array(z.string()),
  source_image_path: z.string(),
  extracted_fields: z.record(z.string(), FieldWithProvenance),
  corpus_boundary_note: z.string(),
});

// -- Parcel --

export const Parcel = z.object({
  apn: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string().length(2),
  zip: z.string(),
  legal_description: z.string(),
  current_owner: z.string(),
  assessor_url: z.string().optional(),
  recorder_url: z.string().optional(),
});

// -- Owner Period --

export const OwnerPeriod = z.object({
  owner: z.string(),
  start_instrument: z.string(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_instrument: z.string().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  is_current: z.boolean(),
});

// -- Document Link --

export const LinkType = z.enum([
  "back_reference",
  "assignment_of",
  "release_of",
  "modification_of",
  "substitution_of_trustee_for",
]);

export const ExaminerAction = z.enum([
  "pending",
  "accepted",
  "rejected",
  "unresolved",
]);

export const DocumentLink = z.object({
  id: z.string(),
  source_instrument: z.string(),
  target_instrument: z.string(),
  link_type: LinkType,
  provenance: ProvenanceKind,
  confidence: z.number().min(0).max(1),
  examiner_action: ExaminerAction,
});

// -- Encumbrance Lifecycle --

export const LifecycleStatus = z.enum([
  "open",
  "released",
  "unresolved",
  "possible_match",
]);

export const EncumbranceLifecycle = z.object({
  id: z.string(),
  root_instrument: z.string(),
  child_instruments: z.array(z.string()),
  status: LifecycleStatus,
  status_rationale: z.string(),
  examiner_override: LifecycleStatus.nullable(),
});

// -- Pipeline Status (for moat moment) --

export const PipelineStage = z.enum([
  "received",
  "recorded",
  "indexed",
  "verified",
  "published",
]);

export const PipelineStatus = z.object({
  verified_through_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  current_stage: PipelineStage,
  last_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// -- Top-level data file schemas --

export const ParcelFile = Parcel;
export const InstrumentsFile = z.array(Instrument);
export const LinksFile = z.array(DocumentLink);
export const LifecyclesFile = z.object({
  pipeline_status: PipelineStatus,
  lifecycles: z.array(EncumbranceLifecycle),
});
```

- [ ] **Step 2: Generate TypeScript types**

`src/types.ts`:
```ts
import { z } from "zod";
import {
  Parcel,
  Instrument,
  Party,
  OwnerPeriod,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
  FieldWithProvenance,
  LifecycleStatus,
  ExaminerAction,
  DocumentType,
  LinkType,
  ProvenanceKind,
} from "./schemas";

export type Parcel = z.infer<typeof Parcel>;
export type Instrument = z.infer<typeof Instrument>;
export type Party = z.infer<typeof Party>;
export type OwnerPeriod = z.infer<typeof OwnerPeriod>;
export type DocumentLink = z.infer<typeof DocumentLink>;
export type EncumbranceLifecycle = z.infer<typeof EncumbranceLifecycle>;
export type PipelineStatus = z.infer<typeof PipelineStatus>;
export type FieldWithProvenance = z.infer<typeof FieldWithProvenance>;
export type LifecycleStatus = z.infer<typeof LifecycleStatus>;
export type ExaminerAction = z.infer<typeof ExaminerAction>;
export type DocumentType = z.infer<typeof DocumentType>;
export type LinkType = z.infer<typeof LinkType>;
export type ProvenanceKind = z.infer<typeof ProvenanceKind>;
```

- [ ] **Step 3: Commit**

```bash
git add src/schemas.ts src/types.ts
git commit -m "feat: Zod schemas + TypeScript types for data model"
```

### Task 3.3: TDD — Schema Validation Tests

**Files:**
- Create: `tests/schemas.test.ts`

**TDD GATE: Write tests FIRST, then verify they fail, then verify the schemas pass them.**

- [ ] **Step 1: Write failing tests**

`tests/schemas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  Instrument,
  Parcel,
  DocumentLink,
  EncumbranceLifecycle,
  LifecyclesFile,
  InstrumentsFile,
  ParcelFile,
  LinksFile,
} from "../src/schemas";

describe("Instrument schema", () => {
  const validInstrument = {
    instrument_number: "20210234567",
    recording_date: "2021-03-15",
    document_type: "deed_of_trust",
    grantor: ["SMITH, JOHN"],
    grantee: ["BANK OF AMERICA NA"],
    back_references: [],
    source_image_path: "/raw/20210234567.pdf",
    extracted_fields: {
      loan_amount: {
        value: "$320,000.00",
        provenance: "index_metadata",
        confidence: 1.0,
      },
    },
    corpus_boundary_note:
      "County online records searched through 2026-04-10",
  };

  it("accepts a valid instrument", () => {
    expect(() => Instrument.parse(validInstrument)).not.toThrow();
  });

  it("rejects missing instrument_number", () => {
    const { instrument_number, ...rest } = validInstrument;
    expect(() => Instrument.parse(rest)).toThrow();
  });

  it("rejects invalid recording_date format", () => {
    expect(() =>
      Instrument.parse({ ...validInstrument, recording_date: "03/15/2021" })
    ).toThrow();
  });

  it("rejects unknown document_type", () => {
    expect(() =>
      Instrument.parse({ ...validInstrument, document_type: "mystery" })
    ).toThrow();
  });

  it("rejects empty grantor array", () => {
    expect(() =>
      Instrument.parse({ ...validInstrument, grantor: [] })
    ).toThrow();
  });

  it("rejects confidence outside 0-1 range", () => {
    expect(() =>
      Instrument.parse({
        ...validInstrument,
        extracted_fields: {
          loan_amount: {
            value: "$320,000.00",
            provenance: "manual_entry",
            confidence: 1.5,
          },
        },
      })
    ).toThrow();
  });
});

describe("Parcel schema", () => {
  const validParcel = {
    apn: "123-45-678",
    address: "1234 E Main St",
    city: "Mesa",
    state: "AZ",
    zip: "85201",
    legal_description: "LOT 5, BLOCK 3, MESA SUNRISE UNIT 2",
    current_owner: "SMITH, JOHN & JANE",
  };

  it("accepts a valid parcel", () => {
    expect(() => Parcel.parse(validParcel)).not.toThrow();
  });

  it("rejects state longer than 2 chars", () => {
    expect(() =>
      Parcel.parse({ ...validParcel, state: "AZZ" })
    ).toThrow();
  });
});

describe("DocumentLink schema", () => {
  const validLink = {
    id: "link-001",
    source_instrument: "20220345678",
    target_instrument: "20210234567",
    link_type: "assignment_of",
    provenance: "ai_extraction",
    confidence: 0.85,
    examiner_action: "pending",
  };

  it("accepts a valid link", () => {
    expect(() => DocumentLink.parse(validLink)).not.toThrow();
  });

  it("rejects unknown link_type", () => {
    expect(() =>
      DocumentLink.parse({ ...validLink, link_type: "related_to" })
    ).toThrow();
  });

  it("rejects unknown examiner_action", () => {
    expect(() =>
      DocumentLink.parse({ ...validLink, examiner_action: "maybe" })
    ).toThrow();
  });
});

describe("LifecyclesFile schema", () => {
  const validFile = {
    pipeline_status: {
      verified_through_date: "2026-04-10",
      current_stage: "published",
      last_updated: "2026-04-10",
    },
    lifecycles: [
      {
        id: "lc-001",
        root_instrument: "20210234567",
        child_instruments: ["20220345678"],
        status: "open",
        status_rationale: "No reconveyance found in corpus",
        examiner_override: null,
      },
    ],
  };

  it("accepts a valid lifecycles file", () => {
    expect(() => LifecyclesFile.parse(validFile)).not.toThrow();
  });

  it("rejects unknown lifecycle status", () => {
    const bad = structuredClone(validFile);
    bad.lifecycles[0].status = "closed" as any;
    expect(() => LifecyclesFile.parse(bad)).toThrow();
  });

  it("rejects invalid pipeline stage", () => {
    const bad = structuredClone(validFile);
    bad.pipeline_status.current_stage = "approved" as any;
    expect(() => LifecyclesFile.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx vitest run tests/schemas.test.ts
```

Expected: All tests PASS (since the schemas already exist from Task 3.2).

Note: This is the one TDD task where schemas are written first because they ARE the specification. The tests validate the schema rejects bad data, which is the actual behavior under test.

- [ ] **Step 3: Commit**

```bash
git add tests/schemas.test.ts
git commit -m "test: schema validation tests for all data model entities"
```

### Task 3.4: Curate Instrument Data (Manual)

**Files:**
- Create: `data/instruments.json`
- Create: `data/parcel.json`

**Depends on:** Phase 2 corpus (R-003 results)

This task is manual curation — transcribing R-003 index metadata into structured JSON that validates against our schemas. No automation.

- [ ] **Step 1: Create parcel.json**

Transcribe from R-002/R-003 results into `data/parcel.json`:
```json
{
  "apn": "[from R-002]",
  "address": "[from R-002]",
  "city": "[from R-002]",
  "state": "AZ",
  "zip": "[from R-002]",
  "legal_description": "[from R-003 — verbatim from deed]",
  "current_owner": "[from R-002 — verbatim from assessor]"
}
```

- [ ] **Step 2: Create instruments.json**

For each instrument from R-003, create a JSON object matching the Instrument schema. Example entry:

```json
{
  "instrument_number": "[from R-003]",
  "recording_date": "YYYY-MM-DD",
  "document_type": "[map to our enum — see CLAUDE.md terminology notes]",
  "grantor": ["[exact name from index]"],
  "grantee": ["[exact name from index]"],
  "back_references": ["[instrument numbers referenced in the document]"],
  "source_image_path": "/raw/[instrument_number].[format]",
  "extracted_fields": {
    "[field_name]": {
      "value": "[value]",
      "provenance": "index_metadata",
      "confidence": 1.0
    }
  },
  "corpus_boundary_note": "County online records searched through [date]"
}
```

**Rules:**
- `provenance: "index_metadata"` for any field taken directly from the recorder's index display
- `provenance: "ai_extraction"` for fields read from the document image by AI
- `provenance: "manual_entry"` for fields transcribed by hand from the image
- `confidence: 1.0` for index metadata and verified manual entry
- `confidence: 0.9` for clear AI extraction, `0.7` for ambiguous, `0.5` for uncertain
- Map Maricopa's document type labels to our enum using CLAUDE.md terminology notes
- `back_references` — populate from any cross-reference fields visible in the index or document text

**UNCERTAINTY FLAG:** Back-references may not be explicitly listed in Maricopa's index metadata. If R-003 shows that instruments don't carry back-reference fields, we populate them manually by reading the document images (e.g., a Deed of Trust often references the vesting deed). These get `provenance: "manual_entry"`.

- [ ] **Step 3: Validate against schema**

```bash
npx tsx -e "
import { readFileSync } from 'fs';
import { InstrumentsFile, ParcelFile } from './src/schemas';
const instruments = JSON.parse(readFileSync('data/instruments.json', 'utf8'));
const parcel = JSON.parse(readFileSync('data/parcel.json', 'utf8'));
InstrumentsFile.parse(instruments);
ParcelFile.parse(parcel);
console.log('instruments.json: VALID (' + instruments.length + ' instruments)');
console.log('parcel.json: VALID');
"
```

Expected: Both files parse without errors.

- [ ] **Step 4: Commit**

```bash
git add data/parcel.json data/instruments.json
git commit -m "feat: curated instrument + parcel data from R-003 corpus"
```

### Task 3.5: TDD — Chain Builder Logic

**Files:**
- Create: `tests/chain-builder.test.ts`
- Create: `src/logic/chain-builder.ts`

**TDD GATE: Tests first. Implementation second.**

- [ ] **Step 1: Write failing tests**

`tests/chain-builder.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildOwnerPeriods } from "../src/logic/chain-builder";
import type { Instrument } from "../src/types";

// Minimal fixtures — just the fields chain-builder needs
const makeDeed = (
  overrides: Partial<Instrument> & Pick<Instrument, "instrument_number" | "recording_date" | "grantor" | "grantee">
): Instrument => ({
  document_type: "warranty_deed",
  back_references: [],
  source_image_path: "/raw/test.pdf",
  extracted_fields: {},
  corpus_boundary_note: "test",
  ...overrides,
});

describe("buildOwnerPeriods", () => {
  it("returns a single current owner for one deed", () => {
    const instruments: Instrument[] = [
      makeDeed({
        instrument_number: "20100001",
        recording_date: "2010-05-01",
        grantor: ["SELLER, A"],
        grantee: ["BUYER, B"],
      }),
    ];

    const periods = buildOwnerPeriods(instruments);
    expect(periods).toHaveLength(1);
    expect(periods[0].owner).toBe("BUYER, B");
    expect(periods[0].start_instrument).toBe("20100001");
    expect(periods[0].start_date).toBe("2010-05-01");
    expect(periods[0].end_instrument).toBeNull();
    expect(periods[0].end_date).toBeNull();
    expect(periods[0].is_current).toBe(true);
  });

  it("chains two deeds into two owner periods", () => {
    const instruments: Instrument[] = [
      makeDeed({
        instrument_number: "20100001",
        recording_date: "2010-05-01",
        grantor: ["ORIGINAL, OWNER"],
        grantee: ["MIDDLE, OWNER"],
      }),
      makeDeed({
        instrument_number: "20180002",
        recording_date: "2018-09-15",
        grantor: ["MIDDLE, OWNER"],
        grantee: ["CURRENT, OWNER"],
      }),
    ];

    const periods = buildOwnerPeriods(instruments);
    expect(periods).toHaveLength(2);

    expect(periods[0].owner).toBe("MIDDLE, OWNER");
    expect(periods[0].start_date).toBe("2010-05-01");
    expect(periods[0].end_date).toBe("2018-09-15");
    expect(periods[0].is_current).toBe(false);

    expect(periods[1].owner).toBe("CURRENT, OWNER");
    expect(periods[1].start_date).toBe("2018-09-15");
    expect(periods[1].is_current).toBe(true);
  });

  it("sorts deeds chronologically regardless of input order", () => {
    const instruments: Instrument[] = [
      makeDeed({
        instrument_number: "20180002",
        recording_date: "2018-09-15",
        grantor: ["MIDDLE, OWNER"],
        grantee: ["CURRENT, OWNER"],
      }),
      makeDeed({
        instrument_number: "20100001",
        recording_date: "2010-05-01",
        grantor: ["ORIGINAL, OWNER"],
        grantee: ["MIDDLE, OWNER"],
      }),
    ];

    const periods = buildOwnerPeriods(instruments);
    expect(periods[0].owner).toBe("MIDDLE, OWNER");
    expect(periods[1].owner).toBe("CURRENT, OWNER");
  });

  it("ignores non-deed instrument types", () => {
    const instruments: Instrument[] = [
      makeDeed({
        instrument_number: "20100001",
        recording_date: "2010-05-01",
        grantor: ["SELLER, A"],
        grantee: ["BUYER, B"],
      }),
      {
        ...makeDeed({
          instrument_number: "20100002",
          recording_date: "2010-05-02",
          grantor: ["BUYER, B"],
          grantee: ["BANK NA"],
        }),
        document_type: "deed_of_trust",
      },
    ];

    const periods = buildOwnerPeriods(instruments);
    expect(periods).toHaveLength(1);
    expect(periods[0].owner).toBe("BUYER, B");
  });

  it("handles multiple grantees by joining names", () => {
    const instruments: Instrument[] = [
      makeDeed({
        instrument_number: "20100001",
        recording_date: "2010-05-01",
        grantor: ["SELLER, A"],
        grantee: ["SMITH, JOHN", "SMITH, JANE"],
      }),
    ];

    const periods = buildOwnerPeriods(instruments);
    expect(periods[0].owner).toBe("SMITH, JOHN & SMITH, JANE");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/chain-builder.test.ts
```

Expected: FAIL — `buildOwnerPeriods` does not exist.

- [ ] **Step 3: Implement chain-builder**

`src/logic/chain-builder.ts`:
```ts
import type { Instrument, OwnerPeriod } from "../types";

const DEED_TYPES = new Set([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
]);

export function buildOwnerPeriods(instruments: Instrument[]): OwnerPeriod[] {
  const deeds = instruments
    .filter((i) => DEED_TYPES.has(i.document_type))
    .sort(
      (a, b) =>
        new Date(a.recording_date).getTime() -
        new Date(b.recording_date).getTime()
    );

  if (deeds.length === 0) return [];

  const periods: OwnerPeriod[] = [];

  for (let i = 0; i < deeds.length; i++) {
    const deed = deeds[i];
    const nextDeed = deeds[i + 1] ?? null;
    const owner =
      deed.grantee.length > 1
        ? deed.grantee.join(" & ")
        : deed.grantee[0];

    periods.push({
      owner,
      start_instrument: deed.instrument_number,
      start_date: deed.recording_date,
      end_instrument: nextDeed?.instrument_number ?? null,
      end_date: nextDeed?.recording_date ?? null,
      is_current: nextDeed === null,
    });
  }

  return periods;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/chain-builder.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/chain-builder.test.ts src/logic/chain-builder.ts
git commit -m "feat: chain-builder — assembles owner periods from deed history (TDD)"
```

### Task 3.6: TDD — Lifecycle Status Logic

**Files:**
- Create: `tests/lifecycle-status.test.ts`
- Create: `src/logic/lifecycle-status.ts`

**TDD GATE: Tests first. Implementation second. This is the core thesis logic.**

- [ ] **Step 1: Write failing tests**

`tests/lifecycle-status.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeLifecycleStatus, resolveLifecycleStatus } from "../src/logic/lifecycle-status";
import type { Instrument, DocumentLink } from "../src/types";

describe("computeLifecycleStatus", () => {
  const rootDot: Instrument = {
    instrument_number: "20210001",
    recording_date: "2021-03-15",
    document_type: "deed_of_trust",
    grantor: ["SMITH, JOHN"],
    grantee: ["LENDER BANK NA"],
    back_references: [],
    source_image_path: "/raw/20210001.pdf",
    extracted_fields: {},
    corpus_boundary_note: "County online records searched through 2026-04-10",
  };

  it("returns 'open' when no child instruments exist", () => {
    const result = computeLifecycleStatus(rootDot, [], []);
    expect(result.status).toBe("open");
    expect(result.status_rationale).toContain("No reconveyance found");
  });

  it("returns 'released' when a release link is accepted", () => {
    const release: Instrument = {
      ...rootDot,
      instrument_number: "20230002",
      recording_date: "2023-06-01",
      document_type: "full_reconveyance",
      grantor: ["LENDER BANK NA"],
      grantee: ["SMITH, JOHN"],
    };
    const links: DocumentLink[] = [
      {
        id: "link-001",
        source_instrument: "20230002",
        target_instrument: "20210001",
        link_type: "release_of",
        provenance: "ai_extraction",
        confidence: 0.95,
        examiner_action: "accepted",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [release], links);
    expect(result.status).toBe("released");
  });

  it("returns 'possible_match' when release link is pending review", () => {
    const release: Instrument = {
      ...rootDot,
      instrument_number: "20230002",
      recording_date: "2023-06-01",
      document_type: "full_reconveyance",
      grantor: ["LOAN SERVICER LLC"],
      grantee: ["SMITH, JOHN"],
    };
    const links: DocumentLink[] = [
      {
        id: "link-001",
        source_instrument: "20230002",
        target_instrument: "20210001",
        link_type: "release_of",
        provenance: "ai_extraction",
        confidence: 0.75,
        examiner_action: "pending",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [release], links);
    expect(result.status).toBe("possible_match");
    expect(result.status_rationale).toContain("pending");
  });

  it("returns 'unresolved' when release link is rejected", () => {
    const release: Instrument = {
      ...rootDot,
      instrument_number: "20230002",
      recording_date: "2023-06-01",
      document_type: "full_reconveyance",
      grantor: ["UNRELATED ENTITY"],
      grantee: ["SMITH, JOHN"],
    };
    const links: DocumentLink[] = [
      {
        id: "link-001",
        source_instrument: "20230002",
        target_instrument: "20210001",
        link_type: "release_of",
        provenance: "ai_extraction",
        confidence: 0.4,
        examiner_action: "rejected",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [release], links);
    expect(result.status).toBe("unresolved");
  });

  it("returns 'open' when only assignments exist, no release", () => {
    const assignment: Instrument = {
      ...rootDot,
      instrument_number: "20220003",
      recording_date: "2022-01-10",
      document_type: "assignment_of_dot",
      grantor: ["LENDER BANK NA"],
      grantee: ["NEW SERVICER LLC"],
    };
    const links: DocumentLink[] = [
      {
        id: "link-002",
        source_instrument: "20220003",
        target_instrument: "20210001",
        link_type: "assignment_of",
        provenance: "index_metadata",
        confidence: 1.0,
        examiner_action: "accepted",
      },
    ];
    const result = computeLifecycleStatus(rootDot, [assignment], links);
    expect(result.status).toBe("open");
  });

});

describe("resolveLifecycleStatus", () => {
  const computed = {
    status: "open" as const,
    status_rationale: "No reconveyance found in corpus for DOT 20210001",
  };

  it("returns computed unchanged when override is null", () => {
    const result = resolveLifecycleStatus(computed, null);
    expect(result).toEqual(computed);
  });

  it("override wins over computed status", () => {
    const result = resolveLifecycleStatus(computed, "released");
    expect(result.status).toBe("released");
  });

  it("rationale includes original reason when overridden", () => {
    const result = resolveLifecycleStatus(computed, "released");
    expect(result.status_rationale).toContain("Examiner override");
    expect(result.status_rationale).toContain("open");
    expect(result.status_rationale).toContain("No reconveyance found");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lifecycle-status.test.ts
```

Expected: FAIL — `computeLifecycleStatus` does not exist.

- [ ] **Step 3: Implement lifecycle-status**

`src/logic/lifecycle-status.ts`:
```ts
import type { Instrument, DocumentLink, LifecycleStatus } from "../types";

const RELEASE_TYPES = new Set([
  "full_reconveyance",
  "partial_reconveyance",
]);

export interface LifecycleResult {
  status: LifecycleStatus;
  status_rationale: string;
}

export function computeLifecycleStatus(
  rootDot: Instrument,
  childInstruments: Instrument[],
  links: DocumentLink[]
): LifecycleResult {
  // Find release links pointing at the root DOT
  const releaseLinks = links.filter(
    (link) =>
      link.target_instrument === rootDot.instrument_number &&
      link.link_type === "release_of"
  );

  if (releaseLinks.length === 0) {
    return {
      status: "open",
      status_rationale: `No reconveyance found in corpus for DOT ${rootDot.instrument_number}`,
    };
  }

  // Check examiner actions on release links
  const acceptedRelease = releaseLinks.find(
    (l) => l.examiner_action === "accepted"
  );
  if (acceptedRelease) {
    return {
      status: "released",
      status_rationale: `Release confirmed by examiner via ${acceptedRelease.source_instrument}`,
    };
  }

  const rejectedAll = releaseLinks.every(
    (l) => l.examiner_action === "rejected"
  );
  if (rejectedAll) {
    return {
      status: "unresolved",
      status_rationale: `Release candidate(s) rejected by examiner — status requires further investigation`,
    };
  }

  // Pending release links exist
  const bestCandidate = releaseLinks.reduce((a, b) =>
    a.confidence > b.confidence ? a : b
  );
  return {
    status: "possible_match",
    status_rationale: `Release candidate ${bestCandidate.source_instrument} pending examiner review (confidence: ${bestCandidate.confidence})`,
  };
}

export function resolveLifecycleStatus(
  computed: LifecycleResult,
  override: LifecycleStatus | null
): LifecycleResult {
  if (override === null) return computed;
  return {
    status: override,
    status_rationale: `Examiner override: ${override} (original: ${computed.status} — ${computed.status_rationale})`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lifecycle-status.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/lifecycle-status.test.ts src/logic/lifecycle-status.ts
git commit -m "feat: lifecycle-status — computes encumbrance status from links (TDD)"
```

### Task 3.7: TDD — Citation Formatter

**Files:**
- Create: `tests/citation-formatter.test.ts`
- Create: `src/logic/citation-formatter.ts`

**TDD GATE: Tests first.**

- [ ] **Step 1: Write failing tests**

`tests/citation-formatter.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatCitation } from "../src/logic/citation-formatter";
import type { Instrument } from "../src/types";

describe("formatCitation", () => {
  const instrument: Instrument = {
    instrument_number: "20210234567",
    recording_date: "2021-03-15",
    document_type: "deed_of_trust",
    grantor: ["SMITH, JOHN"],
    grantee: ["LENDER BANK NA"],
    back_references: [],
    source_image_path: "/raw/20210234567.pdf",
    extracted_fields: {},
    corpus_boundary_note: "County online records searched through 2026-04-10",
  };

  it("formats a standard citation", () => {
    const result = formatCitation(instrument, "Maricopa County, AZ");
    expect(result).toBe(
      "Deed of Trust, Inst. No. 20210234567, recorded 2021-03-15, Maricopa County, AZ"
    );
  });

  it("humanizes document type names", () => {
    const deed = { ...instrument, document_type: "warranty_deed" as const };
    const result = formatCitation(deed, "Maricopa County, AZ");
    expect(result).toContain("Warranty Deed");
  });

  it("humanizes assignment type", () => {
    const asn = { ...instrument, document_type: "assignment_of_dot" as const };
    const result = formatCitation(asn, "Maricopa County, AZ");
    expect(result).toContain("Assignment of Deed of Trust");
  });

  it("humanizes full reconveyance type", () => {
    const recon = { ...instrument, document_type: "full_reconveyance" as const };
    const result = formatCitation(recon, "Maricopa County, AZ");
    expect(result).toContain("Full Reconveyance");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/citation-formatter.test.ts
```

Expected: FAIL — `formatCitation` does not exist.

- [ ] **Step 3: Implement citation-formatter**

`src/logic/citation-formatter.ts`:
```ts
import type { Instrument, DocumentType } from "../types";

const TYPE_LABELS: Record<DocumentType, string> = {
  warranty_deed: "Warranty Deed",
  special_warranty_deed: "Special Warranty Deed",
  quit_claim_deed: "Quit Claim Deed",
  grant_deed: "Grant Deed",
  deed_of_trust: "Deed of Trust",
  assignment_of_dot: "Assignment of Deed of Trust",
  substitution_of_trustee: "Substitution of Trustee",
  full_reconveyance: "Full Reconveyance",
  partial_reconveyance: "Partial Reconveyance",
  modification: "Modification",
  heloc_dot: "HELOC Deed of Trust",
  other: "Other",
};

export function formatCitation(
  instrument: Instrument,
  countyName: string
): string {
  const typeLabel = TYPE_LABELS[instrument.document_type];
  return `${typeLabel}, Inst. No. ${instrument.instrument_number}, recorded ${instrument.recording_date}, ${countyName}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/citation-formatter.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/citation-formatter.test.ts src/logic/citation-formatter.ts
git commit -m "feat: citation-formatter — humanized instrument citation strings (TDD)"
```

### Task 3.8: Curate Links + Lifecycles Data

**Files:**
- Create: `data/links.json`
- Create: `data/lifecycles.json`

**Depends on:** Task 3.4 (instruments.json must exist), Task 3.6 (lifecycle status logic must be understood)

- [ ] **Step 1: Create links.json**

For each relationship between instruments, create a DocumentLink record. Types:
- `back_reference` — deed references the prior deed
- `assignment_of` — Assignment of DOT references the root DOT
- `release_of` — Reconveyance references the DOT it releases
- `modification_of` — Modification references the DOT
- `substitution_of_trustee_for` — Sub of Trustee references the DOT

Example:
```json
[
  {
    "id": "link-001",
    "source_instrument": "[assignment instrument number]",
    "target_instrument": "[root DOT instrument number]",
    "link_type": "assignment_of",
    "provenance": "index_metadata",
    "confidence": 1.0,
    "examiner_action": "pending"
  }
]
```

**Rules:**
- Use `"examiner_action": "pending"` for all links — the demo starts with AI-proposed links awaiting examiner review
- Exception: one obvious link can be pre-accepted to show what "accepted" looks like
- At least one link should have `confidence < 0.8` to demonstrate the `possible_match` status
- `provenance` reflects how the link was determined: `index_metadata` if the county index explicitly cross-references, `ai_extraction` if we inferred from document text, `manual_entry` if we manually identified it

- [ ] **Step 2: Create lifecycles.json**

```json
{
  "pipeline_status": {
    "verified_through_date": "[date from R-001 corpus boundary]",
    "current_stage": "published",
    "last_updated": "[date from R-001]"
  },
  "lifecycles": [
    {
      "id": "lc-001",
      "root_instrument": "[DOT instrument number]",
      "child_instruments": ["[assignment]", "[release if any]"],
      "status": "[computed from lifecycle-status logic]",
      "status_rationale": "[from lifecycle-status logic]",
      "examiner_override": null
    }
  ]
}
```

- [ ] **Step 3: Validate against schema**

```bash
npx tsx -e "
import { readFileSync } from 'fs';
import { LinksFile, LifecyclesFile } from './src/schemas';
const links = JSON.parse(readFileSync('data/links.json', 'utf8'));
const lifecycles = JSON.parse(readFileSync('data/lifecycles.json', 'utf8'));
LinksFile.parse(links);
LifecyclesFile.parse(lifecycles);
console.log('links.json: VALID (' + links.length + ' links)');
console.log('lifecycles.json: VALID (' + lifecycles.lifecycles.length + ' lifecycles)');
"
```

Expected: Both files parse without errors.

- [ ] **Step 4: Commit**

```bash
git add data/links.json data/lifecycles.json
git commit -m "feat: curated links + lifecycle data with provenance"
```

### Task 3.9: Data Loader + Hook

**Files:**
- Create: `src/data-loader.ts`
- Create: `src/hooks/useParcelData.ts`

- [ ] **Step 1: Write data loader**

`src/data-loader.ts`:
```ts
import {
  ParcelFile,
  InstrumentsFile,
  LinksFile,
  LifecyclesFile,
} from "./schemas";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
} from "./types";

import parcelRaw from "../data/parcel.json";
import instrumentsRaw from "../data/instruments.json";
import linksRaw from "../data/links.json";
import lifecyclesRaw from "../data/lifecycles.json";

export interface ParcelData {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
}

export function loadParcelData(): ParcelData {
  const parcel = ParcelFile.parse(parcelRaw);
  const instruments = InstrumentsFile.parse(instrumentsRaw);
  const links = LinksFile.parse(linksRaw);
  const lifecyclesFile = LifecyclesFile.parse(lifecyclesRaw);

  return {
    parcel,
    instruments,
    links,
    lifecycles: lifecyclesFile.lifecycles,
    pipelineStatus: lifecyclesFile.pipeline_status,
  };
}
```

**UNCERTAINTY FLAG:** Importing JSON directly with `import` requires `resolveJsonModule: true` in `tsconfig.json` (Vite's React-TS template enables this by default). If not, fall back to `fetch()` at runtime. Verify after scaffold setup.

- [ ] **Step 2: Write useParcelData hook**

`src/hooks/useParcelData.ts`:
```ts
import { useMemo } from "react";
import { loadParcelData, type ParcelData } from "../data-loader";

export function useParcelData(): ParcelData {
  return useMemo(() => loadParcelData(), []);
}
```

- [ ] **Step 3: Write useExaminerActions hook**

`src/hooks/useExaminerActions.ts`:
```ts
import { useState, useCallback } from "react";
import type { DocumentLink, ExaminerAction, LifecycleStatus } from "../types";

interface ExaminerState {
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
}

export function useExaminerActions(initialLinks: DocumentLink[]) {
  const [state, setState] = useState<ExaminerState>(() => ({
    linkActions: Object.fromEntries(
      initialLinks.map((l) => [l.id, l.examiner_action])
    ),
    lifecycleOverrides: {},
  }));

  const setLinkAction = useCallback(
    (linkId: string, action: ExaminerAction) => {
      setState((prev) => ({
        ...prev,
        linkActions: { ...prev.linkActions, [linkId]: action },
      }));
    },
    []
  );

  const setLifecycleOverride = useCallback(
    (lifecycleId: string, status: LifecycleStatus) => {
      setState((prev) => ({
        ...prev,
        lifecycleOverrides: {
          ...prev.lifecycleOverrides,
          [lifecycleId]: status,
        },
      }));
    },
    []
  );

  return {
    linkActions: state.linkActions,
    lifecycleOverrides: state.lifecycleOverrides,
    setLinkAction,
    setLifecycleOverride,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/data-loader.ts src/hooks/useParcelData.ts src/hooks/useExaminerActions.ts
git commit -m "feat: data loader with Zod validation + examiner action hooks"
```

---

## Review Checkpoint: Phase 3 → Phase 4

**Gate:** Before starting UI build:
- [ ] All data files validate against schemas (run validation command)
- [ ] All tests pass: `npx vitest run`
- [ ] Data files contain real instrument data from R-003 (not fixture data)
- [ ] Links and lifecycles reflect actual relationships between instruments
- [ ] At least one lifecycle has `status: "open"` or `status: "possible_match"` for demo impact
- [ ] Dev server starts cleanly: `npx vite`

**Run `requesting-code-review` skill here.**

---

## Phase 4: UI Build (Day 2)

### Task 4.1: App Shell + Routing

**Files:**
- Create: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `index.html`

- [ ] **Step 1: Set up index.html**

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maricopa County Recorder — AI-Enhanced Title Search</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Set up main.tsx**

`src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Build App shell with screen navigation**

`src/App.tsx`:
```tsx
import { useState } from "react";
import { useParcelData } from "./hooks/useParcelData";
import { useExaminerActions } from "./hooks/useExaminerActions";
import { SearchEntry } from "./components/SearchEntry";
import { ChainOfTitle } from "./components/ChainOfTitle";
import { EncumbranceLifecycle } from "./components/EncumbranceLifecycle";
import { ProofDrawer } from "./components/ProofDrawer";

type Screen = "search" | "chain" | "encumbrance";

export default function App() {
  const data = useParcelData();
  const examiner = useExaminerActions(data.links);
  const [screen, setScreen] = useState<Screen>("search");
  const [drawerInstrument, setDrawerInstrument] = useState<string | null>(null);

  const openDrawer = (instrumentNumber: string) =>
    setDrawerInstrument(instrumentNumber);
  const closeDrawer = () => setDrawerInstrument(null);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <h1 className="text-lg font-semibold text-blue-900">
          Maricopa County Recorder
        </h1>
        <button
          onClick={() => setScreen("search")}
          className={`px-3 py-1 rounded text-sm ${screen === "search" ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Search
        </button>
        <button
          onClick={() => setScreen("chain")}
          className={`px-3 py-1 rounded text-sm ${screen === "chain" ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Chain of Title
        </button>
        <button
          onClick={() => setScreen("encumbrance")}
          className={`px-3 py-1 rounded text-sm ${screen === "encumbrance" ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Encumbrances
        </button>
      </nav>

      {/* Screen content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {screen === "search" && (
          <SearchEntry
            parcel={data.parcel}
            onSelectParcel={() => setScreen("chain")}
          />
        )}
        {screen === "chain" && (
          <ChainOfTitle
            parcel={data.parcel}
            instruments={data.instruments}
            links={data.links}
            onOpenDocument={openDrawer}
          />
        )}
        {screen === "encumbrance" && (
          <EncumbranceLifecycle
            parcel={data.parcel}
            instruments={data.instruments}
            links={data.links}
            lifecycles={data.lifecycles}
            pipelineStatus={data.pipelineStatus}
            linkActions={examiner.linkActions}
            lifecycleOverrides={examiner.lifecycleOverrides}
            onSetLinkAction={examiner.setLinkAction}
            onSetLifecycleOverride={examiner.setLifecycleOverride}
            onOpenDocument={openDrawer}
          />
        )}
      </main>

      {/* Proof Drawer overlay */}
      {drawerInstrument && (
        <ProofDrawer
          instrument={data.instruments.find(
            (i) => i.instrument_number === drawerInstrument
          )!}
          links={data.links.filter(
            (l) =>
              l.source_instrument === drawerInstrument ||
              l.target_instrument === drawerInstrument
          )}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create stub components so the app compiles**

Create minimal stubs for each component that just render a placeholder div. These will be replaced in subsequent tasks.

`src/components/SearchEntry.tsx`:
```tsx
import type { Parcel } from "../types";

interface Props {
  parcel: Parcel;
  onSelectParcel: () => void;
}

export function SearchEntry({ parcel, onSelectParcel }: Props) {
  return <div>SearchEntry stub — {parcel.address}</div>;
}
```

`src/components/ChainOfTitle.tsx`:
```tsx
import type { Parcel, Instrument, DocumentLink } from "../types";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
}

export function ChainOfTitle({ parcel }: Props) {
  return <div>ChainOfTitle stub — {parcel.apn}</div>;
}
```

`src/components/EncumbranceLifecycle.tsx`:
```tsx
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as EncumbranceLifecycleType,
  PipelineStatus,
  ExaminerAction,
  LifecycleStatus,
} from "../types";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycleType[];
  pipelineStatus: PipelineStatus;
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (lifecycleId: string, status: LifecycleStatus) => void;
  onOpenDocument: (instrumentNumber: string) => void;
}

export function EncumbranceLifecycle({ parcel }: Props) {
  return <div>EncumbranceLifecycle stub — {parcel.apn}</div>;
}
```

`src/components/ProofDrawer.tsx`:
```tsx
import type { Instrument, DocumentLink } from "../types";

interface Props {
  instrument: Instrument;
  links: DocumentLink[];
  onClose: () => void;
}

export function ProofDrawer({ instrument, onClose }: Props) {
  return (
    <div>
      ProofDrawer stub — {instrument.instrument_number}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

- [ ] **Step 5: Verify app compiles and renders**

```bash
npx vite
```

Open browser, confirm you see the nav bar and "SearchEntry stub" text. Click nav buttons to confirm screen switching works.

- [ ] **Step 6: Commit**

```bash
git add index.html src/
git commit -m "feat: app shell with navigation + stub components"
```

### Task 4.2: Screen 1 — Search Entry

**Files:**
- Modify: `src/components/SearchEntry.tsx`

- [ ] **Step 1: Build Search Entry screen**

`src/components/SearchEntry.tsx`:
```tsx
import { useState } from "react";
import type { Parcel } from "../types";

interface Props {
  parcel: Parcel;
  onSelectParcel: () => void;
}

export function SearchEntry({ parcel, onSelectParcel }: Props) {
  const [query, setQuery] = useState("");
  const matchesQuery =
    query.length === 0 ||
    parcel.address.toLowerCase().includes(query.toLowerCase()) ||
    parcel.apn.includes(query) ||
    parcel.current_owner.toLowerCase().includes(query.toLowerCase());

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        Official Records Search
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Search by address, APN, owner name, or instrument number
      </p>

      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 1234 E Main St, 123-45-678, SMITH JOHN, or 20210234567"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Results */}
      {matchesQuery && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">
              1 result found
            </span>
          </div>
          <button
            onClick={onSelectParcel}
            className="w-full text-left px-4 py-4 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-blue-900">
                  {parcel.address}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {parcel.city}, {parcel.state} {parcel.zip}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  APN: {parcel.apn}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {parcel.current_owner}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  View chain of title &rarr;
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {!matchesQuery && query.length > 0 && (
        <div className="text-center text-gray-500 py-12">
          No results matching "{query}"
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Start dev server, confirm search page renders with pre-populated result. Type a partial address — result stays visible. Type gibberish — "No results" appears. Click result — navigates to Chain of Title.

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchEntry.tsx
git commit -m "feat: Screen 1 — Search Entry with pre-populated result"
```

### Task 4.3: Shared Components

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/ProvenanceTag.tsx`
- Create: `src/components/InstrumentRow.tsx`
- Create: `src/components/MoatBanner.tsx`

These are shared across Screens 2, 3, and 4. Build them before the screens that use them.

- [ ] **Step 1: StatusBadge**

`src/components/StatusBadge.tsx`:
```tsx
import type { LifecycleStatus } from "../types";

const STATUS_CONFIG: Record<
  LifecycleStatus,
  { label: string; bg: string; text: string }
> = {
  open: { label: "Open", bg: "bg-red-100", text: "text-red-800" },
  released: { label: "Released", bg: "bg-green-100", text: "text-green-800" },
  unresolved: {
    label: "Unresolved",
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  possible_match: {
    label: "Possible Match",
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
};

interface Props {
  status: LifecycleStatus;
  overridden?: boolean;
}

export function StatusBadge({ status, overridden }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
      {overridden && (
        <span className="text-[10px] opacity-70" title="Examiner override">
          (override)
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: ProvenanceTag**

`src/components/ProvenanceTag.tsx`:
```tsx
import type { ProvenanceKind } from "../types";

const PROVENANCE_LABELS: Record<ProvenanceKind, string> = {
  index_metadata: "Index",
  ai_extraction: "AI",
  manual_entry: "Manual",
  hybrid: "Hybrid",
};

const PROVENANCE_COLORS: Record<ProvenanceKind, string> = {
  index_metadata: "bg-gray-100 text-gray-700",
  ai_extraction: "bg-purple-100 text-purple-700",
  manual_entry: "bg-orange-100 text-orange-700",
  hybrid: "bg-teal-100 text-teal-700",
};

interface Props {
  provenance: ProvenanceKind;
  confidence: number;
}

export function ProvenanceTag({ provenance, confidence }: Props) {
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${PROVENANCE_COLORS[provenance]}`}
      title={`Source: ${PROVENANCE_LABELS[provenance]}, Confidence: ${pct}%`}
    >
      {PROVENANCE_LABELS[provenance]} {pct}%
    </span>
  );
}
```

- [ ] **Step 3: InstrumentRow**

`src/components/InstrumentRow.tsx`:
```tsx
import type { Instrument } from "../types";
import { formatCitation } from "../logic/citation-formatter";

const TYPE_LABELS: Record<string, string> = {
  warranty_deed: "Warranty Deed",
  special_warranty_deed: "Special Warranty Deed",
  quit_claim_deed: "Quit Claim Deed",
  grant_deed: "Grant Deed",
  deed_of_trust: "Deed of Trust",
  assignment_of_dot: "Assignment of DOT",
  substitution_of_trustee: "Sub. of Trustee",
  full_reconveyance: "Full Reconveyance",
  partial_reconveyance: "Partial Reconveyance",
  modification: "Modification",
  heloc_dot: "HELOC DOT",
  other: "Other",
};

interface Props {
  instrument: Instrument;
  onOpenDocument: (instrumentNumber: string) => void;
}

export function InstrumentRow({ instrument, onOpenDocument }: Props) {
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 w-24">
          {instrument.recording_date}
        </span>
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium text-gray-700">
          {TYPE_LABELS[instrument.document_type] ?? instrument.document_type}
        </span>
        <button
          onClick={() => onOpenDocument(instrument.instrument_number)}
          className="text-sm font-mono text-blue-700 hover:underline"
          title="Open source document"
        >
          {instrument.instrument_number}
        </button>
      </div>
      <div className="text-sm text-gray-600">
        {instrument.grantor.join(", ")} &rarr; {instrument.grantee.join(", ")}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: MoatBanner**

`src/components/MoatBanner.tsx`:
```tsx
import type { PipelineStatus } from "../types";

const STAGE_ORDER = ["received", "recorded", "indexed", "verified", "published"];

interface Props {
  pipelineStatus: PipelineStatus;
}

export function MoatBanner({ pipelineStatus }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(pipelineStatus.current_stage);

  return (
    <div className="bg-blue-900 text-white px-4 py-3 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">
          County Recording Pipeline Status
        </span>
        <span className="text-xs text-blue-200">
          Records verified through{" "}
          <span className="font-mono font-semibold text-white">
            {pipelineStatus.verified_through_date}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((stage, idx) => (
          <div key={stage} className="flex items-center gap-1">
            <div
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                idx <= currentIdx
                  ? "bg-blue-500 text-white"
                  : "bg-blue-800 text-blue-400"
              }`}
            >
              {stage}
            </div>
            {idx < STAGE_ORDER.length - 1 && (
              <span
                className={`text-xs ${idx < currentIdx ? "text-blue-400" : "text-blue-700"}`}
              >
                &rarr;
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-blue-300 mt-2">
        Source: Maricopa County Recorder — authoritative county data, not a
        third-party aggregation
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Verify components compile**

```bash
npx vite
```

App should still render (shared components aren't used by stubs yet, but they must compile).

- [ ] **Step 6: Commit**

```bash
git add src/components/StatusBadge.tsx src/components/ProvenanceTag.tsx src/components/InstrumentRow.tsx src/components/MoatBanner.tsx
git commit -m "feat: shared components — StatusBadge, ProvenanceTag, InstrumentRow, MoatBanner"
```

### Task 4.4: Screen 2 — Chain of Title

**Files:**
- Modify: `src/components/ChainOfTitle.tsx`

- [ ] **Step 1: Build Chain of Title screen**

`src/components/ChainOfTitle.tsx`:
```tsx
import { useMemo } from "react";
import type { Parcel, Instrument, DocumentLink } from "../types";
import { buildOwnerPeriods } from "../logic/chain-builder";
import { InstrumentRow } from "./InstrumentRow";

const DEED_TYPES = new Set([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
]);

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
}

export function ChainOfTitle({
  parcel,
  instruments,
  links,
  onOpenDocument,
}: Props) {
  const ownerPeriods = useMemo(
    () => buildOwnerPeriods(instruments),
    [instruments]
  );
  const deeds = useMemo(
    () =>
      instruments
        .filter((i) => DEED_TYPES.has(i.document_type))
        .sort(
          (a, b) =>
            new Date(a.recording_date).getTime() -
            new Date(b.recording_date).getTime()
        ),
    [instruments]
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Chain of Title</h2>
        <p className="text-sm text-gray-500 mt-1">
          {parcel.address} &mdash; APN: {parcel.apn}
        </p>
      </div>

      {/* Owner Period Timeline */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Ownership Periods
        </h3>
        <div className="relative">
          {ownerPeriods.map((period, idx) => (
            <div key={period.start_instrument} className="flex mb-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center mr-4">
                <div
                  className={`w-3 h-3 rounded-full ${period.is_current ? "bg-blue-600" : "bg-gray-400"}`}
                />
                {idx < ownerPeriods.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-1" />
                )}
              </div>

              {/* Period card */}
              <div
                className={`flex-1 border rounded-lg p-3 ${period.is_current ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">
                    {period.owner}
                  </span>
                  {period.is_current && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                      Current Owner
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {period.start_date}
                  {period.end_date
                    ? ` to ${period.end_date}`
                    : " to present"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deed List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Conveyance Instruments
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {deeds.map((deed) => (
            <InstrumentRow
              key={deed.instrument_number}
              instrument={deed}
              onOpenDocument={onOpenDocument}
            />
          ))}
        </div>
      </div>

      {/* Corpus boundary */}
      <p className="text-xs text-gray-400 mt-6 text-right">
        {deeds[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Start dev server. Navigate to Chain of Title. Confirm:
- Owner periods display as timeline with current owner highlighted
- Deeds listed chronologically
- Clicking instrument number opens proof drawer (stub)
- Corpus boundary note visible

- [ ] **Step 3: Commit**

```bash
git add src/components/ChainOfTitle.tsx
git commit -m "feat: Screen 2 — Chain of Title with owner periods + deed timeline"
```

### Task 4.5: Screen 3 — Encumbrance Lifecycle Panel

**Files:**
- Modify: `src/components/EncumbranceLifecycle.tsx`

This is the most complex screen. It shows DOT lifecycles with child instruments, status badges, and the three examiner actions.

- [ ] **Step 1: Build Encumbrance Lifecycle screen**

`src/components/EncumbranceLifecycle.tsx`:
```tsx
import { useMemo } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  PipelineStatus,
  ExaminerAction,
  LifecycleStatus,
} from "../types";
import { computeLifecycleStatus, resolveLifecycleStatus } from "../logic/lifecycle-status";
import { MoatBanner } from "./MoatBanner";
import { StatusBadge } from "./StatusBadge";
import { InstrumentRow } from "./InstrumentRow";
import { ProvenanceTag } from "./ProvenanceTag";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  pipelineStatus: PipelineStatus;
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (
    lifecycleId: string,
    status: LifecycleStatus
  ) => void;
  onOpenDocument: (instrumentNumber: string) => void;
}

export function EncumbranceLifecycle({
  parcel,
  instruments,
  links,
  lifecycles,
  pipelineStatus,
  linkActions,
  lifecycleOverrides,
  onSetLinkAction,
  onSetLifecycleOverride,
  onOpenDocument,
}: Props) {
  const instrumentMap = useMemo(
    () => new Map(instruments.map((i) => [i.instrument_number, i])),
    [instruments]
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Encumbrance Lifecycles
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {parcel.address} &mdash; APN: {parcel.apn}
        </p>
      </div>

      {/* County Moat Banner */}
      <MoatBanner pipelineStatus={pipelineStatus} />

      {/* Lifecycle Groups */}
      {lifecycles.map((lifecycle) => {
        const rootInst = instrumentMap.get(lifecycle.root_instrument);
        if (!rootInst) return null;

        const childInsts = lifecycle.child_instruments
          .map((num) => instrumentMap.get(num))
          .filter(Boolean) as Instrument[];

        const relatedLinks = links.filter(
          (l) => l.target_instrument === lifecycle.root_instrument
        );

        // Compute effective status: override wins if set
        const override = lifecycleOverrides[lifecycle.id] ?? null;
        const computed = computeLifecycleStatus(rootInst, childInsts, 
          relatedLinks.map(l => ({...l, examiner_action: linkActions[l.id] ?? l.examiner_action}))
        );
        const resolved = resolveLifecycleStatus(computed, override);
        const effectiveStatus = resolved.status;
        const isOverridden = override !== null;

        return (
          <div
            key={lifecycle.id}
            className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden"
          >
            {/* Lifecycle Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={effectiveStatus}
                  overridden={isOverridden}
                />
                <span className="font-semibold text-gray-800">
                  DOT: {rootInst.instrument_number}
                </span>
                <span className="text-sm text-gray-500">
                  recorded {rootInst.recording_date}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {rootInst.grantor.join(", ")} &rarr;{" "}
                {rootInst.grantee.join(", ")}
              </div>
            </div>

            {/* Root instrument */}
            <div className="px-4 py-2 border-b border-gray-100">
              <InstrumentRow
                instrument={rootInst}
                onOpenDocument={onOpenDocument}
              />
            </div>

            {/* Child instruments with link actions */}
            {childInsts.map((child) => {
              const link = relatedLinks.find(
                (l) => l.source_instrument === child.instrument_number
              );
              return (
                <div
                  key={child.instrument_number}
                  className="px-4 py-2 border-b border-gray-100 ml-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <InstrumentRow
                        instrument={child}
                        onOpenDocument={onOpenDocument}
                      />
                    </div>
                    {link && (
                      <div className="flex items-center gap-2 ml-4">
                        <ProvenanceTag
                          provenance={link.provenance}
                          confidence={link.confidence}
                        />
                        {/* Examiner action buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              onSetLinkAction(link.id, "accepted")
                            }
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              linkActions[link.id] === "accepted"
                                ? "bg-green-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-green-100"
                            }`}
                            title="Accept this link"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              onSetLinkAction(link.id, "rejected")
                            }
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              linkActions[link.id] === "rejected"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-red-100"
                            }`}
                            title="Reject this link"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() =>
                              onSetLinkAction(link.id, "unresolved")
                            }
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              linkActions[link.id] === "unresolved"
                                ? "bg-amber-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-amber-100"
                            }`}
                            title="Mark as unresolved"
                          >
                            Unresolved
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Status rationale */}
            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
              <span className="font-medium">Status rationale:</span>{" "}
              {resolved.status_rationale}
            </div>
          </div>
        );
      })}

      {/* Corpus boundary */}
      <p className="text-xs text-gray-400 mt-6 text-right">
        {instruments[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Start dev server. Navigate to Encumbrances. Confirm:
- Moat banner with pipeline stages visible
- Each DOT lifecycle shown as a card with status badge
- Child instruments indented under root DOT
- Accept/Reject/Unresolved buttons functional — clicking changes button state
- Status badge updates when examiner actions change (e.g., accepting a release link changes status to "released")
- Provenance tags visible on links
- Instrument numbers clickable → opens proof drawer (stub)

- [ ] **Step 3: Commit**

```bash
git add src/components/EncumbranceLifecycle.tsx
git commit -m "feat: Screen 3 — Encumbrance Lifecycle with examiner actions + moat banner"
```

**Run `requesting-code-review` between Screen 3 and Screen 4.** Screen 3 is the most complex component and the thesis carrier.

### Task 4.6: Screen 4 — Document Proof Drawer

**Files:**
- Modify: `src/components/ProofDrawer.tsx`

- [ ] **Step 1: Build Proof Drawer**

`src/components/ProofDrawer.tsx`:
```tsx
import { useCallback } from "react";
import type { Instrument, DocumentLink } from "../types";
import { formatCitation } from "../logic/citation-formatter";
import { ProvenanceTag } from "./ProvenanceTag";

const COUNTY_NAME = "Maricopa County, AZ";

interface Props {
  instrument: Instrument;
  links: DocumentLink[];
  onClose: () => void;
}

export function ProofDrawer({ instrument, links, onClose }: Props) {
  const citation = formatCitation(instrument, COUNTY_NAME);

  const handleCopyCitation = useCallback(() => {
    navigator.clipboard.writeText(citation);
  }, [citation]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[800px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-800">
              {instrument.instrument_number}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Recorded {instrument.recording_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCitation}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              title="Copy formatted citation to clipboard"
            >
              Copy Citation
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content: two-column */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Document Image */}
          <div className="w-1/2 border-r border-gray-200 overflow-auto bg-gray-100 p-4">
            <img
              src={instrument.source_image_path}
              alt={`Document ${instrument.instrument_number}`}
              className="w-full shadow-md bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).insertAdjacentHTML(
                  "afterend",
                  '<div class="text-center text-gray-400 py-12">Image not available</div>'
                );
              }}
            />
          </div>

          {/* Right: Extracted Fields */}
          <div className="w-1/2 overflow-auto p-6">
            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Extracted Fields
            </h4>

            {/* Standard fields */}
            <div className="space-y-3 mb-6">
              <FieldDisplay
                label="Grantor"
                value={instrument.grantor.join("; ")}
              />
              <FieldDisplay
                label="Grantee"
                value={instrument.grantee.join("; ")}
              />
              <FieldDisplay
                label="Recording Date"
                value={instrument.recording_date}
              />
              {instrument.legal_description && (
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-500">
                      Legal Description
                    </span>
                    <ProvenanceTag
                      provenance={instrument.legal_description.provenance}
                      confidence={instrument.legal_description.confidence}
                    />
                  </div>
                  <span className="text-sm text-gray-800 font-mono">
                    {instrument.legal_description.value}
                  </span>
                </div>
              )}
              {instrument.back_references.length > 0 && (
                <FieldDisplay
                  label="Back References"
                  value={instrument.back_references.join(", ")}
                />
              )}
            </div>

            {/* Dynamic extracted fields */}
            {Object.keys(instrument.extracted_fields).length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Additional Fields
                </h4>
                <div className="space-y-3 mb-6">
                  {Object.entries(instrument.extracted_fields).map(
                    ([key, field]) => (
                      <div key={key}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-500">
                            {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          <ProvenanceTag
                            provenance={field.provenance}
                            confidence={field.confidence}
                          />
                        </div>
                        <span className="text-sm text-gray-800">
                          {field.value}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </>
            )}

            {/* Related links */}
            {links.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Related Instruments
                </h4>
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="text-sm text-gray-600 flex items-center gap-2"
                    >
                      <span className="font-mono text-blue-700">
                        {link.source_instrument === instrument.instrument_number
                          ? link.target_instrument
                          : link.source_instrument}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({link.link_type.replace(/_/g, " ")})
                      </span>
                      <ProvenanceTag
                        provenance={link.provenance}
                        confidence={link.confidence}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Corpus boundary */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                {instrument.corpus_boundary_note}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="text-sm text-gray-800">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Start dev server. Click any instrument number on Chain of Title or Encumbrance screen. Confirm:
- Drawer slides in from right with backdrop
- Left side shows document image (or "Image not available" fallback)
- Right side shows extracted fields with provenance tags
- Related instruments listed with link types
- "Copy Citation" button copies formatted string to clipboard
- Clicking backdrop or X closes drawer
- Corpus boundary note visible at bottom

- [ ] **Step 3: Commit**

```bash
git add src/components/ProofDrawer.tsx
git commit -m "feat: Screen 4 — Document Proof Drawer with side-by-side image + fields"
```

### Task 4.7: (Stretch) Screen 5 — Parcel Dossier

**Only build if Day 2 morning is clearly ahead of schedule.**

**Files:**
- Create: `src/components/ParcelDossier.tsx`
- Modify: `src/App.tsx` (add nav button + route)

- [ ] **Step 1: Build Parcel Dossier**

`src/components/ParcelDossier.tsx`:
```tsx
import type { Parcel, PipelineStatus } from "../types";
import { MoatBanner } from "./MoatBanner";

interface Props {
  parcel: Parcel;
  pipelineStatus: PipelineStatus;
}

export function ParcelDossier({ parcel, pipelineStatus }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Parcel Dossier
      </h2>

      <MoatBanner pipelineStatus={pipelineStatus} />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          <div className="p-4 space-y-3">
            <Field label="Address" value={`${parcel.address}, ${parcel.city}, ${parcel.state} ${parcel.zip}`} />
            <Field label="APN" value={parcel.apn} />
            <Field label="Current Owner" value={parcel.current_owner} />
          </div>
          <div className="p-4 space-y-3">
            <Field label="Legal Description" value={parcel.legal_description} mono />
            {parcel.assessor_url && (
              <Field label="Assessor Link" value={parcel.assessor_url} />
            )}
            {parcel.recorder_url && (
              <Field label="Recorder Link" value={parcel.recorder_url} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Add to App.tsx navigation**

Add a "Dossier" nav button and route in the App shell. Add `"dossier"` to the Screen type union.

- [ ] **Step 3: Verify in browser and commit**

```bash
git add src/components/ParcelDossier.tsx src/App.tsx
git commit -m "feat: Screen 5 (stretch) — Parcel Dossier"
```

---

## Review Checkpoint: Phase 4 → Phase 5

**Gate:** Before demo polish:
- [ ] All 4 firm screens render real data
- [ ] All 5 mandatory interactions work (accept, reject, unresolved, open document, copy citation)
- [ ] Moat banner visible on Screen 3
- [ ] Proof drawer opens from both Screen 2 and Screen 3
- [ ] All tests pass: `npx vitest run`
- [ ] No console errors in browser dev tools

**Run `requesting-code-review` skill here.**

---

## Phase 5: Demo Polish + Red Team

### Task 5.1: Write Demo Script

**Files:**
- Modify: `docs/demo-script.md`

- [ ] **Step 1: Write the demo script**

Structure:
1. **Opening** (30 sec) — Who this is for, what problem it solves
2. **Search** (1 min) — Type address, find parcel, click through
3. **Chain of Title** (2 min) — Walk through owner periods, point out chronological chain, click an instrument to show proof drawer
4. **Encumbrance Lifecycle** (3 min) — The hero beat. Walk through DOT lifecycles, show statuses, demo accept/reject/unresolved actions, highlight the county moat banner
5. **Proof Drawer** (1 min) — Show source image side-by-side with extracted fields, provenance tags, copy citation
6. **County Moat Moment** (1 min) — "This is something no title plant can offer" speech, point to verified-through date and pipeline status
7. **Measurable Win** (30 sec) — Reference before-workflow screenshots: "Today this takes X searches, Y tabs, Z clicks. Our prototype does it in one screen."
8. **Mention-only futures** (30 sec) — Name normalization, live sync, multi-county
9. **Close** (30 sec)

Include the specific instrument numbers, names, and dates from our real data. Reference specific screenshot IDs from research handoffs for the measurable-win claim.

**Measurable-win rule:** Pull measurable-win numbers verbatim from `research/measurable-win.md`. Do not round, estimate, or invent. If the research file doesn't have a number, leave a `[TBD]` placeholder and flag it.

- [ ] **Step 2: Commit**

```bash
git add docs/demo-script.md
git commit -m "docs: demo script with real data references"
```

### Task 5.2: Red Team Pass

**Files:**
- Modify: `docs/red-team.md`

- [ ] **Step 1: Write adversarial review**

Write `docs/red-team.md` arguing against the demo as if you're an interviewer looking for weakness. Structure:

1. **Research depth** — Is the domain knowledge surface-level or practitioner-grade?
2. **Data credibility** — Can every displayed field be traced to a real source? Any hallucinated data?
3. **AI claim credibility** — Are we over-claiming what AI does in this demo?
4. **County moat claim** — Is the moat moment actually defensible, or is it hand-waving?
5. **Scope** — Did we stay focused or drift?
6. **UX** — Does the UI serve the examiner, or is it developer-facing?

For each critique, write:
- The attack
- The honest assessment (are they right?)
- The mitigation (what we actually did about it)

Address the top 3 critiques with specific code or data changes if needed.

- [ ] **Step 2: If critiques require code changes, make them**

- [ ] **Step 3: Commit**

```bash
git add docs/red-team.md
git commit -m "docs: adversarial red-team review of demo"
```

### Task 5.3: Risks and Fallbacks Doc

**Files:**
- Modify: `docs/risks-and-fallbacks.md`

- [ ] **Step 1: Document final risk state**

Update `docs/risks-and-fallbacks.md` with:
- Risks encountered during sprint and how they were handled
- Remaining known limitations
- What would break if the county portal changes
- What the next 2 weeks of development would prioritize

- [ ] **Step 2: Commit**

```bash
git add docs/risks-and-fallbacks.md
git commit -m "docs: risks and fallbacks register"
```

### Task 5.4: Final Verification

**Run `verification-before-completion` skill.**

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Validate all data files**

```bash
npx tsx -e "
import { readFileSync } from 'fs';
import { ParcelFile, InstrumentsFile, LinksFile, LifecyclesFile } from './src/schemas';
const p = ParcelFile.parse(JSON.parse(readFileSync('data/parcel.json','utf8')));
const i = InstrumentsFile.parse(JSON.parse(readFileSync('data/instruments.json','utf8')));
const l = LinksFile.parse(JSON.parse(readFileSync('data/links.json','utf8')));
const lc = LifecyclesFile.parse(JSON.parse(readFileSync('data/lifecycles.json','utf8')));
console.log('All data files VALID');
console.log('Parcel:', p.apn, p.address);
console.log('Instruments:', i.length);
console.log('Links:', l.length);
console.log('Lifecycles:', lc.lifecycles.length);
"
```

- [ ] **Step 3: Start dev server and verify all screens**

```bash
npx vite
```

Walk through all screens manually. Verify each DoD item.

- [ ] **Step 4: Verify local resilience**

Kill any network connection. Confirm the app still works entirely from local data and images.

### Task 5.5: Finish Development Branch

**Run `finishing-a-development-branch` skill.**

- [ ] **Step 1: Final commit of any remaining changes**

- [ ] **Step 2: Run the finishing skill — verify tests, clean worktree, offer merge/PR options**

---

## Uncertainty Flags (Consolidated)

These are areas where the approach depends on information we don't have yet:

1. **Image format from Maricopa portal** (Task 2.1) — Could be PDF, TIFF, or JPEG. If PDF, the Proof Drawer needs an `<iframe>` or PDF renderer instead of `<img>`. If TIFF, we may need to convert to PNG/JPEG during curation. **Mitigation:** Handle in Task 3.4 (curation step) — convert all images to a web-renderable format during manual curation.

2. **Back-reference availability** (Task 3.4) — Maricopa's index may or may not display back-references (cross-references to other instruments). If not present in the index, we manually identify them from document text during curation. **Mitigation:** All manually-identified back-references get `provenance: "manual_entry"`.

3. **JSON imports in Vite** (Task 3.9) — Vite's React-TS template should have `resolveJsonModule: true` but this needs verification after scaffold. **Mitigation:** If static import fails, use `fetch()` with `useEffect` instead.

4. **Document type enum completeness** (Task 3.2) — Our `DocumentType` enum may not cover all types Maricopa uses. R-001 captures the complete list; we may need to add enum values. **Mitigation:** The `"other"` catch-all handles unexpected types; add specific types as discovered.

5. **Maricopa recorder URL patterns** (Task 1.1) — The exact URLs for search, detail, and image viewer are unknown. R-001 captures them. **Mitigation:** R-001 acceptance criteria require URL patterns.
