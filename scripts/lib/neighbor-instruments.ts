// scripts/lib/neighbor-instruments.ts
// 5 Seville Parcel 3 neighbors × 2-3 most-recent recorded instruments each.
// Produced by manual research against the Maricopa public recorder API — see
// docs/data-provenance.md §3. Frozen constant; edit only after re-running
// the runbook's manual step.
//
// Selection rationale (2026-04-16):
//   All 5 in 304-78-* map page (same tract as POPHAM lot 46).
//   BROTHERTON, SCHERF, KALANITHI: deed + DOT + SolarCity UCC termination.
//   SOMMERFELD: deed + AZ community-property spouse disclaimer + DOT.
//   ANGUS: lot 45 = POPHAM's literal next-door neighbor; only 2 instruments
//     (QCD + DOT) — variable count is honest, not cherry-picked.
//
// Research budget: ~60 API calls across ~20 Seville candidates at 1s spacing.
// No 429s or 5xxs observed. Hit rate for 3-instrument sets: ~15% (SolarCity
// UCC termination pattern is the reliable source).

export const NEIGHBOR_INSTRUMENTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "304-78-406": ["20211104802", "20211104803", "20211104804"], // BROTHERTON — T FIN ST + WAR DEED + DEED TRST
  "304-78-338": ["20210839272", "20210839273", "20210839274"], // SCHERF — T FIN ST + WAR DEED + DEED TRST (MERS)
  "304-78-369": ["20201215255", "20201215256", "20201215257"], // KALANITHI lot 47 — T FIN ST + WAR DEED + DEED TRST
  "304-78-408": ["20190726318", "20190726319", "20190726320"], // SOMMERFELD Palmer St — WAR DEED + DISCLAIMR + DEED TRST
  "304-78-367": ["20200620456", "20200620457"],                // ANGUS lot 45 — Q/CL DEED + DEED TRST
});
