# Demo Script

A click-by-click walk of the prototype aimed at a residential title examiner
or abstractor audience (Maricopa Law Group-style title shop).

Running time: ~6 minutes. Every beat below is backed by a real artifact in
this repo — no aspirational surfaces.

Conventions for each beat:
- **Click:** exact interaction
- **Shows:** what should appear on screen
- **Say:** the spoken line

---

## Beat 1 — Open on Search Entry

- **Click:** open `http://localhost:5173/`
- **Shows:** "Land Custodian Portal" header. Single search input. Chain /
  Encumbrance nav items visibly disabled until a parcel is selected.
  Placeholder text shows real corpus examples only.
- **Say:** "This is the county's own portal. The landing screen is a single
  parcel-keyed search box — no cross-county federation, no intake forms,
  no payments. That narrow scope is deliberate, and it's what makes the
  custodial moat defensible."

## Beat 2 — Instrument-number deep link (moat beat #1)

- **Click:** type `20210075858` into the search box and hit Enter.
- **Shows:** app routes straight to the POPHAM Chain-of-Title timeline with
  the Proof Drawer pre-opened on instrument 20210075858 (2021 full
  reconveyance). The URL bar now reads
  `/parcel/304-78-386/instrument/20210075858`.
- **Click:** copy that URL and paste it into a fresh browser tab.
- **Shows:** the fresh tab lands on the exact same view — chain rendered,
  drawer pre-opened on the reconveyance, provenance attached. No session,
  no cookie, no app state — the URL itself carries the location.
- **Say:** "The 11-digit recording number is unique across the entire
  county index. Typing it deep-links you to the exact instrument, and
  the URL you see is the canonical address for that document in the
  county's own corpus. A title plant can index the number, but it can't
  serve the authoritative document at that URL — that's custody. Paste
  the URL into any browser, share it in a client email, cite it in a
  title commitment — it all resolves to the same provenance-tagged
  instrument."

## Beat 3 — "Search another parcel" back to Search

- **Click:** "Search another parcel" link in header.
- **Shows:** Search Entry screen again, state preserved.
- **Say:** "Search is always one click away. We never unmount it; the
  examiner can pivot between parcels without losing context."

## Beat 4 — Name-variant / multi-token partial match

- **Click:** type `chris ash` into the search input.
- **Shows:** POPHAM parcel (`304-78-386`, 3674 E Palmer St) resolves from
  the multi-token partial match against `current_owner:
  "POPHAM CHRISTOPHER / ASHLEY"`.
- **Say:** "Examiners don't type recorder-format names. `chris ash`
  resolves the same parcel a full formal search would. That owner match
  is tier 3 in the search priority (see `src/logic/search.ts`) — instrument
  wins if it looks like an 11-digit number, then APN, then address, then
  owner, then subdivision."

## Beat 5 — Chain-of-Title Timeline

- **Click:** select the POPHAM parcel result.
- **Shows:** Chain timeline with five instruments: 2013 warranty deed
  (20130183449), 2013 deed of trust (20130183450), 2021 reconveyance
  (20210075858), 2021 warranty deed (20210057846), 2021 deed of trust
  (20210057847).
- **Say:** "This timeline isn't a search result list — it's a curated chain.
  Two same-day groups (the 2013 and 2021 purchase-plus-financing pairs)
  are linked as single transactions via `same_day_group` in the instrument
  JSON. The 2013 DOT and the 2021 release are linked by a separate
  lifecycle edge — that's the AI contribution."

## Beat 6 — DOT → release pairing

- **Click:** hover or point at the 2013 DOT (20130183450) and the 2021
  release (20210075858).
- **Shows:** both instruments highlighted as a linked pair.
- **Say:** "This is the AI that turned two separately-recorded scanned PDFs
  — filed eight years apart, under different filers — into a linked
  lifecycle. The link has provenance `ocr` and confidence 0.97 in
  `src/data/links.json`. The matcher that scores release candidates lives in
  `src/logic/release-candidate-matcher.ts` and has 12 tests."

## Beat 7 — Encumbrance Lifecycle Panel (moat beat #2)

- **Click:** Encumbrance nav.
- **Shows:** two lifecycles for POPHAM. `lc-001` (2013 DOT) status
  **released**, rationale "Release confirmed by examiner via 20210075858".
  `lc-002` (2021 DOT) status **open**, rationale "No reconveyance found in
  corpus for DOT 20210057847". Panel header shows
  **Verified through 2026-04-09**.
- **Say:** "Verified through 2026-04-09 is the custody claim a title plant
  cannot make. The plant can index what it ingested; only the county can
  say 'we've searched our own corpus through today's date and here's what
  we found.' That's decision #12 in the sprint context — locked on this
  screen from the start of the build."

## Beat 8 — Proof Drawer + AI Extraction panel

- **Click:** open the 2013 warranty deed (20130183449) in the Proof Drawer.
  Expand the "AI Extraction" section.
- **Shows:** PDF renders in the iframe. Extraction panel shows four fields
  recovered via real Tesseract 4.1.1 OCR (trace at
  `src/data/extraction-traces/20130183449.trace.json`):
  - `legal_description` — confidence 0.88
  - `trust_name` — confidence 0.92
  - `deed_date` — confidence 0.82
  - `escrow_number` — confidence 0.80
- **Say:** "That's a real OCR trace — 1,024 words across 5 pages, Tesseract
  4.1.1, timestamped. The engine version and timestamp are stored
  verbatim in the trace file so an auditor can reproduce."

## Beat 9 — Honest OCR noise (the Lot 65 / Lot 46 / Lot 687 moment)

- **Click:** expand the `legal_description` extraction entry. Point at the
  raw OCR snippet on page 1 ("Lot 65"). Point at the curated instrument's
  `legal_description` ("Lot 46, SEVILLE PARCEL 3..."). Note that the same
  document's page 3 re-OCR'd the lot as "Lot 687" (visible in the trace
  file page 3 raw text).
- **Shows:** three different readings of the same field on the same
  document.
- **Say:** "This is why the provenance and confidence UI exists. OCR read
  `Lot 65` on page 1 and `Lot 687` on page 3. The curated ground truth —
  from visual inspection of the recorded plat reference — is `Lot 46`.
  The trace preserves the raw Tesseract output verbatim. An examiner
  would never trust an AI that hid this. We make it legible: three-tier
  provenance (`public_api` / `ocr` / `manual_entry`), confidence scores,
  and a link back to the source page."

## Beat 10 — HOGUE backup parcel (moat beat #3)

- **Click:** "Search another parcel" → type `304-77-689` or `Shamrock` →
  select HOGUE.
- **Shows:** HOGUE Chain has two instruments (2015 warranty deed
  20150516729, 2015 DOT 20150516730), both recorded same day. Encumbrance
  Lifecycle Panel shows `lc-003` (2015 DOT) status **open**, rationale:
  "No release, assignment, or reconveyance located in the searched
  corpus for HOGUE 2015 DOT. Maricopa public API does not support
  name-filtered document search, so a release outside the curated HOGUE
  chain cannot be ruled out via the API alone."
- **Say:** "HOGUE is the honest counter-example. We have the 2015 purchase
  and DOT. The lifecycle is marked open *with a stated rationale*: the
  public API doesn't support name-filtered document search, so we cannot
  rule out a release we didn't find. That's the moat argument in its
  sharpest form — the county has the corpus and can search it
  authoritatively; the public API can't, and neither can a title plant
  built on that same API. A county-owned pipeline closes this gap."

## Beat 11 — Back to Search to close

- **Click:** "Search another parcel" → clear input.
- **Shows:** landing state again.
- **Say:** "Same entry point. No tabs, no domain-switching, no name-search
  contamination. That's the shape of a county-keyed examiner workflow."

---

## What I will NOT click, and why

These are aspirational surfaces the prototype deliberately avoids. Each
line traces to a decision in `CLAUDE.md`.

| Surface | Why not | CLAUDE.md anchor |
|---------|---------|------------------|
| Cross-county search | Out of scope for 2-day build; not the pitch | Hard Constraints bullet "Out of scope" |
| Intake forms / e-recording | Out of scope; different product surface | Hard Constraints bullet "Out of scope" |
| Payments / e-commerce | Out of scope | Hard Constraints bullet "Out of scope" |
| Internal ops / pipeline admin | Mention-only — the verified-through date is the user-facing projection of it | Decisions #12, #16 |
| Live name normalization / entity resolution | Mention-only, zero code in prototype | Decision #15 |
| Live sync / real-time freshness | Snapshot only; production-story only | Decision #16 |
| Model-based confidence | Not implemented; confidence is hand-assigned except OCR-derived fields | Decision #17 |
| DOT party-role inference from API name order | Prototype uses manual curation; production would need doc-type heuristics + OCR fallback | Decision #29 |
| Clark NV or any non-Maricopa county | Auto-flip rule never tripped — all five Maricopa criteria passed (R-001) | Decisions #5, #18 |
| Dossier screen | Stretch goal behind the four firm-commitment screens; demo doesn't depend on it | Decision #11 |

If an audience member asks about any of these, the answer is in the
right-hand column, not in a hidden "coming soon" surface we built and
turned off.
