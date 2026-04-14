# Demo Narrative Rewrite — Tier 1-D, D2

**Status:** Approved 2026-04-14
**Target file:** `docs/demo-script.md`
**Scope:** Pure docs rewrite. No code changes.

---

## Why this rewrite

The current `docs/demo-script.md` opens with the product
("This is the county's own portal..."), then earns measurable-win
credibility ten beats later when Beat 9 surfaces the OCR error.
The 115-interaction research sits in `research/measurable-win.md`
and `research/before-workflow.md` — landing only if a presenter
volunteers it. A cold presenter delivering this script today would
not put the strongest evidence in the first 60 seconds.

The rewrite leads with the pain, pre-commits to the OCR honesty,
and uses inline citations so the presenter sees the source in the
same eye-sweep as the claim.

## Three changes

### Change 1 — New Beat 0: "The number that frames the next six minutes"

Lands before existing Beat 1. Two parts, in order:

1. **The pain number, said cold.** "One residential refinance.
   One parcel — 3674 E Palmer Street, Gilbert.
   115 discrete interactions across three disconnected domains,
   four browser tabs, three separate name searches is what an
   examiner does today to walk the chain. We measured it with an
   instrumented browser session
   [`research/measurable-win.md` L7–L9].
   The next six minutes replace that workflow with one search box
   and a single screen."
2. **The two ground rules, said deadpan.**
   - Every number on stage carries a provenance tag —
     `County API`, `OCR`, `Hand-Curated`, or `Matcher` — with a
     confidence percentage.
   - One slide deliberately shows OCR misreading a lot number on
     a document whose true lot is 46. Not a glitch. The
     credibility check the whole pitch hangs on.

Beat 0 ends. Beat 1 starts on the search box.

### Change 2 — Beat 9 callback to Beat 0

Beat 9's opening line, spoken deadpan, immediately before the
Lot 46/65/687 reveal:

> "Remember the ground rule from minute one — one slide with a
> deliberately mis-OCR'd Lot. This is it. Confidence 92%. The
> system didn't hide the error; it priced it. Every other number
> on the screen carries the same discipline."

No preamble. No setup. The callback lands and the existing Beat 9
content continues immediately. The narrative payoff of the ground-
rules framing only works if Beat 9 closes the loop explicitly.

### Change 3 — Beat 4 provenance-drift callout (gap #18)

The Proof Drawer renders provenance as on-screen color chips
("County API 100%"); the exported commitment PDF renders
provenance as inline parentheticals ("(api)", "(ocr, 0.97)").
An examiner comparing both surfaces sees superficially different
vocabularies. Gap #18 in `docs/known-gaps.md` flags this as
Terminal 4's surface in the moat-narrative pass.

The callout — one paragraph at the end of Beat 4 (the
provenance-aware multi-token search beat), spoken once when the
Proof Drawer first appears later in Beat 8:

> "Two surfaces, two reading modes. The UI renders provenance as
> a color chip because an examiner is scanning a panel at glance.
> The PDF renders provenance as an inline parenthetical because
> the commitment is read line-by-line. Same taxonomy, mode-
> appropriate presentation."

**Two rules for this callout:**

1. Lead with the reading-mode distinction, not the vocabulary
   difference. The reading-mode framing is the substantive answer;
   the vocabulary difference is the symptom.
2. No apologize, explain, or hedge. The single sentence "Same
   taxonomy, mode-appropriate presentation" is the whole defense.
   Any further elaboration sounds like spin. Audience follow-ups
   get answered live, not pre-emptively in the script.

A one-row addition to the "What I will NOT click" table notes the
moat-narrative pass kept both surfaces traceable to the shared
provenance enum — that's the receipt without the apology.

## Inline citations

All measured claims get an inline file:line citation in the same
sentence (footnoted at the bottom of the script forces the
presenter to scroll, inviting them to skip the cite). Mapping:

| Claim | Source |
|-------|--------|
| 115 discrete interactions | `research/measurable-win.md` L7–L9 |
| ~46 clicks (0.4× ratio) | `research/measurable-win.md` L13–L24 |
| 4+ tabs / 3+ search sessions | `research/measurable-win.md` L33–L37 |
| 80–90% click reduction | `research/measurable-win.md` L57 |
| 50% noise rate in name search | `research/before-workflow.md` L68 |
| Three-domain navigation | `research/before-workflow.md` L7 |
| DEED-button-single-document | `research/before-workflow.md` L27 |
| Same-name contamination | `research/before-workflow.md` L33–L39 |
| Role inference fails on DOTs | `research/before-workflow.md` L52–L53 |

## Beat 1 reshape

Beat 1 in the current script opens with the product ("This is the
county's own portal"). Beat 0 now absorbs that role. Beat 1's new
job is the *first real interaction* with the portal — typing a
search that begins to replace the 115-click walk Beat 0 just
named. Beat 1 should not recap Beat 0's promise; it should
demonstrate the first delta.

## Beats 2–11

Structurally intact. Numbers in beats get inline citations. No
content cuts. Existing CLAUDE.md anchors and code-path references
stay verbatim.

## Out of scope

- No changes to `format-provenance-tag.ts` or `ProvenanceTag.tsx`.
  Gap #18 is closed via the demo script's reading-mode framing,
  not via code.
- No changes to existing instrument JSON, lifecycle data, or
  matcher logic.
- No new beats beyond Beat 0. The "ground rules" framing is meant
  to land in 30 seconds, not become a third structural section.

## Review checkpoints (for the implementation plan)

1. After Beat 0 first draft — does the 115-interaction number land
   cold, and does the Lot 46/65/687 foreshadow earn the Beat 9
   payoff?
2. After Beat 9 callback integration — tonal consistency: deadpan,
   not triumphant.
3. After Beat 4 provenance-drift callout — verify against the "no
   apologize / explain / hedge" rule. Lead with reading-mode.
4. Before commit — final read-through for inline citation
   completeness and Beat 1's distinct job vs. Beat 0.

## Commit message

`docs(tier1-d): demo-script rewrite with Beat 0 opener + Beat 9 callback + Beat 4 provenance-drift callout`

Spec + rewritten script committed together.
