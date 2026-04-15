# Known Gaps

A numbered list of things the prototype does not do, why that's
acceptable for the pitch, and what a production version would do. No
gap here is a secret — each one is surfaced on stage at the appropriate
beat (see `docs/demo-script.md`).

---

1. **HOGUE corpus is purchase-only.**
   - *What's missing:* HOGUE parcel `304-77-689` has only the 2015-07-17
     warranty deed (20150516729) and same-day DOT (20150516730) in the
     corpus. No post-2015 activity is curated.
   - *Why that's OK for this pitch:* HOGUE is the honest
     counter-example. Its lifecycle `lc-003` in
     `src/data/lifecycles.json` is marked **open** with a stated
     rationale that names the API limitation — the pitch *needs* a
     parcel where the moat argument lands harder than POPHAM's clean
     release.
   - *What production would do:* the county-side pipeline has access
     to the full index — a name-filtered search across Jason/Michele
     Hogue's entire recorded history would run server-side and either
     surface a missed release or confirm the DOT is still open through
     the verified-through date.

2. **Name-based release search is not automated.**
   - *What's missing:* The Maricopa public API (`publicapi.recorder.maricopa.gov`)
     does not support name-filtered document search. The prototype
     cannot say "show me every instrument where Jason Hogue is a party"
     at query time.
   - *Why that's OK for this pitch:* the API limitation *is* the moat
     argument (Decision #3's rationale, Decision #16's mention-only
     framing). Manual curation stands in for what a county-internal
     full-index scan would do.
   - *What production would do:* run against the county's internal
     full-name index, which the custodian owns.

3. **Extraction runs offline (hybrid replay), not at-click.**
   - *What's missing:* Clicking "AI Extraction" in the Proof Drawer
     reads a pre-computed trace file (`src/data/extraction-traces/*.trace.json`),
     not a live Tesseract invocation.
   - *Why that's OK for this pitch:* hybrid replay is the
     audit-friendly posture — the trace records the engine version,
     timestamp, and raw per-page OCR text verbatim. A live re-run would
     demonstrate Tesseract latency, not our pipeline. See
     `docs/risks-and-fallbacks.md` R3.
   - *What production would do:* run OCR once at ingest time, store
     the trace as the audit log for every extracted field, and serve
     the trace + snippet on demand.

4. **Two parcels, not two thousand — intentional.**
   - *What's missing:* POPHAM (`304-78-386`) and HOGUE (`304-77-689`)
     are the only curated parcels. A third parcel would require the
     same pipeline to be re-run.
   - *Why that's OK for this pitch:* the hard constraint was 1 primary
     + 1 backup parcel in a 2-day build window. The pipeline
     generalizes; the UI for a third parcel would look identical.
   - *What production would do:* run the pipeline at ingest, once per
     instrument, and serve the curated result from a county-owned
     warehouse.

5. **Confidence scores are hand-assigned except for OCR-derived fields.**
   - *What's missing:* Model-based confidence estimation. Every
     `confidence` value in `src/data/instruments/*.json` was written by a
     curator, not computed. The four real-OCR extractions in
     `src/data/extraction-traces/20130183449.trace.json` (confidences 0.88,
     0.92, 0.82, 0.80) are the only exception.
   - *Why that's OK for this pitch:* Decision #17 — confidence
     modeling was explicitly out of scope for the prototype. The *shape*
     of the UI (per-field confidence next to per-field provenance) is
     the contribution; the numeric generator behind it is a follow-on.
   - *What production would do:* per-field confidence from the
     extraction model (OCR character-level confidence for OCR fields,
     task-specific models for entity resolution, calibrated scoring for
     release matching).

6. **OCR misreads like Lot 65 vs Lot 46 are demo evidence, not bugs.**
   - *What's missing:* An automated reconciliation layer that catches
     "page 1 says Lot 65, page 3 says Lot 687, curator says Lot 46"
     and flags it for human review.
   - *Why that's OK for this pitch:* this is the *live evidence* for
     why the three-tier provenance UI exists. Hiding the discrepancy
     would weaken the pitch. The demo calls it out explicitly (see
     `docs/demo-script.md` beat 9).
   - *What production would do:* cross-page agreement scoring on
     repeated fields, with a confidence penalty when readings disagree
     and an automatic human-review queue above a threshold.

7. **No APN ↔ recorder bidirectional bridge in Maricopa.**
   - *What's missing:* Maricopa's recorder system does not store APN
     references on instruments (Decision #21). The prototype hand-maps
     each instrument to a parcel via `src/data/parcels.json`'s
     `instrument_numbers[]` lists.
   - *Why that's OK for this pitch:* this *is* the moat moment.
     Decision #21: "prototype fixes this gap." We're showing the gap,
     and the fix.
   - *What production would do:* maintain the bidirectional index as
     a county-side asset and serve it at query time — something a
     downstream title plant cannot do authoritatively.

8. **DOT party roles require doc-type heuristics + OCR fallback.**
   - *What's missing:* Automated grantor/grantee and
     trustor/trustee/lender/beneficiary role assignment. The public
     API's `names[]` is a flat list ordered alphabetically, not by role
     (Decision #29).
   - *Why that's OK for this pitch:* the prototype hand-curates roles
     for 7 instruments. The demo says this explicitly in the "what I
     will NOT click" section of `docs/demo-script.md`.
   - *What production would do:* document-type-specific heuristics
     (e.g., on a DEED TRST, the individual in `names[]` is the
     borrower, the institutional name is the lender) plus OCR fallback
     on the PDF body for edge cases.

9. ~~**Same-day transaction linking is asserted, not inferred.**~~
   > **Closed in S5** — `src/logic/same-day-group-inferrer.ts` via commit on `claude/keen-bassi`.
   - *What's missing:* An automated "these two instruments are part of
     a single transaction" signal. The prototype sets `same_day_group`
     by hand in each instrument JSON.
   - *Why that's OK for this pitch:* Decision #27 states the rule
     ("same-day recording number groups are linked transactions"). The
     UI surfaces the rule; the data commits to it.
   - *What production would do:* group candidate instruments by
     recording date + parcel-keyed parties and emit `same_day_group`
     at ingest time. The rule is simple enough that a production
     implementation is not a research project — it just wasn't inside
     the 2-day build.

10. **Lifecycle status is a curated assertion.**
    - *What's missing:* Automated lifecycle state inference (open /
      released / assigned). The three lifecycles in
      `src/data/lifecycles.json` have hand-written `status_rationale`
      strings.
    - *Why that's OK for this pitch:* the rationale string is the
      feature — it's the part a title plant cannot reproduce because
      it requires custody + a stated verified-through date. The
      wrapping UI and the rationale-string contract are the prototype
      contribution.
    - *What production would do:* run the release-candidate matcher
      (`src/logic/release-candidate-matcher.ts`) at scale, surface
      candidate releases to a curator for high-stakes lifecycles, and
      default to a machine-emitted rationale string that cites the
      candidate score.

11. **HOGUE OCR trace has `trust_name: null` and that's honest.**
    - *What's missing:* A trust_name extraction on the HOGUE warranty
      deed.
    - *Why that's OK for this pitch:* HOGUE's 2015 deed is
      individual-to-individual — no trust was present to extract. The
      trace at `src/data/extraction-traces/20150516729.trace.json` records
      `trust_name: null` rather than fabricating. This is the right
      behavior for an audit log.
    - *What production would do:* exactly what we do — report null
      when the field isn't present, never guess.

12. **No cross-county search, intake, payments, or internal-ops UIs.**
    - *What's missing:* Every surface outside the four mandatory
      screens (Search, Chain, Encumbrance, Proof Drawer).
    - *Why that's OK for this pitch:* CLAUDE.md Hard Constraints
      "Out of scope" bullet + Decision #11 (4-screen firm commitment).
    - *What production would do:* those are separate product surfaces.
      The pitch is for the *examiner* surface only.

13. **The 272-doc-type Maricopa vocabulary is represented by ~4
    types in the corpus.**
    - *What's missing:* Our 7 instruments cover `WAR DEED`, `DEED TRST`,
      `REL D/T`, and bundled `AF DISCLS`. The other 268 codes in the
      Maricopa taxonomy aren't in the corpus.
    - *Why that's OK for this pitch:* residential examiner workflow
      concentrates in the deed / DOT / release family. The four
      document types we cover are the ones an examiner touches most.
    - *What production would do:* the pipeline is vocabulary-driven;
      adding support for additional codes is a lexicon update, not a
      re-architecture.

14. ~~**Examiner actions are session-only — no write-back to
    `src/data/links.json`.**~~
    > **Closed in S5** — `src/hooks/useExaminerActions.ts` via commit on `claude/keen-bassi`.
    - *What's missing:* Accept / Reject on a candidate release, accept
      / reject / unresolved on an existing link, and lifecycle-status
      override all live in React `useState` (see
      `src/components/EncumbranceLifecycle.tsx` for the candidate
      handler and `src/hooks/useExaminerActions.ts` for link and
      lifecycle actions). A full browser reload resets them. The
      prototype is a static Vite SPA — no API, no localStorage write.
    - *Why that's OK for this pitch:* Decision #16 framed live sync as
      mention-only; Decision #36 noted that server-side features are
      stubbed in the prototype. The demo flow accepts a candidate, the
      lifecycle status flips live, and the synthesized algorithmic
      DocumentLink is rendered with `provenance="algorithmic"` and the
      matcher score as `confidence` — that proves the *shape* of the
      end-to-end loop. Persistence is the production bolt-on, not the
      contribution.
    - *What production would do:* every examiner action posts to a
      county-side service that appends an audit row (who, when, why,
      with the matcher score and feature breakdown captured at the
      moment of acceptance) and merges the new link into the canonical
      links table. The UI re-reads from the same authoritative store.

15. **Linked lifecycles have no examiner-unlink action.**
    - *What's missing:* Accepting a candidate on an open lifecycle
      creates an in-memory link (gap #14), but rejecting or unlinking
      a *curated* link — one whose `status` is `linked` because it came
      from `src/data/links.json` — is not wired into the UI. There is
      no "dispute this link" or "unlink" control on a released
      lifecycle.
    - *Why that's OK for this pitch:* curated links represent the
      county's indexed record. Disputing one is a QA workflow, not an
      inline examiner action. Treating Accept (curation in progress)
      and Unlink (challenging the curated record) as the same control
      would muddle the trust model the demo is built on. The
      already-linked release renders the same matcher feature bars as
      a freshly-accepted candidate (see
      `src/components/LinkEvidenceBars.tsx`), so the *evidence* for
      the link is visible — just not a one-click revocation.
    - *What production would do:* route unlink requests through a
      review queue with an audit trail and a second-examiner sign-off,
      not an inline button. The prototype documents this as a feature
      of the curation discipline, not an omission.

16. ~~**Schedule B-I (Requirements) is not generated.**~~
    > **Partially addressed in S5** — Schedule B-I rendering was implemented in `src/logic/commitment-pdf.ts` but remains transaction-input-scoped (not auto-generated on export without a wizard step).
    - *What's missing:* The exported commitment PDF emits Schedule A
      and Schedule B-II only. There is no Schedule B-I (Requirements)
      section.
    - *Why that's OK for this pitch:* B-I items are
      transaction-scoped — payoff statements, satisfactions, curative
      affidavits — generated when a closing opens against a specific
      buyer, lender, and effective date. None of those inputs are part
      of the recorded corpus. A fabricated B-I section would dilute
      every other honest gap surfaced on stage (HOGUE empty state,
      MERS note, hunt log). The PDF header note states this verbatim,
      and each open Schedule B-II row carries a `Closing impact:`
      sentence (sourced from `src/data/closing-impact-templates.json`,
      reviewed per the rule documented in
      `src/data/closing-impact-templates.README.md`) explaining what a
      B-I item *would* require if a transaction were opened.
    - *What production would do:* generate B-I when a closing file is
      opened against the parcel — payoff requests for open DOTs,
      satisfaction lookups for any unreleased assignments, curative
      requirements derived from chain anomalies. Every B-I item
      depends on transaction inputs (effective date, buyer, lender,
      title agent) that this prototype does not model.

17. ~~**Encumbrance panel lifecycle header hardcodes "DOT:" and "Deed of Trust" labels.**~~
    > **Closed in S5** — `src/components/EncumbranceLifecycle.tsx` via commit on `claude/keen-bassi`.
    - *What's missing:* `src/components/EncumbranceLifecycle.tsx`
      renders the lifecycle header and subheader with `DOT: <number>`
      and `Deed of Trust` strings that were hardcoded when all
      lifecycles were deeds of trust (lc-001 through lc-003).
      LC-004 introduced a subdivision plat as a root instrument; the
      component still labels it as a DOT.
    - *Why that's OK for this pitch:* the data model and the
      commitment-export PDF both resolve the type correctly — the
      mislabel is confined to one on-screen header in one component.
      The exported abstract (the document an examiner would actually
      hand off) is correct.
    - *What production would do:* a pure UI-side label lookup driven
      by `instrument.document_type` / `document_type_raw`, mirroring
      the resolution that already lives on the PDF side. Out of
      scope for the commitment-export branch because the component
      was not modified there; tracked here so the next branch
      touching `EncumbranceLifecycle.tsx` can fix it cleanly.

18. ~~**Provenance vocabulary drift between UI and PDF.**~~
    > **Closed in S5** — `src/logic/provenance-vocab.ts` via commit on `claude/keen-bassi`.
    - *What's missing:* The Proof Drawer renders provenance as
      confidence percentages (`"County API 100%"`, `"OCR 97%"`,
      `"Hand-Curated 100%"`, `"Matcher 88%"`); the exported
      commitment PDF renders provenance as category tags in
      parentheses (`"(api)"`, `"(ocr, 0.97)"`, `"(manual)"`,
      `"(algo, 0.88)"`). Both are correct in isolation but an
      examiner comparing the two artifacts side-by-side sees
      superficially different vocabularies.
    - *Why that's OK for this pitch:* alignment is a narrative +
      minor UI tweak, not a data fix. Each surface is internally
      consistent and traces to the same underlying provenance enum.
      The disintermediation argument the demo carries is unaffected
      — both surfaces cite the same source — but the moat-narrative
      pass should land on a single vocabulary the examiner sees on
      both screen and paper.
    - *What production would do:* one shared formatter feeding both
      the on-screen badge component (`src/components/ProvenanceTag.tsx`)
      and the PDF inline tag (`src/logic/format-provenance-tag.ts`).
      Owned by Terminal 4 in the moat-narrative pass — surfaced here
      as concrete evidence of where surface alignment breaks today.

19. ~~**`formatProvenanceTag` silently coerces unknown values to "algo".**~~
    > **Closed in S5** — `src/logic/format-provenance-tag.ts` via commit on `claude/keen-bassi`.
    - *What's missing:* `src/logic/format-provenance-tag.ts` uses a
      non-exhaustive ternary that defaults anything not explicitly
      matched to `"algo"`. A future provenance type added to the
      Zod enum (e.g. `ai_extraction`, already discussed in CLAUDE.md
      Decision #20) would silently mis-tag in every exported
      commitment PDF instead of failing loudly at compile time.
    - *Why that's OK for this pitch:* the current enum is closed
      and every member is correctly handled. The bug is latent —
      it only fires the moment the enum grows, and the test suite
      would still pass because no test exercises the unknown-value
      path. Demo unaffected.
    - *What production would do:* exhaustive `switch` over the
      provenance enum with a `: never` default branch, so adding a
      new provenance value forces the formatter to grow alongside
      the schema. Standalone follow-up task; not blocked on
      Terminal 4.
