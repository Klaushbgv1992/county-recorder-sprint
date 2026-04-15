import type {
  Parcel,
  Instrument,
  EncumbranceLifecycle,
  DocumentLink,
} from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

/**
 * R4: Assignment chain break.
 *
 * For each released lifecycle whose root is a deed_of_trust, find the
 * release instrument (via release_of link). Compare the original
 * beneficiary / lender on the DOT to the releasing party on the release.
 * If they differ AND no assignment_of_dot instrument exists in
 * instruments[], emit a finding.
 *
 * lc-004 (plat) is filtered out by the document_type === "deed_of_trust"
 * check on the root.
 */
export function detectR4(
  parcel: Parcel,
  instruments: Instrument[],
  lifecycles: EncumbranceLifecycle[],
  links: DocumentLink[],
): AnomalyFinding[] {
  const byNumber = new Map(instruments.map((i) => [i.instrument_number, i]));
  const hasAssignment = instruments.some(
    (i) => i.document_type === "assignment_of_dot",
  );
  const findings: AnomalyFinding[] = [];

  for (const lc of lifecycles) {
    if (lc.status !== "released") continue;
    const root = byNumber.get(lc.root_instrument);
    if (!root) continue;
    if (root.document_type !== "deed_of_trust") continue;

    // Originator — prefer explicit lender role, fall back to beneficiary
    // (excluding nominee passthrough).
    const originatorParty =
      root.parties.find((p) => p.role === "lender") ??
      root.parties.find((p) => p.role === "beneficiary" && !p.nominee_for);
    if (!originatorParty) continue;
    const originator = originatorParty.name;

    // Find release
    const releaseLink = links.find(
      (l) =>
        l.link_type === "release_of" &&
        l.target_instrument === root.instrument_number,
    );
    if (!releaseLink) continue;
    const release = byNumber.get(releaseLink.source_instrument);
    if (!release) continue;

    const releaserParty =
      release.parties.find((p) => p.role === "releasing_party") ??
      release.parties.find((p) => p.role === "beneficiary" && !p.nominee_for);
    if (!releaserParty) continue;
    const releaser = releaserParty.name;

    if (releaser.toUpperCase() === originator.toUpperCase()) continue;
    if (hasAssignment) continue;

    findings.push(
      makeFinding({
        ruleId: "R4",
        parcelApn: parcel.apn,
        evidenceInstruments: [root.instrument_number, release.instrument_number],
        confidence: 0.85,
        placeholders: {
          a: root.instrument_number,
          b: release.instrument_number,
          originator,
          releaser,
        },
      }),
    );
  }

  return findings;
}
