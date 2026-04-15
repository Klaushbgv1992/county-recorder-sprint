import type { Parcel, Instrument, DocumentLink } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

const MERS_NAME_RE = /MORTGAGE ELECTRONIC REGISTRATION|\bMERS\b/i;

/**
 * R3: MERS-as-nominee beneficiary.
 *
 * For each deed_of_trust with a party (role: "nominee") whose name matches
 * MERS, find the release instrument (link_type === "release_of" with the
 * DOT as target). If the release's releasing_party name differs from the
 * MERS nominee_for.party_name, emit a finding.
 */
export function detectR3(
  parcel: Parcel,
  instruments: Instrument[],
  links: DocumentLink[],
): AnomalyFinding[] {
  const byNumber = new Map(instruments.map((i) => [i.instrument_number, i]));
  const findings: AnomalyFinding[] = [];

  for (const dot of instruments) {
    if (dot.document_type !== "deed_of_trust") continue;

    const mersParty = dot.parties.find(
      (p) => p.role === "nominee" && MERS_NAME_RE.test(p.name),
    );
    if (!mersParty) continue;
    const lender = mersParty.nominee_for?.party_name;
    if (!lender) continue;

    // Find release link targeting this DOT.
    const releaseLink = links.find(
      (l) =>
        l.link_type === "release_of" &&
        l.target_instrument === dot.instrument_number,
    );
    if (!releaseLink) continue;
    const release = byNumber.get(releaseLink.source_instrument);
    if (!release) continue;

    // Releaser is a party on the release with role "releasing_party"
    // (or, failing that, "beneficiary" — but real data uses releasing_party).
    const releaserParty =
      release.parties.find((p) => p.role === "releasing_party") ??
      release.parties.find((p) => p.role === "beneficiary" && !p.nominee_for);
    if (!releaserParty) continue;

    const releaser = releaserParty.name;
    if (releaser.toUpperCase() === lender.toUpperCase()) continue;

    findings.push(
      makeFinding({
        ruleId: "R3",
        parcelApn: parcel.apn,
        evidenceInstruments: [dot.instrument_number, release.instrument_number],
        confidence: 0.9,
        placeholders: {
          a: dot.instrument_number,
          lender,
          releaser,
        },
      }),
    );
  }

  return findings;
}
