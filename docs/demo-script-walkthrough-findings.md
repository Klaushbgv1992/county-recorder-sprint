# Demo Script Walkthrough — Findings (2026-04-16)

> End-to-end walkthrough of `docs/demo-script.md` Beats 1–8 against origin/main at
> commit 8eba7ae. Dev server ran clean on :5181, all 7 beat routes returned 200.
> Full vitest suite shows **241 failing tests / 1422 passing** — orthogonal to
> narration/render accuracy and not investigated here.
>
> **Nothing in this document has been fixed in place.** Filed per sprint-owner
> instruction: real issues → docs/, not ad-hoc patches to main.

## Issue severity legend

- **BREAKING** — the clicked path does not show what the narration describes.
- **DRIFT** — the path works but narration wording/numbers don't match render.
- **NIT** — minor cosmetic or naming mismatch.

---

## Beat 1 — Landing  (PASS with NITs)

- Clicked path: `/` renders `LandingPage`. ✓
- Map, "Why this map matters" aside, FeaturedParcels, PersonaRow, SearchEntry,
  and three-pillar row (Spatial custody / Verified freshness / Chain intelligence)
  all render. ✓
- Narration "polygons come from the assessor's file… title plants license them
  via third parties" lands verbatim against the overlay aside.
- **NIT:** script says "three-pillar row below the search box" — correct in
  DOM order, but the landing page now also has a FeaturedParcels section
  *above* the search box that the script doesn't mention. Not an issue;
  narration still resolves to the right element.

## Beat 2 — POPHAM chain + spatial panel  (BREAKING)

- Clicked path: `/parcel/304-78-386` renders `ChainRoute` → split-pane of
  `ChainOfTitle` + `SpatialContextPanel`. ✓
- **BREAKING — narration vs render mismatch.** `ChainOfTitle` filters
  `instruments` to `DEED_TYPES` only (`warranty_deed`,
  `special_warranty_deed`, `quit_claim_deed`, `grant_deed`) at
  `src/components/ChainOfTitle.tsx:11–16,61–72`. The narration then describes:
  - "a 2021 UCC termination" — type `ucc_termination`, **not rendered**
  - "a 2021 refinance pair" — the DOT (`deed_of_trust`), **not rendered**
  - "two subdivision encumbrances at the base of the chain. That last group is
    lc-004" — the plat + affidavit are type `other`, **not rendered**, and
    lifecycle `lc-004` only surfaces on `/parcel/:apn/encumbrances`.

  What actually renders on this route: owner-period timeline + four warranty
  deeds (2007, 2013×2, 2015) + anomaly panel + spatial context aside. The
  narration would land verbatim on `/parcel/304-78-386/encumbrances` — wrong
  route for this beat.
- **DRIFT — field name.** Script says "`same_day_group_id` grouping on the
  2021-01-19 instruments". Actual field is `same_day_group` (array of
  instrument numbers); see `src/data/instruments/20210057846.json:59–61`.
  The field exists on the data, but `ChainOfTitle` does not visually surface
  it — there is no grouping UI to "point to." The pair would only appear
  side-by-side on the encumbrance route anyway (and even there, not grouped
  visually; lc-002 is the lone 2021 DOT, UCC term isn't a lifecycle child).

## Beat 3 — Anomaly banner + MERS  (BREAKING + DRIFT)

- **BREAKING — wrong route.** Script says "Navigate to
  `/parcel/304-78-386/encumbrances`. Click the anomaly banner." The
  `AnomalyPanel` component is only rendered from `ChainOfTitle`
  (`src/components/ChainOfTitle.tsx:96`) and `TransactionWizard`. The
  `EncumbranceLifecycle` route renders `MoatBanner` only — no anomaly banner
  to click. Grep-confirmed: `AnomalyPanel` imports in
  `ChainOfTitle.tsx`, `TransactionWizard.tsx` only.
- **DRIFT — count.** Script says "The system flagged five conditions."
  Actual POPHAM anomaly count is **6** (verified by running
  `detectAnomalies("304-78-386")`):
  - R3 medium — MERS beneficiary
  - R4 medium — Release by entity other than original beneficiary
  - R1 info — Same-day transaction detected
  - R5 info — Grantor is a trust
  - R6 info — Parent plat not recoverable via public API
  - R7 info — Same-name instruments suppressed by parcel attribution
- MERS note on lc-001 (2013 DOT 20130183450) — **does render** via
  `MersAnnotation` on the encumbrance route (amber band, "MERS is the
  beneficiary of record as nominee for V I P MORTGAGE INC…"). Content of
  the narration lands if you navigate to the encumbrance route first
  (anomaly-banner click just doesn't exist there).

## Beat 4 — Commitment wizard + Schedule B-I  (PASS)

- Clicked path: `/parcel/304-78-386/commitment/new` renders `TransactionWizard`. ✓
- 4-step pill bar (Type → Details → Review → Export). ✓
- Refinance option in Step 1 `TRANSACTION_TYPES`. ✓
- MERS → B-I verified: running the generator with `transaction_type: 'refinance'`
  produces **6 B-I items**, one of which (`BI-CURATIVE-AFFIDAVIT-1`) has
  `origin_anomaly_id: R3-304-78-386-20130183450` — the MERS finding drives a
  curative-affidavit B-I requirement exactly as narrated.
- Narration "structured work product the examiner can hand to the underwriter"
  lands against Step 3 + Step 4 export.

## Beat 5 — Staff search  (BREAKING — "point to" target doesn't exist)

- Clicked path: `/staff/search` renders `NameFilteredSearch`. ✓
- Searching `"Popham"` returns **10 attributed groups, 0 suppressed groups**
  (verified against `src/logic/staff-search.ts` + `src/data/staff-index.json`).
  Suppressed rows (`suppressed_same_name_of`) exist in the index but **all
  three of them are on HOGUE (304-77-689)**, not Popham.
- Narration: "Notice the suppressed group — instruments attributed to a
  different parcel where POPHAM appears as a party." **No such group
  renders for a Popham query.** To surface the suppressed-group UI the
  presenter would need to search `"Hogue"` instead (or add Popham-tagged
  suppressed rows to `staff-index.json`).

## Beat 6 — HOGUE honest zero  (BREAKING — cross-parcel panel is on staff route)

- Clicked path: `/parcel/304-77-689/encumbrances` renders `EncumbranceRoute`. ✓
- lc-003 is open (20150516730, HOGUE 2015 DOT, no reconveyance). ✓
- What actually renders for lc-003 on this route: the **parcel-local**
  `CandidateReleasesPanel` (matcher runs against reconveyances in the *same*
  parcel corpus only — HOGUE has none, so `total = 0`). The empty-state
  rationale reads:
  > "Matcher ran against 0 reconveyances in Shamrock Estates Phase 2A corpus.
  > Note: the public API cannot search for releases filed against HOGUE
  > JASON / MICHELE outside this parcel. A county-internal full-name scan
  > closes this gap — **out of prototype scope**."
- **BREAKING:** Script says "Point to: The 'Cross-parcel scan' panel showing
  `scanned_party_count > 0` and zero results." That panel only exists on
  `/staff/parcel/:apn` (`src/components/StaffParcelView.tsx:210,217`).
  On the examiner route, the empty-state literally says "out of prototype
  scope" — which undercuts the narration's "The county can. The zero is
  meaningful."
- Narration is correct if the demo navigates to `/staff/parcel/304-77-689`
  and clicks "Run cross-parcel release hunt" instead.

## Beat 7 — Pipeline banner  (DRIFT)

- Clicked path: `/pipeline` renders `PipelineDashboard`. ✓
- Days-ahead banner at the bottom (`lag.days_ahead_of_min_plant_lag`). ✓
- **DRIFT — stages.** Narration: "Index ingestion. OCR run. Curator sign-off.
  Anomaly scan." That's four stages. Actual stages in
  `src/data/pipeline-state.json` are **five**: `index`, `image`,
  `ocr`, `entity_resolution`, `curator`. "Anomaly scan" is not a stage.
  The `MoatCompareRoute` row-7 restates the same incorrect four-name list
  ("index ingestion, OCR run, curator sign-off, anomaly scan, pipeline
  status") — same narration, same drift.
- "Pipeline banner on every screen" — banner (`PipelineBanner` in
  `RootLayout`) is hidden on `/staff/*` by design; otherwise ubiquitous.

## Beat 8 — Moat compare  (PASS with DRIFT)

- Clicked path: `/moat-compare` renders `MoatCompareRoute`. ✓
- Nine comparison rows (row-1 … row-9) exist. ✓
- **DRIFT — row-8 hard-coded count.** Row-8 ("Chain judgment") renders
  "5 anomalies detected and surfaced automatically" as static copy
  (`src/components/MoatCompareRoute.tsx:364`). Actual POPHAM count is 6
  (see Beat 3). If the presenter just cited Beat 3's "five conditions" and
  now points to row-8's "5 anomalies," both references agree with each
  other but disagree with what the anomaly panel on /parcel/:apn actually
  shows.
- Also see Beat 7 re: row-7's pipeline-stage naming drift.

## 768px viewport spot-check

Pulled the relevant Tailwind breakpoints straight from source; no browser
instrumentation used — flagging layout risks rather than confirmed breakage.

- **BREAKING at 768px: Beat 8 /moat-compare.** The 9-row grid is
  `hidden lg:grid` (≥1024px). Below `lg` the route renders
  `ViewportFallback` ("Moat comparison is designed for a presenter display.
  Widen the window to at least 1024px.") — so Beat 8 is unusable at 768px.
  This is actually by design (there's a fallback), but it means the demo
  cannot be driven at 768.
- **RISK: split-pane cramping.** `SplitPane` in `src/router.tsx:70–86` uses
  fixed `w-1/2` for main + drawer with no responsive breakpoint. At 768px
  with the proof drawer open, main shrinks to ~384px, and inside it
  `ChainOfTitle` + `SpatialContextPanel` (`md:w-[40%]`) compete. Everything
  still renders but the spatial map becomes very narrow (~150px wide).
- **NIT: SpatialContextPanel default-collapsed threshold** is
  `window.innerWidth < 768` (`src/components/SpatialContextPanel.tsx:67`).
  At **exactly** 768px it defaults open, not collapsed — one pixel on
  either side flips the behavior. Intentional or not, document the rule.
- Landing `/` at 768px: fine. `sm:grid-cols-3` kicks in at 640, so the
  three-pillar row stays three-up. Map aside uses
  `md:max-w-md md:right-auto`, which activates at 768 and places it
  bottom-left of the map, not full-width — the intended behavior.
- Build-time CSS note (not a layout issue): `npm run dev` logs a postcss
  warning that `@import url("https://rsms.me/inter/inter.css")` and the
  Google Fonts import in `src/index.css` are emitted *after*
  tailwindcss-generated rules in the output, and must precede them. Result:
  at runtime the @import'd web fonts may not load, and type falls back to
  system sans. Visually this is a regression on every screen vs. the
  intended Inter/IBM Plex Mono look.

---

## Summary counts

- **BREAKING narration/render mismatches:** Beats 2, 3, 5, 6.
- **DRIFT (wording/counts):** Beats 3 (5 vs 6), 7 (stage names), 8 (row-8
  hard-coded 5).
- **Viewport:** /moat-compare intentionally falls back below 1024px — the
  demo cannot be driven at 768px from Beat 8 onward.
- **Routes all served 200**, dev server is healthy, nothing is broken at
  the compile level. The work is narration-alignment, not code repair.

## Suggested triage (not implemented)

Either the script or the app needs to move, and the sprint owner should
pick which:

1. **Move the script to match the app.** Beat 2 → narrate around deeds +
   anomaly + spatial context only. Beat 3 → start on chain, then drill to
   encumbrances for MERS. Beat 5 → search "Hogue" instead of "Popham" to
   actually hit a suppressed group. Beat 6 → navigate to
   `/staff/parcel/304-77-689` instead of the examiner encumbrance route.
   Update the anomaly count to 6 and the stage list to five (or rename
   "Anomaly scan" to map to a real stage).
2. **Move the app to match the script.** Lift UCC-term/DOT/plat rendering
   onto the chain route (a "Related instruments" strip under the deeds),
   add a "Cross-parcel scan" panel to the examiner encumbrance view that
   mirrors the staff one with a moat note, add a Popham-tagged
   `same_name_candidate` row to `staff-index.json`.

Option 1 is roughly 10 minutes of script editing; option 2 is half a day
of UI work. Per the sprint's "manual curation preferred over flaky
automation" constraint, **option 1 is the smaller, safer move.**

## Residual cleanup note

`git worktree remove` on `.worktrees/feature-*` untracked the worktrees
from git successfully but couldn't delete the physical directories on
Windows (`Invalid argument` — nested node_modules depth). The four
directories
(`feature-landing-credibility`, `feature-verified-banner-and-why`,
`feature-landing-map`, `feature-encumbrance-swimlane`) remain under
`.worktrees/` as orphans. Branches deleted cleanly.
