# Seville Master Plat Encumbrance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Verification is invoked at API-budget checkpoints.

**Goal:** Add the Seville Master Plat (Book 553 Page 15) to the POPHAM corpus as a new lifecycle (`lc-005`) cross-linked to the existing Parcel 3 lifecycle (`lc-004`), and surface the upstream encumbrance authorities (Streetlight Improvement District + Seville Master HOA) on both plats so the prototype answers an examiner's "where are the liens?" question with the structural authority chain — not a fabricated lien.

**Architecture:**
1. Locate the Master Plat's recording number via bracket-scan of late-2000 recording numbers (Known Gap #2 makes book/page lookup unavailable).
2. Pull metadata + PDF via the two API capabilities that work (`GET /documents/{id}` + `GET /preview/pdf`).
3. Curate the new instrument with `public_api` + `manual_entry` provenance (Tesseract not available — visual transcription replaces OCR; each `manual_entry` field gets `source_page` + `source_note` for traceability).
4. Add `lc-005` with cross-link to `lc-004`; annotate both Parcel 3 and Master plats with an `encumbrance_authority` field pointing to the recurring-lien-creating clauses (Streetlight District Note 8, HOA dedication).
5. Schema gets three additive optional fields: `FieldWithProvenance.source_page`, `FieldWithProvenance.source_note`, `EncumbranceLifecycle.related_lifecycles`, `Instrument.encumbrance_authority`.
6. UI renders cross-lifecycle links and the encumbrance-authority annotation.
7. Demo script + Decision Log + a new hunt log document the pivot honestly.

**Tech Stack:** TypeScript, React 18, Vite, Vitest, Zod, react-router v7, Tailwind v4. Curl for API. Visual transcription via Read tool on PDFs (Tesseract unavailable).

**Hard constraints:**
- No fabricated recording numbers, parties, dates. Every field traces to a captured PDF in `data/raw/R-005/` or a documented public-API response.
- API bracket-scan budget: 200 calls max. If exceeded without a Book 553 P15 hit, STOP, pivot to deferred-with-hunt-log per user direction.
- Verification (superpowers:verification-before-completion) MUST be invoked at three checkpoints: (a) after bracket-scan locates the recording number, (b) before committing the new instrument JSON, (c) before requesting code review.

---

## File Structure

**Created:**
- `data/raw/R-005/hunt-log.md` — bracket-scan transcript (every probed recording number, hit/miss, total calls)
- `data/raw/R-005/metadata/<recordingNumber>.json` — raw API response for the master plat
- `data/raw/R-005/pdfs/<recordingNumber>.pdf` — captured master plat PDF
- `src/data/instruments/<recordingNumber>.json` — curated Master Plat instrument
- `tests/seville-master-plat.test.ts` — schema + lifecycle + cross-link tests

**Modified:**
- `src/schemas.ts` — add three optional fields (`FieldWithProvenance.source_page`, `FieldWithProvenance.source_note`, `EncumbranceLifecycle.related_lifecycles`, `Instrument.encumbrance_authority`)
- `src/types.ts` — regenerate or hand-update to match
- `src/data/instruments/20010093192.json` — add `encumbrance_authority` field pointing to Streetlight District (Note 8) + HOA dedication; keep all existing fields untouched
- `src/data/lifecycles.json` — append `lc-005`, add `related_lifecycles: ["lc-005"]` to `lc-004` and `related_lifecycles: ["lc-004"]` to `lc-005`
- `src/data/parcels.json` — append the master plat recording number to POPHAM's `instrument_numbers` array
- `src/data-loader.ts` — import + register the new instrument JSON
- `src/components/EncumbranceLifecycle.tsx` — render `related_lifecycles` cross-link badges + `encumbrance_authority` annotation under each instrument row
- `docs/demo-script.md` — update Beat 7c with `lc-005` mention, update provenance-ratio talking point to describe blended corpus
- `CLAUDE.md` — append Decision #39 (Tesseract unavailability + new provenance ratio) and Decision #40 (Master plat + encumbrance_authority pivot)
- `docs/known-gaps.md` — add a tiny pointer to R-005 hunt log if the bracket-scan miss occurs

---

## Task 1: API bracket-scan to locate Book 553 Page 15

**Files:**
- Create: `data/raw/R-005/hunt-log.md`

**Strategy:** Per Decision #38 + sprint owner direction, scan late-2000 recording numbers in roughly the 20000600000 — 20010100000 range. The Maricopa year-2000 sequence ends near 20001050000 (verified empirically); year 2001 plats start with 20010001xxx. Book 554 begins 2001-02-07 with Seville Parcel 3 (20010093192) and Parcel 4 (20010093194). Book 553 must be earlier — likely late 2000 or January 2001. Plat-book 553 spans many filings; page 15 is mid-book. Heuristic: 2001-01-XX is the most likely date.

- [ ] **Step 1.1: Bound the search window with metadata-only sampling**

Sample 5 strategic recording numbers to triangulate. Run as a single command for efficiency:

```bash
for num in 20010050000 20010030000 20010010000 20001050000 20001000000; do
  out=$(curl -s "https://publicapi.recorder.maricopa.gov/documents/${num}")
  echo "$num: $(echo "$out" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('recordingDate',''),'book',d.get('docketBook',0),'page',d.get('pageMap',0),'codes',d.get('documentCodes',[]))" 2>/dev/null)"
done
```

Expected output: dates 12-2000 through 1-2001, with mostly book 0 / page 0 (non-plat instruments). If any plat (PLAT MAP code) shows up, note its book/page — it gives a coordinate for interpolating where Book 553 Page 15 lives.

- [ ] **Step 1.2: Linear scan within the most promising 100-call window**

Once Step 1.1 narrows the bound, scan in steps of ~50-100 numbers until a Book 553 hit appears. Then walk forward/backward to land on Page 15. Single command, one call per second to be polite:

```bash
START=<lower-bound>  # determined from Step 1.1
END=<upper-bound>    # determined from Step 1.1
STEP=100
HITS=0
TOTAL=0
mkdir -p data/raw/R-005
echo "# R-005 Hunt Log — Bracket-scan for Book 553 Page 15" > data/raw/R-005/hunt-log.md
echo "" >> data/raw/R-005/hunt-log.md
echo "Start: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> data/raw/R-005/hunt-log.md
echo "Bound: $START → $END, step $STEP" >> data/raw/R-005/hunt-log.md
echo "" >> data/raw/R-005/hunt-log.md
echo "| recordingNumber | recordingDate | docketBook | pageMap | documentCodes |" >> data/raw/R-005/hunt-log.md
echo "|-----------------|---------------|------------|---------|---------------|" >> data/raw/R-005/hunt-log.md
for ((num=START; num<=END; num+=STEP)); do
  TOTAL=$((TOTAL+1))
  out=$(curl -s "https://publicapi.recorder.maricopa.gov/documents/${num}")
  date=$(echo "$out" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('recordingDate',''))" 2>/dev/null)
  book=$(echo "$out" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('docketBook',0))" 2>/dev/null)
  page=$(echo "$out" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('pageMap',0))" 2>/dev/null)
  codes=$(echo "$out" | python -c "import sys,json;d=json.load(sys.stdin);print(','.join(d.get('documentCodes',[])))" 2>/dev/null)
  echo "| $num | $date | $book | $page | $codes |" >> data/raw/R-005/hunt-log.md
  if [ "$book" = "553" ]; then HITS=$((HITS+1)); fi
  if [ "$TOTAL" -ge 200 ]; then echo "BUDGET EXHAUSTED" >> data/raw/R-005/hunt-log.md; break; fi
  sleep 0.5
done
echo "Total calls: $TOTAL, Book 553 hits: $HITS" >> data/raw/R-005/hunt-log.md
```

Expected: a small handful of Book 553 hits; among them, find page 15 (or close) by zoom-in walk.

- [ ] **Step 1.3: Verification checkpoint — invoke superpowers:verification-before-completion**

Before believing the hit, verify:
- The recording number returns `docketBook: 553, pageMap: 15`
- `documentCodes` contains `PLAT MAP` (or `BIG MAP`)
- `recordingDate` is plausible (late 2000 / early 2001)
- The PDF actually pulls successfully via `/preview/pdf?recordingNumber={hit}`
- The PDF visually identifies as a SEVILLE master plat (SHEA HOMES dedicator, Seville Master HOA reference)

If any check fails, treat as miss and continue scanning. If 200 calls exhausted without a Book 553 P15 hit, STOP. Update hunt log with miss summary. Commit hunt log. Pivot to deferred state: do not invent a recording number — instead extend `lc-004` rationale to call out the second pivot in the demo script (Candidate C from brainstorm).

- [ ] **Step 1.4: Commit hunt log**

```bash
git add data/raw/R-005/hunt-log.md
git commit -m "research(R-005): bracket-scan for Seville Master Plat (Book 553 P15)"
```

If the scan missed, this commit is the entire deliverable for Tier 1-C — the hunt log itself becomes a second demo asset, parallel to `docs/hunt-log-known-gap-2.md`. Skip remaining tasks and jump to Task 11 to surface the miss in the demo script.

---

## Task 2: Capture Master Plat metadata + PDF

**Files:**
- Create: `data/raw/R-005/metadata/<recordingNumber>.json`
- Create: `data/raw/R-005/pdfs/<recordingNumber>.pdf`

**Premise:** Task 1 succeeded and `<recordingNumber>` is known.

- [ ] **Step 2.1: Save the raw API response verbatim**

```bash
RECNUM=<from-task-1>
mkdir -p data/raw/R-005/metadata
curl -s "https://publicapi.recorder.maricopa.gov/documents/${RECNUM}" \
  | python -m json.tool > "data/raw/R-005/metadata/${RECNUM}.json"
cat "data/raw/R-005/metadata/${RECNUM}.json"
```

Expected: pretty-printed JSON identical in shape to `data/raw/R-004/metadata/20010093192.json`. Confirm `docketBook=553, pageMap=15`.

- [ ] **Step 2.2: Save the PDF**

```bash
mkdir -p data/raw/R-005/pdfs
curl -s "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=${RECNUM}" \
  -o "data/raw/R-005/pdfs/${RECNUM}.pdf"
ls -la "data/raw/R-005/pdfs/${RECNUM}.pdf"
file "data/raw/R-005/pdfs/${RECNUM}.pdf"
```

Expected: file exists, size > 100 KB (plats are typically 1-3 MB), `file` reports PDF.

- [ ] **Step 2.3: Visual verification via Read tool**

Read the PDF using the Read tool (Claude can render PDF pages as images). Visually confirm:
- Title block names a Seville-family master plat
- Dedicator is SHEA HOMES LIMITED PARTNERSHIP (matches Parcel 3 plat)
- Book 553 / Page 15 corner stamp visible
- Engineer block names Coe & Van Loo (matches Parcel 3)
- HOA reference: SEVILLE MASTER HOMEOWNERS ASSOCIATION

Take notes on what each PDF page contains — these notes feed Task 5's `source_page` + `source_note` annotations. List every distinct fact-bearing page (title block, dedication, notes, lot table, etc.).

- [ ] **Step 2.4: Commit raw artifacts**

```bash
git add data/raw/R-005/metadata data/raw/R-005/pdfs
git commit -m "research(R-005): capture Seville Master Plat raw metadata + PDF"
```

---

## Task 3: Extend the schemas

**Files:**
- Modify: `src/schemas.ts:12-16` (extend `FieldWithProvenance`)
- Modify: `src/schemas.ts:80-110` (add `encumbrance_authority` to `Instrument`)
- Modify: `src/schemas.ts:179-186` (add `related_lifecycles` to `EncumbranceLifecycle`)
- Modify: `src/types.ts` (regenerate / hand-mirror)

- [ ] **Step 3.1: Write the failing schema test**

Create `tests/seville-master-plat.test.ts` with the schema-extension assertions only:

```typescript
import { describe, it, expect } from "vitest";
import {
  FieldWithProvenance,
  EncumbranceLifecycle,
  Instrument,
} from "../src/schemas";

describe("schema extensions for lc-005 / Seville Master Plat", () => {
  it("FieldWithProvenance accepts optional source_page and source_note", () => {
    const parsed = FieldWithProvenance.parse({
      value: "Coe & Van Loo Consultants, Inc.",
      provenance: "manual_entry",
      confidence: 1,
      source_page: 1,
      source_note: "engineer block, sheet 1",
    });
    expect(parsed.source_page).toBe(1);
    expect(parsed.source_note).toBe("engineer block, sheet 1");
  });

  it("FieldWithProvenance still accepts the legacy 3-key shape (back-compat)", () => {
    const parsed = FieldWithProvenance.parse({
      value: "x",
      provenance: "ocr",
      confidence: 0.9,
    });
    expect(parsed.source_page).toBeUndefined();
  });

  it("EncumbranceLifecycle accepts optional related_lifecycles", () => {
    const parsed = EncumbranceLifecycle.parse({
      id: "lc-005",
      root_instrument: "20010000000",
      child_instruments: [],
      status: "released",
      status_rationale: "x",
      examiner_override: null,
      related_lifecycles: ["lc-004"],
    });
    expect(parsed.related_lifecycles).toEqual(["lc-004"]);
  });

  it("Instrument accepts optional encumbrance_authority", () => {
    // Reuses an existing valid instrument shape with the new optional field added.
    // See task body for the full minimal valid Instrument fixture.
  });
});
```

For the `Instrument` test, hand-build a minimal valid fixture (see schema lines 80-110) and add `encumbrance_authority: { value: "...", provenance: "manual_entry", confidence: 1, source_page: 1, source_note: "Note 8, sheet 1" }`.

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npm test -- tests/seville-master-plat.test.ts --run
```

Expected: FAIL with "Unrecognized key(s) in object: 'source_page', 'source_note'" and similar for `related_lifecycles` / `encumbrance_authority`.

- [ ] **Step 3.3: Extend `FieldWithProvenance` in src/schemas.ts**

Replace lines 12-16:

```typescript
export const FieldWithProvenance = z.object({
  value: z.string(),
  provenance: ProvenanceKind,
  confidence: z.number().min(0).max(1),
  source_page: z.number().int().positive().optional(),
  source_note: z.string().optional(),
});
```

- [ ] **Step 3.4: Extend `EncumbranceLifecycle` in src/schemas.ts**

Replace lines 179-186:

```typescript
export const EncumbranceLifecycle = z.object({
  id: z.string(),
  root_instrument: z.string(),
  child_instruments: z.array(z.string()),
  status: LifecycleStatus,
  status_rationale: z.string(),
  examiner_override: LifecycleStatus.nullable(),
  related_lifecycles: z.array(z.string()).optional(),
});
```

- [ ] **Step 3.5: Extend `Instrument` schema with `encumbrance_authority`**

In the `Instrument` z.object (lines 80-110), add after `extracted_fields`:

```typescript
  encumbrance_authority: FieldWithProvenance.optional(),
```

- [ ] **Step 3.6: Re-export updated types**

`src/types.ts` is generated from / mirrors schemas. Re-derive types:

```bash
grep -n "FieldWithProvenance\|EncumbranceLifecycle\|Instrument" src/types.ts | head -20
```

If types.ts uses `z.infer` re-exports, no manual edit is needed. If types.ts is hand-written, mirror the three optional fields manually.

- [ ] **Step 3.7: Run test to verify it passes**

```bash
npm test -- tests/seville-master-plat.test.ts --run
```

Expected: PASS for the four schema extension tests.

- [ ] **Step 3.8: Run the full test suite to verify no regression**

```bash
npm test -- --run
```

Expected: 105 + 4 = 109 tests passing, zero failures.

- [ ] **Step 3.9: Commit**

```bash
git add src/schemas.ts src/types.ts tests/seville-master-plat.test.ts
git commit -m "feat(schema): add source_page/source_note, related_lifecycles, encumbrance_authority"
```

---

## Task 4: Curate the Master Plat instrument JSON

**Files:**
- Create: `src/data/instruments/<recordingNumber>.json`

- [ ] **Step 4.1: Build the Instrument JSON from raw API response + visual transcription**

Use `data/raw/R-005/metadata/<recordingNumber>.json` for the `raw_api_response` block (verbatim copy). Build the curated fields from visual inspection notes from Task 2.3. Match the shape of `src/data/instruments/20010093192.json` exactly.

Required fields per schema (`src/schemas.ts:80-110`):

```json
{
  "instrument_number": "<from raw API>",
  "recording_date": "<YYYY-MM-DD, normalized from raw 'M-D-YYYY'>",
  "document_type": "other",
  "document_type_raw": "PLAT MAP",
  "bundled_document_types": ["other"],
  "parties": [
    {
      "name": "SHEA HOMES LIMITED PARTNERSHIP",
      "role": "grantor",
      "provenance": "public_api",
      "confidence": 1
    },
    {
      "name": "<master subdivision name as recorded, e.g. SEVILLE>",
      "role": "grantee",
      "provenance": "manual_entry",
      "confidence": 1,
      "source_page": 1,
      "source_note": "title block, sheet 1"
    }
  ],
  "legal_description": {
    "value": "<verbatim from plat title block, sheet 1>",
    "provenance": "manual_entry",
    "confidence": 0.95,
    "source_page": 1,
    "source_note": "legal description block, sheet 1"
  },
  "extracted_fields": {
    "subdivision_name": { "value": "...", "provenance": "manual_entry", "confidence": 1, "source_page": 1, "source_note": "title block, sheet 1" },
    "section_township_range": { "value": "...", "provenance": "manual_entry", "confidence": 1, "source_page": 1, "source_note": "legal description block, sheet 1" },
    "lot_count": { "value": "...", "provenance": "manual_entry", "confidence": 0.95, "source_page": <page-of-lot-table>, "source_note": "lot area table" },
    "tract_count": { "value": "...", "provenance": "manual_entry", "confidence": 0.95, "source_page": <page-of-lot-table>, "source_note": "lot area table" },
    "engineering_firm": { "value": "Coe & Van Loo Consultants, Inc.", "provenance": "manual_entry", "confidence": 1, "source_page": 1, "source_note": "engineer block, sheet 1" },
    "docket_book_page": { "value": "Book 553 of Maps, Page 15", "provenance": "public_api", "confidence": 1 }
  },
  "encumbrance_authority": {
    "value": "Master plat establishes the SEVILLE MASTER HOMEOWNERS ASSOCIATION as the dedicated maintenance authority over common-area tracts, which is the upstream authority that subsequent recurring HOA-assessment liens (a non-DOT encumbrance class not surfaceable via the public API; see docs/hunt-log-known-gap-2.md) draw from. Specific assessment-lien recordings against any given Seville lot — including POPHAM Lot 46 — would require the county-internal name index, which is the structural moat the prototype demonstrates.",
    "provenance": "manual_entry",
    "confidence": 1,
    "source_page": 1,
    "source_note": "dedication block + HOA references, sheet 1"
  },
  "back_references": [],
  "source_image_path": "/raw/R-005/pdfs/<recordingNumber>.pdf",
  "page_count": <from raw API>,
  "raw_api_response": { ... <verbatim from raw metadata file> ... },
  "corpus_boundary_note": "County online records searched through 2026-04-09",
  "provenance_summary": {
    "public_api_count": <count of fields with provenance public_api>,
    "ocr_count": 0,
    "manual_entry_count": <count of fields with provenance manual_entry>
  }
}
```

DO NOT invent any party names, dates, or facts. Every `manual_entry` field's value MUST be visible in the captured PDF and MUST cite the page via `source_page`. If a field cannot be confirmed visually, omit it. The schema only requires `parties` (≥1) and the structural fields; everything else is optional/extracted.

- [ ] **Step 4.2: Verify the JSON parses against the schema**

Add a parse assertion to `tests/seville-master-plat.test.ts`:

```typescript
import masterPlat from "../src/data/instruments/<recordingNumber>.json";

it("Master Plat instrument JSON parses against the Instrument schema", () => {
  const parsed = Instrument.parse(masterPlat);
  expect(parsed.instrument_number).toBe("<recordingNumber>");
  expect(parsed.raw_api_response.docketBook).toBe(553);
  expect(parsed.raw_api_response.pageMap).toBe(15);
  expect(parsed.encumbrance_authority).toBeDefined();
  expect(parsed.encumbrance_authority!.provenance).toBe("manual_entry");
});
```

- [ ] **Step 4.3: Run test, verify PASS**

```bash
npm test -- tests/seville-master-plat.test.ts --run
```

Expected: PASS. If any field fails validation, fix the JSON (do not soften the schema).

- [ ] **Step 4.4: Verification checkpoint — invoke superpowers:verification-before-completion**

Before committing the curated instrument:
- Every `manual_entry` field has `source_page`
- Every `provenance: "public_api"` field's value is verifiable in `data/raw/R-005/metadata/<recordingNumber>.json`
- `provenance_summary` counts match the actual field counts
- `recording_date` matches normalized form of raw `recordingDate`
- No fabricated facts (cross-check each value against the PDF visually)

- [ ] **Step 4.5: Commit**

```bash
git add src/data/instruments/<recordingNumber>.json tests/seville-master-plat.test.ts
git commit -m "feat(corpus): add Seville Master Plat (Book 553 P15) curated instrument"
```

---

## Task 5: Annotate Parcel 3 plat with encumbrance_authority

**Files:**
- Modify: `src/data/instruments/20010093192.json` (add `encumbrance_authority` field)

- [ ] **Step 5.1: Write the failing assertion**

Append to `tests/seville-master-plat.test.ts`:

```typescript
import parcel3Plat from "../src/data/instruments/20010093192.json";

it("Parcel 3 plat carries an encumbrance_authority annotation citing Note 8 + HOA dedication", () => {
  const parsed = Instrument.parse(parcel3Plat);
  expect(parsed.encumbrance_authority).toBeDefined();
  expect(parsed.encumbrance_authority!.value.toLowerCase()).toContain("street light");
  expect(parsed.encumbrance_authority!.value.toLowerCase()).toContain("homeowners association");
  expect(parsed.encumbrance_authority!.source_page).toBe(1);
});
```

Run, expect FAIL ("encumbrance_authority is undefined").

- [ ] **Step 5.2: Add the annotation to `src/data/instruments/20010093192.json`**

After `extracted_fields` and before `back_references`, add:

```json
"encumbrance_authority": {
  "value": "Plat sheet 1 carries two recurring-lien-creating clauses binding every lot in this subdivision (POPHAM Lot 46 included): (a) Note 8 — \"ALL PROPERTIES PLATTED HEREIN ARE SUBJECT TO AN ANNUAL STREET LIGHT IMPROVEMENT DISTRICT ASSESSMENT,\" recorded by the Town of Gilbert as a separate Improvement District resolution; and (b) the dedication block — landscape maintenance on Tracts A-H by the SEVILLE MASTER HOMEOWNERS ASSOCIATION, whose authority to record assessment liens flows from the master plat (Book 553 Page 15) and the recorded CC&Rs. Neither the Streetlight District resolution nor any specific HOA-assessment-lien recording is reachable via the public Maricopa API — name- and document-code-filtered search is Cloudflare-gated (Known Gap #2, see docs/hunt-log-known-gap-2.md). The county-authoritative index closes that gap.",
  "provenance": "manual_entry",
  "confidence": 1,
  "source_page": 1,
  "source_note": "plat sheet 1 — Note 8 (Streetlight Improvement District) + dedication block (Seville Master Homeowners Association)"
},
```

Update `provenance_summary.manual_entry_count` to reflect the +1.

- [ ] **Step 5.3: Run test, verify PASS**

```bash
npm test -- tests/seville-master-plat.test.ts --run
```

Expected: PASS for both fixtures (master plat + Parcel 3 plat).

- [ ] **Step 5.4: Commit**

```bash
git add src/data/instruments/20010093192.json tests/seville-master-plat.test.ts
git commit -m "feat(corpus): annotate Seville Parcel 3 plat with encumbrance_authority (Streetlight District + HOA)"
```

---

## Task 6: Add lc-005 to lifecycles.json + cross-link lc-004

**Files:**
- Modify: `src/data/lifecycles.json:33-39` (add `related_lifecycles` to lc-004 + append lc-005)

- [ ] **Step 6.1: Write the failing test**

Append to `tests/seville-master-plat.test.ts`:

```typescript
import { loadParcelDataByApn } from "../src/data-loader";

describe("lc-005 / Seville Master Plat lifecycle", () => {
  it("lc-005 exists with the master plat as root and cross-links lc-004", () => {
    const { lifecycles } = loadParcelDataByApn("304-78-386");
    const lc005 = lifecycles.find((lc) => lc.id === "lc-005");
    expect(lc005).toBeDefined();
    expect(lc005!.root_instrument).toBe("<recordingNumber>");
    expect(lc005!.related_lifecycles).toContain("lc-004");
  });

  it("lc-004 cross-links back to lc-005", () => {
    const { lifecycles } = loadParcelDataByApn("304-78-386");
    const lc004 = lifecycles.find((lc) => lc.id === "lc-004");
    expect(lc004!.related_lifecycles).toContain("lc-005");
  });
});
```

Run, expect FAIL.

- [ ] **Step 6.2: Update `src/data/lifecycles.json`**

Modify lc-004 to add `"related_lifecycles": ["lc-005"]` after `examiner_override`.

Append a new lifecycle:

```json
{
  "id": "lc-005",
  "root_instrument": "<recordingNumber>",
  "child_instruments": [],
  "status": "released",
  "status_rationale": "Seville master subdivision encumbrances. Root master plat (Book 553 Page 15) dedicates Seville-wide common-area tracts and establishes the SEVILLE MASTER HOMEOWNERS ASSOCIATION whose assessment-lien authority binds POPHAM Lot 46 via the downstream Parcel 3 resubdivision (lc-004). Marked 'released' in the same sense as lc-004 — the master plat itself is a recorded instrument of record with no open loose-ends; specific recurring liens (HOA assessments, Streetlight District annual assessments per plat Note 8) live in document classes the public API cannot enumerate (Known Gap #2). See docs/hunt-log-known-gap-2.md for evidence and src/data/instruments/20010093192.json#encumbrance_authority for the upstream-authority annotation.",
  "examiner_override": null,
  "related_lifecycles": ["lc-004"]
}
```

- [ ] **Step 6.3: Run test, verify PASS**

```bash
npm test -- tests/seville-master-plat.test.ts --run
```

Expected: PASS.

- [ ] **Step 6.4: Commit**

```bash
git add src/data/lifecycles.json tests/seville-master-plat.test.ts
git commit -m "feat(lifecycle): add lc-005 (Seville master plat) cross-linked to lc-004"
```

---

## Task 7: Wire master plat into parcels + data-loader

**Files:**
- Modify: `src/data/parcels.json:12-21` (append recording number to POPHAM `instrument_numbers`)
- Modify: `src/data-loader.ts:16-38` (import + register the new instrument)

- [ ] **Step 7.1: Write the failing test**

Append to `tests/seville-master-plat.test.ts`:

```typescript
import { loadAllInstruments } from "../src/data-loader";

it("Master Plat is included in the data-loader registry", () => {
  const all = loadAllInstruments();
  expect(all.find((i) => i.instrument_number === "<recordingNumber>")).toBeDefined();
});

it("Master Plat is scoped to the POPHAM parcel", () => {
  const { instruments } = loadParcelDataByApn("304-78-386");
  expect(instruments.find((i) => i.instrument_number === "<recordingNumber>")).toBeDefined();
});
```

Run, expect FAIL.

- [ ] **Step 7.2: Add recording number to POPHAM `instrument_numbers`**

In `src/data/parcels.json`, append `"<recordingNumber>"` to the POPHAM `instrument_numbers` array.

- [ ] **Step 7.3: Wire into data-loader**

In `src/data-loader.ts`:

After the existing import block (line ~24):
```typescript
import inst<recordingNumber> from "./data/instruments/<recordingNumber>.json";
```

In the `instrumentsRaw` array (line ~28-38):
```typescript
const instrumentsRaw = [
  inst20130183449,
  inst20130183450,
  inst20210057846,
  inst20210057847,
  inst20210075858,
  inst20150516729,
  inst20150516730,
  inst20010093192,
  inst20010849180,
  inst<recordingNumber>,  // Seville Master Plat (Book 553 P15)
];
```

- [ ] **Step 7.4: Run test, verify PASS**

```bash
npm test -- tests/seville-master-plat.test.ts --run
```

Expected: PASS.

- [ ] **Step 7.5: Run full suite, verify no regression**

```bash
npm test -- --run
```

Expected: original 105 + new tests = total green, zero failures. Pay particular attention to `tests/subdivision-encumbrances.test.ts` (existing lc-004 test) — it should still pass with `related_lifecycles` now present (the existing test doesn't assert on that field, so it's unaffected).

- [ ] **Step 7.6: Commit**

```bash
git add src/data/parcels.json src/data-loader.ts tests/seville-master-plat.test.ts
git commit -m "feat(data): wire Seville Master Plat into POPHAM parcel + data-loader"
```

---

## Task 8: Render related_lifecycles + encumbrance_authority in EncumbranceLifecycle.tsx

**Files:**
- Modify: `src/components/EncumbranceLifecycle.tsx`

**Design intent:** Each lifecycle card already shows the root instrument and child instruments. Add two new visual elements:

1. **Cross-link badge** — at the lifecycle card header, if `lifecycle.related_lifecycles` is non-empty, render a small chip per related lifecycle (e.g., "↔ lc-004") with click-to-scroll behavior to the related card on the same page.
2. **Encumbrance authority annotation** — under each instrument row (or in the lifecycle card body, near the instrument list), if any instrument in the lifecycle carries `encumbrance_authority`, render an inline annotation panel with the value text, source page citation, and a `ProvenanceTag` chip.

- [ ] **Step 8.1: Write a smoke test for the cross-link rendering**

Create or extend a component-level test (use react-testing-library if already in project, otherwise a lightweight DOM-presence check). Skip if no component-test infrastructure exists — the data-loader tests cover the data path; visual rendering is verified manually in Task 10.

If component tests don't exist in the project, add this note to the commit message and skip to Step 8.2.

- [ ] **Step 8.2: Add cross-link rendering**

In `EncumbranceLifecycle.tsx`, find the lifecycle card render block (look for `lifecycles.map(` or similar). Inside the lifecycle-card header, after the status badge, add:

```tsx
{lifecycle.related_lifecycles && lifecycle.related_lifecycles.length > 0 && (
  <div className="ml-2 inline-flex items-center gap-1">
    {lifecycle.related_lifecycles.map((relId) => (
      <a
        key={relId}
        href={`#lifecycle-${relId}`}
        className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
        title={`Cross-linked to ${relId}`}
      >
        {`\u2194 ${relId}`}
      </a>
    ))}
  </div>
)}
```

Ensure each lifecycle card has `id={`lifecycle-${lifecycle.id}`}` on its outermost element so the anchor targets work.

- [ ] **Step 8.3: Add encumbrance_authority annotation**

Below each instrument row in the lifecycle (look for the `InstrumentRow` invocation), check `instrument.encumbrance_authority` and render:

```tsx
{instrument.encumbrance_authority && (
  <div className="mx-4 mb-3 p-3 rounded border border-amber-200 bg-amber-50 text-xs text-amber-900">
    <div className="flex items-start gap-2">
      <span className="font-medium whitespace-nowrap">Encumbrance authority:</span>
      <span>{instrument.encumbrance_authority.value}</span>
    </div>
    {instrument.encumbrance_authority.source_page && (
      <div className="mt-1 text-amber-700">
        Source: PDF page {instrument.encumbrance_authority.source_page}
        {instrument.encumbrance_authority.source_note ? ` — ${instrument.encumbrance_authority.source_note}` : ""}
      </div>
    )}
    <div className="mt-1">
      <ProvenanceTag provenance={instrument.encumbrance_authority.provenance} confidence={instrument.encumbrance_authority.confidence} />
    </div>
  </div>
)}
```

If `ProvenanceTag` does not accept those props directly, look at how it's invoked elsewhere in this file (line ~24 import) and match the calling convention.

- [ ] **Step 8.4: Manual UI smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/parcel/304-78-386/encumbrances`. Verify:
- `lc-004` and `lc-005` both render
- Each shows a "↔ lc-00X" chip in its header
- Clicking the chip scrolls to the other lifecycle card
- The Parcel 3 plat instrument inside lc-004 shows the amber Encumbrance Authority annotation citing Streetlight District + HOA
- The Master Plat instrument inside lc-005 shows its own amber Encumbrance Authority annotation
- Provenance tag visible on each annotation

Stop the dev server (Ctrl+C).

- [ ] **Step 8.5: Run full test suite**

```bash
npm test -- --run
```

Expected: green.

- [ ] **Step 8.6: Commit**

```bash
git add src/components/EncumbranceLifecycle.tsx
git commit -m "feat(ui): render cross-lifecycle links + encumbrance_authority annotations"
```

---

## Task 9: Update CLAUDE.md decision log + demo script

**Files:**
- Modify: `CLAUDE.md` (Decision Log table — append #39 and #40)
- Modify: `docs/demo-script.md` (Beat 7c expansion + provenance-ratio talking point)

- [ ] **Step 9.1: Append Decisions #39 and #40 to CLAUDE.md**

In the Decision Log table, after row #38, add:

```
| 39 | Tier 1-C: Tesseract not available in worktree, manual_entry replaces ocr | Tesseract is not on PATH in this worktree (no Phase-3 inheritance). Master plat (Book 553 P15) curated via public_api + manual_entry visual transcription. Each manual_entry field cites a source_page in the captured PDF. New instrument's provenance ratio is roughly 40/0/60 instead of the prototype's 29/47/24. The blended-corpus talking point in demo-script.md updated to reflect this. Honest in the record — visual transcription is a real curation posture. | 2026-04-14 |
| 40 | Tier 1-C: lc-005 / Seville Master Plat — encumbrance_authority pivot answers "where are the liens?" | The user-listed lien candidates (HOA assessment lien on neighbor lot, mechanics' lien, IRS federal tax lien) all hit Known Gap #2 — no name- or code-filtered search via public API. Pivoted (per sprint-owner direction extending Decision #38) to the Seville Master Plat at Book 553 Page 15, forward-referenced 4× in the Parcel 3 plat body. The master plat is added as lc-005 cross-linked to lc-004. Both plats now carry an encumbrance_authority annotation pointing to the recurring-lien-creating clauses (plat Note 8 — Streetlight Improvement District; dedication block — Seville Master HOA). The annotations answer the examiner's "where are the liens?" question by surfacing the upstream authority, while citing Known Gap #2 for why the downstream lien recordings themselves remain unreachable via the public API. Stronger demo than fabricating a lien. | 2026-04-14 |
```

- [ ] **Step 9.2: Update Beat 7c in demo-script.md**

Find Beat 7c (around line 138-164). After the existing paragraph about the hunt log, append a new sub-beat:

```markdown
- **Click:** scroll the Encumbrance panel to lifecycle `lc-005` (Seville Master Plat, Book 553 Page 15).
- **Shows:** `lc-005` card with status **released**, a "↔ lc-004" cross-link chip in its header, and beneath the master plat instrument row an amber annotation reading "Encumbrance authority: Master plat establishes the SEVILLE MASTER HOMEOWNERS ASSOCIATION as the dedicated maintenance authority over common-area tracts, which is the upstream authority that subsequent recurring HOA-assessment liens draw from..." Source: PDF page 1 — dedication block. Provenance: manual_entry (visual transcription).
- **Click:** scroll to the Parcel 3 plat row inside `lc-004`. Shows a parallel amber annotation citing plat Note 8 — "ALL PROPERTIES PLATTED HEREIN ARE SUBJECT TO AN ANNUAL STREET LIGHT IMPROVEMENT DISTRICT ASSESSMENT" — and the Seville Master HOA dedication.
- **Say:** "An examiner asks 'where are the liens on this property?' within thirty seconds of opening any chain. The honest answer is that recurring-assessment liens — Streetlight Improvement District annual charges, HOA assessments — bind every lot in this subdivision via two recorded plat instruments. The upstream authority is here, on the master plat and the resubdivision plat. The downstream recordings — the actual annual assessment notices — live in document classes the public API can't enumerate. Section 2 of the hunt log shows the exact failing queries. The county-internal index closes that gap. We surface the authority chain instead of fabricating a lien recording, and we cite the structural reason the downstream recordings aren't here. That's an honest answer an examiner will trust."
```

- [ ] **Step 9.3: Update the provenance-ratio talking point**

Find the existing provenance-ratio reference in `docs/demo-script.md` (likely Beat 8/9 or a sidebar). Replace any single-corpus-ratio claim ("22/35/18" or "29/47/24") with:

```markdown
Across the curated corpus, the county publishes about a third of the fields structurally, OCR recovers roughly half where available, and human curation fills the remainder — the exact mix shifts per document family. The original POPHAM 7-instrument family lands near 29/47/24 (public_api / ocr / manual_entry); the Tier 1-C plats curated via visual transcription land closer to 40/0/60 because Tesseract was not available in that worktree. Both ratios are honest and traceable in the JSON's `provenance_summary` per instrument.
```

- [ ] **Step 9.4: Commit**

```bash
git add CLAUDE.md docs/demo-script.md
git commit -m "docs: log Decisions #39-40 + extend Beat 7c with lc-005 + blended provenance ratio"
```

---

## Task 10: Final verification + code review

- [ ] **Step 10.1: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests green. Note total count vs. baseline 105.

- [ ] **Step 10.2: Run a typecheck if available**

```bash
npx tsc --noEmit
```

Expected: zero errors. If errors appear, they are likely in `src/types.ts` not matching schema additions — fix them.

- [ ] **Step 10.3: Smoke-test the demo flow in the dev server**

```bash
npm run dev
```

Step through Beats 1-2-7-7c manually:
- `http://localhost:5173/` → search `304-78-386` → POPHAM chain renders
- `http://localhost:5173/parcel/304-78-386/encumbrances` → lc-001, lc-002, lc-004, lc-005 all render
- Cross-link chips clickable
- Encumbrance authority annotations visible on Parcel 3 plat + Master plat
- `http://localhost:5173/instrument/<masterPlatRecordingNumber>` resolves to the POPHAM parcel and opens the Proof Drawer on the master plat

Stop dev server.

- [ ] **Step 10.4: Verification checkpoint — invoke superpowers:verification-before-completion**

Final pre-review checklist:
- npm test green (count + N new tests, 0 failures)
- npx tsc --noEmit zero errors
- All four routes from Step 10.3 work
- Master plat instrument JSON validates against schema
- Provenance counts match field counts (no inflation)
- No fabricated facts (every value traces to PDF or API response)
- Hunt log (data/raw/R-005/hunt-log.md) committed
- CLAUDE.md Decisions #39 + #40 present
- Demo script Beat 7c updated
- Cross-links lc-004 ↔ lc-005 work in both directions

- [ ] **Step 10.5: Invoke superpowers:requesting-code-review**

Request a review of the branch's full diff against master, asking the reviewer to specifically verify:
- Schema additions are backward-compatible (existing instruments still parse without modification)
- No fabricated recording numbers, party names, dates, or legal facts
- `encumbrance_authority` framing is technically defensible (the master plat is NOT a lien — calling it one would be wrong)
- The blended-provenance ratio talking point is honest and matches the JSON
- Cross-link UI does not create infinite-loop risks (lc-004 ↔ lc-005 ↔ lc-004…)

After review, address any blocking feedback. Then merge per superpowers:finishing-a-development-branch.

---

## Self-Review Checklist (for plan author — completed inline)

- [x] **Spec coverage:** Each piece of locked scope from the brainstorm thread maps to a task: bracket-scan (T1), capture (T2), schema (T3), curate (T4), Parcel 3 annotation (T5), lifecycle (T6), wiring (T7), UI (T8), docs (T9), verification (T10). Tesseract-unavailability handling appears in Decision #39 (T9) and in Task 4's `manual_entry` provenance.
- [x] **Placeholder scan:** The only `<recordingNumber>` placeholders are intentional — they hold the value Task 1 produces. Every other step has concrete code.
- [x] **Type consistency:** `EncumbranceLifecycle.related_lifecycles`, `Instrument.encumbrance_authority`, `FieldWithProvenance.source_page`, `FieldWithProvenance.source_note` — same names used in schema (T3), JSON fixtures (T4-T6), data-loader test (T7), UI render (T8), demo script (T9).
- [x] **Risk handling:** Bracket-scan miss → Task 1 Step 1.3 explicitly pivots to Candidate-C deferral + hunt-log-as-deliverable. No inventing a recording number.
