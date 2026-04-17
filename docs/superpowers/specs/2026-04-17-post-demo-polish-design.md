# Post-demo polish — design

**Date:** 2026-04-17
**Scope:** Four post-demo-feedback items addressed as a single design, shipped as two PRs.

## Goal

Address four specific pieces of demo feedback without expanding scope:

1. **Corpus** — Three of the six curated parcels (WARNER, LOWRY, PHOENIX VACATION HOUSES) currently exist as neighbor-tier filler without a distinct demo pathology. Give each a dedicated pathology so the corpus tells six distinct stories, not three-plus-three-filler.
2. **Search** — The homepage has two competing search surfaces (an overlay-anchored `MapSearchBar` floating on the map and a form-style `SearchEntry` below it). First-touch is not obvious. Promote search to a hero band above the map; add entity-type pill badges (what matched) alongside the existing tier badges (what tier the parcel sits in).
3. **Plain English anomalies** — Anomaly bodies today are dense curator shorthand. The Story page already proves the translation layer (`src/narrative/engine.ts` + `patterns.ts`). Reuse the *mechanism* — not just the tone — on anomaly bodies, with a hybrid rule: instrument-referencing anomalies pattern-match; absence anomalies use a curated override.
4. **AI summary** — The Chain-of-Title screen currently asks a reviewer to paste an Anthropic API key in the browser. Replace with a build-time bake: call Claude once per parcel, commit the output alongside the prompt and generation metadata, render statically.

## Non-goals

- Net-new parcel curation via recorder-API hunts (Decision #40 / Known Gap #2 path is blocked).
- Server-side LLM proxying (removing the live path, not re-platforming it).
- Cross-parcel anomaly search (Decision #37).
- Edits to frozen historical specs/plans under `docs/superpowers/`.

---

## Section A — Corpus pathologies (WARNER / LOWRY / PHOENIX)

Each of the three parcels gets one new synthetic instrument, one new anomaly, and (in one case) one new lifecycle. All three use the existing `provenance: "demo_synthetic"` convention (precedent: `20230100000` PHOENIX ASSOC LIEN; commits `f0c372b`, `d026198`).

**WARNER (304-78-374) — junior-lien priority interpretation**

- New instrument: synthetic 2nd DEED TRST recorded ~2019-Q1, smaller principal than the 2013 senior, different lender, same borrower.
- Anomaly `an-007`, severity `high`, titled *Junior-lien priority interpretation*. Body references both DOTs by recording number (engine-routed).
- New lifecycle `lc-005`: open, unreleased junior. (Existing IDs `lc-001`…`lc-004`; R-005 was NOT FOUND per Decision #40, so `lc-005` is free.)
- Framing leads with priority interpretation, not unreleased status, to stay distinct from HOGUE's `lc-003` no-release-located pathway.

**LOWRY (304-78-383) — recorded AOM assignment chain**

- Current: 2007 Countrywide subprime ARM/IO DOT (commit `bf9fb5d`).
- New instrument: synthetic ASSIGNMENT OF DEED OF TRUST, Countrywide → Bank of America, recorded ~2009-Q3. (Real, documented historical consolidation pattern.)
- Anomaly `an-008`, severity `medium`, titled *Recorded assignment chain — Countrywide to Bank of America*. Body references both instruments (engine-routed).
- No new lifecycle; assignment attaches to the existing LOWRY DOT lifecycle.
- **Doc-code decision:** CLAUDE.md's terminology notes do not fix a short code for this instrument type. Use full label `"ASSIGNMENT OF DEED OF TRUST"` with `documentCode: null`. Verify against any existing assignment JSONs at write-time; match if one exists.

**PHOENIX VACATION HOUSES (304-78-367) — investor-LLC flip**

- Current: 2020 LLC purchase + DOT, plus the existing synthetic 2023 ASSOC LIEN.
- New instrument: synthetic QUIT CLAIM DEED, PHOENIX LLC → individual member, recorded ~2022-Q2 — entity-to-member re-titling.
- Anomaly `an-009`, severity `medium`, titled *LLC-to-member Q/CL — evaluate title insurability window*. Body references both deeds (engine-routed).
- No new lifecycle.

**Synthetic recording-number reservation**

Reserved block: `YYYY010000N` (year prefix preserved; `010000N` sequence is a round-number tell). Assignments:
- WARNER HELOC: `20190100001`
- LOWRY AOM: `20090100001`
- PHOENIX Q/CL: `20220100001`

Convention documented once in `docs/data-provenance.md` alongside the existing `20230100000` citation.

**Proof Drawer disclosure**

The on-screen synthetic badge must render for the three new instruments the same way it renders for `20230100000`. Locate the existing disclosure render path at implementation time. If the current disclosure is JSON-only, promoting it to a visible UI badge is a sub-task inside Section A — Decision #35 and commit `d026198` set the precedent that synthetic nature is disclosed in the UI, not just the data.

**File inventory**

- New: `src/data/instruments/20190100001.json`, `20090100001.json`, `20220100001.json`
- Edited: `src/data/parcels.json` (append to WARNER/LOWRY/PHOENIX `instrument_numbers[]`)
- Edited: `src/data/staff-anomalies.json` (append `an-007`, `an-008`, `an-009`)
- Edited: `src/data/lifecycles.json` (append `lc-005`)
- Edited: `docs/data-provenance.md` (document the synthetic-number reservation convention)
- Possibly edited: Proof Drawer component (if UI disclosure is currently JSON-only — confirm at implementation)

---

## Section B — Search hero + entity-type badges

One search surface, prominently placed, with two independent badge axes (entity-type and tier).

**Structural change**

- New component `src/components/SearchHero.tsx` mounts as the first child of `<main>` on `LandingPage.tsx`, above the map section. Full-width band under `CountyHeartbeat`.
- **Delete** `src/components/MapSearchBar.tsx` — remove the map-overlay search.
- **Delete** `src/components/SearchEntry.tsx` — the below-map "Or look up a parcel directly" form. Its direct-lookup behavior (APN, address, 11-digit instrument) is covered by `searchAll()`.
- `useLandingUrlState` keeps ownership of `?q`; hero is a controlled input against it (same wiring as `MapSearchBar` today).

**Visual shape**

- Single input; placeholder preserved: *"Search APN, address, owner, subdivision, or 11-digit instrument"*.
- Dropdown hangs from the input with z-index above the map section (moves the z-index concern off the map-overlay axis).
- Each row shows address (primary), `owner · APN · subdivision` (secondary), and two pill badges on the right:
  - **Entity-type pill** (new axis): `APN` / `Address` / `Owner` / `Subdivision` / `Instrument`, derived from `SearchHit.matchType`.
  - **Tier pill** (existing axis, unchanged): `Curated` / `Recorder` / `Assessor`.
- Keyboard behavior (↑↓ / Enter / Esc) preserved verbatim.

**On-select routing**

- `matchType: "instrument"` → navigate to `/parcel/:apn/instrument/:n` directly. The hero has both the resolved APN (from `SearchHit.searchable.apn`) and the instrument number (from the query string). This skips the one-frame "Resolving instrument…" placeholder from Decision #36.
- `tier: "curated"` (non-instrument match) → navigate to `/parcel/:apn`.
- `tier: "recorder_cached" | "assessor_only"` → `setSelectedApn` opens the `ParcelDrawer` (unchanged from current `MapSearchBar`).

**Behavioral divergence — called out in PR description**

Curated hits now leave the landing page (→ `/parcel/:apn`) rather than opening `ParcelDrawer` in place. This is an upgrade: curated parcels have a real chain-of-title view worth opening directly. Reviewers should expect the change.

**Subdivision pill**

Verified safe: `searchAll()` already emits `matchType: "subdivision"` as a first-class value (`src/logic/searchable-index.ts:24, 135`). Promoting it from a tiny secondary caption to a pill is purely a visual change.

**Audit gate before deletion**

Grep matches across code and tests (not historical docs) must be addressed before `MapSearchBar.tsx` and `SearchEntry.tsx` are removed. Known live callsites:

- `src/components/LandingPage.tsx` — replaced by hero mount.
- `src/components/MapLegend.tsx` — incidental reference, verify at write-time.
- `tests/map-search-bar.dom.test.tsx` — rewritten to target `SearchHero`.

Historical specs and plans under `docs/superpowers/` are frozen and untouched.

**ParcelDrawer mount point — noted**

`ParcelDrawer` is currently mounted *inside* the map `<section>` (`LandingPage.tsx:220-228`), not at page level. The hero→drawer path still works. Drawer appears over the map area; a user who interacted with the hero at the top of the page may need to scroll down to see the drawer. Accepted in this design; not refactored here.

**File inventory**

- New: `src/components/SearchHero.tsx`
- Deleted: `src/components/MapSearchBar.tsx`, `src/components/SearchEntry.tsx`
- Edited: `src/components/LandingPage.tsx` (mount point change + removal of the two deleted components + drop the "Or look up a parcel directly" section)
- Edited: `src/components/MapLegend.tsx` (if it references either deleted component)
- New: `tests/search-hero.dom.test.tsx` (or rewrite of `tests/map-search-bar.dom.test.tsx` under the new name)

---

## Section C — Plain English anomaly bodies (hybrid)

Reuse the narrative-engine mechanism. Route instrument-referencing anomalies through a new anomaly pattern catalogue; route absence anomalies through a curated `plain_english` override. Both paths produce React nodes with clickable `[11-digit]` citations.

**Schema change — `src/data/staff-anomalies.json`**

Each anomaly becomes one of two discriminated-union variants:

Variant **engine** (anomaly references specific instruments):

```json
{
  "id": "an-001",
  "parcel_apn": "304-78-386",
  "severity": "high",
  "title": "Instrument 20210075858 beneficiary mismatch",
  "description": "Release executed by Wells Fargo via CAS Nationwide...",
  "references": ["20210075858", "20130183450"],
  "pattern_id": "mers-beneficiary-gap"
}
```

Variant **override** (absence anomaly or meta-finding with no single instrument to template off):

```json
{
  "id": "an-002",
  "parcel_apn": "304-77-689",
  "severity": "high",
  "title": "HOGUE lc-003 release candidate not yet located",
  "description": "2015 DOT (20150516730) has no matched release...",
  "references": [],
  "plain_english": "The 2015 deed of trust on this parcel [20150516730] has no matching release recorded on the parcel's own chain. A cross-parcel release hunt is available as a staff-only escalation path."
}
```

`description` is retained as curator-facing shorthand; `plain_english` (or engine output) is what ships to the examiner.

**TS type and validator**

- TS type `AnomalyFinding` in `src/types/anomaly.ts` expressed as a discriminated union on `references` length.
- Zod validator in `src/schemas.ts` (or wherever existing anomaly schemas live) enforces: `references.length > 0 ⇒ pattern_id: string`; `references.length === 0 ⇒ plain_english: string`. Cross-field constraint, not just commentary.

**Engine extension**

- New file `src/narrative/anomaly-patterns.ts` — exports a map keyed on `pattern_id` (separate from instrument patterns in `patterns.ts` to avoid collision). Each entry takes `{ anomaly, instruments }` and returns a prose string with `[11-digit]` tokenized citations.
- New function in `src/narrative/engine.ts`:

  ```ts
  renderAnomalyProse(
    anomaly: AnomalyFinding,
    instruments: Instrument[],
    onOpenDocument: (n: string) => void,
  ): ReactNode[]
  ```

  Dispatches on the discriminated union. Engine branch calls the appropriate `anomaly-patterns.ts` entry. Override branch returns the `plain_english` string. **Both branches** route through the existing `renderWithCitations()` helper (lifted from `AiSummaryPanel.tsx:27` to a shared location — see Section D file inventory). Return type is `ReactNode[]` to preserve clickable citations.

**Pattern catalogue**

| Anomaly | Route | Pattern id |
|---|---|---|
| `an-001` MERS beneficiary mismatch | engine | `mers-beneficiary-gap` |
| `an-002` HOGUE release not located | override (absence) | — |
| `an-003` Same-name contamination POPHAM | override (meta, no single instrument) | — |
| `an-004` HOGUE same-name candidates | override (absence-shaped) | — |
| `an-005` Trust truncation recovered via OCR | engine | `ocr-trust-recovery` |
| `an-006` Book 553 Page 15 unresolved | override (absence) | — |
| `an-007` WARNER junior-lien priority | engine | `junior-lien-priority` |
| `an-008` LOWRY recorded AOM | engine | `recorded-assignment-chain` |
| `an-009` PHOENIX LLC-to-member Q/CL | engine | `llc-to-member-retitle` |

**Render surfaces**

All three surfaces that render anomaly bodies switch to `renderAnomalyProse()`:

- `src/components/map/AnomalySummaryPanel.tsx` — today shows title only. Extend so a row click expands to show the plain-English prose inline. Default collapsed (title-only) so the map overlay stays compact.
- `src/components/StaffParcelView.tsx` — replace raw `description` rendering with `renderAnomalyProse()`.
- Any other callsite found by grep of `description` on anomaly objects — audit at implementation.

**File inventory**

- Edited: `src/data/staff-anomalies.json` (add fields to existing 6; append `an-007` / `an-008` / `an-009`)
- Edited: `src/types/anomaly.ts` (discriminated union)
- Edited: `src/schemas.ts` or the anomaly-schema file (validator)
- New: `src/narrative/anomaly-patterns.ts` (5 patterns)
- Edited: `src/narrative/engine.ts` (add `renderAnomalyProse`)
- Moved: `renderWithCitations` helper from `AiSummaryPanel.tsx` to a shared module (e.g., `src/narrative/render-citations.tsx`)
- Edited: `src/components/map/AnomalySummaryPanel.tsx` (expand-on-click)
- Edited: `src/components/StaffParcelView.tsx`

---

## Section D — Build-time AI summary bake

Per-parcel summary generated once at build time, committed, rendered statically. No runtime LLM, no key in the browser.

**Prerequisite — gitignore gate**

Before any Section D implementation:

- Add `.env.local` and `.env*.local` to `.gitignore`.
- Rename `.env.local.txt` → `.env.local` (Vite convention; `.env.local.txt` is not recognized by Vite's env loader).
- Sanity check: `git ls-files .env*` must print nothing after the rename.

**Build script — `scripts/bake-ai-summaries.ts`**

**Must be written under the `claude-api` skill** (the skill triggers on adding SDK calls and mandates prompt caching — matches this plan).

Per-parcel inputs (same four the current live path uses at `src/lib/claude-summary.ts`): parcel record, instruments, lifecycles, anomalies.

Behavior:

- Read `ANTHROPIC_API_KEY` from `.env.local`.
- For each of the 6 parcels, call Claude Opus 4.7 with prompt caching on the system prompt (cache hit across the other 5 parcels within a 5-minute window).
- Write three artifacts per parcel to `src/data/ai-summaries/{apn}/`:
  - `summary.md` — model response verbatim, `[11-digit]` citations intact.
  - `prompt.txt` — the exact user-message payload (serialized inputs) for reproducibility.
  - `metadata.json` — `{ generated_at, model_id, input_token_count, output_token_count, cache_hit: bool, prompt_hash }`.
- `prompt_hash` computed on a **canonical JSON** serialization of the inputs (sorted keys, recursively) so key-order drift does not defeat the hash gate.
- Artifacts are **cached**, not idempotent — model output varies across runs. Default behavior on re-run: detect hash mismatch per parcel, print which would regenerate, and abort unless `--force` or every mismatched parcel is explicitly approved.
- **Soft dependency on Section C:** the script prefers `anomaly.plain_english` when present; falls back to `anomaly.description`. This lets D survive running before C in a theoretical rollback, but the committed chain order is still A → C → D.

**Render — replace `AiSummaryPanel`**

New component `src/components/AiSummaryStatic.tsx`:

- Loads `summary.md` via Vite's built-in `?raw` suffix (`import md from '.../summary.md?raw'`) — no markdown plugin.
- Renders the markdown via the shared `renderWithCitations` helper (lifted in Section C).
- Footer strip: *"Generated 2026-04-17 by claude-opus-4-7 · [view prompt] · [view metadata]"* — both links are `<details>` disclosures, expandable inline, so a reviewer can verify the output is real LLM generation.
- Mount point unchanged: `ChainOfTitle.tsx:127-130`.

**Deletions (after grep audit)**

- `src/components/AiSummaryPanel.tsx` — replaced.
- `src/hooks/useAnthropicKey.ts` — no runtime key needed.
- Streaming call path in `src/lib/claude-summary.ts` — grep for other importers before deleting the streaming function. Keep the system-prompt constant (extracted to `src/lib/claude-summary.prompt.md` or remaining in `.ts`) so the bake script reuses it.

**File inventory**

- New: `scripts/bake-ai-summaries.ts`
- New: `src/components/AiSummaryStatic.tsx`
- New: `src/lib/claude-summary.prompt.md` (or retained as a constant in `claude-summary.ts`)
- New: `src/data/ai-summaries/{apn}/{summary.md, prompt.txt, metadata.json}` × 6 parcels (18 committed files)
- Edited: `.gitignore`, `src/components/ChainOfTitle.tsx`, `src/lib/claude-summary.ts`, `package.json` (bake script entry)
- Moved: `.env.local.txt` → `.env.local`
- Deleted: `src/components/AiSummaryPanel.tsx`, `src/hooks/useAnthropicKey.ts`
- Possibly deleted: `streamChainSummary` function itself (after grep audit)

---

## Section E — Dependency order, rollout, and testing

**Dependency graph**

- **Chain 1 (strict order A → C → D):**
  - A produces three new instruments + three new anomalies + one new lifecycle.
  - C extends the anomaly schema + rendering, and needs A's anomalies to exist so their patterns can be written.
  - D bakes the summary, which reads anomalies' `plain_english` (via the schema change that lands in C) with a fallback to `description`. Correct rollout lands C before D so the committed summaries use the plain-English bodies.
- **Chain 2 (independent):** B — the search hero — has no data or rendering dependency on Chain 1.

**Parallelism**

Outer parallelism is `{A → C → D}` **||** `{B}`. Two agents, two worktrees, two PRs — not four. Chain 1 is serial internally. Candidate for `superpowers:dispatching-parallel-agents` at implementation time.

**PR strategy**

Two PRs, self-contained:

- PR 1 — Search hero (Section B). Can land without waiting on Chain 1.
- PR 2 — Corpus + anomaly prose + AI bake (Sections A + C + D). Commits the 18 baked artifacts alongside the code that renders them.

Each PR description calls out the behavioral changes:

- PR 1: curated-hit navigation now leaves the landing page; two search surfaces collapsed to one.
- PR 2: synthetic instruments marked `demo_synthetic` with visible UI disclosure; runtime LLM call removed; summaries regenerated at build time from a committed prompt.

**Testing**

- **DOM test for `SearchHero`** — entity-type pill rendering per match type, instrument-match direct-route, curated-hit navigation to `/parcel/:apn`, deletion of `SearchEntry`.
- **Unit test for `renderAnomalyProse`** — both branches of the discriminated union; citation tokenization on override prose (critical — an override with `[11-digit]` text must produce clickable nodes, not literal brackets).
- **Unit test for `prompt_hash` canonicalization** — two input objects with different key order must hash to the same value. Proves Section D item 4 is correct.
- **Metadata shape snapshot** — one baked `metadata.json` tested for shape (field presence, types), not content (content is model-variable).
- **`tests/post-demo-features.dom.test.tsx` fate** — audit in-PR. Options: absorb into a named test file, rewrite against the new structure, or delete with a documented reason. Do not leave untracked after the work lands.

**Audit-before-delete, final statement**

Applies to Section B (`MapSearchBar`, `SearchEntry`) and Section D (`AiSummaryPanel`, `useAnthropicKey`, possibly `streamChainSummary`). Grep covers `src/**` **and** `tests/**`. Historical specs and plans under `docs/superpowers/` are frozen — do not modify.
