# Encumbrance Lifecycle Swimlane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Encumbrance Lifecycle page (`/parcel/:apn/encumbrances`) from a vertical card list into a horizontal swimlane diagram, one swimlane per lifecycle, with lc-001's MERS gap rendered as a structural break in the chain.

**Architecture:** A new `SwimlaneDiagram` component sorts the 6 lifecycles chronologically by root recording date and renders one `Swimlane` per lifecycle, sharing a single `TimeAxis` at the top (2001→2026, 5-year ticks). Each swimlane is inline SVG for the track and connectors + absolutely-positioned HTML for nodes, chips, and popovers. Pure layout math is extracted into `src/logic/swimlane-layout.ts`. Control surfaces (per-link Accept/Reject, lifecycle override) render as on-demand popovers and a quiet `⋯` menu — state model (`useExaminerActions`) unchanged.

**Tech Stack:** React 19, Vite, Tailwind v4, react-router v7, Vitest + Testing Library. Existing `TerminologyContext`, `computeLifecycleStatus`, `CandidateReleasesPanel`, `LinkEvidenceBars`, `AnomalyPanel`, `ExportCommitmentButton`, R3 anomaly rule.

---

## File Structure

**Create:**

- `src/logic/swimlane-layout.ts` — pure layout math: time-axis domain, node x-coordinate, same-day grouping, MERS gap detection, matcher slot state resolution.
- `src/logic/swimlane-layout.test.ts` — Vitest unit tests.
- `src/components/swimlane/SwimlaneDiagram.tsx` — page-level container: sorts lifecycles chronologically, shares the TimeAxis, owns candidate accept state.
- `src/components/swimlane/TimeAxis.tsx` — shared x-axis, year ticks, vertical grid lines.
- `src/components/swimlane/Swimlane.tsx` — single-lifecycle row: title, track, status rationale, matcher slot, citations row.
- `src/components/swimlane/InstrumentNode.tsx` — single or composite node (with ×N badge + back-ref chip).
- `src/components/swimlane/LinkConnector.tsx` — SVG line between two nodes with midpoint chevron + popover hit zone.
- `src/components/swimlane/MersCallout.tsx` — lc-001-only inline callout with three chips, content sourced from R3.
- `src/components/swimlane/CandidateMatcherSlot.tsx` — resolves expanded-fan vs expanded-empty vs collapsed-pill, delegates to existing `CandidateReleasesPanel` when expanded.
- `src/components/swimlane/CitationsRow.tsx` — `▸ N citations` toggle + expanded `Cited by` / `Cites` lists.
- `src/components/swimlane/OverrideMenu.tsx` — quiet `⋯` button opening a mini-menu with override buttons + status rationale.
- `src/components/swimlane/index.ts` — barrel export.

**Modify:**

- `src/components/EncumbranceLifecycle.tsx` — replace the lifecycle-loop body with `<SwimlaneDiagram>`. Keep the page header, `ExportCommitmentButton`, `MoatBanner` wrappers intact. Remove `labelForDocumentType`, `formatDotParties`, `MersAnnotation` (moved into swimlane components), and the candidate-action state (moved to `SwimlaneDiagram`).
- `src/terminology/glossary.ts` — add entries: `citation`, `citations`, `cites`, `cited by`, `back-reference`.

**Preserve (do not touch):**

- `src/components/CandidateReleasesPanel.tsx` — still called by `CandidateMatcherSlot` when expanded.
- `src/components/LinkEvidenceBars.tsx` — rendered inside link popovers and the lc-001 release-node popover.
- `src/components/InstrumentRow.tsx` — used in `OverrideMenu`'s expanded instrument detail.
- `src/components/StatusBadge.tsx`, `MoatBanner.tsx`, `ProvenanceTag.tsx`, `AnomalyPanel.tsx`, `ExportCommitmentButton.tsx`.
- `src/logic/lifecycle-status.ts`, `src/logic/release-candidate-matcher.ts`, `src/logic/party-roles.ts`, `src/logic/cross-parcel-release-hunt.ts`.
- `src/logic/rules/r3-mers-nominee.ts` (the MERS callout content source).
- `src/hooks/useExaminerActions.ts`.

---

## Task 1: Baseline verification

**Files:** none

- [ ] **Step 1: Confirm tests pass cold in worktree**

Run: `npm test`
Expected: 288 passing, 1 skipped, 0 failed. (The jsdom `navigation` warning is pre-existing noise; not a failure.)

- [ ] **Step 2: Confirm dev server builds**

Run: `npm run dev` (then Ctrl+C once "ready" appears)
Expected: Vite reports `ready in <Nms>` with no TypeScript errors.

- [ ] **Step 3: Open the page that will change and capture the before-state**

Navigate manually to `http://localhost:5173/parcel/304-78-386/encumbrances`, confirm all 6 lifecycle cards render as vertical list with MERS amber annotation on lc-001. Take a screenshot to `docs/screenshots/swimlane-before-lc-list.png` (create directory if missing). This is the reference point for verification.

---

## Task 2: Extract pure layout math (TDD)

**Files:**
- Create: `src/logic/swimlane-layout.ts`
- Create: `src/logic/swimlane-layout.test.ts`

- [ ] **Step 1: Write failing tests for `computeTimeAxisDomain`**

Create `src/logic/swimlane-layout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  computeTimeAxisDomain,
  computeNodeX,
  groupSameDayInstruments,
  resolveMatcherSlotState,
  detectMersGap,
} from "./swimlane-layout";
import type { Instrument } from "../types";
import type { AnomalyFinding } from "../types/anomaly";

function inst(n: string, date: string, overrides: Partial<Instrument> = {}): Instrument {
  return {
    instrument_number: n,
    recording_date: date,
    document_type: "deed_of_trust",
    document_type_raw: "DEED TRST",
    bundled_document_types: [],
    parties: [],
    back_references: [],
    source_image_path: `/x/${n}.pdf`,
    page_count: 1,
    raw_api_response: {
      names: [],
      documentCodes: [],
      recordingDate: date,
      recordingNumber: n,
      pageAmount: 1,
      docketBook: 0,
      pageMap: 0,
      affidavitPresent: false,
      affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "",
    ...overrides,
  } as Instrument;
}

describe("computeTimeAxisDomain", () => {
  it("spans from earliest to latest recording_date, snapped to year boundaries", () => {
    const instruments = [
      inst("a", "2001-02-07"),
      inst("b", "2013-02-27"),
      inst("c", "2021-01-22"),
    ];
    const [start, end] = computeTimeAxisDomain(instruments);
    expect(start).toBe("2001-01-01");
    expect(end).toBe("2022-01-01");
  });

  it("returns [null, null] for empty input", () => {
    expect(computeTimeAxisDomain([])).toEqual([null, null]);
  });
});
```

- [ ] **Step 2: Run to verify the tests fail**

Run: `npm test -- swimlane-layout`
Expected: FAIL — module `./swimlane-layout` not found.

- [ ] **Step 3: Implement `computeTimeAxisDomain`**

Create `src/logic/swimlane-layout.ts`:

```ts
import type { Instrument, DocumentLink, EncumbranceLifecycle } from "../types";
import type { AnomalyFinding } from "../types/anomaly";

export function computeTimeAxisDomain(
  instruments: Instrument[],
): [string, string] | [null, null] {
  if (instruments.length === 0) return [null, null];
  let minT = Infinity;
  let maxT = -Infinity;
  for (const i of instruments) {
    const t = new Date(i.recording_date).getTime();
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
  }
  const minYear = new Date(minT).getUTCFullYear();
  const maxYear = new Date(maxT).getUTCFullYear();
  return [`${minYear}-01-01`, `${maxYear + 1}-01-01`];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- swimlane-layout`
Expected: 2 passing.

- [ ] **Step 5: Add failing tests for `computeNodeX`**

Append to `swimlane-layout.test.ts`:

```ts
describe("computeNodeX", () => {
  it("places the domain start at x=0 and domain end at x=width", () => {
    expect(computeNodeX("2001-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(0);
    expect(computeNodeX("2022-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(1000);
  });

  it("places a midpoint date at x=width/2 (approx)", () => {
    const x = computeNodeX("2011-07-02", ["2001-01-01", "2022-01-01"], 1000);
    expect(x).toBeGreaterThan(495);
    expect(x).toBeLessThan(505);
  });

  it("clamps dates outside the domain", () => {
    expect(computeNodeX("1990-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(0);
    expect(computeNodeX("2030-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(1000);
  });
});
```

- [ ] **Step 6: Run to verify fail**

Run: `npm test -- swimlane-layout`
Expected: 3 new failing, `computeNodeX is not a function`.

- [ ] **Step 7: Implement `computeNodeX`**

Append to `swimlane-layout.ts`:

```ts
export function computeNodeX(
  date: string,
  domain: [string, string],
  pxWidth: number,
): number {
  const t = new Date(date).getTime();
  const t0 = new Date(domain[0]).getTime();
  const t1 = new Date(domain[1]).getTime();
  if (t <= t0) return 0;
  if (t >= t1) return pxWidth;
  return ((t - t0) / (t1 - t0)) * pxWidth;
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npm test -- swimlane-layout`
Expected: 5 passing.

- [ ] **Step 9: Add failing tests for `groupSameDayInstruments`**

Append:

```ts
describe("groupSameDayInstruments", () => {
  it("returns a single node when dates all differ", () => {
    const a = inst("a", "2013-02-27");
    const b = inst("b", "2015-07-17");
    expect(groupSameDayInstruments([a, b])).toEqual([
      { kind: "single", instrument: a },
      { kind: "single", instrument: b },
    ]);
  });

  it("collapses same-day instruments into a composite", () => {
    const a = inst("a", "2021-01-19");
    const b = inst("b", "2021-01-19");
    const result = groupSameDayInstruments([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      kind: "composite",
      date: "2021-01-19",
      instruments: [a, b],
    });
  });

  it("preserves order across mixed groups", () => {
    const a = inst("a", "2021-01-19");
    const b = inst("b", "2021-01-19");
    const c = inst("c", "2021-01-22");
    const result = groupSameDayInstruments([a, b, c]);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe("composite");
    expect(result[1].kind).toBe("single");
  });
});
```

- [ ] **Step 10: Run to verify fail**

Run: `npm test -- swimlane-layout`
Expected: 3 new failing.

- [ ] **Step 11: Implement `groupSameDayInstruments`**

Append:

```ts
export type SwimlaneNode =
  | { kind: "single"; instrument: Instrument }
  | { kind: "composite"; date: string; instruments: Instrument[] };

export function groupSameDayInstruments(instruments: Instrument[]): SwimlaneNode[] {
  const byDate = new Map<string, Instrument[]>();
  const order: string[] = [];
  for (const i of instruments) {
    const d = i.recording_date;
    if (!byDate.has(d)) {
      byDate.set(d, []);
      order.push(d);
    }
    byDate.get(d)!.push(i);
  }
  return order.map((d) => {
    const list = byDate.get(d)!;
    return list.length === 1
      ? { kind: "single", instrument: list[0] }
      : { kind: "composite", date: d, instruments: list };
  });
}
```

- [ ] **Step 12: Run to verify pass**

Run: `npm test -- swimlane-layout`
Expected: 8 passing.

- [ ] **Step 13: Add failing tests for `detectMersGap`**

Append:

```ts
describe("detectMersGap", () => {
  const baseFinding = (overrides: Partial<AnomalyFinding> = {}): AnomalyFinding => ({
    rule_id: "R3",
    parcel_apn: "304-78-386",
    severity: "medium",
    title: "MERS beneficiary",
    description: "DOT 20130183450 names MERS as beneficiary as nominee for V I P MORTGAGE INC. Release was executed by WELLS FARGO HOME MORTGAGE, not V I P MORTGAGE INC directly.",
    evidence_instruments: ["20130183450", "20210075858"],
    examiner_action: "x",
    detection_provenance: { rule_name: "R3", rule_version: "1.0", confidence: 0.9 },
    ...overrides,
  });

  it("returns the originator+releaser+evidence for an R3 finding on this DOT", () => {
    const finding = baseFinding();
    const gap = detectMersGap("20130183450", [finding]);
    expect(gap).toEqual({
      dot_instrument: "20130183450",
      release_instrument: "20210075858",
      originator: "V I P MORTGAGE INC",
      releaser: "WELLS FARGO HOME MORTGAGE",
      rule_finding: finding,
    });
  });

  it("returns null when no R3 finding references the DOT", () => {
    const finding = baseFinding({ evidence_instruments: ["20150516730", "xxx"] });
    expect(detectMersGap("20130183450", [finding])).toBeNull();
  });

  it("returns null when there are no findings at all", () => {
    expect(detectMersGap("20130183450", [])).toBeNull();
  });
});
```

- [ ] **Step 14: Run to verify fail**

Run: `npm test -- swimlane-layout`
Expected: 3 new failing.

- [ ] **Step 15: Implement `detectMersGap`**

Append:

```ts
export interface MersGap {
  dot_instrument: string;
  release_instrument: string;
  originator: string;
  releaser: string;
  rule_finding: AnomalyFinding;
}

const R3_DESC_RE =
  /names MERS as beneficiary as nominee for (.+?)\. Release was executed by (.+?), not/;

export function detectMersGap(
  dotInstrumentNumber: string,
  findings: AnomalyFinding[],
): MersGap | null {
  const finding = findings.find(
    (f) =>
      f.rule_id === "R3" &&
      f.evidence_instruments[0] === dotInstrumentNumber,
  );
  if (!finding) return null;
  const match = R3_DESC_RE.exec(finding.description);
  if (!match) return null;
  return {
    dot_instrument: dotInstrumentNumber,
    release_instrument: finding.evidence_instruments[1],
    originator: match[1],
    releaser: match[2],
    rule_finding: finding,
  };
}
```

- [ ] **Step 16: Run to verify pass**

Run: `npm test -- swimlane-layout`
Expected: 11 passing.

- [ ] **Step 17: Add failing tests for `resolveMatcherSlotState`**

Append:

```ts
describe("resolveMatcherSlotState", () => {
  it("returns 'closed' when the lifecycle has an accepted release", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 0,
        scannedPartyCount: 0,
        hasAcceptedRelease: true,
      }),
    ).toBe("closed");
  });

  it("returns 'expanded-fan' when rowsCount > 0 and open", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 2,
        scannedPartyCount: 47,
        hasAcceptedRelease: false,
      }),
    ).toBe("expanded-fan");
  });

  it("returns 'expanded-empty-with-scan' when rowsCount === 0 and scannedPartyCount > 0", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 0,
        scannedPartyCount: 47,
        hasAcceptedRelease: false,
      }),
    ).toBe("expanded-empty-with-scan");
  });

  it("returns 'collapsed-pill' when rowsCount === 0 and scannedPartyCount === 0", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 0,
        scannedPartyCount: 0,
        hasAcceptedRelease: false,
      }),
    ).toBe("collapsed-pill");
  });
});
```

- [ ] **Step 18: Run to verify fail**

Run: `npm test -- swimlane-layout`
Expected: 4 new failing.

- [ ] **Step 19: Implement `resolveMatcherSlotState`**

Append:

```ts
export type MatcherSlotState =
  | "closed"
  | "expanded-fan"
  | "expanded-empty-with-scan"
  | "collapsed-pill";

export interface ResolveMatcherSlotStateInput {
  rowsCount: number;
  scannedPartyCount: number;
  hasAcceptedRelease: boolean;
}

export function resolveMatcherSlotState(
  input: ResolveMatcherSlotStateInput,
): MatcherSlotState {
  if (input.hasAcceptedRelease) return "closed";
  if (input.rowsCount > 0) return "expanded-fan";
  if (input.scannedPartyCount > 0) return "expanded-empty-with-scan";
  return "collapsed-pill";
}
```

- [ ] **Step 20: Run to verify pass**

Run: `npm test -- swimlane-layout`
Expected: 15 passing.

- [ ] **Step 21: Commit**

```bash
git add src/logic/swimlane-layout.ts src/logic/swimlane-layout.test.ts
git commit -m "feat(swimlane): extract pure layout math with unit tests"
```

---

## Task 3: Extend glossary for citation terminology

**Files:**
- Modify: `src/terminology/glossary.ts`

- [ ] **Step 1: Add glossary entries**

Edit `src/terminology/glossary.ts`. Add the following keys to the `GLOSSARY` object (preserving existing entries, alphabetize where reasonable):

```ts
  "back-reference": "Citation",
  "back-references": "Citations",
  "citation": "Citation",
  "citations": "Citations",
  "cites": "Cites",
  "cited by": "Cited By",
  "inbound references": "Cited By",
  "outbound references": "Cites",
```

- [ ] **Step 2: Verify glossary unit test (if any) still passes**

Run: `npm test -- glossary`
Expected: any existing glossary tests pass (or no test file — also fine).

- [ ] **Step 3: Commit**

```bash
git add src/terminology/glossary.ts
git commit -m "feat(swimlane): glossary entries for citation terminology"
```

---

## Task 4: TimeAxis component

**Files:**
- Create: `src/components/swimlane/TimeAxis.tsx`

- [ ] **Step 1: Implement TimeAxis**

Create `src/components/swimlane/TimeAxis.tsx`:

```tsx
interface Props {
  domain: [string, string];
  widthPx: number;
  tickYears?: number[]; // absolute years to render ticks on
}

export function TimeAxis({ domain, widthPx, tickYears }: Props) {
  const startYear = new Date(domain[0]).getUTCFullYear();
  const endYear = new Date(domain[1]).getUTCFullYear();
  const defaultTicks: number[] = [];
  for (let y = Math.ceil(startYear / 5) * 5; y <= endYear; y += 5) {
    defaultTicks.push(y);
  }
  const ticks = tickYears ?? defaultTicks;
  const domainT0 = new Date(domain[0]).getTime();
  const domainT1 = new Date(domain[1]).getTime();

  return (
    <div
      className="relative select-none"
      style={{ width: widthPx, height: 28 }}
      aria-label={`Time axis from ${startYear} to ${endYear}`}
    >
      <div className="absolute left-0 right-0 top-[22px] h-px bg-slate-300" />
      {ticks.map((year) => {
        const t = new Date(`${year}-01-01`).getTime();
        const x = ((t - domainT0) / (domainT1 - domainT0)) * widthPx;
        return (
          <div key={year} className="absolute" style={{ left: x, top: 0 }}>
            <div className="text-[10px] font-medium text-slate-500 -translate-x-1/2">
              {year}
            </div>
            <div className="absolute top-[22px] h-1.5 w-px bg-slate-400 -translate-x-px" />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

Run: `npm run build 2>&1 | tail -20` (or `npx tsc --noEmit` if configured)
Expected: no TypeScript errors in the new file. If the project does not run `tsc` separately, skip to the next step; the Vite dev server will surface errors at runtime.

- [ ] **Step 3: Commit**

```bash
git add src/components/swimlane/TimeAxis.tsx
git commit -m "feat(swimlane): TimeAxis component"
```

---

## Task 5: InstrumentNode component

**Files:**
- Create: `src/components/swimlane/InstrumentNode.tsx`

Renders a node at a given x-position. Single instruments show a labeled marker; composite same-day groups show a stack badge with ×N. Clicking opens the proof drawer (via `onOpenDocument`). Outbound back-reference chip (`↗ cites lc-NNN`) renders when `backRefsTo.length > 0`.

- [ ] **Step 1: Implement InstrumentNode**

Create `src/components/swimlane/InstrumentNode.tsx`:

```tsx
import { useState } from "react";
import type { Instrument, DocumentType } from "../../types";
import { useTerminology } from "../../terminology/TerminologyContext";

const SHORT_LABEL: Record<DocumentType, string> = {
  warranty_deed: "Deed",
  special_warranty_deed: "Deed",
  quit_claim_deed: "Deed",
  grant_deed: "Deed",
  deed_of_trust: "DOT",
  heloc_dot: "HELOC",
  assignment_of_dot: "Assign.",
  substitution_of_trustee: "Sub.T.",
  full_reconveyance: "Release",
  partial_reconveyance: "Release",
  modification: "Mod.",
  ucc_termination: "UCC-3",
  affidavit_of_disclosure: "Affid.",
  other: "Doc",
};

interface BackRefChip {
  lifecycleId: string;
  onJump: () => void;
}

interface Props {
  xPx: number;
  kind: "single" | "composite";
  instrument?: Instrument; // set when kind === "single"
  instruments?: Instrument[]; // set when kind === "composite"
  date: string;
  onOpenDocument: (instrumentNumber: string) => void;
  backRefsOut: BackRefChip[]; // outbound citations on this node
  isMersGapEnd?: "dot" | "release";
}

export function InstrumentNode({
  xPx,
  kind,
  instrument,
  instruments,
  date,
  onOpenDocument,
  backRefsOut,
  isMersGapEnd,
}: Props) {
  const { t } = useTerminology();
  const [expanded, setExpanded] = useState(false);

  if (kind === "composite" && instruments) {
    const count = instruments.length;
    return (
      <div
        className="absolute -translate-x-1/2 flex flex-col items-center"
        style={{ left: xPx, top: 0 }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="relative w-7 h-7 rounded-full bg-slate-700 text-white text-[11px] font-bold grid place-items-center shadow-sm hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          aria-label={`${count} same-day instruments recorded ${date}`}
          title={`${count} instruments · ${date}`}
        >
          ×{count}
        </button>
        <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{date}</div>
        {expanded && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 bg-white border border-slate-200 rounded shadow-md p-2 min-w-[220px]">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              Same-day transaction
            </div>
            {instruments.map((i) => (
              <button
                key={i.instrument_number}
                onClick={() => onOpenDocument(i.instrument_number)}
                className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded"
              >
                <div className="font-mono text-xs text-blue-700">{i.instrument_number}</div>
                <div className="text-[11px] text-slate-600">
                  {t(SHORT_LABEL[i.document_type])}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (kind === "single" && instrument) {
    const label = t(SHORT_LABEL[instrument.document_type]);
    const ringClass =
      isMersGapEnd === "dot"
        ? "ring-2 ring-amber-400"
        : isMersGapEnd === "release"
          ? "ring-2 ring-amber-400"
          : "";
    return (
      <div
        className="absolute -translate-x-1/2 flex flex-col items-center"
        style={{ left: xPx, top: 0 }}
      >
        <button
          onClick={() => onOpenDocument(instrument.instrument_number)}
          className={`w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-semibold grid place-items-center shadow-sm hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${ringClass}`}
          aria-label={`${label} ${instrument.instrument_number} recorded ${instrument.recording_date}`}
          title={`${label} · ${instrument.instrument_number}`}
        >
          {label.slice(0, 3)}
        </button>
        <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
          {instrument.recording_date}
        </div>
        {backRefsOut.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {backRefsOut.map((chip) => (
              <button
                key={chip.lifecycleId}
                onClick={chip.onJump}
                className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                title={`Jump to ${chip.lifecycleId}`}
              >
                ↗ {t("cites")} {chip.lifecycleId}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swimlane/InstrumentNode.tsx
git commit -m "feat(swimlane): InstrumentNode with composite groups + back-ref chips"
```

---

## Task 6: LinkConnector component

**Files:**
- Create: `src/components/swimlane/LinkConnector.tsx`

Renders an SVG line between two node x-positions inside a swimlane's track. Solid for confirmed links, dashed for unresolved. A midpoint chevron acts as the popover trigger; the full 16px-tall hit zone is a transparent overlay.

- [ ] **Step 1: Implement LinkConnector**

Create `src/components/swimlane/LinkConnector.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import type { DocumentLink, Instrument, ExaminerAction } from "../../types";
import { ProvenanceTag } from "../ProvenanceTag";
import { LinkEvidenceBars } from "../LinkEvidenceBars";

interface Props {
  startX: number;
  endX: number;
  yCenter: number; // vertical centerline of the track, used by the SVG
  style: "solid" | "dashed";
  link: DocumentLink;
  linkActions: Record<string, ExaminerAction>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  dot?: Instrument;
  release?: Instrument;
  curated: boolean; // Decision #41 — curated links render evidence but no Accept/Reject
}

export function LinkConnector({
  startX,
  endX,
  yCenter,
  style,
  link,
  linkActions,
  onSetLinkAction,
  dot,
  release,
  curated,
}: Props) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const midX = (startX + endX) / 2;
  const dashArray = style === "dashed" ? "4 3" : undefined;
  const current = linkActions[link.id] ?? link.examiner_action;

  return (
    <>
      {/* SVG line — rendered by the parent <svg>; we just emit the path here. */}
      <line
        x1={startX}
        y1={yCenter}
        x2={endX}
        y2={yCenter}
        stroke="#64748b"
        strokeWidth={2}
        strokeDasharray={dashArray}
      />
      {/* Hit zone + midpoint chevron (absolutely positioned; lives outside the SVG) */}
      <div
        className="absolute cursor-pointer"
        style={{
          left: Math.min(startX, endX),
          top: yCenter - 8,
          width: Math.abs(endX - startX),
          height: 16,
        }}
        onClick={() => setOpen((o) => !o)}
        title="Link details"
      />
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500 text-[10px] leading-none grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        style={{ left: midX, top: yCenter }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${link.link_type.replace(/_/g, " ")} link details`}
      >
        i
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-20 bg-white border border-slate-200 rounded shadow-lg p-3 w-72"
          style={{ left: midX, top: yCenter + 16 }}
          role="dialog"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
              {link.link_type.replace(/_/g, " ")}
            </div>
            <ProvenanceTag provenance={link.provenance} confidence={link.confidence} />
          </div>
          {dot && release && link.link_type === "release_of" && (
            <LinkEvidenceBars dot={dot} release={release} />
          )}
          {!curated && (
            <div className="flex gap-1 mt-2">
              {(["accepted", "rejected", "unresolved"] as const).map((action) => {
                const isActive = current === action;
                const palette = {
                  accepted: isActive ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-green-100 text-gray-700",
                  rejected: isActive ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-red-100 text-gray-700",
                  unresolved: isActive ? "bg-amber-600 text-white" : "bg-gray-100 hover:bg-amber-100 text-gray-700",
                }[action];
                return (
                  <button
                    key={action}
                    onClick={() => onSetLinkAction(link.id, action)}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${palette}`}
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                );
              })}
            </div>
          )}
          {curated && (
            <div className="text-[10px] text-slate-500 mt-2 italic">
              Curated link. See Decision #41 — no inline unlink.
            </div>
          )}
        </div>
      )}
    </>
  );
}
```

Note: the `<line>` is intended to be emitted inside a parent `<svg>`. The parent (Swimlane) will render connectors in two passes: first an `<svg>` for the `<line>` elements, then HTML elements overlaid for the hit zones and popovers. See Task 9 for how Swimlane composes them — connectors actually expose two sub-components (`LinkConnectorLine` for the SVG line and `LinkConnectorOverlay` for the hit zone / popover). Refactor this component before Task 9 if the single-component approach is awkward; acceptable either way since both call sites live inside `Swimlane`.

- [ ] **Step 2: Commit**

```bash
git add src/components/swimlane/LinkConnector.tsx
git commit -m "feat(swimlane): LinkConnector with popover and hit zone"
```

---

## Task 7: MersCallout component

**Files:**
- Create: `src/components/swimlane/MersCallout.tsx`

Renders the lc-001 inline callout. Content driven by `MersGap` from `swimlane-layout.ts`. Three chips side by side; recorded chips are solid, MERS chip is dashed+muted with chain-break icon.

- [ ] **Step 1: Implement MersCallout**

Create `src/components/swimlane/MersCallout.tsx`:

```tsx
import type { MersGap } from "../../logic/swimlane-layout";

interface Props {
  gap: MersGap;
  xPx: number; // midpoint x between DOT and release
  yCenter: number;
}

export function MersCallout({ gap, xPx, yCenter }: Props) {
  return (
    <div
      className="absolute -translate-x-1/2 bg-white border border-amber-300 rounded shadow-sm px-2 py-1.5 z-10"
      style={{ left: xPx, top: yCenter - 30, width: 200 }}
      role="note"
      aria-label={gap.rule_finding.title}
    >
      <div className="text-[9px] uppercase tracking-wide text-amber-700 font-semibold mb-1">
        ⚠ Unrecorded transfer
      </div>
      <div className="flex items-center gap-1 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap truncate" title={gap.originator}>
          {gap.originator}
        </span>
        <span className="text-slate-400" aria-hidden>→</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-dashed border-amber-400 whitespace-nowrap" title="Note transferred via MERS outside the public record">
          ⛓ MERS
        </span>
        <span className="text-slate-400" aria-hidden>→</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap truncate" title={gap.releaser}>
          {gap.releaser}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swimlane/MersCallout.tsx
git commit -m "feat(swimlane): MersCallout sourced from R3 finding"
```

---

## Task 8: CandidateMatcherSlot component

**Files:**
- Create: `src/components/swimlane/CandidateMatcherSlot.tsx`

Wraps `CandidateReleasesPanel`. Owns the expanded/collapsed pill state. Computes slot state via `resolveMatcherSlotState`. Attached to the right edge of the open swimlane track — visually it is a dashed connector extending from the last node out to the matcher panel.

- [ ] **Step 1: Implement CandidateMatcherSlot**

Create `src/components/swimlane/CandidateMatcherSlot.tsx`:

```tsx
import { useMemo, useState } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
} from "../../types";
import {
  buildCandidateRows,
  type CandidateAction,
} from "../../logic/release-candidate-matcher";
import { resolveMatcherSlotState } from "../../logic/swimlane-layout";
import { CandidateReleasesPanel } from "../CandidateReleasesPanel";

interface Props {
  lifecycleId: string;
  dot: Instrument;
  parcel: Parcel;
  pool: Instrument[];
  releaseLinks: DocumentLink[];
  lifecycles: LifecycleType[];
  candidateActions: Record<string, CandidateAction>;
  onSetCandidateAction: (
    key: string,
    action: CandidateAction,
    candidate: Instrument,
    score: number,
  ) => void;
  onOpenDocument: (n: string) => void;
  hasAcceptedRelease: boolean;
  scannedPartyCount: number; // from huntCrossParcelRelease; 0 when no scan was run
}

export function CandidateMatcherSlot(props: Props) {
  const [forceExpanded, setForceExpanded] = useState(false);

  const { rows, total, aboveThresholdCount } = useMemo(
    () =>
      buildCandidateRows({
        lifecycleId: props.lifecycleId,
        dot: props.dot,
        pool: props.pool,
        releaseLinks: props.releaseLinks,
        lifecycles: props.lifecycles,
        candidateActions: props.candidateActions,
      }),
    [
      props.lifecycleId,
      props.dot,
      props.pool,
      props.releaseLinks,
      props.lifecycles,
      props.candidateActions,
    ],
  );

  const slotState = resolveMatcherSlotState({
    rowsCount: rows.length,
    scannedPartyCount: props.scannedPartyCount,
    hasAcceptedRelease: props.hasAcceptedRelease,
  });

  if (slotState === "closed") return null;

  if (slotState === "collapsed-pill" && !forceExpanded) {
    return (
      <button
        onClick={() => setForceExpanded(true)}
        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-100 hover:bg-indigo-100"
      >
        Matcher · scanned {total} instrument{total === 1 ? "" : "s"} · {aboveThresholdCount} above threshold · Expand →
      </button>
    );
  }

  return (
    <CandidateReleasesPanel
      lifecycleId={props.lifecycleId}
      dot={props.dot}
      parcel={props.parcel}
      pool={props.pool}
      releaseLinks={props.releaseLinks}
      lifecycles={props.lifecycles}
      candidateActions={props.candidateActions}
      onSetCandidateAction={props.onSetCandidateAction}
      onOpenDocument={props.onOpenDocument}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swimlane/CandidateMatcherSlot.tsx
git commit -m "feat(swimlane): CandidateMatcherSlot with data-driven slot state"
```

---

## Task 9: CitationsRow component

**Files:**
- Create: `src/components/swimlane/CitationsRow.tsx`

Small toggle row below the swimlane track. Only renders when there is at least one inbound or outbound back-reference. Shows `▸ N citations` → expands into labeled `Cited by` and `Cites` sections with jump buttons that emit a `lifecycleId` to the parent.

- [ ] **Step 1: Implement CitationsRow**

Create `src/components/swimlane/CitationsRow.tsx`:

```tsx
import { useState } from "react";
import { useTerminology } from "../../terminology/TerminologyContext";

export interface CitationEntry {
  citingInstrument: string;
  targetLifecycleId: string;
  targetInstruments: string[]; // multi-target same citing instrument, e.g., plat + affidavit
}

interface Props {
  inbound: CitationEntry[]; // who cites us
  outbound: CitationEntry[]; // who we cite
  onJump: (lifecycleId: string) => void;
}

export function CitationsRow({ inbound, outbound, onJump }: Props) {
  const { t } = useTerminology();
  const [expanded, setExpanded] = useState(false);
  const total = inbound.length + outbound.length;
  if (total === 0) return null;
  const label = `${total} ${t(total === 1 ? "citation" : "citations")}`;

  return (
    <div className="border-t border-slate-100 mt-2 pt-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
        aria-expanded={expanded}
      >
        <span>{expanded ? "▾" : "▸"}</span>
        <span>{label}</span>
      </button>
      {expanded && (
        <div className="mt-1 pl-4 space-y-1 text-[11px]">
          {inbound.length > 0 && (
            <div>
              <span className="font-medium text-slate-600">{t("cited by")}: </span>
              {inbound.map((c, i) => (
                <span key={`${c.citingInstrument}-${i}`}>
                  {i > 0 && ", "}
                  <button
                    onClick={() => onJump(c.targetLifecycleId)}
                    className="font-mono text-blue-700 hover:underline"
                  >
                    {c.citingInstrument} in {c.targetLifecycleId}
                    {c.targetInstruments.length > 1 && ` (×${c.targetInstruments.length})`}
                  </button>
                </span>
              ))}
            </div>
          )}
          {outbound.length > 0 && (
            <div>
              <span className="font-medium text-slate-600">{t("cites")}: </span>
              {outbound.map((c, i) => (
                <span key={`${c.citingInstrument}-${i}`}>
                  {i > 0 && ", "}
                  <button
                    onClick={() => onJump(c.targetLifecycleId)}
                    className="font-mono text-blue-700 hover:underline"
                  >
                    {c.targetLifecycleId}
                    {c.targetInstruments.length > 1 && ` (×${c.targetInstruments.length})`}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swimlane/CitationsRow.tsx
git commit -m "feat(swimlane): CitationsRow with inbound/outbound citation groups"
```

---

## Task 10: OverrideMenu component

**Files:**
- Create: `src/components/swimlane/OverrideMenu.tsx`

Quiet `⋯` button that opens a mini-menu with the three lifecycle override buttons and the status rationale text.

- [ ] **Step 1: Implement OverrideMenu**

Create `src/components/swimlane/OverrideMenu.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import type { LifecycleStatus } from "../../types";

interface Props {
  currentOverride: LifecycleStatus | null;
  statusRationale: string;
  onSetOverride: (s: LifecycleStatus) => void;
}

export function OverrideMenu({
  currentOverride,
  statusRationale,
  onSetOverride,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-6 h-6 grid place-items-center rounded text-slate-300 hover:text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Examiner overrides"
        title="Examiner overrides"
      >
        <span className="text-lg leading-none">⋯</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded shadow-lg p-3 w-64"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
            Override status
          </div>
          <div className="flex gap-1 mb-3">
            {(["open", "released", "unresolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onSetOverride(s)}
                className={`px-2 py-1 rounded text-[11px] font-medium ${
                  currentOverride === s
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
            Status rationale
          </div>
          <div className="text-[11px] text-slate-600 leading-snug">
            {statusRationale}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swimlane/OverrideMenu.tsx
git commit -m "feat(swimlane): OverrideMenu with quiet dot-dot-dot trigger"
```

---

## Task 11: Swimlane component

**Files:**
- Create: `src/components/swimlane/Swimlane.tsx`

Assembles one lifecycle row: title bar with status badge + override menu, SVG track with connectors + callout + nodes, status rationale, matcher slot, citations row.

- [ ] **Step 1: Implement Swimlane**

Create `src/components/swimlane/Swimlane.tsx`:

```tsx
import { useMemo } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  LifecycleStatus,
  ExaminerAction,
  DocumentType,
} from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { StatusBadge } from "../StatusBadge";
import { InstrumentNode } from "./InstrumentNode";
import { LinkConnector } from "./LinkConnector";
import { MersCallout } from "./MersCallout";
import { CandidateMatcherSlot } from "./CandidateMatcherSlot";
import { CitationsRow, type CitationEntry } from "./CitationsRow";
import { OverrideMenu } from "./OverrideMenu";
import {
  computeNodeX,
  groupSameDayInstruments,
  detectMersGap,
} from "../../logic/swimlane-layout";
import {
  computeLifecycleStatus,
  resolveLifecycleStatus,
} from "../../logic/lifecycle-status";
import {
  synthesizeAlgorithmicLink,
  buildAcceptedRationale,
  type CandidateAction,
} from "../../logic/release-candidate-matcher";
import { useTerminology } from "../../terminology/TerminologyContext";

function rootLabel(docType: DocumentType): string {
  switch (docType) {
    case "deed_of_trust":
    case "heloc_dot":
      return "DOT";
    case "full_reconveyance":
    case "partial_reconveyance":
      return "Release";
    case "assignment_of_dot":
      return "Assignment";
    case "modification":
      return "Modification";
    case "other":
      return "Doc";
    default:
      return "Doc";
  }
}

interface Props {
  lifecycle: LifecycleType;
  parcel: Parcel;
  instruments: Instrument[];
  allInstruments: Instrument[]; // full corpus for matcher pool
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  domain: [string, string];
  trackWidthPx: number;
  findings: AnomalyFinding[];
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  candidateActions: Record<string, CandidateAction>;
  acceptedCandidate: { instrumentNumber: string; score: number } | null;
  inboundCitations: CitationEntry[];
  outboundCitations: Map<string, CitationEntry[]>; // keyed by citing instrument_number
  scannedPartyCount: number;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (id: string, s: LifecycleStatus) => void;
  onSetCandidateAction: (
    key: string,
    action: CandidateAction,
    candidate: Instrument,
    score: number,
  ) => void;
  onOpenDocument: (n: string) => void;
  onJumpLifecycle: (lifecycleId: string) => void;
  flashing: boolean;
}

const TRACK_HEIGHT = 60;
const Y_CENTER = 30;

export function Swimlane(props: Props) {
  const { t } = useTerminology();
  const instrumentMap = useMemo(
    () => new Map(props.instruments.map((i) => [i.instrument_number, i])),
    [props.instruments],
  );
  const rootInst = instrumentMap.get(props.lifecycle.root_instrument);
  if (!rootInst) return null;

  const childInsts = props.lifecycle.child_instruments
    .map((n) => instrumentMap.get(n))
    .filter(Boolean) as Instrument[];

  const accepted = props.acceptedCandidate;
  const acceptedInst = accepted
    ? instrumentMap.get(accepted.instrumentNumber)
    : undefined;

  const relatedLinks = props.links.filter(
    (l) =>
      l.target_instrument === props.lifecycle.root_instrument ||
      l.source_instrument === props.lifecycle.root_instrument,
  );
  const releaseLinks = relatedLinks.filter((l) => l.link_type === "release_of");

  const syntheticLink =
    accepted && acceptedInst
      ? synthesizeAlgorithmicLink({
          lifecycleId: props.lifecycle.id,
          dot: rootInst,
          candidate: acceptedInst,
          score: accepted.score,
        })
      : null;
  const mergedReleaseLinks = syntheticLink
    ? [...releaseLinks, syntheticLink]
    : releaseLinks;

  const computed = computeLifecycleStatus(
    rootInst,
    acceptedInst ? [...childInsts, acceptedInst] : childInsts,
    mergedReleaseLinks.map((l) => ({
      ...l,
      examiner_action: props.linkActions[l.id] ?? l.examiner_action,
    })),
  );
  const override = props.lifecycleOverrides[props.lifecycle.id] ?? null;
  const resolved = resolveLifecycleStatus(computed, override);
  const rationale =
    accepted && override === null
      ? buildAcceptedRationale(accepted.score)
      : resolved.status_rationale;

  const trackChildren: Instrument[] = [
    ...childInsts,
    ...(acceptedInst ? [acceptedInst] : []),
  ];
  const nodes = groupSameDayInstruments([rootInst, ...trackChildren]);

  const findings = props.findings;
  const mersGap = detectMersGap(rootInst.instrument_number, findings);

  const domain = props.domain;
  const widthPx = props.trackWidthPx;

  // Pool for matcher: all full/partial reconveyances across the corpus.
  const reconveyancePool = useMemo(
    () =>
      props.allInstruments.filter(
        (i) =>
          i.document_type === "full_reconveyance" ||
          i.document_type === "partial_reconveyance",
      ),
    [props.allInstruments],
  );

  const hasAcceptedRelease = Boolean(
    releaseLinks.some(
      (l) =>
        (props.linkActions[l.id] ?? l.examiner_action) === "accepted",
    ) || accepted,
  );

  const flashClass = props.flashing
    ? "ring-2 ring-amber-400 transition-[box-shadow] duration-700 motion-reduce:transition-none"
    : "";

  return (
    <section
      id={props.lifecycle.id}
      aria-labelledby={`${props.lifecycle.id}-title`}
      className={`bg-white border border-slate-200 rounded-lg mb-3 ${flashClass}`}
    >
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={resolved.status} overridden={override !== null} />
          <span id={`${props.lifecycle.id}-title`} className="font-semibold text-slate-800">
            {t(rootLabel(rootInst.document_type))}: <span className="font-mono">{rootInst.instrument_number}</span>
          </span>
          <span className="text-[11px] text-slate-500 truncate">
            {props.lifecycle.id}
          </span>
        </div>
        <OverrideMenu
          currentOverride={override}
          statusRationale={rationale}
          onSetOverride={(s) => props.onSetLifecycleOverride(props.lifecycle.id, s)}
        />
      </div>

      <div className="relative px-3" style={{ height: TRACK_HEIGHT }}>
        <svg
          className="absolute inset-0"
          width="100%"
          height={TRACK_HEIGHT}
          aria-hidden
        >
          {/* Baseline track */}
          <line
            x1={0}
            x2={widthPx}
            y1={Y_CENTER}
            y2={Y_CENTER}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          {/* Link lines */}
          {nodes.map((n, i) => {
            if (i === 0) return null;
            const prev = nodes[i - 1];
            const prevDate =
              prev.kind === "single" ? prev.instrument.recording_date : prev.date;
            const curDate =
              n.kind === "single" ? n.instrument.recording_date : n.date;
            const startX = computeNodeX(prevDate, domain, widthPx);
            const endX = computeNodeX(curDate, domain, widthPx);
            const style = mersGap && i === nodes.length - 1 ? "dashed" : "solid";
            return (
              <line
                key={i}
                x1={startX}
                x2={endX}
                y1={Y_CENTER}
                y2={Y_CENTER}
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray={style === "dashed" ? "4 3" : undefined}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((n) => {
          const date = n.kind === "single" ? n.instrument.recording_date : n.date;
          const x = computeNodeX(date, domain, widthPx);
          const isMersRoot =
            mersGap && n.kind === "single" && n.instrument.instrument_number === mersGap.dot_instrument;
          const isMersRelease =
            mersGap && n.kind === "single" && n.instrument.instrument_number === mersGap.release_instrument;
          const backRefs =
            n.kind === "single"
              ? props.outboundCitations.get(n.instrument.instrument_number) ?? []
              : [];
          return (
            <InstrumentNode
              key={n.kind === "single" ? n.instrument.instrument_number : date}
              xPx={x}
              kind={n.kind}
              instrument={n.kind === "single" ? n.instrument : undefined}
              instruments={n.kind === "composite" ? n.instruments : undefined}
              date={date}
              onOpenDocument={props.onOpenDocument}
              backRefsOut={backRefs.map((c) => ({
                lifecycleId: c.targetLifecycleId,
                onJump: () => props.onJumpLifecycle(c.targetLifecycleId),
              }))}
              isMersGapEnd={
                isMersRoot ? "dot" : isMersRelease ? "release" : undefined
              }
            />
          );
        })}

        {/* MERS callout */}
        {mersGap && (() => {
          const x1 = computeNodeX(rootInst.recording_date, domain, widthPx);
          const releaseInst = instrumentMap.get(mersGap.release_instrument);
          if (!releaseInst) return null;
          const x2 = computeNodeX(releaseInst.recording_date, domain, widthPx);
          return <MersCallout gap={mersGap} xPx={(x1 + x2) / 2} yCenter={Y_CENTER} />;
        })()}
      </div>

      <div className="px-3 pt-1 pb-2">
        <div className="text-xs italic text-slate-500">{rationale}</div>
        {rootInst.document_type === "deed_of_trust" && (
          <div className="mt-2">
            <CandidateMatcherSlot
              lifecycleId={props.lifecycle.id}
              dot={rootInst}
              parcel={props.parcel}
              pool={reconveyancePool}
              releaseLinks={props.links.filter((l) => l.link_type === "release_of")}
              lifecycles={props.lifecycles}
              candidateActions={props.candidateActions}
              onSetCandidateAction={props.onSetCandidateAction}
              onOpenDocument={props.onOpenDocument}
              hasAcceptedRelease={hasAcceptedRelease}
              scannedPartyCount={props.scannedPartyCount}
            />
          </div>
        )}
        <CitationsRow
          inbound={props.inboundCitations}
          outbound={[]}
          onJump={props.onJumpLifecycle}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swimlane/Swimlane.tsx
git commit -m "feat(swimlane): Swimlane assembly component"
```

---

## Task 12: SwimlaneDiagram container

**Files:**
- Create: `src/components/swimlane/SwimlaneDiagram.tsx`
- Create: `src/components/swimlane/index.ts`

Sorts lifecycles chronologically. Hoists candidate accept state. Wires inbound/outbound citations from `DocumentLink[]` where `link_type === "back_reference"`. Flashes a swimlane when asked to jump to it. Delegates findings (R3 for MERS; also surfaces R4 if needed). Computes `scannedPartyCount` per lifecycle via `huntCrossParcelRelease` for lifecycles that have borrower names.

- [ ] **Step 1: Implement SwimlaneDiagram**

Create `src/components/swimlane/SwimlaneDiagram.tsx`:

```tsx
import { useMemo, useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  LifecycleStatus,
  ExaminerAction,
} from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { computeTimeAxisDomain } from "../../logic/swimlane-layout";
import type { CandidateAction } from "../../logic/release-candidate-matcher";
import { TimeAxis } from "./TimeAxis";
import { Swimlane } from "./Swimlane";
import type { CitationEntry } from "./CitationsRow";
import { huntCrossParcelRelease } from "../../logic/cross-parcel-release-hunt";
import { getTrustors } from "../../logic/party-roles";

// Lifecycles are sorted chronologically by root_instrument.recording_date to
// align with the shared global time axis (Q1 / Q5 of the brainstorm). Anomaly
// prominence is handled by AnomalyPanel at top-of-page, not by reorder.
function sortLifecycles(
  lifecycles: LifecycleType[],
  byNumber: Map<string, Instrument>,
): LifecycleType[] {
  return [...lifecycles].sort((a, b) => {
    const da = byNumber.get(a.root_instrument)?.recording_date ?? "";
    const db = byNumber.get(b.root_instrument)?.recording_date ?? "";
    return da.localeCompare(db);
  });
}

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  findings: AnomalyFinding[];
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (id: string, s: LifecycleStatus) => void;
  onOpenDocument: (n: string) => void;
}

export function SwimlaneDiagram(props: Props) {
  const byNumber = useMemo(
    () => new Map(props.instruments.map((i) => [i.instrument_number, i])),
    [props.instruments],
  );
  const sorted = useMemo(
    () => sortLifecycles(props.lifecycles, byNumber),
    [props.lifecycles, byNumber],
  );
  const domain = useMemo(
    () => computeTimeAxisDomain(props.instruments),
    [props.instruments],
  );

  const [candidateActions, setCandidateActions] = useState<
    Record<string, CandidateAction>
  >({});
  const [acceptedCandidate, setAcceptedCandidate] = useState<
    Record<string, { instrumentNumber: string; score: number }>
  >({});

  const handleSetCandidateAction = useCallback(
    (
      key: string,
      action: CandidateAction,
      candidate: Instrument,
      score: number,
    ) => {
      setCandidateActions((prev) => ({ ...prev, [key]: action }));
      if (action === "accepted") {
        const [lifecycleId] = key.split("::");
        setAcceptedCandidate((prev) => ({
          ...prev,
          [lifecycleId]: { instrumentNumber: candidate.instrument_number, score },
        }));
      }
    },
    [],
  );

  // Inbound/outbound back-references per lifecycle.
  const {
    inboundByLifecycle,
    outboundByLifecycleAndInstrument,
  } = useMemo(() => {
    const inbound = new Map<string, CitationEntry[]>();
    const outbound = new Map<string, Map<string, CitationEntry[]>>();
    for (const lc of props.lifecycles) {
      inbound.set(lc.id, []);
      outbound.set(lc.id, new Map());
    }
    const lifecycleOfRoot = new Map<string, string>();
    for (const lc of props.lifecycles) lifecycleOfRoot.set(lc.root_instrument, lc.id);
    const lifecycleOfChild = new Map<string, string>();
    for (const lc of props.lifecycles) {
      for (const c of lc.child_instruments) lifecycleOfChild.set(c, lc.id);
    }
    const memberLifecycle = (inst: string) =>
      lifecycleOfRoot.get(inst) ?? lifecycleOfChild.get(inst);

    const backRefs = props.links.filter((l) => l.link_type === "back_reference");
    // Group by (citing instrument, target lifecycle) to produce (×N) multiplicity.
    const grouped = new Map<string, CitationEntry>();
    for (const l of backRefs) {
      const citing = l.source_instrument;
      const targetLc = memberLifecycle(l.target_instrument);
      if (!targetLc) continue;
      const key = `${citing}::${targetLc}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.targetInstruments.push(l.target_instrument);
      } else {
        grouped.set(key, {
          citingInstrument: citing,
          targetLifecycleId: targetLc,
          targetInstruments: [l.target_instrument],
        });
      }
    }
    for (const entry of grouped.values()) {
      // Inbound view on the target lifecycle.
      inbound.get(entry.targetLifecycleId)!.push(entry);
      // Outbound: keyed by the citing instrument's own lifecycle.
      const citingLc = memberLifecycle(entry.citingInstrument);
      if (citingLc) {
        const perInst = outbound.get(citingLc)!;
        const list = perInst.get(entry.citingInstrument) ?? [];
        list.push(entry);
        perInst.set(entry.citingInstrument, list);
      }
    }
    return {
      inboundByLifecycle: inbound,
      outboundByLifecycleAndInstrument: outbound,
    };
  }, [props.lifecycles, props.links]);

  // Scanned party counts via the same cross-parcel release hunt used on the staff page.
  const scanByLifecycle = useMemo(() => {
    const map = new Map<string, number>();
    for (const lc of props.lifecycles) {
      const root = byNumber.get(lc.root_instrument);
      if (!root || root.document_type !== "deed_of_trust") {
        map.set(lc.id, 0);
        continue;
      }
      const borrowers = getTrustors(root);
      if (borrowers.length === 0) {
        map.set(lc.id, 0);
        continue;
      }
      try {
        const result = huntCrossParcelRelease({
          lifecycle_id: lc.id,
          parcel_apn: props.parcel.apn,
          borrower_names: borrowers,
        });
        map.set(lc.id, result.scanned_party_count);
      } catch {
        map.set(lc.id, 0);
      }
    }
    return map;
  }, [props.lifecycles, byNumber, props.parcel.apn]);

  // Width: measure container once, re-measure on resize.
  const containerRef = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState(800);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        // Padding 12px either side (px-3). Track width = container width - 24.
        setWidthPx(Math.max(400, containerRef.current.clientWidth - 24));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Flash-on-jump.
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const handleJumpLifecycle = useCallback((lifecycleId: string) => {
    const el = document.getElementById(lifecycleId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashingId(lifecycleId);
    window.setTimeout(() => setFlashingId(null), 1200);
  }, []);

  if (!domain[0] || !domain[1]) {
    return <div className="text-sm text-slate-500">No instruments to display.</div>;
  }
  const safeDomain: [string, string] = [domain[0], domain[1]];

  return (
    <div ref={containerRef}>
      <div className="px-3">
        <TimeAxis domain={safeDomain} widthPx={widthPx} />
      </div>
      {sorted.map((lc) => {
        const outboundMap =
          outboundByLifecycleAndInstrument.get(lc.id) ?? new Map();
        return (
          <Swimlane
            key={lc.id}
            lifecycle={lc}
            parcel={props.parcel}
            instruments={props.instruments}
            allInstruments={props.instruments}
            links={props.links}
            lifecycles={props.lifecycles}
            domain={safeDomain}
            trackWidthPx={widthPx}
            findings={props.findings}
            linkActions={props.linkActions}
            lifecycleOverrides={props.lifecycleOverrides}
            candidateActions={candidateActions}
            acceptedCandidate={acceptedCandidate[lc.id] ?? null}
            inboundCitations={inboundByLifecycle.get(lc.id) ?? []}
            outboundCitations={outboundMap}
            scannedPartyCount={scanByLifecycle.get(lc.id) ?? 0}
            onSetLinkAction={props.onSetLinkAction}
            onSetLifecycleOverride={props.onSetLifecycleOverride}
            onSetCandidateAction={handleSetCandidateAction}
            onOpenDocument={props.onOpenDocument}
            onJumpLifecycle={handleJumpLifecycle}
            flashing={flashingId === lc.id}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add barrel export**

Create `src/components/swimlane/index.ts`:

```ts
export { SwimlaneDiagram } from "./SwimlaneDiagram";
```

- [ ] **Step 3: Commit**

```bash
git add src/components/swimlane/SwimlaneDiagram.tsx src/components/swimlane/index.ts
git commit -m "feat(swimlane): SwimlaneDiagram with chronological sort and citation wiring"
```

---

## Task 13: Replace EncumbranceLifecycle body

**Files:**
- Modify: `src/components/EncumbranceLifecycle.tsx`

Strip out the per-lifecycle card rendering and the local candidate-action state; render `<SwimlaneDiagram>` instead. Preserve the header, `ExportCommitmentButton`, `MoatBanner`. AnomalyPanel is rendered by the page parent, not here — confirm that first before the edit.

- [ ] **Step 1: Confirm AnomalyPanel placement**

Run: `grep -rn "AnomalyPanel" src --include "*.tsx"`

Expected: `AnomalyPanel` is imported in the encumbrance page parent (likely `src/pages/EncumbrancePage.tsx` or similar). If it is currently inside `EncumbranceLifecycle.tsx`, leave it there and preserve it in Step 2.

- [ ] **Step 2: Rewrite EncumbranceLifecycle.tsx**

Replace the file contents with the following. Adjust the `AnomalyPanel` import/render block to match Step 1's finding — if the page parent owns it, remove the AnomalyPanel render from this file; if this file owns it, retain it exactly as before.

```tsx
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  PipelineStatus,
  ExaminerAction,
  LifecycleStatus,
} from "../types";
import type { AnomalyFinding } from "../types/anomaly";
import { MoatBanner } from "./MoatBanner";
import { ExportCommitmentButton } from "./ExportCommitmentButton";
import { SwimlaneDiagram } from "./swimlane";
import { useTerminology } from "../terminology/TerminologyContext";
import { Term, TermSection } from "../terminology/Term";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  pipelineStatus: PipelineStatus;
  findings: AnomalyFinding[];
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (lifecycleId: string, status: LifecycleStatus) => void;
  onOpenDocument: (instrumentNumber: string) => void;
  viewedInstrumentNumber?: string;
}

export function EncumbranceLifecycle({
  parcel,
  instruments,
  links,
  lifecycles,
  pipelineStatus,
  findings,
  linkActions,
  lifecycleOverrides,
  onSetLinkAction,
  onSetLifecycleOverride,
  onOpenDocument,
  viewedInstrumentNumber,
}: Props) {
  useTerminology();
  return (
    <div>
      <TermSection id="encumbrance-heading">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              <Term professional="Encumbrance Lifecycles" />
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {parcel.address} &mdash; APN: <span className="font-mono">{parcel.apn}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <ExportCommitmentButton
              parcel={parcel}
              instruments={instruments}
              links={links}
              lifecycles={lifecycles}
              pipelineStatus={pipelineStatus}
              viewedInstrumentNumber={viewedInstrumentNumber}
            />
          </div>
        </div>
        <MoatBanner pipelineStatus={pipelineStatus} />
      </TermSection>
      <SwimlaneDiagram
        parcel={parcel}
        instruments={instruments}
        links={links}
        lifecycles={lifecycles}
        findings={findings}
        linkActions={linkActions}
        lifecycleOverrides={lifecycleOverrides}
        onSetLinkAction={onSetLinkAction}
        onSetLifecycleOverride={onSetLifecycleOverride}
        onOpenDocument={onOpenDocument}
      />
      <p className="text-xs text-gray-400 mt-6 text-right">
        {instruments[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Update callers to pass `findings` prop**

Run: `grep -rn "EncumbranceLifecycle" src --include "*.tsx"` to find every call site. Each one must now pass `findings={...}`.

If any caller does not already have `findings` in scope, either compute them there via the existing anomaly runner (search `runAnomalies` or similar), or pass them through from further up. Do NOT stub with an empty array — the MERS callout depends on this.

Example caller patch (hypothetical `src/pages/EncumbrancePage.tsx`):

```tsx
// existing code that already computes or receives `findings` stays unchanged
<EncumbranceLifecycle
  parcel={parcel}
  instruments={instruments}
  links={links}
  lifecycles={lifecycles}
  pipelineStatus={pipelineStatus}
  findings={findings}              // <-- new required prop
  linkActions={linkActions}
  lifecycleOverrides={lifecycleOverrides}
  onSetLinkAction={setLinkAction}
  onSetLifecycleOverride={setLifecycleOverride}
  onOpenDocument={openDoc}
  viewedInstrumentNumber={viewedInstrumentNumber}
/>
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 288 existing passing + 15 new swimlane-layout tests = 303 passing, 1 skipped, 0 failing. If any test broke, fix before moving on.

- [ ] **Step 5: Commit**

```bash
git add src/components/EncumbranceLifecycle.tsx src/pages/
git commit -m "feat(swimlane): render swimlane diagram on encumbrance page"
```

---

## Task 14: Visual verification and polish

**Files:** none (dev server + manual)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Walk through all 6 lifecycles**

Open `http://localhost:5173/parcel/304-78-386/encumbrances`. Confirm:

- Shared time axis at top with 2005/2010/2015/2020/2025 ticks.
- Six swimlanes rendered in chronological order by root date: lc-004 (2001-02-07) → lc-006 (2007-07-24) → lc-005 (2013-01-28) → lc-001 (2013-02-27) → lc-003 (2015-07-17) → lc-002 (2021-01-19).
- lc-001: MERS callout visible at rest between DOT and release nodes; three chips visible (originator / MERS / releaser); line style narrates solid→dashed→solid across the gap.
- lc-002: same-day group composite node with `×2` badge (for 20210057846+20210057847); click expands.
- lc-003: matcher panel visible at rest with "scanned N instruments · 0 above threshold" empty-state honest-zero copy.
- lc-004: plat node on far left; affidavit node to its right; modification_of connector solid; citations row shows the inbound lc-001 citation with `(×2)` multiplicity.
- lc-005 and lc-001 are adjacent — differentiate visually via status badge + root doc label (both are DOTs). If they appear visually identical at a glance, bump contrast: e.g., make the root doc label include the lifecycle id clearly.
- lc-006: collapsed pill `Matcher · scanned 0 instruments · 0 above threshold · Expand →`.
- `⋯` menu visible but quiet on every swimlane title; click opens the override menu with rationale text.
- Link popover opens on midpoint-chevron click; shows evidence bars for lc-001's release link; no Accept/Reject on the curated release (Decision #41).
- Export Commitment button still renders and still exports (click it, inspect the PDF download works).
- Anomaly banner still at top; clicking the banner's lc-001 evidence link scrolls to lc-001 and flashes the border without opening the `⋯` menu.

- [ ] **Step 3: Plain-English toggle**

Toggle to plain English. Confirm:

- "Encumbrance Lifecycles" → "Claims Against Property"
- Node labels: "DOT" → "Mortgage", "Release" stays visually but the `⋯` menu rationale text references "Mortgage Paid Off" where it originates from a toggled source.
- Citations row: "N citations" stays because plural not translated or adjusts to "N Citations". `Cited by` and `Cites` section labels render correctly.
- Back-ref chip `↗ cites lc-004` renders as `↗ Cites lc-004` (title case variant if the glossary returns it).

- [ ] **Step 4: Reduced motion**

In Chrome DevTools, enable "Emulate CSS prefers-reduced-motion". Repeat the jump-to-lifecycle action. Confirm the flash does NOT animate; just a static border that persists briefly.

- [ ] **Step 5: Keyboard-only**

Tab through a swimlane. Confirm tab order: swimlane title → nodes → override menu trigger → citations toggle. Enter on `⋯` opens the menu; Esc closes. Enter on a midpoint chevron opens the popover; Esc closes.

- [ ] **Step 6: Screenshot for Beat 3**

Take a screenshot of `/parcel/304-78-386/encumbrances` showing lc-001 centered with MERS callout clearly visible. Save as `docs/screenshots/swimlane-lc-001-mers.png`. This is the artifact the demo Beat 3 script points at.

- [ ] **Step 7: Narrate Beat 3 out loud once**

Read Beat 3 of `docs/demo-script.md` aloud while pointing at the new diagram. Confirm every phrase the script says is visually backed by something on the page. Any phrase that no longer has a visual anchor is a gap — file a task or fix inline before committing.

- [ ] **Step 8: Final test run**

Run: `npm test`
Expected: 303 passing, 1 skipped, 0 failing.

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: clean build, no TypeScript errors.

- [ ] **Step 10: Commit screenshots**

```bash
git add docs/screenshots/
git commit -m "docs(swimlane): Beat 3 screenshot showing MERS callout"
```

---

## Self-Review

**Spec coverage.** Walked each Q1–Q6 section of the spec against the task list:

- Q1 shared global time axis, 5-year ticks, composite same-day groups → Task 2 (`computeTimeAxisDomain`, `computeNodeX`, `groupSameDayInstruments`), Task 4 (TimeAxis), Task 5 (InstrumentNode composite kind).
- Q2 MERS broken-line callout with 3 chips, line-style narrative, R3-sourced content, no hover-only reveal → Task 2 (`detectMersGap`), Task 7 (MersCallout), Task 11 (Swimlane dashed-link rendering + gap ring on nodes).
- Q3 hybrid B+C with data-driven state, collapsed pill with scan stats, lc-001 closed-lifecycle no fan → Task 2 (`resolveMatcherSlotState`), Task 8 (CandidateMatcherSlot), Task 11 (passes `hasAcceptedRelease`).
- Q4 source-only chips + per-lifecycle expand row with (×N) + glossary → Task 3 (glossary), Task 5 (back-ref chip), Task 9 (CitationsRow), Task 12 (grouped citation wiring).
- Q5 chronological by recording_date + explanatory comment → Task 12 (`sortLifecycles`).
- Q6 `⋯` menu + link popovers + always-visible rationale + no auto-open on anomaly jump → Task 6 (LinkConnector), Task 10 (OverrideMenu), Task 11 (rationale italic text, flash-on-jump that does not auto-open menu).

Preserved constraints:
- Export Commitment button stays on page header → Task 13.
- AnomalyPanel untouched → Task 13 Step 1 verification.
- Plain-English toggle works → Tasks 3 + 14 Step 3.
- Decision #41 no-unlink on curated links → Task 6 `curated` branch.
- Decision #37 lc-003 honest-zero → Task 8 returns `expanded-empty-with-scan` when `scannedPartyCount > 0`.

**Placeholder scan.** No "TBD", "TODO", "fill in details" in task steps. Every step either contains the exact code or the exact command to run. One soft item in Task 6: the two-sub-component refactor note is acknowledged as optional ("acceptable either way") — not a placeholder, an honest flexibility note.

**Type consistency.**
- `MatcherSlotState` is defined in Task 2 Step 19 and used in Task 8 via `resolveMatcherSlotState` — names match.
- `MersGap` shape in Task 2 Step 15 matches usage in Task 7 and Task 11 (`originator`, `releaser`, `dot_instrument`, `release_instrument`, `rule_finding`).
- `SwimlaneNode` discriminated union ("single" | "composite") matches usage in Task 5 and Task 11.
- `CitationEntry` in Task 9 matches the `outboundByLifecycleAndInstrument` wiring in Task 12.
- `findings: AnomalyFinding[]` prop is introduced in Task 13 and flowed through Task 11 and Task 12 as `findings`, not `anomalyFindings` or similar.

No issues.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-encumbrance-swimlane.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
