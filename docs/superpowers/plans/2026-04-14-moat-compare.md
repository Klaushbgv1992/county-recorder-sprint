# /moat-compare Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/moat-compare` route — a static side-by-side comparison of an aggregator-style ("DataTree") property report vs. the prototype's surfacing of the same fields for parcel 304-78-386, with provenance asymmetry on Row 1, three structural-delta callouts anchored to specific rows, MoatBanner reuse on Row 5, a 1024px viewport gate, and a Tier 1-C closing footer.

**Architecture:** One new component file (`src/components/MoatCompareRoute.tsx`) that internally defines `AggregatorTag`, `ComparisonRow`, and `Callout` helpers since they are not reused elsewhere. One new route entry in `src/router.tsx` (the only file outside this branch's territory that gets touched). One new test file (`tests/moat-compare.dom.test.tsx`) following the existing `tests/encumbrance-lifecycle.dom.test.tsx` + `tests/routing.test.ts` patterns. Reuses existing `MoatBanner`, `ProvenanceTag`, and `loadParcelDataByApn` without modification.

**Tech Stack:** React 19, react-router v7, Tailwind v4, vitest + @testing-library/react, TypeScript.

---

## File Structure

- Create: `src/components/MoatCompareRoute.tsx` — the route component, all subcomponents inline (`AggregatorTag`, `ComparisonRow`, `Callout`, `ViewportFallback`)
- Create: `tests/moat-compare.dom.test.tsx` — vitest + RTL test file
- Modify: `src/router.tsx` — single new route entry, no structural rework
- Modify: `tests/routing.test.ts` — one new assertion that `/moat-compare` matches the new route
- No new data files, no new types, no new logic modules

---

### Task 1: Scaffold MoatCompareRoute component (CHECKPOINT 1)

**Files:**
- Create: `src/components/MoatCompareRoute.tsx`
- Create: `tests/moat-compare.dom.test.tsx`

Goal of this task: render an empty two-column container with the five row labels in the gutter, the page header, and the subtitle. No row content yet, no callouts, no fallback.

- [ ] **Step 1: Write failing tests for header + row labels**

Create `tests/moat-compare.dom.test.tsx`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { MoatCompareRoute } from "../src/components/MoatCompareRoute";

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/moat-compare"]}>
      <MoatCompareRoute />
    </MemoryRouter>,
  );
}

const ROW_LABELS = [
  "Current owner of record",
  "Open encumbrances (DOTs / liens)",
  "Lien search by recording code",
  "Document image source",
  "Index freshness",
];

describe("MoatCompareRoute scaffold", () => {
  afterEach(() => cleanup());

  it("renders the page header", () => {
    renderRoute();
    expect(
      screen.getByText(/Moat comparison/i),
    ).toBeInTheDocument();
  });

  it("renders the parcel subtitle naming POPHAM 304-78-386", () => {
    renderRoute();
    expect(screen.getByText(/304-78-386/)).toBeInTheDocument();
    expect(screen.getByText(/POPHAM/)).toBeInTheDocument();
  });

  it("renders all five row labels", () => {
    renderRoute();
    for (const label of ROW_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- moat-compare.dom`
Expected: FAIL — "Cannot find module '../src/components/MoatCompareRoute'"

- [ ] **Step 3: Create MoatCompareRoute scaffold**

Create `src/components/MoatCompareRoute.tsx`:

```tsx
import { Link } from "react-router";

const ROW_LABELS = [
  { id: "row-1", label: "Current owner of record" },
  { id: "row-2", label: "Open encumbrances (DOTs / liens)" },
  { id: "row-3", label: "Lien search by recording code" },
  { id: "row-4", label: "Document image source" },
  { id: "row-5", label: "Index freshness" },
] as const;

export function MoatCompareRoute() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Moat comparison: aggregator vs. county-owned portal
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Showing parcel 304-78-386 — POPHAM CHRISTOPHER / ASHLEY,
          3674 E Palmer Street, Gilbert. Prototype corpus contains
          two parcels; the second (HOGUE 304-77-689) is reachable
          via <Link to="/" className="text-blue-700 hover:underline">Search</Link>.
        </p>
      </header>

      <div className="hidden lg:grid grid-cols-[1fr_12rem_1fr] gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            Aggregator-style property report
          </h2>
        </div>
        <div className="bg-white border-b border-gray-200" />
        <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-blue-900">
            County-owned prototype
          </h2>
        </div>

        {ROW_LABELS.map((row) => (
          <div key={row.id} className="contents" data-row-id={row.id}>
            <div className="bg-gray-50 px-4 py-4 border-t border-gray-200" />
            <div className="bg-white px-3 py-4 border-t border-gray-200 text-center text-xs font-medium text-gray-700">
              {row.label}
            </div>
            <div className="bg-blue-50 px-4 py-4 border-t border-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- moat-compare.dom`
Expected: PASS — 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/MoatCompareRoute.tsx tests/moat-compare.dom.test.tsx
git commit -m "feat(moat-compare): scaffold route component with header + row gutter (CHECKPOINT 1)"
```

**CHECKPOINT 1 GATE:** Scaffold renders. Five row labels present. Tests 1-3 pass. Move to Task 2 only when this is true.

---

### Task 2: Populate rows with content + provenance chips (CHECKPOINT 2)

**Files:**
- Modify: `src/components/MoatCompareRoute.tsx`
- Modify: `tests/moat-compare.dom.test.tsx`

- [ ] **Step 1: Add failing tests for row content and chip asymmetry**

Append to `tests/moat-compare.dom.test.tsx` inside the same `describe` block (or in a new `describe`):

```typescript
describe("MoatCompareRoute row content", () => {
  afterEach(() => cleanup());

  it("Row 1 prints the same owner string on both sides with different provenance tags", () => {
    renderRoute();
    const row1 = document.querySelector('[data-row-id="row-1"]') as HTMLElement;
    expect(row1).not.toBeNull();
    // Owner string appears at least twice (once per side).
    const ownerNodes = Array.from(row1.querySelectorAll("*")).filter(
      (el) => el.textContent?.trim() === "POPHAM CHRISTOPHER / ASHLEY",
    );
    expect(ownerNodes.length).toBeGreaterThanOrEqual(2);
    // Aggregator side uses an "aggregator index" label; prototype side
    // uses a county-deed provenance label.
    expect(row1.textContent).toMatch(/aggregator index/);
    expect(row1.textContent).toMatch(/County Deed/);
  });

  it("Row 2 names the two POPHAM lifecycles on the prototype side", () => {
    renderRoute();
    const row2 = document.querySelector('[data-row-id="row-2"]') as HTMLElement;
    expect(row2).not.toBeNull();
    expect(row2.textContent).toMatch(/lc-001/);
    expect(row2.textContent).toMatch(/lc-002/);
    expect(row2.textContent).toMatch(/released/i);
    expect(row2.textContent).toMatch(/no reconveyance/i);
  });

  it("Row 3 cites both hunt-log paths on the prototype side", () => {
    renderRoute();
    const row3 = document.querySelector('[data-row-id="row-3"]') as HTMLElement;
    expect(row3).not.toBeNull();
    expect(row3.textContent).toMatch(/hunt-log-known-gap-2\.md/);
    expect(row3.textContent).toMatch(/R-005\/hunt-log\.md/);
    expect(row3.textContent).toMatch(/FED TAX L|LIEN/);
  });

  it("Row 4 prototype side links to the county PDF for instrument 20130183449", () => {
    renderRoute();
    const row4 = document.querySelector('[data-row-id="row-4"]') as HTMLElement;
    expect(row4).not.toBeNull();
    const link = row4.querySelector(
      'a[href*="publicapi.recorder.maricopa.gov"]',
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toMatch(/recordingNumber=20130183449/);
  });

  it("Row 5 prototype side renders the MoatBanner verified-through date", () => {
    renderRoute();
    const row5 = document.querySelector('[data-row-id="row-5"]') as HTMLElement;
    expect(row5).not.toBeNull();
    expect(row5.textContent).toMatch(/Records verified through/);
    expect(row5.textContent).toMatch(/2026-04-09/);
  });

  it("aggregator column contains zero ProvenanceTag chips (visual asymmetry preserved)", () => {
    renderRoute();
    // ProvenanceTag uses a span with class "inline-flex items-center gap-1"
    // and one of the four label strings ("County API", "OCR", "Hand-Curated",
    // "Matcher"). The aggregator-side container has data-side="aggregator";
    // assert no ProvenanceTag-style chip lives inside it.
    const aggregatorCells = document.querySelectorAll(
      '[data-side="aggregator"]',
    );
    expect(aggregatorCells.length).toBeGreaterThan(0);
    for (const cell of Array.from(aggregatorCells)) {
      expect(cell.textContent).not.toMatch(
        /\bCounty API \d+%|\bOCR \d+%|\bHand-Curated \d+%|\bMatcher \d+%/,
      );
    }
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm test -- moat-compare.dom`
Expected: 6 new tests fail (data-row-id selectors find empty cells).

- [ ] **Step 3: Replace the row scaffold with content-bearing rows**

Edit `src/components/MoatCompareRoute.tsx`. Replace the entire file with:

```tsx
import type { ReactNode } from "react";
import { Link } from "react-router";
import { loadParcelDataByApn } from "../data-loader";
import { MoatBanner } from "./MoatBanner";
import { ProvenanceTag } from "./ProvenanceTag";
import type { ProvenanceKind } from "../types";

const POPHAM_APN = "304-78-386";
const POPHAM_FIRST_DEED = "20130183449";

function AggregatorTag({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] italic font-medium bg-gray-200 text-gray-600"
      title={`Source: ${label}`}
    >
      {label}
    </span>
  );
}

function CountyPdfLink({
  recordingNumber,
  children,
}: {
  recordingNumber: string;
  children: ReactNode;
}) {
  const href = `https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=${recordingNumber}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 hover:underline text-xs font-mono"
    >
      {children}
    </a>
  );
}

function ComparisonRow({
  rowId,
  label,
  aggregator,
  prototype,
}: {
  rowId: string;
  label: string;
  aggregator: ReactNode;
  prototype: ReactNode;
}) {
  return (
    <div className="contents" data-row-id={rowId}>
      <div
        className="bg-gray-50 px-4 py-4 border-t border-gray-200 text-sm text-gray-700"
        data-side="aggregator"
      >
        {aggregator}
      </div>
      <div className="bg-white border-t border-gray-200 px-3 py-4 text-center text-xs font-medium text-gray-700 self-start">
        {label}
      </div>
      <div
        className="bg-blue-50 px-4 py-4 border-t border-gray-200 text-sm text-gray-900"
        data-side="prototype"
      >
        {prototype}
      </div>
    </div>
  );
}

function ProvenanceWithKind({
  kind,
  confidence,
  customLabel,
}: {
  kind: ProvenanceKind;
  confidence: number;
  customLabel?: string;
}) {
  if (customLabel) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800"
        title={`Source: ${customLabel}`}
      >
        {customLabel}
      </span>
    );
  }
  return <ProvenanceTag provenance={kind} confidence={confidence} />;
}

export function MoatCompareRoute() {
  const data = loadParcelDataByApn(POPHAM_APN);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Moat comparison: aggregator vs. county-owned portal
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Showing parcel 304-78-386 — POPHAM CHRISTOPHER / ASHLEY,
          3674 E Palmer Street, Gilbert. Prototype corpus contains
          two parcels; the second (HOGUE 304-77-689) is reachable
          via <Link to="/" className="text-blue-700 hover:underline">Search</Link>.
        </p>
      </header>

      <div className="hidden lg:grid grid-cols-[1fr_12rem_1fr] gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            Aggregator-style property report
          </h2>
        </div>
        <div className="bg-white border-b border-gray-200" />
        <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-blue-900">
            County-owned prototype
          </h2>
        </div>

        <ComparisonRow
          rowId="row-1"
          label="Current owner of record"
          aggregator={
            <div className="space-y-1">
              <div>POPHAM CHRISTOPHER / ASHLEY</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-1">
              <div>POPHAM CHRISTOPHER / ASHLEY</div>
              <div className="flex items-center gap-2 flex-wrap">
                <ProvenanceWithKind
                  kind="public_api"
                  confidence={1}
                  customLabel="County Deed"
                />
                <CountyPdfLink recordingNumber={POPHAM_FIRST_DEED}>
                  ↗ recording {POPHAM_FIRST_DEED} · 2013-02-27
                </CountyPdfLink>
              </div>
            </div>
          }
        />

        <ComparisonRow
          rowId="row-2"
          label="Open encumbrances (DOTs / liens)"
          aggregator={
            <div className="space-y-1">
              <div>1 open mortgage (estimated)</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-1">
              <div>2 lifecycles tracked</div>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                <li>lc-001 (2013 DOT) → released 2021-01-22</li>
                <li>lc-002 (2021 DOT) → open · "no reconveyance found in corpus"</li>
              </ul>
              <div className="flex items-center gap-2 flex-wrap">
                <ProvenanceTag provenance="manual_entry" confidence={1} />
                <CountyPdfLink recordingNumber="20210075858">
                  ↗ recording 20210075858
                </CountyPdfLink>
              </div>
            </div>
          }
        />

        <ComparisonRow
          rowId="row-3"
          label="Lien search by recording code"
          aggregator={
            <div className="space-y-1">
              <div>No federal-tax-lien hits (estimated; refresh cadence 30 days)</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-2">
              <div>
                No FED TAX L / LIEN / MED LIEN matches in this parcel's
                curated corpus.
              </div>
              <div className="text-xs text-gray-700 italic">
                Public API documentCode filter is silently dropped — see
                <code className="font-mono mx-1">docs/hunt-log-known-gap-2.md</code>
                and
                <code className="font-mono mx-1">data/raw/R-005/hunt-log.md</code>.
                A county-internal index closes this gap.
              </div>
              <ProvenanceWithKind
                kind="public_api"
                confidence={1}
                customLabel="County API + Hunt Log"
              />
            </div>
          }
        />

        <ComparisonRow
          rowId="row-4"
          label="Document image source"
          aggregator={
            <div className="space-y-1">
              <div>
                Aggregated copy stored on the aggregator's CDN; subscription
                required for full-resolution download.
              </div>
              <AggregatorTag label="aggregator copy" />
            </div>
          }
          prototype={
            <div className="space-y-1">
              <div>
                Canonical county PDF served by{" "}
                <code className="font-mono text-xs">publicapi.recorder.maricopa.gov</code>.
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ProvenanceTag provenance="public_api" confidence={1} />
                <CountyPdfLink recordingNumber={POPHAM_FIRST_DEED}>
                  ↗ open authoritative PDF
                </CountyPdfLink>
              </div>
            </div>
          }
        />

        <ComparisonRow
          rowId="row-5"
          label="Index freshness"
          aggregator={
            <div className="space-y-1">
              <div>Indexed monthly (typical aggregator cadence)</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div>
              <MoatBanner pipelineStatus={data.pipelineStatus} />
            </div>
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests and confirm all pass**

Run: `npm test -- moat-compare.dom`
Expected: 9 passing (3 from Task 1 + 6 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/MoatCompareRoute.tsx tests/moat-compare.dom.test.tsx
git commit -m "feat(moat-compare): populate rows with content + provenance asymmetry on Row 1 (CHECKPOINT 2)"
```

**CHECKPOINT 2 GATE:** All five rows render real content. Row 1 carries the same owner string with asymmetric provenance. Row 5 reuses the `MoatBanner` verbatim. Aggregator side has zero `ProvenanceTag` chips. Move to Task 3 only when 9 tests pass.

---

### Task 3: Add three callouts anchored to rows (CHECKPOINT 3)

**Files:**
- Modify: `src/components/MoatCompareRoute.tsx`
- Modify: `tests/moat-compare.dom.test.tsx`

- [ ] **Step 1: Write failing tests for callout presence + anchor binding (Refinement #3)**

Append to `tests/moat-compare.dom.test.tsx`:

```typescript
describe("MoatCompareRoute callouts", () => {
  afterEach(() => cleanup());

  const CALLOUTS = [
    {
      anchor: "row-3",
      headlineRegex: /They can't search liens/i,
    },
    {
      anchor: "row-4",
      headlineRegex: /They host a copy\. We host the original/i,
    },
    {
      anchor: "row-5",
      headlineRegex: /They index monthly\. The county publishes same-day/i,
    },
  ];

  it("renders all three callouts with correct headlines", () => {
    renderRoute();
    for (const c of CALLOUTS) {
      expect(screen.getByText(c.headlineRegex)).toBeInTheDocument();
    }
  });

  it("each callout's data-callout-anchor matches an existing row's data-row-id", () => {
    renderRoute();
    for (const c of CALLOUTS) {
      const callout = document.querySelector(
        `[data-callout-anchor="${c.anchor}"]`,
      );
      expect(callout).not.toBeNull();
      const row = document.querySelector(`[data-row-id="${c.anchor}"]`);
      expect(row).not.toBeNull();
    }
  });

  it("each callout's DOM position is immediately adjacent to its anchor row", () => {
    renderRoute();
    // Assert that the callout for row-N appears in the DOM immediately
    // after the row-N's last cell. This guards against a future polish
    // pass moving a callout away from its row without the test failing.
    for (const c of CALLOUTS) {
      const callout = document.querySelector(
        `[data-callout-anchor="${c.anchor}"]`,
      ) as HTMLElement;
      const row = document.querySelector(
        `[data-row-id="${c.anchor}"]`,
      ) as HTMLElement;
      // The row uses display:contents (a fragment-like wrapper); its three
      // children are the cells. The callout must come AFTER all three of
      // those children in document order, and BEFORE any subsequent row's
      // cells. Use compareDocumentPosition for an order-only assertion.
      const lastCellOfRow = row.lastElementChild as HTMLElement;
      expect(lastCellOfRow).not.toBeNull();
      const positionRelation =
        lastCellOfRow.compareDocumentPosition(callout);
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(positionRelation & Node.DOCUMENT_POSITION_FOLLOWING).toBe(4);
    }
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm test -- moat-compare.dom`
Expected: 3 new tests fail (no callout elements in the DOM yet).

- [ ] **Step 3: Implement the Callout helper and wire callouts after rows 3, 4, 5**

Edit `src/components/MoatCompareRoute.tsx`. Add the `Callout` helper near the top (after `AggregatorTag`):

```tsx
function Callout({
  anchor,
  headline,
}: {
  anchor: string;
  headline: string;
}) {
  return (
    <div
      className="contents"
      data-callout-anchor={anchor}
    >
      <div className="bg-blue-50 col-span-3 border-t border-blue-200 px-6 py-2 text-xs">
        <span className="text-blue-700 font-medium mr-2">
          › why this matters
        </span>
        <span className="text-blue-900 font-semibold">{headline}</span>
      </div>
    </div>
  );
}
```

Then insert `<Callout>` elements immediately after rows 3, 4, and 5 inside the grid container:

```tsx
        <ComparisonRow
          rowId="row-3"
          {/* … */}
        />
        <Callout
          anchor="row-3"
          headline="They can't search liens. The taxonomy lives in the county's own system."
        />

        <ComparisonRow
          rowId="row-4"
          {/* … */}
        />
        <Callout
          anchor="row-4"
          headline="They host a copy. We host the original."
        />

        <ComparisonRow
          rowId="row-5"
          {/* … */}
        />
        <Callout
          anchor="row-5"
          headline="They index monthly. The county publishes same-day."
        />
```

The wrapper `div.contents` lets the inner `div.col-span-3` participate in the parent grid as a single full-width band spanning all three columns.

- [ ] **Step 4: Run tests and confirm all pass**

Run: `npm test -- moat-compare.dom`
Expected: 12 passing (9 prior + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/MoatCompareRoute.tsx tests/moat-compare.dom.test.tsx
git commit -m "feat(moat-compare): add three structural-delta callouts anchored to rows 3/4/5 (CHECKPOINT 3)"
```

**CHECKPOINT 3 GATE:** Three callouts render with `data-callout-anchor` attributes; each anchor binds to an existing `data-row-id`; each callout sits immediately after its anchor row in document order. Move to Task 4 only when 12 tests pass.

---

### Task 4: Add viewport-fallback + Tier 1-C closing footer (CHECKPOINT 4)

**Files:**
- Modify: `src/components/MoatCompareRoute.tsx`
- Modify: `tests/moat-compare.dom.test.tsx`

- [ ] **Step 1: Write failing tests for fallback + closing footer**

Append to `tests/moat-compare.dom.test.tsx`:

```typescript
describe("MoatCompareRoute viewport fallback + closing footer", () => {
  afterEach(() => cleanup());

  it("renders a viewport fallback message that names the 1024px breakpoint", () => {
    renderRoute();
    // jsdom does not evaluate CSS media queries, so the fallback element
    // is rendered unconditionally and CSS controls runtime visibility.
    // The test asserts the element exists in the rendered tree.
    expect(
      screen.getByText(
        /designed for a presenter display.*at least 1024px/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the Tier 1-C closing footer with a link to the POPHAM parcel page", () => {
    renderRoute();
    expect(
      screen.getByText(/Schedule A \+ B-II title commitment/i),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /Export Commitment/i,
    }) as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/parcel/304-78-386");
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm test -- moat-compare.dom`
Expected: 2 new tests fail.

- [ ] **Step 3: Add the ViewportFallback subcomponent + closing footer**

Edit `src/components/MoatCompareRoute.tsx`. Add near the top (after `Callout`):

```tsx
function ViewportFallback() {
  return (
    <div className="lg:hidden border border-amber-300 bg-amber-50 text-amber-900 rounded-lg px-4 py-6 text-sm">
      Moat comparison is designed for a presenter display. Widen the
      window to at least 1024px.
    </div>
  );
}

function ClosingFooter() {
  return (
    <div className="mt-6 hidden lg:block border border-gray-200 bg-white rounded-lg px-6 py-4 text-sm text-gray-800">
      Both surfaces produce a property report. Only the prototype emits
      a Schedule A + B-II title commitment with per-row provenance and
      authoritative county PDF URLs. Generate one from any parcel page
      via{" "}
      <Link
        to="/parcel/304-78-386"
        className="text-blue-700 font-medium hover:underline"
      >
        Export Commitment for Parcel
      </Link>
      .
    </div>
  );
}
```

Then add both inside the `MoatCompareRoute` return, after the existing grid container's closing `</div>`:

```tsx
      </div>
      <ViewportFallback />
      <ClosingFooter />
    </div>
  );
}
```

- [ ] **Step 4: Run tests and confirm all pass**

Run: `npm test -- moat-compare.dom`
Expected: 14 passing (12 prior + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/MoatCompareRoute.tsx tests/moat-compare.dom.test.tsx
git commit -m "feat(moat-compare): viewport fallback + Tier 1-C closing footer (CHECKPOINT 4)"
```

**CHECKPOINT 4 GATE:** 14 tests pass. Fallback is in the DOM (CSS hides it on `lg:` widths); closing footer is in the DOM (CSS hides it on small widths). Move to Task 5 only when both render.

---

### Task 5: Wire route into router.tsx (CHECKPOINT 5)

**Files:**
- Modify: `src/router.tsx`
- Modify: `tests/routing.test.ts`

- [ ] **Step 1: Add a failing routing test for `/moat-compare`**

Edit `tests/routing.test.ts`. Inside the `describe("route table", () => { … })` block, add a new test before the `unknown paths match the not-found route` assertion:

```typescript
  it("/moat-compare matches the moat-compare route", () => {
    expect(matchIds("/moat-compare")).toContain("moat-compare");
  });
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- tests/routing`
Expected: FAIL — "/moat-compare matches the moat-compare route" — `matchIds("/moat-compare")` returns `["not-found"]` (or similar) because no route is wired.

- [ ] **Step 3: Add the route entry to `src/router.tsx`**

Edit `src/router.tsx`. Two changes:

(a) Add the import near the top of the file, after the existing component imports:

```tsx
import { MoatCompareRoute } from "./components/MoatCompareRoute";
```

(b) Add the route entry inside the `routes` array, immediately AFTER the `instrument-resolver` entry and BEFORE the `not-found` entry:

```tsx
      {
        id: "moat-compare",
        path: "moat-compare",
        element: <MoatCompareRoute />,
      },
```

The result inside `children:`:

```
      { id: "search", index: true, element: <SearchRoute /> },
      { id: "chain", path: "parcel/:apn", element: <ChainRoute /> },
      { id: "chain-instrument", path: "parcel/:apn/instrument/:instrumentNumber", element: <ChainRoute /> },
      { id: "encumbrance", path: "parcel/:apn/encumbrances", element: <EncumbranceRoute /> },
      { id: "encumbrance-instrument", path: "parcel/:apn/encumbrances/instrument/:instrumentNumber", element: <EncumbranceRoute /> },
      { id: "instrument-resolver", path: "instrument/:instrumentNumber", element: <InstrumentResolver /> },
      { id: "moat-compare", path: "moat-compare", element: <MoatCompareRoute /> },
      { id: "not-found", path: "*", element: <NotFoundPanel /> },
```

- [ ] **Step 4: Run the routing test, confirm it passes**

Run: `npm test -- tests/routing`
Expected: all routing tests pass, including the new `/moat-compare` matcher.

- [ ] **Step 5: Run the full test suite to catch regressions**

Run: `npm test`
Expected: 153 passed, 1 skipped (138 baseline + 14 new moat-compare tests + 1 new routing test).

- [ ] **Step 6: Commit**

```bash
git add src/router.tsx tests/routing.test.ts
git commit -m "feat(moat-compare): wire /moat-compare route into router (CHECKPOINT 5)"
```

**CHECKPOINT 5 GATE:** Route is reachable. All tests green. Move to Task 6 only when full suite passes.

---

### Task 6: Pre-code-review verification (CHECKPOINT 6)

**Files:** None modified — verification only.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass (153 + 1 skipped).

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: clean build, no TypeScript errors, no warnings about missing exports.

- [ ] **Step 3: Manual smoke — start dev server**

Run in background: `npm run dev`
Expected: dev server starts, prints `http://localhost:5173/` URL.

- [ ] **Step 4: Manual visual sanity — navigate to /moat-compare**

Open `http://localhost:5173/moat-compare` in a browser at desktop width (≥1024px).

Verify:
- Header reads "Moat comparison: aggregator vs. county-owned portal"
- Subtitle names parcel 304-78-386 with a link to `/`
- Grid shows three columns (aggregator | label gutter | prototype)
- Five rows: Current owner, Open encumbrances, Lien search by recording code, Document image source, Index freshness
- Row 1: same owner string both sides, gray italic `aggregator index` chip on left, blue `County Deed` chip on right with linked recording number
- Row 2: prototype side lists lc-001 + lc-002 with their statuses
- Row 3: prototype side cites both hunt-log paths
- Row 4: prototype side has a clickable link to a `publicapi.recorder.maricopa.gov` PDF URL
- Row 5: prototype side renders the MoatBanner with `verified through 2026-04-09`
- Three callouts appear after rows 3, 4, 5 as full-width blue bands
- Closing footer below the grid links to `/parcel/304-78-386` with text "Export Commitment for Parcel"

- [ ] **Step 5: Manual visual sanity — narrow viewport fallback**

Resize the browser to <1024px (e.g., 800px wide).

Verify:
- The grid disappears
- The amber fallback message appears: "Moat comparison is designed for a presenter display. Widen the window to at least 1024px."

- [ ] **Step 6: Stop dev server**

Stop the background dev server.

- [ ] **Step 7: Commit (no-op or smoke notes)**

If the visual sanity surfaced any issue, fix it now and commit a fix. If nothing changed, no commit needed for this step.

**CHECKPOINT 6 GATE:** All tests pass, build is clean, browser smoke at desktop and mobile widths is correct. Ready for code review.

---

### Task 7: Invoke superpowers:requesting-code-review

- [ ] **Step 1: Invoke the code-review skill against the branch**

Use the `superpowers:requesting-code-review` skill (or `Agent` with `subagent_type: "superpowers:code-reviewer"`). Brief the reviewer on:

- The plan: `docs/superpowers/plans/2026-04-14-moat-compare.md`
- The spec: `docs/superpowers/specs/2026-04-14-moat-compare-design.md`
- The five-question brainstorm sign-off + three refinements (Row 1 framing, viewport fallback, anchor-binding test)
- The constraint that this branch is the only one allowed to touch `src/router.tsx` this sprint
- The merge target: master tip `2328e70`

Ask the reviewer to verify:
1. The Row 1 provenance asymmetry is implemented as specified (same owner string, different chips)
2. The three callouts are anchored to the correct rows via `data-callout-anchor` and the test asserts adjacency
3. The viewport fallback names the 1024px breakpoint
4. No unexpected edits to files outside the spec's "out of scope" list
5. The `AggregatorTag` is a separate component from `ProvenanceTag` (visual asymmetry preserved)

- [ ] **Step 2: Address review feedback if any**

Make any requested edits. Re-run `npm test` and `npm run build` after each.

---

### Task 8: Rebase + merge (final)

**Files:** `master` branch.

- [ ] **Step 1: Confirm master tip has not moved unexpectedly**

```bash
git log master --oneline -3
```

Expected: tip is still `2328e70` (the gitignore chore commit). If a new commit landed (e.g., a Terminal 3 follow-up), STOP and report — investigate per Decision-style scrutiny before merging.

- [ ] **Step 2: Confirm there are no router.tsx conflicts before rebase**

```bash
git fetch . master:master 2>&1 | tail -5
git diff master..feature-moat-narrative -- src/router.tsx | head -50
```

Confirm the only `src/router.tsx` change in the branch is the new `moat-compare` import + route entry. If anything else appears (e.g., a deletion or an unrelated edit), STOP and report.

- [ ] **Step 3: Rebase the feature branch onto master**

```bash
git rebase master
```

Expected: clean rebase (no conflicts). If a `src/router.tsx` conflict appears, STOP — invoke `superpowers:systematic-debugging` to investigate before resolving.

- [ ] **Step 4: Re-run tests after rebase**

```bash
npm test
```

Expected: full suite green.

- [ ] **Step 5: Switch to master and merge with --no-ff**

```bash
git checkout master
git merge --no-ff feature-moat-narrative -m "merge tier 1-D: /moat-compare route + demo-script rewrite (Beat 0 opener, Beat 4 provenance-drift callout, Beat 9 callback); static POPHAM comparison with split-screen and three structural-delta callouts"
```

Expected: a merge commit lands on master.

- [ ] **Step 6: Verify the final state**

```bash
git log master --oneline -10
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Expected:
- Master shows the merge commit on top
- Tests pass
- Build clean

- [ ] **Step 7: Worktree cleanup**

```bash
cd ../..
git worktree remove .worktrees/feature-moat-narrative
git branch -d feature-moat-narrative
```

Expected: worktree removed; branch deleted (it has been merged).

---

## Self-Review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| Row 1 provenance asymmetry | Task 2 |
| Rows 2–4 content | Task 2 |
| Row 5 (MoatBanner reuse) | Task 2 |
| `AggregatorTag` separate from `ProvenanceTag` | Task 2 (Step 3 + Step 1 test 6) |
| Three callouts (B/C/D) | Task 3 |
| `data-callout-anchor` ↔ `data-row-id` binding (Refinement #3) | Task 3 (Step 1 test 3) |
| Closing Tier 1-C footer | Task 4 |
| Viewport fallback at 1024px (Refinement #2) | Task 4 |
| `/moat-compare` route entry in router.tsx | Task 5 |
| Routing test for `/moat-compare` | Task 5 |
| Visual hierarchy (split-screen, gutter, MoatBanner color identity) | Task 1 + Task 2 (CSS classes) |
| Header + subtitle | Task 1 |
| Empty state (auto-populate POPHAM, no picker) | Task 2 (`POPHAM_APN` constant) |
| Out-of-scope respect (no edits to MoatBanner / ProvenanceTag) | Tasks 1–5 each touch only the listed files |
| Six review checkpoints | Tasks 1–6 named explicitly |
| Code-review pass | Task 7 |
| Rebase + merge | Task 8 |

**Placeholder scan:** No "TBD", no "TODO", no "implement later". Every code block is verbatim.

**Type / name consistency:**
- `AggregatorTag` named consistently across Tasks 2, 7 review brief.
- `ComparisonRow`, `Callout`, `ViewportFallback`, `ClosingFooter` named consistently across Tasks 1–4.
- `data-row-id` and `data-callout-anchor` attributes named consistently across Tasks 1–3 (component + tests).
- Row IDs `row-1` through `row-5` consistent across all tasks.
- `POPHAM_APN`, `POPHAM_FIRST_DEED` constants stable across the file.
- `loadParcelDataByApn(POPHAM_APN)` returns the same `ParcelData` shape used elsewhere in the codebase.

**Test count consistency:** Task 1 adds 3 tests, Task 2 adds 6, Task 3 adds 3, Task 4 adds 2, Task 5 adds 1. Total: 15. Baseline 138 + 15 = 153. Expected count cited in Task 5 Step 5 and Task 6 Step 1.
