# Demo Script v4 — Full Walk-Through

> **Audience:** Mani + Ali (MLG).
> **Target persona:** residential title examiner / abstractor (primary), with homeowner, attorney-narrator, public-API, and internal-staff readings shown as alternate audiences.
> **Pacing options:**
> - **Full walk** (~28 min) — every section below
> - **Medium** (~15 min) — Opening + Part A + Part B + Part H closing. Skip C/D/E/F/G.
> - **Tight** (~10 min) — Opening + Part A + Part B + one item from Part G (moat-compare) + closing.
> **North star:** every click is justified by a real examiner behavior. The feature justifies itself — not the other way around.
>
> **v4 correctness patch** (applied after end-to-end QA rehearsal — details logged with the corresponding commit):
> - A3 curl uses `searchResults` key; expected output is `totalResults: 0` (reframed moat argument — the index doesn't recognize the code).
> - Beat 2 same-day clusters point at 2002-04-12 and 2013-02-27; the 2021 refinance cluster is called out as living in the Encumbrances panel (Beat 4), not the chain timeline.
> - Beat 3 opens the Proof Drawer on `20130183449` (2013 purchase deed, Madison Trust grantor) — the instrument where the OCR'd trust name actually lives.
> - Beat 4 uses Override → Released as the live transition; the Accept button on the lc-002 candidate is intentionally disabled (1:1 release constraint) and the narration explains why.
> - Beat 4 opens PartyJudgmentSweep "Indexes scanned" before narrating so MCR + MCSC are both visible.
> - CountyHeartbeat is re-mounted as the first child of `<main>` on `/` (Decision #43 restored).
> - MersCallout renders a `via <agent>` subtitle when the release's `mers_note` names a servicing agent (POPHAM shows `via CAS Nationwide Title Clearing`).
> - Plain-English glossary maps grantor → Seller and grantee → Buyer.

---

## 0 · Pre-demo setup (do this 10 minutes before the call)

**Editor (split view, left half of screen):**
- Tab 1: `CLAUDE.md` — scrolled to the Decision Log table
- Tab 2: `docs/known-gaps.md` — scrolled to top
- Tab 3: `docs/hunt-log-known-gap-2.md` — scrolled to §2 (the endpoint table)
- Tab 4: `docs/red-team.md` — scrolled to Q1
- Tab 5: `data/raw/R-005/hunt-log.md` — ready to show the 141-call Seville hunt
- Tab 6: `data/raw/R-008/hunt-log.md` — ready to show the SILVA trustee succession
- Tab 7: `docs/data-provenance.md` — ready for the "where did this data come from" question

**Terminal (bottom of left half):**
- Working directory: project root
- Connectivity check once before the call: `curl -s -o /dev/null -w "%{http_code}\n" https://publicapi.recorder.maricopa.gov/documents/20210057847` → should print `200`
- Command for the live curl in A3 already typed, cursor at end of line, **Enter not yet pressed**
- Second terminal: `npm run dev` already running, port confirmed

**Browser (right half, minimized until we reach Part A's transition):**
- Pre-warmed background tabs, in this order (use them as signposts, don't preload-navigate):
  - `http://localhost:5173/`
  - `http://localhost:5173/parcel/304-78-386`
  - `http://localhost:5173/parcel/304-78-386/encumbrances`
  - `http://localhost:5173/parcel/304-78-386/instrument/20210057847`
  - `http://localhost:5173/parcel/304-78-386/commitment/new`
  - `http://localhost:5173/parcel/304-77-689/encumbrances`
  - `http://localhost:5173/parcel/304-77-566`
  - `http://localhost:5173/custodian-query`
  - `http://localhost:5173/ai-demo`
  - `http://localhost:5173/moat-compare`
  - `http://localhost:5173/why`
  - `http://localhost:5173/staff`
  - `http://localhost:5173/account`

**Backup assets (don't show unless needed):**
- 15-second screen recording of the A3 curl — for the internet-blocked case
- Screenshot of the commitment PDF page 1 — for the wizard-breaks case
- `npm test` run output saved to a text file — for the dev-server-down case

**Practice tip:** read each **Say:** paragraph out loud twice in your own voice. Underlined phrases are emphasis beats. Don't flatten them, and don't memorize word-for-word — get the shape, then speak it.

---

# Opening · The problem, the tool, the data, the findings (0:00 → 1:30)

> Before sharing your screen. Camera on. No slides.

**Say (verbatim — the monologue that earns the rest of the demo):**

> "Before I share my screen, I want to frame four things for you: the problem I set out to solve, how I built this in two days, what data I used, and what I found. Then I'll show you all of it on-screen.
>
> **The problem.** County recorders own the authoritative record of American property — every deed, every mortgage, every lien. But the way that data reaches the public has barely changed since the 1990s. County web portals are hard to navigate, lack the intelligence a title examiner needs, and don't surface the cross-references and judgment calls that real title work requires. As a result an entire industry — title plants, DataTree, TitleIQ, the back-ends behind the commitments your closers already receive — has grown up to mediate between the county and the professional who needs the record. Plants add indexing, name search, cross-references, and weekly bulk deliveries. They also add a licensing tax, a staleness lag of about two weeks, and a judgment layer that nobody in the county can audit. The county's data is fine. **The county's search layer has been structurally broken for thirty years.** That gap is exactly what modern tooling and targeted AI can close — and the county has one asset no plant has: it *is* the custodian.
>
> **How I built this.** Two-day sprint. No mock data. I picked Maricopa County, Arizona, as the primary jurisdiction because on day one I confirmed three things — free public images back to 1974, the official name index, and an undocumented REST API I could hit directly. That API discovery is Decision 22 in the log I'll show you in a minute. I picked Gilbert, a Phoenix suburb, and selected three residential parcels with different examiner-interesting shapes. POPHAM — a 2021 refinance with a clean release on paper but a hidden MERS gap underneath. HOGUE — a 2015 purchase whose original Deed of Trust has no release in the current window, to stress-test whether the moat argument works when the portal has to say 'I don't know.' And SILVA — the messiest chain in the corpus, two trustees of the same trust dying on the same day and a successor-trustee conveyance nine days later. For each parcel I downloaded the recorded images from the county, OCR'd them offline, and hand-curated the metadata the API couldn't provide. I also pulled roughly 8,500 parcel polygons from the Maricopa Assessor's public GIS so the map you'll see is county geometry, not licensed. And I added five neighbors in the same subdivision with cached recorder-API responses, so you'll see three tiers of data stacked in one UI — curated, recorder-cached, and assessor-only.
>
> **What I found — three structural failures and one field-level story.** Structural failure one — the public search API's `documentCode` filter doesn't bind. When I ask for federal-tax-lien filings with the code `FED TAX L` — which is a real code, I confirmed it exists on individual documents — the search returns zero, and when I query without the filter I get a uniform 1,947-record seed that doesn't change page-to-page. The index can't tell you what codes it accepts. You'll watch that happen live in two minutes. Structural failure two — the book-and-page lookup for subdivision plats has five blocked endpoint layers. I went 141 API calls deep hunting for the Seville master plat, Book 553 Page 15, and came back empty. That hunt log is on disk. Structural failure three — death certificates are indexed, so you can find them by name, but their PDF bodies are restricted from public viewing. The county can read them. A title plant cannot. **The custodian has data the market cannot buy.** That's the moat. And at the field level — the county API gives you about twenty-two percent of what an examiner actually needs. Another forty-seven percent sits in images the county already hosts but doesn't extract. Twenty-four percent requires human judgment. Seven percent requires reconstruction from external evidence. **Plants sell the twenty-two. The county can sell the hundred.** That's the leapfrog.
>
> **What I'm about to show you.** With this demo I'll walk you through why this industry operates the way it does today, and how this portal turns the county's custodial position into features a plant structurally cannot replicate. I'll start with the research receipts on disk — that's two minutes. Then I'll walk the examiner's daily workflow screen by screen. Then I'll show you the same data rendered for three other audiences — the homeowner, the attorney, the public API buyer. Then the internal county staff workbench and the signed-in account surface. And finally the live systems — the pipeline push, the real Claude-Opus-4 extraction call, the custodian query matrix. Every screen has a receipt. Every claim points at a file or a URL a third party can verify. Let me share my screen."

*[Share editor window, not browser yet.]*

---

# Part A — Research first (1:30 → 3:30) · Do NOT open the portal yet

> **The thesis of Part A:** the recruiter said the failure mode is "technical execution without research." So the research comes first, on disk, before anything renders in a browser.

---

## A1 · Decision log (1:30 → 1:55)

**Navigate:** Editor → Tab 1 (`CLAUDE.md`). Scroll to the **Decision Log** table.

**Point at:** the first three rows, then scroll slowly through all 51 rows so they can see the dated density.

**Say:**
> "This is where the product comes from. Fifty-one decisions, dated, each one a forced trade-off with a stated rationale. A few highlights. Decision 5 is the auto-flip rule — if my primary county hits a paywall on day one, I flip to the backup without roundtrip. Decision 22 is how I found the undocumented REST API. Decision 29 is a known scope limit around name-role inference, disclosed rather than hidden. Decision 33 is the Wells Fargo finding that produces the MERS gap you'll see in Beat 4. Decision 47 corrects an earlier mistake I made about how name search works. **Nothing in the demo goes outside what's in this table.** If you asked me 'why that parcel, why that county, why that schema,' the answer is here, with the date."

---

## A2 · Known gaps (1:55 → 2:20)

**Navigate:** Editor → Tab 2 (`docs/known-gaps.md`).

**Point at:** the section headers, then Gap #1 (HOGUE purchase-only), Gap #3 (OCR offline), Gap #16 (Schedule B-I limitation).

**Say:**
> "Every shortcut I took, disclosed up front, by section number. Gap 1 — the HOGUE corpus is purchase-only, and you'll see in Beat 5 that the portal turns that limitation into a moat argument instead of hiding it. Gap 3 — OCR runs offline, not at click time, because a demo cannot depend on a thirty-second inference stall. Gap 16 — the commitment export omits Schedule B-I on the deliverable; it's transaction-scoped, and each open B-II row carries a compensating 'closing impact' line. If a buyer ever asks 'what's missing,' this file is the answer."

---

## A3 · The live curl — the moment no competitor can fake (2:20 → 2:55)

**Navigate:** Terminal. The command is already typed.

**Command (already on screen, cursor at end of line). Uses `searchResults` — the actual key the API returns, not `results`:**
```bash
curl -s "https://publicapi.recorder.maricopa.gov/documents/search?documentCode=FED%20TAX%20L&pageSize=5" \
  | python -c "import sys,json;d=json.load(sys.stdin);print('totalResults:',d.get('totalResults'));print('first rec nums:',[r.get('recordingNumber') for r in d.get('searchResults',[])[:3]])"
```

**Action:** press **Enter**. Wait for output.

**Expected output (verify the morning of the demo — the API seed can drift):**
```
totalResults: 0
first rec nums: []
```

**Say (as output appears, don't rush):**
> "I'm asking the Maricopa public API for federal-tax-lien filings only — `documentCode` equals `FED TAX L`. **The API returns zero.** Not because there are no federal tax liens in Maricopa — there are thousands. The code is correct; I pulled it from the `documentCodes` field inside individual documents, and it's in the hunt log. The search index just doesn't recognize it. Now watch — I drop the filter and page with a different query."

**Follow-up command (optional, for the money shot):**
```bash
curl -s "https://publicapi.recorder.maricopa.gov/documents/search?lastNames=POPHAM&pageSize=5" \
  | python -c "import sys,json;d=json.load(sys.stdin);print('totalResults:',d.get('totalResults'))"
```
> "When the name filter binds, you get real hits. When the code filter is sent alone, you get a zero. The index accepts names and drops codes. **This is the structural break that lets title plants exist.** Decision 40 in the log, five blocked endpoint layers in `hunt-log-known-gap-2.md`, reproducible live every time. The county's data is fine. The county's search layer has been structurally broken for thirty years."

**Internet-blocked fallback:** switch to Editor → Tab 3 (`docs/hunt-log-known-gap-2.md` §2).
> "Network's down right now — receipts are on disk. Table of every endpoint I probed, with HTTP status codes. Same finding. The filter doesn't bind."

---

## A4 · Red team (2:55 → 3:15)

**Navigate:** Editor → Tab 4 (`docs/red-team.md`). Scroll to Q1.

**Point at:** the three curl commands under "Is the county data real?"

**Say:**
> "A skeptical buyer gets this document. Every answer points at a file path or a URL they can verify right now. Q1 — is the data real. Three curls they can run against the live API. Q4 — can I trust the OCR. Extraction traces on disk with engine version and timestamps, I'll show you those too. When I don't have an answer, the question stays in the deck unchanged. **That is the bar.**"

---

## A5 · Three hunt logs, three failure modes (3:15 → 3:30)

**Navigate:** stay in editor, click through the three tabs in order.

**Point at — in sequence:**
- Tab 3: `docs/hunt-log-known-gap-2.md` — *"Federal tax lien, documentCode silently dropped."*
- Tab 5: `data/raw/R-005/hunt-log.md` — *"Seville master plat Book 553, 141 of 200 API calls, 5 blocked endpoint layers."*
- Tab 6: `data/raw/R-008/hunt-log.md` — *"SILVA family trust, trustee succession, simultaneous death, indexed-but-body-restricted death certs."*

**Say:**
> "Three independent hunts. Three different structural failures of the public API. Three receipts. You can run these yourself tomorrow against the live endpoint and reproduce every outcome. **Now** let me show you what a portal built on top of that research looks like."

**Transition:** minimize editor. Bring the browser window forward.

---

# Part B — Examiner workflow core (3:30 → 14:30)

> Every beat in this section opens with **Examiner habit:** — the click exists because an abstractor does it every day. This is the main act.

---

## Beat 1 · Public landing — "Title work starts at the record" (3:30 → 5:00) · `/`

**Examiner habit:** an abstractor opens a parcel by APN, by address, or by an 11-digit instrument number forwarded from an underwriter's email. They never start on a marketing page.

**Navigate:** browser → `http://localhost:5173/`

**Take your time on this screen. The landing is doing a lot of work.**

### 1a · County Heartbeat (the live-feeling counter)

**Point at:** the heartbeat counter at the top of `<main>`.

**Say:**
> "This counter is pinned to the Maricopa recorder's published throughput — roughly a million documents a year, four thousand a day. The pacing curve is labeled DEMO-ONLY because I'd rather ship something inspectable than something that pretends to be live. The sparkline shows the same curve as density bars. If you refresh, the number stays consistent — this is a deterministic function of the clock, not a random number generator pretending to be a feed."

### 1b · Pipeline banner (the SLA)

**Point at:** the pipeline ribbon.

**Say:**
> "Verified through 2026-04-16. Fourteen days ahead of plant cycle. That number interpolates against a range pulled from `pipeline-state.json` — you can see the range in `docs/data-provenance.md`. Clicking 'See pipeline' takes you to the live dashboard, which we'll visit later. **Plants publish weekly. This publishes daily. That's a custodial capability, not a feature we wrote.**"

### 1c · PlantVsCountyProof band

**Point at:** the PlantVsCountyProof band.

**Say:**
> "Here's what plant staleness costs a buyer today. The window you see — March 19 through April 2 — is the plant's current lag. POPHAM's 2021 DOT was recorded inside an equivalent window. A plant buyer looking at POPHAM's title today, through their plant, would not see the most recent transaction. The instrument number is right there. **This is not hypothetical, it's a screenshot of the competitive delta.**"

### 1d · PortalModeToggle (the persona switch)

**Point at:** the PortalModeToggle (top-right of hero area).

**Say:**
> "Homeowner on top. One click flips to examiner. Same corpus, different reading level. Later in the demo I'll show you the Plain-English toggle too — two audiences, one URL."

**Action:** click **PortalModeToggle → Examiner**.

### 1e · Search hero, scenario picker, featured parcels

**Point at:** the search hero → scenario picker → featured parcels, in that order.

**Say:**
> "Three ways in. APN or address or instrument in the search box. The scenario picker — four canonical examiner scenarios, probate, divorce quit-claim, LLC transfer, tax-sale REO — each one loads a parcel pre-set to that pattern. And below that the featured parcels: three hand-curated, five neighbors with cached recorder-API responses, and eight thousand five hundred seventy-four parcels from the public Assessor GIS. Three tiers stacked in one UI."

### 1f · Map overlays — the county-only visualization

**Point at:** the OverlayToggles (encumbrance / anomaly / last-deed).

**Say:**
> "Three overlays. The encumbrance layer shows where open liens cluster subdivision-wide — that's county-only data; a plant has no way to compute this without scraping and paying to re-index. Anomalies layer lights up parcels that trip one of ten deterministic rules. Last-deed overlay pulls recency. Each layer is a capability a plant can't replicate because it requires access to the full parcel database, not a nightly export."

### 1g · Instrument-paste deep link (the examiner's Monday morning)

**Action:** click the search box. Paste `20210057847`. Press Enter.

**Expected:** URL bounces through `/instrument/20210057847` with a "Resolving instrument…" placeholder, then lands on `/parcel/304-78-386/instrument/20210057847`.

**Say:**
> "An underwriter emails you an eleven-digit instrument number. Paste it. **One paste, one click, on the parcel's chain with the Proof Drawer open to that exact document.** In production this redirect is server-side. In the prototype it's client-side, which produces the one-frame placeholder you just saw — disclosed as Decision 36."

**Action:** browser back to `/`. Click the **POPHAM tile**.

**Fallback:** if the instrument paste fails, click the POPHAM tile directly.

---

## Beat 2 · Chain of title — "Group the same-day transactions first" (5:00 → 6:30) · `/parcel/304-78-386`

**Examiner habit:** before reading any deed, an abstractor scans for same-day clusters. Same-day = one transaction, not sequential events. Plants flatten this; examiners re-group it by hand.

### 2a · AnomalyPanel (the rules fired on this parcel)

**Point at:** the AnomalyPanel at the top of the main column.

**Say:**
> "Twelve anomalies on this parcel. Ten rule files under `src/logic/rules/`. Deterministic, versioned, and every one has a unit test. Same-day cluster. Open DOT past a window. MERS as nominee. Assignment chain break. Trust-grantor pattern. Plat unrecoverable. Same-name suppressed. Chain stale. Community-property joinder. Open statutory lien. **We'll see three of them fire in Beat 4.**"

### 2b · Same-day clustering (the habit)

**Point at:** the ×2 badge on the 2002-04-12 row.

**Say:**
> "Special Warranty Deed plus Deed of Trust, same day, same parties. One transaction, two instruments. The flat API loses that grouping. Click the badge and it expands inline — you see both instruments stacked inside the same timeline slot."

**Point at:** the ×2 badge on the 2013-02-27 row.

**Say:**
> "Second cluster — the 2013 POPHAM purchase. Warranty Deed plus the original Deed of Trust, same transaction. The chain timeline groups ownership-period events. The 2021 refinance also has a same-day cluster — purchase-DOT plus a UCC-3 termination of a SunPower solar lease — but that cluster lives in the Encumbrances panel, not the ownership chain, because a refi doesn't change the owner-of-record. We'll hit it in Beat 4."

### 2c · Subdivision context (lc-004)

**Point at:** the lc-004 group at the base of the chain.

**Say:**
> "Two instruments at the base. The 2001 Affidavit of Correction, and the Seville Parcel 3 plat itself, recorded by Shea Homes as the original dedicator. Every parcel in this subdivision inherits those encumbrances and that legal description. **A plant doesn't walk the plat book back to the dedicator** — it indexes the instrument and moves on."

### 2d · SpatialContextPanel (the right rail)

**Point at:** the right-rail SpatialContextPanel (adjacent parcels + plat reference + subdivision).

**Say:**
> "Adjacent parcels, plat-map reference, subdivision identifier. Three examiner questions a plant would require three tabs to answer. One panel."

### 2e · Terminology toggle (Plain English)

**Action:** in the header, flip **Terminology: Professional → Plain English**.

**Expected:** timeline relabels. "Deed of Trust" → "Mortgage". "Grantor" → "Seller". "Beneficiary" → "Lender".

**Say:**
> "Same data. Two reading levels. The URL state carries the toggle so a homeowner and their attorney can share the link and each see the version they can read. Title work hasn't had this before — a plant's report uses one vocabulary, and a Zillow-style homeowner tool uses another. We fit both on one source of truth."

**Action:** flip back to **Professional**.

---

## Beat 3 · Proof Drawer — "Cite the source, every field" (6:30 → 8:00) · `/parcel/304-78-386/instrument/20130183449`

**Examiner habit:** never trust a field without a source. And the source has to be the recorded image, not a transcription.

**Action:** click the **2013 Warranty Deed node** on the swimlane (instrument `20130183449`, the POPHAM purchase from the Madison Living Trust). Proof Drawer slides in on the right.

> **Why this instrument and not the 2021 DOT?** The Madison-Living-Trust name is the OCR story — that string is what the public API truncated at 53 characters. It appears as the grantor of the 2013 deed, not as a party on the 2021 DOT. If the 2021 DOT is already open in the drawer from Beat 1's paste demo, close it and click the 2013 node now.

### 3a · Provenance ratio (the commercial pitch in one line)

**Point at:** the drawer header — e.g. "4 fields from County API · 7 fields OCR'd · 4 fields hand-curated" (exact numbers vary per instrument).

**Say:**
> "Four fields from the county API. Seven fields OCR'd from the recorded image. Four fields hand-curated. **This is the commercial pitch in one line.** A plant sells you the twenty-two percent the API already had. We sell the one hundred percent. And every OCR'd field is traceable to a page number; every judgment call is tagged `manual_entry` — disclosed, not buried."

### 3b · Grantor field (OCR, cited to page)

**Point at:** the Grantor field — `THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006`. Note the `ocr` provenance tag.

**Say:**
> "The grantor of this 2013 deed. Full trust name with execution date. The public API's names array truncated this at fifty-three characters — you'd lose the 'dated February 23, 2006' that the trustee-authority check depends on. We OCR'd the image the county already hosts and cite the source page."

**Optional (if they lean in):** show the book-and-page citation is clickable → deep link.

### 3c · ProvenanceTag system

**Point at:** one or two ProvenanceTag chips next to fields.

**Say:**
> "Every field has one of four tags — `public_api`, `ocr`, `manual_entry`, or `reconstruction`. Hover for the confidence and the extraction-trace reference. Every confidence score is hand-assigned during curation — disclosed as Decision 17. I'd rather give you an auditable '0.9' than a model-generated '0.94' that I can't explain."

### 3d · Flag vs Correction (two distinct workflows)

**Point at:** the **Report an issue** button (FlagInstrumentButton) inside the drawer.

**Action:** click **Report an issue**. Dialog opens. Close it.

**Say:**
> "A homeowner or examiner flags a wrong field here. The correction request routes to the curator queue, which you'll see in Part D."

**Point at:** the **This is me — request correction** button (CorrectionRequestButton, usually in the header or account strip).

**Say:**
> "This is a different button. 'Report an issue' is a typo report — 'this field is wrong.' 'This is me' is the homeowner affirmative claim — 'I am the party named here and I want to correct a spelling or a role.' **Two buttons, two workflows, audit trail on both.** That distinction matters because one is public-facing and one is person-claim-verifying, and they route to different queues."

### 3e · Copy citation

**Action:** click **Copy Citation**. Toast fires.

**Say:**
> "Clipboard gets a string ready for an email or a commitment, with the provenance footnote attached. No copy-paste from a document list."

---

## Beat 4 · Encumbrance lifecycle + MERS + candidate release (8:00 → 10:00) · `/parcel/304-78-386/encumbrances`

**Examiner habit:** every open Deed of Trust must pair with a release, an assignment chain, or a recorded disclosure. No exceptions. This beat is the heart of the product.

**Navigate:** click **Encumbrances** in the header, or URL to `/parcel/304-78-386/encumbrances`.

### 4a · County Recording Pipeline Status band

**Point at:** the pipeline status band: received → recorded → indexed → verified → published.

**Say:**
> "Five stages. Each has a timestamp. This is the county's own SLA, visible to a buyer. **A plant cannot show you this because it has no access to the intake side** — it sees records after they've already been bulk-exported. The stage labels map to real internal systems you'd wire up in production."

### 4b · TitleOpinionPanel

**Point at:** the title-opinion conclusion ("Unmarketable — cure required").

**Say:**
> "Computed from the findings plus the open lifecycle states. Not authored copy. If I accept a release in the next thirty seconds, this panel recomputes to 'Marketable subject to.' That's what a title opinion is supposed to be — a derivation, not a narrative."

### 4c · MersCallout on lc-001 (the load-bearing finding)

**Point at:** the MersCallout inside lc-001. The ribbon renders `V I P MORTGAGE INC → ⛓ MERS → WELLS FARGO HOME MORTGAGE`, with `via CAS Nationwide Title Clearing` on the subtitle line.

**Say (slow, this is the big one):**
> "The 2013 DOT names MERS as nominee for VIP Mortgage. The 2021 release was executed by Wells Fargo Home Mortgage — and the subtitle tells you the servicing agent on the release was CAS Nationwide Title Clearing. There is **no** recorded assignment of DOT between VIP and Wells Fargo in the public record. The note transferred through MERS, outside the county's recording system. Rule `r3-mers-nominee` fired. Rule `r4-assignment-chain-break` fired. **We surface the gap.** A plant flattens it to 'released' and the gap disappears into a clean green checkmark. The examiner has to re-discover the hole two weeks later when the underwriter asks. We show it on screen one."

> **Narration note:** the company name renders as `V I P MORTGAGE INC` with spaces between letters because the recorder's OCR ingested the logo's letter-spacing that way. Visually reads oddly; technically accurate; don't fix it on screen.

### 4d · SubdivisionSignalsCard

**Point at:** the SubdivisionSignalsCard.

**Say:**
> "Active HOA lien on APN 304-78-367 — a neighboring Seville Parcel 3 lot, not our parcel. Subdivision-wide density is signal. An examiner who sees three active HOA liens on five neighbors knows the HOA board is active about collections. **Name-indexed plants cannot reconstruct this.**"

### 4e · CandidateReleasesPanel + LinkEvidenceBars (evidence without Accept)

**Point at:** the lc-002 CandidateReleasesPanel with score 0.33 for 20210075858.

**Say:**
> "Three feature bars — party match, date proximity, legal description match. Transparent weights. No black box. The score of 0.33 is low because the releasing party is Wells Fargo, not the lender on this 2021 DOT. And the Accept button is **disabled** — hover shows why: 'this reconveyance is already accepted for another lifecycle.' Releases are one-to-one with DOTs; 20210075858 already closed lc-001. The matcher flags it as a weak candidate so the examiner sees it and thinks, not so it gets auto-applied. **The UI refuses to double-count a release.** That's the audit-trail claim in one click."

### 4f · Override ▾ → the examiner's escape hatch (the live transition)

> **This is the Accept-moment replacement** — when the matcher has no clean candidate, the examiner's workflow is to override the lifecycle state with a written reason. It's the escape hatch that gets audited.

**Action:** click the **Override ▾** menu on lc-002. Menu opens showing state choices: `open` / `released` / `unresolved` / `requires_cure`. Select **Released**. Required reason text field appears — type `Paid off at 2021 refi; release filed under lc-001 per MERS note`. Click **Save**.

**Expected:** lc-002 flips to `released`. Swimlane recomputes. TitleOpinionPanel recomputes from "Unmarketable" toward a closer-to-marketable state. Toast fires. Audit entry written to `examiner-actions:304-78-386` in localStorage — that's the record the curator queue will surface in Part D.

**Say:**
> "Override to Released with a written rationale. Lifecycle transitions. Title opinion recomputes. And an audit entry just wrote to the log you'll see in Part D. **Required reason field is not optional — there is no silent override.** That's the examiner's escape hatch with a tamper-evident trail."

**Reset for next run:** to re-run the override live, clear `localStorage['examiner-actions:304-78-386']` in DevTools before the next take.

### 4g · PartyJudgmentSweep (the custodian's live indexes)

**Point at:** the PartyJudgmentSweep panel.

**Action (do this first so the indexes are visible before you narrate):** click **Indexes scanned ▸** to expand the index list. Both scanned indexes (MCR name index + MCSC civil judgments) must be visible before the narration begins — by default only the "How this sweep works" hint is visible.

**Say:**
> "Five parties. Two live indexes — Maricopa name index, MCR, plus Superior Court civil judgments, MCSC. Zero raw hits. Zero need action. Timestamp 2026-04-18. **No plant can produce a verified zero from a live index** — the best they can do is a stale bulk-export zero. The timestamp is the proof, and you can see the indexes scanned right here."

**Action (optional):** click **How this sweep works →** for the short explainer if the audience is still with you.

### 4h · Linked vs accepted lifecycle (the intentional missing action)

**Point at:** an already-linked lifecycle with a curated link (status: `linked`).

**Say:**
> "Linked lifecycles don't offer an examiner unlink action. That's intentional — curated links represent the county's indexed record, and disputing one is a QA workflow with audit-trail and second-examiner sign-off in production, not an inline click. Same evidence bars as the accepted release, so the evidence is visible. But no one-click revocation. This is Decision 41."

---

## Beat 5 · HOGUE — "The honest zero" (10:00 → 11:00) · `/parcel/304-77-689/encumbrances`

**Examiner habit:** when the tool can't answer, it has to say so — loudly — and name the reason.

**Navigate:** URL to `/parcel/304-77-689/encumbrances`, or type `HOGUE` in the search box.

### 5a · Purchase-only corpus disclosure

**Point at:** the AnomalyPanel. Note: there are fewer anomalies than POPHAM.

**Say:**
> "HOGUE's corpus is purchase-only. That's disclosed as Gap 1 in known-gaps. A lesser demo would hide this parcel. I put it in because the limitation becomes the moat."

### 5b · PartyJudgmentSweep — blocked state

**Action:** scroll to **PartyJudgmentSweep**.

**Point at:** the yellow block: "Sweep blocked by public API limitation."

**Say (slow):**
> "This sweep cannot run because the public API has no name-filtered search — the limitation documented in `hunt-log-known-gap-2.md`, five API layers all silently dropping the filter. Production runs against the county's internal full-name index, which the custodian owns. The prototype surfaces the gap instead of faking a result. **Two things this proves.** One — the POPHAM moat wasn't cherry-picked; it holds when the tool has to say 'I don't know.' Two — saying 'I don't know, and here's why' is a feature, not a bug. Plants rarely do that, and when they do it's buried in a disclaimer."

### 5c · Candidate release panel — empty state rationale

**Point at:** the lc-003 CandidateReleasesPanel — empty state with rationale text.

**Say:**
> "Empty-state rationale written inline. 'The public API cannot search for releases filed against a name outside this parcel; a county-internal full-name scan closes that gap.' **The empty state is the moat demo.**"

---

## Beat 6 · SILVA trustee succession — "The messiest chain in the corpus" (11:00 → 12:30) · `/parcel/304-77-566`

**Examiner habit:** when a trustee dies, the successor-trustee conveyance has to be read carefully — the doc-type label is "trustee's deed," which also labels foreclosure sales. The examiner reads the body, not just the index.

**Navigate:** URL to `/parcel/304-77-566`, or click the SILVA tile on the landing page.

### 6a · Seven instruments, two lifecycles, one hard story

**Point at:** the chain swimlane. Count the instruments aloud — seven. Two lifecycles: lc-016 (released HELOC pair), lc-017 (trustee succession).

**Say:**
> "Seven instruments on this parcel. Two-thousand-fifteen purchase, 2017 transfer into the Silva Family Revocable Trust established July 2007, 2023 HELOC release, and then a black day — March 11, 2026. Two consecutive death certificate recording numbers. Robert and Linda Silva died on the same day, both trustees of the trust that held this property. Nine days later, the successor trustee Richard D. Moore conveyed the property into his own revocable trust via a trustee's deed."

### 6b · The doc-type taxonomy problem

**Point at:** the 20260162239 TRST DEED node.

**Say:**
> "This is a trustee's deed under trust-administration, Arizona Revised Statutes 33-404. But Maricopa uses the same document code `TRST DEED` for trustee's deeds upon foreclosure sale — statute 33-811. A name-indexed plant relying on doc-code alone cannot tell you whether this is a foreclosure or a successor-trustee transfer without reading the body. Decision 49 in the log. **The plant would flag this parcel as distressed; the county reads the body and knows it isn't.**"

### 6c · The indexed-but-body-restricted death certificate

**Point at:** the two consecutive death cert nodes (20260141249, 20260141250) with the "body restricted" annotation.

**Say:**
> "Both death certificates are indexed — you can find them by name via the public API. But the PDF bodies are restricted on `legacy.recorder.maricopa.gov`. The county holds the source image. A plant cannot read it. **This is custodial asymmetry in a single frame.** Decision 50."

### 6d · Same-business-name trust contamination

**Point at:** the MoatCallout or SubdivisionSignalsCard referencing the other Silva Family Revocable Trust.

**Say:**
> "There are two unrelated families maintaining a 'Silva Family Revocable Trust' in Maricopa. This Lot 224 parcel is held by the one established July 2007. A different Lot 157 in Ashland Ranch is held by a trust of the same name established June 2016. A `businessNames=` API query returns twelve instruments mingled across both trusts. Disambiguation requires the trust establishment date, which is in the deed body — not in API metadata. Decision 48. **This is Decision 25's same-name contamination problem, one level up, at the entity level.**"

---

## Beat 7 · Commitment wizard — "Ship the deliverable" (12:30 → 14:30) · `/parcel/304-78-386/commitment/new`

**Examiner habit:** at the end of the day, the abstractor emails a PDF. That PDF is the product.

**Navigate:** back to POPHAM (`/parcel/304-78-386`). Header → **New commitment**, or URL to `/parcel/304-78-386/commitment/new`.

### Step 1 · Transaction type

**Action:** click **Refinance** → **Next**.

**Say:**
> "Four scenarios. Refinance, purchase, probate, quit-claim. The downstream requirements differ by scenario — refinance needs a payoff statement, purchase needs a vesting warranty, probate needs a death certificate reference."

### Step 2 · Details

**Action:** leave seeded effective date. Leave seeded buyer. Type lender: `WELLS FARGO BANK NA`. Click **Next**.

**Say:**
> "Effective date defaults to today. Buyer is seeded from the current owner of record. Lender I type in."

### Step 3 · Review (the 8 Schedule B-I requirements)

**Action:** scroll through the requirements slowly.

**Say (narrate as you scroll — don't read every row, scan the origin-ID column):**
> "Eight Schedule B-I requirements. Payoff statement — origin `lc-002`. MERS milestone — origin `R3-304-78-386-20130183450`, pointing at the exact rule-firing you saw in Beat 4. Trustee's affidavit on the Madison Trust seller — `R5`. Trust certificate. Assignment-chain request — `R4`. HOA estoppel. Tax certificate. **Every row carries a lifecycle ID or a rule ID, and that ID is traceable back to the on-screen evidence you just walked through.** This is not AI-generated boilerplate."

**Action:** click **Next**.

### Step 4 · Export

**Action:** click **Export Commitment PDF**. PDF downloads.

**Action:** open the PDF. Walk through it in order:

1. **Schedule A — vesting + legal description.**
   > "Vesting and legal description. Legal description is the OCR'd one from the Proof Drawer — same source page cited here as there. **One source of truth.**"

2. **Schedule B-II — encumbrances with inline provenance footnotes.**
   > "Encumbrances with inline provenance footnotes. The footnotes match the on-screen UI verbatim. If an underwriter asks 'where did this field come from,' the answer's in the footnote."

3. **Sources block — per-row citations to publicapi.recorder.maricopa.gov.**
   > "Every row cites `publicapi.recorder.maricopa.gov/documents/` followed by the instrument number. **A plant cannot produce a commitment that cites the county as source of truth, because the plant is not the county.** We are the county. That is the pitch."

**Fallback:** if PDF export breaks, say "Export is breaking live, I'll show the pre-rendered one" and open the backup screenshot. Walk through the same three sections verbally.

---

# Part C — Alternate readings (14:30 → 19:00)

> The same corpus, served to three other audiences. Shows breadth without abandoning the examiner anchor.

---

## Beat 8 · Homeowner card — "Four questions a homeowner actually asks" (14:30 → 15:30) · `/parcel/304-78-386/home`

**Navigate:** header → PortalModeToggle → Homeowner, or URL to `/parcel/304-78-386/home`.

**Point at — in order:**

- **TitleCleanCard** — is my title clean?
- **LastSaleCard** — when did I buy, and for how much (if public)?
- **LenderHistoryCard** — who currently holds my note?
- **OpenLiensCard** — what's on my property today?

**Say:**
> "Four cards, plain English, answering the four questions a homeowner actually types into Google. 'Is my title clean.' 'When did I buy.' 'Who do I owe.' 'What's on my property.' Same corpus as the examiner view. **No content gap** — the homeowner sees everything the examiner sees, just relabeled and re-ordered. That's a deliberate choice: opacity to homeowners is how the industry got captured by middlemen."

---

## Beat 9 · Story mode — "Narrative for the attorney or investor" (15:30 → 16:15) · `/parcel/304-78-386/story`

**Navigate:** URL to `/parcel/304-78-386/story`.

**Say:**
> "Narrative prose version of the parcel's history. Written for an attorney, an investor, or a judge. This is the parcel as a story — who bought from whom, what they financed it with, what happened to the release. No table. No jargon. **Same source of truth as the commitment PDF**, different rendering. If you hand this to a probate attorney at 9 AM, they know what they're dealing with by 9:03."

---

## Beat 10 · Party page — "Cross-parcel role resolver" (16:15 → 17:00) · `/party/mortgage-electronic-registration-systems-inc`

**Navigate:** click any MERS reference in the POPHAM chain, or URL to `/party/mortgage-electronic-registration-systems-inc`.

**Point at:** the cross-parcel instrument list with roles resolved per appearance.

**Say:**
> "A party-centric view. For MERS, that's a lot of instruments. Each one shows the role MERS played — nominee, beneficiary, assignee. **The public API's `names[]` array has no role field.** We resolve the role per instrument using doc-type heuristics and hand curation, exactly as disclosed in Decision 29. A name-indexed plant returns a bag of instruments with no role structure."

---

## Beat 11 · Enterprise + API docs + Subscribe (17:00 → 17:45) · `/enterprise`, `/api`, `/subscribe`

**Navigate:** `/enterprise`.

**Point at:** the indicative pricing and sample API payload.

**Say:**
> "For the B2B reader. Indicative pricing for a county-owned API tier. Sample payload from `GET /v1/parcels/{apn}` — the same shape a title plant consumes from its data vendor today, but served direct."

**Navigate:** `/api`.

**Point at:** the schema + curls.

**Say:**
> "Developer-facing API docs. Every field documented, every provenance tag enumerated. **If a plant can't replicate this, they rent from us.**"

**Navigate:** `/subscribe` (briefly).

**Say:**
> "Subscribe placeholder for a future tier. Not wired to Stripe in a two-day sprint, but the affordance shows the commercial motion."

---

## Beat 12 · Receipts pages (17:45 → 19:00) · `/receipts/federal-tax-lien`, `/receipts/seville-master-plat`

**Navigate:** `/receipts/federal-tax-lien`.

**Point at:** the in-UI rendering of the hunt log.

**Say:**
> "The federal tax lien hunt from A3, rendered as a first-class page in the UI. Not a stray markdown file — a surfaced receipt the county can cite to a buyer. The reason I did this is simple: the hunt log is the moat evidence. If the moat evidence only lives in `docs/`, a buyer never sees it."

**Navigate:** `/receipts/seville-master-plat`.

**Say:**
> "Second receipt. The 141-call Seville master plat hunt, Book 553. **Every plant competitor sells you a clean screen. We sell you a clean screen plus the hunt log that proves the data is sound.** That's a category the industry hasn't had."

---

# Part D — Internal county staff workbench (19:00 → 22:00)

> For the recruiter's *"if you want to include internal search and features, no one is going to knock it!"* — this is the second deliverable.

---

## Beat 13 · Staff dashboard (19:00 → 19:30) · `/staff`

**Navigate:** `/staff`.

**Point at:** the tile dashboard — pending queue count, active curators, anomalies-opened-today, SLA adherence.

**Say:**
> "Internal curator view. Four tiles, each one a live KPI. This isn't a retrofitted examiner page — it's a workbench for the staff member responsible for data quality. Every click from here writes to the audit log."

---

## Beat 14 · Name-filtered staff search (19:30 → 20:15) · `/staff/search`

**Navigate:** `/staff/search`. Search for "Popham".

**Point at:** the cross-parcel candidate groups.

**Say:**
> "This is the staff-facing search. Returns instruments across every parcel the curator touches — the same name can appear on properties an examiner doesn't know about. The public API cannot do this. The county's internal index can. **This is the first capability the public API should expose next** — cleaning up the same-name contamination problem would close a whole class of title defects."

**Point at:** the suppressed group.

**Say:**
> "Notice the suppressed group. Instruments attributed to a different parcel where POPHAM appears as a party. That contamination is invisible from the public portal. Here it's surfaced so the curator can reassign or confirm suppression."

---

## Beat 15 · Curator queue + audit log (20:15 → 21:00) · `/staff/queue`

**Navigate:** `/staff/queue`.

**Point at:** pending correction requests and flag reports, accept/reject controls.

**Say:**
> "The queue. Everything the Flag button and the Correction Request button from Beat 3 routes here. Each entry has the original instrument reference, the requester, the proposed change, and accept/reject controls."

**Action:** click one entry to expand. Show the AuditLogPanel tail.

**Say:**
> "Every accept and every reject writes to a tamper-evident audit log. Time-stamped, actor-tagged, reason-required. **This is what a buyer is actually paying for — not just the data, but the lineage.** Plants can't produce this because they're downstream of the event."

---

## Beat 16 · Staff parcel view (21:00 → 22:00) · `/staff/parcel/304-78-386`

**Navigate:** `/staff/parcel/304-78-386`.

**Point at:** the attribution confidence column and the suppressed-instruments list.

**Say:**
> "Staff view of the same POPHAM parcel you just walked through. Attribution confidence per instrument — how sure we are this instrument belongs to this parcel. Suppressed instruments — things that returned in a name search but which curation decided don't belong here. Every cell clickable, every action audited. **This is the shape of the internal system the county builds to produce the public-facing screens you saw.**"

---

# Part E — Account portal (signed in as Jordan) (22:00 → 24:30)

> The signed-in surface. Separate from examiner workflow because the persona is a homeowner or repeat searcher.

---

## Beat 17 · Sign-in header (22:00 → 22:30)

**Navigate:** any page with the header visible (e.g., `/`).

**Point at:** the top-right cluster — SignInButton, NotificationBell, AccountMenu.

**Action:** click **Sign in** (placeholder) → header changes to show NotificationBell + AccountMenu.

**Say:**
> "Signed-in UX. Jordan is the seeded persona — a homeowner tracking their own parcel plus two neighbors. Bell is notifications. Menu drops to the account pages. **The signed-in surface is what converts a search portal into a relationship.** Plants don't have this because a buyer doesn't 'have an account' with a plant — their title company does. The county can offer accounts direct to the public."

---

## Beat 18 · Account dashboard → watchlist → inbox (22:30 → 23:30) · `/account`

**Navigate:** `/account`.

**Point at:** the dashboard cards.

**Say:**
> "Jordan's home. Watchlist summary, inbox summary, preferences summary, recent commitments."

**Action:** click **Watchlist** → `/account/watchlist`.

**Point at:** the StarButton on each parcel, the PreviewPill.

**Say:**
> "Three parcels on Jordan's list. Any change on these parcels pings the inbox — a new recording, a lifecycle transition, a statutory notice. Star icon toggles in/out of the list anywhere in the app."

**Action:** click **Inbox** → `/account/inbox`.

**Say:**
> "Inbox of those pings. Each entry deep-links to the parcel and the specific lifecycle that moved."

---

## Beat 19 · Preferences, statutory notices, records request, commitments (23:30 → 24:30)

**Action:** click each sub-tab in order.

- **Preferences** → `/account/preferences`: notification channels, terminology default.
  > "Preference toggles. Email digest versus per-event. Terminology default — professional or plain-English — so the portal renders in the right mode on every page."

- **Statutory notices** → `/account/notices`: Arizona A.R.S. disclosures.
  > "Statutory notices specific to Arizona. Seller-disclosure affidavits, community-property joinder reminders, HOA disclosure deadlines. County-specific so the examiner doesn't have to pull from a separate vendor."

- **Records request** → `/account/records-request`: formal records-pull workflow.
  > "Formal records-request workflow — the public-records side of the county's statutory obligation. Not a chat form; a tracked request with a case number."

- **Commitments** → `/account/commitments`: history of exported commitments.
  > "Every commitment PDF you export lives here. Jordan can re-download, share via link, or fork a new transaction from an existing commitment."

---

# Part F — Live systems (24:30 → 27:00)

> Where the product stops being static. These three beats are the "this is real, not a mockup" proofs.

---

## Beat 20 · Pipeline dashboard + live push demo (24:30 → 25:30) · `/pipeline`

**Navigate:** `/pipeline`.

**Point at:** the five-stage pipeline board with live counts.

**Say:**
> "The pipeline dashboard. Each stage has a current count of documents, a throughput rate, and a verified-through date. This is the back-end of the banner you saw on every page."

**Action:** click **Record new instrument now** (LivePushDemo control).

**Expected:** a synthetic instrument advances through the five stages in real time.

**Say:**
> "One click, one synthetic instrument, five stages. Received. Recorded. Indexed. Verified. Published. **Plants deliver this as a weekly CSV. We deliver it as a state machine.** That's the freshness moat in one demo."

---

## Beat 21 · Live AI extraction (25:30 → 26:15) · `/ai-demo`

**Navigate:** `/ai-demo`.

**Action:** click **Extract fields** on the seeded instrument.

**Expected:** live streaming call to Claude Opus 4.7 (or whichever model is wired). Fields appear one at a time alongside ground truth for comparison.

**Say:**
> "Real Claude Opus 4.7 call, streaming. Ground truth on the right, model output on the left. **This is the AI surface intentionally exposed.** Everywhere else in the portal, the AI work was done offline during curation and the result is static — because a demo cannot stall for thirty seconds of inference. Here, you can watch it work, and you can see what gets right and what gets hand-corrected in the curator queue."

---

## Beat 22 · Custodian query matrix — the 20-cell moat (26:15 → 27:00) · `/custodian-query`

**Navigate:** `/custodian-query`.

**Point at:** the 5×2×2 grid. Five parties down the side, two live indexes × two approaches across the top.

**Say:**
> "Twenty cells. Five parties — the POPHAM grantors, the VIP Mortgage beneficiary, the Wells Fargo releaser, the Shea Homes dedicator, and a sweeping tax-authority check. Two live indexes — Maricopa recorder name index and Superior Court civil judgments. Two approaches — public-API approach and custodian-direct approach. Three cells marked 'no capture available' — the documented dead-ends at Arizona Department of Revenue, IRS Notice of Federal Tax Lien, and US Bankruptcy Court. **Every other cell is live and timestamped. This single page is the moat thesis.**"

---

# Part G — Ephemera & closers (27:00 → 28:00)

> Last stop before the closing monologue. These pages are there for the buyer who wants the pitch compressed.

---

## Beat 23 · Moat-compare (27:00 → 27:30) · `/moat-compare`

**Navigate:** `/moat-compare`.

**Say:**
> "Nine claims, side by side. Spatial custody. Pipeline transparency. Chain judgment. Internal search. Custodial asymmetry. Bring-down cadence. Entity disambiguation. Provenance depth. Audit trail. Every row is a capability gap a title plant cannot close because it requires custodial access. **These aren't features we added. They're the county's existing capabilities, surfaced.**"

---

## Beat 24 · Why page (27:30 → 27:45) · `/why`

**Navigate:** `/why`.

**Say:**
> "Three-beat narrative. Why plants exist. Why plants are a tax on the industry. Why the county can leapfrog. **For the buyer who wants the whole pitch in one screen without clicking through a demo.**"

---

## Beat 25 · Bring-Down Watch + County Heartbeat revisit (27:45 → 28:00) · `/county-activity`

**Navigate:** `/county-activity`.

**Point at:** the 4,196 instruments in the last 14 days, the 30-day sparkline.

**Say:**
> "Bring-Down Watch. The county's activity feed, not an invented metric. 30-day sparkline, 14-day window surfaced as the bring-down the examiner actually has to do every closing cycle. And this connects back to the County Heartbeat you saw in Beat 1 — **same source, two renderings, one calibrated against the other.**"

---

# Closing · The leapfrog (28:00 → 28:30) · `/`

**Navigate:** back to `/`. Scroll to the provenance ratio footer.

**Say (verbatim — don't paraphrase this close):**

> "Everything you saw was curated from seventy-five fields across five POPHAM instruments, with HOGUE, SILVA, the five cached neighbors, and eight thousand five hundred seventy GIS polygons alongside. Twenty-two percent public API. Forty-seven percent OCR on images the county already hosts. Twenty-four percent hand curation. Seven percent disclosed reconstruction. **That ratio is the commercial story.** Plants sell the twenty-two. We sell the hundred, from the custodian of record, fourteen days fresher, with a hunt log for every claim and an audit trail for every click.
>
> The problem I started with was: county portals are outdated, the custodian is losing to middlemen, and AI has made the old excuses expire. What you just watched is the answer. A title examiner's daily workflow, end-to-end, on county data, with every judgment call cited to a page number. A homeowner's four questions, answered. An attorney's narrative. A public API with real docs. An internal staff workbench with a tamper-evident audit trail. A signed-in account for the homeowner. A pipeline board that shows its own SLA. And three hunt logs that prove the moat is structural, not marketing.
>
> **That's the leapfrog.** Happy to take any of it deeper. If you want to explore on your own, the portal has a built-in six-step guided tour at `/?tour=examiner&step=1`, and every URL in this demo is a sharable link."

---

# Timing budget (cumulative, for stopwatch rehearsal)

| Part | Section | Start | End | Δ |
|---|---|---|---|---|
| — | Opening monologue | 0:00 | 1:30 | 1:30 |
| A | Research receipts | 1:30 | 3:30 | 2:00 |
| B | Beat 1 · Landing | 3:30 | 5:00 | 1:30 |
| B | Beat 2 · Chain of title | 5:00 | 6:30 | 1:30 |
| B | Beat 3 · Proof Drawer | 6:30 | 8:00 | 1:30 |
| B | Beat 4 · Encumbrance + MERS | 8:00 | 10:00 | 2:00 |
| B | Beat 5 · HOGUE honest zero | 10:00 | 11:00 | 1:00 |
| B | Beat 6 · SILVA succession | 11:00 | 12:30 | 1:30 |
| B | Beat 7 · Commitment wizard | 12:30 | 14:30 | 2:00 |
| C | Beat 8 · Homeowner card | 14:30 | 15:30 | 1:00 |
| C | Beat 9 · Story mode | 15:30 | 16:15 | 0:45 |
| C | Beat 10 · Party page | 16:15 | 17:00 | 0:45 |
| C | Beat 11 · Enterprise/API/Subscribe | 17:00 | 17:45 | 0:45 |
| C | Beat 12 · Receipts pages | 17:45 | 19:00 | 1:15 |
| D | Beat 13 · Staff dashboard | 19:00 | 19:30 | 0:30 |
| D | Beat 14 · Name-filtered search | 19:30 | 20:15 | 0:45 |
| D | Beat 15 · Curator queue | 20:15 | 21:00 | 0:45 |
| D | Beat 16 · Staff parcel view | 21:00 | 22:00 | 1:00 |
| E | Beat 17 · Sign-in header | 22:00 | 22:30 | 0:30 |
| E | Beat 18 · Dashboard/watchlist/inbox | 22:30 | 23:30 | 1:00 |
| E | Beat 19 · Pref / notices / records / commitments | 23:30 | 24:30 | 1:00 |
| F | Beat 20 · Pipeline push | 24:30 | 25:30 | 1:00 |
| F | Beat 21 · Live AI extraction | 25:30 | 26:15 | 0:45 |
| F | Beat 22 · Custodian query matrix | 26:15 | 27:00 | 0:45 |
| G | Beat 23 · Moat-compare | 27:00 | 27:30 | 0:30 |
| G | Beat 24 · Why page | 27:30 | 27:45 | 0:15 |
| G | Beat 25 · Bring-Down + Heartbeat | 27:45 | 28:00 | 0:15 |
| — | Closing | 28:00 | 28:30 | 0:30 |
| **Total full walk** | | | **28:30** | |

---

# Pacing recipes

## Tight (~10 min) — "they only gave me ten minutes"
Opening (1:30) + Part A (2:00) + Beats 1, 3, 4, 5, 7 (total 7:00) + Closing (0:30) = **11:00**. Drop Beat 2 subdivision context, Beat 4h linked-action disclosure, Beat 7 step-3 narration. Skip C/D/E/F/G entirely. Recover time on Beat 4 if needed.

## Medium (~15 min) — "you have the hour"
Tight version + Beat 2 + Beat 6 (SILVA) + Beat 22 (custodian query) + Beat 23 (moat-compare). Total ≈ **15:00**.

## Full walk (~28 min) — "they asked for everything"
All 25 beats + opening + closing as above.

## Home-run option (~35 min) — "they want to kick the tires"
Full walk + after closing, offer *"would you like to spend ten minutes in any one area?"* Candidates: SILVA deep-dive, custodian query live runs, staff queue accept/reject flow, live AI extract on a new document they pick.

---

# Global fallbacks

| If this breaks… | Do this instead |
|---|---|
| Internet / A3 curl | Open `hunt-log-known-gap-2.md` §2 and narrate the endpoint table |
| Dev server won't start | Point at the saved `npm test` output — "the test suite runs, here's the evidence" — then walk the decision log end-to-end |
| Map / GIS tile fetch fails | Skip the polygon click, use search box to open POPHAM |
| County Heartbeat fails to mount | Say "the heartbeat is calibrated from pipeline-state.json, you'll see the raw band on /pipeline" and move to the Pipeline Banner |
| Plain-English toggle renders wrong | Don't flip it — the same-day grouping carries Beat 2 |
| Instrument-paste deep link errors | Click POPHAM tile directly; the resolver demo is nice-to-have |
| Accept button on candidate release errors | Skip it, the evidence bars + MERS callout carry Beat 4 |
| Override ▾ menu is empty | Skip it, the Accept flow is the load-bearing interaction |
| Commitment PDF export errors | Open the pre-rendered screenshot, walk the same three sections |
| Live AI extract stalls | Say "the model is cold, you can see the streaming shape even if it doesn't finish" — then move on |
| Any other individual feature | Say "that one's in the appendix" and move to the next beat |

**Recovery rule:** always return to the **Examiner habit:** line from the current beat. The habit is the beat — the feature is how we answer it. If the feature fails, the habit still carries the narrative.

---

# One-screen cheat sheet (for the rehearsal print-out)

```
OPENING (1:30)
  → problem · build · data · findings · thesis

PART A · RESEARCH (2:00)
  A1 decision log → A2 known gaps → A3 LIVE CURL →
  A4 red team → A5 three hunt logs

PART B · EXAMINER CORE (11:00)
  1 landing (heartbeat · pipeline · plant-vs-county · toggle · scenarios · overlays · paste)
  2 chain (anomalies · same-day · plat · spatial · terminology)
  3 proof drawer (provenance ratio · OCR · flag vs correction · copy-cite)
  4 encumbrance (pipeline · opinion · MERS · subdivision · candidate · accept · override · sweep)
  5 HOGUE honest zero
  6 SILVA trustee succession
  7 commitment wizard → PDF

PART C · ALTERNATES (4:30)
  8 homeowner card · 9 story · 10 party ·
  11 enterprise/API/subscribe · 12 receipts

PART D · STAFF (3:00)
  13 dashboard · 14 name search · 15 queue · 16 staff parcel

PART E · ACCOUNT (2:30)
  17 sign-in · 18 dashboard/watchlist/inbox · 19 prefs/notices/records/commitments

PART F · LIVE (2:30)
  20 pipeline push · 21 live AI extract · 22 custodian matrix

PART G · CLOSERS (1:00)
  23 moat-compare · 24 why · 25 bring-down

CLOSING (0:30)
  → 22/47/24/7 ratio · leapfrog
```
