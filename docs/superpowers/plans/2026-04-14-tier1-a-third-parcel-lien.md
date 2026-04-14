# Tier 1-A: Third Parcel with Federal Tax Lien Lifecycle

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third curated parcel whose corpus includes a federal IRS tax lien and its release, extending demo depth into a new encumbrance family (beyond the deed/DOT/release pattern that covers POPHAM and HOGUE today).

**Architecture:** Data-only extension. Everything lands under `src/data/`, `data/raw/R-004/`, and `tests/*.test.ts`. Schema already accommodates the new encumbrance type via `document_type: "other"` + a truthful `document_type_raw` ("FED TAX LIEN"/"REL FED TAX LIEN"), matching the pattern the existing corpus uses for UCC terminations. The release-candidate matcher is content-agnostic — if the release instrument exposes a legal description and a releasing party, the scorer runs against a new lifecycle family without code changes.

**Tech Stack:** Existing Zod schemas (`src/schemas.ts`), `scripts/run-extraction.py` Tesseract pipeline, `scripts/validate-corpus.ts` integrity checker, Vitest for `tests/*.test.ts`, Maricopa public REST API (`https://publicapi.recorder.maricopa.gov`).

---

## Worktree Context

- **Worktree path:** `C:\Users\Klaus\projects\county-recorder-sprint\.claude\worktrees\tier1-a`
- **Branch:** `tier1-a`
- **Parallel-agent file rule:** modify only `src/data/**`, `data/raw/**`, and `tests/*.test.ts`. If a task seems to require editing `src/components/**`, `src/logic/**`, `src/App.tsx`, or `src/schemas.ts`, **STOP and report**.
- **Lien-type precedence:** federal IRS tax lien primary; mechanics' lien fallback. Fallback triggers if the 45-minute parcel hunt (Task 1) fails to surface a qualifying candidate. On fallback, augmenting POPHAM or HOGUE with a mechanics' lien is acceptable per the user's amendment — log the decision in `CLAUDE.md` (Task 9).
- **Matcher-score contract:** the release-candidate matcher (`src/logic/release-candidate-matcher.ts`) must return score ≥ 0.7 for the new lien→release pair without hand-wiring. Task 7 verifies this.

---

## File Map

**New files:**
- `data/raw/R-004/metadata/{recordingNumber}.json` — cached `GET /documents/{id}` responses (one per curated instrument, 4+).
- `data/raw/R-004/pdfs/{recordingNumber}.pdf` — full-document PDFs served locally by the app at `/raw/R-004/pdfs/…`.
- `data/raw/R-004/hunt-log.md` — parcel-hunt audit trail: APNs checked, API queries issued, why each candidate was kept or dropped. Evidence for Decision #36/37 (Task 9).
- `src/data/instruments/{recordingNumber}.json` — 4+ curated instruments. Minimum set: purchase deed, financing DOT, the lien, the release. One additional instrument (e.g., refi DOT, reconveyance of the refi, or a second lien) to hit the ≥4 target.
- `src/data/extraction-traces/{recordingNumber}.trace.json` — real Tesseract run for at least one of the new instruments (preferred: the lien or its release, so the matcher draws from OCR-derived fields, not hand-typed ones).

**Modified files:**
- `src/data/parcels.json` — append third parcel.
- `src/data/lifecycles.json` — append lien lifecycle (`lc-004`) and any additional DOT lifecycle the new corpus implies.
- `src/data/links.json` — append `release_of` link for lien→release, plus any `same_day_transaction` links for same-day groups.
- `CLAUDE.md` — append decision-log rows for parcel selection, lien-type outcome, and matcher-score outcome.
- `docs/demo-script.md` — insert a beat that walks the new lien lifecycle.
- `tests/search.test.ts`, `tests/chain-builder.test.ts`, `tests/lifecycle-status.test.ts`, `tests/release-candidate-matcher.test.ts` — extend fixtures and add cases covering the new parcel and lifecycle.

**Files NOT to touch (parallel-agent constraint):**
- `src/schemas.ts`, `src/logic/**`, `src/components/**`, `src/App.tsx`, `src/dataLoader.ts` (if present), `src/main.tsx`, `src/index.css`, `vite.config.ts`, `package.json`, `tsconfig*.json`.

---

## Risk Register

**R1 — Matcher score below 0.7 with FED TAX LIEN.** Federal tax liens (IRS Form 668-Y/C) and their releases (Form 668-Z) routinely omit parcel legal descriptions. In the matcher's three-feature mean, `legalDescOverlap` will then be 0, capping score at `(partyNameSim + dateProximity) / 3 ≤ 0.66`. Mitigations, in priority order:
1. During the hunt (Task 1), prefer liens whose release PDF does include a property reference (some releases cite "the real property located at <address>").
2. If the release includes even a street address or subdivision fragment, populate `legal_description` from OCR on the release and ensure the DOT/deed side is populated too so `jaccard` has shared tokens.
3. If step 2 still yields score < 0.7 on the FED TAX LIEN, auto-flip to mechanics' lien (per user amendment). Mechanics' liens statutorily require a legal description, so `legalDescOverlap` will carry weight.
4. If the flip still doesn't clear 0.7, document the residual gap in `docs/known-gaps.md` and `CLAUDE.md` rather than hand-tuning the scorer.

**R2 — Document-type enum limits.** `src/schemas.ts` DocumentType enum does not include `federal_tax_lien`, `release_of_federal_tax_lien`, or `mechanics_lien`. Per the parallel-agent rule, this file is off-limits. Workaround: use `document_type: "other"` and carry the true code in `document_type_raw` ("FED TAX LIEN" etc.). This matches how the existing corpus represents `T FIN ST` today is handled (via `ucc_termination` which *is* in the enum — but "other" is the documented escape hatch per the schema).

**R3 — Matcher can't find the link unless both instruments surface in a shared candidate pool.** Task 7's test must construct the candidate pool the way the real matcher-wiring agent (tier1-b) will: filter candidates by document type = full_reconveyance OR "other"/REL FED TAX LIEN pattern OR by an expanded predicate. Because tier1-b may not have landed yet, Task 7 calls `rankReleaseCandidates` directly with `[newReleaseInstrument, ...unrelatedReleases]` and asserts the target candidate ranks first with score ≥ 0.7.

**R4 — OCR trace emptiness.** The Tesseract rule set in `run-extraction.py` targets deed fields (legal_description, trust_name, deed_date, escrow_number). A FED TAX LIEN PDF will likely miss most of them, producing a trace with `value: null` on three of four fields. That is *honest*, not broken — the existing HOGUE trace does exactly this for `trust_name`. Task 4 explicitly accepts null fields as valid output and references Known Gap #11 in the trace's `notes` string inheritance.

**R5 — Parcel hunt exceeds 45 min.** Hard stop. Task 1 spec embeds the timer and the fallback branch.

---

## Task 1: Parcel Hunt (45-minute timebox, federal tax lien)

**Files:**
- Create: `data/raw/R-004/hunt-log.md`
- Scratch only (no committed code from this task beyond the hunt log).

**Goal:** Identify a Maricopa residential parcel whose recorded instruments include (a) a FED TAX LIEN, (b) a REL FED TAX LIEN for that lien, and (c) a purchase deed recorded 2013–2022 for chain depth.

- [ ] **Step 1: Start the 45-minute timer.** Record start time in `data/raw/R-004/hunt-log.md` (create file if absent). Write header:
```markdown
# R-004 Parcel Hunt Log — Tier 1-A

Start: <ISO timestamp>
Primary target: FED TAX LIEN + REL FED TAX LIEN + 2013–2022 purchase deed
Fallback at T+45min: mechanics' lien (MECH LIEN), may augment POPHAM/HOGUE
```

- [ ] **Step 2: Query Maricopa API by document code.** Use `curl` against `https://publicapi.recorder.maricopa.gov` to find FED TAX LIEN instruments. Undocumented endpoints are listed in `CLAUDE.md` Key Endpoints. If the search endpoint isn't known, fall back to the legacy search UI at `https://recorder.maricopa.gov/recording/document-search-results.html?mode=fullText&docType=FED%20TAX%20LIEN` and scrape recordingNumbers from the listing.

- [ ] **Step 3: For each FED TAX LIEN recordingNumber found, fetch metadata and look for a matching release.** For each lien:
```bash
curl -s "https://publicapi.recorder.maricopa.gov/documents/<lienNumber>" > /tmp/lien.json
# Pull all taxpayer names from the `names[]` array.
# For each name, search REL FED TAX LIEN by name+date.
# A valid pair: lien filed year N, release filed year N+K where K ∈ [0, 8].
```

- [ ] **Step 4: For each lien-with-release pair, cross-reference to a parcel.** The recorder API does not carry APN. Resolution path:
  1. Take the taxpayer name (most common across the pair).
  2. Search assessor: `https://mcassessor.maricopa.gov/mcs/?q=<encoded+name>&mod=nm` or the parcel-by-owner search.
  3. If a residential parcel owned by the taxpayer during 2013–2022 appears, check its deed history for a purchase deed in that window.

- [ ] **Step 5: Log every candidate evaluated (pass or fail) in `hunt-log.md`.** Columns: `lienNumber | releaseNumber | taxpayer | APN | purchaseDeed | decision | reason`. Keep the log honest — a dropped candidate is evidence of curation rigor, not waste. Mirrors R-002 hunt evidence.

- [ ] **Step 6: Stop condition.**
  - If a qualifying `(parcel, lien, release, purchase deed)` quadruple emerges **before T+45min**: record APN and the four recordingNumbers in `hunt-log.md` under `## Selected`. Proceed to Task 2 with federal tax lien as the chosen type.
  - If T+45min passes with no quadruple: append `## Fallback triggered` section to `hunt-log.md` with a one-sentence reason ("no FED TAX LIEN + REL FED TAX LIEN pair tied to a residentially-deeded APN surfaced in the timebox"). Re-scope hunt to mechanics' lien:
    - Priority A: a MECH LIEN + REL MECH LIEN pair tied to a new third parcel (2013–2022 purchase deed).
    - Priority B: a MECH LIEN touching POPHAM (304-78-386) or HOGUE (304-77-689). Release optional — a still-open mechanics' lien is acceptable and aligns with the HOGUE "open lifecycle as moat moment" pattern.
  - Do not spend more than 20 additional minutes on fallback hunting. If fallback also fails, STOP and report back.

- [ ] **Step 7: Commit the hunt log.**
```bash
cd .claude/worktrees/tier1-a
git add data/raw/R-004/hunt-log.md
git commit -m "chore(tier1-a): log parcel hunt evidence for lien lifecycle"
```

---

## Task 2: Download Corpus

**Files:**
- Create: `data/raw/R-004/metadata/<recordingNumber>.json` (one per instrument curated)
- Create: `data/raw/R-004/pdfs/<recordingNumber>.pdf` (one per instrument curated)

**Goal:** Cache every API response and PDF for the ≥4 instruments that will be curated.

- [ ] **Step 1: Determine the set of recordingNumbers to pull.** Minimum 4:
  1. Purchase deed (WAR DEED or equivalent).
  2. Financing DOT tied to purchase deed (same-day group).
  3. The lien (FED TAX LIEN or MECH LIEN).
  4. The release of the lien (REL FED TAX LIEN or REL MECH LIEN). If fallback chose an open lien, substitute a refi DOT or related transaction so the count still reaches 4.

- [ ] **Step 2: Pull metadata for each.**
```bash
for rn in <rn1> <rn2> <rn3> <rn4>; do
  curl -s "https://publicapi.recorder.maricopa.gov/documents/$rn" \
    -o "data/raw/R-004/metadata/$rn.json"
done
```

- [ ] **Step 3: Pull PDFs for each.**
```bash
for rn in <rn1> <rn2> <rn3> <rn4>; do
  curl -sL "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=$rn" \
    -o "data/raw/R-004/pdfs/$rn.pdf"
done
```

- [ ] **Step 4: Verify PDFs are valid.** Open each in a reader (or check first bytes start with `%PDF-`). If any PDF is zero bytes or an HTML error page, rerun and investigate URL encoding / document restrictions.

- [ ] **Step 5: Commit raw corpus.**
```bash
git add data/raw/R-004/metadata data/raw/R-004/pdfs
git commit -m "chore(tier1-a): add R-004 corpus (metadata + PDFs)"
```

---

## Task 3: Run Tesseract Extraction for the Lien (or Release)

**Files:**
- Create: `src/data/extraction-traces/<lienOrReleaseNumber>.trace.json`

**Goal:** Generate a real Tesseract trace for at least one of the new instruments. Preferred target: whichever of {lien, release} includes a property description, so the matcher has an OCR-derived `legal_description` to work with.

- [ ] **Step 1: Run the extraction script.**
```bash
python scripts/run-extraction.py \
  data/raw/R-004/pdfs/<recordingNumber>.pdf \
  <recordingNumber>
```
Expected output: `src/data/extraction-traces/<recordingNumber>.trace.json` with `ocr_engine: "tesseract"`, per-page `raw_text`, and four `extractions` entries (legal_description, trust_name, deed_date, escrow_number). Some will have `value: null` — expected for lien documents (see R4).

- [ ] **Step 2: Inspect the trace for fields worth promoting to the curated instrument JSON.** Candidates: `legal_description.value` (if present), `deed_date.value`. Any value adopted from the trace will carry `provenance: "ocr"` in the curated instrument (Task 4).

- [ ] **Step 3 (optional but preferred): Run the extraction on a second new instrument** (e.g., the purchase deed) to mirror the POPHAM/HOGUE coverage ratio (one trace per parcel at minimum, two at parity).

- [ ] **Step 4: Commit traces.**
```bash
git add src/data/extraction-traces/
git commit -m "feat(tier1-a): add Tesseract trace for <recordingNumber>"
```

---

## Task 4: Curate Instrument JSON Files

**Files:**
- Create: `src/data/instruments/<recordingNumber>.json` × 4+

**Goal:** Produce Phase-3-quality instrument files — schema-valid, party-role-accurate, and provenance-tagged.

Use `src/data/instruments/20130183450.json` as the canonical template (reviewed at Task 4 pre-read).

- [ ] **Step 1: Create the purchase deed JSON.** Fields that matter:
  - `document_type: "warranty_deed"` (or `"grant_deed"` / `"special_warranty_deed"` if the raw code says so).
  - `document_type_raw: "WAR DEED"` (or actual).
  - `parties[]` with `role: "grantor"` / `"grantee"` — derive from API `names[]` + PDF body (see CLAUDE.md Decision #19 — roles are always `manual_entry`).
  - `legal_description` — from the PDF body via OCR or hand-read. Provenance `ocr` if from trace, `manual_entry` if hand-read.
  - `same_day_group: ["<DOT recordingNumber>"]` if same-day with the DOT.
  - `raw_api_response` — copy verbatim from `data/raw/R-004/metadata/<rn>.json`.
  - `source_image_path: "/raw/R-004/pdfs/<rn>.pdf"`.
  - `corpus_boundary_note: "County online records searched through 2026-04-09"`.

- [ ] **Step 2: Create the financing DOT JSON.** Pattern mirrors `20130183450.json`:
  - `document_type: "deed_of_trust"`, `document_type_raw: "DEED TRST"`.
  - `parties[]` — trustor(s), lender, trustee, and `nominee` party if MERS is listed (use `nominee_for: { party_name, party_role: "lender" }` per Rule C of `validate-corpus.ts`).
  - `legal_description` — same subdivision/lot as the purchase deed; reconcile with OCR if both sources differ (surface any discrepancy in `extracted_fields` as a note, mirroring the ZIP-code-note pattern).
  - `same_day_group: ["<purchase deed rn>"]`.
  - `mers_note` — populate only if MERS is actually on the DOT.

- [ ] **Step 3: Create the lien JSON (FED TAX LIEN or MECH LIEN).**
  - `document_type: "other"`.
  - `document_type_raw: "FED TAX LIEN"` (or `"MECH LIEN"` / `"MECHANICS LIEN"`).
  - `parties[]`:
    - **FED TAX LIEN:** taxpayer → `role: "grantor"`, provenance `manual_entry`. "UNITED STATES OF AMERICA" (or "INTERNAL REVENUE SERVICE") → `role: "beneficiary"`, provenance `manual_entry`.
    - **MECH LIEN:** property owner → `role: "grantor"`. Contractor/lienholder → `role: "beneficiary"` (schema has no `lienholder`; `beneficiary` is the closest approximation and is documented in `status_rationale`).
  - `extracted_fields`:
    - `lien_amount` — dollar amount from PDF body, provenance `ocr` (if from trace) or `manual_entry`.
    - `tax_period` (FED TAX LIEN) — e.g., "1040 tax year 2018", provenance `ocr`/`manual_entry`.
    - `irs_form` (FED TAX LIEN) — "Form 668(Y)(c)" typical.
  - `legal_description` — if the lien document references the property, populate with provenance `ocr` (from Task 3 trace) or `manual_entry`. If not, omit (field is optional per schema).
  - `back_references: []` — FED TAX LIENs don't typically cite prior county records.
  - No `same_day_group`.

- [ ] **Step 4: Create the release JSON.**
  - `document_type: "other"`.
  - `document_type_raw: "REL FED TAX LIEN"` (or `"REL MECH LIEN"`).
  - `parties[]`: releasing agency (IRS / contractor) → `role: "releasing_party"`, provenance `manual_entry`. Taxpayer/owner → `role: "grantee"` (receiver-of-release), provenance `manual_entry`.
  - `back_references: ["<lien recordingNumber>"]`. Even though the lien is `document_type: "other"` (not `deed_of_trust` or `heloc_dot`), Rule A of `validate-corpus.ts` only errors when a `full_reconveyance` back-references the wrong target. For a release typed as `"other"`, Rule A does not fire.
  - `legal_description` — populate from the release PDF if it includes a property reference (critical for matcher-score ≥ 0.7; see R1).
  - `extracted_fields`:
    - `released_amount`
    - `irs_form` (e.g., "Form 668(Z)") if FED TAX LIEN
    - `lien_reference` — the original lien recordingNumber as a string, `provenance: "manual_entry"`.

- [ ] **Step 5 (if fewer than 4 instruments so far): Add the 4th instrument.** Preference order, based on what the hunt surfaced:
  1. A refi DOT postdating the lien.
  2. A reconveyance of the purchase DOT.
  3. A second affidavit or modification tied to the chain.

- [ ] **Step 6: Run validator to surface schema errors early.**
```bash
npx tsx scripts/validate-corpus.ts
```
Expected: all new instruments listed under "PASS", Rules A–D pass. If any fail, fix and re-run before committing.

- [ ] **Step 7: Commit instrument JSONs.**
```bash
git add src/data/instruments/
git commit -m "feat(tier1-a): curate <N> instruments for third parcel lien lifecycle"
```

---

## Task 5: Add Parcel, Lifecycles, and Links

**Files:**
- Modify: `src/data/parcels.json`
- Modify: `src/data/lifecycles.json`
- Modify: `src/data/links.json`

- [ ] **Step 1: Append new parcel to `src/data/parcels.json`.** Template:
```json
{
  "apn": "<NNN-NN-NNN>",
  "address": "<address>",
  "city": "<city>",
  "state": "AZ",
  "zip": "<zip>",
  "legal_description": "<full legal description copied from purchase deed>",
  "current_owner": "<SURNAME FIRST / SECOND>",
  "subdivision": "<Subdivision Name>",
  "assessor_url": "https://mcassessor.maricopa.gov/mcs/?q=<apn-no-dashes>&mod=pd",
  "instrument_numbers": [
    "<purchase deed rn>",
    "<DOT rn>",
    "<lien rn>",
    "<release rn>"
  ]
}
```

- [ ] **Step 2: Append lifecycle rows to `src/data/lifecycles.json`.** At minimum, one `lc-004` for the new lien. Template (released case):
```json
{
  "id": "lc-004",
  "root_instrument": "<lien rn>",
  "child_instruments": ["<release rn>"],
  "status": "released",
  "status_rationale": "Lien released by <releasing party> via <release rn> on <release date>. Matcher-computed confidence: <score> (see tests/release-candidate-matcher.test.ts).",
  "examiner_override": null
}
```
If fallback chose an open mechanics' lien, use `"status": "open"` with a rationale mirroring `lc-003`'s honesty.

Additionally, add an `lc-005` for the new parcel's purchase DOT (status depending on whether a reconveyance is in corpus).

- [ ] **Step 3: Append link rows to `src/data/links.json`.**
  - `same_day_transaction` link for the purchase-deed ↔ DOT pair (mirrors link-001, link-004).
  - `release_of` link for release → lien with `provenance: "ocr"` (because legal_description was OCR-derived) and `confidence` equal to the matcher score from Task 7, rounded to two decimals. `examiner_action: "accepted"`.

- [ ] **Step 4: Run validator.**
```bash
npx tsx scripts/validate-corpus.ts
```
Expected: PASS on all rules, parcel list shows 3 entries.

- [ ] **Step 5: Commit.**
```bash
git add src/data/parcels.json src/data/lifecycles.json src/data/links.json
git commit -m "feat(tier1-a): wire third parcel with lien lifecycle"
```

---

## Task 6: Extend Fixture Coverage in Existing Tests

**Files:**
- Modify: `tests/search.test.ts`
- Modify: `tests/chain-builder.test.ts`
- Modify: `tests/lifecycle-status.test.ts`

**Goal:** The existing test suite already exercises POPHAM and HOGUE against real data loaders. Add a case per file that references the new parcel's APN / instruments so the new data is actively covered.

- [ ] **Step 1: Read existing test files in full first.** Confirm loader patterns before adding cases. The data loader scopes by parcel APN — new fixtures go in data files, not in test code.

- [ ] **Step 2: Add to `tests/search.test.ts`:** a case that searches by the new APN and asserts a match. Pattern:
```typescript
it("returns the third parcel when searching by its APN", () => {
  const results = search("<new APN>");
  expect(results.map((r) => r.apn)).toContain("<new APN>");
});
```

- [ ] **Step 3: Add to `tests/chain-builder.test.ts`:** a case that builds the chain for the new parcel and asserts the owner period sequence is correct (1 period if single owner, N periods if multiple).

- [ ] **Step 4: Add to `tests/lifecycle-status.test.ts`:** a case that loads the lien lifecycle (`lc-004`) and asserts its status is `"released"` (or `"open"` in the fallback branch).

- [ ] **Step 5: Run the tests.**
```bash
npm run test
```
Expected: all tests pass. If a test fails, fix the test or fix the curated data — do not disable.

- [ ] **Step 6: Commit.**
```bash
git add tests/
git commit -m "test(tier1-a): extend fixtures to cover third parcel"
```

---

## Task 7: Add Matcher Score Verification Test (≥ 0.7)

**Files:**
- Modify: `tests/release-candidate-matcher.test.ts`

**Goal:** Prove that `rankReleaseCandidates` scores the real new release ≥ 0.7 when passed alongside unrelated distractor candidates, without any code change to the matcher. This is the concrete hand-off contract with agent tier1-b.

- [ ] **Step 1: Read the test file** to mirror the `makeInstrument` helper / real-fixture-load pattern.

- [ ] **Step 2: Add a real-data test block.** The test must load the *actual* lien and release JSON (not a hand-built fixture) so the assertion stands on the curated data, not on a test-only mock.

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { InstrumentFile } from "../src/schemas";
// ...

describe("rankReleaseCandidates — tier1-a lien lifecycle", () => {
  const loadInstrument = (rn: string) => {
    const raw = JSON.parse(
      readFileSync(join("src/data/instruments", `${rn}.json`), "utf8"),
    );
    return InstrumentFile.parse(raw);
  };

  it("ranks the real lien release ≥ 0.7 without hand-wiring", () => {
    const lien = loadInstrument("<lien rn>");
    const release = loadInstrument("<release rn>");
    // Distractors: any unrelated release from the existing corpus
    const distractor = loadInstrument("20210075858"); // POPHAM reconveyance
    const ranked = rankReleaseCandidates(lien, [distractor, release]);
    expect(ranked[0].candidate.instrument_number).toBe("<release rn>");
    expect(ranked[0].score).toBeGreaterThanOrEqual(0.7);
  });
});
```

- [ ] **Step 3: Run the test.**
```bash
npm run test -- release-candidate-matcher
```
Expected: PASS with `score >= 0.7`.

- [ ] **Step 4: If score < 0.7, diagnose and remediate (in order):**
  1. Verify the release's `legal_description.value` is populated and shares tokens with the lien's. If the lien lacks a legal description, populate it from OCR on the lien PDF (Task 3, rerun if needed).
  2. Verify party names are normalized (both sides say "INTERNAL REVENUE SERVICE" rather than one saying "IRS" and the other "UNITED STATES"). Normalize in the curated JSON — the raw API name can be preserved in `raw_api_response.names`, while `parties[].name` reflects the canonical form.
  3. If after (1) and (2) the score remains < 0.7 AND the lien type is federal tax, **auto-flip to mechanics' lien** (Task 1 Step 6). Re-run Tasks 2–6 with the mechanics' candidate.
  4. If mechanics' lien also falls short, log as known gap (Task 9 Step 5), **do not** edit the matcher or weight fudge. The honest gap is the correct outcome.

- [ ] **Step 5: Commit.**
```bash
git add tests/release-candidate-matcher.test.ts
git commit -m "test(tier1-a): verify matcher scores lien release >= 0.7"
```

---

## Task 8: Full Build + Test Verification

**Files:** none directly. Verification step.

- [ ] **Step 1: Run the type check + build.**
```bash
npm run build
```
Expected: Vite build completes with no TypeScript errors. Any error blocks the task.

- [ ] **Step 2: Run the full test suite.**
```bash
npm run test
```
Expected: all tests pass (count should be existing 108 + however many new cases Tasks 6–7 added).

- [ ] **Step 3: Run the corpus validator one more time.**
```bash
npx tsx scripts/validate-corpus.ts
```
Expected: exit 0, all rules pass, 3 parcels listed.

- [ ] **Step 4: Record post-build facts (counts, APN, lien type) for the summary.** Written inline in Task 9 docs.

---

## Task 9: Documentation — Demo Beat + CLAUDE.md + Known Gaps

**Files:**
- Modify: `docs/demo-script.md`
- Modify: `CLAUDE.md`
- Modify (conditional): `docs/known-gaps.md`

- [ ] **Step 1: Read the current `docs/demo-script.md` to locate the right insertion point.** The new beat belongs after the existing POPHAM/HOGUE lifecycle beats and before the closing moat summary. Likely near the "release-matching" or "verified-through" beat.

- [ ] **Step 2: Write the beat.** Structure (roughly 200 words, matching existing beats' tone):
```markdown
### Beat <N>: <FED TAX LIEN | Mechanics' Lien> lifecycle — encumbrance family beyond the DOT

Third parcel APN <apn>. Show the Chain-of-Title timeline with the new
lien instrument sitting alongside the deed and DOT. Click into the
Encumbrance Lifecycle panel — <lien type> is now a first-class
lifecycle, not "out of corpus scope."

The pitch beat: name-indexed title plants routinely miss federal tax
liens because the IRS files them against the taxpayer, not the
property. A county-owned portal running parcel-keyed ingest catches
them deterministically. The release-candidate matcher scores this
specific release at <0.XX> against the lien — same scorer, new
encumbrance family, no code changes.

<If released:> Lifecycle status: `released`. Matcher-derived, not
hand-wired.
<If open:> Lifecycle status: `open`. The moat line from HOGUE applies
here too — a county-internal full-name index would resolve what the
public API cannot.
```

- [ ] **Step 3: Append decision-log rows to `CLAUDE.md`.** Starting from the current highest number (34 based on the existing log) add:
  - Decision #35: parcel selection (APN, owner, rationale).
  - Decision #36: lien type chosen (FED TAX LIEN primary or MECH LIEN fallback) with the reason (matcher score, availability).
  - Decision #37 (conditional): if fallback triggered and POPHAM/HOGUE was augmented rather than a third parcel, record that decision per user amendment.
  - Each row dated `2026-04-14`.

- [ ] **Step 4: Update Active Skill State in `CLAUDE.md`.** Set `Current Phase` to note Tier 1-A shipped; bump the Research Request Tracker with an R-004 row (status COMPLETE, summary "third-parcel lien lifecycle").

- [ ] **Step 5 (conditional): Update `docs/known-gaps.md` if any gap is left.** Only if Task 7 Step 4 landed on "log as known gap" — then add a numbered gap describing the residual shortfall, matching the voice of existing entries.

- [ ] **Step 6: Commit docs.**
```bash
git add docs/demo-script.md CLAUDE.md
# plus docs/known-gaps.md if modified
git commit -m "docs(tier1-a): demo beat + decision log for lien lifecycle"
```

---

## Task 10: Final Summary for User Review

**Files:** none. Terminal output only.

- [ ] **Step 1: Print the three-line summary specified in the user request:**
```
Chosen parcel APN: <apn>
Chosen lien/easement type: <FED TAX LIEN | MECH LIEN>
Count of new instruments curated: <N>
```

- [ ] **Step 2: Stop and wait for user review before merging `tier1-a` to `main`.** Do not run `git merge` or `git push`.

---

## Self-Review Checklist

Run this before handing off to execution.

- [x] **Spec coverage:** every item in `docs/prompt-fit-analysis.md` Tier 1 #1 ("Ship a third parcel with a lien or easement") and the user's done criteria (4+ instruments, real OCR trace, green build+test, new demo beat, tier1-a branch) is mapped to a task.
- [x] **Placeholder scan:** angle-bracket placeholders (`<recordingNumber>`, `<apn>`) are intentional — they resolve during Task 1 parcel hunt. No "TODO", "later", or "TBD" entries in task bodies.
- [x] **Type consistency:** `rankReleaseCandidates` signature matches `src/logic/release-candidate-matcher.ts` exactly. Instrument schema fields match `src/schemas.ts`. Provenance enum uses only `public_api | ocr | manual_entry`.
- [x] **Parallel-agent constraint:** no task touches `src/components/**`, `src/logic/**`, `src/App.tsx`, or `src/schemas.ts`. Document-type enum limitation handled via `"other"` + `document_type_raw`.
- [x] **Matcher-score contract (≥ 0.7):** Task 7 verifies; R1 + Task 1 Step 6 + Task 7 Step 4 provide three layers of fallback (populate legal description → flip to mechanics' lien → log as known gap).
- [x] **Commit discipline:** each task ends with a commit. No "amend", no force-push. All commits on the `tier1-a` branch in the worktree.
