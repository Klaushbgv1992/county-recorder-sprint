# Post-Demo Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land four demo-feedback items across two PRs: (1) corpus pathologies for WARNER/LOWRY/PHOENIX, (2) plain-English anomaly bodies via the narrative engine, (3) build-time AI summary bake, (4) search hero with entity-type badges.

**Architecture:** Two independent work paths. **Chain 1** = A→C→D serial (data → rendering → LLM bake) for PR 2. **Chain 2** = B (search hero) for PR 1. Two outer agents, two PRs. Spec: `docs/superpowers/specs/2026-04-17-post-demo-polish-design.md`.

**Tech Stack:** React 19, Vite 8, TypeScript, Vitest (with jsdom + @testing-library/react), Tailwind 4, Zod 4, Anthropic SDK 0.90, tsx (script runner).

---

## File Structure

### Part 1 (Chain 1, PR 2)

**New files:**
- `src/data/instruments/20190100001.json` — WARNER HELOC synthetic
- `src/data/instruments/20090100001.json` — LOWRY AOM synthetic
- `src/data/instruments/20220100001.json` — PHOENIX Q/CL synthetic
- `src/data/ai-summaries/{apn}/{summary.md, prompt.txt, metadata.json}` × 6 parcels (18 files)
- `src/types/staff-anomaly.ts` — discriminated union for curated static anomalies
- `src/narrative/anomaly-patterns.ts` — 5 engine patterns keyed on `pattern_id`
- `src/narrative/render-citations.tsx` — lifted `renderWithCitations` helper
- `src/components/AiSummaryStatic.tsx` — static replacement for `AiSummaryPanel`
- `scripts/bake-ai-summaries.ts` — build-time LLM call orchestrator
- `scripts/lib/canonical-json.ts` — canonical JSON stringifier + hash
- `tests/canonical-json.test.ts`
- `tests/staff-anomaly-schema.test.ts`
- `tests/render-anomaly-prose.test.tsx`
- `tests/anomaly-summary-panel.dom.test.tsx` (expand-on-click coverage)

**Edited files:**
- `src/data/parcels.json` — append instruments to WARNER/LOWRY/PHOENIX
- `src/data/staff-anomalies.json` — schema migration (9 rows)
- `src/data/lifecycles.json` — append `lc-005`
- `docs/data-provenance.md` — synthetic-number convention
- `src/narrative/engine.ts` — add `renderAnomalyProse`
- `src/components/map/AnomalySummaryPanel.tsx` — expand-on-click
- `src/components/StaffParcelView.tsx` — use `renderAnomalyProse`
- `src/components/CuratorQueue.tsx`, `src/components/StaffWorkbench.tsx` — audit + update if they render `description`
- `src/components/LandingPage.tsx` — use shared type + keep `AnomalyItem` removed or promoted to shared
- `src/components/ChainOfTitle.tsx` — mount `AiSummaryStatic` instead of `AiSummaryPanel`
- `.gitignore` — cover `.env*.local`
- `package.json` — add `bake:summaries` script
- `src/lib/claude-summary.ts` — extract `SYSTEM_PROMPT` constant; remove streaming path if no remaining importers
- Proof Drawer component (located in Task A.4) — UI disclosure for synthetic instruments

**Deleted files:**
- `src/components/AiSummaryPanel.tsx`
- `src/hooks/useAnthropicKey.ts`

**Renamed files:**
- `.env.local.txt` → `.env.local`

### Part 2 (Chain 2, PR 1)

**New files:**
- `src/components/SearchHero.tsx`
- `tests/search-hero.dom.test.tsx`

**Edited files:**
- `src/components/LandingPage.tsx` — mount `SearchHero` above map; remove `MapSearchBar` + `SearchEntry`
- `src/components/MapLegend.tsx` — audit + update if it references either deleted component

**Deleted files:**
- `src/components/MapSearchBar.tsx`
- `src/components/SearchEntry.tsx`
- `tests/map-search-bar.dom.test.tsx`

---

## Part 1 — Chain A → C → D (serial, produces PR 2)

### Task A.1: WARNER HELOC synthetic instrument + anomaly + lifecycle

**Files:**
- Create: `src/data/instruments/20190100001.json`
- Modify: `src/data/parcels.json`
- Modify: `src/data/staff-anomalies.json`
- Modify: `src/data/lifecycles.json`

- [ ] **Step 1: Read the existing synthetic precedent**

Run: Read `src/data/instruments/20230100000.json` to copy the exact shape (keys, ordering, `provenance: "demo_synthetic"`, `raw_api_response.synthesized: true`).

- [ ] **Step 2: Read an existing DEED TRST to copy real-path field shapes**

Run: Read `src/data/instruments/20130183450.json` (POPHAM 2013 DOT). Match field names and nesting exactly for the non-synthetic fields.

- [ ] **Step 3: Create WARNER HELOC synthetic instrument JSON**

Create `src/data/instruments/20190100001.json`. Required content (match existing schema — verify key set against `20230100000.json` before writing):

```json
{
  "instrument_number": "20190100001",
  "recording_date": "2019-02-14",
  "document_code": "DEED TRST",
  "document_type": "DEED OF TRUST",
  "parcel_apn": "304-78-374",
  "extracted_fields": {
    "grantor": { "value": "WARNER KAMA", "provenance": "demo_synthetic", "confidence": 1 },
    "grantee": { "value": "DESERT SCHOOLS FEDERAL CREDIT UNION", "provenance": "demo_synthetic", "confidence": 1 },
    "principal_amount": { "value": "45000.00", "provenance": "demo_synthetic", "confidence": 1 },
    "lien_position": { "value": "2", "provenance": "demo_synthetic", "confidence": 1 }
  },
  "raw_api_response": {
    "names": ["WARNER KAMA", "DESERT SCHOOLS FEDERAL CREDIT UNION"],
    "documentCodes": ["DEED TRST"],
    "recordingDate": "2-14-2019",
    "synthesized": true,
    "synthesized_note": "Demo-only instrument illustrating junior-lien priority pathology on WARNER parcel 304-78-374; not present in publicapi.recorder.maricopa.gov."
  }
}
```

Adjust field names to match what `20230100000.json` and `20130183450.json` actually use — those are the authoritative sources. If the existing files use snake_case for `recording_date` vs camelCase for `raw_api_response` keys, match that pattern exactly.

- [ ] **Step 4: Append instrument number to WARNER parcel**

In `src/data/parcels.json`, find the WARNER entry (`"apn": "304-78-374"`) and append `"20190100001"` to its `instrument_numbers` array.

- [ ] **Step 5: Add `an-007` to staff-anomalies.json**

Append to `src/data/staff-anomalies.json`:

```json
{
  "id": "an-007",
  "parcel_apn": "304-78-374",
  "severity": "high",
  "title": "Junior-lien priority interpretation (WARNER)",
  "description": "Synthetic 2019 DEED TRST (20190100001) appears in the curated corpus as a junior-lien example. Verify priority interpretation against the 2013 senior (20130087109): open senior + open junior = two overlapping lifecycles on one parcel, closing impact on both."
}
```

Note: at this point the file still has the **old** schema (no `references`/`pattern_id`/`plain_english` yet). That migration happens in Task C.3. Writing the old-schema row here keeps A independently commit-able and lets C operate on 9 rows instead of juggling staged-and-unstaged states.

- [ ] **Step 6: Add `lc-005` to lifecycles.json**

Read `src/data/lifecycles.json` to see the existing shape, then append an entry for `lc-005` that ties `20190100001` to WARNER, status `open`, with the same field shape as `lc-001`…`lc-004`. Reference the senior DOT (`20130087109`) in whatever "related_instruments" or equivalent field the schema uses.

- [ ] **Step 7: Typecheck and run relevant tests**

Run: `npx tsc -b`
Expected: no errors.

Run: `npx vitest run`
Expected: all green. If any test reads `staff-anomalies.json` by index and expects exactly 6 rows, it will fail — add that test to the Task C.3 migration plan and do not fix it here.

- [ ] **Step 8: Commit**

```bash
git add src/data/instruments/20190100001.json src/data/parcels.json src/data/staff-anomalies.json src/data/lifecycles.json
git commit -m "feat(corpus): WARNER junior-lien pathology (an-007, lc-005, demo_synthetic)"
```

---

### Task A.2: LOWRY AOM synthetic instrument + anomaly

**Files:**
- Create: `src/data/instruments/20090100001.json`
- Modify: `src/data/parcels.json`
- Modify: `src/data/staff-anomalies.json`

- [ ] **Step 1: Verify assignment doc code**

Grep: `grep -r "ASSIGNMENT OF DEED OF TRUST\|ASSIGN DT\|AOM" src/data/instruments/`

If any existing instrument uses a short code, match it. Otherwise use full label with `document_code: null`.

- [ ] **Step 2: Create LOWRY AOM synthetic instrument JSON**

Create `src/data/instruments/20090100001.json`:

```json
{
  "instrument_number": "20090100001",
  "recording_date": "2009-08-21",
  "document_code": null,
  "document_type": "ASSIGNMENT OF DEED OF TRUST",
  "parcel_apn": "304-78-383",
  "extracted_fields": {
    "assignor": { "value": "COUNTRYWIDE HOME LOANS INC", "provenance": "demo_synthetic", "confidence": 1 },
    "assignee": { "value": "BANK OF AMERICA NA", "provenance": "demo_synthetic", "confidence": 1 },
    "assigned_dot_instrument": { "value": "20070834755", "provenance": "demo_synthetic", "confidence": 1 }
  },
  "raw_api_response": {
    "names": ["COUNTRYWIDE HOME LOANS INC", "BANK OF AMERICA NA"],
    "documentCodes": [],
    "recordingDate": "8-21-2009",
    "synthesized": true,
    "synthesized_note": "Demo-only instrument illustrating recorded assignment chain on LOWRY parcel 304-78-383; Countrywide→Bank of America reflects the real 2008-2009 consolidation pattern but this specific assignment was not recorded."
  }
}
```

Match the exact key set and ordering of `20230100000.json`. Verify the assigned-DOT instrument number (`20070834755`) against LOWRY's existing `instrument_numbers` — it should be the 2007 DOT paired with the 2007 WAR DEED.

- [ ] **Step 3: Append instrument number to LOWRY parcel**

In `src/data/parcels.json`, find `"apn": "304-78-383"` and append `"20090100001"` to `instrument_numbers`.

- [ ] **Step 4: Add `an-008` to staff-anomalies.json**

Append:

```json
{
  "id": "an-008",
  "parcel_apn": "304-78-383",
  "severity": "medium",
  "title": "Recorded assignment chain — Countrywide to Bank of America (LOWRY)",
  "description": "Synthetic 2009 AOM (20090100001) assigns the 2007 Countrywide DOT (20070834755) to Bank of America. Note servicer history on this parcel: origination → recorded assignment → present beneficiary."
}
```

- [ ] **Step 5: Typecheck and test**

Run: `npx tsc -b && npx vitest run`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/data/instruments/20090100001.json src/data/parcels.json src/data/staff-anomalies.json
git commit -m "feat(corpus): LOWRY recorded AOM pathology (an-008, demo_synthetic)"
```

---

### Task A.3: PHOENIX VACATION HOUSES LLC-to-member Q/CL synthetic + anomaly

**Files:**
- Create: `src/data/instruments/20220100001.json`
- Modify: `src/data/parcels.json`
- Modify: `src/data/staff-anomalies.json`

- [ ] **Step 1: Create PHOENIX Q/CL synthetic instrument JSON**

Create `src/data/instruments/20220100001.json`:

```json
{
  "instrument_number": "20220100001",
  "recording_date": "2022-05-03",
  "document_code": "Q/CL DEED",
  "document_type": "QUIT CLAIM DEED",
  "parcel_apn": "304-78-367",
  "extracted_fields": {
    "grantor": { "value": "PHOENIX VACATION HOUSES LLC", "provenance": "demo_synthetic", "confidence": 1 },
    "grantee": { "value": "PHOENIX MEMBER TRUST", "provenance": "demo_synthetic", "confidence": 1 }
  },
  "raw_api_response": {
    "names": ["PHOENIX VACATION HOUSES LLC", "PHOENIX MEMBER TRUST"],
    "documentCodes": ["Q/CL DEED"],
    "recordingDate": "5-3-2022",
    "synthesized": true,
    "synthesized_note": "Demo-only instrument illustrating entity-to-member re-titling pathology on PHOENIX VACATION HOUSES LLC parcel 304-78-367; not present in publicapi.recorder.maricopa.gov."
  }
}
```

- [ ] **Step 2: Append instrument number to PHOENIX parcel**

In `src/data/parcels.json`, find `"apn": "304-78-367"` and append `"20220100001"` to `instrument_numbers`.

- [ ] **Step 3: Add `an-009` to staff-anomalies.json**

Append:

```json
{
  "id": "an-009",
  "parcel_apn": "304-78-367",
  "severity": "medium",
  "title": "LLC-to-member Q/CL — evaluate title insurability window (PHOENIX)",
  "description": "Synthetic 2022 Q/CL DEED (20220100001) from PHOENIX VACATION HOUSES LLC to an individual member trust. Evaluate title insurability window: some underwriters treat LLC-to-member re-titlings within 24 months of a purchase as a cloud until the member's interest has seasoned."
}
```

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc -b && npx vitest run`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/data/instruments/20220100001.json src/data/parcels.json src/data/staff-anomalies.json
git commit -m "feat(corpus): PHOENIX LLC-to-member Q/CL pathology (an-009, demo_synthetic)"
```

---

### Task A.4: Document synthetic-number convention + Proof Drawer UI disclosure

**Files:**
- Modify: `docs/data-provenance.md`
- Locate and modify: the Proof Drawer / instrument detail component that currently flags `20230100000` as synthetic

- [ ] **Step 1: Append synthetic-number convention to `docs/data-provenance.md`**

Append a section titled `## Synthetic instrument number reservation`:

```markdown
## Synthetic instrument number reservation

Demo-synthetic instruments use recording numbers in the reserved block `YYYY010000N`:

- Year prefix preserved (matches the real Maricopa recording-number format).
- `010000N` sequence is a deliberate round-number tell so a reader who recognizes the block knows the instrument is synthetic on sight.
- All synthetic instruments also carry `provenance: "demo_synthetic"` on every extracted field and `raw_api_response.synthesized: true` at the instrument root.

Current reservations:

- `20230100000` — PHOENIX ASSOC LIEN (commit `f0c372b`, `d026198`)
- `20190100001` — WARNER junior-lien (an-007)
- `20090100001` — LOWRY recorded AOM (an-008)
- `20220100001` — PHOENIX Q/CL (an-009)
```

- [ ] **Step 2: Locate the current synthetic-disclosure UI path**

Grep: `grep -r "synthesized\|demo_synthetic" src/components/`

Identify the component that currently renders a visible badge or callout for `20230100000`. Expected locations: `ProofDrawer`, `InstrumentDetail`, `CandidateReleasesPanel`, or `ChainOfTitle`.

- [ ] **Step 3: Verify the disclosure renders for the three new instruments**

If the disclosure reads `raw_api_response.synthesized === true`, the three new instruments will render it automatically — no code change needed. Confirm by loading the dev server and clicking through to `/parcel/304-78-374/instrument/20190100001`, `/parcel/304-78-383/instrument/20090100001`, `/parcel/304-78-367/instrument/20220100001`.

If the current disclosure hardcodes `20230100000` or reads a different key, update the selector to use `raw_api_response?.synthesized === true` across all four synthetic instruments.

- [ ] **Step 4: If no UI disclosure currently exists (JSON-only)**

Add a minimal badge to the instrument detail render surface:

```tsx
{instrument.raw_api_response?.synthesized && (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900" title={instrument.raw_api_response.synthesized_note ?? "Demo-only synthetic instrument"}>
    synthetic · demo-only
  </span>
)}
```

Mount in the same block as the instrument header/title.

- [ ] **Step 5: Typecheck, test, verify in browser**

Run: `npx tsc -b && npx vitest run && npm run dev`
Expected: all three new instrument detail views show the synthetic badge.

- [ ] **Step 6: Commit**

```bash
git add docs/data-provenance.md src/components/
git commit -m "docs+ui: synthetic-number reservation + visible synthetic disclosure for demo instruments"
```

---

### Task C.1: Discriminated-union TypeScript type for curated anomalies

**Files:**
- Create: `src/types/staff-anomaly.ts`
- Modify: `src/components/LandingPage.tsx` (replace inline `AnomalyItem`)
- Modify: `src/components/CuratorQueue.tsx`, `src/components/StaffWorkbench.tsx` (if they declare inline shapes)

- [ ] **Step 1: Create the type file**

Create `src/types/staff-anomaly.ts`:

```ts
export type AnomalySeverity = "high" | "medium" | "low";

type AnomalyBase = {
  id: string;
  parcel_apn: string;
  severity: AnomalySeverity;
  title: string;
  description: string;
};

export type StaffAnomalyEngine = AnomalyBase & {
  references: [string, ...string[]];
  pattern_id: string;
};

export type StaffAnomalyOverride = AnomalyBase & {
  references: [];
  plain_english: string;
};

export type StaffAnomaly = StaffAnomalyEngine | StaffAnomalyOverride;

export function isEngineAnomaly(a: StaffAnomaly): a is StaffAnomalyEngine {
  return a.references.length > 0;
}
```

- [ ] **Step 2: Replace the inline `AnomalyItem` in `LandingPage.tsx`**

At `src/components/LandingPage.tsx`, replace lines 26-27:

```ts
// Before:
type AnomalyItem = { id: string; parcel_apn: string; severity: "high" | "medium" | "low"; title: string; description: string };
const anomaliesRaw = anomaliesRaw_ as AnomalyItem[];
```

```ts
// After:
import type { StaffAnomaly } from "../types/staff-anomaly";
const anomaliesRaw = anomaliesRaw_ as StaffAnomaly[];
```

Verify call sites that pass `anomaliesRaw` downstream (`CountyMap`, `AnomalySummaryPanel`) still typecheck — if they declare a local prop shape, update them to import `StaffAnomaly`.

- [ ] **Step 3: Audit other consumers**

Grep: `grep -rn "staff-anomalies" src/`

For each consumer (`CuratorQueue.tsx`, `StaffWorkbench.tsx`), update the type assertion to `StaffAnomaly[]` and import from `src/types/staff-anomaly.ts`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: will fail on strictness — existing JSON rows do not yet carry `references`/`pattern_id`/`plain_english`. That is fine. The migration in Task C.3 repairs this. Temporarily cast to `unknown as StaffAnomaly[]` at the import sites if needed to unblock C.2/C.3, and remove the cast in C.3's final step.

- [ ] **Step 5: Commit**

```bash
git add src/types/staff-anomaly.ts src/components/LandingPage.tsx src/components/CuratorQueue.tsx src/components/StaffWorkbench.tsx
git commit -m "feat(types): discriminated-union StaffAnomaly type"
```

---

### Task C.2: Zod validator for StaffAnomaly + schema test

**Files:**
- Modify: `src/schemas.ts` (or the file where `LifecyclesFile` lives — verify at write-time)
- Create: `tests/staff-anomaly-schema.test.ts`

- [ ] **Step 1: Locate the existing schema module**

Grep: `grep -rn "z.object\|z.discriminatedUnion" src/schemas*`

The spec reference was `src/schemas.ts`; verify. If the file is named differently, add the Zod validator there.

- [ ] **Step 2: Write the failing schema test**

Create `tests/staff-anomaly-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { StaffAnomalySchema } from "../src/schemas";

describe("StaffAnomalySchema", () => {
  const base = {
    id: "an-x",
    parcel_apn: "304-78-386",
    severity: "high",
    title: "t",
    description: "d",
  };

  it("accepts an engine-variant anomaly", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: ["20210075858"],
        pattern_id: "mers-beneficiary-gap",
      }),
    ).not.toThrow();
  });

  it("accepts an override-variant anomaly", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: [],
        plain_english: "The release is missing.",
      }),
    ).not.toThrow();
  });

  it("rejects engine variant without pattern_id", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: ["20210075858"],
      }),
    ).toThrow();
  });

  it("rejects override variant without plain_english", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: [],
      }),
    ).toThrow();
  });

  it("rejects hybrid (non-empty references AND plain_english)", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: ["20210075858"],
        pattern_id: "mers-beneficiary-gap",
        plain_english: "extra",
      }),
    ).toThrow();
  });

  it("rejects empty-but-wrong-shape references", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: [],
        pattern_id: "mers-beneficiary-gap",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run tests/staff-anomaly-schema.test.ts`
Expected: fails with "StaffAnomalySchema is not defined" or equivalent.

- [ ] **Step 4: Add the Zod validator**

In `src/schemas.ts`:

```ts
import { z } from "zod";

const AnomalyBaseSchema = z.object({
  id: z.string(),
  parcel_apn: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  title: z.string(),
  description: z.string(),
});

const EngineAnomalySchema = AnomalyBaseSchema.extend({
  references: z.array(z.string()).min(1),
  pattern_id: z.string(),
}).strict();

const OverrideAnomalySchema = AnomalyBaseSchema.extend({
  references: z.array(z.string()).length(0),
  plain_english: z.string(),
}).strict();

export const StaffAnomalySchema = z.union([
  EngineAnomalySchema,
  OverrideAnomalySchema,
]);

export const StaffAnomalyFileSchema = z.array(StaffAnomalySchema);
```

`.strict()` on each variant is what enforces the "no hybrid" constraint from the test.

- [ ] **Step 5: Run the test, verify green**

Run: `npx vitest run tests/staff-anomaly-schema.test.ts`
Expected: all 6 cases pass.

- [ ] **Step 6: Commit**

```bash
git add src/schemas.ts tests/staff-anomaly-schema.test.ts
git commit -m "feat(schema): Zod StaffAnomaly discriminated union + tests"
```

---

### Task C.3: Migrate staff-anomalies.json to the new schema

**Files:**
- Modify: `src/data/staff-anomalies.json`
- Modify: `src/components/LandingPage.tsx` — parse at load time

- [ ] **Step 1: Write the failing file-level test**

Append to `tests/staff-anomaly-schema.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

it("validates the committed staff-anomalies.json", () => {
  const raw = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../src/data/staff-anomalies.json"),
      "utf8",
    ),
  );
  expect(() => StaffAnomalyFileSchema.parse(raw)).not.toThrow();
  expect(raw).toHaveLength(9);
});
```

Run: `npx vitest run tests/staff-anomaly-schema.test.ts`
Expected: fails — the committed rows still lack `references`/`pattern_id`/`plain_english`.

- [ ] **Step 2: Rewrite staff-anomalies.json with all 9 rows in the new schema**

Replace `src/data/staff-anomalies.json` entirely:

```json
[
  {
    "id": "an-001",
    "parcel_apn": "304-78-386",
    "severity": "high",
    "title": "Instrument 20210075858 beneficiary mismatch",
    "description": "Release executed by Wells Fargo via CAS Nationwide, but 2013 DOT beneficiary is MERS as nominee for VIP Mortgage. No recorded assignment bridges the gap — curator sign-off required before publishing as a clean lifecycle pair.",
    "references": ["20210075858", "20130183450"],
    "pattern_id": "mers-beneficiary-gap"
  },
  {
    "id": "an-002",
    "parcel_apn": "304-77-689",
    "severity": "high",
    "title": "HOGUE lc-003 release candidate not yet located",
    "description": "2015 DOT (20150516730) has no matched release in the parcel-local corpus. Cross-parcel release hunt is available as a staff-only escalation path before flagging for title plant comparison.",
    "references": [],
    "plain_english": "The 2015 deed of trust on this parcel [20150516730] has no matching release on its own chain. The parcel-local search is exhaustive — a true missing release would show here. Before flagging this against a title plant, staff can run a county-wide name-scoped release hunt; the public API cannot perform that query, so it is a county-only workflow."
  },
  {
    "id": "an-003",
    "parcel_apn": "304-78-386",
    "severity": "medium",
    "title": "Same-name contamination: POPHAM C on 999-99-00x lots",
    "description": "Name-index search for POPHAM CHRISTOPHER returns 9 instruments outside the curated parcel. Phase 3 curation suppressed these from the public chain-of-title but they remain visible in the staff workbench for investigation.",
    "references": [],
    "plain_english": "A simple name search for POPHAM CHRISTOPHER returns nine instruments on other parcels this person owns. None of them belong to this chain. The curated chain shows only instruments attributable to 304-78-386 — a parcel-keyed index that a name-based title plant cannot provide."
  },
  {
    "id": "an-004",
    "parcel_apn": "304-77-689",
    "severity": "medium",
    "title": "HOGUE same-name candidates (3 instruments)",
    "description": "Three instruments on unrelated parcels (301-12-001, 402-55-033, 510-88-021) include HOGUE JASON or HOGUE MICHELE but are not on 304-77-689's chain. Suppressed from public view; curator should confirm they stay suppressed.",
    "references": [],
    "plain_english": "Three unrelated instruments share the HOGUE name. They are suppressed from the chain because no independent evidence attributes them to this parcel. Name-based title plants cannot safely perform this suppression."
  },
  {
    "id": "an-005",
    "parcel_apn": "304-78-386",
    "severity": "low",
    "title": "Trust name truncation recovered via OCR (20130183449)",
    "description": "Public API returned THE BRIAN J. AND TANYA R. MADISON LIVIN (53-char truncation). OCR recovered full name plus trust execution date. Provenance tag is OCR — curator should spot-check the recovered value before publishing.",
    "references": ["20130183449"],
    "pattern_id": "ocr-trust-recovery"
  },
  {
    "id": "an-006",
    "parcel_apn": "304-78-386",
    "severity": "low",
    "title": "lc-004 plat cross-reference to Book 553 Page 15 unresolved",
    "description": "Seville Parcel 3 final plat (20010093192) resubdivides Book 553 Page 15 (Seville Tract H), but the master plat's recording number is not locatable via the public API. Hunt log promoted to demo asset; no further curator action required.",
    "references": [],
    "plain_english": "The Seville Parcel 3 final plat [20010093192] resubdivides an earlier master plat at Book 553 Page 15, whose recording number is not locatable via the public API. The hunt log is preserved as evidence of the gap. No curator action remains."
  },
  {
    "id": "an-007",
    "parcel_apn": "304-78-374",
    "severity": "high",
    "title": "Junior-lien priority interpretation (WARNER)",
    "description": "Synthetic 2019 DEED TRST (20190100001) appears in the curated corpus as a junior-lien example. Verify priority interpretation against the 2013 senior (20130087109): open senior + open junior = two overlapping lifecycles on one parcel, closing impact on both.",
    "references": ["20190100001", "20130087109"],
    "pattern_id": "junior-lien-priority"
  },
  {
    "id": "an-008",
    "parcel_apn": "304-78-383",
    "severity": "medium",
    "title": "Recorded assignment chain — Countrywide to Bank of America (LOWRY)",
    "description": "Synthetic 2009 AOM (20090100001) assigns the 2007 Countrywide DOT (20070834755) to Bank of America. Note servicer history on this parcel: origination → recorded assignment → present beneficiary.",
    "references": ["20090100001", "20070834755"],
    "pattern_id": "recorded-assignment-chain"
  },
  {
    "id": "an-009",
    "parcel_apn": "304-78-367",
    "severity": "medium",
    "title": "LLC-to-member Q/CL — evaluate title insurability window (PHOENIX)",
    "description": "Synthetic 2022 Q/CL DEED (20220100001) from PHOENIX VACATION HOUSES LLC to an individual member trust. Evaluate title insurability window: some underwriters treat LLC-to-member re-titlings within 24 months of a purchase as a cloud until the member's interest has seasoned.",
    "references": ["20220100001", "20200620456"],
    "pattern_id": "llc-to-member-retitle"
  }
]
```

Verify `20200620456` (referenced in `an-009`) against PHOENIX's actual purchase-deed instrument number in `parcels.json`. Adjust if the reference in Task A.3's context was wrong.

- [ ] **Step 3: Run the schema test**

Run: `npx vitest run tests/staff-anomaly-schema.test.ts`
Expected: all pass, including the file-level case.

- [ ] **Step 4: Parse at load time in `LandingPage.tsx`**

Replace the cast in `LandingPage.tsx`:

```ts
// Before:
const anomaliesRaw = anomaliesRaw_ as StaffAnomaly[];

// After:
import { StaffAnomalyFileSchema } from "../schemas";
const anomaliesRaw = StaffAnomalyFileSchema.parse(anomaliesRaw_);
```

Repeat for `CuratorQueue.tsx` and `StaffWorkbench.tsx` if they also use a cast.

- [ ] **Step 5: Full typecheck and test**

Run: `npx tsc -b && npx vitest run`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/data/staff-anomalies.json src/components/LandingPage.tsx src/components/CuratorQueue.tsx src/components/StaffWorkbench.tsx tests/staff-anomaly-schema.test.ts
git commit -m "feat(data): migrate staff-anomalies.json to discriminated-union schema (9 rows)"
```

---

### Task C.4: Lift `renderWithCitations` to a shared module

**Files:**
- Create: `src/narrative/render-citations.tsx`
- Modify: `src/components/AiSummaryPanel.tsx` (re-export for now; deleted in D.7)

- [ ] **Step 1: Create the shared helper file**

Create `src/narrative/render-citations.tsx`:

```tsx
import type { ReactNode } from "react";

/**
 * Tokenizes `[11-digit]` citations in `text` into clickable buttons iff
 * the number is in `knownInstruments`. Otherwise renders literal text.
 * Extracted from AiSummaryPanel.tsx for shared use across the AI summary
 * (static) and anomaly-prose render paths.
 */
export function renderWithCitations(
  text: string,
  knownInstruments: Set<string>,
  onOpenDocument: (n: string) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[(\d{11})\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    const instNum = match[1];
    if (knownInstruments.has(instNum)) {
      nodes.push(
        <button
          key={`cite-${key++}`}
          onClick={() => onOpenDocument(instNum)}
          className="font-mono text-xs bg-moat-50 hover:bg-moat-100 border border-moat-200 text-moat-800 px-1.5 py-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          title="Open source document"
        >
          {instNum}
        </button>,
      );
    } else {
      nodes.push(`[${instNum}]`);
    }
    lastIdx = pattern.lastIndex;
  }
  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
  return nodes;
}
```

- [ ] **Step 2: Update `AiSummaryPanel.tsx` to import instead of inline-define**

In `src/components/AiSummaryPanel.tsx`, delete the local `renderWithCitations` (lines 27-60) and import it:

```ts
import { renderWithCitations } from "../narrative/render-citations";
```

- [ ] **Step 3: Typecheck and run existing tests**

Run: `npx tsc -b && npx vitest run`
Expected: all green (the helper is bit-for-bit identical — no behavior change).

- [ ] **Step 4: Commit**

```bash
git add src/narrative/render-citations.tsx src/components/AiSummaryPanel.tsx
git commit -m "refactor(narrative): lift renderWithCitations to shared module"
```

---

### Task C.5: Anomaly pattern catalogue

**Files:**
- Create: `src/narrative/anomaly-patterns.ts`
- Create: `tests/anomaly-patterns.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/anomaly-patterns.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { anomalyPatterns } from "../src/narrative/anomaly-patterns";
import type { Instrument } from "../src/types";

describe("anomalyPatterns", () => {
  const makeInstrument = (num: string, type: string): Instrument => ({
    instrument_number: num,
    recording_date: "2020-01-01",
    document_code: null,
    document_type: type,
    parcel_apn: "304-78-386",
    extracted_fields: {},
  } as unknown as Instrument);

  it("exports all 5 pattern ids referenced by the schema", () => {
    const ids = Object.keys(anomalyPatterns);
    expect(ids.sort()).toEqual([
      "junior-lien-priority",
      "llc-to-member-retitle",
      "mers-beneficiary-gap",
      "ocr-trust-recovery",
      "recorded-assignment-chain",
    ]);
  });

  it("mers-beneficiary-gap cites both referenced instruments", () => {
    const prose = anomalyPatterns["mers-beneficiary-gap"]({
      references: ["20210075858", "20130183450"],
      instruments: [
        makeInstrument("20210075858", "RELEASE"),
        makeInstrument("20130183450", "DEED OF TRUST"),
      ],
    });
    expect(prose).toContain("[20210075858]");
    expect(prose).toContain("[20130183450]");
  });

  it("junior-lien-priority names both lienholders when findable", () => {
    const prose = anomalyPatterns["junior-lien-priority"]({
      references: ["20190100001", "20130087109"],
      instruments: [
        makeInstrument("20190100001", "DEED OF TRUST"),
        makeInstrument("20130087109", "DEED OF TRUST"),
      ],
    });
    expect(prose).toContain("[20190100001]");
    expect(prose).toContain("[20130087109]");
    expect(prose.toLowerCase()).toMatch(/junior|priority|senior/);
  });
});
```

Run: `npx vitest run tests/anomaly-patterns.test.ts`
Expected: fails — module not found.

- [ ] **Step 2: Implement the pattern catalogue**

Create `src/narrative/anomaly-patterns.ts`:

```ts
import type { Instrument } from "../types";

export type AnomalyPatternInput = {
  references: string[];
  instruments: Instrument[];
};

type PatternFn = (input: AnomalyPatternInput) => string;

function findInst(ins: Instrument[], n: string): Instrument | undefined {
  return ins.find((i) => i.instrument_number === n);
}

export const anomalyPatterns: Record<string, PatternFn> = {
  "mers-beneficiary-gap": ({ references }) => {
    const [release, dot] = references;
    return `The release [${release}] was executed by a servicer that is not the original beneficiary on the ${dot ? `deed of trust [${dot}]` : "underlying deed of trust"}. The DOT names MERS as nominee for the lender of record; the note travelled through MERS to the releasing servicer without a recorded assignment. Making the gap visible is itself the point — a name-based title plant would show the release as clean.`;
  },
  "ocr-trust-recovery": ({ references }) => {
    const [dot] = references;
    return `The public API returned the grantor name on [${dot}] truncated at 53 characters. OCR on the recorded image recovered the full trust name plus the execution date. Provenance on the recovered value is tagged OCR so a curator can spot-check before publishing.`;
  },
  "junior-lien-priority": ({ references }) => {
    const [junior, senior] = references;
    return `Two open lifecycles overlap on this parcel: a senior [${senior}] and a junior [${junior}]. Priority runs by recording date — the senior was recorded first. Closing impact is on both: either both are released, or both are addressed by payoff or subordination. A chain that shows only the most recent DOT misses the junior.`;
  },
  "recorded-assignment-chain": ({ references }) => {
    const [aom, dot] = references;
    return `The original DOT [${dot}] was assigned of record to a successor beneficiary via [${aom}]. Unlike a MERS-only transfer, this assignment is in the public record — the chain is clean on its face. The servicer-history path is visible without opening the note.`;
  },
  "llc-to-member-retitle": ({ references }) => {
    const [qcl, purchase] = references;
    return `The entity that took title at acquisition [${purchase}] later re-titled to an individual member via quit-claim [${qcl}]. Some underwriters treat LLC-to-member re-titlings inside 24 months of purchase as a cloud until the member's interest seasons. Flag for underwriter consultation, not a defect per se.`;
  },
};
```

- [ ] **Step 3: Run the test, verify green**

Run: `npx vitest run tests/anomaly-patterns.test.ts`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/narrative/anomaly-patterns.ts tests/anomaly-patterns.test.ts
git commit -m "feat(narrative): anomaly pattern catalogue (5 patterns)"
```

---

### Task C.6: `renderAnomalyProse` on the engine

**Files:**
- Modify: `src/narrative/engine.ts`
- Create: `tests/render-anomaly-prose.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/render-anomaly-prose.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderAnomalyProse } from "../src/narrative/engine";
import type { StaffAnomaly } from "../src/types/staff-anomaly";
import type { Instrument } from "../src/types";

const makeInstrument = (num: string): Instrument => ({
  instrument_number: num,
  recording_date: "2020-01-01",
  document_code: null,
  document_type: "DEED OF TRUST",
  parcel_apn: "304-78-386",
  extracted_fields: {},
} as unknown as Instrument);

describe("renderAnomalyProse", () => {
  it("routes engine variant through the pattern catalogue with clickable citations", () => {
    const opens: string[] = [];
    const anomaly: StaffAnomaly = {
      id: "an-001",
      parcel_apn: "304-78-386",
      severity: "high",
      title: "t",
      description: "d",
      references: ["20210075858", "20130183450"],
      pattern_id: "mers-beneficiary-gap",
    };
    const nodes = renderAnomalyProse(
      anomaly,
      [makeInstrument("20210075858"), makeInstrument("20130183450")],
      (n) => opens.push(n),
    );
    const { container } = render(<>{nodes}</>);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    (buttons[0] as HTMLButtonElement).click();
    expect(opens).toEqual(["20210075858"]);
  });

  it("routes override variant verbatim but tokenizes its citations", () => {
    const opens: string[] = [];
    const anomaly: StaffAnomaly = {
      id: "an-002",
      parcel_apn: "304-77-689",
      severity: "high",
      title: "t",
      description: "d",
      references: [],
      plain_english: "The 2015 DOT [20150516730] has no matching release.",
    };
    const nodes = renderAnomalyProse(
      anomaly,
      [makeInstrument("20150516730")],
      (n) => opens.push(n),
    );
    const { container } = render(<>{nodes}</>);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    (buttons[0] as HTMLButtonElement).click();
    expect(opens).toEqual(["20150516730"]);
  });

  it("override citation unknown to this corpus renders as literal bracketed text", () => {
    const anomaly: StaffAnomaly = {
      id: "an-x",
      parcel_apn: "304-78-386",
      severity: "low",
      title: "t",
      description: "d",
      references: [],
      plain_english: "Unrelated number [99999999999] should stay literal.",
    };
    const nodes = renderAnomalyProse(anomaly, [], () => {});
    const { container } = render(<>{nodes}</>);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.textContent).toContain("[99999999999]");
  });
});
```

Run: `npx vitest run tests/render-anomaly-prose.test.tsx`
Expected: fails — `renderAnomalyProse` not exported.

- [ ] **Step 2: Add `renderAnomalyProse` to `src/narrative/engine.ts`**

Append to `src/narrative/engine.ts`:

```ts
import type { ReactNode } from "react";
import type { StaffAnomaly } from "../types/staff-anomaly";
import type { Instrument } from "../types";
import { renderWithCitations } from "./render-citations";
import { anomalyPatterns } from "./anomaly-patterns";

export function renderAnomalyProse(
  anomaly: StaffAnomaly,
  instruments: Instrument[],
  onOpenDocument: (n: string) => void,
): ReactNode[] {
  const knownInstruments = new Set(instruments.map((i) => i.instrument_number));
  const prose =
    anomaly.references.length > 0
      ? anomalyPatterns[anomaly.pattern_id]({
          references: anomaly.references,
          instruments,
        })
      : anomaly.plain_english;
  return renderWithCitations(prose, knownInstruments, onOpenDocument);
}
```

- [ ] **Step 3: Run the test, verify green**

Run: `npx vitest run tests/render-anomaly-prose.test.tsx`
Expected: all 3 pass.

- [ ] **Step 4: Commit**

```bash
git add src/narrative/engine.ts tests/render-anomaly-prose.test.tsx
git commit -m "feat(narrative): renderAnomalyProse — engine or override, both citation-tokenized"
```

---

### Task C.7: `AnomalySummaryPanel` expand-on-click

**Files:**
- Modify: `src/components/map/AnomalySummaryPanel.tsx`
- Create: `tests/anomaly-summary-panel.dom.test.tsx`

- [ ] **Step 1: Write the failing DOM test**

Create `tests/anomaly-summary-panel.dom.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AnomalySummaryPanel } from "../src/components/map/AnomalySummaryPanel";
import type { StaffAnomaly } from "../src/types/staff-anomaly";
import type { Instrument } from "../src/types";

const anomalies: StaffAnomaly[] = [
  {
    id: "an-002",
    parcel_apn: "304-77-689",
    severity: "high",
    title: "HOGUE release not located",
    description: "d",
    references: [],
    plain_english: "The 2015 DOT [20150516730] has no matching release.",
  },
];
const instruments: Instrument[] = [
  { instrument_number: "20150516730" } as unknown as Instrument,
];

describe("AnomalySummaryPanel", () => {
  it("is collapsed by default — title visible, prose not visible", () => {
    render(
      <MemoryRouter>
        <AnomalySummaryPanel
          anomalies={anomalies}
          instruments={instruments}
          open
          onClose={() => {}}
          onOpenDocument={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("HOGUE release not located")).toBeInTheDocument();
    expect(screen.queryByText(/2015 DOT/)).not.toBeInTheDocument();
  });

  it("expands on title click, showing prose with clickable citation", () => {
    const opens: string[] = [];
    render(
      <MemoryRouter>
        <AnomalySummaryPanel
          anomalies={anomalies}
          instruments={instruments}
          open
          onClose={() => {}}
          onOpenDocument={(n) => opens.push(n)}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("HOGUE release not located"));
    expect(screen.getByText(/has no matching release/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "20150516730" }));
    expect(opens).toEqual(["20150516730"]);
  });
});
```

Run: `npx vitest run tests/anomaly-summary-panel.dom.test.tsx`
Expected: fails — `AnomalySummaryPanel` doesn't accept `instruments`/`onOpenDocument` yet.

- [ ] **Step 2: Rewrite `AnomalySummaryPanel`**

Replace `src/components/map/AnomalySummaryPanel.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { renderAnomalyProse } from "../../narrative/engine";
import type { StaffAnomaly, AnomalySeverity } from "../../types/staff-anomaly";
import type { Instrument } from "../../types";

interface Props {
  anomalies: StaffAnomaly[];
  instruments: Instrument[];
  open: boolean;
  onClose: () => void;
  onOpenDocument: (n: string) => void;
}

const DOT: Record<AnomalySeverity, string> = {
  high: "bg-red-600",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export function AnomalySummaryPanel({
  anomalies,
  instruments,
  open,
  onClose,
  onOpenDocument,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const byApn = new Map<string, StaffAnomaly[]>();
  for (const a of anomalies) {
    const arr = byApn.get(a.parcel_apn) ?? [];
    arr.push(a);
    byApn.set(a.parcel_apn, arr);
  }

  const toggle = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section
      className="absolute top-16 right-4 z-20 w-80 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl"
      role="region"
      aria-label="Curator anomaly summary"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h3 className="text-sm font-semibold text-recorder-900">Curator anomalies</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close anomaly panel"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-recorder-500 focus-visible:outline-none"
        >
          ×
        </button>
      </header>
      <ul className="divide-y divide-slate-100">
        {[...byApn.entries()].map(([apn, items]) => (
          <li key={apn} className="p-3">
            <Link to={`/parcel/${apn}`} className="mb-1 inline-block font-mono text-xs text-recorder-700 hover:underline">
              {apn}
            </Link>
            <ul className="space-y-2">
              {items.map((a) => {
                const isOpen = expanded.has(a.id);
                return (
                  <li key={a.id} className="text-xs">
                    <button
                      type="button"
                      onClick={() => toggle(a.id)}
                      className="flex w-full items-start gap-2 text-left hover:bg-slate-50 rounded px-1 py-0.5"
                      aria-expanded={isOpen}
                    >
                      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${DOT[a.severity]}`} aria-label={a.severity} />
                      <span className="text-slate-700 flex-1">{a.title}</span>
                      <span className="text-slate-400" aria-hidden>
                        {isOpen ? "▾" : "▸"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-1 pl-4 text-slate-700 leading-relaxed">
                        {renderAnomalyProse(a, instruments, onOpenDocument)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Update `LandingPage.tsx` to pass the new props**

In `src/components/LandingPage.tsx`, update the `<AnomalySummaryPanel>` element to pass `instruments` (from `loadAllInstruments()`) and `onOpenDocument={(n) => navigate(\`/instrument/${n}\`)}`.

- [ ] **Step 4: Run the test, verify green**

Run: `npx vitest run tests/anomaly-summary-panel.dom.test.tsx`
Expected: both pass.

Run full suite: `npx vitest run`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/AnomalySummaryPanel.tsx src/components/LandingPage.tsx tests/anomaly-summary-panel.dom.test.tsx
git commit -m "feat(ui): AnomalySummaryPanel expand-on-click with plain-English prose"
```

---

### Task C.8: `StaffParcelView` + other description-rendering call sites

**Files:**
- Modify: `src/components/StaffParcelView.tsx`
- Modify: `src/components/CuratorQueue.tsx`, `src/components/StaffWorkbench.tsx` (if they render `description`)

- [ ] **Step 1: Audit call sites**

Grep: `grep -rn "\.description" src/components/ | grep -i "anomal\|staff"`

List every location that renders an anomaly's `description` field in the DOM. Expected list: `StaffParcelView.tsx`, possibly `CuratorQueue.tsx` and `StaffWorkbench.tsx`.

- [ ] **Step 2: Replace `description` render with `renderAnomalyProse`**

For each call site, replace:

```tsx
<p>{anomaly.description}</p>
```

with:

```tsx
<p>{renderAnomalyProse(anomaly, instruments, onOpenDocument)}</p>
```

If the component does not already receive `instruments` and `onOpenDocument`, add them as props and pass from the parent. Use `navigate(\`/instrument/${n}\`)` as the default `onOpenDocument` behavior if none is contextually more appropriate.

Import: `import { renderAnomalyProse } from "../narrative/engine";`

- [ ] **Step 3: Keep `description` visible as curator shorthand where appropriate**

On staff-facing views (`StaffParcelView`, `CuratorQueue`, `StaffWorkbench`), render *both* — plain-English prose for the examiner-facing line, and the `description` field as a collapsible "curator note" below. This keeps the curator-shorthand visible to the people who wrote it.

Rendering pattern:

```tsx
<div>
  <div>{renderAnomalyProse(anomaly, instruments, onOpenDocument)}</div>
  <details className="mt-1 text-xs text-slate-500">
    <summary className="cursor-pointer">Curator note</summary>
    <p className="mt-1">{anomaly.description}</p>
  </details>
</div>
```

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc -b && npx vitest run`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/StaffParcelView.tsx src/components/CuratorQueue.tsx src/components/StaffWorkbench.tsx
git commit -m "feat(ui): staff views — plain-English prose + curator-note disclosure"
```

---

### Task D.0: Gitignore + env rename prereq

**Files:**
- Modify: `.gitignore`
- Rename: `.env.local.txt` → `.env.local`

- [ ] **Step 1: Update `.gitignore`**

Append to `.gitignore`:

```
.env.local
.env*.local
```

- [ ] **Step 2: Rename the env file**

```bash
git mv .env.local.txt .env.local
```

Wait — `.env.local.txt` is currently **untracked** (see `git status` at start of sprint). Use a plain rename instead:

```bash
mv .env.local.txt .env.local
```

- [ ] **Step 3: Sanity check**

```bash
git ls-files .env\*
```

Expected: empty output. Nothing `.env*` is tracked.

```bash
git check-ignore -v .env.local
```

Expected: `.gitignore:N:.env.local  .env.local` (or similar — proves the rule matches).

- [ ] **Step 4: Commit the gitignore change**

```bash
git add .gitignore
git commit -m "chore(git): ignore .env.local and .env*.local"
```

The env file itself is now gitignored and won't be committed.

---

### Task D.1: Extract the Claude system prompt to a constant

**Files:**
- Modify: `src/lib/claude-summary.ts`

- [ ] **Step 1: Read the current streaming path**

Read `src/lib/claude-summary.ts` end-to-end. Identify the system prompt string and the user-message construction logic.

- [ ] **Step 2: Export the prompt and the payload builder**

Refactor `src/lib/claude-summary.ts` so the following are exported:

```ts
export const SYSTEM_PROMPT: string = `<the current system prompt, verbatim>`;

export type SummaryInput = {
  parcel: Parcel;
  instruments: Instrument[];
  lifecycles: EncumbranceLifecycle[];
  findings: StaffAnomaly[];
};

export function buildUserMessage(input: SummaryInput): string {
  // Exactly the serialization the streaming path already does.
  return JSON.stringify({ parcel: input.parcel, instruments: input.instruments, lifecycles: input.lifecycles, findings: input.findings }, null, 2);
}
```

Keep `streamChainSummary` working; it can now call `buildUserMessage` internally.

Update `src/components/AiSummaryPanel.tsx` to use `StaffAnomaly` for the `findings` prop type (replacing the existing `AnomalyFinding` import which is a different, dynamic-detection type — see `src/types/anomaly.ts`).

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc -b && npx vitest run`
Expected: all green — behavior unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/lib/claude-summary.ts src/components/AiSummaryPanel.tsx
git commit -m "refactor(llm): extract SYSTEM_PROMPT + buildUserMessage for bake reuse"
```

---

### Task D.2: Canonical JSON + prompt_hash helper with unit test

**Files:**
- Create: `scripts/lib/canonical-json.ts`
- Create: `tests/canonical-json.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/canonical-json.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canonicalJson, promptHash } from "../scripts/lib/canonical-json";

describe("canonicalJson", () => {
  it("produces byte-identical output regardless of input key order", () => {
    const a = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const b = { a: 1, c: { x: 10, y: 20 }, b: 2 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("handles arrays preserving index order (not sorted)", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("serializes nested objects with sorted keys recursively", () => {
    expect(canonicalJson({ z: { d: 1, a: 2 }, a: [1, 2] })).toBe('{"a":[1,2],"z":{"a":2,"d":1}}');
  });
});

describe("promptHash", () => {
  it("is stable across key-order variation of the same inputs", () => {
    const a = promptHash({ b: [1, 2], a: { y: "x", x: "y" } });
    const b = promptHash({ a: { x: "y", y: "x" }, b: [1, 2] });
    expect(a).toBe(b);
  });

  it("differs when a value actually changes", () => {
    const a = promptHash({ x: 1 });
    const b = promptHash({ x: 2 });
    expect(a).not.toBe(b);
  });

  it("is a hex sha256 (64 chars)", () => {
    expect(promptHash({ x: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

Run: `npx vitest run tests/canonical-json.test.ts`
Expected: fails — module not found.

- [ ] **Step 2: Implement**

Create `scripts/lib/canonical-json.ts`:

```ts
import { createHash } from "node:crypto";

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalJson((value as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

export function promptHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
```

- [ ] **Step 3: Run the test, verify green**

Run: `npx vitest run tests/canonical-json.test.ts`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/canonical-json.ts tests/canonical-json.test.ts
git commit -m "feat(scripts): canonical JSON + sha256 prompt-hash helper"
```

---

### Task D.3: Bake script — invoke the `claude-api` skill while writing

**This step explicitly invokes the `claude-api` skill before writing the bake script.**

The skill mandates prompt caching on the system prompt and enforces current model IDs.

**Files:**
- Create: `scripts/bake-ai-summaries.ts`
- Modify: `package.json` (add `"bake:summaries": "tsx scripts/bake-ai-summaries.ts"`)

- [ ] **Step 1: Invoke the `claude-api` skill**

Before writing the script, invoke `Skill("claude-api")` and follow its guidance for: SDK import, model selection, prompt caching on the system prompt block, streaming vs non-streaming choice for build-time use, and error handling.

- [ ] **Step 2: Write the script**

Create `scripts/bake-ai-summaries.ts` per the skill's output. Core shape (the skill may refine this):

```ts
/*
 * Build-time bake of per-parcel Claude summaries.
 * Run with: npm run bake:summaries [-- --force]
 *
 * Reads ANTHROPIC_API_KEY from .env.local. For each of the 6 curated parcels,
 * calls Claude Opus 4.7 with prompt caching on SYSTEM_PROMPT, and writes:
 *   src/data/ai-summaries/{apn}/summary.md
 *   src/data/ai-summaries/{apn}/prompt.txt
 *   src/data/ai-summaries/{apn}/metadata.json
 *
 * Behavior:
 *   - Computes prompt_hash per parcel from canonicalJson(SummaryInput).
 *   - If metadata.json exists and prompt_hash matches, SKIP (artifacts are cached).
 *   - If prompt_hash mismatches, log "would regenerate {apn}" and skip unless --force.
 *   - If metadata.json missing, always generate.
 */

import fs from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { canonicalJson, promptHash } from "./lib/canonical-json";
import { SYSTEM_PROMPT, buildUserMessage, type SummaryInput } from "../src/lib/claude-summary";
// … imports for loading parcels, instruments, lifecycles, anomalies from src/data/

const MODEL_ID = "claude-opus-4-7";
// (Skill will confirm this is the correct latest Opus ID at script-write time.)

function loadEnvLocal(): void {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found — rename .env.local.txt or create .env.local");
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

async function bakeOne(apn: string, input: SummaryInput, force: boolean): Promise<void> {
  const outDir = path.resolve(`src/data/ai-summaries/${apn}`);
  const metaPath = path.join(outDir, "metadata.json");
  const hash = promptHash(input);

  if (fs.existsSync(metaPath) && !force) {
    const existing = JSON.parse(readFileSync(metaPath, "utf8"));
    if (existing.prompt_hash === hash) {
      console.log(`[${apn}] cache hit — skip`);
      return;
    }
    console.log(`[${apn}] prompt_hash mismatch: would regenerate. Re-run with --force to overwrite.`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const userMessage = buildUserMessage(input);
  fs.writeFileSync(path.join(outDir, "prompt.txt"), userMessage, "utf8");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const summary = res.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  fs.writeFileSync(path.join(outDir, "summary.md"), summary, "utf8");
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        model_id: MODEL_ID,
        input_token_count: res.usage.input_tokens,
        output_token_count: res.usage.output_tokens,
        cache_read_input_tokens: res.usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: res.usage.cache_creation_input_tokens ?? 0,
        prompt_hash: hash,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`[${apn}] generated · in=${res.usage.input_tokens} out=${res.usage.output_tokens}`);
}

async function main(): Promise<void> {
  loadEnvLocal();
  const force = process.argv.includes("--force");
  // Load parcels + group instruments/lifecycles/anomalies by APN.
  // Call bakeOne() for each parcel sequentially (cache hits across 5-min window).
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Fill in the `main()` parcel iteration using the same data-loading pattern as `LandingPage.tsx` and `ChainOfTitle.tsx`. The skill will verify the final shape.

- [ ] **Step 3: Wire the npm script**

In `package.json`, add to `scripts`:

```json
"bake:summaries": "tsx scripts/bake-ai-summaries.ts"
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: green.

- [ ] **Step 5: Commit (no artifacts yet)**

```bash
git add scripts/bake-ai-summaries.ts package.json
git commit -m "feat(scripts): bake-ai-summaries — build-time per-parcel Claude bake with caching"
```

---

### Task D.4: Run the bake and commit the 18 artifacts

**Files:**
- Create: `src/data/ai-summaries/{apn}/{summary.md, prompt.txt, metadata.json}` × 6

- [ ] **Step 1: Confirm `.env.local` has `ANTHROPIC_API_KEY`**

```bash
grep -c ANTHROPIC_API_KEY .env.local
```

Expected: `1`.

- [ ] **Step 2: Run the bake**

```bash
npm run bake:summaries
```

Expected: 6 log lines `[<apn>] generated · in=<n> out=<m>`. Prompt cache should hit on parcels 2-6 (reduces cost).

- [ ] **Step 3: Spot-check one summary**

Run: open `src/data/ai-summaries/304-78-386/summary.md`. Read it. Verify it references the POPHAM chain with `[11-digit]` citations.

Run: open `src/data/ai-summaries/304-78-386/metadata.json`. Verify it has `prompt_hash` (hex), `model_id: "claude-opus-4-7"`, and token counts.

- [ ] **Step 4: Verify idempotency (run again, expect cache hits)**

```bash
npm run bake:summaries
```

Expected: 6 `[<apn>] cache hit — skip` lines. No new API calls.

- [ ] **Step 5: Commit all 18 artifacts**

```bash
git add src/data/ai-summaries/
git commit -m "feat(data): bake per-parcel AI summaries (18 artifacts, claude-opus-4-7)"
```

---

### Task D.5: `AiSummaryStatic` component

**Files:**
- Create: `src/components/AiSummaryStatic.tsx`
- Create: `tests/ai-summary-static.dom.test.tsx`

- [ ] **Step 1: Write the failing DOM test**

Create `tests/ai-summary-static.dom.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiSummaryStatic } from "../src/components/AiSummaryStatic";
import type { Parcel } from "../src/types";

// Mock the ?raw imports. Vitest replaces them at module load.
vi.mock("../src/data/ai-summaries/304-78-386/summary.md?raw", () => ({
  default: "POPHAM chain: 2013 DOT [20130183450] released by [20210075858].",
}));
vi.mock("../src/data/ai-summaries/304-78-386/prompt.txt?raw", () => ({
  default: "PROMPT_TXT",
}));
vi.mock("../src/data/ai-summaries/304-78-386/metadata.json", () => ({
  default: {
    generated_at: "2026-04-17T12:00:00Z",
    model_id: "claude-opus-4-7",
    input_token_count: 1000,
    output_token_count: 200,
    prompt_hash: "deadbeef",
  },
}));

describe("AiSummaryStatic", () => {
  const parcel = { apn: "304-78-386" } as Parcel;
  it("renders summary prose with clickable citation", () => {
    const opens: string[] = [];
    render(
      <AiSummaryStatic
        parcel={parcel}
        knownInstruments={new Set(["20210075858", "20130183450"])}
        onOpenDocument={(n) => opens.push(n)}
      />,
    );
    expect(screen.getByText(/POPHAM chain/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "20210075858" }));
    expect(opens).toEqual(["20210075858"]);
  });

  it("renders footer with date and model id", () => {
    render(
      <AiSummaryStatic
        parcel={parcel}
        knownInstruments={new Set()}
        onOpenDocument={() => {}}
      />,
    );
    expect(screen.getByText(/claude-opus-4-7/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-17/)).toBeInTheDocument();
  });
});
```

Run: `npx vitest run tests/ai-summary-static.dom.test.tsx`
Expected: fails — component not yet created.

- [ ] **Step 2: Implement**

Create `src/components/AiSummaryStatic.tsx`:

```tsx
import type { Parcel } from "../types";
import { renderWithCitations } from "../narrative/render-citations";

// One static import per parcel — Vite resolves them at build time.
// If the parcel's summary is not on disk, the import fails at build.
import popham_md from "../data/ai-summaries/304-78-386/summary.md?raw";
import popham_prompt from "../data/ai-summaries/304-78-386/prompt.txt?raw";
import popham_meta from "../data/ai-summaries/304-78-386/metadata.json";
import hogue_md from "../data/ai-summaries/304-77-689/summary.md?raw";
import hogue_prompt from "../data/ai-summaries/304-77-689/prompt.txt?raw";
import hogue_meta from "../data/ai-summaries/304-77-689/metadata.json";
import hoa_md from "../data/ai-summaries/304-78-409/summary.md?raw";
import hoa_prompt from "../data/ai-summaries/304-78-409/prompt.txt?raw";
import hoa_meta from "../data/ai-summaries/304-78-409/metadata.json";
import warner_md from "../data/ai-summaries/304-78-374/summary.md?raw";
import warner_prompt from "../data/ai-summaries/304-78-374/prompt.txt?raw";
import warner_meta from "../data/ai-summaries/304-78-374/metadata.json";
import lowry_md from "../data/ai-summaries/304-78-383/summary.md?raw";
import lowry_prompt from "../data/ai-summaries/304-78-383/prompt.txt?raw";
import lowry_meta from "../data/ai-summaries/304-78-383/metadata.json";
import phoenix_md from "../data/ai-summaries/304-78-367/summary.md?raw";
import phoenix_prompt from "../data/ai-summaries/304-78-367/prompt.txt?raw";
import phoenix_meta from "../data/ai-summaries/304-78-367/metadata.json";

type Artifacts = { md: string; prompt: string; meta: { generated_at: string; model_id: string; input_token_count: number; output_token_count: number; prompt_hash: string } };

const BY_APN: Record<string, Artifacts> = {
  "304-78-386": { md: popham_md, prompt: popham_prompt, meta: popham_meta as Artifacts["meta"] },
  "304-77-689": { md: hogue_md, prompt: hogue_prompt, meta: hogue_meta as Artifacts["meta"] },
  "304-78-409": { md: hoa_md, prompt: hoa_prompt, meta: hoa_meta as Artifacts["meta"] },
  "304-78-374": { md: warner_md, prompt: warner_prompt, meta: warner_meta as Artifacts["meta"] },
  "304-78-383": { md: lowry_md, prompt: lowry_prompt, meta: lowry_meta as Artifacts["meta"] },
  "304-78-367": { md: phoenix_md, prompt: phoenix_prompt, meta: phoenix_meta as Artifacts["meta"] },
};

interface Props {
  parcel: Parcel;
  knownInstruments: Set<string>;
  onOpenDocument: (n: string) => void;
}

export function AiSummaryStatic({ parcel, knownInstruments, onOpenDocument }: Props) {
  const a = BY_APN[parcel.apn];
  if (!a) return null;
  const dateShort = a.meta.generated_at.slice(0, 10);

  return (
    <section className="mb-6 border border-moat-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 bg-moat-50 border-b border-moat-200">
        <h3 className="text-sm font-semibold text-moat-900">AI Chain Summary</h3>
        <span className="text-[11px] text-moat-700">
          Baked at build time · grounded in this parcel&apos;s corpus · citations clickable
        </span>
      </div>
      <div className="px-4 py-3">
        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
          {renderWithCitations(a.md, knownInstruments, onOpenDocument)}
        </div>
        <footer className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          Generated {dateShort} by {a.meta.model_id}
          <span className="mx-1">·</span>
          <details className="inline">
            <summary className="inline cursor-pointer underline">view prompt</summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap bg-slate-50 p-2 text-[10px]">{a.prompt}</pre>
          </details>
          <span className="mx-1">·</span>
          <details className="inline">
            <summary className="inline cursor-pointer underline">view metadata</summary>
            <pre className="mt-1 whitespace-pre-wrap bg-slate-50 p-2 text-[10px]">{JSON.stringify(a.meta, null, 2)}</pre>
          </details>
        </footer>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Run the test, verify green**

Run: `npx vitest run tests/ai-summary-static.dom.test.tsx`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/AiSummaryStatic.tsx tests/ai-summary-static.dom.test.tsx
git commit -m "feat(ui): AiSummaryStatic — static render with view-prompt/metadata disclosure"
```

---

### Task D.6: Swap `AiSummaryPanel` for `AiSummaryStatic` in ChainOfTitle

**Files:**
- Modify: `src/components/ChainOfTitle.tsx`

- [ ] **Step 1: Locate the `<AiSummaryPanel>` mount**

Read `src/components/ChainOfTitle.tsx` around line 127. Note the props being passed.

- [ ] **Step 2: Replace the import and the element**

```tsx
// Before:
import { AiSummaryPanel } from "./AiSummaryPanel";
…
<AiSummaryPanel parcel={parcel} instruments={instruments} lifecycles={lifecycles} findings={findings} onOpenDocument={onOpenDocument} />

// After:
import { AiSummaryStatic } from "./AiSummaryStatic";
…
<AiSummaryStatic
  parcel={parcel}
  knownInstruments={new Set(instruments.map((i) => i.instrument_number))}
  onOpenDocument={onOpenDocument}
/>
```

`lifecycles` and `findings` are no longer needed at render time — they were inputs to the live streaming call, which is now gone.

- [ ] **Step 3: Typecheck, test, verify in browser**

Run: `npx tsc -b && npx vitest run && npm run dev`

Navigate to `/parcel/304-78-386`. Expected: AI Chain Summary renders with POPHAM baked prose, citations are clickable, footer shows generation date + model + view-prompt + view-metadata disclosures. No paste-key UI anywhere.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChainOfTitle.tsx
git commit -m "feat(ui): ChainOfTitle mounts AiSummaryStatic — remove runtime LLM call"
```

---

### Task D.7: Audit-and-delete old AI code

**Files:**
- Delete: `src/components/AiSummaryPanel.tsx`
- Delete: `src/hooks/useAnthropicKey.ts`
- Possibly modify: `src/lib/claude-summary.ts` (remove `streamChainSummary` if unused)

- [ ] **Step 1: Grep for `AiSummaryPanel` imports**

Grep: `grep -rn "AiSummaryPanel\|useAnthropicKey" src/ tests/`

Expected after Task D.6: only the two files themselves reference these names. Historical `docs/` references are frozen — skip.

- [ ] **Step 2: Delete `AiSummaryPanel.tsx`**

```bash
git rm src/components/AiSummaryPanel.tsx
```

- [ ] **Step 3: Delete `useAnthropicKey.ts`**

```bash
git rm src/hooks/useAnthropicKey.ts
```

- [ ] **Step 4: Grep for `streamChainSummary` and related live-call exports**

Grep: `grep -rn "streamChainSummary" src/ tests/`

If no remaining importers (AiSummaryPanel was the only caller), delete the function from `src/lib/claude-summary.ts`. Keep `SYSTEM_PROMPT` and `buildUserMessage` — `scripts/bake-ai-summaries.ts` imports them.

- [ ] **Step 5: Typecheck and run full suite**

Run: `npx tsc -b && npx vitest run`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(cleanup): remove live LLM path (AiSummaryPanel, useAnthropicKey, streamChainSummary)"
```

---

## Part 2 — Chain B (independent, produces PR 1)

### Task B.1: SearchHero scaffold with failing render test

**Files:**
- Create: `src/components/SearchHero.tsx`
- Create: `tests/search-hero.dom.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/search-hero.dom.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SearchHero } from "../src/components/SearchHero";
import type { Searchable } from "../src/logic/searchable-index";

const curated: Searchable = {
  tier: "curated",
  apn: "304-78-386",
  parcel: {
    apn: "304-78-386",
    address: "3674 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: "",
    current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    type: "residential",
    subdivision: "Seville Parcel 3",
    assessor_url: "",
    instrument_numbers: ["20210075858", "20130183450"],
  },
} as unknown as Searchable;

describe("SearchHero", () => {
  it("renders input with the placeholder", () => {
    render(
      <MemoryRouter>
        <SearchHero
          value=""
          onChange={() => {}}
          searchables={[]}
          onSelectCurated={() => {}}
          onSelectDrawer={() => {}}
          onSelectInstrument={() => {}}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByPlaceholderText(/Search APN, address, owner, subdivision/),
    ).toBeInTheDocument();
  });
});
```

Run: `npx vitest run tests/search-hero.dom.test.tsx`
Expected: fails — component not found.

- [ ] **Step 2: Scaffold the component with just the input**

Create `src/components/SearchHero.tsx`:

```tsx
import { useMemo, useState } from "react";
import { searchAll, type Searchable, type SearchHit } from "../logic/searchable-index";

interface Props {
  value: string;
  onChange: (v: string) => void;
  searchables: Searchable[];
  onSelectCurated: (apn: string, instrumentNumber?: string) => void;
  onSelectDrawer: (apn: string) => void;
  onSelectInstrument: (apn: string, instrumentNumber: string) => void;
}

export function SearchHero({ value, onChange, searchables, onSelectCurated, onSelectDrawer, onSelectInstrument }: Props) {
  return (
    <section className="bg-white border-b border-slate-200 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search APN, address, owner, subdivision, or 11-digit instrument"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent"
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Run the test, verify green**

Run: `npx vitest run tests/search-hero.dom.test.tsx`
Expected: 1 pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/SearchHero.tsx tests/search-hero.dom.test.tsx
git commit -m "feat(ui): SearchHero scaffold — input with placeholder"
```

---

### Task B.2: Dropdown results with tier + entity-type pills

**Files:**
- Modify: `src/components/SearchHero.tsx`
- Modify: `tests/search-hero.dom.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `tests/search-hero.dom.test.tsx`:

```tsx
it("shows entity-type pill and tier pill on each result", () => {
  render(
    <MemoryRouter>
      <SearchHero
        value="POPHAM"
        onChange={() => {}}
        searchables={[curated]}
        onSelectCurated={() => {}}
        onSelectDrawer={() => {}}
        onSelectInstrument={() => {}}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Owner$/i)).toBeInTheDocument();
  expect(screen.getByText(/Curated/i)).toBeInTheDocument();
});

it("shows the Instrument entity pill for 11-digit query", () => {
  render(
    <MemoryRouter>
      <SearchHero
        value="20210075858"
        onChange={() => {}}
        searchables={[curated]}
        onSelectCurated={() => {}}
        onSelectDrawer={() => {}}
        onSelectInstrument={() => {}}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Instrument$/i)).toBeInTheDocument();
});
```

Run: `npx vitest run tests/search-hero.dom.test.tsx`
Expected: new cases fail.

- [ ] **Step 2: Implement the dropdown + pills**

Replace `SearchHero.tsx` with:

```tsx
import { useMemo, useRef, useState } from "react";
import { searchAll, type Searchable, type SearchHit, type MatchType } from "../logic/searchable-index";
import { assembleAddress } from "../logic/assessor-parcel";

const TIER_CHIP: Record<Searchable["tier"], { label: string; className: string }> = {
  curated: { label: "Curated", className: "bg-emerald-100 text-emerald-900" },
  recorder_cached: { label: "Recorder", className: "bg-moat-100 text-moat-900" },
  assessor_only: { label: "Assessor", className: "bg-slate-100 text-slate-700" },
};

const ENTITY_CHIP: Record<MatchType, { label: string; className: string }> = {
  instrument: { label: "Instrument", className: "bg-indigo-100 text-indigo-900" },
  apn: { label: "APN", className: "bg-blue-100 text-blue-900" },
  address: { label: "Address", className: "bg-teal-100 text-teal-900" },
  owner: { label: "Owner", className: "bg-purple-100 text-purple-900" },
  subdivision: { label: "Subdivision", className: "bg-amber-100 text-amber-900" },
};

function addressOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.address;
  return assembleAddress(s.polygon);
}
function ownerOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.current_owner;
  return s.polygon.OWNER_NAME ?? "";
}
function subdivisionOf(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.subdivision;
  return s.polygon.SUBNAME ?? "";
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  searchables: Searchable[];
  onSelectCurated: (apn: string, instrumentNumber?: string) => void;
  onSelectDrawer: (apn: string) => void;
  onSelectInstrument: (apn: string, instrumentNumber: string) => void;
}

export function SearchHero({ value, onChange, searchables, onSelectCurated, onSelectDrawer, onSelectInstrument }: Props) {
  const [open, setOpen] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const hits = useMemo(
    () => (value ? searchAll(value, searchables, { limit: 8 }) : []),
    [value, searchables],
  );
  const total = useMemo(
    () => (value ? searchAll(value, searchables).length : 0),
    [value, searchables],
  );

  const onPick = (hit: SearchHit, rawQuery: string) => {
    const s = hit.searchable;
    if (hit.matchType === "instrument") {
      onSelectInstrument(s.apn, rawQuery.trim());
      return;
    }
    if (s.tier === "curated") {
      onSelectCurated(s.apn);
      return;
    }
    onSelectDrawer(s.apn);
  };

  const showDropdown = open && value.length > 0 && hits.length > 0;

  return (
    <section className="bg-white border-b border-slate-200 px-6 py-8">
      <div className="max-w-3xl mx-auto relative">
        <input
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-hero-results"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value) setOpen(true);
            setActiveIdx(0);
          }}
          placeholder="Search APN, address, owner, subdivision, or 11-digit instrument"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); const h = hits[activeIdx]; if (h) onPick(h, value); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {showDropdown && (
          <ul
            id="search-hero-results"
            role="listbox"
            className="absolute left-0 right-0 mt-1 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl z-30"
          >
            {hits.map((h, i) => {
              const s = h.searchable;
              const entity = ENTITY_CHIP[h.matchType];
              const tier = TIER_CHIP[s.tier];
              const active = i === activeIdx;
              return (
                <li
                  key={s.apn + ":" + h.matchType}
                  role="option"
                  aria-selected={active}
                  className={`flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => onPick(h, value)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-recorder-900 truncate">
                      {addressOf(s) || s.apn}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {ownerOf(s) || "—"}{" · "}
                      <span className="font-mono">{s.apn}</span>
                      {subdivisionOf(s) ? ` · ${subdivisionOf(s)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${entity.className}`}>
                      {entity.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.className}`}>
                      {tier.label}
                    </span>
                  </div>
                </li>
              );
            })}
            {total > hits.length && (
              <li className="px-4 py-2 text-xs text-slate-500">
                +{total - hits.length} more — narrow your search
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Run the tests, verify green**

Run: `npx vitest run tests/search-hero.dom.test.tsx`
Expected: all 3 pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/SearchHero.tsx tests/search-hero.dom.test.tsx
git commit -m "feat(ui): SearchHero dropdown — entity-type + tier pills"
```

---

### Task B.3: Keyboard navigation coverage

**Files:**
- Modify: `tests/search-hero.dom.test.tsx`

- [ ] **Step 1: Add the keyboard test**

Append:

```tsx
it("Enter on a curated owner-match routes to /parcel/:apn", () => {
  const picks: string[] = [];
  render(
    <MemoryRouter>
      <SearchHero
        value="POPHAM"
        onChange={() => {}}
        searchables={[curated]}
        onSelectCurated={(apn) => picks.push(apn)}
        onSelectDrawer={() => {}}
        onSelectInstrument={() => {}}
      />
    </MemoryRouter>,
  );
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
  expect(picks).toEqual(["304-78-386"]);
});

it("Enter on an instrument match routes to onSelectInstrument with both apn and instrument number", () => {
  const picks: Array<[string, string]> = [];
  render(
    <MemoryRouter>
      <SearchHero
        value="20210075858"
        onChange={() => {}}
        searchables={[curated]}
        onSelectCurated={() => {}}
        onSelectDrawer={() => {}}
        onSelectInstrument={(apn, n) => picks.push([apn, n])}
      />
    </MemoryRouter>,
  );
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
  expect(picks).toEqual([["304-78-386", "20210075858"]]);
});
```

Run: `npx vitest run tests/search-hero.dom.test.tsx`
Expected: all pass (the SearchHero implementation from B.2 already routes correctly).

- [ ] **Step 2: Commit**

```bash
git add tests/search-hero.dom.test.tsx
git commit -m "test(search-hero): Enter-key routing for curated and instrument matches"
```

---

### Task B.4: Mount SearchHero; unmount MapSearchBar + SearchEntry

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Read the current mount block**

Read `src/components/LandingPage.tsx` lines 172-260. Note the three things to change:
- Add `<SearchHero>` as first child of `<main>` (or between `CountyHeartbeat` and `<section>` map block).
- Remove `<MapSearchBar>` from inside the map section.
- Remove the entire `<section role="search">` block below the map that wraps `<SearchEntry>`.

- [ ] **Step 2: Make the edits**

- Add the import at the top: `import { SearchHero } from "./SearchHero";`
- Remove the imports: `import { MapSearchBar } …` and `import { SearchEntry } …`
- Mount `<SearchHero>` right before the map section:

```tsx
<SearchHero
  value={query}
  onChange={setQuery}
  searchables={searchables}
  onSelectCurated={(apn) => navigate(`/parcel/${apn}`)}
  onSelectInstrument={(apn, n) => navigate(`/parcel/${apn}/instrument/${n}`)}
  onSelectDrawer={(apn) => setSelectedApn(apn)}
/>
```

- Delete the `<MapSearchBar …/>` element.
- Delete the entire `<section role="search">` block (the "Or look up a parcel directly" surface).

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc -b && npx vitest run`
Expected: all green. `tests/map-search-bar.dom.test.tsx` still imports `MapSearchBar` at this point — that test file is rewritten/deleted in B.6. Until then, either skip that file or expect a clean run after it's handled.

- [ ] **Step 4: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(ui): mount SearchHero; unmount MapSearchBar + SearchEntry from LandingPage"
```

---

### Task B.5: Audit MapLegend for incidental references

**Files:**
- Modify: `src/components/MapLegend.tsx` (if needed)

- [ ] **Step 1: Grep the legend**

Grep: `grep -n "MapSearchBar\|SearchEntry" src/components/MapLegend.tsx`

If there are no matches, skip to B.6.

- [ ] **Step 2: Fix incidental references**

If MapLegend mentions the search bar in text or links, update copy to refer to the hero search above the map (or remove the reference entirely if it no longer adds value).

- [ ] **Step 3: Commit (if changes)**

```bash
git add src/components/MapLegend.tsx
git commit -m "chore(ui): update MapLegend copy post-search-hero"
```

---

### Task B.6: Delete MapSearchBar, SearchEntry, and their test file

**Files:**
- Delete: `src/components/MapSearchBar.tsx`
- Delete: `src/components/SearchEntry.tsx`
- Delete: `tests/map-search-bar.dom.test.tsx`

- [ ] **Step 1: Final grep for any remaining importers**

Grep: `grep -rn "MapSearchBar\|SearchEntry" src/ tests/`

Expected: matches only in the three files about to be deleted. If other files match, stop and fix them first.

Historical `docs/` matches are frozen — skip.

- [ ] **Step 2: Delete**

```bash
git rm src/components/MapSearchBar.tsx src/components/SearchEntry.tsx tests/map-search-bar.dom.test.tsx
```

- [ ] **Step 3: Run full suite**

Run: `npx tsc -b && npx vitest run`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(cleanup): remove MapSearchBar, SearchEntry, and map-search-bar.dom.test.tsx"
```

---

### Task B.7: `tests/post-demo-features.dom.test.tsx` fate

**Files:**
- Read: `tests/post-demo-features.dom.test.tsx`
- Modify / delete / rename depending on content

- [ ] **Step 1: Read the file**

Read `tests/post-demo-features.dom.test.tsx`. It was left untracked at the sprint start.

- [ ] **Step 2: Decide its fate**

If the file already covers SearchHero / AnomalySummaryPanel expand / AiSummaryStatic behavior, **absorb**: rename to a topic-named file and delete duplicate coverage that the new dedicated test files already have.

If it references now-deleted components (`MapSearchBar`, `SearchEntry`, `AiSummaryPanel`), **rewrite** against the new components.

If its coverage is already represented in the new test files (`tests/search-hero.dom.test.tsx`, `tests/anomaly-summary-panel.dom.test.tsx`, `tests/ai-summary-static.dom.test.tsx`), **delete** it and add a one-line commit rationale.

- [ ] **Step 3: Run full suite**

Run: `npx tsc -b && npx vitest run`
Expected: all green.

- [ ] **Step 4: Commit with a rationale**

```bash
git add tests/
git commit -m "test(cleanup): <absorb|rewrite|delete> post-demo-features.dom.test.tsx — <reason>"
```

---

## Rollout notes

**Two PRs, self-contained:**

- **PR 1 — Search hero (Part 2, tasks B.1–B.7).** Call out in the PR description: *Curated hits now navigate to `/parcel/:apn` instead of opening the drawer in place. Two search surfaces collapsed to one. Entity-type pill badges added alongside tier pills.*
- **PR 2 — Corpus + anomaly prose + AI bake (Part 1, tasks A.1–D.7).** Call out: *Three synthetic instruments marked `demo_synthetic` with visible UI disclosure. Runtime LLM call removed; summaries regenerated at build time from a committed prompt. Per-parcel `summary.md` / `prompt.txt` / `metadata.json` committed.*

**Dependency discipline:** Within Part 1, A → C → D must run in that order. Chain 1 is serial internally. Part 2 (B) is independent and runs in parallel with Part 1.

**Parallel dispatching:** Use `superpowers:dispatching-parallel-agents` to launch **two** outer agents in isolated worktrees — `{A→C→D}` and `{B}`. Not four.

---

## Spec traceability

| Spec requirement | Implementing tasks |
|---|---|
| A: WARNER HELOC pathology | A.1 |
| A: LOWRY AOM pathology | A.2 |
| A: PHOENIX Q/CL pathology | A.3 |
| A: Synthetic-number reservation documented | A.4 |
| A: Proof Drawer UI disclosure | A.4 |
| B: SearchHero component | B.1, B.2 |
| B: Entity-type + tier pills | B.2 |
| B: Keyboard navigation | B.3 |
| B: Instrument-match direct-route (skips Decision #36 flash) | B.2, B.3 (routing), B.4 (wiring) |
| B: Delete MapSearchBar + SearchEntry | B.6 |
| B: MapLegend audit | B.5 |
| B: `post-demo-features.dom.test.tsx` fate | B.7 |
| C: Discriminated-union type | C.1 |
| C: Zod validator (including "no hybrid" constraint) | C.2 |
| C: Schema migration, all 9 rows | C.3 |
| C: Lift `renderWithCitations` | C.4 |
| C: `anomaly-patterns.ts` catalogue | C.5 |
| C: `renderAnomalyProse` with override citation tokenization | C.6 |
| C: AnomalySummaryPanel expand-on-click | C.7 |
| C: StaffParcelView + other surfaces | C.8 |
| D: Gitignore + env rename | D.0 |
| D: Extract SYSTEM_PROMPT | D.1 |
| D: Canonical JSON + prompt_hash + unit test | D.2 |
| D: Bake script via `claude-api` skill, with prompt caching | D.3 |
| D: Bake run + 18 committed artifacts | D.4 |
| D: AiSummaryStatic with view-prompt/metadata disclosures | D.5 |
| D: Swap mount in ChainOfTitle | D.6 |
| D: Audit-and-delete AiSummaryPanel + useAnthropicKey + streamChainSummary | D.7 |

---

## Self-review notes

- **Placeholder scan:** No "TBD"/"TODO"/"appropriate" language. Two deferred checks are explicit: Task A.4 step 2 (locate existing synthetic-disclosure UI path via grep) and Task D.3 (invoke `claude-api` skill to confirm final script shape) — both are concrete write-time verifications, not ambiguity.
- **Type consistency:** `StaffAnomaly` / `StaffAnomalyEngine` / `StaffAnomalyOverride` used consistently across C.1 → C.8. `renderAnomalyProse(anomaly, instruments, onOpenDocument): ReactNode[]` signature identical at C.6 definition and C.7 / C.8 callsites. `renderWithCitations(text, knownInstruments, onOpenDocument)` signature preserved from the lift.
- **Spec coverage:** Every spec section A–E maps to at least one task. The D soft-dependency-on-C (D.3 prefers `plain_english`, falls back to `description`) is carried in the script shape.
- **No hybrid anomaly:** Enforced by `.strict()` on both Zod variants in C.2 and covered by the hybrid-rejection test case.
