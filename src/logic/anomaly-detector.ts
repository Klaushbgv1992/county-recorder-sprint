import type { AnomalyFinding } from "../types/anomaly";
import { loadParcelDataByApn } from "../data-loader";
import { detectR1 } from "./rules/r1-same-day-cluster";
import { detectR2 } from "./rules/r2-open-dot-past-window";
import { detectR3 } from "./rules/r3-mers-nominee";
import { detectR4 } from "./rules/r4-assignment-chain-break";
import { detectR5 } from "./rules/r5-grantor-is-trust";
import { detectR6 } from "./rules/r6-plat-unrecoverable";
import { detectR7 } from "./rules/r7-same-name-suppressed";
import { detectR8 } from "./rules/r8-chain-stale";
import { detectR9 } from "./rules/r9-community-property-joinder";
import { detectR10 } from "./rules/r10-open-statutory-lien";

// Severity rank for deterministic ordering: high first, info last.
const SEVERITY_ORDER: Record<AnomalyFinding["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

/**
 * Compose all 10 anomaly rules for a parcel into a single deterministically
 * ordered list of findings. Sort key is (severity desc, rule_id asc).
 *
 * Returns [] when the parcel is not in the corpus (the data loader throws
 * for unknown APNs; we catch and normalize to empty so callers get a
 * uniform signature regardless of parcel existence).
 *
 * Synchronous by design: `loadParcelDataByApn` is synchronous, and the
 * rules themselves do not touch I/O.
 */
export function detectAnomalies(apn: string, now: Date = new Date()): AnomalyFinding[] {
  let bundle;
  try {
    bundle = loadParcelDataByApn(apn);
  } catch {
    return [];
  }

  const { parcel, instruments, links, lifecycles } = bundle;

  const findings: AnomalyFinding[] = [
    ...detectR1(parcel, instruments),
    ...detectR2(parcel, instruments, lifecycles, now),
    ...detectR3(parcel, instruments, links),
    ...detectR4(parcel, instruments, lifecycles, links),
    ...detectR5(parcel, instruments),
    ...detectR6(parcel, instruments),
    ...detectR7(parcel),
    ...detectR8(parcel, instruments, now),
    ...detectR9(parcel, instruments),
    ...detectR10(parcel, instruments, lifecycles),
  ];

  // Array.prototype.sort is stable in V8 since 2019; use a composite
  // comparator to guarantee (severity desc, rule_id asc) regardless of
  // the source rule ordering above.
  findings.sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return a.rule_id.localeCompare(b.rule_id);
  });

  return findings;
}
