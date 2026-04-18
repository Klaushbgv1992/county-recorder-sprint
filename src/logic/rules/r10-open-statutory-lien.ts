import type { Instrument, EncumbranceLifecycle, Parcel } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

/**
 * R10: Open statutory lien (federal tax lien, state tax lien, mechanic's
 * lien, judgment lien) against the parcel of record with no recorded
 * release.
 *
 * Critical because:
 *   (1) Federal tax liens are one of the top-five reasons title
 *       insurance claims pay. They attach to all real property of the
 *       debtor and survive transfer unless released.
 *   (2) The Maricopa public API silently drops the documentCode filter
 *       (see docs/hunt-log-known-gap-2.md), so statutory liens are
 *       functionally invisible to plant products that rely on the API
 *       for their feed. This is the product moment — the county's
 *       own index surfaces what plant products cannot.
 *
 * Recognition: document_type_raw starts with a lien marker (FED TAX L,
 * STATE TAX L, MECH LIEN, JUDG LIEN, MED LIEN, HOA LIEN) AND the
 * instrument is the root of an "open" lifecycle.
 */
const LIEN_MARKERS: Array<{ prefix: string; label: string; releaseMechanism: string }> = [
  {
    prefix: "FED TAX L",
    label: "federal tax lien",
    releaseMechanism: "IRS Form 668(Z) Certificate of Release",
  },
  {
    prefix: "STATE TAX L",
    label: "state tax lien",
    releaseMechanism: "ADOR Certificate of Release",
  },
  {
    prefix: "MECH LIEN",
    label: "mechanic's lien",
    releaseMechanism:
      "Release of Mechanic's Lien executed by the original claimant under A.R.S. § 33-1006",
  },
  {
    prefix: "JUDG LIEN",
    label: "judgment lien",
    releaseMechanism:
      "Satisfaction of Judgment executed by the judgment creditor under A.R.S. § 33-964",
  },
  {
    prefix: "MED LIEN",
    label: "medical lien",
    releaseMechanism: "Hospital Lien Release executed by the lien claimant",
  },
  {
    prefix: "HOA LIEN",
    label: "HOA lien",
    releaseMechanism: "Release of HOA Assessment Lien executed by the association",
  },
];

function classifyLien(
  doc_raw: string,
): { label: string; releaseMechanism: string } | null {
  const upper = (doc_raw ?? "").toUpperCase();
  for (const m of LIEN_MARKERS) {
    if (upper.startsWith(m.prefix)) {
      return { label: m.label, releaseMechanism: m.releaseMechanism };
    }
  }
  return null;
}

export function detectR10(
  parcel: Parcel,
  instruments: Instrument[],
  lifecycles: EncumbranceLifecycle[],
): AnomalyFinding[] {
  const byNumber: Record<string, Instrument> = {};
  for (const i of instruments) byNumber[i.instrument_number] = i;

  const findings: AnomalyFinding[] = [];

  for (const lc of lifecycles) {
    if (lc.status !== "open") continue;
    if (lc.examiner_override && lc.examiner_override !== "open") continue;
    const root = byNumber[lc.root_instrument];
    if (!root) continue;
    const cls = classifyLien(root.document_type_raw);
    if (!cls) continue;

    const debtor = pickDebtor(root) ?? parcel.current_owner;
    const deadline = extractRefileDeadline(root) ?? "unspecified deadline";

    findings.push(
      makeFinding({
        ruleId: "R10",
        parcelApn: parcel.apn,
        evidenceInstruments: [root.instrument_number],
        confidence: 0.95,
        placeholders: {
          a: root.instrument_number,
          lien_kind: cls.label,
          debtor,
          release_mechanism: cls.releaseMechanism,
          deadline,
          creditor: pickCreditor(root) ?? "the lien claimant",
        },
      }),
    );
  }
  return findings;
}

function pickDebtor(i: Instrument): string | null {
  const debtors = i.parties.filter(
    (p) => p.role === "debtor" || p.role === "trustor" || p.role === "borrower",
  );
  return debtors.length === 0
    ? null
    : debtors.map((d) => d.name).join("; ");
}

function pickCreditor(i: Instrument): string | null {
  const creditors = i.parties.filter(
    (p) => p.role === "claimant" || p.role === "lender" || p.role === "beneficiary",
  );
  return creditors.length === 0
    ? null
    : creditors.map((d) => d.name).join("; ");
}

function extractRefileDeadline(i: Instrument): string | null {
  const refile = i.extracted_fields["refile_deadline"];
  if (refile) return refile.value;
  return null;
}
