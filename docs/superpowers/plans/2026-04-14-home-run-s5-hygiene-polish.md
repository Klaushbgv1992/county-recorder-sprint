# S5 — Hygiene + Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five actionable gaps (#9 same-day linking, #14 localStorage persistence, #17 DOT label hardcode, #18 provenance vocab drift, #19 silent-coerce switch), ship a Tailwind design-system pass (tokens, typography, transitions, skeletons, empty states, optional dark mode), and update the moat narrative (`/moat-compare` + `docs/demo-script.md` + `docs/known-gaps.md`).

**Architecture:** Runs last, touches many files. Gap closes are TDD-driven where logic applies (#9, #18, #19). Visual polish is a token-first pass: define Tailwind tokens once, then propagate. Moat narrative changes are copy-first, with one DOM test per claim to prevent regression.

**Tech Stack:** React 19, Tailwind v4, vitest + @testing-library/react, TypeScript, jspdf.

**Spec reference:** `docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md` §4.5.

**Critical ordering:** This stream runs **last**. Before starting, rebase the S5 worktree on the consolidated integration branch that contains S1 + S2 + S3 + S4 so polish applies on top of all feature work.

---

## File Structure

Gap closes:
- Create: `src/logic/same-day-group-inferrer.ts` — #9
- Create: `tests/same-day-group-inferrer.test.ts` — #9 TDD
- Create: `src/logic/provenance-vocab.ts` — #18 shared formatter
- Create: `tests/provenance-vocab.test.ts` — #18 TDD
- Modify: `src/logic/format-provenance-tag.ts` — #18 + #19 (exhaustive switch)
- Create: `tests/format-provenance-tag.test.ts` (or extend existing) — #19 TDD
- Modify: `src/components/ProvenanceTag.tsx` — #18 consume shared formatter
- Modify: `src/components/EncumbranceLifecycle.tsx` — #17 label resolver
- Modify: `src/hooks/useExaminerActions.ts` — #14 localStorage
- Modify: `src/hooks/useLinkActions.ts` — #14 localStorage
- Modify: `src/data-loader.ts` or caller — #9 apply inferrer at load time

Visual polish:
- Modify: `tailwind.config.ts` (or equivalent v4 config) — semantic color tokens
- Modify: `src/index.css` — typography imports, root variables
- Modify: `src/App.tsx` — dark-mode context + Inter + IBM Plex Mono
- Create: `src/components/Skeletons.tsx` — loading shells
- Create: `src/components/EmptyStates.tsx` — not-in-corpus, no-results
- Create: `src/components/ErrorStates.tsx` — GIS fetch failure, invalid APN
- Modify: most components touched by streams 1–4 to consume new tokens

Narrative:
- Modify: `src/components/MoatCompareRoute.tsx` — 4 new claim rows
- Modify: `docs/demo-script.md` — full rewrite aligned to 8-minute arc
- Modify: `docs/known-gaps.md` — mark #9, #14, #16, #17, #18, #19 closed
- Modify: `docs/reproducing-the-demo.md` — cover new routes

---

### Task 1: Worktree + rebase (CHECKPOINT 1)

- [ ] **Step 1: Create worktree**

From repo root, AFTER S1+S2+S3+S4 have merged into an integration branch:
```bash
git worktree add .claude/worktrees/home-run-s5-hygiene-polish -b home-run/s5-hygiene-polish claude/angry-buck
cd .claude/worktrees/home-run-s5-hygiene-polish
```

- [ ] **Step 2: Verify baseline**

```bash
npm test && npm run lint && npm run build
```
Expected: clean on the integration branch.

---

### Task 2: Gap #19 — exhaustive switch in formatProvenanceTag (CHECKPOINT 2)

**Files:**
- Modify: `src/logic/format-provenance-tag.ts`
- Create/Modify: `tests/format-provenance-tag.test.ts`

Goal: silent coerce to `"algo"` on unknown provenance values becomes a compile-time error.

- [ ] **Step 1: Write failing test that would have caught the drift**

```typescript
import { describe, it, expect } from "vitest";
import { formatProvenanceTag } from "../src/logic/format-provenance-tag";
import type { Provenance } from "../src/types/provenance";

describe("formatProvenanceTag", () => {
  const cases: Array<[Provenance, string]> = [
    ["public_api", "(api)"],
    ["ocr", "(ocr)"],
    ["manual_entry", "(curator)"],
    ["algo", "(inferred)"],
  ];

  it.each(cases)("formats %s -> %s", (input, expected) => {
    expect(formatProvenanceTag(input)).toBe(expected);
  });

  it("rejects unknown provenance values via exhaustive check", () => {
    // @ts-expect-error — unknown value must not be accepted by the type
    formatProvenanceTag("unknown_value");
  });
});
```

- [ ] **Step 2: Refactor formatProvenanceTag to an exhaustive switch**

```typescript
// src/logic/format-provenance-tag.ts
import type { Provenance } from "../types/provenance";

export function formatProvenanceTag(p: Provenance): string {
  switch (p) {
    case "public_api":
      return "(api)";
    case "ocr":
      return "(ocr)";
    case "manual_entry":
      return "(curator)";
    case "algo":
      return "(inferred)";
    default: {
      const _exhaustive: never = p;
      throw new Error(`Unhandled provenance: ${String(_exhaustive)}`);
    }
  }
}
```

- [ ] **Step 3: Run tests, verify pass**

```bash
npm test -- tests/format-provenance-tag.test.ts
```

- [ ] **Step 4: Confirm adding a new provenance value fails at compile**

Temporarily add `"experimental"` to the `Provenance` type union (in `src/types/provenance.ts`). Confirm `npm run build` fails on the exhaustive switch. Revert the type change.

- [ ] **Step 5: Commit**

```bash
git add src/logic/format-provenance-tag.ts tests/format-provenance-tag.test.ts
git commit -m "fix(s5): close Gap #19 — exhaustive switch in formatProvenanceTag"
```

---

### Task 3: Gap #18 — shared provenance vocab (CHECKPOINT 3)

**Files:**
- Create: `src/logic/provenance-vocab.ts`
- Create: `tests/provenance-vocab.test.ts`
- Modify: `src/components/ProvenanceTag.tsx`

Goal: single source of truth for the UI badge label and the PDF inline tag.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { provenanceLabel, provenanceInlineTag } from "../src/logic/provenance-vocab";

describe("provenance-vocab", () => {
  it("UI badge label is human-readable", () => {
    expect(provenanceLabel("public_api")).toBe("County API");
    expect(provenanceLabel("ocr")).toBe("OCR");
    expect(provenanceLabel("manual_entry")).toBe("Curator");
    expect(provenanceLabel("algo")).toBe("Inferred");
  });

  it("PDF inline tag matches existing formatter output", () => {
    expect(provenanceInlineTag("public_api")).toBe("(api)");
    expect(provenanceInlineTag("ocr")).toBe("(ocr)");
    expect(provenanceInlineTag("manual_entry")).toBe("(curator)");
    expect(provenanceInlineTag("algo")).toBe("(inferred)");
  });

  it("label + inline tag are the only public functions", () => {
    // snapshot: any divergence between badge and PDF must happen in one file
  });
});
```

- [ ] **Step 2: Implement provenance-vocab**

```typescript
// src/logic/provenance-vocab.ts
import type { Provenance } from "../types/provenance";
import { formatProvenanceTag } from "./format-provenance-tag";

export function provenanceLabel(p: Provenance): string {
  switch (p) {
    case "public_api":
      return "County API";
    case "ocr":
      return "OCR";
    case "manual_entry":
      return "Curator";
    case "algo":
      return "Inferred";
    default: {
      const _: never = p;
      throw new Error(`Unhandled provenance: ${String(_)}`);
    }
  }
}

export const provenanceInlineTag = formatProvenanceTag;
```

- [ ] **Step 3: Refactor ProvenanceTag.tsx**

Consume `provenanceLabel` for the badge text. Remove any locally duplicated label string table.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/logic/provenance-vocab.ts tests/provenance-vocab.test.ts src/components/ProvenanceTag.tsx
git commit -m "fix(s5): close Gap #18 — shared provenance-vocab feeds badge + PDF"
```

---

### Task 4: Gap #9 — same-day group inferrer (CHECKPOINT 4)

**Files:**
- Create: `src/logic/same-day-group-inferrer.ts`
- Create: `tests/same-day-group-inferrer.test.ts`
- Modify: `src/data-loader.ts` (or wherever instruments are normalized at load)

Goal: infer same-day transaction groups at load time from `(recording_date, names overlap, parcel)` instead of hardcoding in JSON.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { inferSameDayGroups } from "../src/logic/same-day-group-inferrer";

describe("inferSameDayGroups", () => {
  it("groups two same-day instruments with overlapping names under one group_id", () => {
    const input = [
      { instrument_number: "20210075857", recording_date: "2021-01-22", names: ["POPHAM CHRISTOPHER"] },
      { instrument_number: "20210075858", recording_date: "2021-01-22", names: ["POPHAM CHRISTOPHER", "VIP MORTGAGE"] },
    ];
    const grouped = inferSameDayGroups(input);
    expect(grouped[0].same_day_group_id).toBe(grouped[1].same_day_group_id);
    expect(grouped[0].same_day_group_id).toBeDefined();
  });

  it("does not group same-day instruments with no name overlap", () => {
    const input = [
      { instrument_number: "A", recording_date: "2021-01-22", names: ["ALICE"] },
      { instrument_number: "B", recording_date: "2021-01-22", names: ["BOB"] },
    ];
    const grouped = inferSameDayGroups(input);
    expect(grouped[0].same_day_group_id).toBeNull();
    expect(grouped[1].same_day_group_id).toBeNull();
  });

  it("leaves single-instrument days with null group_id", () => {
    const input = [{ instrument_number: "X", recording_date: "2020-01-01", names: ["X"] }];
    const grouped = inferSameDayGroups(input);
    expect(grouped[0].same_day_group_id).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// src/logic/same-day-group-inferrer.ts
export interface InferrerInput {
  instrument_number: string;
  recording_date: string;
  names: string[];
}

export interface InferrerOutput extends InferrerInput {
  same_day_group_id: string | null;
}

export function inferSameDayGroups(instruments: InferrerInput[]): InferrerOutput[] {
  const byDate = new Map<string, InferrerInput[]>();
  for (const i of instruments) {
    const arr = byDate.get(i.recording_date) ?? [];
    arr.push(i);
    byDate.set(i.recording_date, arr);
  }

  const groupIdFor = new Map<string, string>();
  for (const [date, arr] of byDate) {
    if (arr.length < 2) continue;
    // Union-find over name overlap
    const parent: Record<string, string> = {};
    const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (const i of arr) parent[i.instrument_number] = i.instrument_number;
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        const aNames = new Set(arr[a].names.map((n) => n.toUpperCase()));
        if (arr[b].names.some((n) => aNames.has(n.toUpperCase()))) {
          parent[find(arr[a].instrument_number)] = find(arr[b].instrument_number);
        }
      }
    }
    const groups = new Map<string, string[]>();
    for (const i of arr) {
      const root = find(i.instrument_number);
      const arr2 = groups.get(root) ?? [];
      arr2.push(i.instrument_number);
      groups.set(root, arr2);
    }
    let n = 0;
    for (const [_root, members] of groups) {
      if (members.length < 2) continue;
      const id = `grp-${date}-${++n}`;
      for (const m of members) groupIdFor.set(m, id);
    }
  }

  return instruments.map((i) => ({
    ...i,
    same_day_group_id: groupIdFor.get(i.instrument_number) ?? null,
  }));
}
```

- [ ] **Step 3: Run, verify pass**

- [ ] **Step 4: Apply at load time**

In `src/data-loader.ts` (or wherever instruments are normalized), call `inferSameDayGroups` on the instruments array after loading. Strip any hardcoded `same_day_group_id` from JSON; the inferrer is now authoritative.

- [ ] **Step 5: Confirm R1 rule still fires**

```bash
npm test -- tests/rules/r1.test.ts
```
Expected: PASS. R1 may want to consume inferred `same_day_group_id` directly; refactor if cleaner.

- [ ] **Step 6: Commit**

```bash
git add src/logic/same-day-group-inferrer.ts tests/same-day-group-inferrer.test.ts src/data-loader.ts src/data/instruments/
git commit -m "fix(s5): close Gap #9 — infer same-day groups at load time"
```

---

### Task 5: Gap #17 — EncumbranceLifecycle label resolver (CHECKPOINT 5)

**Files:**
- Modify: `src/components/EncumbranceLifecycle.tsx`

Goal: remove hardcoded `"DOT:"` / `"Deed of Trust"` strings in favor of a resolver keyed on `document_type` / `document_type_raw`.

- [ ] **Step 1: Write failing test that would have caught the hardcode**

Add to the existing `tests/encumbrance-lifecycle.dom.test.tsx`:

```typescript
it("renders label derived from document_type for subdivision plat lifecycles", () => {
  // Use a lifecycle whose root instrument is document_type: 'SUBDIVISION PLAT'
  // Assert heading renders 'Subdivision Plat:' not 'DOT:'
});
```

- [ ] **Step 2: Implement label resolver**

```typescript
// Inside EncumbranceLifecycle.tsx (or extract to src/logic/document-type-label.ts if shared)

const LABEL_BY_TYPE: Record<string, string> = {
  "DEED OF TRUST": "Deed of Trust",
  "DEED TRST": "Deed of Trust",
  "REL D/T": "Release",
  "DEED OF RELEASE & FULL RECONVEYANCE OF D/TR": "Release",
  "SUBDIVISION PLAT": "Subdivision Plat",
  "AFFIDAVIT OF CORRECTION": "Affidavit of Correction",
  "ASSIGNMENT OF DEED OF TRUST": "Assignment of DOT",
  "T FIN ST": "UCC Termination",
};

function labelFor(docType: string): string {
  return LABEL_BY_TYPE[docType.toUpperCase()] ?? docType;
}
```

- [ ] **Step 3: Run all tests**

- [ ] **Step 4: Commit**

```bash
git add src/components/EncumbranceLifecycle.tsx tests/encumbrance-lifecycle.dom.test.tsx
git commit -m "fix(s5): close Gap #17 — EncumbranceLifecycle label from document_type"
```

---

### Task 6: Gap #14 — localStorage persistence on examiner + link actions (CHECKPOINT 6)

**Files:**
- Modify: `src/hooks/useExaminerActions.ts`
- Modify: `src/hooks/useLinkActions.ts`

Goal: session-only becomes session-sticky. Keyed by `${apn}:${actor_stub}` so actions don't leak between parcels.

- [ ] **Step 1: Add a test for persistence**

Create `tests/examiner-actions-persistence.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useExaminerActions } from "../src/hooks/useExaminerActions";

describe("useExaminerActions persistence", () => {
  beforeEach(() => localStorage.clear());

  it("restores actions from localStorage on mount", () => {
    localStorage.setItem(
      "examiner-actions:304-78-386:default",
      JSON.stringify([{ kind: "note", target: "20210075858", text: "Reviewed" }]),
    );
    const { result } = renderHook(() => useExaminerActions({ apn: "304-78-386" }));
    expect(result.current.actions.length).toBe(1);
  });

  it("persists on append", () => {
    const { result } = renderHook(() => useExaminerActions({ apn: "304-78-386" }));
    act(() => result.current.append({ kind: "note", target: "20210075858", text: "Flag" }));
    const stored = JSON.parse(localStorage.getItem("examiner-actions:304-78-386:default")!);
    expect(stored.length).toBe(1);
  });
});
```

- [ ] **Step 2: Refactor hook**

Use `useEffect` to read localStorage on mount and `useEffect` with a dep on the actions array to write it back.

Do the same refactor on `useLinkActions` with key `link-actions:${apn}:default`.

- [ ] **Step 3: Run tests + smoke**

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useExaminerActions.ts src/hooks/useLinkActions.ts tests/examiner-actions-persistence.test.tsx
git commit -m "fix(s5): close Gap #14 — examiner + link actions persist to localStorage"
```

---

### Task 7: Tailwind semantic tokens + typography (CHECKPOINT 7)

**Files:**
- Modify: `tailwind.config.ts` (or `src/index.css` for v4 @theme)
- Modify: `src/index.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Define tokens**

In `src/index.css` (Tailwind v4 `@theme`):

```css
@theme {
  --color-recorder-50: #f1f5f9;
  --color-recorder-500: #475569;
  --color-recorder-900: #0f172a;

  --color-moat-50: #ecfdf5;
  --color-moat-500: #10b981;
  --color-moat-900: #064e3b;

  --color-provenance-api: #3b82f6;
  --color-provenance-ocr: #f59e0b;
  --color-provenance-curator: #8b5cf6;
  --color-provenance-algo: #64748b;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "Cascadia Code", monospace;
}
```

- [ ] **Step 2: Load fonts**

Add to `src/index.css`:

```css
@import url("https://rsms.me/inter/inter.css");
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap");
```

- [ ] **Step 3: Propagate mono font to recording numbers, APNs, legal IDs**

Add a `<span className="font-mono">` wrapper everywhere instrument numbers / APNs are rendered. Use grep to find candidates:

```bash
grep -rn "instrument_number\|apn\|recording_number" src/components
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css tailwind.config.ts src/App.tsx src/components
git commit -m "feat(s5): Tailwind semantic tokens + Inter/IBM Plex Mono typography"
```

---

### Task 8: Loading skeletons + empty states + error states (CHECKPOINT 8)

**Files:**
- Create: `src/components/Skeletons.tsx`
- Create: `src/components/EmptyStates.tsx`
- Create: `src/components/ErrorStates.tsx`

- [ ] **Step 1: Skeletons.tsx**

Export: `ChainSkeleton`, `EncumbranceSkeleton`, `MapSkeleton`, `PipelineSkeleton`, `WizardStepSkeleton`. Each renders pulsing placeholder bars matching the eventual layout.

- [ ] **Step 2: EmptyStates.tsx**

Export: `NotInCorpusParcel` (current implementation, consolidated), `NoSearchResults`, `NoAnomaliesFound`, `NoLifecyclesOpen`. Each includes a soft illustration (inline SVG, no external asset) and a "What would you like to do?" CTA.

- [ ] **Step 3: ErrorStates.tsx**

Export: `GISFetchFailure`, `InvalidAPN`, `CorpusLoadError`. Each shows a muted red icon and an actionable message referencing the cause.

- [ ] **Step 4: Wire skeletons into parent components**

Replace "loading" placeholders in Chain, Encumbrance, Map, Pipeline, Wizard.

- [ ] **Step 5: Commit**

```bash
git add src/components/Skeletons.tsx src/components/EmptyStates.tsx src/components/ErrorStates.tsx src/components
git commit -m "feat(s5): loading skeletons + empty states + error states"
```

---

### Task 9: Component polish pass (CHECKPOINT 9)

- [ ] **Step 1: Token substitution**

Replace hardcoded color hex values in component files with the semantic tokens defined in Task 7.

- [ ] **Step 2: Focus rings + transitions**

Ensure every interactive element has `focus-visible:ring-2 focus-visible:ring-moat-500`. Add `transition-colors duration-150` to buttons and links.

- [ ] **Step 3: Card elevation rhythm**

Apply a consistent `shadow-sm border border-recorder-50/40 rounded-lg` card treatment on: AnomalyPanel, SpatialContextPanel, PipelineDashboard stage cards, TransactionWizard steps.

- [ ] **Step 4: Dark-mode toggle (optional stretch)**

If time permits, add `prefers-color-scheme` listener + a manual toggle in App shell. Use Tailwind's `dark:` variants on tokens.

- [ ] **Step 5: Smoke across all routes**

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat(s5): component polish pass (focus rings, transitions, card rhythm)"
```

---

### Task 10: Landing hero copy refresh (CHECKPOINT 10)

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Replace hero headline + subhead**

```tsx
<h1 className="text-2xl font-semibold text-recorder-900">
  Maricopa County Recorder
</h1>
<p className="text-sm text-recorder-500">
  The county owns the record. Everyone else owns a copy.
</p>
```

- [ ] **Step 2: Add a three-pillar row below the map**

Three cards under the search box: "Spatial custody" / "Verified freshness" / "Chain intelligence" — each with one-line copy + link to the relevant surface (`/`, `/pipeline`, `/moat-compare`).

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(s5): landing hero copy aligned to home-run narrative"
```

---

### Task 11: /moat-compare update (CHECKPOINT 11)

**Files:**
- Modify: `src/components/MoatCompareRoute.tsx`
- Modify: `tests/moat-compare.dom.test.tsx`

Goal: add 4 new claim rows pulling from the new features.

- [ ] **Step 1: Extend the row list**

New rows:
1. "Spatial custody" — aggregator shows a blurry address match. We show the assessor polygon + parent-plat hunt log.
2. "Pipeline transparency" — aggregator says "current as of 2026-03-22". We show 5 verified-through dates per stage.
3. "Chain judgment" — aggregator shows document list. We surface 5 anomalies with severity + examiner action.
4. "Internal search flip" — aggregator cannot search by name. Our `/staff/search` demonstrates the capability the county has internally that plants cannot replicate.

- [ ] **Step 2: Update test file**

Add assertions for the 4 new row labels.

- [ ] **Step 3: Commit**

```bash
git add src/components/MoatCompareRoute.tsx tests/moat-compare.dom.test.tsx
git commit -m "feat(s5): /moat-compare adds 4 rows (spatial, pipeline, chain, internal search)"
```

---

### Task 12: Demo script + known-gaps + reproducing-the-demo (CHECKPOINT 12)

**Files:**
- Modify: `docs/demo-script.md`
- Modify: `docs/known-gaps.md`
- Modify: `docs/reproducing-the-demo.md`

- [ ] **Step 1: Rewrite demo script to 8-minute arc matching spec §7**

1. Public landing — map with county outline + 2 highlighted parcels (45s)
2. Click POPHAM polygon → Chain with spatial panel (60s)
3. Anomaly banner + R3 MERS / R4 assignment break (90s)
4. Transaction wizard → Schedule B-I live (90s)
5. `/staff/search` for "Popham" → cross-parcel + suppressed (60s)
6. HOGUE cross-parcel release hunt → honest zero (45s)
7. Pipeline banner — "4 days ahead of plant" (30s)
8. `/moat-compare` closer (30s)

Write each beat with: goal, action, one-liner to say, what to hover/click.

- [ ] **Step 2: known-gaps.md update**

Mark closed: #9, #14, #16, #17, #18, #19. For each closed gap, one-sentence note: "Closed in S5 via `<file>` / `<commit-sha>`." Keep the remaining 13 gaps in place and add 0–2 new entries if this stream introduced any.

- [ ] **Step 3: reproducing-the-demo.md update**

Add new routes to the reproduce checklist: `/county-activity`, `/pipeline`, `/staff`, `/staff/search`, `/staff/queue`, `/staff/parcel/:apn`, `/parcel/:apn/commitment/new`. Note the ArcGIS capture script is idempotent but the output files are checked in.

- [ ] **Step 4: Commit**

```bash
git add docs/demo-script.md docs/known-gaps.md docs/reproducing-the-demo.md
git commit -m "docs(s5): rewrite demo script, close 6 gaps, update reproduce guide"
```

---

### Task 13: Final integration + ready-to-merge (CHECKPOINT 13)

- [ ] **Step 1: Full suite**

```bash
npm test && npm run lint && npm run build
```

- [ ] **Step 2: Visual regression pass**

Open every new and modified route in Chrome + Firefox + mobile viewport (375px):
- `/` / `/county-activity` / `/parcel/304-78-386` / `/parcel/304-77-689` / `/parcel/:apn/encumbrances` / `/parcel/:apn/commitment/new` / `/pipeline` / `/staff` / `/staff/search` / `/staff/queue` / `/staff/parcel/:apn` / `/moat-compare`

Checklist per route:
- [ ] PipelineBanner renders at top
- [ ] Mono font on APNs + recording numbers
- [ ] Focus ring visible on tab
- [ ] At least one WHY tooltip present
- [ ] No console errors
- [ ] No layout breakage at 375px

- [ ] **Step 3: Verification**

Invoke `superpowers:verification-before-completion`.

- [ ] **Step 4: Code review**

Invoke `superpowers:requesting-code-review` on the whole stream. Address findings.

- [ ] **Step 5: Ready-to-merge**

```bash
git commit --allow-empty -m "chore(s5): ready to merge — CHECKPOINT 13 passed"
```

---

## Merge handoff

- Branch: `home-run/s5-hygiene-polish`
- Upstream dependencies: S1, S2, S3, S4 merged to integration branch first
- Merge order position: **last** (per spec §5.2)
- After merge, consolidator runs: `npm test && npm run lint && npm run build`, then final demo rehearsal.
