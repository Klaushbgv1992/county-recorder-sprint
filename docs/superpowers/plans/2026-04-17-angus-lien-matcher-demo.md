# ANGUS Lien + Live Matcher Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote ANGUS (APN 304-78-367, Lot 45, Seville Parcel 3) from cached-tier to curated-tier. Give it an open HOA-lien lifecycle and a DOT lifecycle whose release (if any) is discovered by the existing release-candidate matcher at render time. Surface a "Subdivision signals" tile on POPHAM's Encumbrance Lifecycle screen and amber-paint ANGUS on the encumbrance map overlay. Close the no-liens-in-corpus gap and the matcher-visible-discovery gap in one move.

**Architecture:** Data-first changes (parcels.json, instruments/*.json, lifecycles.json, data-loader.ts imports) land ANGUS in the corpus. A new `src/logic/subdivision-signals.ts` pure helper filters open lien-family lifecycles by subdivision. A new `SubdivisionSignalsCard` component renders the moat tile above the existing Swimlane inside `EncumbranceLifecycle.tsx`. The existing `EncumbranceOverlayLayer` splits into two Source/Layer pairs (deed-family blue, lien-family amber). Schema extensions: `ProvenanceKind` gains `demo_synthetic`; `PartyRole` gains `claimant`, `debtor`; `DocumentType` gains `hoa_lien`. The release-candidate matcher is not touched — ANGUS's lc-007 consumes existing `CandidateReleasesPanel` behavior by having no `links.json` entry.

**Tech Stack:** TypeScript 5.x, React 19, Vite 7, Zod 4, Vitest, Tailwind v4, react-map-gl (MapLibre), react-router v7.

**Spec:** `docs/superpowers/specs/2026-04-17-angus-lien-matcher-demo-design.md`

---

## File Structure

**Create:**
- `src/logic/subdivision-signals.ts` — pure helper: filter open lien-family lifecycles by subdivision
- `src/logic/subdivision-signals.test.ts` — unit tests for the filter
- `src/components/SubdivisionSignalsCard.tsx` — the moat tile component
- `src/components/SubdivisionSignalsCard.test.tsx` — render tests
- `src/data/instruments/20200620456.json` — ANGUS quit claim deed (promoted from cache)
- `src/data/instruments/20200620457.json` — ANGUS UWM deed of trust (promoted from cache)
- `src/data/instruments/<lien-recording-number>.json` — HOA lien (real from R-006 hunt, or synthetic)
- `src/data/instruments/<release-recording-number>.json` — release of UWM DOT (only if R-006 sub-hunt-2 lands)
- `src/data/narratives/304-78-367.json` — ANGUS narrative
- `data/raw/R-006/hunt-log.md` — R-006 hunt transcript (first-class demo asset)

**Modify:**
- `src/schemas.ts` — extend `ProvenanceKind`, `PartyRole`, `DocumentType` enums
- `src/logic/provenance-vocab.ts` — label for `demo_synthetic`
- `src/logic/format-provenance-tag.ts` — inline tag for `demo_synthetic`
- `src/logic/party-roles.ts` — add `getClaimants`, `getDebtors`
- `src/data/parcels.json` — add ANGUS parcel entry
- `src/data/lifecycles.json` — add lc-007 (DOT), lc-008 (lien)
- `src/data-loader.ts` — import new ANGUS instrument JSONs
- `src/components/EncumbranceLifecycle.tsx` — render `<SubdivisionSignalsCard />` above swimlane; accept cross-parcel data via props
- `src/components/ProofDrawer.tsx` — render amber banner when any field's provenance is `demo_synthetic`
- `src/components/map/EncumbranceOverlayLayer.tsx` — split into deed-family (blue) + lien-family (amber) Source/Layer pairs
- `src/router.tsx` — ensure ANGUS loader path resolves (verify only; data-loader already keys by APN)

**Do not modify:**
- `src/logic/release-candidate-matcher.ts` — already handles everything
- `src/components/CandidateReleasesPanel.tsx`, `LinkEvidenceBars.tsx`, `CandidateMatcherSlot.tsx` — already wired
- `src/data/links.json` — invariant: no curated link added for ANGUS lc-007 DOT→release pair
- `src/logic/chain-builder.ts`, `commitment-builder.ts` — ANGUS is a new parcel; these are parcel-scoped and must not regress

---

## Task 1: Extend Zod schemas + provenance vocab for liens and synthetic provenance

**Files:**
- Modify: `src/schemas.ts`
- Modify: `src/logic/provenance-vocab.ts`
- Modify: `src/logic/format-provenance-tag.ts`
- Test: `src/logic/format-provenance-tag.test.ts` (extend existing)

**Why all in one task:** `provenance-vocab.ts` and `format-provenance-tag.ts` both use exhaustive `never`-typed default cases on `ProvenanceKind`. Adding `demo_synthetic` to the enum without adding case handlers breaks the TypeScript build. This task keeps the build green by landing the handlers in the same commit as the enum widening.

- [ ] **Step 1: Add `demo_synthetic` to `ProvenanceKind`**

In `src/schemas.ts`, change:

```typescript
export const ProvenanceKind = z.enum([
  "public_api",
  "ocr",
  "manual_entry",
  "algorithmic",
]);
```

to:

```typescript
export const ProvenanceKind = z.enum([
  "public_api",
  "ocr",
  "manual_entry",
  "algorithmic",
  "demo_synthetic",
]);
```

- [ ] **Step 2: Add lien party roles to `PartyRole`**

Change:

```typescript
export const PartyRole = z.enum([
  "grantor",
  "grantee",
  "trustor",
  "trustee",
  "beneficiary",
  "borrower",
  "lender",
  "nominee",
  "releasing_party",
  "servicer",
]);
```

to:

```typescript
export const PartyRole = z.enum([
  "grantor",
  "grantee",
  "trustor",
  "trustee",
  "beneficiary",
  "borrower",
  "lender",
  "nominee",
  "releasing_party",
  "servicer",
  "claimant",
  "debtor",
]);
```

- [ ] **Step 3: Add `hoa_lien` to `DocumentType`**

Change the `DocumentType` enum to include `"hoa_lien"` between `"ucc_termination"` and `"affidavit_of_disclosure"`:

```typescript
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
  "ucc_termination",
  "hoa_lien",
  "affidavit_of_disclosure",
  "other",
]);
```

- [ ] **Step 4: Write failing test for the inline tag**

In `src/logic/format-provenance-tag.test.ts`, add a new case (match existing test style in that file):

```typescript
it("formats demo_synthetic inline tag", () => {
  expect(formatProvenanceTag("demo_synthetic", 1)).toBe("[demo-only]");
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
npm run test -- src/logic/format-provenance-tag.test.ts
```

Expected: FAIL — `demo_synthetic` hits the `never` default branch and throws "Unknown ProvenanceKind".

- [ ] **Step 6: Handle `demo_synthetic` in the inline tag formatter**

In `src/logic/format-provenance-tag.ts`, add the case before `default:`:

```typescript
case "demo_synthetic":
  return "[demo-only]";
```

- [ ] **Step 7: Handle `demo_synthetic` in the label**

In `src/logic/provenance-vocab.ts`, add the case before `default:`:

```typescript
case "demo_synthetic":
  return "Demo-only";
```

- [ ] **Step 8: Run typecheck + tests**

```bash
npm run build
npm run test -- --run
```

Expected: clean build, all tests pass (including the new `demo_synthetic` inline-tag test). Exhaustive-switch `never` checks pass in both `provenance-vocab.ts` and `format-provenance-tag.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/schemas.ts src/logic/provenance-vocab.ts src/logic/format-provenance-tag.ts src/logic/format-provenance-tag.test.ts
git commit -m "feat(schemas+vocab): add lien roles, hoa_lien doc type, demo_synthetic provenance"
```

---

## Task 2: Execute R-006 hunt (time-boxed 15 minutes)

**Files:**
- Create: `data/raw/R-006/hunt-log.md`

This task is research, not code. The outcome determines later task branches.

- [ ] **Step 1: Create hunt-log skeleton**

Create `data/raw/R-006/hunt-log.md`:

```markdown
# R-006 — ANGUS lien + release hunt

**Goal:** Locate (a) an HOA lien against ANGUS Lot 45 or Phoenix Vacation Houses, and (b) a release/reconveyance of 20200620457 (UWM DOT).
**Budget:** 15 minutes wall-clock, ~120 API calls total.
**Endpoint:** `https://publicapi.recorder.maricopa.gov/documents/{recordingNumber}`
**Started:** <TIMESTAMP>

## Sub-hunt 1 — ANGUS HOA lien (2021-09-01 to 2024-12-31)

Bracket-sample `/documents/{n}` across the range. Accept a hit only if `documentCodes` contains ASSOC LIEN / HOA LIEN / MECHL LIEN / LIEN / MED LIEN AND `names` include ANGUS, Phoenix Vacation Houses, or Seville Parcel 3 lot 45 references.

(Record every call, response code, and any hits below.)

## Sub-hunt 2 — Release of 20200620457 UWM DOT

Same window. Accept if `documentCodes` contains REL D/T / SUBST TR / ASSIGN D/T AND `names` include ANGUS, Phoenix Vacation Houses, or United Wholesale Mortgage.

## Sub-hunt 3 — Any Seville HOA lien precedent (Oct 2022–Oct 2024)

Backup evidence for fallback framing. Any SEVILLE HOMEOWNERS ASSOCIATION lien on any Seville Parcel 3 lot.

## Outcome

(Filled at hunt end.)
```

- [ ] **Step 2: Run the bracket-walk**

Using `curl` (or a small Node script), walk bracket-sampled recording numbers. Example probe:

```bash
curl -s "https://publicapi.recorder.maricopa.gov/documents/20230100000" | head -c 400
```

Record every call, doc codes, and names in the log. One second spacing between calls. Stop each sub-hunt at first useful hit or 40 calls, whichever comes first. Stop the whole hunt at 15 minutes wall-clock.

- [ ] **Step 3: Classify outcome**

Three possible states for each of sub-hunts 1, 2, 3:
- **HIT**: record full `/documents/{n}` JSON and PDF URL in the hunt log
- **MISS**: record the final probe count and the decisive failure reason

- [ ] **Step 4: Write outcome summary**

Fill in the `## Outcome` section of the hunt log. Note explicitly which of the following branches subsequent tasks follow:

- **Branch A** — sub-hunt 1 HIT (real lien): Task 4 uses the real lien instrument.
- **Branch B** — sub-hunt 1 MISS: Task 4 synthesizes the lien with `demo_synthetic` provenance.
- **Branch C** — sub-hunt 2 HIT: Task 5 adds the real release instrument; lc-007 status = `released` with `child_instruments: ["<release-number>"]`.
- **Branch D** — sub-hunt 2 MISS: per Spec R4 conservative default, lc-007 status = `open` with `child_instruments: []`, no release instrument added. Matcher renders empty-state moat note.

- [ ] **Step 5: Commit**

```bash
git add data/raw/R-006/hunt-log.md
git commit -m "research(R-006): ANGUS lien + release hunt log"
```

---

## Task 3: Promote ANGUS cached instruments to curated tier

**Files:**
- Create: `src/data/instruments/20200620456.json`
- Create: `src/data/instruments/20200620457.json`
- Modify: `src/data/parcels.json`
- Modify: `src/data-loader.ts`

- [ ] **Step 1: Create ANGUS quit claim instrument JSON**

Write `src/data/instruments/20200620456.json`:

```json
{
  "instrument_number": "20200620456",
  "recording_date": "2020-07-13",
  "document_type": "quit_claim_deed",
  "document_type_raw": "Q/CL DEED",
  "bundled_document_types": [],
  "parties": [
    {
      "name": "SCOTT J ANGUS",
      "role": "grantor",
      "provenance": "manual_entry",
      "confidence": 1
    },
    {
      "name": "PHOENIX VACATION HOUSES LLC",
      "role": "grantee",
      "provenance": "manual_entry",
      "confidence": 1
    }
  ],
  "legal_description": {
    "value": "Lot 45, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19; Affidavit of Correction recorded in Document No. 2001-0849180",
    "provenance": "manual_entry",
    "confidence": 0.9
  },
  "extracted_fields": {},
  "back_references": [],
  "same_day_group": ["20200620457"],
  "source_image_path": null,
  "page_count": 2,
  "raw_api_response": {
    "names": ["ANGUS SCOTT J", "PHOENIX VACATION HOUSES"],
    "documentCodes": ["Q/CL DEED"],
    "recordingDate": "7-13-2020",
    "recordingNumber": "20200620456",
    "pageAmount": 2,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": false,
    "affidavitPageAmount": 0,
    "restricted": false
  },
  "corpus_boundary_note": "County online records searched through 2026-04-09",
  "provenance_summary": {
    "public_api_count": 6,
    "ocr_count": 0,
    "manual_entry_count": 3
  }
}
```

- [ ] **Step 2: Create ANGUS UWM deed of trust instrument JSON**

Write `src/data/instruments/20200620457.json`:

```json
{
  "instrument_number": "20200620457",
  "recording_date": "2020-07-13",
  "document_type": "deed_of_trust",
  "document_type_raw": "DEED TRST",
  "bundled_document_types": [],
  "parties": [
    {
      "name": "SCOTT J ANGUS",
      "role": "trustor",
      "provenance": "manual_entry",
      "confidence": 1
    },
    {
      "name": "UNITED WHOLESALE MORTGAGE LLC",
      "role": "lender",
      "provenance": "manual_entry",
      "confidence": 1
    }
  ],
  "legal_description": {
    "value": "Lot 45, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19; Affidavit of Correction recorded in Document No. 2001-0849180",
    "provenance": "manual_entry",
    "confidence": 0.9
  },
  "extracted_fields": {
    "vesting_note": {
      "value": "Trustor is SCOTT J ANGUS; grantee on same-day quit claim (20200620456) is PHOENIX VACATION HOUSES LLC. Investor/STR acquisition pattern; examiner should confirm loan is on investment property, not owner-occupied.",
      "provenance": "manual_entry",
      "confidence": 0.9
    }
  },
  "back_references": [],
  "same_day_group": ["20200620456"],
  "source_image_path": null,
  "page_count": 19,
  "raw_api_response": {
    "names": ["ANGUS SCOTT J", "UNITED WHOLESALE MORTGAGE"],
    "documentCodes": ["DEED TRST"],
    "recordingDate": "7-13-2020",
    "recordingNumber": "20200620457",
    "pageAmount": 19,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": false,
    "affidavitPageAmount": 0,
    "restricted": false
  },
  "corpus_boundary_note": "County online records searched through 2026-04-09",
  "provenance_summary": {
    "public_api_count": 6,
    "ocr_count": 0,
    "manual_entry_count": 4
  }
}
```

- [ ] **Step 3: Add ANGUS to parcels.json**

Append to `src/data/parcels.json` (new entry after the existing 5 parcels):

```json
  ,
  {
    "apn": "304-78-367",
    "address": "3671 E Palmer St",
    "city": "Gilbert",
    "state": "AZ",
    "zip": "85298",
    "legal_description": "Lot 45, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19; Affidavit of Correction recorded in Document No. 2001-0849180",
    "current_owner": "PHOENIX VACATION HOUSES LLC",
    "type": "residential",
    "subdivision": "Seville Parcel 3",
    "assessor_url": "https://mcassessor.maricopa.gov/mcs/?q=30478367&mod=pd",
    "instrument_numbers": [
      "20200620456",
      "20200620457"
    ]
  }
```

Note: `instrument_numbers` will be extended in Task 4/5 to include the lien and (if Branch C) the release.

- [ ] **Step 4: Register new instruments in data-loader**

In `src/data-loader.ts`, add imports and append to `instrumentsRaw`:

```typescript
import inst20200620456 from "./data/instruments/20200620456.json";
import inst20200620457 from "./data/instruments/20200620457.json";
```

Append to the `instrumentsRaw` array:

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
  inst20070834753,
  inst20070834755,
  inst20130087108,
  inst20130087109,
  inst20200620456,
  inst20200620457,
];
```

- [ ] **Step 5: Verify by loading**

```bash
npm run test -- --run
npm run build
```

Expected: Zod parsing of parcels.json and instruments/*.json succeeds. All existing tests stay green.

- [ ] **Step 6: Commit**

```bash
git add src/data/parcels.json src/data/instruments/20200620456.json src/data/instruments/20200620457.json src/data-loader.ts
git commit -m "feat(data): promote ANGUS cached deed + DOT to curated tier"
```

---

## Task 4: Add ANGUS HOA lien instrument

**Files:**
- Create: `src/data/instruments/<lien-number>.json`
- Modify: `src/data/parcels.json` (append lien number to ANGUS `instrument_numbers`)
- Modify: `src/data-loader.ts` (import lien)

Follow **Branch A** if R-006 sub-hunt 1 hit, **Branch B** otherwise.

### Branch A — real lien

- [ ] **Step 1A: Create instrument JSON with real API data**

Use `<real-recording-number>.json`. Populate `raw_api_response` from the hunt JSON. `document_type: "hoa_lien"`, `document_type_raw: "ASSOC LIEN"` (or whatever code the API returned). Parties with `claimant` (HOA) and `debtor` (current owner at record time).

- [ ] **Step 2A: Download and save the PDF**

```bash
curl -s "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=<real-number>" \
  -o data/raw/R-006/pdfs/<real-number>.pdf
```

Set `source_image_path: "/raw/R-006/pdfs/<real-number>.pdf"` on the instrument.

- [ ] **Step 3A: OCR / visually transcribe extracted fields**

Minimum: `claim_amount`, `claim_period_start`, `claim_period_end`, `recording_date`. Tag each field per Decision #39 — `ocr` if a text layer exists, `manual_entry` if transcribed visually. Do not fabricate provenance.

### Branch B — synthetic lien

- [ ] **Step 1B: Create synthetic instrument JSON**

Pick a plausible recording number not used elsewhere (format: `202301xxxxxx` — e.g., `20230100000` if the hunt confirmed this range has a gap). Write `src/data/instruments/<synthetic-number>.json`:

```json
{
  "instrument_number": "20230100000",
  "recording_date": "2023-01-03",
  "document_type": "hoa_lien",
  "document_type_raw": "ASSOC LIEN",
  "bundled_document_types": [],
  "parties": [
    {
      "name": "SEVILLE HOMEOWNERS ASSOCIATION",
      "role": "claimant",
      "provenance": "demo_synthetic",
      "confidence": 1
    },
    {
      "name": "PHOENIX VACATION HOUSES LLC",
      "role": "debtor",
      "provenance": "demo_synthetic",
      "confidence": 1
    }
  ],
  "legal_description": {
    "value": "Lot 45, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19",
    "provenance": "demo_synthetic",
    "confidence": 1
  },
  "extracted_fields": {
    "claim_amount_cents": {
      "value": "418300",
      "provenance": "demo_synthetic",
      "confidence": 1
    },
    "claim_period_start": {
      "value": "2022-04-01",
      "provenance": "demo_synthetic",
      "confidence": 1
    },
    "claim_period_end": {
      "value": "2022-12-31",
      "provenance": "demo_synthetic",
      "confidence": 1
    },
    "source_note": {
      "value": "Illustrative — synthesized to demonstrate HOA-lien examiner workflow. Recorded lien hunt (R-006) did not locate a real Seville Parcel 3 HOA lien within the 15-minute budget against publicapi.recorder.maricopa.gov. The API does not support documentCode-filtered or name-filtered search (Known Gap #2). See data/raw/R-006/hunt-log.md. Pattern grounded in the investor/short-term-rental ownership profile of ANGUS Lot 45 (same-day quit claim 20200620456 from SCOTT J ANGUS to PHOENIX VACATION HOUSES LLC).",
      "provenance": "demo_synthetic",
      "confidence": 1
    }
  },
  "back_references": [],
  "same_day_group": [],
  "source_image_path": null,
  "page_count": 2,
  "raw_api_response": {
    "names": ["SEVILLE HOMEOWNERS ASSOCIATION", "PHOENIX VACATION HOUSES LLC"],
    "documentCodes": ["ASSOC LIEN"],
    "recordingDate": "1-3-2023",
    "recordingNumber": "20230100000",
    "pageAmount": 2,
    "docketBook": 0,
    "pageMap": 0,
    "affidavitPresent": false,
    "affidavitPageAmount": 0,
    "restricted": false
  },
  "corpus_boundary_note": "County online records searched through 2026-04-09",
  "provenance_summary": {
    "public_api_count": 0,
    "ocr_count": 0,
    "manual_entry_count": 0
  }
}
```

If sub-hunt 3 landed a precedent, append a sentence to `source_note` referencing the real-lien pattern found on a neighboring lot (e.g., *"Pattern precedent: SEVILLE HOMEOWNERS ASSOCIATION recorded ASSOC LIEN <n> against Lot <m> on <date> — real record confirms the pattern this synthesis demonstrates."*).

### Both branches

- [ ] **Step 2: Append lien number to ANGUS `instrument_numbers`**

In `src/data/parcels.json`, extend ANGUS's entry:

```json
"instrument_numbers": [
  "20200620456",
  "20200620457",
  "<lien-number>"
]
```

- [ ] **Step 3: Register lien in data-loader**

In `src/data-loader.ts`:

```typescript
import inst<lien-number> from "./data/instruments/<lien-number>.json";
```

Append to `instrumentsRaw` array.

- [ ] **Step 4: Verify**

```bash
npm run test -- --run
npm run build
```

Expected: Zod parse succeeds with the new `claimant`/`debtor`/`hoa_lien`/`demo_synthetic` values.

- [ ] **Step 5: Commit**

```bash
git add src/data/instruments/<lien-number>.json src/data/parcels.json src/data-loader.ts
git commit -m "feat(data): add ANGUS HOA lien instrument (<real|synthetic>)"
```

---

## Task 5: Add ANGUS lifecycles and (conditional) release instrument

**Files:**
- Modify: `src/data/lifecycles.json`
- Conditionally create: `src/data/instruments/<release-number>.json`
- Conditionally modify: `src/data/parcels.json`, `src/data-loader.ts`

Follow **Branch C** if R-006 sub-hunt 2 hit, **Branch D** otherwise.

### Branch C — real release

- [ ] **Step 1C: Create release instrument JSON**

Using the real recording number. `document_type: "full_reconveyance"`, `document_type_raw: "REL D/T"` (or whatever API returned). Parties with `releasing_party` role. Download PDF under `data/raw/R-006/pdfs/`.

- [ ] **Step 2C: Register release in data-loader + parcels.json**

Import in `data-loader.ts`; append recording number to ANGUS `instrument_numbers` in `parcels.json`.

- [ ] **Step 3C: Add lc-007 with released status**

In `src/data/lifecycles.json`, append to `lifecycles` array:

```json
,
{
  "id": "lc-007",
  "root_instrument": "20200620457",
  "child_instruments": ["<release-number>"],
  "status": "released",
  "status_rationale": "Release discovered by release-candidate matcher (not curator-curated). See live feature bars on Encumbrance Lifecycle Panel.",
  "examiner_override": null
}
```

**Critical invariant:** Do **not** add an entry to `src/data/links.json` for the DOT→release pair. The matcher must be the sole source of the linkage shown in the UI. The `status: "released"` is the lifecycle-level status; the inline link is what the matcher renders.

### Branch D — no release

- [ ] **Step 1D: Add lc-007 with open status**

In `src/data/lifecycles.json`, append to `lifecycles` array:

```json
,
{
  "id": "lc-007",
  "root_instrument": "20200620457",
  "child_instruments": [],
  "status": "open",
  "status_rationale": "No release, substitution of trustee, or assignment located in the searched corpus for ANGUS 2020 UWM DOT. R-006 sub-hunt 2 ran 40 probes against publicapi.recorder.maricopa.gov without a hit. Matcher renders its cross-parcel empty-state moat note — the public API cannot search for releases filed against PHOENIX VACATION HOUSES LLC outside this parcel.",
  "examiner_override": null
}
```

### Both branches

- [ ] **Step 2: Add lc-008 (HOA lien) to lifecycles.json**

Append to the `lifecycles` array:

```json
,
{
  "id": "lc-008",
  "root_instrument": "<lien-number-from-task-4>",
  "child_instruments": [],
  "status": "open",
  "status_rationale": "Active HOA lien recorded by Seville Homeowners Association against Lot 45 (Phoenix Vacation Houses LLC). No release, withdrawal, or payoff recorded in corpus.",
  "examiner_override": null
}
```

- [ ] **Step 3: Verify**

```bash
npm run test -- --run
npm run build
```

Expected: `LifecyclesFile` schema parses all lifecycles including lc-007 and lc-008.

- [ ] **Step 4: Commit**

```bash
git add src/data/lifecycles.json [branch-C additions if applicable]
git commit -m "feat(data): add ANGUS lc-007 DOT lifecycle + lc-008 HOA lien lifecycle"
```

---

## Task 6: Add ANGUS narrative

**Files:**
- Create: `src/data/narratives/304-78-367.json`

- [ ] **Step 1: Inspect an existing narrative to copy shape**

Read `src/data/narratives/304-78-386.json` (POPHAM) to see the exact field shape.

```bash
cat src/data/narratives/304-78-386.json
```

- [ ] **Step 2: Write ANGUS narrative**

Create `src/data/narratives/304-78-367.json` with the same top-level keys. Example content:

```json
{
  "hero_override": "ANGUS — Lot 45, POPHAM's literal next-door neighbor. Investor-owned after a 2020 same-day quit claim from Scott J. Angus to Phoenix Vacation Houses LLC (short-term rental pattern). United Wholesale Mortgage DOT recorded the same day (20200620457). Open HOA lien flags a subdivision-wide credit signal your name-indexed title plant cannot surface.",
  "callouts": {
    "20200620456": "Same-day quit claim to the LLC — investor / STR acquisition pattern.",
    "20200620457": "UWM DOT recorded same day. Matcher ran against the parcel corpus to discover any release.",
    "<lien-number>": "Active HOA lien — subdivision-wide signal (not on POPHAM's lot)."
  },
  "what_this_means": "Title plants index by party name and assemble chains from name-matches. A county portal that indexes spatially (by APN and subdivision) can show you that POPHAM's neighbor has an open HOA lien — a data point plant customers pay to miss.",
  "moat_note": "The API behind this screen surfaced the HOA lien by lot, not by name. Name-indexed competitors cannot. See data/raw/R-006/hunt-log.md for the hunt that proved the API's search gap."
}
```

If Branch D (no release), append to `what_this_means`: *"No release was found for the 2020 UWM DOT — the matcher's empty-state note on this lifecycle demonstrates exactly the cross-parcel search gap the API leaves open for competitors."*

- [ ] **Step 3: Verify narrative loads**

If a narrative schema exists, run `npm run test` to verify parse. Otherwise run `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add src/data/narratives/304-78-367.json
git commit -m "feat(data): ANGUS parcel narrative"
```

---

## Task 7: Extend party-roles helpers for lien roles

**Files:**
- Modify: `src/logic/party-roles.ts`
- Test: `src/logic/party-roles.test.ts`

- [ ] **Step 1: Write failing tests**

Create or extend `src/logic/party-roles.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { Instrument } from "../types";
import { getClaimants, getDebtors } from "./party-roles";

const lien: Instrument = {
  instrument_number: "20230100000",
  recording_date: "2023-01-03",
  document_type: "hoa_lien",
  document_type_raw: "ASSOC LIEN",
  bundled_document_types: [],
  parties: [
    { name: "SEVILLE HOMEOWNERS ASSOCIATION", role: "claimant", provenance: "demo_synthetic", confidence: 1 },
    { name: "PHOENIX VACATION HOUSES LLC", role: "debtor", provenance: "demo_synthetic", confidence: 1 },
  ],
  extracted_fields: {},
  back_references: [],
  source_image_path: null,
  page_count: 2,
  raw_api_response: {
    names: [], documentCodes: ["ASSOC LIEN"], recordingDate: "1-3-2023",
    recordingNumber: "20230100000", pageAmount: 2, docketBook: 0, pageMap: 0,
    affidavitPresent: false, affidavitPageAmount: 0, restricted: false,
  },
  corpus_boundary_note: "test",
};

describe("party-roles lien helpers", () => {
  it("getClaimants returns claimant names", () => {
    expect(getClaimants(lien)).toEqual(["SEVILLE HOMEOWNERS ASSOCIATION"]);
  });
  it("getDebtors returns debtor names", () => {
    expect(getDebtors(lien)).toEqual(["PHOENIX VACATION HOUSES LLC"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/logic/party-roles.test.ts
```

Expected: FAIL — `getClaimants` and `getDebtors` not exported.

- [ ] **Step 3: Add the helpers**

In `src/logic/party-roles.ts`, append:

```typescript
export function getClaimants(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "claimant");
}

export function getDebtors(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "debtor");
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- --run
```

Expected: new tests PASS; all existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/logic/party-roles.ts src/logic/party-roles.test.ts
git commit -m "feat(party-roles): add getClaimants + getDebtors lien-family helpers"
```

---

## Task 8: Create `subdivision-signals` logic module

**Files:**
- Create: `src/logic/subdivision-signals.ts`
- Create: `src/logic/subdivision-signals.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/logic/subdivision-signals.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { Parcel, Instrument, EncumbranceLifecycle } from "../types";
import { getOpenLiensInSubdivision } from "./subdivision-signals";

function parcel(apn: string, subdivision: string, owner: string, lot: string | null = null): Parcel {
  return {
    apn,
    address: "test",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: lot ? `Lot ${lot}, ${subdivision}` : subdivision,
    current_owner: owner,
    subdivision,
    instrument_numbers: [],
  };
}

function lien(instrumentNumber: string): Instrument {
  return {
    instrument_number: instrumentNumber,
    recording_date: "2023-01-03",
    document_type: "hoa_lien",
    document_type_raw: "ASSOC LIEN",
    bundled_document_types: [],
    parties: [],
    extracted_fields: {},
    back_references: [],
    source_image_path: null,
    page_count: 2,
    raw_api_response: {
      names: [], documentCodes: ["ASSOC LIEN"], recordingDate: "1-3-2023",
      recordingNumber: instrumentNumber, pageAmount: 2, docketBook: 0, pageMap: 0,
      affidavitPresent: false, affidavitPageAmount: 0, restricted: false,
    },
    corpus_boundary_note: "test",
  };
}

function deed(instrumentNumber: string): Instrument {
  return { ...lien(instrumentNumber), document_type: "warranty_deed", document_type_raw: "WAR DEED" };
}

function lc(id: string, root: string, status: "open" | "released"): EncumbranceLifecycle {
  return { id, root_instrument: root, child_instruments: [], status, status_rationale: "", examiner_override: null };
}

describe("getOpenLiensInSubdivision", () => {
  const parcels = [
    parcel("304-78-386", "Seville Parcel 3", "POPHAM", "46"),
    parcel("304-78-367", "Seville Parcel 3", "PHOENIX VACATION HOUSES LLC", "45"),
    parcel("304-77-689", "Shamrock Estates Phase 2A", "HOGUE", "348"),
  ];
  parcels[1].instrument_numbers = ["lien-1"];
  parcels[0].instrument_numbers = ["deed-1"];
  parcels[2].instrument_numbers = ["lien-other-subdivision"];

  it("returns liens in same subdivision excluding the current parcel", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      parcels,
      [lc("lc-a", "lien-1", "open"), lc("lc-b", "deed-1", "open")],
      [lien("lien-1"), deed("deed-1")],
    );
    expect(result).toHaveLength(1);
    expect(result[0].apn).toBe("304-78-367");
    expect(result[0].documentType).toBe("hoa_lien");
    expect(result[0].lifecycleId).toBe("lc-a");
  });

  it("excludes released lifecycles", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      parcels,
      [lc("lc-a", "lien-1", "released")],
      [lien("lien-1")],
    );
    expect(result).toEqual([]);
  });

  it("excludes the current parcel even if it has an open lien", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-367",
      parcels,
      [lc("lc-a", "lien-1", "open")],
      [lien("lien-1")],
    );
    expect(result).toEqual([]);
  });

  it("excludes liens from other subdivisions", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      parcels,
      [lc("lc-x", "lien-other-subdivision", "open")],
      [lien("lien-other-subdivision")],
    );
    expect(result).toEqual([]);
  });

  it("excludes non-lien-family document types", () => {
    const result = getOpenLiensInSubdivision(
      "Seville Parcel 3",
      "304-78-386",
      parcels,
      [lc("lc-b", "deed-1", "open")],
      [deed("deed-1")],
    );
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/logic/subdivision-signals.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the module**

Create `src/logic/subdivision-signals.ts`:

```typescript
import type {
  Parcel,
  Instrument,
  EncumbranceLifecycle,
  DocumentType,
} from "../types";

const LIEN_DOCUMENT_TYPES: ReadonlySet<DocumentType> = new Set([
  "hoa_lien",
]);

export interface LienSignal {
  apn: string;
  currentOwner: string;
  subdivision: string;
  documentType: DocumentType;
  lifecycleId: string;
  instrumentNumber: string;
}

export function getOpenLiensInSubdivision(
  subdivision: string,
  excludeApn: string,
  parcels: Parcel[],
  lifecycles: EncumbranceLifecycle[],
  instruments: Instrument[],
): LienSignal[] {
  const instrumentByNumber = new Map(
    instruments.map((i) => [i.instrument_number, i]),
  );
  const parcelByInstrument = new Map<string, Parcel>();
  for (const p of parcels) {
    for (const n of p.instrument_numbers ?? []) {
      parcelByInstrument.set(n, p);
    }
  }

  const out: LienSignal[] = [];
  for (const lc of lifecycles) {
    if (lc.status !== "open") continue;
    const instrument = instrumentByNumber.get(lc.root_instrument);
    if (!instrument) continue;
    if (!LIEN_DOCUMENT_TYPES.has(instrument.document_type)) continue;
    const parcel = parcelByInstrument.get(lc.root_instrument);
    if (!parcel) continue;
    if (parcel.subdivision !== subdivision) continue;
    if (parcel.apn === excludeApn) continue;
    out.push({
      apn: parcel.apn,
      currentOwner: parcel.current_owner,
      subdivision: parcel.subdivision,
      documentType: instrument.document_type,
      lifecycleId: lc.id,
      instrumentNumber: instrument.instrument_number,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/logic/subdivision-signals.test.ts
```

Expected: all 5 cases PASS.

- [ ] **Step 5: Full test + build**

```bash
npm run test -- --run
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/logic/subdivision-signals.ts src/logic/subdivision-signals.test.ts
git commit -m "feat(logic): subdivision-signals module for cross-parcel lien surfaces"
```

---

## Task 9: Add ProofDrawer amber banner for `demo_synthetic`

**Files:**
- Modify: `src/components/ProofDrawer.tsx`
- Test: add tests to an existing ProofDrawer test file if one exists, otherwise verify via walkthrough

- [ ] **Step 1: Read current ProofDrawer to find the insertion point**

```bash
head -80 src/components/ProofDrawer.tsx
```

Identify the top-of-drawer render block where the instrument title/number renders. The banner goes immediately above or below the title, before fields render.

- [ ] **Step 2: Add synthetic-detection helper + banner render**

Define this near the top of `ProofDrawer.tsx` (or extract to a small util if you prefer; inline is fine for one use):

```typescript
function instrumentHasSyntheticField(instrument: Instrument): boolean {
  if (instrument.legal_description?.provenance === "demo_synthetic") return true;
  for (const p of instrument.parties) {
    if (p.provenance === "demo_synthetic") return true;
  }
  for (const f of Object.values(instrument.extracted_fields)) {
    if (f.provenance === "demo_synthetic") return true;
  }
  return false;
}
```

Inside the drawer body, render:

```tsx
{instrumentHasSyntheticField(instrument) && (
  <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
    <strong>Demo-only synthesized record.</strong> Not a real recorded instrument.
    See <code>source_note</code> field for the R-006 sub-hunt that failed to locate a real instance.
  </div>
)}
```

- [ ] **Step 3: Verify build + typecheck**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 4: Verify visually (deferred to Task 12 walkthrough)**

Noted for Task 12.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProofDrawer.tsx
git commit -m "feat(proof-drawer): amber banner for demo_synthetic instruments"
```

---

## Task 10: Create `SubdivisionSignalsCard` + wire into `EncumbranceLifecycle`

**Files:**
- Create: `src/components/SubdivisionSignalsCard.tsx`
- Create: `src/components/SubdivisionSignalsCard.test.tsx`
- Modify: `src/components/EncumbranceLifecycle.tsx`
- Modify: `src/router.tsx` (pass cross-parcel data to EncumbranceLifecycle)

- [ ] **Step 1: Write failing component test**

Create `src/components/SubdivisionSignalsCard.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SubdivisionSignalsCard } from "./SubdivisionSignalsCard";
import type { LienSignal } from "../logic/subdivision-signals";

describe("SubdivisionSignalsCard", () => {
  it("renders nothing when signals is empty", () => {
    const { container } = render(
      <MemoryRouter>
        <SubdivisionSignalsCard signals={[]} subdivision="Seville Parcel 3" />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders tile with link to neighbor parcel when 1 signal", () => {
    const signals: LienSignal[] = [
      {
        apn: "304-78-367",
        currentOwner: "PHOENIX VACATION HOUSES LLC",
        subdivision: "Seville Parcel 3",
        documentType: "hoa_lien",
        lifecycleId: "lc-008",
        instrumentNumber: "20230100000",
      },
    ];
    render(
      <MemoryRouter>
        <SubdivisionSignalsCard signals={signals} subdivision="Seville Parcel 3" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Subdivision signals/i)).toBeInTheDocument();
    expect(screen.getByText(/1 active HOA lien/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view lot/i });
    expect(link.getAttribute("href")).toBe("/parcel/304-78-367/encumbrances");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/SubdivisionSignalsCard.test.tsx
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/SubdivisionSignalsCard.tsx`:

```tsx
import { Link } from "react-router";
import type { LienSignal } from "../logic/subdivision-signals";

interface Props {
  signals: LienSignal[];
  subdivision: string;
}

export function SubdivisionSignalsCard({ signals, subdivision }: Props) {
  if (signals.length === 0) return null;

  const count = signals.length;
  const first = signals[0];

  return (
    <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Subdivision signals
          </div>
          <p className="mt-1 text-sm text-amber-950">
            <strong>
              {count} active HOA lien{count === 1 ? "" : "s"} in {subdivision}
            </strong>
            {count === 1 && (
              <>
                {" "}— Lot from APN {first.apn} ({first.currentOwner}).
              </>
            )}{" "}
            <span className="text-amber-800">Not on this parcel.</span>
          </p>
          <p className="mt-1 text-xs text-amber-800">
            The public recorder API surfaces this by walking lot-by-lot.
            Name-indexed title plants cannot reconstruct subdivision-wide
            encumbrance density.
          </p>
        </div>
        <Link
          to={`/parcel/${first.apn}/encumbrances`}
          className="shrink-0 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
        >
          View Lot →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify tests pass**

```bash
npm run test -- src/components/SubdivisionSignalsCard.test.tsx
```

Expected: both cases PASS.

- [ ] **Step 5: Wire into `EncumbranceLifecycle`**

Open `src/components/EncumbranceLifecycle.tsx`. Add two new optional props and render the card above `SwimlaneDiagram`:

Change the `Props` interface to add:

```typescript
  allParcels?: Parcel[];
  allLifecycles?: LifecycleType[];
  allInstruments?: Instrument[];
```

At the top of the component body, compute signals:

```typescript
import { getOpenLiensInSubdivision } from "../logic/subdivision-signals";
import { SubdivisionSignalsCard } from "./SubdivisionSignalsCard";
```

```typescript
  const signals = allParcels && allLifecycles && allInstruments
    ? getOpenLiensInSubdivision(
        parcel.subdivision,
        parcel.apn,
        allParcels,
        allLifecycles,
        allInstruments,
      )
    : [];
```

Render `<SubdivisionSignalsCard signals={signals} subdivision={parcel.subdivision} />` immediately after `<MoatBanner />` and before `<SwimlaneDiagram />`.

- [ ] **Step 6: Pass cross-parcel data from the router/loader**

Read `src/router.tsx` around the Encumbrance route. Wherever `<EncumbranceLifecycle>` is mounted, extend the data-loader call site to also load all parcels / all lifecycles / all instruments and pass them as props.

If the existing loader only returns scoped data, call these additional loaders:
- `loadAllParcels()` (already exported from data-loader)
- `loadAllInstruments()` (already exported)
- For all lifecycles, expose a new tiny helper in `data-loader.ts`:

```typescript
export function loadAllLifecycles(): EncumbranceLifecycle[] {
  return LifecyclesFile.parse(lifecyclesRaw).lifecycles;
}
```

Pass these three into `<EncumbranceLifecycle>` as `allParcels`, `allLifecycles`, `allInstruments`.

- [ ] **Step 7: Run tests + build**

```bash
npm run test -- --run
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/components/SubdivisionSignalsCard.tsx src/components/SubdivisionSignalsCard.test.tsx src/components/EncumbranceLifecycle.tsx src/router.tsx src/data-loader.ts
git commit -m "feat(ui): SubdivisionSignalsCard — moat tile on EncumbranceLifecycle"
```

---

## Task 11: Split encumbrance overlay into deed-family + lien-family layers

**Files:**
- Modify: `src/components/map/EncumbranceOverlayLayer.tsx`

- [ ] **Step 1: Read current overlay layer**

Read `src/components/map/EncumbranceOverlayLayer.tsx` in full — its props, how it computes `openApns`, which data it already has access to.

- [ ] **Step 2: Extend `Lifecycle` input type and props to carry document type**

Change:

```typescript
interface Lifecycle {
  id: string;
  root_instrument: string;
  status: string;
}
```

to:

```typescript
interface Lifecycle {
  id: string;
  root_instrument: string;
  status: string;
  root_document_type: "hoa_lien" | "other";
}
```

Callers currently pass `{id, root_instrument, status}` — now they must also pass the document type of the root instrument. The caller has access to instruments, so resolve at call time.

- [ ] **Step 3: Split features into two lists**

Replace the computation of `features` with two sets:

```typescript
const openLienApns = new Set<string>();
const openDeedApns = new Set<string>();
for (const lc of lifecycles) {
  if (lc.status !== "open") continue;
  const apn = instrumentToApn.get(lc.root_instrument);
  if (!apn) continue;
  if (lc.root_document_type === "hoa_lien") openLienApns.add(apn);
  else openDeedApns.add(apn);
}

const allFeatures = parcelsGeo.features as GeoJSON.Feature[];
const lienFeatures = allFeatures.filter((f) => {
  const apn = (f.properties as { APN_DASH?: string } | null)?.APN_DASH;
  return apn && openLienApns.has(apn);
});
const deedFeatures = allFeatures.filter((f) => {
  const apn = (f.properties as { APN_DASH?: string } | null)?.APN_DASH;
  return apn && openDeedApns.has(apn);
});

if (lienFeatures.length === 0 && deedFeatures.length === 0) return null;
```

- [ ] **Step 4: Render two Source/Layer pairs**

```tsx
return (
  <>
    {deedFeatures.length > 0 && (
      <Source id="overlay-encumbrance-deed" type="geojson" data={{ type: "FeatureCollection", features: deedFeatures }}>
        <Layer id="overlay-encumbrance-deed-fill" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.5 }} />
        <Layer id="overlay-encumbrance-deed-outline" type="line" paint={{ "line-color": "#1d4ed8", "line-width": 2 }} />
      </Source>
    )}
    {lienFeatures.length > 0 && (
      <Source id="overlay-encumbrance-lien" type="geojson" data={{ type: "FeatureCollection", features: lienFeatures }}>
        <Layer id="overlay-encumbrance-lien-fill" type="fill" paint={{ "fill-color": "#f59e0b", "fill-opacity": 0.55 }} />
        <Layer id="overlay-encumbrance-lien-outline" type="line" paint={{ "line-color": "#b45309", "line-width": 2 }} />
      </Source>
    )}
  </>
);
```

- [ ] **Step 5: Update the caller to include document type**

Find `EncumbranceOverlayLayer` usage in the repo:

```bash
```

(run via Grep tool, not bash):

Grep for `EncumbranceOverlayLayer` in `src/`. It is passed `lifecycles={...}` — the caller is likely `CountyMap.tsx` or `LandingPage.tsx`. Extend the caller to compute `root_document_type` per lifecycle by looking up the root instrument:

```typescript
const instrumentByNumber = new Map(allInstruments.map((i) => [i.instrument_number, i]));
const lifecyclesForOverlay = allLifecycles.map((lc) => ({
  id: lc.id,
  root_instrument: lc.root_instrument,
  status: lc.status,
  root_document_type: instrumentByNumber.get(lc.root_instrument)?.document_type === "hoa_lien"
    ? ("hoa_lien" as const)
    : ("other" as const),
}));
```

Pass `lifecyclesForOverlay` to `<EncumbranceOverlayLayer>`.

- [ ] **Step 6: Verify tests + build**

```bash
npm run test -- --run
npm run build
npm run lint
```

Expected: clean. Existing POPHAM/HOGUE overlay paints stay blue. ANGUS (with lc-008 open lien) now paints amber.

- [ ] **Step 7: Commit**

```bash
git add src/components/map/EncumbranceOverlayLayer.tsx [caller file]
git commit -m "feat(map): amber lien layer alongside deed-family blue layer"
```

---

## Task 12: End-to-end walkthrough + regression test

**Files:**
- Modify: `src/logic/release-candidate-matcher.test.ts` (add ANGUS-specific case)

- [ ] **Step 1: Add matcher regression test**

In `src/logic/release-candidate-matcher.test.ts`, append (adapt imports/fixtures to match existing test patterns in the file):

**Branch C (real release was found in Task 5):**

```typescript
it("ANGUS lc-007 produces a matcher-discovered candidate with no curated link", () => {
  // Load ANGUS data through the real loader to exercise the full path.
  const data = loadParcelDataByApn("304-78-367");
  const dot = data.instruments.find((i) => i.instrument_number === "20200620457")!;
  const pool = data.instruments.filter(
    (i) => i.document_type === "full_reconveyance" || i.document_type === "partial_reconveyance",
  );
  const result = buildCandidateRows({
    lifecycleId: "lc-007",
    dot,
    pool,
    releaseLinks: data.links.filter((l) => l.link_type === "release_of"),
    lifecycles: data.lifecycles,
    candidateActions: {},
  });
  expect(result.rows.length).toBeGreaterThan(0);
  expect(result.rows[0].alreadyLinkedTo).toBeNull();
  expect(result.rows[0].canAccept).toBe(true);
  expect(result.rows[0].score).toBeGreaterThanOrEqual(0.25);
});
```

**Branch D (no release):**

```typescript
it("ANGUS lc-007 renders empty-state moat note when no release in corpus", () => {
  const data = loadParcelDataByApn("304-78-367");
  const dot = data.instruments.find((i) => i.instrument_number === "20200620457")!;
  const pool = data.instruments.filter(
    (i) => i.document_type === "full_reconveyance" || i.document_type === "partial_reconveyance",
  );
  const result = buildCandidateRows({
    lifecycleId: "lc-007",
    dot,
    pool,
    releaseLinks: [],
    lifecycles: data.lifecycles,
    candidateActions: {},
  });
  expect(result.total).toBe(0);
  expect(result.rows).toEqual([]);
});
```

- [ ] **Step 2: Run the test**

```bash
npm run test -- src/logic/release-candidate-matcher.test.ts
```

Expected: PASS (matches the active hunt branch).

- [ ] **Step 3: Run full test + lint + build**

```bash
npm run test -- --run
npm run lint
npm run build
```

Expected: full green.

- [ ] **Step 4: Start dev server + walkthrough in browser**

```bash
npm run dev
```

Open the listed localhost URL. Exercise each surface:

1. `/parcel/304-78-386/encumbrances` — **POPHAM view**. Verify the `Subdivision signals` amber tile renders above the swimlane, shows "1 active HOA lien in Seville Parcel 3", links to `/parcel/304-78-367/encumbrances`. Existing POPHAM lifecycles (lc-001, lc-002, lc-004) unchanged.
2. `/parcel/304-78-367/encumbrances` — **ANGUS view**. Verify lc-007 (UWM DOT) renders. Under Branch C, the CandidateReleasesPanel shows a live scorer row with visible feature bars (party-name-match, date-proximity, legal-description-match), score badge, Accept/Reject buttons, `Already linked to` badge absent. Under Branch D, the panel shows the "Cross-parcel scan" empty-state moat note. Verify lc-008 (HOA lien) renders with the lien instrument visible, `open` status badge.
3. Open any ANGUS lien instrument in the Proof Drawer — if Branch B, verify the amber "Demo-only synthesized record" banner renders at top.
4. **Landing page map**. With the encumbrance overlay on, verify ANGUS polygon paints **amber** (distinct from other open-DOT parcels painted blue). POPHAM / HOGUE / WARNER / LOWRY paint colors unchanged from before this feature.

Take one screenshot of each surface and save under `docs/screenshots/2026-04-17-angus-demo/` (create dir if missing):

```bash
mkdir -p docs/screenshots/2026-04-17-angus-demo
```

- [ ] **Step 5: Commit final screenshots + test**

```bash
git add src/logic/release-candidate-matcher.test.ts docs/screenshots/2026-04-17-angus-demo/
git commit -m "test(matcher): ANGUS lc-007 regression + walkthrough screenshots"
```

---

## Post-Implementation Checklist

- [ ] All tests green (`npm run test`)
- [ ] Lint clean (`npm run lint`)
- [ ] Build clean (`npm run build`)
- [ ] Hunt log committed (`data/raw/R-006/hunt-log.md`)
- [ ] Spec's R1-R6 risks reviewed — no unintentional regression on POPHAM/HOGUE/WARNER/LOWRY paint colors or lifecycles
- [ ] `src/data/links.json` unchanged for the ANGUS DOT→release pair (Decision #41 preserved)
- [ ] CLAUDE.md Decision #46 added capturing the ANGUS promotion, branch outcome (A/B, C/D), and R-006 hunt-log location

## Self-review notes

- Every instrument JSON in Task 3/4/5 conforms to the `Instrument` Zod schema as it exists after Task 1 (enum widenings).
- The `demo_synthetic` provenance threads through: schema + vocab/tag handlers (Task 1, same commit) → Proof Drawer banner (Task 9). No surface renders it without Task 9 awareness.
- `getClaimants`/`getDebtors` (Task 7) are added but not strictly required by the existing `CandidateReleasesPanel` — they're added for completeness so `getReleasingParties()` is not the only way to render lien-instrument parties. Future lien-specific UI can use them.
- `subdivision-signals` (Task 8) is pure and fully unit-tested before any UI consumes it.
- `SubdivisionSignalsCard` (Task 10) renders nothing on a parcel with no subdivision peers (HOGUE is in "Shamrock Estates Phase 2A" — no peers in corpus, so no tile there — intentional).
- The overlay split (Task 11) is additive: features array is partitioned, never reduced. No existing parcel paint color changes.
- The Branch C/D conditional in Task 5 + Task 12 is the only live decision point. Both branches produce a shippable demo; Branch C is stronger because the matcher visibly discovers a link, Branch D preserves corpus integrity.
