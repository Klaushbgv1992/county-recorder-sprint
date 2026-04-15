import type { Parcel, Instrument, DocumentType } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

const DEED_TYPES: readonly DocumentType[] = [
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
] as const;

const TRUST_RE = /\bTRUST\b/i;

/**
 * R5: Grantor is a trust entity.
 *
 * For each conveyance deed (warranty / special warranty / quit-claim /
 * grant — excluding DOTs and reconveyances), check if any grantor party's
 * name matches /TRUST/i. Emit one finding per matching deed.
 */
export function detectR5(
  parcel: Parcel,
  instruments: Instrument[],
): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];

  for (const inst of instruments) {
    if (!DEED_TYPES.includes(inst.document_type)) continue;
    const trustGrantor = inst.parties.find(
      (p) => p.role === "grantor" && TRUST_RE.test(p.name),
    );
    if (!trustGrantor) continue;

    findings.push(
      makeFinding({
        ruleId: "R5",
        parcelApn: parcel.apn,
        evidenceInstruments: [inst.instrument_number],
        confidence: 0.95,
        placeholders: {
          a: inst.instrument_number,
          trust_name: trustGrantor.name,
        },
      }),
    );
  }

  return findings;
}
