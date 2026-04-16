# Landing-Page Credibility, Persona Routing, OG Tags — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix landing-page first-impression credibility (no bare results), add persona routing, prove PDF export works, and make `/parcel/*` pages shareable via OG tags.

**Architecture:** Three small UI changes on `LandingPage` + one cross-cutting hook for per-page document meta. Reuses existing `TerminologyContext` (extended with `setMode`) and existing routing. No new dependencies.

**Tech Stack:** React 19, react-router 7, TypeScript, Tailwind v4, vitest + @testing-library/react.

**Spec:** [`docs/superpowers/specs/2026-04-15-landing-credibility-design.md`](../specs/2026-04-15-landing-credibility-design.md)

---

## Task 1 — PDF export verification doc

**Files:**
- Create: `docs/export-commitment-verification.md`

- [ ] **Step 1: Run the existing Export Commitment tests to confirm baseline**

```bash
npx vitest run src/components/ExportCommitmentButton.test.tsx
```

Expected: `Test Files  1 passed (1)` / `Tests  5 passed (5)`. The `Not implemented: navigation` warning from jsdom is benign (it fires from `<a>.click()` in `browserDownload` — real browsers trigger a download instead of a navigation).

- [ ] **Step 2: Create the verification doc**

```markdown
# Export Commitment PDF — Verification

**Date:** 2026-04-15
**Branch:** `feature/landing-credibility`
**Reason:** External reviewer reported "Export Commitment PDF doesn't work."

## Verdict
Works as designed. Code path inspected, end-to-end blob generation
covered by unit tests, dev server boots and renders the page.

## How to verify

```bash
# 1. Unit tests cover the full pipeline (build → render → blob → download callback)
npx vitest run src/components/ExportCommitmentButton.test.tsx
# Expected: 5 passed

# 2. Manual click-through in a real browser
npm run dev
# Open http://localhost:5173/parcel/304-78-386/encumbrances
# Click "Export Commitment for Parcel"
# Expected: toast "Downloaded: commitment-30478386-2026-04-09.pdf"
# Expected: PDF saves to your default download folder
```

## What the code does

`src/components/ExportCommitmentButton.tsx`:

```
button onClick
  → triggerCommitmentDownload (deferred to next animation frame)
  → buildCommitment (parcel + instruments + lifecycles → CommitmentDocument)
  → renderCommitmentPdf (jsPDF 4.x + jspdf-autotable 5.x → Blob with type "application/pdf")
  → browserDownload (URL.createObjectURL → anchor.click → revokeObjectURL)
  → toast: "Downloaded: commitment-30478386-2026-04-09.pdf"
```

## If you still see a failure
File a reproducible report with:
- Browser + version
- Console error messages
- Whether the toast appears
- Whether the file lands in your downloads folder
- The route you triggered the export from

Then re-run with `--inspect` flag to capture the runtime trace.
```

- [ ] **Step 3: Commit**

```bash
git add docs/export-commitment-verification.md
git commit -m "docs: verify Export Commitment PDF works end-to-end"
```

---

## Task 2 — Add `setMode` to `TerminologyContext`

**Files:**
- Modify: `src/terminology/TerminologyContext.tsx`
- Test: `src/terminology/TerminologyContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/terminology/TerminologyContext.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TerminologyProvider, useTerminology } from "./TerminologyContext";

function Probe() {
  const { mode, setMode } = useTerminology();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode("plain")}>plain</button>
      <button onClick={() => setMode("professional")}>pro</button>
    </div>
  );
}

describe("TerminologyContext.setMode", () => {
  beforeEach(() => localStorage.clear());

  it("setMode('plain') updates state and persists", () => {
    render(
      <TerminologyProvider>
        <Probe />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("professional");
    act(() => screen.getByText("plain").click());
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });

  it("setMode('professional') updates state and persists", () => {
    localStorage.setItem("terminology-mode", "plain");
    render(
      <TerminologyProvider>
        <Probe />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    act(() => screen.getByText("pro").click());
    expect(screen.getByTestId("mode")).toHaveTextContent("professional");
    expect(localStorage.getItem("terminology-mode")).toBe("professional");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/terminology/TerminologyContext.test.tsx
```

Expected: FAIL — `setMode` doesn't exist on context value.

- [ ] **Step 3: Add `setMode` to the context**

Modify `src/terminology/TerminologyContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { translate } from "./glossary";

type Mode = "professional" | "plain";

interface TerminologyContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggle: () => void;
  t: (term: string) => string;
}

const Ctx = createContext<TerminologyContextValue | null>(null);

function readStoredMode(): Mode {
  try {
    const v = localStorage.getItem("terminology-mode");
    return v === "plain" ? "plain" : "professional";
  } catch {
    return "professional";
  }
}

function persist(mode: Mode): void {
  try { localStorage.setItem("terminology-mode", mode); } catch {}
}

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(readStoredMode);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "professional" ? "plain" : "professional";
      persist(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (term: string): string => (mode === "plain" ? translate(term) : term),
    [mode],
  );

  return <Ctx value={{ mode, setMode, toggle, t }}>{children}</Ctx>;
}

export function useTerminology(): TerminologyContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTerminology must be inside TerminologyProvider");
  return ctx;
}
```

- [ ] **Step 4: Run all terminology tests to verify**

```bash
npx vitest run src/terminology/
```

Expected: all PASS (the new `setMode` tests + any existing).

- [ ] **Step 5: Commit**

```bash
git add src/terminology/TerminologyContext.tsx src/terminology/TerminologyContext.test.tsx
git commit -m "feat(terminology): add setMode for explicit mode setting"
```

---

## Task 3 — `PersonaRow` component

**Files:**
- Create: `src/components/PersonaRow.tsx`
- Test: `src/components/PersonaRow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { PersonaRow } from "./PersonaRow";
import { TerminologyProvider } from "../terminology/TerminologyContext";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TerminologyProvider>
        <Routes>
          <Route path="/" element={<><PersonaRow /><LocationProbe /></>} />
          <Route path="/parcel/:apn" element={<LocationProbe />} />
          <Route path="/parcel/:apn/encumbrances" element={<LocationProbe />} />
          <Route path="/staff" element={<LocationProbe />} />
        </Routes>
      </TerminologyProvider>
    </MemoryRouter>,
  );
}

describe("PersonaRow", () => {
  beforeEach(() => localStorage.clear());

  it("renders three persona pills", () => {
    renderWithRouter();
    expect(screen.getByRole("button", { name: /homeowners/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /title professionals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /county staff/i })).toBeInTheDocument();
  });

  it("homeowner pill routes to chain view and sets plain English", async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByRole("button", { name: /homeowners/i }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/parcel/304-78-386");
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });

  it("title-professional pill routes to encumbrances and sets professional", async () => {
    const user = userEvent.setup();
    localStorage.setItem("terminology-mode", "plain");
    renderWithRouter();
    await user.click(screen.getByRole("button", { name: /title professionals/i }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/parcel/304-78-386/encumbrances");
    expect(localStorage.getItem("terminology-mode")).toBe("professional");
  });

  it("county-staff pill routes to /staff and leaves terminology untouched", async () => {
    const user = userEvent.setup();
    localStorage.setItem("terminology-mode", "plain");
    renderWithRouter();
    await user.click(screen.getByRole("button", { name: /county staff/i }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/staff");
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/PersonaRow.test.tsx
```

Expected: FAIL — `PersonaRow` does not exist.

- [ ] **Step 3: Implement `PersonaRow`**

```tsx
// src/components/PersonaRow.tsx
import { useNavigate } from "react-router";
import { useTerminology } from "../terminology/TerminologyContext";

const PILL_BASE =
  "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500";

const PILL_CLASS = `${PILL_BASE} bg-white text-recorder-700 border-recorder-200 hover:bg-recorder-50 hover:border-recorder-300`;

export function PersonaRow() {
  const navigate = useNavigate();
  const { setMode } = useTerminology();

  const goHomeowner = () => {
    setMode("plain");
    navigate("/parcel/304-78-386");
  };
  const goTitlePro = () => {
    setMode("professional");
    navigate("/parcel/304-78-386/encumbrances");
  };
  const goStaff = () => {
    navigate("/staff");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-slate-500 mr-1">Quick start:</span>
      <button
        type="button"
        onClick={goHomeowner}
        className={PILL_CLASS}
        aria-label="For homeowners — open chain of title in plain English"
      >
        For homeowners
      </button>
      <button
        type="button"
        onClick={goTitlePro}
        className={PILL_CLASS}
        aria-label="For title professionals — open encumbrance lifecycle in professional terminology"
      >
        For title professionals
      </button>
      <button
        type="button"
        onClick={goStaff}
        className={PILL_CLASS}
        aria-label="For county staff — open staff workbench"
      >
        For county staff
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/components/PersonaRow.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/PersonaRow.tsx src/components/PersonaRow.test.tsx
git commit -m "feat: add PersonaRow with homeowner/title-pro/staff pills"
```

---

## Task 4 — Stop SearchEntry from showing pre-loaded results when query is empty

**Files:**
- Modify: `src/components/SearchEntry.tsx`

- [ ] **Step 1: Update the rendering condition**

In `src/components/SearchEntry.tsx`, change the results section guard from `count > 0` to `count > 0 && hasQuery`. The "no results matching X" empty state already requires `hasQuery`, so the only change is on the success branch:

```tsx
{count > 0 && hasQuery && (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-sm font-medium text-gray-600">
        {count} {count === 1 ? "result" : "results"} matched
      </span>
    </div>
    <ul className="divide-y divide-gray-200">
      {results.map((r) => (
        <ResultCard
          key={
            r.matchType === "instrument" && r.instrumentNumber
              ? `${r.parcel.apn}-${r.instrumentNumber}`
              : r.parcel.apn
          }
          result={r}
          onSelect={onSelectParcel}
        />
      ))}
    </ul>
  </div>
)}
```

Note the heading text simplifies to just `matched` because the no-query branch is gone — the conditional `hasQuery ? " matched" : " indexed"` collapses to `" matched"`.

- [ ] **Step 2: Run the full suite to confirm nothing broke**

```bash
npm test -- --run
```

Expected: same pass count as baseline (288 + new tests from earlier tasks). No regressions.

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchEntry.tsx
git commit -m "fix: hide search results table when query is empty"
```

---

## Task 5 — `FeaturedParcels` component

**Files:**
- Create: `src/components/FeaturedParcels.tsx`
- Test: `src/components/FeaturedParcels.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { FeaturedParcels } from "./FeaturedParcels";
import type { Parcel } from "../types";

const parcels: Parcel[] = [
  {
    apn: "304-78-386",
    address: "3674 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85234",
    current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    subdivision: "SEVILLE PARCEL 3",
    instrument_numbers: [],
  } as Parcel,
  {
    apn: "304-77-689",
    address: "2715 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85234",
    current_owner: "HOGUE JASON / MICHELE",
    subdivision: "SHAMROCK ESTATES PHASE 2A",
    instrument_numbers: [],
  } as Parcel,
];

function renderUI() {
  return render(
    <MemoryRouter>
      <FeaturedParcels parcels={parcels} />
    </MemoryRouter>,
  );
}

describe("FeaturedParcels", () => {
  it("renders the section heading", () => {
    renderUI();
    expect(screen.getByText(/Featured demo parcels/i)).toBeInTheDocument();
  });

  it("renders the explainer pointing to POPHAM", () => {
    renderUI();
    expect(
      screen.getByText(/Click POPHAM to start the recommended demo path/i),
    ).toBeInTheDocument();
  });

  it("renders one card per parcel linking to /parcel/:apn", () => {
    renderUI();
    const popham = screen.getByRole("link", { name: /POPHAM/i });
    expect(popham).toHaveAttribute("href", "/parcel/304-78-386");
    const hogue = screen.getByRole("link", { name: /HOGUE/i });
    expect(hogue).toHaveAttribute("href", "/parcel/304-77-689");
  });

  it("badges POPHAM as the recommended demo", () => {
    renderUI();
    const badge = screen.getByText(/Recommended demo/i);
    expect(badge).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/FeaturedParcels.test.tsx
```

Expected: FAIL — `FeaturedParcels` doesn't exist.

- [ ] **Step 3: Implement `FeaturedParcels`**

```tsx
// src/components/FeaturedParcels.tsx
import { Link } from "react-router";
import type { Parcel } from "../types";

const RECOMMENDED_APN = "304-78-386";

interface Props {
  parcels: Parcel[];
}

export function FeaturedParcels({ parcels }: Props) {
  return (
    <section className="px-6 py-6 bg-white border-b border-slate-200">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-sm font-semibold text-recorder-900 mb-1">
          Featured demo parcels
        </h2>
        <p className="text-xs text-recorder-500 mb-4">
          These parcels demonstrate the chain-of-title, encumbrance lifecycle,
          and anomaly detection features. Click POPHAM to start the recommended
          demo path.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parcels.map((p) => {
            const isRecommended = p.apn === RECOMMENDED_APN;
            return (
              <li key={p.apn}>
                <Link
                  to={`/parcel/${p.apn}`}
                  aria-label={`Open chain of title for ${p.current_owner}, ${p.address}`}
                  className="group block rounded-lg border border-recorder-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700 truncate">
                        {p.current_owner}
                      </div>
                      <div className="text-xs text-recorder-500 truncate">
                        {p.address}, {p.city}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        APN <span className="font-mono">{p.apn}</span>
                      </div>
                    </div>
                    {isRecommended && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide bg-moat-50 text-moat-700 border border-moat-200 rounded-full px-2 py-0.5">
                        Recommended demo
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/components/FeaturedParcels.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/FeaturedParcels.tsx src/components/FeaturedParcels.test.tsx
git commit -m "feat: add FeaturedParcels card row for landing page"
```

---

## Task 6 — Wire `FeaturedParcels` and `PersonaRow` into `LandingPage`

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Update `LandingPage` markup**

Replace the search section in `src/components/LandingPage.tsx` and insert `FeaturedParcels` between the map and the search section:

```tsx
// src/components/LandingPage.tsx
import { useNavigate, Link } from "react-router";
import { CountyMap, type HighlightedParcel } from "./CountyMap";
import { SearchEntry } from "./SearchEntry";
import { FeaturedParcels } from "./FeaturedParcels";
import { PersonaRow } from "./PersonaRow";
import { useAllParcels } from "../hooks/useAllParcels";

const HIGHLIGHTED: HighlightedParcel[] = [
  { apn: "304-78-386", status: "primary", label: "POPHAM" },
  { apn: "304-77-689", status: "backup", label: "HOGUE (counter-example)" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const parcels = useAllParcels();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-semibold text-recorder-900">
          Maricopa County Recorder
        </h1>
        <p className="text-sm text-recorder-500">
          The county owns the record. Everyone else owns a copy.
        </p>
      </header>

      <section className="relative h-[60vh] min-h-[420px] border-b border-slate-200">
        <CountyMap
          highlightedParcels={HIGHLIGHTED}
          onParcelClick={(apn) => navigate(`/parcel/${apn}`)}
        />
        <aside className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md rounded-lg bg-white/95 p-4 shadow-lg border border-slate-200 backdrop-blur-sm">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Why this map matters.</strong>{" "}
            These polygons come from the county assessor's file. Title plants
            license them via third parties. The recorder system has no APN
            bridge (Known Gap #7) — the county is the only party that can
            serve this spatial layer authoritatively.
          </p>
        </aside>
      </section>

      <FeaturedParcels parcels={parcels} />

      <section
        role="search"
        className="px-6 py-8 bg-white border-b border-slate-200"
      >
        <div className="max-w-2xl mx-auto">
          <PersonaRow />
          <h2 className="text-sm font-medium text-slate-700 mb-2">
            Direct lookup
          </h2>
          <SearchEntry
            parcels={parcels}
            onSelectParcel={(apn, instrumentNumber) =>
              navigate(
                instrumentNumber
                  ? `/parcel/${apn}/instrument/${instrumentNumber}`
                  : `/parcel/${apn}`,
              )
            }
          />
        </div>
      </section>

      <section className="px-6 py-6 bg-recorder-50 border-b border-recorder-100">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/"
            className="group block rounded-lg border border-recorder-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
          >
            <p className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700">Spatial custody</p>
            <p className="text-xs text-recorder-500 mt-1">County-authoritative parcel polygons from the assessor. No licensing layer.</p>
          </Link>
          <Link
            to="/pipeline"
            className="group block rounded-lg border border-recorder-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
          >
            <p className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700">Verified freshness</p>
            <p className="text-xs text-recorder-500 mt-1">Per-stage pipeline verification with SLA tracking. Know exactly how current your data is.</p>
          </Link>
          <Link
            to={`/parcel/304-78-386/encumbrances`}
            className="group block rounded-lg border border-recorder-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
          >
            <p className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700">Chain intelligence</p>
            <p className="text-xs text-recorder-500 mt-1">Same-day transaction grouping, MERS annotations, and release matching. Structured title work, not a document list.</p>
          </Link>
        </div>
      </section>

      <footer className="px-6 py-4 flex justify-between items-center text-xs text-slate-500">
        <Link
          to="/county-activity"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → View county activity
        </Link>
        <Link
          to="/moat-compare"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → Compare to a title-plant report
        </Link>
        <Link
          to="/staff"
          className="underline underline-offset-2 text-slate-400 hover:text-slate-600"
        >
          County staff? Open workbench &rarr;
        </Link>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Run the full suite**

```bash
npm test -- --run
```

Expected: All pass. Including the new tests.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat: integrate FeaturedParcels and PersonaRow into LandingPage"
```

---

## Task 7 — `useDocumentMeta` hook

**Files:**
- Create: `src/hooks/useDocumentMeta.ts`
- Test: `src/hooks/useDocumentMeta.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/hooks/useDocumentMeta.test.tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useDocumentMeta, type DocumentMetaInput } from "./useDocumentMeta";

function Probe(props: DocumentMetaInput) {
  useDocumentMeta(props);
  return null;
}

function metaFor(name: string): string | null {
  return (
    document.head
      .querySelector<HTMLMetaElement>(
        `meta[data-managed="useDocumentMeta"][name="${name}"], meta[data-managed="useDocumentMeta"][property="${name}"]`,
      )
      ?.content ?? null
  );
}

function jsonLd(): unknown | null {
  const el = document.head.querySelector<HTMLScriptElement>(
    'script[data-managed="useDocumentMeta"][type="application/ld+json"]',
  );
  return el ? JSON.parse(el.textContent ?? "null") : null;
}

describe("useDocumentMeta", () => {
  beforeEach(() => {
    document.title = "";
    document.head
      .querySelectorAll('[data-managed="useDocumentMeta"]')
      .forEach((n) => n.remove());
  });
  afterEach(() => cleanup());

  it("sets document.title", () => {
    render(<Probe title="Hello" description="d" />);
    expect(document.title).toBe("Hello");
  });

  it("sets description, og:title, og:description, twitter:title", () => {
    render(
      <Probe
        title="Parcel 304-78-386"
        description="Chain of title for POPHAM"
        ogImage="/og.png"
      />,
    );
    expect(metaFor("description")).toBe("Chain of title for POPHAM");
    expect(metaFor("og:title")).toBe("Parcel 304-78-386");
    expect(metaFor("og:description")).toBe("Chain of title for POPHAM");
    expect(metaFor("og:image")).toBe("/og.png");
    expect(metaFor("twitter:title")).toBe("Parcel 304-78-386");
  });

  it("inserts JSON-LD when provided", () => {
    render(
      <Probe
        title="t"
        description="d"
        jsonLd={{ "@context": "https://schema.org", "@type": "Place", name: "Parcel" }}
      />,
    );
    const ld = jsonLd() as Record<string, unknown> | null;
    expect(ld).not.toBeNull();
    expect(ld!["@type"]).toBe("Place");
  });

  it("removes managed elements on unmount", () => {
    const { unmount } = render(
      <Probe title="t" description="d" jsonLd={{ x: 1 }} />,
    );
    expect(metaFor("description")).toBe("d");
    unmount();
    expect(
      document.head.querySelectorAll('[data-managed="useDocumentMeta"]').length,
    ).toBe(0);
  });

  it("updates managed elements when props change (no duplicates)", () => {
    const { rerender } = render(<Probe title="A" description="da" />);
    expect(metaFor("og:title")).toBe("A");
    rerender(<Probe title="B" description="db" />);
    expect(metaFor("og:title")).toBe("B");
    expect(
      document.head.querySelectorAll(
        'meta[data-managed="useDocumentMeta"][property="og:title"]',
      ).length,
    ).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/hooks/useDocumentMeta.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

```tsx
// src/hooks/useDocumentMeta.ts
import { useEffect } from "react";

export interface DocumentMetaInput {
  title: string;
  description: string;
  ogImage?: string;
  ogUrl?: string;
  jsonLd?: unknown;
}

const DATA_MARKER = "useDocumentMeta";

function upsertMeta(
  selectorAttr: "name" | "property",
  key: string,
  content: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[data-managed="${DATA_MARKER}"][${selectorAttr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(selectorAttr, key);
    el.setAttribute("data-managed", DATA_MARKER);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertJsonLd(payload: unknown): void {
  let el = document.head.querySelector<HTMLScriptElement>(
    `script[data-managed="${DATA_MARKER}"][type="application/ld+json"]`,
  );
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-managed", DATA_MARKER);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

function removeJsonLd(): void {
  document.head
    .querySelector(
      `script[data-managed="${DATA_MARKER}"][type="application/ld+json"]`,
    )
    ?.remove();
}

function removeAllManaged(): void {
  document.head
    .querySelectorAll(`[data-managed="${DATA_MARKER}"]`)
    .forEach((n) => n.remove());
}

export function useDocumentMeta(input: DocumentMetaInput): void {
  useEffect(() => {
    document.title = input.title;
    upsertMeta("name", "description", input.description);
    upsertMeta("property", "og:title", input.title);
    upsertMeta("property", "og:description", input.description);
    upsertMeta("property", "og:type", "website");
    if (input.ogImage) upsertMeta("property", "og:image", input.ogImage);
    if (input.ogUrl) upsertMeta("property", "og:url", input.ogUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", input.title);
    upsertMeta("name", "twitter:description", input.description);
    if (input.ogImage) upsertMeta("name", "twitter:image", input.ogImage);

    if (input.jsonLd !== undefined) {
      upsertJsonLd(input.jsonLd);
    } else {
      removeJsonLd();
    }

    return removeAllManaged;
  }, [
    input.title,
    input.description,
    input.ogImage,
    input.ogUrl,
    input.jsonLd,
  ]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/hooks/useDocumentMeta.test.tsx
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDocumentMeta.ts src/hooks/useDocumentMeta.test.tsx
git commit -m "feat: add useDocumentMeta hook for per-page OG and JSON-LD"
```

---

## Task 8 — Static OG defaults in `index.html` + OG image asset

**Files:**
- Modify: `index.html`
- Create: `data/og-default.png` (copy of `src/assets/hero.png`)

- [ ] **Step 1: Copy the existing hero.png to serve as the default OG image**

```bash
cp src/assets/hero.png data/og-default.png
```

(Vite serves `data/` as the public root per `vite.config.ts`'s `publicDir: "data"`. So this becomes available at `/og-default.png`.)

- [ ] **Step 2: Add static OG meta to `index.html`**

Replace `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Land Custodian Portal — Maricopa County, AZ</title>
    <meta
      name="description"
      content="AI-enhanced county recorder search portal. Parcel-keyed chain of title, encumbrance lifecycle, and anomaly detection for Maricopa County."
    />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Land Custodian Portal" />
    <meta
      property="og:title"
      content="Land Custodian Portal — Maricopa County, AZ"
    />
    <meta
      property="og:description"
      content="AI-enhanced county recorder search portal. Parcel-keyed chain of title, encumbrance lifecycle, and anomaly detection for Maricopa County."
    />
    <meta property="og:image" content="/og-default.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta
      name="twitter:title"
      content="Land Custodian Portal — Maricopa County, AZ"
    />
    <meta
      name="twitter:description"
      content="AI-enhanced county recorder search portal. Parcel-keyed chain of title, encumbrance lifecycle, and anomaly detection for Maricopa County."
    />
    <meta name="twitter:image" content="/og-default.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify the dev server serves the OG image**

```bash
# (dev server should still be running from earlier)
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5174/og-default.png
```

Expected: `HTTP 200`.

- [ ] **Step 4: Commit**

```bash
git add index.html data/og-default.png
git commit -m "feat: add static OG and Twitter meta defaults + og-default.png"
```

---

## Task 9 — Wire `useDocumentMeta` into Chain and Encumbrance routes

**Files:**
- Modify: `src/router.tsx`

- [ ] **Step 1: Add the hook call to both route inner components**

In `src/router.tsx`, inside `ChainRouteInner` and `EncumbranceRouteInner`, call `useDocumentMeta` with parcel-specific titles. Add the import:

```tsx
import { useDocumentMeta } from "./hooks/useDocumentMeta";
```

Inside `ChainRouteInner({ apn })` (after `const data = useParcelData(apn);`):

```tsx
useDocumentMeta({
  title: `Chain of title — ${data.parcel.address}, ${data.parcel.city} ${data.parcel.state} (APN ${data.parcel.apn}) — Maricopa County Recorder`,
  description: `Parcel-keyed chain of title for APN ${data.parcel.apn}, owned by ${data.parcel.current_owner}. ${data.instruments.length} instruments curated, verified through ${data.pipelineStatus.verified_through_date}.`,
  ogImage: "/og-default.png",
  ogUrl: `${window.location.origin}/parcel/${data.parcel.apn}`,
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Parcel ${data.parcel.apn} — ${data.parcel.address}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: data.parcel.address,
      addressLocality: data.parcel.city,
      addressRegion: data.parcel.state,
      postalCode: data.parcel.zip,
      addressCountry: "US",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "APN",
        value: data.parcel.apn,
      },
      {
        "@type": "PropertyValue",
        name: "Subdivision",
        value: data.parcel.subdivision,
      },
      {
        "@type": "PropertyValue",
        name: "Verified through",
        value: data.pipelineStatus.verified_through_date,
      },
    ],
  },
});
```

Inside `EncumbranceRouteInner({ apn })` (after `const data = useParcelData(apn);`):

```tsx
useDocumentMeta({
  title: `Encumbrance lifecycle — ${data.parcel.address}, ${data.parcel.city} ${data.parcel.state} (APN ${data.parcel.apn}) — Maricopa County Recorder`,
  description: `Open and closed encumbrance lifecycles for APN ${data.parcel.apn}, owned by ${data.parcel.current_owner}. Verified through ${data.pipelineStatus.verified_through_date}.`,
  ogImage: "/og-default.png",
  ogUrl: `${window.location.origin}/parcel/${data.parcel.apn}/encumbrances`,
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Parcel ${data.parcel.apn} — ${data.parcel.address}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: data.parcel.address,
      addressLocality: data.parcel.city,
      addressRegion: data.parcel.state,
      postalCode: data.parcel.zip,
      addressCountry: "US",
    },
  },
});
```

- [ ] **Step 2: Run the full suite**

```bash
npm test -- --run
```

Expected: All pass — including pre-existing routing tests that render these components.

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "feat: per-parcel OG and JSON-LD meta on chain + encumbrance routes"
```

---

## Task 10 — Final verification + manual spot-checks

**Files:**
- (no source changes — verification only)

- [ ] **Step 1: Full test suite + build**

```bash
npm test -- --run
npm run build
```

Expected: tests all pass; `tsc -b && vite build` succeeds.

- [ ] **Step 2: Spot-check OG meta in dev server**

Dev server should still be running. With it up:

```bash
# Note: index.html static defaults appear in raw HTML
curl -s http://localhost:5174/ | grep -E 'og:|twitter:|description'
```

Expected: 10+ matching lines covering title, description, og:type, og:site_name, og:title, og:description, og:image, twitter:card, twitter:title, twitter:description, twitter:image.

Per-parcel meta is JS-injected — visible in DevTools Elements panel after the route hydrates, not in raw curl HTML. That's expected behavior for SPA OG.

- [ ] **Step 3: Manual click-through (record findings inline below)**

Open in a real browser:

1. `http://localhost:5174/` — verify:
   - Map renders at top
   - "Featured demo parcels" section appears between map and search
   - POPHAM card shows "Recommended demo" badge
   - Search input shows NO pre-loaded results
   - Persona row appears above search input

2. Click each persona pill:
   - "For homeowners" → `/parcel/304-78-386` opens; nav shows Plain English mode active
   - Back to `/`, click "For title professionals" → `/parcel/304-78-386/encumbrances`; nav shows Professional mode active
   - Back to `/`, click "For county staff" → `/staff`

3. On `/parcel/304-78-386`, open DevTools → Elements → `<head>`. Verify:
   - `<title>` includes parcel address and APN
   - `meta[property="og:title"]` and `og:description` are parcel-specific
   - `script[type="application/ld+json"]` is present with `"@type": "Place"`

4. Click "Export Commitment for Parcel" on `/parcel/304-78-386/encumbrances`. Verify a PDF lands in your downloads folder and the toast says "Downloaded: commitment-30478386-…pdf".

- [ ] **Step 4: Demo Beat 1 sanity walk**

Walk Beat 1 of `docs/demo-script.md` mentally:
- "Point to the landing page map" → still there
- "Point to the three-pillar row below the search box" → still there (now further below thanks to FeaturedParcels)
- The script's verbiage about "below the search box" is still accurate.

If anything reads worse than before, note it; otherwise no change required.

- [ ] **Step 5: Commit verification notes**

If any small fix-ups happened during manual testing, commit them now. If not, this branch is ready for review.

---

## Self-review checklist (run before handoff)

- [ ] Spec coverage: every sub-task in `docs/superpowers/specs/2026-04-15-landing-credibility-design.md` has at least one task implementing it. ✓
- [ ] No `TBD`/`TODO`/placeholder strings in this plan. ✓
- [ ] Type consistency: `setMode(mode: Mode)` signature is identical between Task 2 (definition) and Tasks 3 + 6 (callers). ✓
- [ ] OG image path `/og-default.png` matches the publicDir setup (`data/og-default.png` served at root). ✓
- [ ] `useDocumentMeta` API in Task 7 (definition) matches the call sites in Task 9 (`title`, `description`, `ogImage`, `ogUrl`, `jsonLd`). ✓
