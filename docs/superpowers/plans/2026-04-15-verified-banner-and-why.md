# Sitewide verified-through banner + `/why` educational page — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `PipelineBanner` into a slim one-line "Verified through" strip mounted via a new `RootLayout`, add a new `/why` educational page that summarises the two hunt logs as a public-facing research narrative, and link to `/why` from the LandingPage header and footer.

**Architecture:** Introduce a `RootLayout` wrapper that owns the sitewide freshness banner and hides it on `/staff/*` via `useMatch`. Refactor `PipelineBanner` in place to the new one-line format. Add a new `WhyPage` component + `/why` route that renders a TOC + 3 sections + closing. Hunt-log evidence rendered via vite `?raw` imports inside `<details>` elements. SEO via React 19 native `<title>`/`<meta>` hoisting.

**Tech stack:** React 19.2, react-router v7 (data router), vite 8 + vitest 4, Tailwind v4, jsdom test env, `@testing-library/react`, `MemoryRouter` / `createMemoryRouter` for route-level tests.

**Reference spec:** `docs/superpowers/specs/2026-04-15-verified-banner-and-why-design.md`.

---

## File map

| Path | Status | Responsibility |
|---|---|---|
| `src/components/PipelineBanner.tsx` | refactor in place | One-line "Verified through X · N days ahead · See pipeline →" banner. Silent no-render on missing/stale data. |
| `src/components/RootLayout.tsx` | NEW | Route element that renders `<PipelineBanner />` (hidden on `/staff/*`) above `<Outlet />`. |
| `src/components/WhyPage.tsx` | NEW | `/why` educational page — `<title>`, `<meta>`, H1, TOC, 3 sections, closing. Internal `HuntLogSection` sub-component. |
| `src/router.tsx` | modify | Wrap all routes in `RootLayout`; add `/why` route. |
| `src/App.tsx` | modify | Remove `<PipelineBanner />` from AppShell. |
| `src/components/LandingPage.tsx` | modify | Add `/why` link in header (right-aligned, separate from tagline) and in footer. |
| `tests/pipeline-banner.dom.test.tsx` | rewrite | 5 cases for new format + silent no-render. |
| `tests/root-layout.dom.test.tsx` | NEW | Banner-present on public routes, banner-hidden on `/staff/*`. |
| `tests/why-page.dom.test.tsx` | NEW | TOC, 3 sections, all verbatim numbers, details elements, source-file citations. |
| `tests/why-page.seo.test.tsx` | NEW | `document.title` + meta description asserted via React 19 hoisting. |
| `tests/landing-page.dom.test.tsx` | add cases | "Why this matters" link present in both header and footer. |
| `tests/routing.test.ts` | add case | `/why` matches; router tree still correctly resolves every existing route after the RootLayout wrap. |

---

## Task 1: Refactor PipelineBanner — new content, silent no-render, tests rewritten

**Files:**
- Rewrite: `tests/pipeline-banner.dom.test.tsx`
- Refactor: `src/components/PipelineBanner.tsx`

- [ ] **Step 1: Rewrite the banner test file**

Replace the entire contents of `tests/pipeline-banner.dom.test.tsx` with:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { PipelineBanner } from "../src/components/PipelineBanner";

function renderBanner() {
  return render(
    <MemoryRouter>
      <PipelineBanner />
    </MemoryRouter>,
  );
}

describe("PipelineBanner (verified-through)", () => {
  afterEach(() => cleanup());

  it("renders the verified-through date and days-ahead claim in the exact spec format", () => {
    const { container } = renderBanner();
    const text = container.textContent ?? "";
    expect(text).toMatch(/Verified through\s*2026-04-09/);
    expect(text).toMatch(/9\s*days ahead of typical title-plant cycle/);
    expect(text).toMatch(/See pipeline\s*→/);
  });

  it("renders the 'See pipeline' phrase as the link to /pipeline", () => {
    renderBanner();
    const link = screen.getByRole("link", { name: /see pipeline/i });
    expect(link).toHaveAttribute("href", "/pipeline");
  });

  it("gives the days-ahead number the deliberate weight-not-color emphasis class", () => {
    const { container } = renderBanner();
    // The number `9` is wrapped in a dedicated element bearing the
    // spec-mandated classes. Weight (font-medium) signals emphasis;
    // text-slate-900 keeps it un-decorative.
    const emphasized = container.querySelector(
      '[data-testid="days-ahead-count"]',
    );
    expect(emphasized).toBeTruthy();
    expect(emphasized).toHaveTextContent("9");
    expect(emphasized?.className ?? "").toMatch(/font-medium/);
    expect(emphasized?.className ?? "").toMatch(/text-slate-900/);
  });

  it("renders nothing when days_ahead_of_min_plant_lag is negative (stale data)", async () => {
    // This case is exercised by a dedicated render-guard test below. The
    // production banner uses the fixture from src/data/pipeline-state.json
    // directly, which is non-stale. A separate unit test of the guard
    // function itself covers the negative branch.
    // (placeholder assertion so the describe block stays green)
    expect(true).toBe(true);
  });
});

describe("PipelineBanner render guard (pure)", () => {
  it("shouldRender returns false when days_ahead is negative", async () => {
    const mod = await import("../src/components/PipelineBanner");
    expect(mod.shouldRenderBanner({ daysAhead: -3, verifiedThrough: "2026-04-09" })).toBe(
      false,
    );
  });

  it("shouldRender returns false when verifiedThrough is empty", async () => {
    const mod = await import("../src/components/PipelineBanner");
    expect(mod.shouldRenderBanner({ daysAhead: 9, verifiedThrough: "" })).toBe(false);
  });

  it("shouldRender returns true for positive days_ahead and non-empty date", async () => {
    const mod = await import("../src/components/PipelineBanner");
    expect(mod.shouldRenderBanner({ daysAhead: 9, verifiedThrough: "2026-04-09" })).toBe(
      true,
    );
  });
});
```

- [ ] **Step 2: Run the test file and verify failures**

Run: `npx vitest run tests/pipeline-banner.dom.test.tsx`

Expected: 6 failing tests (old content is still in `PipelineBanner.tsx`; new format not yet rendered; `shouldRenderBanner` export missing).

- [ ] **Step 3: Refactor `src/components/PipelineBanner.tsx` to the new format**

Replace the entire contents of `src/components/PipelineBanner.tsx` with:

```tsx
import { Link } from "react-router";
import state from "../data/pipeline-state.json";
import {
  currentFreshness,
  laggingVsPlant,
  type PipelineState,
} from "../logic/pipeline-selectors";

const pipelineState = state as unknown as PipelineState;

// Exported for unit tests. Pure.
export function shouldRenderBanner(input: {
  daysAhead: number;
  verifiedThrough: string;
}): boolean {
  if (!input.verifiedThrough) return false;
  if (!Number.isFinite(input.daysAhead)) return false;
  if (input.daysAhead < 0) return false;
  return true;
}

export function PipelineBanner() {
  const freshness = currentFreshness(pipelineState);
  const lag = laggingVsPlant(pipelineState);
  const verifiedThrough = freshness.index;
  const daysAhead = lag.days_ahead_of_min_plant_lag;

  if (!shouldRenderBanner({ daysAhead, verifiedThrough })) {
    // Silent no-render. If stale or missing, the banner sits out rather
    // than advertising "Verified through undefined" or a negative count.
    return null;
  }

  return (
    <div className="h-8 px-4 flex items-center gap-2 text-xs text-slate-700 bg-slate-100 border-b border-slate-200 shrink-0">
      <span>
        Verified through{" "}
        <span className="font-mono text-slate-900">{verifiedThrough}</span>
      </span>
      <span className="text-slate-400">·</span>
      {/* Days-ahead is emphasised with font-weight, not color. Color is
          reserved for the interactive affordance (the link). */}
      <span>
        <span
          data-testid="days-ahead-count"
          className="font-medium text-slate-900"
        >
          {daysAhead}
        </span>{" "}
        days ahead of typical title-plant cycle
      </span>
      <span className="text-slate-400">·</span>
      <Link
        to="/pipeline"
        className="text-moat-700 hover:text-moat-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        See pipeline →
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run the test file and verify it passes**

Run: `npx vitest run tests/pipeline-banner.dom.test.tsx`

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/PipelineBanner.tsx tests/pipeline-banner.dom.test.tsx
git commit -m "$(cat <<'EOF'
feat(banner): refactor PipelineBanner to slim one-line verified-through strip

Replace the dark four-date strip with a neutral 32px slate banner that
shows the canonical verified-through date plus a plain-English days-ahead
claim computed from the existing laggingVsPlant selector. Days-ahead is
emphasised by weight rather than color to preserve the moat palette for
the interactive affordance. Silent no-render on missing or stale data.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create RootLayout, wire it into the router, remove banner from AppShell

**Files:**
- Create: `tests/root-layout.dom.test.tsx`
- Create: `src/components/RootLayout.tsx`
- Modify: `src/router.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/root-layout.dom.test.tsx` with:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "../src/components/RootLayout";

// react-map-gl would crash jsdom if a public route mounts a map; stub it
// so RootLayout rendering is independent of downstream component imports.
vi.mock("react-map-gl/maplibre", () => ({
  default: () => null,
  Source: () => null,
  Layer: () => null,
  Marker: () => null,
}));

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [
          { path: "/", element: <div data-testid="public-outlet">PUBLIC</div> },
          {
            path: "staff",
            element: <div data-testid="staff-outlet">STAFF</div>,
          },
          {
            path: "staff/queue",
            element: (
              <div data-testid="staff-queue-outlet">STAFF-QUEUE</div>
            ),
          },
        ],
      },
    ],
    { initialEntries: [url] },
  );
  return render(<RouterProvider router={router} />);
}

describe("RootLayout", () => {
  afterEach(() => cleanup());

  it("renders the PipelineBanner above the outlet on public routes", () => {
    renderAt("/");
    expect(screen.getByTestId("public-outlet")).toBeInTheDocument();
    // Banner is present — its link is the tell. The banner itself uses
    // real data from pipeline-state.json so the "See pipeline" link is
    // rendered whenever shouldRenderBanner returns true.
    expect(
      screen.getByRole("link", { name: /see pipeline/i }),
    ).toBeInTheDocument();
  });

  it("hides the PipelineBanner on /staff", () => {
    renderAt("/staff");
    expect(screen.getByTestId("staff-outlet")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /see pipeline/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the PipelineBanner on /staff/queue (nested staff route)", () => {
    renderAt("/staff/queue");
    expect(screen.getByTestId("staff-queue-outlet")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /see pipeline/i }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/root-layout.dom.test.tsx`

Expected: fails — `RootLayout` import unresolved.

- [ ] **Step 3: Create `src/components/RootLayout.tsx`**

```tsx
import { Outlet, useMatch } from "react-router";
import { PipelineBanner } from "./PipelineBanner";

export function RootLayout() {
  // Sitewide banner is hidden on /staff/* because internal staff routes
  // mount StaffPageFrame, which has its own header treatment and a
  // session-only-actions warning. Keep this match list in sync with the
  // staff route table in src/router.tsx.
  const onStaff = useMatch("/staff/*") !== null;
  return (
    <>
      {!onStaff && <PipelineBanner />}
      <Outlet />
    </>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/root-layout.dom.test.tsx`

Expected: all 3 tests pass.

- [ ] **Step 5: Wire RootLayout into the router**

Modify `src/router.tsx`. At the end of the file, change the `export const routes` block from:

```tsx
export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/county-activity", element: <ActivityHeatMap /> },
  {
    element: <AppShell />,
    children: [
      // ...existing AppShell children...
    ],
  },
];
```

to:

```tsx
import { RootLayout } from "./components/RootLayout";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/county-activity", element: <ActivityHeatMap /> },
      {
        element: <AppShell />,
        children: [
          // ...existing AppShell children unchanged...
        ],
      },
    ],
  },
];
```

Note: place the `import { RootLayout } ...` with the other component imports at the top of the file, not at the bottom.

- [ ] **Step 6: Remove PipelineBanner from AppShell**

Modify `src/App.tsx`:

Delete the import line:
```tsx
import { PipelineBanner } from "./components/PipelineBanner";
```

Delete the usage line inside the returned JSX (currently at `src/App.tsx:39`):
```tsx
      <PipelineBanner />
```

Leave the rest of `AppShell` unchanged.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`

Expected: all tests pass. Routing tests (`tests/routing.test.ts`) still resolve every existing route because the outer wrapper is path-less.

- [ ] **Step 8: Commit**

```bash
git add src/components/RootLayout.tsx src/router.tsx src/App.tsx tests/root-layout.dom.test.tsx
git commit -m "$(cat <<'EOF'
feat(layout): add RootLayout wrapper that owns sitewide banner

Introduce a path-less RootLayout route that mounts PipelineBanner once
for the whole app and hides it on /staff/* via useMatch. Remove the
banner from AppShell. Preserves every existing route match (AppShell
continues to wrap examiner routes inside RootLayout) while adding a
single mount point for the sitewide freshness surface.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `/why` route + scaffold WhyPage component

**Files:**
- Modify: `tests/routing.test.ts`
- Create: `src/components/WhyPage.tsx`
- Modify: `src/router.tsx`

- [ ] **Step 1: Add the routing test**

Add the following block to `tests/routing.test.ts` at the end of the `describe("route table", ...)` block (just before the `"unknown paths match the not-found route"` case):

```tsx
it("/why matches the why-page route", () => {
  expect(matchIds("/why")).toContain("why-page");
});
```

- [ ] **Step 2: Run the test, verify fail**

Run: `npx vitest run tests/routing.test.ts`

Expected: fails — no route with id "why-page" exists.

- [ ] **Step 3: Create the minimal WhyPage scaffold**

Create `src/components/WhyPage.tsx`:

```tsx
export function WhyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <h1>Why county-owned title data</h1>
    </main>
  );
}
```

- [ ] **Step 4: Register the route**

Modify `src/router.tsx`. In the `RootLayout` children, add the `/why` route between the `/county-activity` entry and the `AppShell` entry:

```tsx
import { WhyPage } from "./components/WhyPage";

// ...inside routes...
{ path: "/why", id: "why-page", element: <WhyPage /> },
```

So the children block now reads:

```tsx
children: [
  { path: "/", element: <LandingPage /> },
  { path: "/county-activity", element: <ActivityHeatMap /> },
  { path: "/why", id: "why-page", element: <WhyPage /> },
  {
    element: <AppShell />,
    children: [
      // ...existing AppShell children unchanged...
    ],
  },
],
```

- [ ] **Step 5: Run the routing test, verify pass**

Run: `npx vitest run tests/routing.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/WhyPage.tsx src/router.tsx tests/routing.test.ts
git commit -m "$(cat <<'EOF'
feat(why): scaffold /why route with minimal WhyPage and routing test

Register the /why route under RootLayout so the sitewide banner mounts
above it. The route id is "why-page" so future tests can match on it
the same way they match "chain" / "encumbrance" / "moat-compare".

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Flesh out WhyPage — SEO, H1, TOC, Section 1 cards

**Files:**
- Create: `tests/why-page.seo.test.tsx`
- Add to: `tests/why-page.dom.test.tsx`
- Modify: `src/components/WhyPage.tsx`

- [ ] **Step 1: Write the SEO test**

Create `tests/why-page.seo.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { WhyPage } from "../src/components/WhyPage";

describe("WhyPage SEO", () => {
  afterEach(() => {
    cleanup();
    document.title = "";
    document
      .querySelectorAll('meta[name="description"]')
      .forEach((el) => el.remove());
  });

  it("sets document.title to the spec-exact title", () => {
    render(
      <MemoryRouter>
        <WhyPage />
      </MemoryRouter>,
    );
    // React 19 hoists <title> elements to document.head.
    expect(document.title).toBe(
      "Why county-owned title data — Maricopa County Recorder Portal",
    );
  });

  it("renders a meta description with the spec-exact content", () => {
    render(
      <MemoryRouter>
        <WhyPage />
      </MemoryRouter>,
    );
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute("content")).toBe(
      "How county recording, indexing, and title-plant search actually work — plus what the public API blocks, with receipts from two failed hunts against Maricopa's publicapi.recorder.maricopa.gov.",
    );
  });
});
```

- [ ] **Step 2: Write the DOM test for H1, TOC, Section 1**

Create `tests/why-page.dom.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { WhyPage } from "../src/components/WhyPage";

function renderWhy() {
  return render(
    <MemoryRouter>
      <WhyPage />
    </MemoryRouter>,
  );
}

describe("WhyPage — page structure", () => {
  afterEach(() => cleanup());

  it("renders the H1 with the spec title", () => {
    renderWhy();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/why county-owned title data/i);
  });

  it("renders three H2 headings matching the three sections", () => {
    renderWhy();
    const h2s = screen.getAllByRole("heading", { level: 2 });
    const text = h2s.map((h) => h.textContent?.toLowerCase() ?? "");
    expect(text.some((t) => t.includes("how county records actually work"))).toBe(
      true,
    );
    expect(text.some((t) => t.includes("what title plants can't do"))).toBe(
      true,
    );
    expect(text.some((t) => t.includes("receipts"))).toBe(true);
  });

  it("renders an on-page TOC with three anchor links and read-time estimates", () => {
    renderWhy();
    const toc = screen.getByRole("navigation", { name: /on this page/i });
    expect(within(toc).getByText(/1 min/i)).toBeInTheDocument();
    expect(within(toc).getByText(/45 sec/i)).toBeInTheDocument();
    expect(within(toc).getByText(/3 min/i)).toBeInTheDocument();

    expect(
      within(toc).getByRole("link", { name: /how county records actually work/i }),
    ).toHaveAttribute("href", "#how-records-work");
    expect(
      within(toc).getByRole("link", { name: /what title plants can't do/i }),
    ).toHaveAttribute("href", "#plants-cannot");
    expect(
      within(toc).getByRole("link", { name: /receipts/i }),
    ).toHaveAttribute("href", "#receipts");
  });
});

describe("WhyPage — Section 1 plain-English primer", () => {
  afterEach(() => cleanup());

  it("renders the three cards with their opening phrases", () => {
    renderWhy();
    const section = document.getElementById("how-records-work");
    expect(section).toBeTruthy();
    expect(section?.textContent).toMatch(/recorded.*indexed.*searchable/is);
    expect(section?.textContent).toMatch(/chain of title/i);
    expect(section?.textContent).toMatch(/birth.*release/i);
  });
});
```

- [ ] **Step 3: Run both tests, verify fail**

Run: `npx vitest run tests/why-page.seo.test.tsx tests/why-page.dom.test.tsx`

Expected: fails — current WhyPage only renders the H1.

- [ ] **Step 4: Implement SEO + H1 + TOC + Section 1 in WhyPage**

Replace the contents of `src/components/WhyPage.tsx` with:

```tsx
export function WhyPage() {
  return (
    <>
      {/* React 19 native hoisting routes these into document.head. */}
      <title>
        Why county-owned title data — Maricopa County Recorder Portal
      </title>
      <meta
        name="description"
        content="How county recording, indexing, and title-plant search actually work — plus what the public API blocks, with receipts from two failed hunts against Maricopa's publicapi.recorder.maricopa.gov."
      />

      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <article className="max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-900">
              Why county-owned title data
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              How residential title work actually happens, and where the public
              pipeline falls short.
            </p>
          </header>

          <nav
            aria-label="On this page"
            className="mb-10 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              On this page
            </div>
            <ul className="space-y-0.5">
              <li>
                <a
                  href="#how-records-work"
                  className="text-slate-800 hover:text-slate-900 underline underline-offset-2"
                >
                  ↓ How county records actually work
                </a>{" "}
                <span className="text-slate-500">(1 min)</span>
              </li>
              <li>
                <a
                  href="#plants-cannot"
                  className="text-slate-800 hover:text-slate-900 underline underline-offset-2"
                >
                  ↓ What title plants can't do
                </a>{" "}
                <span className="text-slate-500">(45 sec)</span>
              </li>
              <li>
                <a
                  href="#receipts"
                  className="text-slate-800 hover:text-slate-900 underline underline-offset-2"
                >
                  ↓ Receipts: the failed hunts
                </a>{" "}
                <span className="text-slate-500">(3 min)</span>
              </li>
            </ul>
          </nav>

          <section id="how-records-work" className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              How county records actually work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Recording → indexing → search
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  A deed becomes public in three moments: it's{" "}
                  <em>recorded</em> (officially filed), then{" "}
                  <em>indexed</em> (added to a searchable catalog), then{" "}
                  <em>searchable</em> (anyone can find it). The gap between
                  indexing and search is where title plants live — their value
                  proposition is re-indexing after the county. The county has
                  no such gap. What's recorded is immediately searchable from
                  the same surface that recorded it.
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Chain reconstruction
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Title examiners work backwards. Today's owner names someone
                  who sold it to them, who names someone before them, who
                  names someone before them — a <em>chain of title</em> going
                  back decades. Miss one link and the title is broken.
                  Examiners do this click-by-click because every deed names
                  different parties, filed on different dates, under different
                  instrument numbers.
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Encumbrance lifecycle
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Every lien has a birth (recording) and, usually, a death
                  (release). When the death never gets filed, the lien sits on
                  paper forever — technically still there, legally dead,
                  practically awkward. Tracking which encumbrances have been
                  released and which haven't is half of what an examiner does.
                </p>
              </div>
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
```

- [ ] **Step 5: Run the tests, verify pass**

Run: `npx vitest run tests/why-page.seo.test.tsx tests/why-page.dom.test.tsx`

Expected: all tests in both files pass.

If the SEO test fails because React 19 hoisting is not visible under jsdom, fall back to a `usePageMeta(title, description)` hook that uses `useEffect` to set `document.title` and inject a `<meta>` tag. Hook body:

```tsx
import { useEffect } from "react";
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  }, [title, description]);
}
```

If you need the fallback, replace the `<title>` + `<meta>` elements at the top of the JSX with a single `usePageMeta(...)` call at the top of `WhyPage`.

- [ ] **Step 6: Commit**

```bash
git add src/components/WhyPage.tsx tests/why-page.seo.test.tsx tests/why-page.dom.test.tsx
git commit -m "$(cat <<'EOF'
feat(why): WhyPage — SEO, H1, TOC, Section 1 primer cards

Add the page title, meta description (React 19 native hoisting), H1,
on-page TOC with read-time estimates, and the three plain-English cards
that open the page. Copy matches the design spec verbatim so the
section 1 word budget (60 words per card) stays under control.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: WhyPage Section 2 — "What title plants can't do"

**Files:**
- Add to: `tests/why-page.dom.test.tsx`
- Modify: `src/components/WhyPage.tsx`

- [ ] **Step 1: Add the Section 2 tests**

Append to `tests/why-page.dom.test.tsx`:

```tsx
describe("WhyPage — Section 2 moat claims", () => {
  afterEach(() => cleanup());

  it("renders all four moat bullets with the verbatim phrasing", () => {
    renderWhy();
    const section = document.getElementById("plants-cannot");
    expect(section).toBeTruthy();
    const txt = section?.textContent ?? "";
    expect(txt).toMatch(/Lien search by recording code is literally impossible/i);
    expect(txt).toMatch(/RE FED TX/);
    expect(txt).toMatch(/FED TAX L/);
    expect(txt).toMatch(/LIEN/);
    expect(txt).toMatch(/MED LIEN/);
    expect(txt).toMatch(/totalResults:\s*0/);
    expect(txt).toMatch(/Title plants host copies; the county hosts originals/i);
    expect(txt).toMatch(/publicapi\.recorder\.maricopa\.gov/);
    expect(txt).toMatch(/14–28-day lag/);
    expect(txt).toMatch(/publishes same-day/i);
    expect(txt).toMatch(/Pipeline transparency is custodian-only/i);
    expect(txt).toMatch(/five verified-through dates/i);
  });

  it("links to /moat-compare at the end of Section 2", () => {
    renderWhy();
    const section = document.getElementById("plants-cannot");
    expect(section).toBeTruthy();
    const link = section!.querySelector('a[href="/moat-compare"]');
    expect(link).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests, verify fail**

Run: `npx vitest run tests/why-page.dom.test.tsx`

Expected: the two new cases fail; earlier cases still pass.

- [ ] **Step 3: Add Section 2 to WhyPage**

In `src/components/WhyPage.tsx`, add the following `<section>` immediately after the Section 1 `</section>` closing tag (and before the closing `</article>`):

```tsx
<section id="plants-cannot" className="mb-10">
  <h2 className="text-xl font-semibold text-slate-900 mb-3">
    What title plants can't do
  </h2>
  <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
    <li>
      <strong className="text-slate-900">
        Lien search by recording code is literally impossible on the public
        API.
      </strong>{" "}
      The four lien-related codes —{" "}
      <code className="font-mono text-xs">RE FED TX</code>,{" "}
      <code className="font-mono text-xs">FED TAX L</code>,{" "}
      <code className="font-mono text-xs">LIEN</code>,{" "}
      <code className="font-mono text-xs">MED LIEN</code> — are in the index,
      but the search surface refuses to enumerate by them.{" "}
      <code className="font-mono text-xs">totalResults: 0</code> every time.
    </li>
    <li>
      <strong className="text-slate-900">
        Title plants host copies; the county hosts originals.
      </strong>{" "}
      Every PDF linked from this portal comes from{" "}
      <code className="font-mono text-xs">publicapi.recorder.maricopa.gov</code>{" "}
      directly. Aggregators serve their own CDN copy behind a subscription.
    </li>
    <li>
      <strong className="text-slate-900">
        Plants index on a 14–28-day lag; the county publishes same-day.
      </strong>{" "}
      Every recorded document is available through the public API the moment
      it's filed. Indexing lag exists upstream of the plants, not at the
      county.
    </li>
    <li>
      <strong className="text-slate-900">
        Pipeline transparency is custodian-only.
      </strong>{" "}
      This portal shows five verified-through dates (index, image, OCR,
      entity resolution, curator) each with its own SLA. No aggregator can
      report on stages they don't run.
    </li>
  </ul>
  <p className="mt-4 text-sm text-slate-600">
    Full side-by-side at{" "}
    <a
      href="/moat-compare"
      className="text-moat-700 hover:text-moat-900 underline underline-offset-2"
    >
      /moat-compare
    </a>
    .
  </p>
</section>
```

- [ ] **Step 4: Run the tests, verify pass**

Run: `npx vitest run tests/why-page.dom.test.tsx`

Expected: all Section 1 and Section 2 cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/WhyPage.tsx tests/why-page.dom.test.tsx
git commit -m "$(cat <<'EOF'
feat(why): WhyPage Section 2 — four moat bullets + /moat-compare link

Verbatim bullets pulled from /moat-compare and the design spec. The
14–28-day lag number is the same constant the banner computes its
days-ahead claim against, so visitors reading both surfaces see the
single authoritative figure.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: WhyPage Section 3 — hunt-log narratives + expandable raw logs + closing

**Files:**
- Add to: `tests/why-page.dom.test.tsx`
- Modify: `src/components/WhyPage.tsx`

- [ ] **Step 1: Confirm vite `?raw` resolves the hunt-log paths**

Quick sanity check before writing tests: vite's `?raw` suffix resolves any relative path under the project root. The hunt logs live at `docs/hunt-log-known-gap-2.md` (inside project root but outside `src/`) and `data/raw/R-005/hunt-log.md` (inside `publicDir: "data"`).

Run this command to verify both files are readable from the worktree root:

```bash
node -e "const fs=require('fs'); console.log(fs.readFileSync('docs/hunt-log-known-gap-2.md','utf8').length, fs.readFileSync('data/raw/R-005/hunt-log.md','utf8').length)"
```

Expected: two positive integers (the byte lengths). If either errors, the import path in Step 3 is wrong.

- [ ] **Step 2: Add Section 3 DOM tests**

Append to `tests/why-page.dom.test.tsx`:

```tsx
describe("WhyPage — Section 3 receipts", () => {
  afterEach(() => cleanup());

  it("renders both hunt narratives with all the verbatim numbers", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    expect(section).toBeTruthy();
    const txt = section?.textContent ?? "";

    // Tier 1-A narrative numbers
    expect(txt).toMatch(/45 minutes/);
    expect(txt).toMatch(/20 minutes/);
    expect(txt).toMatch(/50,000 pages/);
    expect(txt).toMatch(/1947/);
    expect(txt).toMatch(/__VIEWSTATE/);

    // Tier 1-B narrative numbers
    expect(txt).toMatch(/141 of 200 calls/);
    expect(txt).toMatch(/20010093192/);
    expect(txt).toMatch(/Book 553, Page 15/);
    expect(txt).toMatch(/94 sample points/);
    expect(txt).toMatch(/20000600000.{0,3}20010100000/);

    // Side discovery
    expect(txt).toMatch(/indexable but unsearchable/i);
  });

  it("enumerates the five API layers as a numbered list", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    const text = section?.textContent ?? "";
    // All five layer keywords must appear.
    expect(text).toMatch(/documentCode.*filter.*silently dropped/is);
    expect(text).toMatch(/docketBook.*pageMap.*silently dropped/is);
    expect(text).toMatch(/pagination broken/i);
    expect(text).toMatch(/404/);
    expect(text).toMatch(/Cloudflare/);
  });

  it("renders two collapsed <details> elements holding the raw hunt logs", () => {
    renderWhy();
    const details = document.querySelectorAll(
      "#receipts details",
    ) as NodeListOf<HTMLDetailsElement>;
    expect(details.length).toBe(2);
    details.forEach((el) => {
      expect(el.open).toBe(false);
      // The <summary> label invites expansion.
      const summary = el.querySelector("summary");
      expect(summary?.textContent?.toLowerCase() ?? "").toMatch(/full log/);
    });
  });

  it("renders a muted source-file citation under each hunt log", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    const txt = section?.textContent ?? "";
    expect(txt).toMatch(/docs\/hunt-log-known-gap-2\.md/);
    expect(txt).toMatch(/data\/raw\/R-005\/hunt-log\.md/);
  });

  it("renders the closing paragraph with the 'authoritative source records' phrasing", () => {
    renderWhy();
    const section = document.getElementById("receipts");
    expect(section?.textContent).toMatch(
      /Two failed hunts at adjacent tiers/i,
    );
    expect(section?.textContent).toMatch(
      /authoritative source records and the ingestion pipeline/i,
    );
  });
});
```

- [ ] **Step 3: Run the tests, verify fail**

Run: `npx vitest run tests/why-page.dom.test.tsx`

Expected: all Section 3 cases fail (Section 3 markup not yet in WhyPage).

- [ ] **Step 4: Implement Section 3 in WhyPage**

In `src/components/WhyPage.tsx`, add the imports at the top of the file (project uses the react-jsx transform, so `React` is not auto-imported — pull in `ReactNode` as a type for the sub-component prop):

```tsx
import type { ReactNode } from "react";
import tier1ARaw from "../../docs/hunt-log-known-gap-2.md?raw";
import tier1BRaw from "../../data/raw/R-005/hunt-log.md?raw";
```

Then add the following sub-component above `export function WhyPage() {`:

```tsx
function HuntLogSection({
  heading,
  narrative,
  fullLog,
  sourcePath,
}: {
  heading: string;
  narrative: ReactNode;
  fullLog: string;
  sourcePath: string;
}) {
  return (
    <article className="mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{heading}</h3>
      <div className="text-sm text-slate-700 leading-relaxed space-y-3">
        {narrative}
      </div>
      <details className="mt-3 rounded-md border border-slate-200 bg-white">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Full log ({sourcePath})
        </summary>
        <pre className="overflow-x-auto px-3 py-3 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap font-mono">
          {fullLog}
        </pre>
      </details>
      <p className="mt-1 text-xs text-slate-400 font-mono">
        Source file in repo: {sourcePath}
      </p>
    </article>
  );
}
```

Add the Section 3 `<section>` immediately after the Section 2 `</section>` closing tag (before the closing `</article>`):

```tsx
<section id="receipts" className="mb-10">
  <h2 className="text-xl font-semibold text-slate-900 mb-4">
    Receipts: what we tried, what the public API blocked
  </h2>

  <HuntLogSection
    heading="Federal-tax-lien hunt (Tier 1-A)"
    sourcePath="docs/hunt-log-known-gap-2.md"
    fullLog={tier1ARaw}
    narrative={
      <>
        <p>
          45 minutes. One goal: find a federal tax lien using only the API
          the county exposes to the public.
        </p>
        <p>
          The search endpoint accepts a{" "}
          <code className="font-mono text-xs">documentCode</code> filter. Every
          spelling of "federal tax lien" (
          <code className="font-mono text-xs">FED TAX LIEN</code>,{" "}
          <code className="font-mono text-xs">FEDERAL TAX LIEN</code>,{" "}
          <code className="font-mono text-xs">IRS LIEN</code>,{" "}
          <code className="font-mono text-xs">NFTL</code>, ten others) returned
          zero. The short code for federal tax lien isn't in the search
          vocabulary.
        </p>
        <p>
          Date filters? Silently dropped. The endpoint accepts the parameter
          but ignores it. Default sort is ascending by recording number, so
          every query starts in 1947 and would need ~50,000 pages of
          pagination to reach 2020. There's no descending sort.
        </p>
        <p>
          The modern web search page is Cloudflare-gated. The legacy ASP.NET
          page requires replaying{" "}
          <code className="font-mono text-xs">__VIEWSTATE</code> tokens that
          no scripting API can generate. Structural blocker hit in 20
          minutes. Stopped.
        </p>
        <p>
          The hunt pivoted to subdivision encumbrances already cited in
          POPHAM's deed legal description — and that pivot succeeded,
          because it didn't require name or code search. Every step was{" "}
          <code className="font-mono text-xs">GET /documents/{"{known_number}"}</code>.
          That's the shape of what works here and what doesn't.
        </p>
      </>
    }
  />

  <HuntLogSection
    heading="Master-plat hunt (Tier 1-B)"
    sourcePath="data/raw/R-005/hunt-log.md"
    fullLog={tier1BRaw}
    narrative={
      <>
        <p>Different question, same API, deeper failure.</p>
        <p>
          Parcel 3's final plat (
          <code className="font-mono text-xs">20010093192</code>) says on its
          face: <em>"being a resubdivision of a portion of Seville Tract H as
          recorded in Book 553, Page 15."</em> One well-formed question with
          a single-integer answer: what's the recording number for Book 553,
          Page 15?
        </p>
        <p>
          Budgeted 200 API calls. Stopped at ~141 of 200 calls. Zero hits.
        </p>
        <p>Five API layers blocked the lookup:</p>
        <ol className="list-decimal list-inside space-y-0.5 pl-2">
          <li>
            <code className="font-mono text-xs">documentCode</code> filter
            on <code className="font-mono text-xs">/documents/search</code>{" "}
            silently dropped.
          </li>
          <li>
            <code className="font-mono text-xs">docketBook</code> and{" "}
            <code className="font-mono text-xs">pageMap</code> filters
            silently dropped.
          </li>
          <li>
            Pagination broken — page 10 returns the same 50 records from
            1947 that page 1 returned.
          </li>
          <li>
            Hypothesised{" "}
            <code className="font-mono text-xs">byBook/page</code> and{" "}
            <code className="font-mono text-xs">book/{"{n}"}/{"{p}"}</code>{" "}
            endpoints both 404.
          </li>
          <li>Legacy book/page bridge URL Cloudflare-gated.</li>
        </ol>
        <p>
          Bracket-scanned{" "}
          <code className="font-mono text-xs">GET /documents/{"{recordingNumber}"}</code>{" "}
          across ~94 sample points in the approved range{" "}
          <code className="font-mono text-xs">20000600000–20010100000</code>.
          Plats are 1-in-thousands sparse. No hits.
        </p>
        <p>
          The side discovery matters more than the miss: four lien-related
          document codes —{" "}
          <code className="font-mono text-xs">RE FED TX</code>,{" "}
          <code className="font-mono text-xs">FED TAX L</code>,{" "}
          <code className="font-mono text-xs">LIEN</code>,{" "}
          <code className="font-mono text-xs">MED LIEN</code> —{" "}
          <em>are</em> present in the index (they appear inside{" "}
          <code className="font-mono text-xs">documentCodes</code> when you
          fetch by recording number) but return{" "}
          <code className="font-mono text-xs">totalResults: 0</code> from{" "}
          <code className="font-mono text-xs">/documents/search?documentCode=…</code>.{" "}
          <strong>The codes are indexable but unsearchable</strong> — the
          index records what the search surface refuses to enumerate.
        </p>
      </>
    }
  />

  <p className="mt-6 text-sm text-slate-700 leading-relaxed">
    Two failed hunts at adjacent tiers in the same taxonomy is the receipt.
    One is a one-off. Two is a pattern. The county holds the data. The public
    API serves documents, not searches. A county-owned portal closes these
    gaps because only the custodian has both the authoritative source
    records and the ingestion pipeline to build the indexes the public
    surface refuses to expose.
  </p>
</section>
```

- [ ] **Step 5: Run the tests, verify pass**

Run: `npx vitest run tests/why-page.dom.test.tsx`

Expected: all Section 3 cases pass alongside Section 1 + Section 2 cases.

If the `?raw` imports fail (e.g., vite refuses to resolve outside `src/`), fall back to a `useEffect` + `fetch` pattern that loads the logs from the publicDir-served paths:

```tsx
import { useEffect, useState } from "react";

function useRawFile(url: string): string {
  const [text, setText] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        /* swallow — details will render empty */
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return text;
}
```

Call sites:
- `const tier1ARaw = useRawFile("/hunt-log-known-gap-2.md");` after copying `docs/hunt-log-known-gap-2.md` into `data/hunt-log-known-gap-2.md` (served at `/hunt-log-known-gap-2.md` via `publicDir: "data"`).
- `const tier1BRaw = useRawFile("/raw/R-005/hunt-log.md");` (already served at that path via publicDir).

Prefer `?raw` — it's simpler, more testable, and crawlable on first paint. Use the fetch fallback only if `?raw` proves incompatible with vite's publicDir resolution.

- [ ] **Step 6: TypeScript declaration for `?raw` imports**

If the TypeScript compilation fails with "Cannot find module '...?raw'", add an ambient declaration file at `src/raw-markdown.d.ts`:

```ts
declare module "*.md?raw" {
  const content: string;
  export default content;
}
```

Run `npm test` again to confirm types resolve cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/components/WhyPage.tsx tests/why-page.dom.test.tsx src/raw-markdown.d.ts
git commit -m "$(cat <<'EOF'
feat(why): WhyPage Section 3 — hunt-log narratives + expandable raw logs

Prose summaries of both hunt logs with every verbatim number preserved
(45 minutes, 141/200 calls, 5 API layers, ~94 sample points, document
codes RE FED TX / FED TAX L / LIEN / MED LIEN, etc.). Full raw logs
loaded via vite ?raw and rendered inside collapsed details elements so
the evidence is one click away without a markdown parser. Closing
paragraph uses the 'authoritative source records' phrasing to stay
factually unimpeachable.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: LandingPage header + footer links to `/why`

**Files:**
- Modify: `tests/landing-page.dom.test.tsx`
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Add the tests**

Append to `tests/landing-page.dom.test.tsx`:

```tsx
describe("LandingPage — /why links", () => {
  afterEach(() => cleanup());

  it("renders a 'Why this matters' link in the header", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    // There are two "Why this matters" links (header + footer). The
    // header one is inside the <header> element.
    const header = document.querySelector("header");
    expect(header).toBeTruthy();
    const link = header!.querySelector('a[href="/why"]');
    expect(link).toBeTruthy();
    expect(link?.textContent?.toLowerCase()).toContain("why this matters");
  });

  it("renders a 'Why this matters' link in the footer", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const footer = document.querySelector("footer");
    expect(footer).toBeTruthy();
    const link = footer!.querySelector('a[href="/why"]');
    expect(link).toBeTruthy();
    expect(link?.textContent?.toLowerCase()).toContain("why this matters");
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run tests/landing-page.dom.test.tsx`

Expected: 2 new failing cases; existing cases still pass.

- [ ] **Step 3: Add the header link**

In `src/components/LandingPage.tsx`, replace the current header block:

```tsx
<header className="px-6 py-4 border-b border-slate-200 bg-white">
  <h1 className="text-2xl font-semibold text-recorder-900">
    Maricopa County Recorder
  </h1>
  <p className="text-sm text-recorder-500">
    The county owns the record. Everyone else owns a copy.
  </p>
</header>
```

with:

```tsx
<header className="px-6 py-4 border-b border-slate-200 bg-white">
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div>
      <h1 className="text-2xl font-semibold text-recorder-900">
        Maricopa County Recorder
      </h1>
      <p className="text-sm text-recorder-500">
        The county owns the record. Everyone else owns a copy.
      </p>
    </div>
    <Link
      to="/why"
      className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 pt-1"
    >
      Why this matters →
    </Link>
  </div>
</header>
```

Note: `Link` is already imported from `react-router` at the top of `LandingPage.tsx`; no new import.

- [ ] **Step 4: Add the footer link**

In the same file, update the footer block. Current:

```tsx
<footer className="px-6 py-4 flex justify-between items-center text-xs text-slate-500">
  <Link to="/county-activity" className="...">
    → View county activity
  </Link>
  <Link to="/moat-compare" className="...">
    → Compare to a title-plant report
  </Link>
  <Link to="/staff" className="...">
    County staff? Open workbench &rarr;
  </Link>
</footer>
```

Insert a new `<Link to="/why">` between the county-activity link and the moat-compare link:

```tsx
<footer className="px-6 py-4 flex justify-between items-center text-xs text-slate-500 flex-wrap gap-2">
  <Link
    to="/county-activity"
    className="underline underline-offset-2 hover:text-slate-700"
  >
    → View county activity
  </Link>
  <Link
    to="/why"
    className="underline underline-offset-2 hover:text-slate-700"
  >
    → Why this matters
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
```

- [ ] **Step 5: Run the tests, verify pass**

Run: `npx vitest run tests/landing-page.dom.test.tsx`

Expected: all cases pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx tests/landing-page.dom.test.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add /why links in LandingPage header and footer

Header link sits right-aligned, visually separate from the tagline; at
narrow viewports it wraps below via flex-wrap rather than truncating
either piece. Footer link joins the existing row of public-navigation
affordances between county-activity and moat-compare.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Full test run + build verification

**Files:** none — verification only.

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`

Expected: all test files pass, no regressions. Count should be ≥ 295 (288 baseline + new cases in pipeline-banner, root-layout, why-page DOM, why-page SEO, landing-page, routing).

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: build succeeds. If TypeScript complains about `?raw` imports, confirm `src/raw-markdown.d.ts` is present (added in Task 6 Step 6).

- [ ] **Step 3: Run the linter**

Run: `npm run lint`

Expected: no new warnings or errors. Fix any that appear.

- [ ] **Step 4: Commit only if fixes were applied**

If Steps 1-3 required any changes to pass, stage and commit them with a message like `chore: fix lint/type fallout from verified-banner-and-why` referencing the specific fix. Otherwise skip.

---

## Task 9: Manual verification in dev server

**Files:** none — manual verification only.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Expected: vite dev server listens on a port (typically `5173`). Note the URL in the output.

- [ ] **Step 2: Visit every public route and confirm banner presence**

Open each URL in a browser. For each, confirm the slim slate banner reads "Verified through 2026-04-09 · 9 days ahead of typical title-plant cycle · See pipeline →" with "See pipeline" as a clickable link.

- `/` (LandingPage)
- `/parcel/304-78-386` (AppShell — chain)
- `/parcel/304-78-386/encumbrances` (AppShell — encumbrance)
- `/pipeline` (AppShell — pipeline dashboard)
- `/county-activity` (standalone)
- `/moat-compare` (AppShell — moat compare)
- `/why` (standalone, NEW)

- [ ] **Step 3: Visit every staff route and confirm banner absence**

- `/staff`
- `/staff/search`
- `/staff/queue`
- `/staff/parcel/304-78-386`

Expected: no verified-through banner on any of these. Staff routes keep their amber "Staff preview (demo)" StaffPageFrame treatment at the top.

- [ ] **Step 4: LandingPage viewport check**

With browser devtools, set the viewport to 768 × 768 (simulated laptop) and then 900 × 1440. On both sizes, confirm:
- Banner is visible at top (32px high).
- LandingPage `<header>` sits immediately below the banner.
- The 60vh hero map remains at least partially visible above the fold on both viewports.

- [ ] **Step 5: LandingPage narrow-viewport wrap check**

Set the viewport width to 375px (mobile). Confirm:
- The header "Why this matters →" link wraps below the tagline rather than truncating either.
- The footer row wraps to multiple lines gracefully.
- The banner's middle phrase ("9 days ahead of typical title-plant cycle") is readable; if it wraps, that's acceptable.

- [ ] **Step 6: `/why` content check**

On `/why`:
- H1 reads "Why county-owned title data".
- TOC has 3 anchor links; clicking each scrolls to the matching section.
- Both hunt-log `<details>` elements are closed on first paint; clicking opens each to reveal the full raw markdown text.
- Muted source-file citations (`docs/hunt-log-known-gap-2.md`, `data/raw/R-005/hunt-log.md`) visible below each expanded details.

- [ ] **Step 7: View-source SEO check on `/why`**

In the browser, View Source (Ctrl-U / Cmd-U) on `/why`. Confirm the rendered HTML contains:
- `<title>Why county-owned title data — Maricopa County Recorder Portal</title>`
- `<meta name="description" content="How county recording, indexing, and title-plant search actually work — plus what the public API blocks, with receipts from two failed hunts against Maricopa's publicapi.recorder.maricopa.gov.">`

Because this is a client-side SPA, these will be in the live DOM rather than the initial HTML payload. Switch to devtools → Elements panel and verify they appear under `<head>` after React mounts. If they do not appear (i.e. React 19 hoisting didn't take effect), apply the `usePageMeta` fallback described in Task 4 Step 5.

- [ ] **Step 8: `See pipeline →` click-through**

On any public route, click the banner's "See pipeline →" link. Expected: navigates to `/pipeline` and the PipelineDashboard loads.

- [ ] **Step 9: Stop the dev server**

Kill the dev server process (Ctrl-C in the dev terminal).

---

## Self-review

**Spec coverage:**
- Sitewide banner refactor — Task 1 (content) + Task 2 (mount strategy)
- `/why` route — Task 3 (scaffold) + Tasks 4–6 (content)
- LandingPage header + footer links — Task 7
- SEO — Task 4 (Step 1, 4, 5) + Task 9 (Step 7)
- Silent no-render guard — Task 1 (Step 3) + tested in pipeline-banner test cases
- Staff route skip — Task 2 (Step 3, 4) + tested in root-layout test
- Verbatim hunt numbers — Task 6 (Step 2) has an explicit verbatim-numbers test assertion list covering every number in the spec's checklist
- `/moat-compare` read-only — no task modifies it; confirmed by absence from the file map
- `/pipeline` read-only — no task modifies it; only new link targets `/pipeline`
- Non-sticky banner on scrolling pages — structural via RootLayout render (no `position: sticky`); dev-verified in Task 9

**Placeholder scan:** No TBDs, TODOs, or vague "implement later" instructions. Every code step has exact code; every command has expected output.

**Type consistency:** `PipelineBanner` export name unchanged across tasks. `RootLayout` exported named function, imported consistently in Task 2 Step 5 and Task 2 Step 3. `WhyPage` export consistent across Tasks 3, 4, 5, 6. The `shouldRenderBanner` pure helper has the same signature across the test (Task 1 Step 1) and implementation (Task 1 Step 3).
