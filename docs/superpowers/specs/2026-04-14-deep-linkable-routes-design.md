# Deep-Linkable Routes — Design

**Date:** 2026-04-14
**Scope:** Tier 1 item #3 from `docs/prompt-fit-analysis.md` — make the URL reflect app state so pasted deep links resolve to the right parcel + Proof Drawer. Honors the pitch claim in `docs/demo-script.md` beat 2 that instrument-number URLs already custody the document.
**Branch / worktree:** `tier1-c` at `.claude/worktrees/tier1-c`.

---

## 1. Goal

The prototype currently keeps navigation state (`screen`, `selectedApn`, `drawerInstrument`) entirely in React `useState` in `src/App.tsx`. Pasting `/parcel/304-78-386` or `/parcel/304-78-386/instrument/20210075858` into the browser lands on the Search screen — the deep-link pitch is asserted, not demonstrated.

Make the URL the source of truth. State is derived; components are unchanged.

## 2. Non-goals

- No loaders, actions, or data-router features beyond route matching.
- No refactor of `ChainOfTitle`, `EncumbranceLifecycle`, `ProofDrawer`, or any `src/logic/*` / `src/data/*`. Only `App.tsx`, `main.tsx`, a new `router.tsx`, `package.json`, and one new test file.
- No server-side redirect for the bare `/instrument/:n` form — client-side resolver with a one-frame placeholder (see §6).
- No addition of `@testing-library/react` or `jsdom`. Routing tests inspect `router.state.matches` directly.

## 3. Route table

| Path | Screen | Drawer | Notes |
|------|--------|--------|-------|
| `/` | Search | — | nav Chain/Encumbrance buttons disabled |
| `/parcel/:apn` | Chain | closed | default view for a parcel |
| `/parcel/:apn/instrument/:instrumentNumber` | Chain | open on `:instrumentNumber` | chain with proof drawer |
| `/parcel/:apn/encumbrances` | Encumbrance | closed | encumbrance lifecycle panel |
| `/parcel/:apn/encumbrances/instrument/:instrumentNumber` | Encumbrance | open on `:instrumentNumber` | encumbrance + proof drawer |
| `/instrument/:instrumentNumber` | resolver | — | redirects to `/parcel/:resolvedApn/instrument/:instrumentNumber` via `searchParcels`; unknown → NotFound |
| any other path | NotFound | — | friendly "not in this corpus" panel with link back to `/` |

**Why path segments for encumbrances** rather than a `?view=` query: canonical addresses, not ephemeral view state. Query params read as UI modes; path segments read as shareable locations, which is the rhetorical point of the task.

## 4. Library + mode

- **`react-router` v7** in history (browser) mode via `createBrowserRouter` + `RouterProvider`.
- Vite dev server already serves `index.html` for unknown paths, so refresh-on-deep-link works in dev. Production deployment would need the same SPA fallback at the host — called out as a deployment note, not wired (no production hosting in scope).
- No data loaders. All data access remains through `useParcelData(apn)` / `useAllParcels()` hooks as today.

## 5. State-to-URL / URL-to-state mapping

### URL → state (read)
Inside route components via `useParams()`:
- `selectedApn = params.apn ?? null`
- `screen`: fixed per route component (`SearchRoute` → `"search"`, `ChainRoute` / `InstrumentOnChainRoute` → `"chain"`, `EncumbranceRoute` / `InstrumentOnEncumbranceRoute` → `"encumbrance"`)
- `drawerInstrument = params.instrumentNumber ?? null`

### State → URL (write)
Via `useNavigate()` in handlers that currently call `setState`:
- `handleSelectParcel(apn)` → `navigate("/parcel/" + apn)`
- `handleSelectParcel(apn, instrumentNumber)` → `navigate("/parcel/" + apn + "/instrument/" + instrumentNumber)`
- `openDrawer(instrumentNumber)` on chain → `navigate("/parcel/" + apn + "/instrument/" + instrumentNumber)`
- `openDrawer(instrumentNumber)` on encumbrance → `navigate("/parcel/" + apn + "/encumbrances/instrument/" + instrumentNumber)`
- `closeDrawer()` → `navigate` to the parent path (chain or encumbrance, whichever is current)
- `handleReturnToSearch()` → `<Link to="/">` (no navigate call needed; use anchor)

Nav bar chain/encumbrance switches become `<Link>` elements, not buttons firing `setScreen`.

## 6. The `/instrument/:n` resolver

No loaders means the redirect happens inside a component via `useAllParcels()` + `useNavigate()` in a `useEffect`. That produces a single-frame flash before the redirect fires.

- Render the text "Resolving instrument…" (no spinner) during that frame so the flash isn't blank.
- Inside the effect: compute `searchParcels(instrumentNumber, parcels)`. If exactly one parcel owns the instrument, `navigate("/parcel/" + apn + "/instrument/" + instrumentNumber, { replace: true })`. If no owning parcel, render the `NotFoundPanel` instead of triggering redirect.
- Known limitation logged in `CLAUDE.md`: "Instrument-only deep links resolve client-side via a resolver component. A production version would use react-router loaders or a server-side redirect to eliminate the one-frame resolver flash. See Decision #16 (snapshot vs live sync) family."

## 7. NotFound behavior

One shared `NotFoundPanel` component lives in `router.tsx` (not `components/`, respecting the touch-surface constraint). Shown when:

1. `:apn` does not resolve in `loadAllParcels()` — full-pane panel, no chain rendered.
2. `:instrumentNumber` does not resolve against the loaded parcel's corpus — chain or encumbrance renders normally in the left pane; the drawer half renders the panel (preserves split layout so the Demo beat "URL refreshes to same state" still feels alive).
3. `/instrument/:n` resolver can't attribute — full-pane panel.
4. Any other unmatched path — full-pane panel via `*` route.

Copy: `"Not in this corpus"` + a one-line subtitle describing what was looked up + `<Link to="/">` labeled "Return to search".

## 8. File layout

### New files
- `src/router.tsx` — `createBrowserRouter` call, all route element components (`SearchRoute`, `ChainRoute`, `EncumbranceRoute`, `InstrumentResolver`, `NotFoundPanel`), shared `<AppShell>` layout component (nav bar + split main/drawer layout). Route components are thin — they pick up params and delegate to the existing `ChainOfTitle` / `EncumbranceLifecycle` / `ProofDrawer` components.
- `tests/routing.test.ts` — zero-dep routing tests using `createMemoryRouter`. Fixtures: `/`, `/parcel/304-78-386`, `/parcel/304-78-386/instrument/20210075858`, `/parcel/304-78-386/encumbrances`, `/parcel/nope`, `/instrument/20210075858`, `/instrument/nope`. Assertions read `router.state.matches[i].route.id` and `router.state.matches[i].params`. The `/instrument/:n` redirect case asserts the resolver helper function separately as a pure function (see §9) rather than chasing the async redirect through router state.

### Modified files
- `src/main.tsx` — replace `<App />` with `<RouterProvider router={router} />`, import `router` from `./router`. Keep `StrictMode`.
- `src/App.tsx` — rewritten as `<AppShell>` plus its own helper hooks (`useExaminerActions`, `useParcelData`, `useAllParcels`) still invoked at the right level. The component becomes a thin shell that renders nav + `<Outlet />` for the routed content. All the old state-setting handlers disappear; `setState` calls become `<Link>`s and `navigate()` calls. Imports for `SearchEntry` / `ChainOfTitle` / `EncumbranceLifecycle` / `ProofDrawer` move into `router.tsx` (they are rendered from route components).
- `package.json` / `package-lock.json` — add `react-router` v7 dep.
- `CLAUDE.md` — append Decision #36 logging the one-frame resolver flash limitation; add a one-line routing note under "Key Endpoints" or a new "App Routes" section listing the canonical URL shapes.
- `docs/demo-script.md` — update Beat 2 to show the URL bar changing after the instrument-number search, then demonstrate paste-into-fresh-tab to prove the deep link works across reloads. One paragraph rewrite, no structural change.

### Explicitly not modified
- Any file under `src/components/` — components stay URL-unaware. Drawer-opens-alongside-main-content layout preserved by `<AppShell>` which owns the split-pane JSX.
- Any file under `src/data/` or `src/logic/`.
- Other tests.

If any component turns out to contain an internal `<button>` that must become a `<Link>` for the deep-link story (e.g., "Search another parcel" inside a component rather than the nav bar), flag it in the work summary rather than silently editing. First pass suggests all such buttons are in `App.tsx`, but verify during execution.

## 9. Pure helper to simplify testing

Extract `resolveInstrumentToApn(instrumentNumber: string, parcels: Parcel[]): string | null` into `src/router.tsx` (or, if cleaner, inline with `searchParcels` re-use). It wraps the existing `searchParcels` call, returning the single matching APN when the query is an 11-digit instrument and exactly one parcel owns it, otherwise `null`.

This gives the routing test a pure-function surface to exercise the resolver without needing to inspect transient router state during redirect.

## 10. Test plan

`tests/routing.test.ts`:

1. `createMemoryRouter` with `initialEntries: ["/"]` → top match is the search route.
2. `initialEntries: ["/parcel/304-78-386"]` → chain route, params `{ apn: "304-78-386" }`.
3. `initialEntries: ["/parcel/304-78-386/instrument/20210075858"]` → chain-with-instrument route, params match.
4. `initialEntries: ["/parcel/304-78-386/encumbrances"]` → encumbrance route, params match.
5. `initialEntries: ["/parcel/304-78-386/encumbrances/instrument/20210075858"]` → encumbrance-with-instrument route, params match.
6. `initialEntries: ["/instrument/20210075858"]` → instrument-resolver route (before redirect fires).
7. `initialEntries: ["/nope"]` → not-found route.
8. Pure-function: `resolveInstrumentToApn("20210075858", parcels)` → `"304-78-386"`.
9. Pure-function: `resolveInstrumentToApn("99999999999", parcels)` → `null`.

## 11. Done criteria (from task prompt)

- Typing `/parcel/304-78-386` → POPHAM chain. Works on refresh (Vite SPA fallback).
- Typing `/parcel/304-78-386/instrument/20210075858` → chain with drawer on that instrument.
- Typing `/instrument/20210075858` → redirects to parcel+instrument URL.
- `/` reachable as Search.
- `npm run build` and `npm run test` green. No disabled tests.
- Demo script Beat 2 updated.
- CLAUDE.md decision added.
- Four canonical URLs printed in the PR summary:
  1. `/`
  2. `/parcel/304-78-386`
  3. `/parcel/304-78-386/instrument/20210075858`
  4. `/instrument/20210075858` (resolves to #3)

## 12. Known limitations

- **One-frame flash on `/instrument/:n` redirect.** Resolver runs in a `useEffect` after the first render. Placeholder text ("Resolving instrument…") displayed during that frame. Production fix: react-router loaders or server-side 302. Family: Decision #16 (snapshot vs live sync — the prototype accepts that server-side features are stubbed).
- **Vite dev server handles SPA fallback automatically; production host must be configured to do the same.** Not wired because there is no production deployment in scope.
- **`<RouterProvider>` replaces `<App />` at the root.** `StrictMode` retained. This slightly changes the component tree shape, so any test that mounts `<App />` directly would need to mount `<RouterProvider router={router}>` instead — none of the current 108 tests do that (all pure-function unit tests against `src/logic/*`), so no existing test needs changes.
