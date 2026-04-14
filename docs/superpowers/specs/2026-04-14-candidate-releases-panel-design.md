# Candidate Releases Panel — Design Spec

**Date:** 2026-04-14
**Branch:** `tier1-b`
**Scope target:** Tier 1 item #2 in `docs/prompt-fit-analysis.md` — wire the
existing `release-candidate-matcher` into the Encumbrance Lifecycle Panel so
Claim #2 ("AI turns passive records into structured linked title work") is
demonstrated, not asserted.

---

## 1. Problem

The matcher at `src/logic/release-candidate-matcher.ts` is fully tested (12
tests) but never rendered. On an OPEN lifecycle today, the examiner sees a
status rationale and an override widget — nothing that looks like AI working
on the corpus. The prompt-fit analysis (§3.4) flags this as the single
biggest under-demonstration in the build.

## 2. Goal

For every lifecycle whose effective status is `open` or `unresolved`, run the
matcher live against the parcel's own corpus of reconveyance instruments and
render the top-ranked candidates inline, with accept/reject affordances that
promote an accepted candidate into a visible `DocumentLink` with
`provenance="algorithmic"` and the matcher's score carried through as
`confidence`.

## 3. Non-goals

- No cross-parcel candidate search. (See Decision #36, logged as part of this
  change.)
- No persistence of examiner decisions to `src/data/*.json`. All examiner
  actions live in in-memory React state, same pattern as `linkActions` and
  `lifecycleOverrides`.
- No changes to the matcher's existing scoring behavior. Only additive
  exports (a new `CANDIDATE_DISPLAY_THRESHOLD` constant and helper).
- No touching `src/App.tsx`, `src/main.tsx`, `src/data/*`, or any other
  component file besides `EncumbranceLifecycle.tsx`.

## 4. Architecture

### 4.1 New provenance kind

`src/schemas.ts` gains a fourth `ProvenanceKind` enum member: `"algorithmic"`.
All existing fixtures use `public_api | ocr | manual_entry` so zod validation
stays green. This is a hard constraint surfaced in the task prompt.

### 4.2 Matcher additions (additive only)

`src/logic/release-candidate-matcher.ts`:

- Export `CANDIDATE_DISPLAY_THRESHOLD = 0.25`. Imported by both the glue
  module and the tests so the threshold is single-sourced.
- Export a helper `selectDisplayCandidates(dot, pool)` that:
  1. Runs `rankReleaseCandidates(dot, pool)`.
  2. Returns an object `{ ranked, aboveThreshold, total }` where:
     - `ranked` is the full sorted list (for counting), 
     - `aboveThreshold` is the top-N (N ≤ 3) above threshold,
     - `total` is `pool.length` (for the "ran against N" rationale).

No existing exported function changes shape or behavior.

### 4.3 Glue module: `CandidateReleasesPanel.tsx`

A new presentational component that owns the candidate UI inside the
lifecycle card.

**Props:**
```ts
interface Props {
  lifecycleId: string;
  dot: Instrument;
  parcelInstruments: Instrument[];      // already parcel-scoped at call-site
  existingReleaseLinks: DocumentLink[]; // all release_of links in the panel
  candidateActions: Record<string, "accepted" | "rejected">;
  onSetCandidateAction: (
    key: string,
    action: "accepted" | "rejected",
  ) => void;
  onOpenDocument: (instrumentNumber: string) => void;
}
```

**Render contract:**

- Filter `parcelInstruments` to those whose `document_type` is
  `full_reconveyance` or `partial_reconveyance` → that's the pool.
- Call `selectDisplayCandidates(dot, pool)`.
- Render a header row: `"Candidate releases (matcher ran against N, M above
  threshold)"` — always rendered, even when M = 0.
- If M = 0 and this is HOGUE lc-003 (or any HOGUE-like parcel-local dead
  end), render the moat rationale verbatim:
  > Matcher ran against 0 reconveyances in {subdivision} corpus. Note: the
  > public API cannot search for releases filed against {owner} outside this
  > parcel. A county-internal full-name scan closes this gap — out of
  > prototype scope.
  The `{subdivision}` / `{owner}` slots come from the parcel, not the
  lifecycle. (The component takes the parcel as a prop too — adding to the
  Props shape above.)
- For each candidate in `aboveThreshold`, render a row:
  - Instrument number, recording date, releasing-party name
    (`getReleasingParties`), link to Proof Drawer via `onOpenDocument`.
  - Overall score to 2 decimals.
  - Three sub-feature bars, pitch-labeled: **"Party name match"**,
    **"Date proximity"**, **"Legal description match"**, each with its
    numeric value to 2 decimals.
  - If the candidate's instrument number appears in `existingReleaseLinks`
    as the `source_instrument` of a `release_of` link with
    `examiner_action="accepted"` for *another* lifecycle → render an amber
    "Already linked to lc-XXX" chip; Accept disabled with tooltip `"This
    reconveyance is already accepted for another lifecycle. Releases are
    1:1 with DOTs."`; Reject enabled.
  - Accept + Reject buttons. Current-state styling follows the existing
    `linkActions` button pattern.
  - Rejected rows stay visible, grayed out (opacity 50%), with a small
    "rejected" badge. Auditable rejection trail.

### 4.4 Integration into `EncumbranceLifecycle.tsx`

Changes confined to this file:

1. Accept two new props: `candidateActions` and `onSetCandidateAction`
   (parallel to `linkActions` / `onSetLinkAction`).
2. Derive a `syntheticLinks: DocumentLink[]` per-lifecycle from
   `candidateActions`: for each `{lifecycleId, candidateInstrumentNumber}`
   entry whose action is `"accepted"`, materialize a `DocumentLink` with:
   ```
   id: `synthetic-${lifecycleId}-${candidateInstrumentNumber}`
   source_instrument: candidateInstrumentNumber
   target_instrument: rootInst.instrument_number
   link_type: "release_of"
   provenance: "algorithmic"
   confidence: <matcher score, computed on demand>
   examiner_action: "accepted"
   ```
3. Fold `syntheticLinks` into the existing `releaseLinks` pipeline so
   `computeLifecycleStatus` sees them and naturally flips the lifecycle to
   `released`. Rationale string is overridden at the panel level with
   `"Accepted via release-candidate matcher, score=X.XX"` — carried as a
   lifecycle-level map parallel to `candidateActions`.
4. Render the new `<CandidateReleasesPanel />` between the MERS annotation
   and the child-instrument list, but only when
   `effectiveStatus === "open" || effectiveStatus === "unresolved"` AND
   there are no accepted synthetic children (once accepted, the synthetic
   link renders as a normal child row and the candidate panel collapses —
   clean one-shot demo beat).
5. Accept side-effect on rationale: a separate synthetic rationale string
   is derived when any candidate action is `"accepted"` for this lifecycle
   and passed through `resolveLifecycleStatus`'s override path — OR, more
   cleanly, computed directly and shown in place of
   `resolved.status_rationale` when a synthetic link exists for this
   lifecycle. (Implementation picks the simpler path; tests drive the
   decision.)

**Important:** `App.tsx` wiring (adding `candidateActions` state + handler)
is **out of this spec's scope** per the parallel-agent touch-surface
constraint. We will expose the new props on `EncumbranceLifecycle` with
sensible defaults (empty record + no-op handler) so the component still
works when the parent doesn't wire them. The demo will have to live with
that OR the user will need to grant permission to edit `App.tsx` as a
follow-up.

**Scope escalation:** if defaults-only rendering produces a demo where
accept never actually fires because `App.tsx` doesn't own the state, I
STOP and report before touching `App.tsx`.

### 4.5 Data-flow diagram

```
EncumbranceLifecycle
  └─ (per lifecycle) selectDisplayCandidates(dot, reconveyancePool)
       ├─ ranked         ─▶ CandidateReleasesPanel rows
       └─ total/above    ─▶ header "ran against N, M above threshold"
  └─ (per lifecycle) derive syntheticLinks from candidateActions["accepted"]
       └─ merged with real releaseLinks ─▶ computeLifecycleStatus
            └─ effectiveStatus = released (when an accept is present)
```

## 5. Testing plan

Tests land in `tests/candidate-release-glue.test.ts` (new) plus additive
cases in `tests/release-candidate-matcher.test.ts`. TDD order — write in this
sequence, each red before green:

1. **Hero test (red first):** lc-002 (POPHAM 2021 DOT) sees `20210075858` as
   a candidate with the `already_linked_to: "lc-001"` flag. Accept is
   disabled (capability bit in the glue output). Reject, when applied, flips
   the candidate to `rejected` and does NOT touch lc-001's existing link.
2. **HOGUE empty-state test:** lc-003 renders with matcher-total=0,
   above-threshold=0, empty rationale string matches the moat template
   (subdivision + owner + "county-internal full-name scan" substring), zero
   candidate rows.
3. **Accept-path test:** given a synthetic pool (not bound to the real
   corpus) where a fresh candidate scores above threshold, calling the
   accept action:
   - produces a `DocumentLink` with `provenance="algorithmic"`,
     `confidence` equal to the matcher score (within 1e-9),
     `examiner_action="accepted"`,
     `source_instrument=candidate.instrument_number`,
     `target_instrument=dot.instrument_number`,
     `link_type="release_of"`.
   - lifecycle rationale becomes `"Accepted via release-candidate matcher,
     score=0.XX"` with score to 2 decimals.
   - effective status resolves to `"released"`.
4. **Sub-threshold filter test:** a pool of 2 reconveyances where 1 scores
   above threshold and 1 scores below. Header reports `"ran against 2, 1
   above threshold"`. Only the above-threshold row is rendered; below-
   threshold candidate must NOT appear in `aboveThreshold`.
5. **Threshold-constant test:** `CANDIDATE_DISPLAY_THRESHOLD === 0.25`
   exported from the matcher module. Guards against accidental drift.
6. **Schema test:** `ProvenanceKind.parse("algorithmic")` succeeds;
   parsing a `DocumentLink` with `provenance="algorithmic"` succeeds.

Existing 108 tests across 12 files must remain green. No tests are
disabled or skipped.

## 6. Decision #36 (to be added to CLAUDE.md)

```
| 36 | Candidate pool is parcel-local in the prototype | A real missing
release could live in an unrelated parcel's corpus if our parcel attribution
was wrong. Cross-parcel search with strong guards is production scope, not
prototype. Same family as Decisions #15 (name entity resolution mention-
only) and #16 (data freshness mention-only). | 2026-04-14 |
```

## 7. Done criteria (repeated from prompt, with spec numbers)

- [ ] For any OPEN lifecycle with a plausible release candidate in the same
  parcel corpus (§4.3 threshold logic), UI shows top-3 candidates ranked
  by score.
- [ ] Each row has Accept / Reject. Accept writes a synthetic link with
  `provenance="algorithmic"` and `confidence = score`, flips rationale to
  `"Accepted via release-candidate matcher, score=X.XX"`, and moves the
  lifecycle to `released` (§4.4 step 2–3).
- [ ] Candidate list derived live from `rankReleaseCandidates` on parcel
  corpus — no hardcoded list (§4.3).
- [ ] `npm run build` and `npm run test` green.
- [ ] `docs/demo-script.md` beat 7 updated or new beat inserted showing
  the matcher in action.
- [ ] Decision #36 appended to CLAUDE.md.
- [ ] Report: which lifecycle(s) show candidates, top score, 0 tests
  disabled.

## 8. Implementation order (for the TDD session)

1. Add `"algorithmic"` to `ProvenanceKind` in `src/schemas.ts`. Run tests.
   Expect green.
2. Write failing hero test (#1 above). Red.
3. Add `CANDIDATE_DISPLAY_THRESHOLD` + `selectDisplayCandidates` +
   `alreadyLinkedLifecycle(candidate, existingLinks)` helper to the matcher
   module. Green.
4. Write failing HOGUE empty-state test. Red.
5. Green it via the glue module's rationale-text helper
   `buildEmptyStateRationale(parcel)`.
6. Write failing accept-path test. Red.
7. Green it via a pure helper `synthesizeAlgorithmicLink({dotInstrument,
   candidate, score})` and
   `buildAcceptedRationale(score)`.
8. Write failing sub-threshold filter test. Red → green via existing
   `selectDisplayCandidates` (write test last to sanity-check).
9. Write threshold-constant and schema tests. Green immediately.
10. Build `CandidateReleasesPanel.tsx` using the now-tested helpers.
11. Wire into `EncumbranceLifecycle.tsx` with default-empty props.
12. If the demo shows candidates but Accept is a no-op because
    `App.tsx` doesn't thread the state → STOP and report.
13. Update `docs/demo-script.md` beat 7.
14. Run `npm run build` + `npm run test`. Confirm 0 disabled.
15. Report the required summary (lifecycles / top score / test disabled
    count).

## 9. Risks and mitigations

- **Risk:** `App.tsx` wiring is out of scope → Accept does nothing visible.
  **Mitigation:** stop-and-report rule in §4.4. Also: core value of the
  feature (the panel *displaying* live matcher output, with feature bars)
  lands regardless of whether Accept is wired — that alone addresses the
  "AI turns passive records into linked work" claim in demonstration form.
  Accept-flips-to-released is a demo bonus.
- **Risk:** schema change breaks existing JSON parsing.
  **Mitigation:** additive enum member, no fixtures use it today; tests
  prove green after change.
- **Risk:** matcher runs on every render, measurable cost.
  **Mitigation:** `useMemo` in the panel keyed on `dot.instrument_number`
  + pool identity. Matcher is O(n) on a ≤5-instrument corpus — trivial.
- **Risk:** synthetic-link ID collides with a real link ID.
  **Mitigation:** `synthetic-${lifecycleId}-${candidateInstrumentNumber}`
  prefix namespace; existing link IDs are `link-001`-style.

---

**Self-review notes:** no placeholders; §4.4 step 5 explicitly acknowledges
two implementation paths and defers to the tests — consistent with TDD
ordering in §8. Scope is sized for a single plan. The App.tsx-wiring risk
is called out as a stop-and-report in §4.4 and §9 consistently.
