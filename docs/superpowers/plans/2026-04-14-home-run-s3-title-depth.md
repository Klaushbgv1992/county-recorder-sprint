# S3 — Title Depth (Anomaly Detector + Transaction Wizard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two linked features. **S3A Chain Anomaly Detector** — 8 declarative rules fire on the curated corpus, surface in an `AnomalyPanel` above the Chain timeline, cite evidence, explain the "WHY" in plain English, and tag detection provenance. **S3B Transaction Wizard** — a 4-step wizard at `/parcel/:apn/commitment/new` generates Schedule B-I (closes Gap #16) from chain state + transaction inputs, then exports a full A + B-I + B-II PDF.

**Architecture:** Rules engine is pure functions + JSON rule descriptors. Each rule is one pure predicate over the corpus + its lifecycles; the engine composes them. The wizard is a stateful component with local state; B-I generation is a pure function taking `(parcel state, transaction inputs)` → `BIItem[]`. Existing commitment PDF builder extends to accept B-I items without refactoring B-II. Rules and templates are JSON so new rules/templates can ship without touching engine code.

**Tech Stack:** React 19, Tailwind v4, `zod` for schema, `jspdf` + `jspdf-autotable` (already present), vitest + @testing-library/react, TypeScript.

**Spec reference:** `docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md` §4.3.

**Executes two sub-streams in parallel inside this terminal via `superpowers:subagent-driven-development`** — S3A and S3B touch disjoint files after the shared Task 1 (worktree + shared types) completes.

---

## File Structure

Shared:
- Create: `src/types/anomaly.ts` — types referenced by both S3A and S3B
- Modify: `src/schemas.ts` — add `AnomalyFinding`, `BIItem` Zod schemas

**S3A files:**
- Create: `src/data/anomaly-rules.json` — 8 rule descriptors
- Create: `src/logic/anomaly-detector.ts` — pure engine
- Create: `src/logic/rules/` — one file per rule (R1–R8)
- Create: `src/components/AnomalyPanel.tsx` — UI banner + expandable list
- Create: `tests/anomaly-detector.test.ts` — engine tests
- Create: `tests/anomaly-rules.test.ts` — one describe block per rule
- Create: `tests/anomaly-panel.dom.test.tsx` — component tests
- Modify: `src/components/ChainOfTitle.tsx` — mount panel above timeline

**S3B files:**
- Create: `src/data/schedule-bi-templates.json` — B-I template bank
- Create: `src/logic/schedule-bi-generator.ts` — pure generator
- Create: `src/components/TransactionWizard.tsx` — 4-step wizard
- Create: `tests/schedule-bi-generator.test.ts` — TDD
- Create: `tests/transaction-wizard.dom.test.tsx` — wizard flow tests
- Modify: `src/logic/commitment-pdf.ts` — add B-I section renderer
- Modify: `src/components/ExportCommitmentButton.tsx` — accept `includeBI` prop
- Modify: `src/router.tsx` — add `/parcel/:apn/commitment/new` route
- Modify: `tests/routing.test.ts` — one new assertion

---

### Task 1: Worktree + shared types (CHECKPOINT 1)

- [ ] **Step 1: Create worktree**

From repo root:
```bash
git worktree add .claude/worktrees/home-run-s3-title-depth -b home-run/s3-title-depth claude/angry-buck
cd .claude/worktrees/home-run-s3-title-depth
```

- [ ] **Step 2: Write shared types**

Create `src/types/anomaly.ts`:

```typescript
// src/types/anomaly.ts
export type Severity = "high" | "medium" | "low" | "info";

export interface AnomalyFinding {
  rule_id: string; // R1..R8
  parcel_apn: string;
  severity: Severity;
  title: string;
  description: string;
  evidence_instruments: string[]; // recording numbers
  examiner_action: string;
  detection_provenance: {
    rule_name: string;
    rule_version: string;
    confidence: number; // 0-1
  };
}
```

Create `src/types/commitment.ts`:

```typescript
// src/types/commitment.ts
export type TransactionType =
  | "purchase"
  | "refinance"
  | "second_dot"
  | "heloc"
  | "cash_sale";

export interface TransactionInputs {
  transaction_type: TransactionType;
  effective_date: string; // YYYY-MM-DD
  buyer_or_borrower: string;
  new_lender: string | null;
}

export interface BIItem {
  item_id: string;
  text: string;
  why: string;
  template_id: string;
  origin_anomaly_id: string | null;
  origin_lifecycle_id: string | null;
}
```

- [ ] **Step 3: Extend Zod schemas**

Modify `src/schemas.ts`, add:

```typescript
import { z } from "zod";

export const AnomalyFindingSchema = z.object({
  rule_id: z.string(),
  parcel_apn: z.string(),
  severity: z.enum(["high", "medium", "low", "info"]),
  title: z.string(),
  description: z.string(),
  evidence_instruments: z.array(z.string()),
  examiner_action: z.string(),
  detection_provenance: z.object({
    rule_name: z.string(),
    rule_version: z.string(),
    confidence: z.number().min(0).max(1),
  }),
});

export const BIItemSchema = z.object({
  item_id: z.string(),
  text: z.string(),
  why: z.string(),
  template_id: z.string(),
  origin_anomaly_id: z.string().nullable(),
  origin_lifecycle_id: z.string().nullable(),
});
```

- [ ] **Step 4: Commit**

```bash
git add src/types/anomaly.ts src/types/commitment.ts src/schemas.ts
git commit -m "feat(s3): shared types + schemas for AnomalyFinding and BIItem"
```

---

## S3A — Chain Anomaly Detector

### Task S3A.1: anomaly-rules.json (CHECKPOINT S3A.1)

**Files:**
- Create: `src/data/anomaly-rules.json`

- [ ] **Step 1: Write rule descriptors**

Create `src/data/anomaly-rules.json`:

```json
{
  "rules": [
    {
      "rule_id": "R1",
      "name": "Same-day transaction cluster",
      "version": "1.0",
      "severity": "info",
      "title_template": "Same-day transaction detected",
      "description_template": "Instruments {a} and {b} were recorded on {date}. Shared parties suggest a linked transaction (e.g., purchase-money DOT).",
      "examiner_action_template": "No action — grouping is informational. Confirm the DOT secures the same-day deed."
    },
    {
      "rule_id": "R2",
      "name": "Open DOT past expected release window",
      "version": "1.0",
      "severity": "high",
      "title_template": "Open lien older than typical residential term",
      "description_template": "DOT {a} recorded {date} (lifecycle {lc}) remains open after {years} years. Typical residential refinance or payoff would have generated a release by now.",
      "examiner_action_template": "Request payoff from current beneficiary. Verify lifecycle against the county's internal cross-parcel name search."
    },
    {
      "rule_id": "R3",
      "name": "MERS-as-nominee beneficiary",
      "version": "1.0",
      "severity": "medium",
      "title_template": "MERS beneficiary — note may have transferred outside public record",
      "description_template": "DOT {a} names MERS as beneficiary as nominee for {lender}. Release was executed by {releaser}, not {lender} directly. The note may have transferred via MERS outside the public record.",
      "examiner_action_template": "Confirm chain of custody for the note via MERS Milestone Report or direct payoff request. Assignment may be unrecorded."
    },
    {
      "rule_id": "R4",
      "name": "Assignment chain break",
      "version": "1.0",
      "severity": "medium",
      "title_template": "Release by entity other than original beneficiary",
      "description_template": "DOT {a} originated with {originator} as beneficiary. Release {b} executed by {releaser}. No recorded assignment bridges the two.",
      "examiner_action_template": "Request assignment documentation or accept MERS transfer. Flag for title-policy exception if unresolved."
    },
    {
      "rule_id": "R5",
      "name": "Grantor is trust entity",
      "version": "1.0",
      "severity": "info",
      "title_template": "Grantor is a trust",
      "description_template": "Deed {a} conveys from {trust_name}. Trust conveyances require verification of trustee authority.",
      "examiner_action_template": "Obtain trust certification or certificate of trust. Verify trustee signed in representative capacity."
    },
    {
      "rule_id": "R6",
      "name": "Root plat unrecoverable via public API",
      "version": "1.0",
      "severity": "info",
      "title_template": "Parent plat not recoverable via public API",
      "description_template": "Subdivision plat {a} references parent plat {parent_ref} which is not retrievable through the Maricopa public API. See hunt log at docs/hunt-log-known-gap-2.md.",
      "examiner_action_template": "Legal description is adequate for commitment purposes. Parent-plat reference preserved for chain audit."
    },
    {
      "rule_id": "R7",
      "name": "Same-name contamination suppressed",
      "version": "1.0",
      "severity": "info",
      "title_template": "Same-name instruments suppressed by parcel attribution",
      "description_template": "{count} instrument(s) returned by public name search matched parcel owner name but did not satisfy parcel-attribution rules (Decision #26). Suppressed from chain.",
      "examiner_action_template": "No action — curator confirmed these belong to other parcels owned by same party."
    },
    {
      "rule_id": "R8",
      "name": "Chain stale",
      "version": "1.0",
      "severity": "low",
      "title_template": "Chain shows no activity for {years} years",
      "description_template": "Last recorded instrument for parcel {apn} was on {last_date}. Typical residential parcels see refinance or sale activity every 5–10 years.",
      "examiner_action_template": "Not a defect. Verify current ownership has not changed by confirming assessor record matches last deed grantee."
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/anomaly-rules.json
git commit -m "feat(s3a): anomaly-rules.json with 8 rule descriptors"
```

---

### Task S3A.2–S3A.9: One rule per task, TDD-style

Each rule gets its own file at `src/logic/rules/r{N}-{slug}.ts` exporting a `detect(parcel, lifecycles): AnomalyFinding[]` function. Each rule has its own test file in `tests/rules/r{N}.test.ts`.

**For each rule, the pattern is:**
1. Write failing test fixture against POPHAM or HOGUE data
2. Implement minimal predicate that fires only when the pattern matches
3. Use the rule descriptor from `anomaly-rules.json` for title/description/action strings
4. Interpolate placeholders (`{a}`, `{b}`, `{date}`, etc.)
5. Set confidence based on evidence strength
6. Run test → green → commit

Below, each rule gets one subtask. The test fixtures use the real curated corpus.

### Task S3A.2: Rule R1 — Same-day transaction cluster

**Files:**
- Create: `src/logic/rules/r1-same-day.ts`
- Create: `tests/rules/r1.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/rules/r1.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectR1 } from "../../src/logic/rules/r1-same-day";
import popham from "../../src/data/parcels/304-78-386.json";
import pophamInstruments from "../fixtures/popham-instruments-for-rules.json";

describe("R1: same-day transaction cluster", () => {
  it("fires on POPHAM 2021 refi pair (DOT + deed) recorded 2021-01-22", () => {
    const findings = detectR1(popham, pophamInstruments);
    const r1 = findings.filter((f) => f.rule_id === "R1");
    expect(r1.length).toBeGreaterThanOrEqual(1);
    expect(r1[0].evidence_instruments).toContain("20210075857");
    expect(r1[0].evidence_instruments).toContain("20210075858");
  });

  it("does not fire on a single-day instrument with no other same-day", () => {
    const lone = {
      ...popham,
      instrument_numbers: ["20210075858"],
    };
    const findings = detectR1(lone, [
      pophamInstruments.find((i: { instrument_number: string }) => i.instrument_number === "20210075858"),
    ]);
    expect(findings.filter((f) => f.rule_id === "R1")).toHaveLength(0);
  });
});
```

Create `tests/fixtures/popham-instruments-for-rules.json` by copying subset of `src/data/instruments/` for POPHAM's 5 real instruments (just `instrument_number`, `recording_date`, `document_type`, `names` — enough for rule inputs).

- [ ] **Step 2: Run, verify failure**

```bash
npm test -- tests/rules/r1.test.ts
```

- [ ] **Step 3: Implement R1**

Create `src/logic/rules/r1-same-day.ts`:

```typescript
// src/logic/rules/r1-same-day.ts
import type { AnomalyFinding } from "../../types/anomaly";
import rules from "../../data/anomaly-rules.json";

interface InstrumentLite {
  instrument_number: string;
  recording_date: string;
  document_type: string;
  names: string[];
}

interface ParcelLite {
  apn: string;
}

export function detectR1(parcel: ParcelLite, instruments: InstrumentLite[]): AnomalyFinding[] {
  const rule = rules.rules.find((r) => r.rule_id === "R1")!;
  const byDate = new Map<string, InstrumentLite[]>();
  for (const i of instruments) {
    const arr = byDate.get(i.recording_date) ?? [];
    arr.push(i);
    byDate.set(i.recording_date, arr);
  }

  const findings: AnomalyFinding[] = [];
  for (const [date, group] of byDate) {
    if (group.length < 2) continue;
    const hasNameOverlap = groupHasNameOverlap(group);
    if (!hasNameOverlap) continue;
    findings.push({
      rule_id: "R1",
      parcel_apn: parcel.apn,
      severity: "info",
      title: rule.title_template,
      description: rule.description_template
        .replace("{a}", group[0].instrument_number)
        .replace("{b}", group[1].instrument_number)
        .replace("{date}", date),
      evidence_instruments: group.map((g) => g.instrument_number),
      examiner_action: rule.examiner_action_template,
      detection_provenance: {
        rule_name: rule.name,
        rule_version: rule.version,
        confidence: 0.95,
      },
    });
  }
  return findings;
}

function groupHasNameOverlap(group: InstrumentLite[]): boolean {
  if (group.length < 2) return false;
  const first = new Set(group[0].names.map((n) => n.toUpperCase()));
  return group
    .slice(1)
    .some((i) => i.names.some((n) => first.has(n.toUpperCase())));
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npm test -- tests/rules/r1.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/logic/rules/r1-same-day.ts tests/rules/r1.test.ts tests/fixtures/popham-instruments-for-rules.json
git commit -m "feat(s3a): R1 same-day transaction cluster rule with TDD"
```

---

### Task S3A.3–S3A.9: Rules R2–R8

Apply the same TDD pattern for each rule. Each follows: **failing test → minimal implementation → pass → commit.**

**Commit per rule, one rule at a time.** Example commit titles:
- `feat(s3a): R2 open-DOT-past-expected-release rule (TDD)`
- `feat(s3a): R3 MERS-as-nominee rule (TDD)`
- `feat(s3a): R4 assignment-chain-break rule (TDD)`
- `feat(s3a): R5 grantor-is-trust rule (TDD)`
- `feat(s3a): R6 parent-plat-unrecoverable rule (TDD)`
- `feat(s3a): R7 same-name-contamination-suppressed rule (TDD)`
- `feat(s3a): R8 chain-stale rule (TDD)`

Key predicates per rule (implement each as its own module):

| Rule | Predicate (plain-English) | Input data |
|------|---------------------------|------------|
| R2 | Lifecycle status = `open` AND `recording_date + 10 years < today` | lifecycles.json + today |
| R3 | DOT.beneficiary.text matches `/MERS/` AND linked release.signer ≠ originator | instruments[].beneficiary.text + links.json |
| R4 | Released lifecycle where origin DOT beneficiary ≠ release signer AND no `ASSIGNMENT OF DEED OF TRUST` in corpus bridging them | instruments + lifecycles + links |
| R5 | Deed grantor matches `/TRUST|LIVING TRUST/` regex OR has trust-entity tag | instruments[].names + extracted trust_name |
| R6 | Subdivision-plat instrument present AND `parent_plat_recoverable: false` on its plat record | subdivision-plats.json |
| R7 | parcels.json contains `suppressed_same_name_instruments[]` non-empty | parcels.json |
| R8 | Max(recording_date of curated instruments) + 5 years < today | instruments + today |

Fixture: extend `tests/fixtures/popham-instruments-for-rules.json` + create `hogue-instruments-for-rules.json` to cover the HOGUE case for R2 + R8.

---

### Task S3A.10: Engine that composes rules (CHECKPOINT S3A.10)

**Files:**
- Create: `src/logic/anomaly-detector.ts`
- Create: `tests/anomaly-detector.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { detectAnomalies } from "../src/logic/anomaly-detector";
import pophamParcel from "../src/data/parcels/304-78-386.json";

describe("detectAnomalies", () => {
  it("runs all rules and returns a deduplicated flat list for POPHAM", async () => {
    const findings = await detectAnomalies(pophamParcel.apn);
    const ruleIds = new Set(findings.map((f) => f.rule_id));
    expect(ruleIds.has("R1")).toBe(true);
    expect(ruleIds.has("R3")).toBe(true);
    expect(ruleIds.has("R4")).toBe(true);
    expect(ruleIds.has("R5")).toBe(true);
    expect(ruleIds.has("R6")).toBe(true);
  });

  it("returns empty severity buckets if no rules fire", async () => {
    const findings = await detectAnomalies("999-99-999"); // unknown
    expect(findings).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement detector**

```typescript
// src/logic/anomaly-detector.ts
import type { AnomalyFinding } from "../types/anomaly";
import { detectR1 } from "./rules/r1-same-day";
import { detectR2 } from "./rules/r2-open-dot-past-window";
import { detectR3 } from "./rules/r3-mers-nominee";
import { detectR4 } from "./rules/r4-assignment-break";
import { detectR5 } from "./rules/r5-grantor-trust";
import { detectR6 } from "./rules/r6-parent-plat-unrecoverable";
import { detectR7 } from "./rules/r7-same-name-suppressed";
import { detectR8 } from "./rules/r8-chain-stale";
import { loadParcelDataByApn } from "../data-loader";

export async function detectAnomalies(apn: string): Promise<AnomalyFinding[]> {
  const bundle = await loadParcelDataByApn(apn);
  if (!bundle) return [];

  const ctx = {
    parcel: bundle.parcel,
    instruments: bundle.instruments,
    lifecycles: bundle.lifecycles,
    links: bundle.links,
  };

  return [
    ...detectR1(ctx.parcel, ctx.instruments),
    ...detectR2(ctx.parcel, ctx.instruments, ctx.lifecycles),
    ...detectR3(ctx.parcel, ctx.instruments, ctx.links),
    ...detectR4(ctx.parcel, ctx.instruments, ctx.lifecycles, ctx.links),
    ...detectR5(ctx.parcel, ctx.instruments),
    ...detectR6(ctx.parcel, ctx.instruments),
    ...detectR7(ctx.parcel),
    ...detectR8(ctx.parcel, ctx.instruments),
  ];
}
```

- [ ] **Step 3: Run, verify pass**

```bash
npm test -- tests/anomaly-detector.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/logic/anomaly-detector.ts tests/anomaly-detector.test.ts
git commit -m "feat(s3a): anomaly-detector engine composes 8 rules"
```

---

### Task S3A.11: AnomalyPanel component (CHECKPOINT S3A.11)

**Files:**
- Create: `src/components/AnomalyPanel.tsx`
- Create: `tests/anomaly-panel.dom.test.tsx`

- [ ] **Step 1: Write failing DOM test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AnomalyPanel } from "../src/components/AnomalyPanel";
import type { AnomalyFinding } from "../src/types/anomaly";

const findings: AnomalyFinding[] = [
  {
    rule_id: "R3",
    parcel_apn: "304-78-386",
    severity: "medium",
    title: "MERS beneficiary",
    description: "DOT 20130183450 names MERS as beneficiary.",
    evidence_instruments: ["20130183450", "20210075858"],
    examiner_action: "Request payoff.",
    detection_provenance: { rule_name: "MERS nominee", rule_version: "1.0", confidence: 0.9 },
  },
];

describe("AnomalyPanel", () => {
  afterEach(() => cleanup());

  it("renders severity summary counts", () => {
    render(<MemoryRouter><AnomalyPanel findings={findings} apn="304-78-386" /></MemoryRouter>);
    expect(screen.getByText(/1 anomaly/i)).toBeInTheDocument();
    expect(screen.getByText(/1 medium/i)).toBeInTheDocument();
  });

  it("renders no-anomalies empty state when list is empty", () => {
    render(<MemoryRouter><AnomalyPanel findings={[]} apn="304-78-386" /></MemoryRouter>);
    expect(screen.getByText(/no anomalies/i)).toBeInTheDocument();
  });

  it("expands to show evidence + examiner action on toggle", () => {
    render(<MemoryRouter><AnomalyPanel findings={findings} apn="304-78-386" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByText(/20130183450/)).toBeInTheDocument();
    expect(screen.getByText(/Request payoff/i)).toBeInTheDocument();
    expect(screen.getByText(/rule: MERS nominee/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement AnomalyPanel**

Create `src/components/AnomalyPanel.tsx` — banner summary + expandable list rendering severity pill, description, evidence (links to Proof Drawer), examiner action, detection provenance line. Follow the existing panel styling in `src/components/MoatBanner.tsx`.

- [ ] **Step 3: Run, verify pass**

- [ ] **Step 4: Commit**

```bash
git add src/components/AnomalyPanel.tsx tests/anomaly-panel.dom.test.tsx
git commit -m "feat(s3a): AnomalyPanel component with severity summary + expand"
```

---

### Task S3A.12: Wire AnomalyPanel into ChainOfTitle (CHECKPOINT S3A.12)

**Files:**
- Modify: `src/components/ChainOfTitle.tsx`

- [ ] **Step 1: Call detectAnomalies on parcel load, render AnomalyPanel above timeline**

```typescript
// In ChainOfTitle.tsx
import { detectAnomalies } from "../logic/anomaly-detector";
import { AnomalyPanel } from "./AnomalyPanel";

// inside the component:
const [findings, setFindings] = useState<AnomalyFinding[]>([]);
useEffect(() => {
  let cancelled = false;
  detectAnomalies(apn).then((f) => { if (!cancelled) setFindings(f); });
  return () => { cancelled = true; };
}, [apn]);

// in the JSX, above the timeline:
<AnomalyPanel findings={findings} apn={apn} />
```

- [ ] **Step 2: Smoke in dev**

`/parcel/304-78-386` → anomaly panel appears showing 3+ medium/info findings. `/parcel/304-77-689` → 2 findings (R8 stale + R7 suppressed).

- [ ] **Step 3: Commit**

```bash
git add src/components/ChainOfTitle.tsx
git commit -m "feat(s3a): wire AnomalyPanel into ChainOfTitle above timeline"
```

---

## S3B — Transaction Wizard

### Task S3B.1: schedule-bi-templates.json (CHECKPOINT S3B.1)

**Files:**
- Create: `src/data/schedule-bi-templates.json`
- Create: `src/data/schedule-bi-templates.README.md`

- [ ] **Step 1: Write templates**

Create `src/data/schedule-bi-templates.json`:

```json
{
  "templates": [
    {
      "template_id": "BI-PAYOFF-OPEN-DOT",
      "text": "Payoff statement from {current_beneficiary} for Deed of Trust recorded as Instrument No. {instrument_number} on {recording_date}, lifecycle identifier {lifecycle_id}. Payoff must reflect a cure through {effective_date}.",
      "why_template": "Generated because lifecycle {lifecycle_id} is currently open. Without a payoff, the closing cannot disburse funds to satisfy the lien or obtain a release."
    },
    {
      "template_id": "BI-ASSIGNMENT-VERIFY",
      "text": "Verification of assignment or MERS milestone documentation bridging {originator} to {current_holder} for Instrument No. {instrument_number}. If no recorded assignment exists, a MERS Milestone Report or endorsed note will satisfy.",
      "why_template": "Generated from anomaly {anomaly_id} ({anomaly_title}). The release executor differs from the original beneficiary; the examiner must confirm note custody."
    },
    {
      "template_id": "BI-TRUST-CERT",
      "text": "Certificate of trust or trustee's affidavit for {trust_name}, including full name, date of execution, identity of trustees, and powers to convey.",
      "why_template": "Generated from anomaly {anomaly_id} ({anomaly_title}). The grantor of record is a trust entity; trustee authority must be confirmed before closing."
    },
    {
      "template_id": "BI-HOA-ESTOPPEL",
      "text": "HOA estoppel letter and subordination from {hoa_name} if applicable to subdivision {subdivision_name}, confirming no outstanding assessments or violations through {effective_date}.",
      "why_template": "Generated because the parcel lies within a recorded subdivision ({subdivision_name}) that typically imposes HOA dues. A lien for unpaid dues would take priority over a new DOT."
    },
    {
      "template_id": "BI-TAX-CERT",
      "text": "Tax certificate from {county_treasurer} confirming real property taxes are paid through {effective_date}, or proof of current-year installment payment.",
      "why_template": "Required on every residential closing. Unpaid property taxes are a statutory lien senior to the DOT being insured."
    },
    {
      "template_id": "BI-CURATIVE-AFFIDAVIT",
      "text": "Curative affidavit executed by {grantor_name} addressing {chain_anomaly_summary}, including confirmation that no outstanding claims of heirship, marriage, or right of occupancy affect the property as of {effective_date}.",
      "why_template": "Generated from anomaly {anomaly_id}. The recorded chain contains an ambiguity that is commonly cured via a sworn affidavit rather than requiring a new deed."
    }
  ]
}
```

Create `src/data/schedule-bi-templates.README.md` with a one-paragraph note on ALTA Commitment conventions and a line that this is curator-reviewed for demo fidelity.

- [ ] **Step 2: Commit**

```bash
git add src/data/schedule-bi-templates.json src/data/schedule-bi-templates.README.md
git commit -m "feat(s3b): schedule-bi-templates with 6 ALTA-aligned B-I templates"
```

---

### Task S3B.2: schedule-bi-generator TDD (CHECKPOINT S3B.2)

**Files:**
- Create: `src/logic/schedule-bi-generator.ts`
- Create: `tests/schedule-bi-generator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { generateScheduleBI } from "../src/logic/schedule-bi-generator";
import type { AnomalyFinding } from "../src/types/anomaly";

const refiInputs = {
  transaction_type: "refinance" as const,
  effective_date: "2026-05-01",
  buyer_or_borrower: "CHRISTOPHER POPHAM",
  new_lender: "XYZ BANK NA",
};

describe("generateScheduleBI", () => {
  it("produces a payoff item for each open lifecycle", () => {
    const out = generateScheduleBI({
      apn: "304-78-386",
      lifecycles: [{ lifecycle_id: "lc-001", status: "open", root_instrument: "20200891234", current_beneficiary: "Wells Fargo", recording_date: "2020-06-15" }],
      anomalies: [],
      instruments: [],
      inputs: refiInputs,
    });
    expect(out.some((b) => b.template_id === "BI-PAYOFF-OPEN-DOT")).toBe(true);
  });

  it("produces an assignment-verify item when R4 anomaly present", () => {
    const r4: AnomalyFinding = {
      rule_id: "R4",
      parcel_apn: "304-78-386",
      severity: "medium",
      title: "Assignment chain break",
      description: "VIP -> Wells Fargo",
      evidence_instruments: ["20130183450", "20210075858"],
      examiner_action: "Request docs",
      detection_provenance: { rule_name: "assignment-break", rule_version: "1.0", confidence: 0.9 },
    };
    const out = generateScheduleBI({
      apn: "304-78-386",
      lifecycles: [],
      anomalies: [r4],
      instruments: [],
      inputs: refiInputs,
    });
    expect(out.some((b) => b.template_id === "BI-ASSIGNMENT-VERIFY")).toBe(true);
  });

  it("always includes tax certificate item", () => {
    const out = generateScheduleBI({
      apn: "304-78-386",
      lifecycles: [],
      anomalies: [],
      instruments: [],
      inputs: refiInputs,
    });
    expect(out.some((b) => b.template_id === "BI-TAX-CERT")).toBe(true);
  });

  it("omits HOA item if parcel has no subdivision", () => {
    const out = generateScheduleBI({
      apn: "000-00-000",
      lifecycles: [],
      anomalies: [],
      instruments: [],
      inputs: refiInputs,
    });
    expect(out.some((b) => b.template_id === "BI-HOA-ESTOPPEL")).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Implement generator**

Create `src/logic/schedule-bi-generator.ts` that:
- Iterates lifecycles → emits `BI-PAYOFF-OPEN-DOT` for each open
- Iterates anomalies → emits `BI-ASSIGNMENT-VERIFY` (R4), `BI-TRUST-CERT` (R5), `BI-CURATIVE-AFFIDAVIT` (R3)
- Conditionally emits `BI-HOA-ESTOPPEL` if parcel has `subdivision_id` resolved
- Always emits `BI-TAX-CERT`
- Interpolates template placeholders from the inputs + anomaly + lifecycle context
- Sets `origin_anomaly_id` and `origin_lifecycle_id` on each item so the UI can render the WHY disclosure

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Commit**

```bash
git add src/logic/schedule-bi-generator.ts tests/schedule-bi-generator.test.ts
git commit -m "feat(s3b): schedule-bi-generator with TDD over 4 template paths"
```

---

### Task S3B.3: TransactionWizard 4-step component (CHECKPOINT S3B.3)

**Files:**
- Create: `src/components/TransactionWizard.tsx`
- Create: `tests/transaction-wizard.dom.test.tsx`

- [ ] **Step 1: Write failing flow test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Routes, Route } from "react-router";
import { TransactionWizard } from "../src/components/TransactionWizard";

describe("TransactionWizard", () => {
  afterEach(() => cleanup());

  it("walks 4 steps and renders generated B-I items on step 3", async () => {
    render(
      <MemoryRouter initialEntries={["/parcel/304-78-386/commitment/new"]}>
        <Routes>
          <Route path="/parcel/:apn/commitment/new" element={<TransactionWizard />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /refinance/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.change(screen.getByLabelText(/effective date/i), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByLabelText(/buyer.*borrower/i), { target: { value: "CHRISTOPHER POPHAM" } });
    fireEvent.change(screen.getByLabelText(/lender/i), { target: { value: "XYZ BANK NA" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/payoff statement/i)).toBeInTheDocument();
    expect(screen.getByText(/tax certificate/i)).toBeInTheDocument();
  });

  it("each B-I item exposes an expandable WHY disclosure", async () => {
    render(
      <MemoryRouter initialEntries={["/parcel/304-78-386/commitment/new"]}>
        <Routes>
          <Route path="/parcel/:apn/commitment/new" element={<TransactionWizard />} />
        </Routes>
      </MemoryRouter>,
    );
    // Fast-forward to review step - use a test-only shortcut prop if needed, or step through
    // ...
    // Click a WHY disclosure
    const whyButton = await screen.findByRole("button", { name: /why this item/i });
    fireEvent.click(whyButton);
    expect(screen.getByText(/generated because/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement wizard**

Create `src/components/TransactionWizard.tsx` with 4 steps:
1. Transaction type radio group (purchase / refinance / 2nd DOT / HELOC / cash sale)
2. Effective date + buyer/borrower + new lender (autocomplete from known lenders in corpus; fallback to free text)
3. Review generated B-I items — each with "Why this item" disclosure button
4. Export full commitment PDF

State: `TransactionInputs` object; after step 2, call `generateScheduleBI` and store result.

- [ ] **Step 3: Run, verify pass**

- [ ] **Step 4: Commit**

```bash
git add src/components/TransactionWizard.tsx tests/transaction-wizard.dom.test.tsx
git commit -m "feat(s3b): TransactionWizard 4-step flow with B-I generation"
```

---

### Task S3B.4: Extend commitment-pdf.ts to include B-I section (CHECKPOINT S3B.4)

**Files:**
- Modify: `src/logic/commitment-pdf.ts`
- Modify: `src/components/ExportCommitmentButton.tsx`

- [ ] **Step 1: Add B-I renderer**

Extend `src/logic/commitment-pdf.ts` (existing file) to accept an optional `bi_items: BIItem[]` argument. Add a `renderScheduleBI` function that renders Schedule B-I after Schedule A and before Schedule B-II, with each item numbered, italicized `Closing impact:` line replaced by the new `Why this item:` line sourcing from `item.why`.

Keep Schedule B-II rendering unchanged.

- [ ] **Step 2: Update ExportCommitmentButton to accept `transactionInputs` prop**

When `transactionInputs` is passed (wizard export), generate B-I and include in PDF. Otherwise, fall back to A + B-II only (existing behavior).

- [ ] **Step 3: Extend existing export tests with B-I case**

Add to the existing `tests/export-commitment*.test.ts` a test that when B-I items are present, the PDF renderer includes a Schedule B-I section with each item numbered.

- [ ] **Step 4: Commit**

```bash
git add src/logic/commitment-pdf.ts src/components/ExportCommitmentButton.tsx tests/export-commitment*.test.ts
git commit -m "feat(s3b): extend commitment-pdf.ts with Schedule B-I rendering"
```

---

### Task S3B.5: Add route + smoke (CHECKPOINT S3B.5)

**Files:**
- Modify: `src/router.tsx`
- Modify: `tests/routing.test.ts`

- [ ] **Step 1: Add route**

```typescript
{ path: "/parcel/:apn/commitment/new", element: <TransactionWizard /> },
```

- [ ] **Step 2: Add routing assertion**

Add to `tests/routing.test.ts`:

```typescript
it("matches /parcel/:apn/commitment/new", () => {
  const match = matchPath("/parcel/304-78-386/commitment/new", routes);
  expect(match?.route.path).toBe("/parcel/:apn/commitment/new");
});
```

- [ ] **Step 3: Smoke in dev**

`/parcel/304-78-386/commitment/new` → 4-step wizard, walks through, exports full A+B-I+B-II PDF with WHY disclosures present in the PDF's inline footnotes.

- [ ] **Step 4: Commit**

```bash
git add src/router.tsx tests/routing.test.ts
git commit -m "feat(s3b): route /parcel/:apn/commitment/new wired"
```

---

### Task S3.Final: Combined integration + ready-to-merge (CHECKPOINT S3.Final)

- [ ] **Step 1: Full suite**

```bash
npm test && npm run lint && npm run build
```

- [ ] **Step 2: End-to-end manual checklist**

- [ ] `/parcel/304-78-386` — AnomalyPanel shows R1, R3, R4, R5, R6
- [ ] Click on R3 → expands evidence + action + rule citation
- [ ] `/parcel/304-77-689` — AnomalyPanel shows R2 (open DOT) + R7 (suppressed) + R8 (stale)
- [ ] `/parcel/304-78-386/commitment/new` — wizard walks 4 steps
- [ ] Step 3 renders B-I items sourced from anomalies + open lifecycles
- [ ] Each B-I has working "Why this item" disclosure
- [ ] Step 4 exports PDF with A + B-I + B-II, each section titled and numbered
- [ ] Exported PDF for HOGUE includes BI-PAYOFF-OPEN-DOT targeting `lc-003`
- [ ] Anomaly panel copy cites rule name + confidence

- [ ] **Step 3: Verification**

Invoke `superpowers:verification-before-completion`.

- [ ] **Step 4: Code review**

Invoke `superpowers:requesting-code-review`. Address findings.

- [ ] **Step 5: Ready-to-merge**

```bash
git commit --allow-empty -m "chore(s3): ready to merge — CHECKPOINT S3.Final passed"
```

---

## Merge handoff

- Branch: `home-run/s3-title-depth`
- Downstream consumer: **S4A** staff workbench queue page consumes anomaly findings.
- Upstream dependencies: none.
- Merge order position: **S3A third, S3B sixth** (per spec §5.2). Consolidator may choose to split the branch or merge whole — splitting is cleaner but whole-branch is acceptable since file paths do not overlap with S2 or S4.
- After merge, consolidator runs: `npm test && npm run lint && npm run build`.
