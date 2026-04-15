# Demo Script — 8-Minute Arc (S5 Final)

> **For:** MLG pitch. Target: residential title examiner / abstractor audience.  
> **Setup:** Browser open to `/`. Dev server running locally.

---

## Beat 1 — Public Landing (45s)

**Goal:** Establish county ownership before touching any data.

**Action:** Point to the landing page map.

**Say:** "This is the county recorder's portal. The polygons you see are from the Maricopa County Assessor's file — not licensed from a third party, not scraped. The county is the custodian of this geometry. Title plants pay a licensing layer to access the same data we're serving direct."

**Point to:** The three-pillar row below the search box (Spatial custody / Verified freshness / Chain intelligence).

---

## Beat 2 — Click POPHAM → Chain with Spatial Panel (60s)

**Goal:** Show parcel-keyed chain-of-title with spatial context in one view.

**Action:** Click the POPHAM polygon on the map (or enter `304-78-386` in the search box). The Chain-of-Title panel opens.

**Say:** "Here's the chain for parcel 304-78-386 — 3674 E Palmer Street, Gilbert. We see a 2013 purchase from the Brian and Tanya Madison Living Trust, a 2021 UCC termination, a 2021 refinance pair, and two subdivision encumbrances at the base of the chain. That last group is lc-004 — it's linked to the Seville Parcel 3 plat book. A title plant can't index that relationship without a manual lookup."

**Point to:** The `same_day_group_id` grouping on the 2021-01-19 instruments (UCC term + DOT recorded same day, same party). "These two instruments are grouped by the portal because they share a party on the same recording date — that's an inference the raw API can't give you."

---

## Beat 3 — Anomaly Banner + MERS / Assignment Break (90s)

**Goal:** Show AI-assisted chain judgment, not just a document list.

**Action:** Navigate to `/parcel/304-78-386/encumbrances`. Click the anomaly banner.

**Say:** "The system flagged five conditions. Here's the one that matters for an examiner: the 2013 DOT names MERS as beneficiary as nominee for VIP Mortgage. The release in 2021 was executed by Wells Fargo via CAS Nationwide. There's no recorded assignment of DOT between VIP and Wells Fargo in this corpus."

**Point to:** The MERS note annotation on lc-001. "In a title plant report this would show as a gap in the chain. Here it's surfaced explicitly with the moat note: the note transferred via MERS outside the public record. That's not a bug — that's the county showing its work."

---

## Beat 4 — Transaction Wizard → Schedule B-I Live (90s)

**Goal:** Show that the portal produces title work product, not a document browser.

**Action:** Navigate to `/parcel/304-78-386/commitment/new`. Walk through the wizard.

**Say:** "An abstractor's deliverable is a commitment — Schedule A vesting, Schedule B-II encumbrances, and B-I requirements for this transaction. Watch what happens when I pick 'refinance'."

**Action:** Select refinance, fill in lender, click through the wizard. Show the generated Schedule B-I items.

**Say:** "The portal generated these B-I requirements from the open encumbrances and the anomalies — the MERS note produces a B-I requirement. This is structured work product the examiner can hand to the underwriter. No copy-paste from a document list."

---

## Beat 5 — `/staff/search` — Cross-Parcel + Suppressed (60s)

**Goal:** Show the county's internal search capability that title plants can't replicate.

**Action:** Navigate to `/staff/search`. Search for "Popham".

**Say:** "This is the staff-facing search. It returns instruments across all parcels — the same name can appear on properties the examiner doesn't know about yet. That's the known-gap moment for public portals: the public API has no name-filtered search. The county's internal index does."

**Point to:** The same-name candidate groups returned. "Notice the suppressed group — instruments attributed to a different parcel where POPHAM appears as a party. That contamination is invisible if you only look at the public portal."

---

## Beat 6 — HOGUE Cross-Parcel Release Hunt → Honest Zero (45s)

**Goal:** Show the moat argument works even when the answer is "we don't know."

**Action:** Navigate to `/parcel/304-77-689/encumbrances`. Click lc-003 (HOGUE open DOT).

**Say:** "HOGUE's 2015 DOT is open. The cross-parcel release hunt scanned the entire corpus — and returned zero candidates. That's the honest result. The public portal can't tell you this because it can't search by name across the index. The county can. The zero is meaningful."

**Point to:** The "Cross-parcel scan" panel showing `scanned_party_count > 0` and zero results.

---

## Beat 7 — Pipeline Banner — "4 Days Ahead of Plant" (30s)

**Goal:** Make freshness tangible.

**Action:** Navigate to `/pipeline`.

**Say:** "Each stage has a verified-through date. Index ingestion. OCR run. Curator sign-off. Anomaly scan. The pipeline banner on every screen shows how many days ahead of the typical plant lag we are. On this snapshot it's [read the number]. Title plants publish weekly. This is daily."

---

## Beat 8 — `/moat-compare` Closer (30s)

**Goal:** Close on the county-moat thesis.

**Action:** Navigate to `/moat-compare`.

**Say:** "Nine claims, side by side. Every row is a capability gap a title plant cannot close because it requires custodial access. Spatial custody, pipeline transparency, chain judgment, internal search — these aren't features we added. They're the county's existing capabilities, surfaced."

---

## Timing Budget

| Beat | Time |
|------|------|
| 1. Landing | 45s |
| 2. Chain + Spatial | 60s |
| 3. Anomalies + MERS | 90s |
| 4. Wizard + B-I | 90s |
| 5. Staff search | 60s |
| 6. HOGUE honest zero | 45s |
| 7. Pipeline banner | 30s |
| 8. Moat compare | 30s |
| **Total** | **~7:30** |

---

## Fallback

If the map fails to load (GIS fetch failure): use the parcel search box directly and skip Beat 1's spatial point.

If the wizard errors: navigate directly to `/parcel/304-78-386/commitment/new` and use the URL fallback shown in `docs/risks-and-fallbacks.md`.
