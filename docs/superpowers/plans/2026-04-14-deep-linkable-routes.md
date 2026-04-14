# Deep-Linkable Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the URL reflect app state — pasting `/parcel/:apn` or `/parcel/:apn/instrument/:n` lands on the right screen with the Proof Drawer pre-opened, and `/instrument/:n` resolves client-side to the owning parcel.

**Architecture:** Replace `useState`-driven navigation in `App.tsx` with react-router v7 in browser mode. `main.tsx` mounts `<RouterProvider>`. New `router.tsx` defines routes + thin route components. `App.tsx` becomes the `<AppShell>` layout (nav + split-pane frame) rendered as the root route's element, with `<Outlet />` for routed content. Existing components (`ChainOfTitle`, `EncumbranceLifecycle`, `ProofDrawer`, `SearchEntry`) stay URL-unaware.

**Tech Stack:** React 19, react-router v7 (new dep), Vite 8, Vitest 4, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-04-14-deep-linkable-routes-design.md`

**Worktree:** `.claude/worktrees/tier1-c` on branch `tier1-c`.

---

## File Structure

### New files
- `src/router.tsx` — `createBrowserRouter` call, route-element components, pure `resolveInstrumentToApn` helper, `NotFoundPanel`, `AppShell` is imported from `App.tsx`.
- `tests/routing.test.ts` — zero-dep routing tests via `createMemoryRouter` + pure resolver tests.

### Modified files
- `src/main.tsx` — replace `<App />` with `<RouterProvider router={router} />`.
- `src/App.tsx` — export `AppShell` (nav + split-pane layout with `<Outlet />`). Remove all `useState` for navigation. Remove `screen`-aware conditional rendering inside main (route components handle that).
- `package.json` + `package-lock.json` — add `react-router@^7`.
- `CLAUDE.md` — append Decision #36, add "App Routes" section listing canonical URL shapes.
- `docs/demo-script.md` — rewrite Beat 2 to show URL bar + paste-in-fresh-tab.

### Not touched
Any file under `src/components/`, `src/data/`, `src/logic/`, `src/hooks/`, `src/schemas.ts`, `src/types.ts`, other tests.

---

## Task 1: Add react-router dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install react-router v7**

Run from the worktree root:
```bash
cd .claude/worktrees/tier1-c
npm install react-router@^7
```

Expected: `package.json` gains `"react-router": "^7.x.x"` in `dependencies`; `package-lock.json` updates.

- [ ] **Step 2: Verify build still green (no code consuming it yet)**

Run: `npm run build`
Expected: build succeeds, emits `dist/`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(routing): add react-router v7 dependency"
```

---

## Task 2: Extract `resolveInstrumentToApn` pure helper + its test

This is the pure function the `/instrument/:n` resolver will use. TDD it first so the resolver component in Task 4 has a trusted primitive.

**Files:**
- Create: `src/router.tsx` (minimal — export only the helper for now)
- Create: `tests/routing.test.ts`

- [ ] **Step 1: Write the failing test for the pure resolver**

Create `tests/routing.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadAllParcels } from "../src/data-loader";
import { resolveInstrumentToApn } from "../src/router";

describe("resolveInstrumentToApn", () => {
  const parcels = loadAllParcels();

  it("returns the owning APN for a known 11-digit instrument", () => {
    // 20210075858 is the POPHAM 2021 reconveyance, on parcel 304-78-386
    expect(resolveInstrumentToApn("20210075858", parcels)).toBe("304-78-386");
  });

  it("returns the owning APN for a HOGUE instrument", () => {
    // 20150516729 is the HOGUE 2015 warranty deed, on parcel 304-77-689
    expect(resolveInstrumentToApn("20150516729", parcels)).toBe("304-77-689");
  });

  it("returns null for an 11-digit instrument not in the corpus", () => {
    expect(resolveInstrumentToApn("99999999999", parcels)).toBeNull();
  });

  it("returns null for a non-11-digit input", () => {
    expect(resolveInstrumentToApn("not-a-number", parcels)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- routing`
Expected: FAIL — `Cannot find module '../src/router'` (file does not exist yet).

- [ ] **Step 3: Create `src/router.tsx` with the resolver only**

```typescript
import type { Parcel } from "./types";
import { searchParcels } from "./logic/search";

/**
 * Resolve a bare 11-digit instrument number to the APN of the single
 * parcel that owns it. Returns null when the input isn't an 11-digit
 * number, or when no parcel in the corpus owns the instrument. Used by
 * the /instrument/:n client-side redirect resolver.
 */
export function resolveInstrumentToApn(
  instrumentNumber: string,
  parcels: Parcel[],
): string | null {
  const results = searchParcels(instrumentNumber, parcels);
  if (results.length !== 1) return null;
  const only = results[0];
  if (only.matchType !== "instrument") return null;
  return only.parcel.apn;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- routing`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/router.tsx tests/routing.test.ts
git commit -m "feat(routing): pure resolveInstrumentToApn helper + tests"
```

---

## Task 3: Write failing routing tests against `createMemoryRouter`

Build out the full routing test suite before the router itself exists. Uses `createMemoryRouter` and inspects `state.matches` — no DOM rendering.

**Files:**
- Modify: `tests/routing.test.ts`

- [ ] **Step 1: Add the memory-router tests**

Append to `tests/routing.test.ts`:

```typescript
import { createMemoryRouter } from "react-router";
import { routes } from "../src/router";

function matchIds(url: string): string[] {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return router.state.matches.map((m) => m.route.id!).filter(Boolean);
}

function matchParams(url: string): Record<string, string | undefined> {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const last = router.state.matches[router.state.matches.length - 1];
  return last.params;
}

describe("route table", () => {
  it("/ matches the search route", () => {
    expect(matchIds("/")).toContain("search");
  });

  it("/parcel/:apn matches the chain route", () => {
    expect(matchIds("/parcel/304-78-386")).toContain("chain");
    expect(matchParams("/parcel/304-78-386")).toEqual({ apn: "304-78-386" });
  });

  it("/parcel/:apn/instrument/:instrumentNumber matches chain-with-instrument", () => {
    const ids = matchIds("/parcel/304-78-386/instrument/20210075858");
    expect(ids).toContain("chain-instrument");
    expect(matchParams("/parcel/304-78-386/instrument/20210075858")).toEqual({
      apn: "304-78-386",
      instrumentNumber: "20210075858",
    });
  });

  it("/parcel/:apn/encumbrances matches the encumbrance route", () => {
    expect(matchIds("/parcel/304-78-386/encumbrances")).toContain(
      "encumbrance",
    );
    expect(matchParams("/parcel/304-78-386/encumbrances")).toEqual({
      apn: "304-78-386",
    });
  });

  it("/parcel/:apn/encumbrances/instrument/:n matches encumbrance-with-instrument", () => {
    const ids = matchIds(
      "/parcel/304-78-386/encumbrances/instrument/20210075858",
    );
    expect(ids).toContain("encumbrance-instrument");
    expect(
      matchParams("/parcel/304-78-386/encumbrances/instrument/20210075858"),
    ).toEqual({ apn: "304-78-386", instrumentNumber: "20210075858" });
  });

  it("/instrument/:n matches the resolver route", () => {
    const ids = matchIds("/instrument/20210075858");
    expect(ids).toContain("instrument-resolver");
    expect(matchParams("/instrument/20210075858")).toEqual({
      instrumentNumber: "20210075858",
    });
  });

  it("unknown paths match the not-found route", () => {
    expect(matchIds("/totally/bogus/path")).toContain("not-found");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- routing`
Expected: FAIL — `routes` not exported from `../src/router`. Pure-function tests from Task 2 still pass.

---

## Task 4: Implement the route table and route components in `src/router.tsx`

Replace the minimal `router.tsx` from Task 2 with the full router. Export `routes` (for tests) and `router` (for `main.tsx`). Route components are defined here.

**Files:**
- Modify: `src/router.tsx`
- Modify: `src/App.tsx` (export `AppShell` — will be fully fleshed out in Task 5; for now stub it so the router imports resolve)

- [ ] **Step 1: Stub `AppShell` export in `App.tsx`**

At the top of `src/App.tsx`, BEFORE the `export default function App()`, add:

```typescript
import { Outlet } from "react-router";
```

At the bottom of `src/App.tsx`, add a temporary export (will be replaced in Task 5):

```typescript
export function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
      <Outlet />
    </div>
  );
}
```

Keep the existing `export default function App()` in place for now — it'll be removed in Task 5.

- [ ] **Step 2: Rewrite `src/router.tsx` with the full route table**

Replace the contents of `src/router.tsx` with:

```typescript
import { createBrowserRouter, Link, Navigate, useParams } from "react-router";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { RouteObject } from "react-router";
import type { Parcel } from "./types";
import { searchParcels } from "./logic/search";
import { AppShell } from "./App";
import { SearchEntry } from "./components/SearchEntry";
import { ChainOfTitle } from "./components/ChainOfTitle";
import { EncumbranceLifecycle } from "./components/EncumbranceLifecycle";
import { ProofDrawer } from "./components/ProofDrawer";
import { useAllParcels } from "./hooks/useAllParcels";
import { useParcelData } from "./hooks/useParcelData";
import { useExaminerActions } from "./hooks/useExaminerActions";

/**
 * Resolve a bare 11-digit instrument number to the APN of the single
 * parcel that owns it. Returns null when the input isn't an 11-digit
 * number, or when no parcel in the corpus owns the instrument.
 */
export function resolveInstrumentToApn(
  instrumentNumber: string,
  parcels: Parcel[],
): string | null {
  const results = searchParcels(instrumentNumber, parcels);
  if (results.length !== 1) return null;
  const only = results[0];
  if (only.matchType !== "instrument") return null;
  return only.parcel.apn;
}

function NotFoundPanel({
  title = "Not in this corpus",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 mb-6">{subtitle}</p>}
      <Link to="/" className="text-blue-600 hover:text-blue-800 hover:underline">
        Return to search
      </Link>
    </div>
  );
}

// Placeholder route elements — filled in by Task 5 along with the
// AppShell rewrite. For now they just render text so routing tests
// can check match IDs without triggering component-level breakage.

function SearchRoute() {
  return <div data-testid="route-search">search</div>;
}

function ChainRoute() {
  return <div data-testid="route-chain">chain</div>;
}

function EncumbranceRoute() {
  return <div data-testid="route-encumbrance">encumbrance</div>;
}

function InstrumentResolver() {
  const { instrumentNumber } = useParams();
  const parcels = useAllParcels();
  const navigate = useNavigate();

  useEffect(() => {
    if (!instrumentNumber) return;
    const apn = resolveInstrumentToApn(instrumentNumber, parcels);
    if (apn) {
      navigate(`/parcel/${apn}/instrument/${instrumentNumber}`, {
        replace: true,
      });
    }
  }, [instrumentNumber, parcels, navigate]);

  const apn = instrumentNumber
    ? resolveInstrumentToApn(instrumentNumber, parcels)
    : null;
  if (instrumentNumber && !apn) {
    return (
      <NotFoundPanel
        title="Instrument not in this corpus"
        subtitle={`No parcel owns instrument ${instrumentNumber} in the curated set.`}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center text-sm text-gray-600">
      Resolving instrument…
    </div>
  );
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { id: "search", index: true, element: <SearchRoute /> },
      {
        id: "chain",
        path: "parcel/:apn",
        element: <ChainRoute />,
      },
      {
        id: "chain-instrument",
        path: "parcel/:apn/instrument/:instrumentNumber",
        element: <ChainRoute />,
      },
      {
        id: "encumbrance",
        path: "parcel/:apn/encumbrances",
        element: <EncumbranceRoute />,
      },
      {
        id: "encumbrance-instrument",
        path: "parcel/:apn/encumbrances/instrument/:instrumentNumber",
        element: <EncumbranceRoute />,
      },
      {
        id: "instrument-resolver",
        path: "instrument/:instrumentNumber",
        element: <InstrumentResolver />,
      },
      {
        id: "not-found",
        path: "*",
        element: <NotFoundPanel />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

// Re-exports so Task 5's route components (inside this file) can use
// the loaded hooks without circular imports through App.tsx.
export {
  SearchEntry,
  ChainOfTitle,
  EncumbranceLifecycle,
  ProofDrawer,
  useParcelData,
  useExaminerActions,
};

// Silence the unused-import complaints until Task 5 wires them into
// the route components.
void SearchEntry;
void ChainOfTitle;
void EncumbranceLifecycle;
void ProofDrawer;
void useParcelData;
void useExaminerActions;
```

- [ ] **Step 3: Run tests to verify routing tests now pass**

Run: `npm run test -- routing`
Expected: PASS (11 tests total — 4 resolver + 7 route matching).

- [ ] **Step 4: Verify full test suite still green**

Run: `npm run test`
Expected: all existing tests still pass (108 + 11 = 119, or thereabouts).

- [ ] **Step 5: Commit**

```bash
git add src/router.tsx src/App.tsx tests/routing.test.ts
git commit -m "feat(routing): route table + memory-router tests"
```

---

## Task 5: Rewrite `App.tsx` as `AppShell` and wire real route components

Replace the stub `AppShell` with the real one (nav bar + split-pane layout), move `SearchRoute`/`ChainRoute`/`EncumbranceRoute` into `router.tsx` with full behavior, and remove `App` default export.

**Files:**
- Modify: `src/App.tsx` (full rewrite)
- Modify: `src/router.tsx` (flesh out route components)

- [ ] **Step 1: Rewrite `src/App.tsx`**

Replace the entire contents of `src/App.tsx` with:

```typescript
import { Link, Outlet, useMatch, useParams } from "react-router";
import { useParcelData } from "./hooks/useParcelData";

export function AppShell() {
  const params = useParams();
  const selectedApn = params.apn ?? null;

  // Route-aware nav highlighting without coupling route components to
  // the shell: match the URL prefixes directly.
  const onSearch = useMatch("/") !== null;
  const onChain =
    useMatch("/parcel/:apn") !== null ||
    useMatch("/parcel/:apn/instrument/:instrumentNumber") !== null;
  const onEncumbrance =
    useMatch("/parcel/:apn/encumbrances") !== null ||
    useMatch("/parcel/:apn/encumbrances/instrument/:instrumentNumber") !== null;

  // Load parcel address info for the nav-bar label when on a parcel
  // route. Safe to call with null; the hook falls back to the default
  // corpus then, but the label only shows when selectedApn is set.
  const parcelData = useParcelData(selectedApn);
  const hasParcel = selectedApn !== null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 shrink-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-blue-900">
            Land Custodian Portal
          </h1>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Maricopa County, AZ
          </span>
        </div>
        <Link
          to="/"
          className={`px-3 py-1 rounded text-sm ${onSearch ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Search
        </Link>
        {hasParcel ? (
          <Link
            to={`/parcel/${selectedApn}`}
            className={`px-3 py-1 rounded text-sm ${onChain ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            Chain of Title
          </Link>
        ) : (
          <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
            Chain of Title
          </span>
        )}
        {hasParcel ? (
          <Link
            to={`/parcel/${selectedApn}/encumbrances`}
            className={`px-3 py-1 rounded text-sm ${onEncumbrance ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            Encumbrances
          </Link>
        ) : (
          <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
            Encumbrances
          </span>
        )}
        {hasParcel && !onSearch && (
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span>
              {parcelData.parcel.address} &middot; APN {parcelData.parcel.apn}
            </span>
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              &larr; Search another parcel
            </Link>
          </div>
        )}
      </nav>

      <Outlet />
    </div>
  );
}
```

Note: `AppShell` no longer renders the split-pane layout directly — that responsibility moves to the route components that know whether a drawer is open. This keeps `AppShell` unaware of `instrumentNumber`.

- [ ] **Step 2: Replace the placeholder route components in `src/router.tsx`**

In `src/router.tsx`, replace the stub `SearchRoute`, `ChainRoute`, `EncumbranceRoute` (and remove the `void ...` trailing block) with:

```typescript
function SplitPane({
  main,
  drawer,
}: {
  main: React.ReactNode;
  drawer: React.ReactNode | null;
}) {
  const drawerOpen = drawer !== null;
  return (
    <div className="flex-1 flex overflow-hidden">
      <main
        className={`${drawerOpen ? "w-1/2" : "w-full"} overflow-auto transition-[width] duration-200`}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">{main}</div>
      </main>
      {drawerOpen && (
        <aside className="w-1/2 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
          {drawer}
        </aside>
      )}
    </div>
  );
}

function corpusProvenanceOf(data: ReturnType<typeof useParcelData>) {
  return data.instruments.reduce(
    (acc, inst) => {
      const s = inst.provenance_summary;
      if (!s) return acc;
      return {
        public_api: acc.public_api + s.public_api_count,
        ocr: acc.ocr + s.ocr_count,
        manual_entry: acc.manual_entry + s.manual_entry_count,
      };
    },
    { public_api: 0, ocr: 0, manual_entry: 0 },
  );
}

function SearchRoute() {
  const parcels = useAllParcels();
  const navigate = useNavigate();
  return (
    <SplitPane
      main={
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
      }
      drawer={null}
    />
  );
}

function ParcelGuard({
  children,
}: {
  children: (apn: string) => React.ReactNode;
}) {
  const { apn } = useParams();
  const parcels = useAllParcels();
  if (!apn || !parcels.find((p) => p.apn === apn)) {
    return (
      <SplitPane
        main={
          <NotFoundPanel
            title="Parcel not in this corpus"
            subtitle={apn ? `APN ${apn} is not in the curated set.` : undefined}
          />
        }
        drawer={null}
      />
    );
  }
  return <>{children(apn)}</>;
}

function ChainRoute() {
  return (
    <ParcelGuard>
      {(apn) => <ChainRouteInner apn={apn} />}
    </ParcelGuard>
  );
}

function ChainRouteInner({ apn }: { apn: string }) {
  const { instrumentNumber } = useParams();
  const data = useParcelData(apn);
  const navigate = useNavigate();

  const drawerInstrument = instrumentNumber ?? null;
  const drawerOpen = drawerInstrument !== null;
  const instrumentForDrawer = drawerOpen
    ? data.instruments.find((i) => i.instrument_number === drawerInstrument)
    : undefined;
  const linksForDrawer = drawerOpen
    ? data.links.filter(
        (l) =>
          l.source_instrument === drawerInstrument ||
          l.target_instrument === drawerInstrument,
      )
    : [];

  const openDrawer = (n: string) =>
    navigate(`/parcel/${apn}/instrument/${n}`);
  const closeDrawer = () => navigate(`/parcel/${apn}`);

  const drawerNode =
    drawerOpen && instrumentForDrawer ? (
      <ProofDrawer
        instrument={instrumentForDrawer}
        links={linksForDrawer}
        corpusProvenance={corpusProvenanceOf(data)}
        onClose={closeDrawer}
      />
    ) : drawerOpen ? (
      <NotFoundPanel
        title="Instrument not on this parcel"
        subtitle={`Instrument ${drawerInstrument} is not in the curated set for APN ${apn}.`}
      />
    ) : null;

  return (
    <SplitPane
      main={
        <ChainOfTitle
          parcel={data.parcel}
          instruments={data.instruments}
          links={data.links}
          onOpenDocument={openDrawer}
        />
      }
      drawer={drawerNode}
    />
  );
}

function EncumbranceRoute() {
  return (
    <ParcelGuard>
      {(apn) => <EncumbranceRouteInner apn={apn} />}
    </ParcelGuard>
  );
}

function EncumbranceRouteInner({ apn }: { apn: string }) {
  const { instrumentNumber } = useParams();
  const data = useParcelData(apn);
  const examiner = useExaminerActions(data.links);
  const navigate = useNavigate();

  const drawerInstrument = instrumentNumber ?? null;
  const drawerOpen = drawerInstrument !== null;
  const instrumentForDrawer = drawerOpen
    ? data.instruments.find((i) => i.instrument_number === drawerInstrument)
    : undefined;
  const linksForDrawer = drawerOpen
    ? data.links.filter(
        (l) =>
          l.source_instrument === drawerInstrument ||
          l.target_instrument === drawerInstrument,
      )
    : [];

  const openDrawer = (n: string) =>
    navigate(`/parcel/${apn}/encumbrances/instrument/${n}`);
  const closeDrawer = () => navigate(`/parcel/${apn}/encumbrances`);

  const drawerNode =
    drawerOpen && instrumentForDrawer ? (
      <ProofDrawer
        instrument={instrumentForDrawer}
        links={linksForDrawer}
        corpusProvenance={corpusProvenanceOf(data)}
        onClose={closeDrawer}
      />
    ) : drawerOpen ? (
      <NotFoundPanel
        title="Instrument not on this parcel"
        subtitle={`Instrument ${drawerInstrument} is not in the curated set for APN ${apn}.`}
      />
    ) : null;

  return (
    <SplitPane
      main={
        <EncumbranceLifecycle
          parcel={data.parcel}
          instruments={data.instruments}
          links={data.links}
          lifecycles={data.lifecycles}
          pipelineStatus={data.pipelineStatus}
          linkActions={examiner.linkActions}
          lifecycleOverrides={examiner.lifecycleOverrides}
          onSetLinkAction={examiner.setLinkAction}
          onSetLifecycleOverride={examiner.setLifecycleOverride}
          onOpenDocument={openDrawer}
        />
      }
      drawer={drawerNode}
    />
  );
}
```

Remove the trailing `void SearchEntry;` / `void ChainOfTitle;` / etc. block — those imports are now used directly.

Also remove the `import { AppShell } from "./App";` line — replace with `export { AppShell }` re-export is not needed; `AppShell` is imported by `router.tsx` from `App.tsx` and not re-exported.

Verify the top-level imports in `src/router.tsx` now include (and no more than):

```typescript
import { createBrowserRouter, Link, useNavigate, useParams } from "react-router";
import { useEffect } from "react";
import type { RouteObject } from "react-router";
import type { Parcel } from "./types";
import { searchParcels } from "./logic/search";
import { AppShell } from "./App";
import { SearchEntry } from "./components/SearchEntry";
import { ChainOfTitle } from "./components/ChainOfTitle";
import { EncumbranceLifecycle } from "./components/EncumbranceLifecycle";
import { ProofDrawer } from "./components/ProofDrawer";
import { useAllParcels } from "./hooks/useAllParcels";
import { useParcelData } from "./hooks/useParcelData";
import { useExaminerActions } from "./hooks/useExaminerActions";
```

Remove the `Navigate` import (unused — redirect uses `navigate()` in effect).

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the 7 route-matching tests and 4 resolver tests from Tasks 2 and 3.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/router.tsx
git commit -m "feat(routing): wire AppShell + route components to real UI"
```

---

## Task 6: Mount `<RouterProvider>` in `main.tsx`

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace `main.tsx` contents**

Replace the contents of `src/main.tsx` with:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds, emits `dist/`.

- [ ] **Step 3: Manually verify in dev server**

Run (in a separate terminal, stop when confirmed):
```bash
npm run dev
```

Open these URLs in turn:
- `http://localhost:5173/` → search screen.
- `http://localhost:5173/parcel/304-78-386` → POPHAM chain.
- `http://localhost:5173/parcel/304-78-386/instrument/20210075858` → chain + drawer on 2021 reconveyance.
- `http://localhost:5173/parcel/304-78-386/encumbrances` → encumbrance panel.
- `http://localhost:5173/instrument/20210075858` → briefly shows "Resolving instrument…", then redirects to `/parcel/304-78-386/instrument/20210075858`.
- `http://localhost:5173/parcel/nope` → "Parcel not in this corpus" panel.
- `http://localhost:5173/totally-bogus` → not-found panel.
- Refresh each URL to verify Vite SPA fallback works.

Stop `npm run dev` when verified.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat(routing): mount RouterProvider at root"
```

---

## Task 7: Update `CLAUDE.md` with Decision #36 and route table

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append Decision #36 to the decision log**

Find the last row of the `## Decision Log` table in `CLAUDE.md` (Decision #35) and add a new row immediately after it:

```markdown
| 36 | Deep-linkable routes via client-side react-router v7 | URL is source of truth for parcel + instrument navigation. `/parcel/:apn` and `/parcel/:apn/instrument/:n` are pasteable canonical addresses. `/instrument/:n` resolves client-side to the owning parcel via a resolver component — this produces a one-frame "Resolving instrument…" placeholder before redirect. A production version would use react-router loaders or a server-side 302 to eliminate the flash. Family: Decision #16 (snapshot vs live sync — server-side features stubbed in prototype). | 2026-04-14 |
```

- [ ] **Step 2: Add an "App Routes" section**

Add this new section to `CLAUDE.md` immediately after the `## Key Endpoints` section:

```markdown
## App Routes

- `/` — Search entry
- `/parcel/:apn` — Chain of Title for a parcel
- `/parcel/:apn/instrument/:instrumentNumber` — Chain + Proof Drawer
- `/parcel/:apn/encumbrances` — Encumbrance Lifecycle panel
- `/parcel/:apn/encumbrances/instrument/:instrumentNumber` — Encumbrance + Proof Drawer
- `/instrument/:instrumentNumber` — client-side redirect to the owning parcel URL (one-frame "Resolving instrument…" placeholder; see Decision #36)
- anything else — "Not in this corpus" panel with link back to `/`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: log Decision #36 (deep-linkable routes) + route table"
```

---

## Task 8: Update `docs/demo-script.md` Beat 2

Beat 2 already claims instrument-number deep linking. Update it to show the URL bar changing and demonstrate paste-into-fresh-tab.

**Files:**
- Modify: `docs/demo-script.md`

- [ ] **Step 1: Replace Beat 2**

In `docs/demo-script.md`, replace the entire `## Beat 2 — Instrument-number deep link (moat beat #1)` section with:

```markdown
## Beat 2 — Instrument-number deep link (moat beat #1)

- **Click:** type `20210075858` into the search box and hit Enter.
- **Shows:** app routes straight to the POPHAM Chain-of-Title timeline with
  the Proof Drawer pre-opened on instrument 20210075858 (2021 full
  reconveyance). The URL bar now reads
  `/parcel/304-78-386/instrument/20210075858`.
- **Click:** copy that URL and paste it into a fresh browser tab.
- **Shows:** the fresh tab lands on the exact same view — chain rendered,
  drawer pre-opened on the reconveyance, provenance attached.
- **Say:** "The 11-digit recording number is unique across the entire
  county index. Typing it deep-links you to the exact instrument, and
  the URL you see is the canonical address for that document in the
  county's own corpus. A title plant can index the number, but it can't
  serve the authoritative document at that URL — that's custody. Paste
  the URL into any browser, share it in a client email, cite it in a
  title commitment — it all resolves to the same provenance-tagged
  instrument."
```

- [ ] **Step 2: Commit**

```bash
git add docs/demo-script.md
git commit -m "docs(demo): update Beat 2 to show URL bar + paste-in-fresh-tab"
```

---

## Task 9: Final verification

**Files:** none modified

- [ ] **Step 1: Clean test run**

Run: `npm run test`
Expected: all tests pass (108 existing + 11 new = 119 total).

- [ ] **Step 2: Clean build**

Run: `npm run build`
Expected: TypeScript compile clean, Vite build emits `dist/`.

- [ ] **Step 3: Spot-check the done criteria**

Read through `docs/superpowers/specs/2026-04-14-deep-linkable-routes-design.md` § 11 and verify each bullet is satisfied. No action if all pass.

- [ ] **Step 4: Print the four canonical URLs**

Emit the summary line for the PR / review:

```
/
/parcel/304-78-386
/parcel/304-78-386/instrument/20210075858
/instrument/20210075858
```

Stop here and wait for review before merging.

---

## Self-Review

- **Spec coverage:** every section of the spec is covered by a task — §3 route table → Task 3 + 4, §5 state mapping → Task 5, §6 resolver → Task 2 + 4, §7 NotFound → Tasks 4 + 5, §8 file layout → Tasks 1, 4, 5, 6, §9 pure helper → Task 2, §10 test plan → Tasks 2 + 3, §11 done criteria → Task 9, §12 known limitations → Task 7.
- **No placeholders.** Every task has exact code, exact paths, exact commands.
- **Type consistency.** `resolveInstrumentToApn` signature identical across Task 2 and Task 4. Route IDs (`search`, `chain`, `chain-instrument`, `encumbrance`, `encumbrance-instrument`, `instrument-resolver`, `not-found`) consistent between test assertions (Task 3) and route table (Task 4). Param names (`apn`, `instrumentNumber`) identical everywhere.
- **Touch-surface respected.** Modified files: `App.tsx`, `main.tsx`, `router.tsx` (new), `package.json` + lock, `tests/routing.test.ts` (new), `CLAUDE.md`, `docs/demo-script.md`. Nothing under `src/components/`, `src/data/`, `src/logic/`, `src/hooks/`.
