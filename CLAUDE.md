# County Recorder AI-Enhanced Search Portal — Sprint Context

## Mission
Deliver a credible working prototype and demo story for an AI-enhanced county recorder search portal aimed at residential title examiners and abstractors. The demo must feel like title work product, not a document browser with AI sprinkled on top.

## Three Claims to Prove
1. Practitioner-level understanding of title workflow (click-by-click examiner chain reconstruction)
2. AI turns passive recorded documents into structured linked title work (chain assembly, release matching, provenance)
3. County-owned portal beats title plants via custodial moat (authoritative provenance, pipeline status, verified-through dates)

## Hard Constraints
- 2-day build window
- 1 primary + 1 backup county
- 1 primary + 1 backup parcel
- Manual curation preferred over flaky automation
- Serve captured source documents locally (no live portal dependency)
- Out of scope: cross-county search, intake, payments, internal ops, general platform features

## Target User
Residential title examiner / abstractor

## Mandatory Screens (build priority order)
1. Search Entry
2. Chain-of-Title Timeline
3. Encumbrance Lifecycle Panel
4. Parcel Dossier
5. Document Proof Drawer

## County Selection
- **Primary:** Maricopa AZ (pending R-001 confirmation of free image access)
- **Backup:** Clark NV
- **Skipped:** Salt Lake UT, Franklin OH (only scout if both primary + backup fail)
- **Auto-flip rule:** If Maricopa images are paywalled or require account creation, flip to Clark without roundtrip — log in decision table

## Parcel Selection
- **Primary:** TBD
- **Backup:** TBD

## Decision Log
| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | Project scaffold created | Phase 0 setup | 2026-04-13 |
| 2 | Primary county: Maricopa AZ | Highest confidence on free images, clean metadata, DOT-state terminology, massive residential volume, strong assessor-APN bridge | 2026-04-13 |
| 3 | Backup county: Clark NV | Same DOT-state advantage, fallback if Maricopa images paywalled | 2026-04-13 |
| 4 | Skip Salt Lake UT + Franklin OH scouting | Saves 2 handoffs / half day. Only scout if both Maricopa + Clark fail. | 2026-04-13 |
| 5 | Auto-flip rule on image access | If R-001 shows paywalled/account-gated images, flip to Clark immediately without asking | 2026-04-13 |
| 6 | Hero scenario: refinance pattern IS the target | Chase refi pattern (guarantees Scenario B min), not Scenario A directly. Unreleased DOT is upside, not goal. | 2026-04-13 |
| 7 | Refi window: 2020-2022 | Rate bottoms drove volume; balances reconveyance-lag plausibility vs demo credibility. 2023+ too recent. | 2026-04-13 |
| 8 | HELOCs/2nd DOTs: bonus not disqualifier | Second lifecycle more likely to have ambiguous release. Prioritize if found, don't hunt. | 2026-04-13 |
| 9 | Exclude NOD/Trustee Sale/REO parcels | Bankruptcy/court-order noise outside residential examiner normal workflow | 2026-04-13 |
| 10 | R-001 must capture image lookback depth | If images only go to ~2005, parcel selection must account for it | 2026-04-13 |
| 11 | 4-screen firm commitment, Dossier is stretch | ~11.5h budget for Search + Chain + Encumbrance + Proof Drawer. Dossier only if Day 2 morning ahead of schedule. | 2026-04-13 |
| 12 | County moat locked on Screen 3 from start | Verified-through + pipeline status always on Encumbrance Lifecycle, not conditional on Dossier | 2026-04-13 |
| 13 | Proof Drawer schema fields baked into instruments.json from Phase 3 | Local image paths, extracted-field JSON, provenance tags, confidence scores, instrument→image bridge | 2026-04-13 |
| 14 | Measurable-win numbers from handoff evidence | "Before" counts (searches, tabs, pain points) captured during Phase 1-2 research, not invented on Day 2 | 2026-04-13 |
| 15 | Name normalization / entity resolution: mention-only | Verbal reference in demo, zero code. Single most time-consuming examiner task. | 2026-04-13 |
| 16 | Data freshness / live sync: mention-only | Prototype uses snapshot. Production syncs real-time — that's the moat narrative. | 2026-04-13 |
| 17 | Confidence scores hand-assigned during curation | No model-based confidence estimation in prototype | 2026-04-13 |

## Active Skill State
- **Current Phase:** Phase 0 — Setup + Brainstorming Gate
- **Active Skill:** brainstorming (pending)
- **Brainstorm Sign-off:** pending
- **Plan Sign-off:** pending

## Research Request Tracker
| ID | Phase | Status | Summary |
|----|-------|--------|---------|
| (none yet) | | | |

## Schema
TBD — will define after county/parcel lock

## Terminology Notes
TBD — will capture per-county terminology from research handoffs
