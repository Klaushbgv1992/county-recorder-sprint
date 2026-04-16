# Landing-Page Credibility, Persona Routing, OG Tags — Design

**Date:** 2026-04-15
**Branch:** `feature/landing-credibility`
**Scope:** Four small, related improvements to fix landing-page first-impression credibility, prove the export deliverable works end-to-end, and make `/parcel/*` pages shareable.

---

## Sub-task 1 — Export Commitment PDF verification

External reviewer reported "doesn't work." Pre-implementation inspection of `src/components/ExportCommitmentButton.tsx` shows the full path is wired correctly:

```
button onClick
  → triggerCommitmentDownload (deferred to next animation frame)
  → buildCommitment (parcel + instruments + lifecycles → CommitmentDocument)
  → renderCommitmentPdf (jsPDF 4.x + jspdf-autotable 5.x → Blob with type "application/pdf")
  → browserDownload (URL.createObjectURL → anchor.click → revokeObjectURL)
  → toast: "Downloaded: commitment-30478386-2026-04-09.pdf"
```

Existing tests in `src/components/ExportCommitmentButton.test.tsx` verify the entire pipeline including blob generation and the success toast. All 5 pass against current code (run `npx vitest run src/components/ExportCommitmentButton.test.tsx`).

**Decision:** No code change. Document the verification in `docs/export-commitment-verification.md` so future reviewers can re-test against the same evidence. The doc names the test command, the expected toast text, and the resulting filename pattern. If the reviewer's environment did surface a real bug, the doc gives them a clear way to file a reproducible report.

If a real bug surfaces during manual click-through after this verification, escalate via systematic-debugging skill — not as part of this branch.

---

## Sub-task 2 — Reframe pre-loaded results as "Featured demo parcels"

### Current behavior
`SearchEntry` component calls `searchParcels(query, parcels)`. When `query === ""`, the search returns ALL parcels with `matchType: "address"` (see `src/logic/search.ts:75-79`). The component then renders a `count > 0` results table with the heading "5 results indexed". A first-time visitor sees a bare results list with no query input — looks like a stale or broken search.

### Approach
Two-line change of intent:

1. `SearchEntry` no longer renders the results table when query is empty. The empty state for query is *no table at all* — the search input alone, with a placeholder. (When the user types, results appear; when they clear, results vanish. This matches every other search box on the internet.)
2. `LandingPage` renders a new section **above** the search section (or just after the search section — see Visual Hierarchy below) titled "Featured demo parcels" with a one-line explainer:

   > These five parcels demonstrate the chain-of-title, encumbrance lifecycle, and anomaly detection features. Click POPHAM to start the recommended demo path.

   Each parcel is a card linking to `/parcel/:apn`, with the same address/owner/APN summary as the result row. POPHAM gets a small "Recommended demo" badge.

### Why not re-use SearchEntry's result rendering?
SearchEntry's row is "click to view chain". Featured cards have the same destination (`/parcel/:apn`) but different framing. Re-using the row would force shared markup; copying ~30 lines is cleaner and keeps SearchEntry purely about *responding to user input*.

### Visual hierarchy (above-search vs below-search)
- **Above search:** Featured parcels are the FIRST thing the user reads. Search is positioned as the escape hatch for "I have a specific lookup."
- **Below search:** Search is the headline; featured is "or browse our demo set."

For a public-portal landing page where most visitors are evaluating credibility (not running real searches), **below search** is wrong — they hit the search input first and bail. **Above search** is right.

But the existing landing already has **map → search → capability cards**. Inserting Featured parcels would push capability cards down. Compromise: place Featured parcels AFTER the map and BEFORE the search section, replacing the current "Or enter a parcel or instrument number directly" pre-amble. The search heading shifts to a flatter "Direct lookup" label.

Final order:
```
header
↓
60vh map (hero — unchanged, owned by Prompt #1's parallel branch)
↓
Featured demo parcels (NEW — above search)
↓
Search input (no pre-loaded results)
↓
Three-pillar capability row (unchanged)
↓
footer (unchanged)
```

---

## Sub-task 3 — Persona selector row

### Locked decisions
- **(a) Pills, not cards.** User specified "Three pill buttons" in the prompt. Cards would dwarf the search input and steal map prominence.
- **(b) Placement: directly above the search input, inside the same `max-w-2xl` container as the search.** Personas are navigation help for the search section; they belong with it visually. Above the Featured-parcels section would compete with the map; below the search would be invisible.
- **(c) Persona = route-once + terminology side-effect; no persona key persisted.** TerminologyProvider already persists `terminology-mode` to localStorage and reads it on mount. Persona buttons set that key (or leave it untouched for staff) and navigate. No new state.

### Routing table

| Persona | Route target | Terminology side-effect |
|---|---|---|
| For homeowners | `/parcel/304-78-386` (chain view) | `localStorage.setItem("terminology-mode", "plain")` |
| For title professionals | `/parcel/304-78-386/encumbrances` | `localStorage.setItem("terminology-mode", "professional")` |
| For county staff | `/staff` | (untouched — staff workbench has its own conventions) |

### Why localStorage write before navigation, not via TerminologyContext.toggle
TerminologyProvider's `toggle()` flips between modes; we need a *set to specific value* operation. Writing localStorage directly + then triggering navigation works because:
1. Navigation triggers a full route render but the same `<TerminologyProvider>` instance survives (it's mounted in `main.tsx` outside the router).
2. So `useState`-backed `mode` does NOT re-read localStorage on navigation.

That means we ALSO need to update the in-memory state. Two options:
- **A.** Add a `setMode(value)` API to TerminologyProvider and call it before `navigate()`.
- **B.** Use a tiny helper that writes localStorage + calls `setMode` exposed from the context.

Going with **A**: extend TerminologyContext to expose `setMode(mode: Mode)`. Cleaner contract, easy to test. The existing `toggle` stays for the AppShell pill toggle.

### Component structure
- New component: `src/components/PersonaRow.tsx`. Three buttons rendered as pills with `aria-label` describing the destination. Each calls a small handler that sets terminology and navigates.
- Imported into `LandingPage` and rendered above the search input inside the search section's `max-w-2xl` container.

### A11y
- Buttons (not links) because they perform side-effects beyond navigation.
- Each button: `aria-label="For homeowners — open chain of title in plain English"` etc.
- Visible focus ring matching existing capability cards (`focus-visible:ring-2 focus-visible:ring-moat-500`).

---

## Sub-task 4 — Open Graph + Schema.org structured data

### Static defaults in index.html
Add to `<head>`:
- `<meta name="description">` — sprint mission summary one-liner.
- `<meta property="og:title">`, `og:description`, `og:type="website"`, `og:url`, `og:image`, `og:site_name`.
- Twitter card equivalents (`twitter:card="summary_large_image"`, `twitter:title`, `twitter:description`, `twitter:image`).

### Per-parcel meta tags
Custom hook (no new dependency). package.json check confirms no `react-helmet-async`.

```ts
// src/hooks/useDocumentMeta.ts
useDocumentMeta({
  title: `Parcel 304-78-386 — 3674 E Palmer St, Gilbert AZ — Maricopa County Recorder`,
  description: `Chain of title and encumbrance lifecycle for parcel 304-78-386, owned by POPHAM CHRISTOPHER/ASHLEY. 5 instruments curated, verified through 2026-04-09.`,
  ogImage: "/og-default.png",
  jsonLd: { /* Schema.org Place / RealEstateListing-ish */ },
});
```

The hook synchronously updates `document.title`, then on mount inserts/updates `<meta>` and `<script type="application/ld+json">` elements with `data-managed="useDocumentMeta"` markers, and on unmount/dep-change removes only its own elements. Idempotent — safe under StrictMode double-mount.

### Schema.org choice
`"@type": "Place"` is the closest fit (a parcel IS a place with an address). Optional `additionalProperty` for APN, owner, instrument count. Not `RealEstateListing` because the parcel isn't listed for sale.

### OG image
Use an existing screenshot from the repo if one is suitable; otherwise use a simple PNG with the portal's name + tagline. Quick check via `Glob("**/*.png")` in repo. If nothing usable, create a static `public/og-default.png` (no Playwright run needed for v1 — a flat-color tagline image is enough proof to pass a Slack/Discord paste test). Acceptance criterion satisfied as long as the image renders in social previews; perfect art is out of scope.

### Where to wire
Two route components currently render `<ChainOfTitle>` and `<EncumbranceLifecycle>` for `/parcel/:apn` and `/parcel/:apn/encumbrances`. The hook calls go into `ChainRouteInner` and `EncumbranceRouteInner` in `src/router.tsx`, gated by `data.parcel` being defined. Same hook, slightly different titles ("Chain of title" vs "Encumbrance lifecycle").

---

## Out of scope
- Map redesign (Prompt #1 territory)
- Other-page redesigns
- Analytics
- A separate homeowner-mode landing page
- A new dependency for meta-tag management

## Test strategy
- **TDD** for: persona route handlers (verify localStorage write + navigation target for each persona), `useDocumentMeta` hook (verify it inserts/removes `<meta>` and JSON-LD elements correctly), TerminologyContext `setMode` addition (verify it persists + updates state).
- **Snapshot/render** for: PersonaRow renders three pills with correct aria-labels.
- **No new test** for: SearchEntry empty-state behavior change is a deletion (no table when no query) — small enough that the existing search tests catch regressions.
- **Manual verification:** click every persona path, view-source `/parcel/304-78-386` for OG tags, paste URL into Discord/Slack scratch channel for preview screenshot, walk Beat 1 of demo-script.md.

## Acceptance criteria
- PDF export verified (this branch ships docs/export-commitment-verification.md; no code change)
- Landing page no longer shows bare results without query
- Featured demo parcels card row visible above search
- Persona pill row above search input
- Each persona routes correctly, terminology pre-set as expected
- `/parcel/:apn` pages have OG + JSON-LD meta in DOM (verifiable in view-source after JS hydration; for static crawlers, the index.html defaults serve)
- Beat 1 of `docs/demo-script.md` still flows
