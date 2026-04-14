# Demo Narrative Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `docs/demo-script.md` to lead with the 115-interaction pain number, pre-commit to OCR honesty in Beat 0, close the loop in Beat 9, and resolve provenance vocabulary drift (gap #18) inside Beat 4 — all with inline file:line citations.

**Architecture:** Pure docs rewrite. No code, no tests, no data changes. Single file edited (`docs/demo-script.md`); single spec already committed at `docs/superpowers/specs/2026-04-14-demo-narrative-design.md`. Final commit message specified.

**Tech Stack:** Markdown only.

---

## File Structure

- Modify: `docs/demo-script.md` — surgical insertion of Beat 0 before existing Beat 1; surgical edit of Beat 1's opener; one paragraph appended to Beat 4; one sentence prepended to Beat 9; one row added to "What I will NOT click" table; inline citations sprinkled across Beats 1–11.
- Already created: `docs/superpowers/specs/2026-04-14-demo-narrative-design.md` (committed alongside the script).

No tests. No file creation beyond the spec already on disk.

---

### Task 1: Insert Beat 0 — pain number + two ground rules

**Files:**
- Modify: `docs/demo-script.md` — insert new section between line 14 (`---`) and current Beat 1 header (line 16 `## Beat 1 — Open on Search Entry`)

**Why first:** Beat 0 is the keystone change. Drafting it first lets every later task reference its phrasing.

- [ ] **Step 1: Read current `docs/demo-script.md` lines 14–25 to anchor the insertion point**

Use Read tool. Confirm line 14 is `---` and line 16 begins `## Beat 1 — Open on Search Entry`.

- [ ] **Step 2: Insert Beat 0 immediately after line 14**

Use Edit tool. `old_string` is the `---\n\n## Beat 1 — Open on Search Entry` boundary. `new_string` inserts the Beat 0 block before it. Exact content:

```markdown
## Beat 0 — The number that frames the next six minutes

- **Click:** none. Spoken cold before the first browser interaction.
- **Shows:** static title slide or a blank screen — the audience's
  attention is on the speaker, not the portal.
- **Say (the pain, deadpan):**
  > "One residential refinance. One parcel — 3674 E Palmer Street,
  > Gilbert. **115 discrete interactions across three disconnected
  > domains, four browser tabs, three separate name searches** is what
  > an examiner does today to walk the chain. We measured it with an
  > instrumented browser session
  > [`research/measurable-win.md` L7–L9]. The next six minutes replace
  > that workflow with one search box and a single screen."
- **Say (the two ground rules, deadpan):**
  > "Two ground rules before I click anything.
  >
  > One — every number you see on stage carries a provenance tag:
  > `County API`, `OCR`, `Hand-Curated`, or `Matcher`, with a
  > confidence percentage.
  >
  > Two — one slide deliberately shows OCR misreading a lot number on
  > a document whose true lot is 46. That's not a glitch. That's the
  > credibility check the whole pitch hangs on."
- **Why this beat is here:** the strongest evidence in this pitch is
  the measured workflow cost (`research/measurable-win.md`,
  `research/before-workflow.md`) and the OCR honesty discipline. Both
  belong in the first 60 seconds, not buried at Beat 9. The Lot
  46/65/687 reveal in Beat 9 cashes the check this beat writes.
```

- [ ] **Step 3: Verify the file by re-reading lines 14–60**

Use Read tool with offset 14, limit 50. Confirm Beat 0 is present, Beat 1 still follows, no stray indentation or duplicated `---` separators.

- [ ] **Step 4: Self-review against checkpoint 1 (Beat 0 pre-commitment quality)**

Read your own Beat 0 aloud in your head. Two questions:
1. Does the 115 number land in the first sentence with no warm-up?
2. Does the second ground rule foreshadow the Lot 46/65/687 reveal in a way that a presenter could deliver deadpan, not as a tease?

If either fails, revise inline before proceeding.

---

### Task 2: Reshape Beat 1 — first real interaction, not a recap

**Files:**
- Modify: `docs/demo-script.md` — current Beat 1 (lines 16–25 of the original numbering, which after Task 1 will have shifted)

**Why:** Beat 0 absorbs Beat 1's old product-introduction job. Beat 1 must now demonstrate the *first delta* against the 115-click walk.

- [ ] **Step 1: Re-read the (now-shifted) Beat 1 section to anchor the edit**

Use Read tool. Find the `## Beat 1 — Open on Search Entry` heading.

- [ ] **Step 2: Replace Beat 1's `Say:` line**

Use Edit tool to replace the existing Beat 1 `Say:` line. Old:

```
- **Say:** "This is the county's own portal. The landing screen is a single
  parcel-keyed search box — no cross-county federation, no intake forms,
  no payments. That narrow scope is deliberate, and it's what makes the
  custodial moat defensible."
```

New:

```
- **Say:** "Here's the portal. The 115-interaction walk I just named
  starts here in the current Maricopa stack —
  [`research/before-workflow.md` L7] three domains, four tabs, three
  name searches. This screen is one box, and the entire next five
  minutes lives behind it. No cross-county federation, no intake
  forms, no payments. That narrow scope is deliberate — it's what
  makes the custodial moat defensible."
```

- [ ] **Step 3: Verify the edit**

Re-read Beat 1. Confirm the new `Say:` line cites `research/before-workflow.md` L7 inline and references the Beat 0 number ("the 115-interaction walk I just named") so Beat 1 reads as a continuation, not a fresh introduction.

---

### Task 3: Add Beat 4 provenance-drift callout (gap #18 closure)

**Files:**
- Modify: `docs/demo-script.md` — append one paragraph to the existing Beat 4 (`## Beat 4 — Name-variant / multi-token partial match`)

- [ ] **Step 1: Re-read Beat 4 to anchor the insertion**

Use Read tool. Locate the end of Beat 4's `Say:` block (before `## Beat 5`).

- [ ] **Step 2: Append the provenance-drift callout to Beat 4**

Use Edit tool. The `Say:` line currently ends:

```
That owner match is tier 3 in the search priority (see `src/logic/search.ts`) — instrument
  wins if it looks like an 11-digit number, then APN, then address, then
  owner, then subdivision."
```

Append immediately after that closing `"`, inside the same beat (new bullet at the same nesting level):

```
- **Say (the provenance-drift callout, only if the audience has both
  the on-screen badge and the exported PDF in front of them — e.g.,
  during the Proof Drawer in Beat 8 or the Commitment Export hand-off):**
  > "Two surfaces, two reading modes. The UI renders provenance as a
  > color chip because an examiner is scanning a panel at glance. The
  > PDF renders provenance as an inline parenthetical because the
  > commitment is read line-by-line. Same taxonomy, mode-appropriate
  > presentation."
- **Why this callout is here:** Known Gap #18
  (`docs/known-gaps.md`) flagged provenance-vocabulary drift between
  the Proof Drawer chips (`County API 100%`) and the exported PDF
  parentheticals (`(api)`, `(ocr, 0.97)`) as Terminal 4's surface in
  the moat-narrative pass. The callout closes the gap with the
  reading-mode framing — no code change needed. Discipline: deliver
  the one defensive sentence and stop. Audience follow-ups get
  answered live, not pre-emptively in the script.
```

- [ ] **Step 3: Self-review against checkpoint 3 (no apologize / explain / hedge)**

Re-read the inserted callout. Three checks:
1. Does it lead with the **reading-mode distinction**, not the vocabulary difference? It must.
2. Is the substantive defense exactly one sentence ("Same taxonomy, mode-appropriate presentation.")? Anything more is spin.
3. Does the surrounding "Why this callout is here" frame the discipline (one sentence, then stop) without weakening the callout itself? It should brief the presenter on *delivery*, not pad the *defense*.

If any fail, revise inline.

---

### Task 4: Insert Beat 9 callback to Beat 0 ground rule

**Files:**
- Modify: `docs/demo-script.md` — prepend one bullet to Beat 9's `Say:` block

- [ ] **Step 1: Re-read Beat 9 to anchor the insertion**

Use Read tool. Find `## Beat 9 — Honest OCR noise (the Lot 65 / Lot 46 / Lot 687 moment)`.

- [ ] **Step 2: Insert the callback as the FIRST `Say:` line in Beat 9**

Use Edit tool. The current Beat 9 `Say:` line begins:

```
- **Say:** "This is why the provenance and confidence UI exists. OCR read
```

Replace it with two `Say:` bullets, callback first then the existing content:

```
- **Say (the callback to Beat 0, deadpan, no preamble):**
  > "Remember the ground rule from minute one — one slide with a
  > deliberately mis-OCR'd Lot. This is it. Confidence 92%. The
  > system didn't hide the error; it priced it. Every other number
  > on the screen carries the same discipline."
- **Say:** "This is why the provenance and confidence UI exists. OCR read
  `Lot 65` on page 1 and `Lot 687` on page 3. The curated ground truth —
  from visual inspection of the recorded plat reference — is `Lot 46`.
  The trace preserves the raw Tesseract output verbatim. An examiner
  would never trust an AI that hid this. We make it legible: three-tier
  provenance (`public_api` / `ocr` / `manual_entry`), confidence scores,
  and a link back to the source page."
```

- [ ] **Step 3: Self-review against checkpoint 2 (deadpan, not triumphant)**

Re-read the callback. Two checks:
1. Tone: deadpan. No "as promised", no "ta-da", no "I told you so". Just "Remember the ground rule... This is it." Verify.
2. Sequence: the callback lands and the existing Beat 9 explanation continues immediately — there is no transition phrase between them. The callback is the Beat 9 *opener*, not a separate framing aside.

If either fails, revise inline.

---

### Task 5: Add inline citations to numerical claims across Beats 1–11

**Files:**
- Modify: `docs/demo-script.md` — small-edit additions to existing `Say:` lines wherever a measured claim appears

**Why:** Approval-locked direction (a) — citations inline, not footnoted.

- [ ] **Step 1: Scan Beats 1–11 for measured claims**

Use Read tool to walk the file. Flag every claim with a source in `research/measurable-win.md` or `research/before-workflow.md`. Working list (do not invent extras):

| Beat | Claim | Citation to add |
|------|-------|-----------------|
| Beat 1 | (covered in Task 2) | `research/before-workflow.md` L7 |
| Beat 4 (existing copy) | "Examiners don't type recorder-format names" | `research/before-workflow.md` L33–L39 (same-name contamination) |
| Beat 6 | "two separately-recorded scanned PDFs — filed eight years apart" | no research citation needed (data fact) |
| Beat 7 | "Verified through 2026-04-09" | no research citation needed (CLAUDE.md anchor already cited via Decision #12) |
| Beat 7c | hunt-log paragraph | already cites `docs/hunt-log-known-gap-2.md` |
| Beat 10 | "the public API doesn't support name-filtered document search" | `research/before-workflow.md` L33 |

- [ ] **Step 2: Add the Beat 4 citation**

Use Edit tool. Existing copy:

```
"Examiners don't type recorder-format names. `chris ash`
  resolves the same parcel a full formal search would.
```

Edit to:

```
"Examiners don't type recorder-format names. `chris ash`
  resolves the same parcel a full formal search would — and
  removes the same-name-contamination tax that the recorder's
  current name search imposes
  [`research/before-workflow.md` L33–L39].
```

- [ ] **Step 3: Add the Beat 10 citation**

Use Edit tool. Existing copy:

```
"HOGUE is the honest counter-example. We have the 2015 purchase
  and DOT. The lifecycle is marked open *with a stated rationale*: the
  public API doesn't support name-filtered document search, so we cannot
```

Edit to:

```
"HOGUE is the honest counter-example. We have the 2015 purchase
  and DOT. The lifecycle is marked open *with a stated rationale*: the
  public API doesn't support name-filtered document search
  [`research/before-workflow.md` L33], so we cannot
```

- [ ] **Step 4: Verify all five citation patterns are present**

Grep the file for `research/measurable-win.md` and `research/before-workflow.md`. Expected count: ≥5 occurrences across both files.

---

### Task 6: Add the "What I will NOT click" provenance-drift row

**Files:**
- Modify: `docs/demo-script.md` — append one row to the table at the bottom of the file

- [ ] **Step 1: Re-read the bottom-of-file table**

Use Read tool. Locate the `## What I will NOT click, and why` heading and its table.

- [ ] **Step 2: Append the new row immediately after the existing "Dossier screen" row, before any closing paragraph**

Use Edit tool. Insert the new row:

```
| Code-side merge of UI badge ↔ PDF parenthetical formatters | Both surfaces are internally consistent and trace to the same provenance enum + confidence floats. Reading-mode discipline (Beat 4 callout) is the resolution; a shared formatter is a follow-on, not a moat fix. | Known Gaps #18, #19 |
```

- [ ] **Step 3: Verify the table renders**

Re-read the table. Confirm the new row is present, columns align, and the closing paragraph still follows.

---

### Task 7: Final review checkpoint + commit

**Files:**
- Stage: `docs/demo-script.md`, `docs/superpowers/specs/2026-04-14-demo-narrative-design.md`, `docs/superpowers/plans/2026-04-14-demo-narrative.md`

- [ ] **Step 1: Full file read of `docs/demo-script.md`**

Read the entire file end-to-end. Three checks:
1. Beat 0 is the first beat, Beat 1's new opener references Beat 0's 115 number, Beat 9's callback closes the loop.
2. Every `research/*.md` citation has a real line range that exists in the source file. Spot-check at least two.
3. No leftover product-first phrasing in Beat 1 ("This is the county's own portal..." should be gone).

- [ ] **Step 2: Verify spec ↔ script alignment**

Read `docs/superpowers/specs/2026-04-14-demo-narrative-design.md` once more. Confirm every "three changes" item maps to a Beat that now exists. Confirm the "out of scope" list is honored — no edits to `format-provenance-tag.ts` or `ProvenanceTag.tsx`.

- [ ] **Step 3: Run baseline tests to confirm no regressions**

Run: `npm test`
Expected: 138 passed, 1 skipped (the worktree baseline). Should be unchanged because no code was edited.

- [ ] **Step 4: Stage and commit**

```bash
git add docs/demo-script.md docs/superpowers/specs/2026-04-14-demo-narrative-design.md docs/superpowers/plans/2026-04-14-demo-narrative.md
git status
git commit -m "$(cat <<'EOF'
docs(tier1-d): demo-script rewrite with Beat 0 opener + Beat 9 callback + Beat 4 provenance-drift callout

Beat 0 now leads with the 115-interaction measurement
(research/measurable-win.md L7-L9) and pre-commits to the OCR-error
disclosure that lands in Beat 9. Beat 9 opens with a deadpan
callback to that ground rule. Beat 4 absorbs a one-paragraph
provenance-drift callout that resolves Known Gap #18 with a
reading-mode discipline framing — no code change to
format-provenance-tag.ts or ProvenanceTag.tsx.

Inline citations to research/measurable-win.md and
research/before-workflow.md replace footnoted references so the
presenter sees the source in the same eye-sweep as the claim.

Spec: docs/superpowers/specs/2026-04-14-demo-narrative-design.md
Plan: docs/superpowers/plans/2026-04-14-demo-narrative.md

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push the branch**

```bash
git push -u origin feature-moat-narrative
```

- [ ] **Step 6: Stop and report back to the sprint owner before starting D1**

Per the handoff: D2 lands on its own commit before D1's brainstorm starts so any narrative decisions downstream of D2 can inform D1's comparison-table callouts.

---

## Self-Review

**Spec coverage:**
- Change 1 (Beat 0) → Task 1 ✓
- Change 2 (Beat 9 callback) → Task 4 ✓
- Change 3 (Beat 4 provenance-drift callout) → Task 3 ✓
- Inline citations → Tasks 2, 5 ✓
- Beat 1 reshape → Task 2 ✓
- "What I will NOT click" row → Task 6 ✓
- Out-of-scope respect (no code edits) → Task 7 Step 2 verify ✓
- Four review checkpoints → Tasks 1.4, 4.3, 3.3, 7.1 ✓

**Placeholder scan:** No "TBD", no "TODO", no "implement later". Every `Say:` block is verbatim.

**Type/path consistency:** All file paths verified against the worktree baseline. `docs/demo-script.md`, `research/measurable-win.md`, `research/before-workflow.md`, `docs/known-gaps.md`, `docs/superpowers/specs/...`, `docs/superpowers/plans/...` all exist and are spelled identically across tasks.

**Commit message:** Matches the sprint-owner-specified prefix `docs(tier1-d): demo-script rewrite with Beat 0 opener + Beat 9 callback + Beat 4 provenance-drift callout`.
