# County Recorder AI-Enhanced Search Portal — Design Spec

## Mission

Deliver a credible working prototype and demo story for an AI-enhanced county recorder search portal aimed at residential title examiners and abstractors. The demo must feel like title work product, not a document browser with AI sprinkled on top.

## Three Claims to Prove

1. **Practitioner-level workflow understanding** — click-by-click chain reconstruction the way a real examiner does it.
2. **AI turns passive documents into structured linked title work** — chain assembly, release matching, provenance — not prettier search.
3. **County-owned portal beats title plants** — authoritative provenance, pipeline status, verified-through dates. The custodial moat.

## Target User

Residential title examiner / abstractor. All design decisions serve this user. Secondary users (landmen, attorneys, consumers) do not shape decisions.

---

## County Selection

| County | Role | Rationale |
|--------|------|-----------|
| **Maricopa AZ** | Primary | Free online recorder with images, DOT state, massive residential volume, strong assessor portal, clean index metadata |
| **Clark NV** | Backup | DOT state, recorder portal exists, good assessor APN data |
| Salt Lake UT | Skipped | Only scout if both primary + backup fail |
| Franklin OH | Skipped | Only scout if both primary + backup fail |

**Auto-flip rule:** If R-001 reveals Maricopa images are paywalled or require account creation, flip to Clark NV immediately. No user roundtrip — log in decision table and emit Clark scouting request.

**Skip reasoning:** Scouting 4 counties when 2 high-confidence DOT-state candidates exist is not justified under a 2-day constraint. Salt Lake (smaller county, uncertain image access) and Franklin (mortgage-state terminology complexity, possible paywall) remain available as last resort.

---

## Hero Scenario

### Target Pattern: Refinance

A single residential parcel showing:
- A vesting deed (current owner) + at least 1 prior deed (chain continuity)
- At least 1 Deed of Trust from a refinance in the **2020-2022 window** (rate bottoms drove volume; balances reconveyance-lag plausibility against demo credibility)
- At least one of: Assignment of DOT, Modification, Substitution of Trustee
- Ideally: an unreleased or ambiguously released DOT (upside, not the hunt target — the refi pattern guarantees at least a complete lifecycle)

### Scenario Rankings

| Scenario | Description | Demo value | Approach |
|----------|-------------|------------|----------|
| A | Unreleased DOT — no reconveyance in corpus | Highest | Upside if found, don't chase directly |
| B | Assignment chain + release — DOT assigned 1-2x, released under final beneficiary | High | Primary target via refi pattern |
| C | Release with name mismatch — reconveyance by servicer name differing from original beneficiary | High | Bonus if found |
| D | Clean lifecycle — DOT → release, no complications | Acceptable | Minimum guaranteed by refi pattern |

### Parcel Selection Criteria

- Residential single-family home
- At least 2 sales in last 20 years (chain depth)
- At least 1 refinance in 2020-2022 (DOT lifecycle richness)
- APN clearly linked in assessor
- Preferably a subdivision lot (clean legal description)
- HELOCs / second DOTs: bonus, prioritize if found (second lifecycle more likely to have ambiguous release)

### Parcel Exclusions

- Commercial parcels
- Vacant land
- Condos (HOA lien noise)
- New construction (too little history)
- Any parcel with Notice of Default, Trustee's Sale, or REO history (bankruptcy/court-order noise outside residential examiner normal workflow)

---

## Screens

### Firm commitment: 4 screens (~11.5h Day 2)

| Build Order | Screen | Hours | Purpose |
|-------------|--------|-------|---------|
| 1 | Search Entry | 1.5 | Demo flow entry point. Pre-populated, canned results for 1 parcel. |
| 2 | Chain-of-Title Timeline | 3.5 | Thesis screen #1. Deeds chronologically, back-references, owner-period windows, gap detection. |
| 3 | Encumbrance Lifecycle Panel | 4.0 | Thesis screen #2. DOT lifecycles with assignments/mods/releases, status badges, examiner actions, county moat moment. |
| 4 | Document Proof Drawer | 2.5 | Source image side-by-side with extracted fields, provenance, confidence, corpus boundary note. Slide-out panel from Screens 2+3. |

### Stretch goal: Parcel Dossier (~2h)

Build only if Day 2 morning is clearly ahead of schedule. Current owner, legal description, APN, assessor bridge. County moat moment already lives on Screen 3 regardless.

### County Moat Moment — Locked on Screen 3

Verified-through date + recording pipeline status (`received → recorded → indexed → verified → published`) displayed as a persistent header bar on the Encumbrance Lifecycle panel. Not conditional on Dossier. Survives any scope cut.

### Mandatory Interactions

| Interaction | Screen | Notes |
|------------|--------|-------|
| Accept link | Encumbrance Lifecycle | Examiner confirms AI-matched link |
| Reject link | Encumbrance Lifecycle | Examiner overrides incorrect link |
| Mark unresolved | Encumbrance Lifecycle | Examiner flags indeterminate status |
| Open source document | Chain-of-Title + Encumbrance → Proof Drawer | Click instrument number to open drawer |
| Copy citation | Proof Drawer | Formatted instrument reference to clipboard |

---

## Data Model

### Core Entities

- **Parcel** — APN, address, legal description, current owner, assessor bridge data
- **Instrument** — instrument number (or book/page), recording date, document type, grantor(s), grantee(s), back-references, local source image path, extracted fields JSON, provenance tags, confidence scores, corpus boundary note
- **Party** — name, role (grantor/grantee/trustor/trustee/beneficiary), instrument references
- **OwnerPeriod** — owner name, start instrument (deed in), end instrument (deed out or current), date range
- **EncumbranceLifecycle** — root DOT instrument, child instruments (assignments, mods, substitutions, releases), status, examiner overrides
- **DocumentLink** — source instrument, target instrument, link type (back-reference, assignment-of, release-of, modification-of), provenance, confidence, examiner action (accepted/rejected/unresolved)

### Instrument Schema (instruments.json)

Every instrument carries:
- `instrument_number` or `book_page`
- `recording_date`
- `document_type`
- `grantor` / `grantee` (arrays of party names)
- `legal_description` (displayed as captured text, never parsed or normalized)
- `back_references` (array of instrument numbers)
- `source_image_path` (local path to captured image)
- `extracted_fields` (JSON object of field name → value)
- `provenance` per field: `index_metadata` | `ai_extraction` | `manual_entry` | `hybrid`
- `confidence` per field: hand-assigned during curation (no model-based confidence estimation)
- `corpus_boundary_note`: "County online records searched through [date]"

### EncumbranceLifecycle Status Rules

- `open` — no matching release/reconveyance in county corpus
- `released` — explicit release/reconveyance/satisfaction found and linked
- `unresolved` — conflicting or incomplete evidence
- `possible_match` — inferred link, needs examiner review

---

## Proof Artifacts

Every displayed instrument carries:
- Instrument number or book/page
- Recording date
- Source image reference (local path)
- Extracted fields with per-field provenance and confidence
- Corpus boundary note

---

## Out of Scope — Hard No

| Item | Why |
|------|-----|
| Cross-county / multi-county search | One county, one story |
| Multi-parcel / batch / pagination | 1 parcel shown deeply |
| User management / auth / sessions | No auth in demo |
| Payments / billing / subscription | County portal is public service |
| Internal ops / recording intake / staff dashboards | Public-facing portal only |
| E-recording | Separate product |
| Title plant integration / feeds | Competing with plants, not integrating |
| Legal description parsing, geometry extraction, normalization | Display as captured text only |
| Map / GIS / spatial search | Zero thesis contribution |
| Tax / assessment detail | Bridge to assessor for APN only |
| Lien types beyond DOTs (mechanic's, HOA, judgment, tax, lis pendens) | Complexity without thesis value |
| Court records (probate, divorce, bankruptcy, quiet title) | Can't demo credibly in 2 days |
| NOD / foreclosure / Trustee's Sale / REO | Excluded from parcel selection entirely |
| Document OCR / live extraction | Precomputed extractions only |
| Natural language search | Examiners search by name/APN/instrument |
| Notifications / alerts / monitoring | Different product |
| Export / PDF reports / XML | Demo is a workspace, not an export tool |
| Mobile / responsive | Desktop demo only |
| Accessibility / WCAG | Important for production, not 2-day prototype |
| Performance optimization | Single parcel, local data |
| Browser compatibility | One modern Chrome instance |

## Out of Scope — Mention Only in Demo Script

| Item | Where | What to say |
|------|-------|-------------|
| Multi-county expansion | Demo closing | "Same model applies to any county that exposes its index — architecture is county-agnostic." |
| Recording pipeline status detail | Moat moment, Screen 3 | Pipeline stages shown as badge; no real pipeline integration — static status from captured data. |
| Automated chain assembly at scale | Chain-of-Title | "For the demo, links are curated. In production, AI assembles links automatically from index metadata and document content." |
| Name normalization / entity resolution | Chain-of-Title + Encumbrance | "For the demo, party links are curated. In production, AI handles name variants — phonetic matching, entity type disambiguation (trust vs individual vs LLC), cross-instrument party resolution. This is the single most time-consuming manual task for examiners today, and the piece title plants spend the most engineering effort on." |
| Data freshness / live sync | Moat moment, Screen 3 | "This prototype uses a snapshot from [capture date]. The production system syncs with the county recording pipeline in real time, which is the moat — no aggregator has that visibility." |

## In Scope but Minimal

| Item | In scope as... | NOT in scope as... |
|------|---------------|-------------------|
| Search | Pre-populated with canned results for 1 parcel | Fuzzy matching, autocomplete, pagination, multi-result |
| Assessor bridge | Static APN → address mapping from captured data | Live assessor API call |
| AI extraction | Precomputed fields with provenance tags. Confidence scores hand-assigned per field during curation. No model-based confidence estimation. | Live inference, model calls, confidence recalculation |
| Source images | Locally served captured images | Live county portal image fetch |
| Copy citation | Copies formatted instrument reference to clipboard | Export, email, save-to-file |
| Before/after comparison | Static screenshots from R-001/R-002 handoffs shown in demo script narrative, plus measurable-win claim (search counts, tab counts) as a callout | Live side-by-side comparison mode inside the app |

---

## Tech Stack

- **Frontend:** Single-page app (React or vanilla JS + HTML — decision deferred to planning phase based on complexity estimate)
- **Data:** Static JSON files served locally (`/data/*.json`)
- **Images:** Locally served captured document images (`/data/raw/`)
- **Server:** Minimal local dev server (Vite, http-server, or similar)
- **No backend:** All data is precomputed static JSON. No database, no API server, no live inference.

---

## Research Handoff Plan

| ID | Phase | County | Purpose | Blocking |
|----|-------|--------|---------|----------|
| R-001 | 1 | Maricopa AZ | Scout portal: free image access (first criterion), index metadata quality, instrument type labels, image lookback depth, APN bridge, search surface inventory | Yes |
| R-002 | 1 | Maricopa AZ | Parcel hunting: 2-3 candidates matching refi pattern, pain-point screenshots for measurable-win evidence | Yes |
| R-003+ | 2 | Maricopa AZ | Corpus assembly: 8-15 instruments for locked parcel, source images + index metadata | Yes |

If R-001 triggers auto-flip to Clark NV, R-002 targets Clark instead.

---

## Measurable-Win Evidence

"Before" numbers (search counts, tab counts, click counts, pain points) are captured from R-001 and R-002 handoff screenshots during Phase 1-2 research. They are real observations from the live Maricopa portal, not invented during demo polish. The demo script references specific screenshot evidence by research ID.

---

## Fallback Rules

- No ambiguous release found → use clearest mortgage lifecycle with at least one assignment or release
- Extraction unreliable → manually curate, label `manual_entry, examiner_verified`
- County portal unstable → rely on locally captured images; demo never requires live portal
- Time tight → Dossier is first cut. Never cut Chain-of-Title or Encumbrance Lifecycle.
- Handoff returns empty → emit tighter follow-up request with explicit failure mode. Never guess-fill.
