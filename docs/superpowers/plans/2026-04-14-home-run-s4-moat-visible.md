# S4 — Moat Made Visible (Staff Workbench + Pipeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two linked features that materialize the moat narrative. **S4A `/staff` Workbench** — `/staff` dashboard, `/staff/search` with name-filtered full-index search (flips Gap #2), `/staff/queue` curator action queue consuming S3 anomalies, `/staff/parcel/:apn` expanded view with suppressed-instrument visibility. The HOGUE cross-parcel release hunt surfaces an honest zero result (Decision #37). **S4B Pipeline Dashboard** — global 40px sticky freshness strip mounted in App shell, plus `/pipeline` full dashboard with per-stage verified-through history + SLA + plant-lag comparator.

**Architecture:** Staff routes live under `/staff/*` using the existing react-router v7 patterns. Full-index search is a pure function over `staff-index.json` (an expanded corpus including suppressed same-name instruments). Queue consumes anomalies via the same `detectAnomalies` function from S3A. Audit log is session-only ephemeral state. Pipeline banner is a self-contained component mounted once in `App.tsx`. Pipeline dashboard reads `pipeline-state.json`.

**Tech Stack:** React 19, react-router v7, Tailwind v4, vitest + @testing-library/react, TypeScript.

**Spec reference:** `docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md` §4.4.

**Sub-stream order:** 4B first (pipeline banner ships independently day one), then 4A (staff workbench consumes S3 anomaly output — stub on empty array if S3 hasn't merged).

---

## File Structure

Shared:
- Modify: `src/App.tsx` — mount PipelineBanner in shell

**S4B files (ship first):**
- Create: `src/data/pipeline-state.json` — current state + 30-day history
- Create: `src/components/PipelineBanner.tsx` — 40px sticky strip
- Create: `src/components/PipelineDashboard.tsx` — `/pipeline` full page
- Create: `src/logic/pipeline-selectors.ts` — pure selectors over state (TDD)
- Create: `tests/pipeline-selectors.test.ts` — TDD
- Create: `tests/pipeline-banner.dom.test.tsx`
- Modify: `src/router.tsx` — add `/pipeline`

**S4A files:**
- Create: `src/data/staff-index.json` — expanded corpus including suppressed same-name
- Create: `src/logic/staff-search.ts` — pure search + suppression logic (TDD)
- Create: `src/components/StaffWorkbench.tsx` — `/staff` dashboard
- Create: `src/components/NameFilteredSearch.tsx` — `/staff/search` UI
- Create: `src/components/CuratorQueue.tsx` — `/staff/queue` UI
- Create: `src/components/AuditLogPanel.tsx` — session audit log
- Create: `src/components/StaffParcelView.tsx` — `/staff/parcel/:apn`
- Create: `src/hooks/useAuditLog.ts` — session-only reducer
- Create: `tests/staff-search.test.ts` — TDD
- Create: `tests/curator-queue.dom.test.tsx`
- Create: `tests/cross-parcel-release-hunt.test.ts` — TDD for HOGUE zero-result
- Modify: `src/router.tsx` — add `/staff/*` routes

---

### Task 1: Worktree (CHECKPOINT 1)

- [ ] **Step 1: Create worktree**

From repo root:
```bash
git worktree add .claude/worktrees/home-run-s4-moat-visible -b home-run/s4-moat-visible claude/angry-buck
cd .claude/worktrees/home-run-s4-moat-visible
```

- [ ] **Step 2: Verify clean test baseline**

```bash
npm test && npm run build
```
Expected: all existing tests pass, clean build.

---

## S4B — Pipeline Dashboard (ship first)

### Task S4B.1: pipeline-state.json (CHECKPOINT S4B.1)

**Files:**
- Create: `src/data/pipeline-state.json`

- [ ] **Step 1: Write state**

Create `src/data/pipeline-state.json`:

```json
{
  "current": {
    "as_of": "2026-04-14T10:30:00-07:00",
    "stages": [
      { "stage_id": "index", "label": "County index", "verified_through": "2026-04-09", "docs_behind": 0, "sla_days": 1 },
      { "stage_id": "image", "label": "Image capture", "verified_through": "2026-04-09", "docs_behind": 34, "sla_days": 1 },
      { "stage_id": "ocr", "label": "OCR extraction", "verified_through": "2026-04-08", "docs_behind": 1247, "sla_days": 2 },
      { "stage_id": "entity_resolution", "label": "Entity resolution", "verified_through": "2026-04-07", "docs_behind": 2130, "sla_days": 3 },
      { "stage_id": "curator", "label": "Curator sign-off", "verified_through": "2026-04-05", "docs_behind": 3420, "sla_days": 5 }
    ]
  },
  "history_30d": [
    { "date": "2026-03-15", "index_vt": "2026-03-14", "ocr_vt": "2026-03-13", "curator_vt": "2026-03-10" },
    { "date": "2026-03-16", "index_vt": "2026-03-15", "ocr_vt": "2026-03-14", "curator_vt": "2026-03-11" },
    { "date": "2026-04-14", "index_vt": "2026-04-09", "ocr_vt": "2026-04-08", "curator_vt": "2026-04-05" }
  ],
  "plant_lag_reference": {
    "vendor": "typical_title_plant",
    "lag_days_min": 14,
    "lag_days_max": 28,
    "source_note": "Industry reporting; plant SLAs vary by market"
  }
}
```

Fill in the `history_30d` with 30 entries, each advancing one day. Verified-through dates trail by the stage SLA.

- [ ] **Step 2: Commit**

```bash
git add src/data/pipeline-state.json
git commit -m "feat(s4b): pipeline-state.json with 5-stage + 30-day history"
```

---

### Task S4B.2: pipeline-selectors TDD (CHECKPOINT S4B.2)

**Files:**
- Create: `src/logic/pipeline-selectors.ts`
- Create: `tests/pipeline-selectors.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  currentFreshness,
  laggingVsPlant,
  overSLAStages,
} from "../src/logic/pipeline-selectors";
import state from "../src/data/pipeline-state.json";

describe("currentFreshness", () => {
  it("returns index / ocr / curator verified-through dates", () => {
    const f = currentFreshness(state);
    expect(f.index).toBe("2026-04-09");
    expect(f.ocr).toBe("2026-04-08");
    expect(f.curator).toBe("2026-04-05");
  });
});

describe("laggingVsPlant", () => {
  it("computes days-ahead-of-plant using min plant lag vs index verified-through", () => {
    const result = laggingVsPlant(state, { referenceDate: "2026-04-14" });
    expect(result.days_ahead_of_min_plant_lag).toBeGreaterThanOrEqual(9);
  });
});

describe("overSLAStages", () => {
  it("flags stages where today - verified_through > sla_days", () => {
    const stages = overSLAStages(state, { referenceDate: "2026-04-14" });
    expect(stages.map((s) => s.stage_id)).toContain("curator");
  });
});
```

- [ ] **Step 2: Implement selectors**

```typescript
// src/logic/pipeline-selectors.ts
export interface PipelineStage {
  stage_id: string;
  label: string;
  verified_through: string; // YYYY-MM-DD
  docs_behind: number;
  sla_days: number;
}

export interface PipelineState {
  current: { as_of: string; stages: PipelineStage[] };
  history_30d: Array<{ date: string; index_vt: string; ocr_vt: string; curator_vt: string }>;
  plant_lag_reference: { vendor: string; lag_days_min: number; lag_days_max: number; source_note: string };
}

export function currentFreshness(state: PipelineState) {
  const stages = new Map(state.current.stages.map((s) => [s.stage_id, s.verified_through]));
  return {
    index: stages.get("index")!,
    ocr: stages.get("ocr")!,
    curator: stages.get("curator")!,
  };
}

export function laggingVsPlant(
  state: PipelineState,
  opts: { referenceDate?: string } = {},
): { days_ahead_of_min_plant_lag: number } {
  const ref = new Date(opts.referenceDate ?? state.current.as_of);
  const indexVT = new Date(currentFreshness(state).index);
  const indexLagDays = daysBetween(indexVT, ref);
  const plantMinLag = state.plant_lag_reference.lag_days_min;
  return { days_ahead_of_min_plant_lag: plantMinLag - indexLagDays };
}

export function overSLAStages(
  state: PipelineState,
  opts: { referenceDate?: string } = {},
): PipelineStage[] {
  const ref = new Date(opts.referenceDate ?? state.current.as_of);
  return state.current.stages.filter((s) => {
    const vt = new Date(s.verified_through);
    return daysBetween(vt, ref) > s.sla_days;
  });
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 3: Run, verify pass**

```bash
npm test -- tests/pipeline-selectors.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/logic/pipeline-selectors.ts tests/pipeline-selectors.test.ts
git commit -m "feat(s4b): pipeline-selectors with TDD (freshness, lag, over-SLA)"
```

---

### Task S4B.3: PipelineBanner component (CHECKPOINT S4B.3)

**Files:**
- Create: `src/components/PipelineBanner.tsx`
- Create: `tests/pipeline-banner.dom.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { PipelineBanner } from "../src/components/PipelineBanner";

describe("PipelineBanner", () => {
  afterEach(() => cleanup());

  it("renders index / ocr / curator verified-through dates", () => {
    render(<MemoryRouter><PipelineBanner /></MemoryRouter>);
    expect(screen.getByText(/indexed through 2026-04-09/i)).toBeInTheDocument();
    expect(screen.getByText(/OCR'd through 2026-04-08/i)).toBeInTheDocument();
    expect(screen.getByText(/curator-verified through 2026-04-05/i)).toBeInTheDocument();
  });

  it("links to /pipeline dashboard", () => {
    render(<MemoryRouter><PipelineBanner /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /pipeline/i })).toHaveAttribute("href", "/pipeline");
  });
});
```

- [ ] **Step 2: Implement PipelineBanner**

```typescript
// src/components/PipelineBanner.tsx
import { Link } from "react-router";
import { currentFreshness } from "../logic/pipeline-selectors";
import state from "../data/pipeline-state.json";
import type { PipelineState } from "../logic/pipeline-selectors";

export function PipelineBanner() {
  const f = currentFreshness(state as PipelineState);
  const docsAwaiting = (state.current.stages.find((s) => s.stage_id === "ocr")?.docs_behind ?? 0);

  return (
    <div className="h-10 bg-slate-900 text-slate-100 px-4 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-4">
        <span>County indexed through <strong>{f.index}</strong></span>
        <span className="text-slate-400">·</span>
        <span>OCR'd through <strong>{f.ocr}</strong></span>
        <span className="text-slate-400">·</span>
        <span>Curator-verified through <strong>{f.curator}</strong></span>
        <span className="text-slate-400">·</span>
        <span>{docsAwaiting.toLocaleString()} docs awaiting AI extraction</span>
      </div>
      <Link
        to="/pipeline"
        className="text-slate-300 hover:text-white underline underline-offset-2"
      >
        Pipeline →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Mount in App shell**

Modify `src/App.tsx`:

```typescript
import { PipelineBanner } from "./components/PipelineBanner";

// inside App's return, at the top of the main render tree:
return (
  <>
    <PipelineBanner />
    {/* existing app content */}
  </>
);
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/pipeline-banner.dom.test.tsx
```

- [ ] **Step 5: Smoke**

```bash
npm run dev
```
Every route should show the banner at top.

- [ ] **Step 6: Commit**

```bash
git add src/components/PipelineBanner.tsx tests/pipeline-banner.dom.test.tsx src/App.tsx
git commit -m "feat(s4b): PipelineBanner 40px sticky strip mounted in App shell"
```

---

### Task S4B.4: PipelineDashboard `/pipeline` page (CHECKPOINT S4B.4)

**Files:**
- Create: `src/components/PipelineDashboard.tsx`
- Modify: `src/router.tsx`
- Modify: `tests/routing.test.ts`

- [ ] **Step 1: Implement PipelineDashboard**

Create `src/components/PipelineDashboard.tsx` rendering:
- Hero: "Pipeline transparency" + current-as-of timestamp
- 5-stage cards: stage label, verified-through, docs_behind, SLA badge (green if within SLA, amber if over)
- 30-day history line chart (inline SVG, no chart library — 3 series: index_vt, ocr_vt, curator_vt)
- Plant comparator callout: "X days ahead of typical title plant (14–28 day lag)"
- Tooltip-on-title explaining: "Title plants publish one 'current as of' date. The county custodian states verified-through per stage..."

Use `overSLAStages` selector to drive amber badges.

- [ ] **Step 2: Add route + routing test**

Add to `src/router.tsx`:
```typescript
{ path: "/pipeline", element: <PipelineDashboard /> },
```

Add to `tests/routing.test.ts`:
```typescript
it("matches /pipeline", () => {
  const match = matchPath("/pipeline", routes);
  expect(match?.route.path).toBe("/pipeline");
});
```

- [ ] **Step 3: Run tests + smoke**

- [ ] **Step 4: Commit**

```bash
git add src/components/PipelineDashboard.tsx src/router.tsx tests/routing.test.ts
git commit -m "feat(s4b): /pipeline dashboard with stage cards + 30-day chart + plant comparator"
```

---

## S4A — Staff Workbench

### Task S4A.1: staff-index.json expanded corpus (CHECKPOINT S4A.1)

**Files:**
- Create: `src/data/staff-index.json`

- [ ] **Step 1: Write expanded index**

Include:
- All POPHAM + HOGUE curated instruments (from `src/data/instruments/`)
- The 3 HOGUE suppressed same-name instruments (parties match "HOGUE JASON" but belong to other parcels — flag with `suppressed_same_name_of: "304-77-689"`)
- ~10 synthetic additional instruments under names like "POPHAM C" / "POPHAM CHRIS" attributed to synthetic other parcels, to demonstrate entity-resolution breadth

Each entry shape:
```json
{
  "instrument_number": "20190001234",
  "recording_date": "2019-05-22",
  "document_type": "WAR DEED",
  "names": ["POPHAM CHRISTOPHER", "SMITH JANE"],
  "attributed_parcel_apn": "999-99-001",
  "suppressed_same_name_of": null
}
```

For the HOGUE suppressed entries, copy real same-name instruments noted in Decision #25.

- [ ] **Step 2: Commit**

```bash
git add src/data/staff-index.json
git commit -m "feat(s4a): staff-index.json expanded corpus including suppressed same-name"
```

---

### Task S4A.2: staff-search TDD (CHECKPOINT S4A.2)

**Files:**
- Create: `src/logic/staff-search.ts`
- Create: `tests/staff-search.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { searchByName, SearchResultGroup } from "../src/logic/staff-search";

describe("searchByName", () => {
  it("returns grouped results by attributed parcel", () => {
    const groups = searchByName("POPHAM");
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.some((g) => g.attributed_parcel_apn === "304-78-386")).toBe(true);
  });

  it("includes a distinct group for same-name candidates suppressed from public view", () => {
    const groups = searchByName("HOGUE");
    const suppressed = groups.find((g) => g.kind === "same_name_candidate");
    expect(suppressed).toBeDefined();
    expect(suppressed!.results.length).toBeGreaterThanOrEqual(1);
  });

  it("case-insensitive and partial-match", () => {
    const groups = searchByName("pop");
    const allNames = groups.flatMap((g) => g.results.map((r) => r.names)).flat();
    expect(allNames.some((n) => /POPHAM/i.test(n))).toBe(true);
  });

  it("returns empty array for no hits", () => {
    expect(searchByName("zzzz_no_match")).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement searchByName**

```typescript
// src/logic/staff-search.ts
import staffIndex from "../data/staff-index.json";

export interface StaffIndexRow {
  instrument_number: string;
  recording_date: string;
  document_type: string;
  names: string[];
  attributed_parcel_apn: string;
  suppressed_same_name_of: string | null;
}

export interface SearchResultGroup {
  kind: "attributed" | "same_name_candidate";
  attributed_parcel_apn: string;
  results: StaffIndexRow[];
}

export function searchByName(query: string): SearchResultGroup[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toUpperCase();
  const rows = staffIndex as StaffIndexRow[];
  const matched = rows.filter((r) => r.names.some((n) => n.toUpperCase().includes(q)));
  if (matched.length === 0) return [];

  const groups = new Map<string, SearchResultGroup>();
  for (const r of matched) {
    const key = r.suppressed_same_name_of
      ? `suppressed:${r.suppressed_same_name_of}`
      : `attributed:${r.attributed_parcel_apn}`;
    const existing = groups.get(key);
    if (existing) {
      existing.results.push(r);
    } else {
      groups.set(key, {
        kind: r.suppressed_same_name_of ? "same_name_candidate" : "attributed",
        attributed_parcel_apn: r.suppressed_same_name_of ?? r.attributed_parcel_apn,
        results: [r],
      });
    }
  }
  return [...groups.values()];
}
```

- [ ] **Step 3: Run, verify pass**

- [ ] **Step 4: Commit**

```bash
git add src/logic/staff-search.ts tests/staff-search.test.ts
git commit -m "feat(s4a): staff-search with grouped same-name-candidate flagging"
```

---

### Task S4A.3: Cross-parcel release hunt TDD (CHECKPOINT S4A.3)

**Files:**
- Create: `src/logic/cross-parcel-release-hunt.ts`
- Create: `tests/cross-parcel-release-hunt.test.ts`

Goal: for an open lifecycle, scan the full internal index for potential releases filed against the same party. Return honest zero for HOGUE `lc-003`.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { huntCrossParcelRelease } from "../src/logic/cross-parcel-release-hunt";

describe("huntCrossParcelRelease", () => {
  it("returns honest zero for HOGUE lc-003 (no release anywhere in corpus)", () => {
    const result = huntCrossParcelRelease({
      lifecycle_id: "lc-003",
      parcel_apn: "304-77-689",
      borrower_names: ["HOGUE JASON", "HOGUE MICHELE"],
    });
    expect(result.candidates).toEqual([]);
    expect(result.scanned_party_count).toBeGreaterThan(0);
    expect(result.verified_through).toBe("2026-04-05");
  });

  it("returns >=1 candidate if a release exists under a same-name party in another parcel", () => {
    // Configure staff-index.json fixture to include one such release
    const result = huntCrossParcelRelease({
      lifecycle_id: "lc-demo-synthetic",
      parcel_apn: "999-99-001",
      borrower_names: ["POPHAM CHRISTOPHER"],
    });
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Implement hunt function**

```typescript
// src/logic/cross-parcel-release-hunt.ts
import staffIndex from "../data/staff-index.json";
import pipelineState from "../data/pipeline-state.json";
import { currentFreshness } from "./pipeline-selectors";
import type { StaffIndexRow } from "./staff-search";

export interface HuntInput {
  lifecycle_id: string;
  parcel_apn: string;
  borrower_names: string[];
}

export interface HuntResult {
  lifecycle_id: string;
  scanned_party_count: number;
  candidates: StaffIndexRow[];
  verified_through: string;
}

const RELEASE_CODES = /RELEASE|RECONVEYANCE|REL D\/T/i;

export function huntCrossParcelRelease(input: HuntInput): HuntResult {
  const rows = staffIndex as StaffIndexRow[];
  const normalized = input.borrower_names.map((n) => n.toUpperCase());
  const matched = rows.filter(
    (r) =>
      RELEASE_CODES.test(r.document_type) &&
      r.names.some((n) => normalized.some((bn) => n.toUpperCase().includes(bn))) &&
      r.attributed_parcel_apn !== input.parcel_apn,
  );

  // Count distinct parties under that surname for "scanned X parties" output
  const surnames = new Set(normalized.map((n) => n.split(" ")[0]));
  const scannedPartyCount = rows.filter((r) =>
    r.names.some((n) => surnames.has(n.split(" ")[0]?.toUpperCase())),
  ).length;

  return {
    lifecycle_id: input.lifecycle_id,
    scanned_party_count: scannedPartyCount,
    candidates: matched,
    verified_through: currentFreshness(pipelineState).curator,
  };
}
```

- [ ] **Step 3: Run, verify pass**

- [ ] **Step 4: Commit**

```bash
git add src/logic/cross-parcel-release-hunt.ts tests/cross-parcel-release-hunt.test.ts
git commit -m "feat(s4a): cross-parcel release hunt with honest-zero for HOGUE lc-003"
```

---

### Task S4A.4: Audit log session-only hook (CHECKPOINT S4A.4)

**Files:**
- Create: `src/hooks/useAuditLog.ts`

- [ ] **Step 1: Implement hook**

```typescript
// src/hooks/useAuditLog.ts
import { useState, useCallback } from "react";

export interface AuditRow {
  timestamp: string; // ISO 8601
  actor: string;
  action: string;
  target: string;
  note?: string;
}

export function useAuditLog(): {
  rows: AuditRow[];
  append: (row: Omit<AuditRow, "timestamp">) => void;
  clear: () => void;
} {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const append = useCallback((row: Omit<AuditRow, "timestamp">) => {
    setRows((r) => [
      ...r,
      { ...row, timestamp: new Date().toISOString() },
    ]);
  }, []);
  const clear = useCallback(() => setRows([]), []);
  return { rows, append, clear };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAuditLog.ts
git commit -m "feat(s4a): useAuditLog session-only hook for staff queue actions"
```

---

### Task S4A.5: Staff UI components (CHECKPOINT S4A.5)

**Files:**
- Create: `src/components/StaffWorkbench.tsx`
- Create: `src/components/NameFilteredSearch.tsx`
- Create: `src/components/CuratorQueue.tsx`
- Create: `src/components/AuditLogPanel.tsx`
- Create: `src/components/StaffParcelView.tsx`
- Create: `tests/curator-queue.dom.test.tsx`

Goal: build all staff pages. Each page renders within a common staff shell that shows an amber "Staff preview (demo)" banner.

- [ ] **Step 1: Build StaffWorkbench (`/staff`)**

Dashboard showing: counts of open lifecycles, pending curator actions, current pipeline state summary, recent audit rows. Card layout.

- [ ] **Step 2: Build NameFilteredSearch (`/staff/search`)**

Search input → calls `searchByName(q)` → renders grouped results:
- "Attributed to Parcel NNN-NN-NNN" — normal group
- "Same-name candidates (suppressed from public view)" — amber warning banner above group

Each result: recording number (link to parcel view), date, doc type, names. Link to `/staff/parcel/:apn` or `/parcel/:apn` depending on parcel attribution.

- [ ] **Step 3: Build CuratorQueue (`/staff/queue`)**

Loads anomalies for all parcels in corpus. For each: severity badge, title, description, Accept / Reject buttons that append to audit log. AuditLogPanel shows below.

Write `tests/curator-queue.dom.test.tsx`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { CuratorQueue } from "../src/components/CuratorQueue";

describe("CuratorQueue", () => {
  afterEach(() => cleanup());

  it("renders anomalies for each parcel in corpus", async () => {
    render(<MemoryRouter><CuratorQueue /></MemoryRouter>);
    expect(await screen.findByText(/304-78-386/)).toBeInTheDocument();
    expect(await screen.findByText(/304-77-689/)).toBeInTheDocument();
  });

  it("accept button appends a row to the audit log", async () => {
    render(<MemoryRouter><CuratorQueue /></MemoryRouter>);
    const acceptButtons = await screen.findAllByRole("button", { name: /accept/i });
    fireEvent.click(acceptButtons[0]);
    expect(screen.getByText(/audit log/i)).toBeInTheDocument();
    expect(screen.getByText(/ACCEPTED/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Build AuditLogPanel**

Renders the audit rows from `useAuditLog`. Auto-scrolls to latest on append. Monospace, compact. Small footnote: "Production note: each row is a signed database entry with actor identity and matcher snapshot. This demo is session-only."

- [ ] **Step 5: Build StaffParcelView (`/staff/parcel/:apn`)**

Reuses the public ChainOfTitle but additionally:
- Shows suppressed same-name instruments as a collapsed panel with "Show suppressed (3)" button
- Shows internal attribution confidence on each instrument
- Shows "Run cross-parcel release hunt" button on each open lifecycle → calls `huntCrossParcelRelease` → renders result (`Scanned X parties — N matches`) + appends audit row

- [ ] **Step 6: Run tests**

- [ ] **Step 7: Commit**

```bash
git add src/components/StaffWorkbench.tsx src/components/NameFilteredSearch.tsx src/components/CuratorQueue.tsx src/components/AuditLogPanel.tsx src/components/StaffParcelView.tsx tests/curator-queue.dom.test.tsx
git commit -m "feat(s4a): staff workbench pages (dashboard, search, queue, parcel view, audit log)"
```

---

### Task S4A.6: Wire staff routes (CHECKPOINT S4A.6)

**Files:**
- Modify: `src/router.tsx`
- Modify: `tests/routing.test.ts`

- [ ] **Step 1: Add routes**

```typescript
{ path: "/staff", element: <StaffWorkbench /> },
{ path: "/staff/search", element: <NameFilteredSearch /> },
{ path: "/staff/queue", element: <CuratorQueue /> },
{ path: "/staff/parcel/:apn", element: <StaffParcelView /> },
```

- [ ] **Step 2: Add routing assertions**

```typescript
it("matches /staff", () => {
  const match = matchPath("/staff", routes);
  expect(match?.route.path).toBe("/staff");
});
it("matches /staff/parcel/:apn", () => {
  const match = matchPath("/staff/parcel/304-78-386", routes);
  expect(match?.route.path).toBe("/staff/parcel/:apn");
});
```

- [ ] **Step 3: Run tests + smoke**

Open `/staff` → dashboard. `/staff/search?q=Popham` → grouped results including suppressed. `/staff/queue` → anomalies across corpus. `/staff/parcel/304-77-689` → HOGUE view with "Run cross-parcel release hunt" button on lc-003.

- [ ] **Step 4: Commit**

```bash
git add src/router.tsx tests/routing.test.ts
git commit -m "feat(s4a): wire /staff/* routes"
```

---

### Task S4.Final: Integration smoke + ready-to-merge (CHECKPOINT S4.Final)

- [ ] **Step 1: Full suite**

```bash
npm test && npm run lint && npm run build
```

- [ ] **Step 2: Manual checklist**

- [ ] PipelineBanner appears on every route including `/`, `/parcel/:apn`, `/staff`, `/pipeline`
- [ ] PipelineBanner shows 3 dates + 1,247 docs awaiting
- [ ] `/pipeline` dashboard renders 5 stage cards (curator stage amber — over SLA)
- [ ] 30-day history chart visible
- [ ] Plant comparator "X days ahead" copy
- [ ] `/staff` dashboard loads with amber demo banner
- [ ] `/staff/search?q=Popham` → groups with "Same-name candidates (suppressed)" amber section
- [ ] `/staff/queue` → at least 5 anomalies visible
- [ ] Queue Accept → audit log appends a row with timestamp + target
- [ ] `/staff/parcel/304-77-689` → "Run cross-parcel release hunt" on lc-003 → result banner: "Scanned N parties — 0 matches"
- [ ] Each page has at least one WHY tooltip/caption

- [ ] **Step 3: Verification**

Invoke `superpowers:verification-before-completion`.

- [ ] **Step 4: Code review**

Invoke `superpowers:requesting-code-review`. Address findings.

- [ ] **Step 5: Ready-to-merge**

```bash
git commit --allow-empty -m "chore(s4): ready to merge — CHECKPOINT S4.Final passed"
```

---

## Merge handoff

- Branch: `home-run/s4-moat-visible`
- Upstream dependencies: **S3A** anomaly rules (queue consumes them)
- Merge order position: **S4B second, S4A fifth** (per spec §5.2). Consolidator may split — S4B has no S3 dependency and can ship as early as after S1.
- After merge, consolidator runs: `npm test && npm run lint && npm run build`.
