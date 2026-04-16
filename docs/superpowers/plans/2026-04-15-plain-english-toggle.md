# Plain-English Terminology Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Professional / Plain English terminology toggle that translates 15 title-industry terms across examiner-facing screens, plus a staff workbench footer link on the landing page.

**Architecture:** React Context (`TerminologyContext`) provides a `t()` translation function and mode state. A `<Term>` component wraps translatable labels with optional first-occurrence "?" tooltip. A `<TermSection>` boundary component tracks which terms have shown their "?" icon per section. Toggle persists to `localStorage`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Vitest, React Testing Library

---

### Task 1: Glossary module

**Files:**
- Create: `src/terminology/glossary.ts`
- Test: `tests/glossary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/glossary.test.ts
import { describe, it, expect } from "vitest";
import { translate } from "../src/terminology/glossary";

describe("translate", () => {
  it("returns plain-English equivalent for a known term", () => {
    expect(translate("Deed of Trust")).toBe("Mortgage");
  });

  it("is case-insensitive", () => {
    expect(translate("deed of trust")).toBe("Mortgage");
    expect(translate("DEED OF TRUST")).toBe("Mortgage");
  });

  it("returns the original string for unknown terms", () => {
    expect(translate("Unknown Thing")).toBe("Unknown Thing");
  });

  it("translates all 15 glossary entries", () => {
    const entries: [string, string][] = [
      ["Chain of Title", "Ownership History"],
      ["Encumbrances", "Claims Against Property"],
      ["Encumbrance Lifecycles", "Claims Against Property"],
      ["Deed of Trust", "Mortgage"],
      ["Full Reconveyance", "Mortgage Paid Off"],
      ["Partial Reconveyance", "Partial Payoff"],
      ["Warranty Deed", "Sale Deed"],
      ["Special Warranty Deed", "Sale Deed (Limited)"],
      ["Quit Claim Deed", "Ownership Transfer"],
      ["Grant Deed", "Sale Deed"],
      ["Grantor", "Previous Owner"],
      ["Grantee", "New Owner"],
      ["DOT", "Mortgage"],
      ["Assignment of DOT", "Mortgage Transfer"],
      ["HELOC DOT", "Home Equity Loan"],
      ["Trustor/Borrower", "Borrower"],
    ];
    for (const [pro, plain] of entries) {
      expect(translate(pro)).toBe(plain);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/glossary.test.ts`
Expected: FAIL — cannot find module `../src/terminology/glossary`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/terminology/glossary.ts
const GLOSSARY: Record<string, string> = {
  "chain of title": "Ownership History",
  "encumbrances": "Claims Against Property",
  "encumbrance lifecycles": "Claims Against Property",
  "deed of trust": "Mortgage",
  "full reconveyance": "Mortgage Paid Off",
  "partial reconveyance": "Partial Payoff",
  "warranty deed": "Sale Deed",
  "special warranty deed": "Sale Deed (Limited)",
  "quit claim deed": "Ownership Transfer",
  "grant deed": "Sale Deed",
  "grantor": "Previous Owner",
  "grantee": "New Owner",
  "dot": "Mortgage",
  "assignment of dot": "Mortgage Transfer",
  "heloc dot": "Home Equity Loan",
  "trustor/borrower": "Borrower",
};

export function translate(term: string): string {
  return GLOSSARY[term.toLowerCase()] ?? term;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/glossary.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/terminology/glossary.ts tests/glossary.test.ts
git commit -m "feat(h3): glossary module with 16 term translations"
```

---

### Task 2: TerminologyContext provider

**Files:**
- Create: `src/terminology/TerminologyContext.tsx`
- Test: `tests/terminology-context.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/terminology-context.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import {
  TerminologyProvider,
  useTerminology,
} from "../src/terminology/TerminologyContext";

function TestHarness() {
  const { mode, toggle, t } = useTerminology();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="translated">{t("Deed of Trust")}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}

describe("TerminologyContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("defaults to professional mode", () => {
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("professional");
    expect(screen.getByTestId("translated")).toHaveTextContent("Deed of Trust");
  });

  it("translates in plain mode", async () => {
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    await userEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    expect(screen.getByTestId("translated")).toHaveTextContent("Mortgage");
  });

  it("persists mode to localStorage", async () => {
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    await userEvent.click(screen.getByText("Toggle"));
    expect(localStorage.getItem("terminology-mode")).toBe("plain");
  });

  it("reads initial mode from localStorage", () => {
    localStorage.setItem("terminology-mode", "plain");
    render(
      <TerminologyProvider>
        <TestHarness />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("plain");
    expect(screen.getByTestId("translated")).toHaveTextContent("Mortgage");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/terminology-context.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/terminology/TerminologyContext.tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { translate } from "./glossary";

type Mode = "professional" | "plain";

interface TerminologyContextValue {
  mode: Mode;
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

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(readStoredMode);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "professional" ? "plain" : "professional";
      try { localStorage.setItem("terminology-mode", next); } catch {}
      return next;
    });
  }, []);

  const t = useCallback(
    (term: string): string => (mode === "plain" ? translate(term) : term),
    [mode],
  );

  return <Ctx value={{ mode, toggle, t }}>{children}</Ctx>;
}

export function useTerminology(): TerminologyContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTerminology must be inside TerminologyProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/terminology-context.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/terminology/TerminologyContext.tsx tests/terminology-context.test.tsx
git commit -m "feat(h3): TerminologyContext with localStorage persistence"
```

---

### Task 3: Term + TermSection components

**Files:**
- Create: `src/terminology/Term.tsx`
- Test: `tests/term-component.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/term-component.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";
import { Term, TermSection } from "../src/terminology/Term";

function renderPlain(ui: React.ReactElement) {
  localStorage.setItem("terminology-mode", "plain");
  return render(<TerminologyProvider>{ui}</TerminologyProvider>);
}

function renderPro(ui: React.ReactElement) {
  localStorage.setItem("terminology-mode", "professional");
  return render(<TerminologyProvider>{ui}</TerminologyProvider>);
}

describe("Term", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("renders original text in professional mode", () => {
    renderPro(
      <TermSection id="test">
        <Term professional="Deed of Trust" />
      </TermSection>,
    );
    expect(screen.getByText("Deed of Trust")).toBeInTheDocument();
    expect(screen.queryByTitle(/Professional term/)).not.toBeInTheDocument();
  });

  it("renders translated text with ? icon in plain mode", () => {
    renderPlain(
      <TermSection id="test">
        <Term professional="Deed of Trust" />
      </TermSection>,
    );
    expect(screen.getByText("Mortgage")).toBeInTheDocument();
    const hint = screen.getByTitle("Professional term: Deed of Trust");
    expect(hint).toBeInTheDocument();
  });

  it("shows ? icon only on first occurrence per section", () => {
    renderPlain(
      <TermSection id="test">
        <Term professional="Deed of Trust" />
        <Term professional="Deed of Trust" />
        <Term professional="Deed of Trust" />
      </TermSection>,
    );
    const hints = screen.getAllByTitle("Professional term: Deed of Trust");
    expect(hints).toHaveLength(1);
    const allMortgage = screen.getAllByText("Mortgage");
    expect(allMortgage).toHaveLength(3);
  });

  it("resets ? icon across different sections", () => {
    renderPlain(
      <>
        <TermSection id="section-a">
          <Term professional="Grantor" />
        </TermSection>
        <TermSection id="section-b">
          <Term professional="Grantor" />
        </TermSection>
      </>,
    );
    const hints = screen.getAllByTitle("Professional term: Grantor");
    expect(hints).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/term-component.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/terminology/Term.tsx
import { createContext, useContext, useRef, type ReactNode } from "react";
import { useTerminology } from "./TerminologyContext";

const SectionCtx = createContext<Set<string> | null>(null);

export function TermSection({ id: _id, children }: { id: string; children: ReactNode }) {
  const seenRef = useRef(new Set<string>());
  return <SectionCtx value={seenRef.current}>{children}</SectionCtx>;
}

export function Term({ professional }: { professional: string }) {
  const { mode, t } = useTerminology();
  const seen = useContext(SectionCtx);

  if (mode === "professional") {
    return <>{professional}</>;
  }

  const translated = t(professional);
  const isTranslated = translated !== professional;
  const showHint = isTranslated && seen !== null && !seen.has(professional.toLowerCase());

  if (showHint) {
    seen!.add(professional.toLowerCase());
  }

  return (
    <>
      {translated}
      {showHint && (
        <span
          className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1 rounded-full bg-gray-200 text-gray-500 text-[10px] leading-none cursor-help align-middle"
          title={`Professional term: ${professional}`}
        >
          ?
        </span>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/term-component.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/terminology/Term.tsx tests/term-component.test.tsx
git commit -m "feat(h3): Term + TermSection components with first-occurrence ? icon"
```

---

### Task 4: Wire TerminologyProvider into app + add toggle to nav

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Test: `tests/terminology-toggle-nav.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/terminology-toggle-nav.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";
import { AppShell } from "../src/App";

function renderWithRouter(initialPath = "/parcel/304-78-386") {
  return render(
    <TerminologyProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="parcel/:apn" element={<div>chain content</div>} />
            <Route path="parcel/:apn/encumbrances" element={<div>enc content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TerminologyProvider>,
  );
}

describe("Nav terminology toggle", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("shows professional labels by default", () => {
    renderWithRouter();
    expect(screen.getByText("Chain of Title")).toBeInTheDocument();
    expect(screen.getByText("Encumbrances")).toBeInTheDocument();
  });

  it("switches to plain-English labels on toggle", async () => {
    renderWithRouter();
    await userEvent.click(screen.getByText("Plain English"));
    expect(screen.getByText("Ownership History")).toBeInTheDocument();
    expect(screen.getByText("Claims Against Property")).toBeInTheDocument();
  });

  it("toggles back to professional", async () => {
    renderWithRouter();
    await userEvent.click(screen.getByText("Plain English"));
    await userEvent.click(screen.getByText("Professional"));
    expect(screen.getByText("Chain of Title")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/terminology-toggle-nav.test.tsx`
Expected: FAIL — AppShell doesn't render Term components yet

- [ ] **Step 3: Wrap app in TerminologyProvider**

Edit `src/main.tsx` — wrap `RouterProvider` with `TerminologyProvider`:

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { TerminologyProvider } from "./terminology/TerminologyContext";
import { routes } from "./router";
import "./index.css";

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TerminologyProvider>
      <RouterProvider router={router} />
    </TerminologyProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Add toggle + Term-wrapped labels to App.tsx**

Edit `src/App.tsx`:

```tsx
import "maplibre-gl/dist/maplibre-gl.css";
import { Link, Outlet, useMatch, useParams } from "react-router";
import { useParcelData } from "./hooks/useParcelData";
import { useAllParcels } from "./hooks/useAllParcels";
import { PipelineBanner } from "./components/PipelineBanner";
import { useTerminology } from "./terminology/TerminologyContext";
import { Term, TermSection } from "./terminology/Term";

export function AppShell() {
  const params = useParams();
  const selectedApn = params.apn ?? null;
  const { mode, toggle } = useTerminology();

  const matchSearch = useMatch("/");
  const matchChain = useMatch("/parcel/:apn");
  const matchChainInstrument = useMatch(
    "/parcel/:apn/instrument/:instrumentNumber",
  );
  const matchEncumbrance = useMatch("/parcel/:apn/encumbrances");
  const matchEncumbranceInstrument = useMatch(
    "/parcel/:apn/encumbrances/instrument/:instrumentNumber",
  );
  const onSearch = matchSearch !== null;
  const onChain = matchChain !== null || matchChainInstrument !== null;
  const onEncumbrance =
    matchEncumbrance !== null || matchEncumbranceInstrument !== null;

  const parcels = useAllParcels();
  const apnIsInCorpus =
    selectedApn !== null && parcels.some((p) => p.apn === selectedApn);
  const parcelData = useParcelData(apnIsInCorpus ? selectedApn : null);
  const hasParcel = apnIsInCorpus;

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <PipelineBanner />
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 shrink-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-recorder-900">
            Land Custodian Portal
          </h1>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Maricopa County, AZ
          </span>
        </div>
        <TermSection id="nav">
          <Link
            to="/"
            className={`px-3 py-1 rounded text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${onSearch ? "bg-recorder-100 text-recorder-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            Search
          </Link>
          {hasParcel ? (
            <Link
              to={`/parcel/${selectedApn}`}
              className={`px-3 py-1 rounded text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${onChain ? "bg-recorder-100 text-recorder-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              <Term professional="Chain of Title" />
            </Link>
          ) : (
            <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
              <Term professional="Chain of Title" />
            </span>
          )}
          {hasParcel ? (
            <Link
              to={`/parcel/${selectedApn}/encumbrances`}
              className={`px-3 py-1 rounded text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${onEncumbrance ? "bg-recorder-100 text-recorder-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              <Term professional="Encumbrances" />
            </Link>
          ) : (
            <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
              <Term professional="Encumbrances" />
            </span>
          )}
        </TermSection>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">Terminology:</span>
            <button
              onClick={mode === "plain" ? toggle : undefined}
              className={`px-1.5 py-0.5 rounded transition-colors duration-150 ${mode === "professional" ? "font-semibold text-gray-800" : "text-gray-400 hover:text-gray-600 cursor-pointer"}`}
            >
              Professional
            </button>
            <button
              onClick={mode === "professional" ? toggle : undefined}
              className={`px-1.5 py-0.5 rounded transition-colors duration-150 ${mode === "plain" ? "font-semibold text-gray-800" : "text-gray-400 hover:text-gray-600 cursor-pointer"}`}
            >
              Plain English
            </button>
          </div>
          {hasParcel && !onSearch && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                {parcelData.parcel.address} &middot; APN <span className="font-mono">{parcelData.parcel.apn}</span>
              </span>
              <Link
                to="/"
                className="text-recorder-500 hover:text-recorder-700 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              >
                &larr; Search another parcel
              </Link>
            </div>
          )}
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/terminology-toggle-nav.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/App.tsx tests/terminology-toggle-nav.test.tsx
git commit -m "feat(h3): wire TerminologyProvider + toggle control in nav"
```

---

### Task 5: Integrate Term into ChainOfTitle

**Files:**
- Modify: `src/components/ChainOfTitle.tsx`

- [ ] **Step 1: Add imports and wrap heading**

Add these imports to the top of `src/components/ChainOfTitle.tsx`:

```ts
import { useTerminology } from "../terminology/TerminologyContext";
import { Term, TermSection } from "../terminology/Term";
```

Replace the heading (line 86):
```tsx
// old:
<h2 className="text-2xl font-bold text-gray-800">Chain of Title</h2>
// new:
<h2 className="text-2xl font-bold text-gray-800"><Term professional="Chain of Title" /></h2>
```

- [ ] **Step 2: Wrap TYPE_LABELS badge usage with t()**

In the `DeedCard` component, replace the direct TYPE_LABELS usage (line 194):
```tsx
// old:
{TYPE_LABELS[deed.document_type]}
// new:
{t(TYPE_LABELS[deed.document_type])}
```

Add `const { t } = useTerminology();` as the first line inside `DeedCard`.

- [ ] **Step 3: Wrap Grantor/Grantee labels**

Replace the dt labels in DeedCard (lines 211, 217):
```tsx
// old:
<dt className="text-xs font-medium text-gray-500 self-start pt-0.5">
  Grantor
</dt>
// new:
<dt className="text-xs font-medium text-gray-500 self-start pt-0.5">
  <Term professional="Grantor" />
</dt>
```

Same for Grantee:
```tsx
// old:
<dt className="text-xs font-medium text-gray-500 self-start pt-0.5">
  Grantee
</dt>
// new:
<dt className="text-xs font-medium text-gray-500 self-start pt-0.5">
  <Term professional="Grantee" />
</dt>
```

- [ ] **Step 4: Add TermSection boundaries**

Wrap the heading area (the `<div className="mb-6">` at line 85) in `<TermSection id="chain-heading">`.

Wrap the ownership periods block (`<div className="mb-8">` at line 95) in `<TermSection id="ownership-periods">`.

Wrap the conveyance instruments block (`<div>` at line 158, containing the deeds) in `<TermSection id="conveyance-instruments">`.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All existing tests pass, no regressions

- [ ] **Step 6: Commit**

```bash
git add src/components/ChainOfTitle.tsx
git commit -m "feat(h3): plain-English terms in ChainOfTitle"
```

---

### Task 6: Integrate Term into InstrumentRow

**Files:**
- Modify: `src/components/InstrumentRow.tsx`

- [ ] **Step 1: Add import and translate badge text**

Add import:
```ts
import { useTerminology } from "../terminology/TerminologyContext";
```

Inside `InstrumentRow`, add `const { t } = useTerminology();` before `getGrantors`.

Replace the badge text (line 44):
```tsx
// old:
{TYPE_LABELS[instrument.document_type]}
// new:
{t(TYPE_LABELS[instrument.document_type])}
```

Note: `InstrumentRow` does NOT get its own `<TermSection>`. It inherits from its parent component's section — this is intentional so the "?" icon shows only once per section even when multiple InstrumentRows render the same type.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/InstrumentRow.tsx
git commit -m "feat(h3): plain-English terms in InstrumentRow badges"
```

---

### Task 7: Integrate Term into EncumbranceLifecycle

**Files:**
- Modify: `src/components/EncumbranceLifecycle.tsx`

- [ ] **Step 1: Add imports**

```ts
import { useTerminology } from "../terminology/TerminologyContext";
import { Term, TermSection } from "../terminology/Term";
```

- [ ] **Step 2: Wrap page heading**

Replace the heading (line 179-181):
```tsx
// old:
<h2 className="text-2xl font-bold text-gray-800">
  Encumbrance Lifecycles
</h2>
// new:
<h2 className="text-2xl font-bold text-gray-800">
  <Term professional="Encumbrance Lifecycles" />
</h2>
```

Wrap the heading area (`<div className="mb-6 ...">` at line 177) in `<TermSection id="encumbrance-heading">`.

- [ ] **Step 3: Translate labelForDocumentType() via t()**

Add `const { t } = useTerminology();` at the top of the component function body (inside `EncumbranceLifecycle`, not inside `labelForDocumentType` since it's a standalone function).

The lifecycle header (line 269) renders `labelForDocumentType(...)`. Replace the usage site:
```tsx
// old:
{labelForDocumentType(rootInst.document_type, rootInst.document_type_raw)}: <span ...>
// new:
{t(labelForDocumentType(rootInst.document_type, rootInst.document_type_raw))}: <span ...>
```

- [ ] **Step 4: Wrap each lifecycle card in TermSection**

Wrap the lifecycle card `<div key={lifecycle.id} className="bg-white border ...">` in `<TermSection id={lifecycle.id}>`.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/EncumbranceLifecycle.tsx
git commit -m "feat(h3): plain-English terms in EncumbranceLifecycle"
```

---

### Task 8: Integrate Term into ProofDrawer

**Files:**
- Modify: `src/components/ProofDrawer.tsx`

- [ ] **Step 1: Add imports**

```ts
import { Term, TermSection } from "../terminology/Term";
```

- [ ] **Step 2: Wrap field labels**

Wrap the "Extracted Fields" section content (starting at line 162) in `<TermSection id="proof-extracted-fields">`.

Replace the `FieldDisplay` labels for translatable terms:

```tsx
// old:
{grantors.length > 0 && (
  <FieldDisplay label="Grantor" value={grantors.join("; ")} />
)}
// new:
{grantors.length > 0 && (
  <FieldDisplay label={<Term professional="Grantor" />} value={grantors.join("; ")} />
)}
```

Same for Grantee:
```tsx
<FieldDisplay label={<Term professional="Grantee" />} value={grantees.join("; ")} />
```

Same for Trustor/Borrower:
```tsx
<FieldDisplay label={<Term professional="Trustor/Borrower" />} value={trustors.join("; ")} />
```

`Lender` and `Releasing Party` stay unwrapped (already plain English).

- [ ] **Step 3: Update FieldDisplay to accept ReactNode label**

The `FieldDisplay` component's `label` prop is likely typed as `string`. Update it to accept `ReactNode`:

```tsx
// Inside ProofDrawer.tsx, find FieldDisplay and change:
// old:
function FieldDisplay({ label, value }: { label: string; value: string }) {
// new:
function FieldDisplay({ label, value }: { label: React.ReactNode; value: string }) {
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/ProofDrawer.tsx
git commit -m "feat(h3): plain-English terms in ProofDrawer"
```

---

### Task 9: Staff workbench footer link on landing page

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Add the footer link**

In `src/components/LandingPage.tsx`, add a third link to the `<footer>` element (after the moat-compare link, around line 102):

```tsx
// Add after the moat-compare Link:
<Link
  to="/staff"
  className="underline underline-offset-2 text-slate-400 hover:text-slate-600"
>
  County staff? Open workbench &rarr;
</Link>
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (the existing landing-page.dom.test.tsx should not break)

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(h3): staff workbench footer link on landing page"
```

---

### Task 10: Full build + lint verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Clean build, no TypeScript errors

- [ ] **Step 4: Final commit with all work**

If any lint/build fixes were needed, commit them:
```bash
git add -A
git commit -m "fix(h3): lint/build fixes for plain-English toggle"
```

- [ ] **Step 5: Create the feature commit**

```bash
git log --oneline -10
```

Verify all task commits are on `claude/h3-plain-english` branch.
