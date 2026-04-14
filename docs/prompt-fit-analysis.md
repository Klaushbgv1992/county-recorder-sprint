# Prompt-Fit Analysis — County Recorder AI Search Portal

Analysis of the prototype in this repo against the recruiter's stated
build requirements and evaluation lens. Written 2026-04-14.

---

## 1. How the build maps to the recruiter's five questions

| # | Recruiter ask | What was built | Fit |
|---|---------------|----------------|-----|
| 1 | Public portal + internal (innovation-first, public lead) | Public-facing examiner surface only. Internal ops surfaced as "verified-through date" + "pipeline status" badge on the Encumbrance panel (Decision #12, #16), no actual staff workbench. | **Partial.** Public side is strong; internal workbench is mention-only. |
| 2 | Depth on title examiner / abstractor (landman bonus) | Single persona, done end-to-end: search → chain → lifecycle → proof. No landman surface. | **Strong on the asked persona. Zero on the bonus persona.** |
| 3 | Real or synthetic records; judged on selection and presentation | Real records pulled from Maricopa's undocumented public REST API. 7 PDFs, 2 parcels (POPHAM primary, HOGUE backup). | **Strong.** Real data, real API, real OCR. |
| 4 | Beat title plants (DataTree, title plants specifically) | Three-claim moat: authoritative provenance, pipeline "verified-through" date, canonical document URLs. MERS disintermediation beat included. | **Strong as argument, thin as demonstration** — the moat is asserted via badges and rationale strings rather than shown via a side-by-side comparison. |
| 5 | Home run: research depth + product thinking > raw tech | Research is the prototype's strongest asset: `research/before-workflow.md` (6 domains of friction), `research/measurable-win.md` (115-interaction capture), `research/phase-3-summary.md` (curation judgment documented), `docs/red-team.md`, `docs/known-gaps.md`. Tech is clean but modest in surface area. | **Strong — the research is the differentiator.** |

The recruiter's explicit worry — "poor research led to poor product, over-reliance on AI to generate tools without understanding why" — the build is specifically organized to defeat. Every decision has a numbered entry in `CLAUDE.md` with rationale; every shortcut has a `known-gaps.md` line; every moat claim has a `red-team.md` defense.

---

## 2. What the prototype genuinely does well

**Grounded in real custodial work, not a generic doc-browser.**
- Seven real instruments pulled via `publicapi.recorder.maricopa.gov`. The recruiter can `curl` the API and cross-check the `raw_api_response` block on any instrument JSON.
- POPHAM's 2013 DOT → 2021 reconveyance is a legitimate 8-year lifecycle; the provenance on that link is OCR-derived, confidence 0.97, and is faithfully reflected in `src/data/links.json`.

**The AI claim is honest, not marketing.**
- Real Tesseract 4.1.1 extraction traces for two instruments, preserved verbatim in `src/data/extraction-traces/`.
- The Lot 46 / Lot 65 / Lot 687 discrepancy is surfaced on stage (Demo Beat 9). This is the single most convincing piece of the demo because it resists the pattern the recruiter is complaining about — AI theater with no understanding.
- HOGUE's `trust_name: null` trace proves the pipeline doesn't hallucinate when a field isn't present.

**Moat story has structural teeth, not slogans.**
- The `verified-through 2026-04-09` date is on the Encumbrance screen from frame one (Decision #12).
- MERS nominee handling (Decision #34) is encoded in the schema (`Party.nominee_for: { party_name, party_role }`) and rendered with a `mers_note` band — this is a real disintermediation talking point a title plant can't reproduce.
- HOGUE deliberately ships as an *open* lifecycle with a stated rationale that points at the public-API limitation. That's the strongest moat moment in the build: the county-internal full-name scan closes a gap the public API can't.

**The research > product-thinking > tech balance matches what the recruiter said they're scoring on.**
- Measurable-win numbers come from an instrumented browser session (115 discrete interactions for one parcel), not invented.
- Before/after table is framed honestly — "we are not claiming 115 clicks → 1 click; we are claiming one entry point replaces a multi-domain, multi-search, multi-tab workflow."
- 108 passing tests across 12 files covering the business logic, not just render smoke tests.

**Clean, shippable frontend.**
- Tailwind v4, React 19, typed top to bottom via Zod-inferred types, Vite production build emits ~347 kB gzipped. Nothing in `src/` is dead code.

---

## 3. Where it stops short of a home run

These are the places a skeptical reviewer will push. Ranked by how much they matter for the recruiter's specific lens.

### 3.1 Depth-over-breadth was the right call, but the demo doesn't stress the depth enough

The recruiter said: *"understanding why the industry operates the way it does today."* The prototype knows this — but the demo only shows two lifecycles and three document-type families. The title examiner's actual workflow has many more patterns: vesting deeds, tax liens, IRS liens, mechanics' liens, judgment liens, easements, CC&R references, HOA dues, plat book references, legal-description matching across neighbors, and 30-year-back marketable-title walks. None of those are in the corpus.

**This is the single biggest "so what" gap.** A title examiner watching the demo would immediately ask: *where are the liens, where are the easements, where's the 30-year walk, where's the property-description dispute handling?* The answer today is "out of corpus scope." That's defensible for a 2-day build but doesn't land a home run.

### 3.2 The moat is asserted, not *shown*

The demo tells you a title plant can't do this. It doesn't show you a title plant's output next to the prototype's output. A split-screen ("here's what DataTree returns for this APN, here's what we return, here's the field-by-field provenance diff") would make the moat visceral. Today the moat is a green badge and a rationale string.

### 3.3 Internal workbench is mention-only

The recruiter explicitly said "both" public and internal matter, with innovation on the public side leading. The prototype has no staff-facing surface at all — not even a sketch. A production pitch usually benefits from 1–2 staff-oriented screens (recordation QA queue, name-normalization review queue, publish pipeline dashboard). Even a single static mock would close this flank.

### 3.4 "AI turns passive records into linked work" claim is thin on automation

Claim #2 in the mission is that AI *turns passive records into structured linked title work.* In practice:
- Release matching: scorer exists (`src/logic/release-candidate-matcher.ts`, 12 tests) but is not wired into the UI. The shown link is manually curated.
- Chain assembly: same — the chain is curated, not synthesized.
- Name entity resolution: mention-only (Decision #15).
- Document-type classification: not present (the doc type is taken from the API code field).

The prototype demonstrates the *shape* of AI contribution (provenance tags, confidence scores, extraction traces) without actually running the matcher-at-scale that would justify the language. A reviewer who digs will notice.

### 3.5 Two-parcel corpus is a structural ceiling on the demo

The build honestly calls this out (`known-gaps.md` #4), but the effect is: the examiner can't test the portal on anything they care about. "Try your own address" is the most natural reaction to a search box, and the portal can't take it.

### 3.6 No cross-parcel / neighborhood context

Residential title examiners regularly need neighbor-parcel context — easements cross parcels, plat books span neighborhoods, CC&Rs bind blocks. The prototype is strictly parcel-keyed and shows zero neighborhood context. This is actually an argument *against* the moat claim ("county has the authoritative corpus") because the county, uniquely, has every neighbor too.

### 3.7 No deep-linkable URL per instrument in the app itself

The pitch emphasizes that deep-linkable URLs are a custody advantage over modals-and-JS. But the prototype itself keeps all state in React, not in the URL. A reviewer typing `/instrument/20210075858` into the address bar gets nothing. This is fixable in under an hour and would demonstrate the feature the pitch claims.

### 3.8 Abstractor-specific outputs are missing

A working title abstractor's output is usually a *title commitment*, a *chain-of-title report*, or a *lien letter*. None of those export formats exist in the prototype. The Proof Drawer has a "Copy Citation" button, which is a start, but no PDF export, no commitment-style export, no sendable preliminary report. For the persona the recruiter named, this is a notable omission.

### 3.9 Landman / mineral-rights surface is entirely absent

Recruiter called out landman as a bonus. Mineral-rights severance, oil & gas lease history, and surface-vs-mineral chains would be a genuine adjacency for an AZ portal (there are producing parcels in the state, and Arizona has severed mineral estate law). Zero work here. Easy to skip, but a 45-minute pass on a single mineral-severance example would earn the bonus points.

### 3.10 Anti-title-plant positioning is reactive, not proactive

The moat argument is all about *why a title plant can't do this*. It does not attack the *economic* moat of title plants (the bundling with underwriter relationships, the pre-negotiated title insurance tie-ins, the per-search pricing). A county portal that charges nothing and serves authoritative data *could* kneecap title plants on unit economics, not just data fidelity. The prototype doesn't articulate this.

---

## 4. Next tasks, ranked by impact on the "home-run" target

### Tier 1 — do these before the demo if you have any hours left

1. **Ship a third parcel with a lien or easement.** *Pivoted — delivered as subdivision encumbrances on the existing POPHAM parcel plus a first-class hunt-log demo asset.* The original plan (pick a new parcel with an IRS/mechanics' lien, curate 3–5 instruments) hit the structural limit documented as Known Gap #2 during a 45-minute federal-tax-lien hunt: the public `publicapi.recorder.maricopa.gov` surface has no name-, code-, or functional date-filtered search, the modern search UI is Cloudflare-gated, and the legacy ASP.NET WebForms UI requires `__VIEWSTATE` replay not feasible in-budget. Per sprint-owner direction we pivoted to two Seville Parcel 3 subdivision-level encumbrances already cited in POPHAM's legal description — the 2001-09-17 Affidavit of Correction (20010849180) and, recovered via OCR of its body text, the subdivision plat itself (20010093192, Book 554 Maps Page 19, SHEA HOMES dedicator) — wired as lifecycle `lc-004`. The 45-minute hunt transcript was promoted to `docs/hunt-log-known-gap-2.md` and scripted as demo Beat 7c: the failed API queries are themselves the moat evidence (see Decision #38, and Decision #21 on the missing APN bridge). Net effect: the brief's underlying goal — visible third-lifecycle evidence on the Encumbrance panel plus concrete disintermediation proof — is satisfied, though not by adding a new APN. A replacement-lien third parcel remains a future-scope item if the county ships a name-filterable index.

2. **Wire the release-candidate matcher into the UI.** `src/logic/release-candidate-matcher.ts` exists, tested, unused. Add a "candidate releases" panel on an open lifecycle — show the scorer's top 3 candidates, let the examiner accept/reject, auto-populate the link row. This is what Claim #2 (AI turns passive records into linked work) actually looks like. Budget: 2 hours.

3. **Add deep-linkable routes.** `/parcel/304-78-386`, `/instrument/20210075858`. Use `react-router` or even the hash. Paste into browser → land on the right Proof Drawer. This is the pitch's deep-link custody claim, made real. Budget: 45 minutes.

4. **Side-by-side moat comparison.** Static mock: "here's a title plant's response for this APN, here's ours" with field-by-field provenance deltas. Doesn't have to be a live title-plant integration — a screenshot with callouts is enough. Budget: 1 hour for a static screen.

### Tier 2 — tell the story better, even if no new code

5. **Expand the demo script to explicitly walk the "how examiners work today" narrative before introducing the prototype.** Lead with the 115-interaction capture + the tab-spawl screenshot. Then the prototype. The recruiter scored "research depth" as a headline criterion — foreground it.

6. **Title-commitment-style export from the Proof Drawer.** Output a printable PDF report: parcel header, chain table, lifecycle status, exceptions, with provenance footnotes. This is the *abstractor's deliverable*, and right now nothing in the portal produces one. Budget: 3–4 hours.

7. **Staff-side mock (one screen).** "Recordation QA queue": list of newly-recorded instruments awaiting extraction, color-coded by confidence, link to the Proof Drawer. Static data is fine. This closes the "public + internal" flank. Budget: 2 hours.

### Tier 3 — bigger bets for a second-round deliverable

8. **Name entity resolution, end-to-end.** Not a research project. Levenshtein + token-set ratio + role-aware rules (on a DOT the institutional name is the lender) would cover 80% of the cases. Surface a "resolved name" UI with a trail back to the source variants. This is the industry's biggest unsolved pain (Decision #15 admits this); solving it even modestly is a differentiator.

9. **30-year marketable-title walk.** Collapse the chain to a "marketable-title commitment" by looking backward from the current deed along grantor chains, stopping at the 30-year mark or a root-of-title event. The chain-builder logic is already there; the walk is ~80 lines of TypeScript on top.

10. **Neighborhood / plat-book context.** Pull in neighbor parcels for POPHAM (Seville Parcel 3, lots adjacent to 46). Show a plat-book view with instruments that touch multiple lots (easements, CC&Rs). This attacks gap 3.6 and is the unique-to-custodian angle.

11. **At-click OCR with a rate limit.** Replace the pre-computed trace replay with a live Tesseract invocation the first time a document is opened, cache the trace. Preserves the audit posture of the trace files while making the claim "AI extraction" more literal. Budget: half a day.

12. **Landman / mineral-rights surface.** Single-example prototype: find an Arizona parcel with a recorded mineral reservation, show the severance in a separate "mineral chain" tab alongside the surface chain. Positions the build adjacent to a second vertical without committing to it.

---

## 5. Verdict

**Against the brief as stated: strong submission, not yet a home run.**

The build aces what the recruiter flagged as the failure mode of the prior candidates — it is research-forward, it doesn't fake the AI, and every decision is defended in writing. For a 2-day build scoped to "beat title plants on the title-examiner workflow in Maricopa," the scope choices are defensible and the execution is clean.

What keeps it from closing as a home run is surface-area, not quality:
- Depth is real but narrow — only deed/DOT/release family, no liens, no easements, no 30-year walk.
- AI is honestly demonstrated but under-automated — the matchers exist, the UI doesn't use them.
- Moat is argued but not visually contrasted against the thing it's replacing.
- Abstractor persona lacks the abstractor's *deliverable* (commitment report, lien letter).
- Internal workbench is mention-only where the recruiter asked for both surfaces.

The most important next move for winning the round is **Tier 1**: one more parcel with a lien, the release-candidate matcher wired in, deep-linkable URLs, and a side-by-side moat screen. That set, executed in a half-day, would convert the submission from "credible prototype with strong research" to "a working argument that a county-owned portal beats the title-plant status quo."
