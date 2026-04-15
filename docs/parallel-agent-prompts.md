# Parallel Agent Prompts — Tier 1 Next Steps

Four self-contained prompts. Each one is meant to be pasted into a fresh
Claude Code instance running in its own Warp tab. Each agent works in
its own git worktree so the four can run simultaneously without
collision.

## Before you start — one-time setup

1. Make sure every terminal tab is `cd`'d into the same repo root:
   ```bash
   cd /path/to/county-recorder-sprint
   ```

2. Decide the auto-permission posture. For worktree-isolated agents you
   can safely start each tab with:
   ```bash
   claude --dangerously-skip-permissions
   ```
   Or the lower-risk posture — inside each Claude session press
   **Shift+Tab** once to land on `acceptEdits`.

3. Agents are told to create their own worktree with a predictable
   name (`tier1-a`, `tier1-b`, `tier1-c`, `tier1-d`). No collisions on
   `main` until you merge.

4. After all four report done, merge them serially on `main`:
   ```bash
   git switch main
   git merge --no-ff tier1-a      # new parcel first (pure data, no UI collisions)
   git merge --no-ff tier1-c      # deep links next (router is foundational)
   git merge --no-ff tier1-b      # release matcher wired in
   git merge --no-ff tier1-d      # moat screen last (nav + route touch)
   npm run build && npm run test
   ```
   This order is chosen to minimize rebase pain — data first, router
   second, feature UI third, new screen last.

## Parallelism map (what each agent touches, what overlaps)

| Task | Worktree | Primary files | Risk of collision |
|------|----------|---------------|-------------------|
| A. Third parcel w/ lien | `tier1-a` | `src/data/parcels.json`, new `src/data/instruments/*.json`, new extraction trace, PDF under `data/raw/` | **Low.** Pure data. Only collision: `parcels.json` gets appended to. |
| B. Wire release-candidate matcher | `tier1-b` | `src/components/EncumbranceLifecycle.tsx`, new `CandidateReleasesPanel.tsx`, `src/logic/release-candidate-matcher.ts`, a test file | **Medium.** `EncumbranceLifecycle.tsx` is touched by B only among this batch, so fine. |
| C. Deep-linkable routes | `tier1-c` | `src/App.tsx`, `src/main.tsx`, new `src/router.tsx`, `package.json` (adds react-router) | **Medium.** `App.tsx` is the shared risk — C will touch it last and hardest. |
| D. Side-by-side moat comparison | `tier1-d` | new `src/components/MoatCompare.tsx`, `src/App.tsx` nav button, optional new route if C merged first | **High-ish.** Needs the router if it's going to be a real route. If C hasn't merged yet, D treats it as a modal and is self-contained. |

Recommendation: run **A and B truly in parallel** (no overlap at all).
Run **C alone** in its own tab, start it before D. Run **D after C** or
as a modal-only task that gets upgraded to a route during the merge.

---

## Prompt A — Add a third parcel with a lien or easement

Paste into a fresh Claude Code session in a Warp tab. Title the tab
`tier1-a`.

```
You are extending the county-recorder-sprint prototype. The repo root is
the current directory. Before doing anything, read:

1. docs/prompt-fit-analysis.md — specifically section 3.1 ("the build
   doesn't stress the depth enough") and section 4 Tier 1 item #1.
2. CLAUDE.md — the decision log, especially Decisions 25–30 (curation
   rules) and 32 (trust-name recovery via OCR).
3. research/phase-3-summary.md — the exact curation standards the two
   existing parcels were held to.
4. docs/known-gaps.md item #1 and #13 — for framing.

You will use the superpowers plugin. Invoke in this order:

   superpowers:brainstorming
      → Discuss scope: which lien/easement type lands best for a
        residential-examiner audience. Candidates: IRS tax lien,
        mechanics' lien, recorded easement, or HOA/CC&R. Pick one
        based on (a) availability of a real Maricopa recorded
        instrument we can pull via publicapi.recorder.maricopa.gov
        and (b) demo-narrative value. Do not proceed past brainstorm
        until I approve.

   superpowers:writing-plans
      → Turn the brainstorm into a checkbox plan. Include: parcel
        hunt, API pulls, PDF downloads to data/raw/R-004/, OCR trace
        via scripts/run-extraction.py, curation into
        src/data/instruments/*.json, lifecycles and links entries,
        schema validation, test updates, and a demo-script beat.

   superpowers:executing-plans
      → Implement task by task. Honor manual-curation-preferred from
        CLAUDE.md Hard Constraints.

Work in an isolated git worktree:

   git worktree add .claude/worktrees/tier1-a -b tier1-a

and do all your commits there. Do not touch main.

Parallel-agent constraint: three other agents are editing this repo
right now in their own worktrees. You may only modify files under
src/data/, data/raw/, and (for tests) tests/*.test.ts. If you discover
you need to change shared UI files (components/*.tsx, logic/*.ts,
App.tsx), STOP and report back instead.

Done criteria:
- Third parcel in src/data/parcels.json with at least 4 curated
  instruments (purchase deed, financing DOT, the lien or easement,
  at least one more).
- Real Tesseract extraction trace in src/data/extraction-traces/ for
  at least one of the new instruments.
- npm run build and npm run test both green. No tests disabled.
- A new beat in docs/demo-script.md showing the lien/easement story.
- Worktree branch tier1-a, ready for merge to main.

When you are done, print a three-line summary with: chosen parcel APN,
chosen lien/easement type, and count of new instruments. Stop and wait
for my review before merging.
```

---

## Prompt B — Wire the release-candidate matcher into the UI

Paste into a fresh Claude Code session. Title the tab `tier1-b`.

```
You are extending the county-recorder-sprint prototype. Before doing
anything, read:

1. docs/prompt-fit-analysis.md — sections 3.4 and 4 Tier 1 item #2.
2. src/logic/release-candidate-matcher.ts — the scorer already exists.
3. tests/release-candidate-matcher.test.ts — the 12 tests that define
   its contract.
4. src/components/EncumbranceLifecycle.tsx — where the panel lives.
5. src/data/lifecycles.json and src/data/links.json — the current
   lifecycle and link schema.
6. CLAUDE.md Decision #17 (confidence scores are hand-assigned in the
   prototype).

Goal: when a lifecycle is OPEN (no release link yet), the Encumbrance
Lifecycle Panel surfaces the top N candidate releases from the matcher
inline beneath the lifecycle header, lets the examiner accept/reject
each candidate, and on accept promotes that candidate into an edge in
the visible link list with provenance='algorithmic' and the matcher's
score as confidence.

Use the superpowers plugin. Run these sub-skills:

   superpowers:brainstorming
      → Walk through the UX: where the candidates render, how accept
        flips the lifecycle status, what the rationale string becomes,
        how we prove this isn't theater (i.e., the scorer actually
        runs on the corpus data, not a hardcoded result). Stop for my
        sign-off.

   superpowers:test-driven-development
      → Before the UI work, write tests for the glue code that
        converts matcher output into UI rows and accept-actions into
        link edges. Red → green → refactor.

   superpowers:executing-plans
      → Implement.

Work in an isolated git worktree:

   git worktree add .claude/worktrees/tier1-b -b tier1-b

Parallel-agent constraint: three other agents are editing this repo in
their own worktrees. Your touch-surface is:
- src/components/EncumbranceLifecycle.tsx
- new src/components/CandidateReleasesPanel.tsx (create)
- src/logic/release-candidate-matcher.ts (additive only; do not change
  existing test-covered behavior)
- tests/release-candidate-matcher.test.ts (additive)
- new tests/candidate-release-glue.test.ts (create)

Do not touch: src/App.tsx, src/main.tsx, src/data/*, or any other
component file. If you need to, STOP and report.

Hard constraint: a new provenance kind "algorithmic" is allowed in
this task; if you add it, update src/schemas.ts and re-run npm run
test to prove the schema change doesn't break existing fixtures.

Done criteria:
- For any OPEN lifecycle with a plausible release candidate in the
  same parcel corpus, the UI shows top-3 candidates ranked by score.
- Each candidate row has Accept / Reject buttons. Accept writes a new
  link with provenance='algorithmic' and score-as-confidence, flips
  the lifecycle rationale to "Accepted via release-candidate matcher,
  score=X.XX", and moves the lifecycle to RELEASED.
- Candidate list is derived live from src/logic/release-candidate-matcher.ts
  — no hardcoded list.
- npm run build and npm run test green.
- Demo-script.md beat 7 updated (or new beat inserted) showing the
  matcher in action.

When done, print: which lifecycle(s) now show candidates, what the top
score was, and confirmation that 0 tests were disabled. Stop and wait
for review before merging.
```

---

## Prompt C — Add deep-linkable URL routing

Paste into a fresh Claude Code session. Title the tab `tier1-c`.

```
You are extending the county-recorder-sprint prototype. Before anything,
read:

1. docs/prompt-fit-analysis.md — section 3.7 and 4 Tier 1 item #3.
2. src/App.tsx — state machine is currently screen + selectedApn +
   drawerInstrument in React state.
3. src/main.tsx and index.html — entry point.
4. docs/demo-script.md beat 2 — the pitch already claims instrument-
   number deep links work. Today they work in-app but not via URL.

Goal: make the URL reflect the app state so that pasting
/parcel/304-78-386 lands on the POPHAM chain, and
/parcel/304-78-386/instrument/20210075858 lands on the chain with the
Proof Drawer pre-opened on that instrument. Search is at /.

Use the superpowers plugin:

   superpowers:brainstorming
      → Decide the routing library (react-router v7 is the default
        choice — justify if you choose something else). Decide
        whether to use hash routing or history API (history is
        preferred since Vite handles SPA fallback in dev). Sketch
        the route table and the state-to-URL / URL-to-state mapping.
        Stop for sign-off.

   superpowers:writing-plans
      → Checkbox plan covering: dep add, route table, refactor App.tsx
        to derive state from URL, preserve the "Search another parcel"
        button behavior, handle unknown APN / unknown instrument
        gracefully with a 404-style state, update the nav bar buttons
        to use <Link>.

   superpowers:executing-plans

Work in an isolated git worktree:

   git worktree add .claude/worktrees/tier1-c -b tier1-c

Parallel-agent constraint: three other agents are editing this repo in
their own worktrees. Your touch-surface is:
- src/App.tsx (you will rewrite its routing but preserve all existing
  behavior and imports)
- src/main.tsx
- new src/router.tsx (create)
- package.json + package-lock.json (dependency add)
- tests/routing.test.ts (create — at minimum, a test that URL →
  screen mapping is correct)

Do not touch: components/*.tsx (except if absolutely necessary to
convert a button to a Link — if so, flag it in your summary),
src/data/*, src/logic/*, other tests.

Hard constraints:
- The Chain, Encumbrance, and Proof Drawer components must not learn
  about URLs. Only App.tsx (or router.tsx) reads and writes URL state.
- Preserve the existing drawer-opens-alongside-main-content layout.
- Unknown parcel APN or unknown instrument number shows a friendly
  "not in this corpus" panel with a link back to /, not a crash.

Done criteria:
- Typing /parcel/304-78-386 in the browser lands on the chain for
  POPHAM. Works on page refresh (SPA fallback configured in Vite).
- Typing /parcel/304-78-386/instrument/20210075858 opens the drawer
  on that instrument.
- Typing /instrument/20210075858 (no parcel) resolves to the owning
  parcel via searchParcels and redirects to the parcel+instrument URL.
- Search screen remains reachable at /.
- npm run build and npm run test green. No disabled tests.
- Demo-script.md beat 2 updated: show the URL bar changing, then
  paste the URL into a fresh tab to prove custody of the deep link.

When done, print the four canonical URLs that now work. Stop and wait
for review before merging.
```

---

## Prompt D — Side-by-side moat comparison screen

Paste into a fresh Claude Code session. Title the tab `tier1-d`.

```
You are extending the county-recorder-sprint prototype. Before anything,
read:

1. docs/prompt-fit-analysis.md — section 3.2 and 4 Tier 1 item #4.
2. docs/red-team.md Q5 — the three-claim moat argument. You will
   render it visually instead of arguing it.
3. research/before-workflow.md and research/measurable-win.md — the
   source material for what "the title-plant view" looks like.
4. src/components/MoatBanner.tsx — the existing one-line badge. You
   are building the larger sibling.

Goal: a new screen "Custody Compare" reachable from the top nav,
showing a side-by-side table for a single parcel (POPHAM by default)
with two columns: "What a title plant / DataTree shows" (static mock,
synthesized from public marketing screenshots and your research on
what the DataTree output looks like — clearly labeled as a mock) vs.
"What this portal shows" (live data from src/data/instruments/*.json).

Each row is a field: chain depth, verified-through date, per-instrument
image URL, MERS nominee visibility, legal-description provenance, etc.
Each row ends in a moat-tag: "Custody advantage" or "Neutral" or
"Plant advantage" (honest — not every row is a win).

Use the superpowers plugin:

   superpowers:brainstorming
      → Settle the row list and the rhetorical framing. What are we
        willing to concede to title plants (e.g., breadth across
        counties)? Stop for sign-off.

   superpowers:writing-plans
   superpowers:executing-plans

Work in an isolated git worktree:

   git worktree add .claude/worktrees/tier1-d -b tier1-d

Parallel-agent constraint: three other agents are editing this repo in
their own worktrees. Your touch-surface is:
- new src/components/MoatCompare.tsx (create)
- new src/data/moat-compare.json (create — this is where the title-
  plant mock column's row values live, so the rhetorical framing is
  editable without recompile)
- src/App.tsx (you will add ONE nav button and ONE branch in the
  screen switch — touch nothing else in that file)
- tests/moat-compare.test.ts (create — at minimum, verify the
  "Custody advantage" count is > 0 and that every row references an
  instrument that exists in the corpus)

Do not touch: src/main.tsx, router.tsx (if it exists — agent tier1-c
is writing that in parallel), other components, other data files.

Hard constraints:
- The title-plant column is a **labeled mock**, not a scrape. Every
  cell in that column has the annotation "mock — based on public
  documentation of DataTree/title-plant output" visible on hover.
- At least one row must honestly credit title plants (e.g., cross-
  county breadth). A one-sided comparison is not credible.
- Every "our portal" cell is computed from the live corpus data, not
  hardcoded.

Done criteria:
- Custody Compare reachable from nav, shows the table for POPHAM.
- At least 8 rows. At least one "Plant advantage" or "Neutral" row.
- npm run build and npm run test green.
- Demo-script.md gains a new beat "Moat beat #4 — Custody Compare"
  immediately after beat 7 (which currently introduces the moat
  verbally).

When done, print: total row count, "Custody advantage" count, and the
one row where you conceded to title plants. Stop and wait for review
before merging.
```

---

## Merge sequence after all four agents report done

```bash
# Start fresh on main
git switch main
git pull

# 1. Data first — no UI collisions
git merge --no-ff tier1-a
npm run build && npm run test   # must be green before next merge

# 2. Router second — foundational for tier1-d if it chose routed mode
git merge --no-ff tier1-c
npm run build && npm run test

# 3. Feature UI
git merge --no-ff tier1-b
npm run build && npm run test

# 4. New screen last — may need a small rebase to pick up the router
git merge --no-ff tier1-d
npm run build && npm run test

# Cleanup
git worktree remove .claude/worktrees/tier1-a
git worktree remove .claude/worktrees/tier1-b
git worktree remove .claude/worktrees/tier1-c
git worktree remove .claude/worktrees/tier1-d
git branch -d tier1-a tier1-b tier1-c tier1-d
```

If any merge step surfaces a conflict, resolve it before the next
merge — don't stack them.

## One more thing

Each prompt ends with "stop and wait for review before merging." That
is deliberate — it gives you a human checkpoint per stream where you
can eyeball the diff and ask follow-ups without the agent racing
ahead to merge. If you want the agents to just merge themselves,
replace the "Stop and wait" line with "Run the merge script above
and report the final `git log --oneline -n 6`."
```
