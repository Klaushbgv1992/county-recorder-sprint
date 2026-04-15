# Home-Run Terminal Prompts — Parallel Warp Session Kit

**Use:** Open one Warp terminal per stream. Start `claude` in the repo root of each terminal. Paste the matching prompt as your first message. The agent will handle its own worktree, plan load, and execution.

**Recommended terminal count:** 5 stream terminals + 1 consolidator terminal = 6.

**Concurrency note:** All five stream prompts can run truly simultaneously. Each creates its own git worktree under `.claude/worktrees/home-run-sN-*`. The consolidator terminal stays in the repo root and drives the merge phase.

**Merge order** (enforced by consolidator, not by streams themselves):

1. S1 Front Door
2. S4B Pipeline Banner (sub-extract from S4 branch)
3. S3A Anomaly Detector (sub-extract from S3 branch)
4. S2 Spatial Context
5. S4A Staff Workbench (remainder of S4 branch)
6. S3B Transaction Wizard (remainder of S3 branch)
7. S5 Hygiene + Polish

S3 and S4 each land in one worktree per the plans but can be split by the consolidator into two PRs for cleaner history. Either is fine; plans are written so merge order does not produce conflicts.

---

## Prompt 1 — Stream 1: Public Front Door

Paste the following into the first Warp terminal's fresh `claude` session:

```
You're executing Stream 1 (Public Front Door) of the home-run sprint.

Sprint context lives in @CLAUDE.md. The architectural spec is at
@docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md §4.1.
Your full implementation plan is at
@docs/superpowers/plans/2026-04-14-home-run-s1-front-door.md.

Your goal: replace the bland Search Entry landing with a map-first
LandingPage (county outline + highlighted POPHAM/HOGUE polygons), plus a
public /county-activity heat map. MapLibre GL via react-map-gl. Data
captured via a one-time ArcGIS REST script committed alongside the
GeoJSON. Spec §4.1 is authoritative on scope.

Execute in this order:

1. Invoke superpowers:using-superpowers (startup ritual).
2. Invoke superpowers:using-git-worktrees and create the worktree
   `.claude/worktrees/home-run-s1-front-door` branched from claude/angry-buck.
3. Read the spec §4.1 and the full S1 plan once.
4. Invoke superpowers:subagent-driven-development and execute the plan
   task-by-task. Each checkpoint gets a fresh subagent per the skill's
   guidance. Review between tasks before proceeding.
5. For the pure-logic task (activity-aggregator), use
   superpowers:test-driven-development explicitly.
6. When all checkpoints are complete, invoke
   superpowers:verification-before-completion.
7. Then invoke superpowers:requesting-code-review and address findings.
8. Finally invoke superpowers:finishing-a-development-branch to hand
   off to the consolidator.

Honor CLAUDE.md hard constraints — manual curation preferred over flaky
automation, serve captured source documents locally. The ArcGIS capture
script is a one-time run; if the portal endpoint drifts, follow the
plan's documented fallback (step-by-step in Task 2).

Do not touch files outside S1's declared file structure unless the plan
or spec explicitly says so. Do not edit CLAUDE.md.

If any step in the plan looks wrong or missing, stop and ask rather than
improvising.

Start now with superpowers:using-superpowers.
```

---

## Prompt 2 — Stream 2: Spatial Context on Chain

```
You're executing Stream 2 (Spatial Context on Chain) of the home-run
sprint.

Sprint context: @CLAUDE.md. Spec: @docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md §4.2.
Plan: @docs/superpowers/plans/2026-04-14-home-run-s2-spatial-context.md.

Your goal: add a resizable right-hand SpatialContextPanel to
/parcel/:apn and /parcel/:apn/encumbrances. Layers: basemap, adjacent
parcels, Seville Parcel 3 subdivision boundary, subject parcel polygon,
instrument pins (plat + affidavit of correction). Clicks open the
existing Proof Drawer. Collapse state persists to localStorage.

Execute in this order:

1. superpowers:using-superpowers (startup).
2. superpowers:using-git-worktrees → create
   `.claude/worktrees/home-run-s2-spatial-context` from claude/angry-buck.
3. Read spec §4.2 + full S2 plan once.
4. Upstream dependency check: if `src/data/parcels-geo.json` exists in
   this branch, great. If not (S1 hasn't merged yet), create a two-feature
   stub at that path with hand-traced polygons — delete the stub before
   you rebase on the integration branch. The plan's Task 1 falls back
   cleanly if the ArcGIS subdivision layer is missing; use the union
   path documented in Task 2 Step 2.
5. superpowers:subagent-driven-development to execute task-by-task.
6. superpowers:test-driven-development for instrument-markers
   placement logic (Task 3).
7. When complete: superpowers:verification-before-completion →
   superpowers:requesting-code-review →
   superpowers:finishing-a-development-branch.

Do not touch files outside S2's declared structure. Do not edit
CLAUDE.md. If the subdivision boundary can't be derived from ArcGIS and
needs hand-tracing, tag its provenance `"manual_trace"` in the JSON and
document it in the commit.

Start now with superpowers:using-superpowers.
```

---

## Prompt 3 — Stream 3: Title Depth (Anomaly Detector + Transaction Wizard)

```
You're executing Stream 3 (Title Depth) of the home-run sprint — the
heaviest stream at ~12–16 hours.

Sprint context: @CLAUDE.md. Spec: @docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md §4.3.
Plan: @docs/superpowers/plans/2026-04-14-home-run-s3-title-depth.md.

Your goal: two linked features.
  S3A — Chain Anomaly Detector: 8 declarative rules (R1–R8) fire on the
        corpus, surface in an AnomalyPanel above /parcel/:apn, cite
        evidence, and include examiner actions + detection provenance.
  S3B — Transaction Wizard: 4-step wizard at /parcel/:apn/commitment/new
        generates Schedule B-I from chain state + transaction inputs,
        then exports a full A+B-I+B-II PDF. Closes Gap #16.

Execute in this order:

1. superpowers:using-superpowers (startup).
2. superpowers:using-git-worktrees → create
   `.claude/worktrees/home-run-s3-title-depth` from claude/angry-buck.
3. Read spec §4.3 + full S3 plan once.
4. Complete Task 1 (shared types) first in the main session.
5. Then invoke superpowers:subagent-driven-development and dispatch S3A
   and S3B as parallel sub-streams — they touch disjoint files after
   Task 1. Review each sub-stream's checkpoints independently.
6. Every rule (R1–R8) is TDD'd — use superpowers:test-driven-development
   explicitly for each rule and for the B-I generator.
7. When both sub-streams are complete, run S3.Final integration
   checklist from the plan.
8. superpowers:verification-before-completion →
   superpowers:requesting-code-review →
   superpowers:finishing-a-development-branch.

Rule fixtures use the real POPHAM + HOGUE corpus. Do not fabricate
anomalies — if a rule cannot be made to fire on the real data, flag
that to the sprint owner rather than seeding synthetic triggers.

The Transaction Wizard closes Gap #16 — update the gap status in
`known-gaps.md` only if explicitly in scope; S5 owns the final
`known-gaps.md` rewrite, so a marker comment is sufficient here.

Every B-I item must cite its origin anomaly or lifecycle. No free-form
generation; all output traces to a named template + named input.

Start now with superpowers:using-superpowers.
```

---

## Prompt 4 — Stream 4: Moat Made Visible (Staff Workbench + Pipeline)

```
You're executing Stream 4 (Moat Made Visible) of the home-run sprint.

Sprint context: @CLAUDE.md. Spec: @docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md §4.4.
Plan: @docs/superpowers/plans/2026-04-14-home-run-s4-moat-visible.md.

Your goal: two linked features.
  S4A — /staff Workbench: /staff dashboard, /staff/search (flips
        Gap #2 — name-filtered full-index search), /staff/queue
        (curator action queue consuming S3 anomalies),
        /staff/parcel/:apn (expanded examiner view with suppressed-
        instrument visibility). HOGUE cross-parcel release hunt
        surfaces honest-zero per Decision #37.
  S4B — Pipeline Dashboard: 40px global sticky freshness strip mounted
        in App shell; /pipeline full dashboard (5 stage cards +
        30-day history + plant-lag comparator).

Execute in this order:

1. superpowers:using-superpowers (startup).
2. superpowers:using-git-worktrees → create
   `.claude/worktrees/home-run-s4-moat-visible` from claude/angry-buck.
3. Read spec §4.4 + full S4 plan once.
4. Build S4B first (it has no dependency on S3 and ships the
   PipelineBanner mounted in App shell — lowest-risk change).
5. Then build S4A. The CuratorQueue consumes anomaly findings from
   S3A — if S3 has not landed, stub with an empty `findings` array
   and leave a TODO-at-merge comment. Do not block on S3.
6. Use superpowers:subagent-driven-development for the task-by-task
   flow and superpowers:test-driven-development for
   staff-search, cross-parcel-release-hunt, and pipeline-selectors.
7. When both sub-streams are complete:
   superpowers:verification-before-completion →
   superpowers:requesting-code-review →
   superpowers:finishing-a-development-branch.

The mock auth amber "Staff preview (demo)" banner is mandatory — do not
wire real auth, and call out the demo scope in visible copy.

The HOGUE cross-parcel hunt MUST return zero matches because the
release is not in the corpus. That honest zero is the feature; do not
backfill a synthetic release to make it look more impressive.

Start now with superpowers:using-superpowers.
```

---

## Prompt 5 — Stream 5: Hygiene + Visual Polish (runs LAST)

```
You're executing Stream 5 (Hygiene + Visual Polish) of the home-run
sprint. CRITICAL: this stream runs LAST, after S1–S4 have merged to the
integration branch.

Sprint context: @CLAUDE.md. Spec: @docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md §4.5.
Plan: @docs/superpowers/plans/2026-04-14-home-run-s5-hygiene-polish.md.

Your goal: close 5 actionable gaps (#9, #14, #17, #18, #19), ship a
Tailwind design-system pass (tokens, typography, transitions, skeletons,
empty states, optional dark mode), update `/moat-compare` with 4 new
claim rows, rewrite the demo script, and mark closed gaps in
`docs/known-gaps.md`.

Pre-flight check: ensure the current branch (claude/angry-buck or the
integration branch) contains commits from S1, S2, S3, S4. Run:

    git log --oneline --grep="^feat(s[1-4])" | head -30

If you do not see at least one commit from each of S1–S4, STOP and
confirm with the sprint owner that the preceding streams have merged.

Execute in this order:

1. superpowers:using-superpowers (startup).
2. superpowers:using-git-worktrees → create
   `.claude/worktrees/home-run-s5-hygiene-polish` branched from the
   integration branch (or claude/angry-buck if that is currently the
   integration branch).
3. Read spec §4.5 + full S5 plan once.
4. Do gap closes first (Tasks 2–6) using
   superpowers:test-driven-development. These are pure-logic closes
   with existing test infrastructure.
5. Then do the visual polish pass (Tasks 7–10) using
   superpowers:subagent-driven-development. Tokens first, then
   propagation, then skeletons, then hero.
6. Then update /moat-compare (Task 11) with 4 new claim rows.
7. Then update the demo script + known-gaps + reproduce guide
   (Task 12).
8. superpowers:verification-before-completion →
   superpowers:requesting-code-review →
   superpowers:finishing-a-development-branch.

Do not introduce new features. Scope is hygiene, polish, narrative.

When marking gaps closed in `docs/known-gaps.md`, include a one-line
note citing the closing file or commit SHA so the audit trail is
preserved.

If dark mode takes more than an hour, cut it — stretch item per spec.

Start now with superpowers:using-superpowers.
```

---

## Prompt 6 — Consolidator (Sprint Owner's Main Terminal)

The consolidator terminal runs **you** (the sprint owner) in the repo
root, not a worktree. Use the following prompt in a dedicated `claude`
session when you're ready to merge:

```
You're the consolidator for the home-run sprint. You coordinate merges
across 5 parallel streams, smoke-test the integration branch after each
merge, and drive the final demo rehearsal.

Sprint context: @CLAUDE.md. Master spec: @docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md §5.

Streams (worktrees) and their branches:
  S1 `home-run/s1-front-door`        `.claude/worktrees/home-run-s1-front-door`
  S2 `home-run/s2-spatial-context`   `.claude/worktrees/home-run-s2-spatial-context`
  S3 `home-run/s3-title-depth`       `.claude/worktrees/home-run-s3-title-depth`
  S4 `home-run/s4-moat-visible`      `.claude/worktrees/home-run-s4-moat-visible`
  S5 `home-run/s5-hygiene-polish`    `.claude/worktrees/home-run-s5-hygiene-polish`

Merge order (per spec §5.2, minimum conflict):
  1. S1
  2. S4B (pipeline banner — may be cherry-picked from S4 if ready early)
  3. S3A (anomaly detector — may be cherry-picked from S3)
  4. S2
  5. S4A (staff workbench — remainder of S4)
  6. S3B (transaction wizard — remainder of S3)
  7. S5

For each merge:
  a. Confirm the stream's branch has `chore(sN): ready to merge` as its
     latest commit (every stream plan's final task adds this).
  b. Fast-forward merge the stream's branch into the integration branch
     (create `home-run/integration` from claude/angry-buck if it doesn't
     exist yet).
  c. Run: `npm test && npm run lint && npm run build`. If any of these
     fail, stop and surface the failure to the stream owner.
  d. Manually click through the demo script to confirm no regression.
  e. Commit any merge-conflict resolutions with a conventional commit
     message referencing the source branch.

After all 7 merges complete:
  f. Invoke superpowers:requesting-code-review on the whole integration
     branch.
  g. Final demo rehearsal against @docs/demo-script.md (as rewritten
     by S5).
  h. Update @CLAUDE.md decision log with a single entry summarizing the
     home-run sprint outcome and a reference to the spec + plans.
  i. Invoke anthropic-skills:consolidate-memory to fold home-run
     learnings into memory.

Use superpowers:dispatching-parallel-agents if you want to run
cross-stream smoke tests as concurrent subagents between merges.

Do NOT force-push. Do NOT skip hooks. If a pre-commit hook fails, create
a NEW commit that fixes the issue rather than amending.

The final integration branch should be push-ready for PR review.

Start now by reading @docs/superpowers/specs/2026-04-14-demo-ready-homerun-design.md §5 carefully.
```

---

## Operational notes for the sprint owner

- **Model choice.** Spec is dense; stream plans are dense. Run each
  Warp terminal on an Opus-tier or equivalent high-capacity model to
  keep the whole plan in context.

- **Cross-stream chat.** If one stream discovers an architectural
  problem affecting another, have it post the finding to `CLAUDE.md`
  Decision Log before pressing on. The consolidator merges those
  updates early.

- **Worktree cleanup.** After a stream merges successfully, run
  `git worktree remove .claude/worktrees/home-run-sN-xxx` from the
  repo root to free the directory. Don't remove worktrees that still
  have unmerged commits.

- **Effort expectations.** Per spec §6: ~40–50h wall-clock total. If
  all 5 streams run true-parallel with 5 operators, elapsed ~15–25h
  plus ~4–6h consolidator overhead.

- **When to stop.** If a stream's checkpoint cannot be satisfied with
  the real corpus (e.g., an anomaly rule cannot be made to fire), the
  stream owner must stop and ask rather than seed synthetic data. The
  honest-zero discipline from Decision #40 applies throughout.

- **Demo day.** After S5 lands, the sprint owner delivers the 8-minute
  rehearsed demo per the rewritten `docs/demo-script.md`.
