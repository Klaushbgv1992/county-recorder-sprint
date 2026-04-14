# Risks and Fallbacks

Live-demo risks and the pre-planned fallback for each. Every fallback
here is testable from the current repo — nothing depends on a future
build artifact.

---

## R1: Dev server won't start during the demo

**Primary fallback:** pre-built `dist/` served by any static server.

Before the demo, run `npm run build` once. That produces `dist/index.html`
plus hashed `dist/assets/*.css` and `dist/assets/*.js`. Any static
server will do:

```bash
npx serve dist
# or
python -m http.server --directory dist 8000
```

Note: the static server also needs to serve the corpus PDFs at
`/raw/R-003/pdfs/*.pdf`. Vite's dev server does this via
`publicDir: "data"` in `vite.config.ts`. For a static fallback, copy
`data/raw/R-003/pdfs/` into `dist/raw/R-003/pdfs/` before launching the
static server, or use `npm run dev` from a warm `node_modules/`.

**Secondary fallback:** screenshots at `docs/screenshots/` — **not
currently captured**. If we pre-generate them before the demo, each
should be named `NN-beat-label.png` matching the demo-script beat
numbers. This section is a placeholder; no fake screenshots have been
added.

## R2: Proof Drawer extraction panel breaks

**Fallback:** open the raw trace JSON in a second tab. Both traces are
tracked in git:

- `src/data/extraction-traces/20130183449.trace.json` (POPHAM 2013 warranty
  deed, 1,024 words across 5 pages)
- `src/data/extraction-traces/20150516729.trace.json` (HOGUE 2015 warranty
  deed — stretch trace; `trust_name` is honestly `null` because the
  deed is individual-to-individual)

At the dev server URL, these are reachable at
`http://localhost:5173/extraction-traces/20130183449.trace.json` (served
via `publicDir: "data"`). The trace has the same four extracted fields,
same confidences, and the raw OCR text — the whole story the panel
tells is in the file.

## R3: "Run the OCR live right now"

**This is not a limitation — it's the production-grade answer.**

Say: "The OCR already ran against this PDF on
`2026-04-14T02:30:33Z` using Tesseract 4.1.1. The trace file includes
the engine version, the timestamp, the raw per-page text, and the
extracted-field snippets. Here it is."

Then open `src/data/extraction-traces/20130183449.trace.json` and walk:

1. `ocr_engine: "tesseract"`, `ocr_version: "tesseract 4.1.1"`,
   `extracted_at: "2026-04-14T02:30:33Z"`
2. `pages[].raw_text` — the full per-page OCR output
3. `extractions[]` — each with `source_snippet`, `source_page`,
   `extraction_method`, `confidence`, `provenance: "ocr"`

Hybrid replay is how production systems reconcile "the model ran" with
"the audit log says exactly what it saw." A re-run on stage would
demonstrate Tesseract latency (tens of seconds per page), not our
pipeline. The artifact is the answer.

## R4: "Do Clark NV / Salt Lake UT / Franklin OH work?"

**Answer from Decision #5 (auto-flip rule):** if R-001 had shown
Maricopa images paywalled or account-gated, we would have flipped to
Clark without asking. Decision #18 recorded that Maricopa passed all
five criteria — free images to 1974, public REST API, 272 document
types, name index 1871–2026. The flip never tripped.

For an audience pressing on "does this scale to other counties?", the
honest answer is: the pipeline generalizes; the vocabularies don't. Each
county has its own document-code lexicon, its own image-URL conventions,
and its own APN ↔ recorder relationship (Maricopa has *none* — see
Decision #21). R-001 is the template for scouting a new county;
reproducing R-001 is a half-day of work per jurisdiction.

## R5: Live internet goes down

The dev server doesn't need internet — all seven corpus PDFs plus both
OCR trace files are committed to the repo under `data/`. The API URL
we mention in the demo-script (`publicapi.recorder.maricopa.gov`) is
used only for audience spot-checks (see `docs/red-team.md` Q1); if the
room has no internet, skip that beat and point at the on-disk JSON
instead.

## R6: Audience asks about a specific instrument we don't have

Two possibilities:

1. It's a Maricopa instrument outside our 7-PDF corpus. Answer: "Our
   corpus is the two parcels at 3674 and 2715 E Palmer St. Any other
   instrument number would 404 in the prototype because we haven't
   downloaded that PDF — the production pipeline would pull on demand."
2. It's a hypothetical. Answer: "Hypotheticals are fair; the shape of
   the answer is in the seven instruments we have. What's the specific
   instrument-shape you're worried about?" That turns the question into
   a real-document spot-check we can complete on our known corpus.

## R7: Reviewer reports "Vite startup failure" (external Codex claim)

Already addressed in `docs/reproducing-the-demo.md`. Fresh-clone
verification on an earlier commit (`cdd7764`) succeeded end-to-end —
`npm ci && npm run build && npm run test && npm run dev` all exited
clean. If a future reviewer sees a genuine startup error, the likely
causes in order are: Node version too old (< 20.19), corrupted
`node_modules` from a partial install, or an OS-specific
`@rollup/rollup-*` optional dep that npm skipped. `rm -rf node_modules
package-lock.json && npm install` typically resolves the last one.
