import type { Instrument, Parcel } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

/**
 * R9: Arizona community-property joinder check.
 *
 * Arizona is a community-property state (A.R.S. § 25-211). A conveyance
 * of the community's real property — including a grant deed, warranty
 * deed, or deed of trust — requires joinder of both spouses
 * (A.R.S. § 25-214(C)). A deed signed by only one spouse is voidable
 * by the non-joining spouse and is one of the top categories of title
 * insurance claims in AZ.
 *
 * Trigger scope: any outbound conveyance (warranty / grant / special
 * warranty / quit claim deed, or DOT) whose recording_date is after
 * the most recent prior conveyance that established a two-spouse
 * owner pair. When the current owner-of-record is a "/" pair (e.g.
 * "POPHAM CHRISTOPHER / ASHLEY") and the inspected deed has only one
 * matching surname in its grantor/trustor list, fire a medium finding.
 *
 * On POPHAM this produces an informational ✓ finding (both spouses
 * on every conveyance), which is itself valuable — the positive-pass
 * tells the examiner the check ran and cleared.
 */
const DEED_TYPES = new Set([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
  "deed_of_trust",
  "heloc_dot",
]);

const GRANTOR_SIDE_ROLES = new Set(["grantor", "trustor"]);

export function detectR9(
  parcel: Parcel,
  instruments: Instrument[],
): AnomalyFinding[] {
  const pair = splitOwnerPair(parcel.current_owner);
  if (!pair) return [];

  const [firstLast, secondSurname] = pair;
  const findings: AnomalyFinding[] = [];

  // Look at each outbound conveyance from the couple. We only consider
  // instruments where the couple's surname already appears in at least
  // one grantor — a deed signed INTO the couple (from a prior owner)
  // isn't a community conveyance yet.
  for (const inst of instruments) {
    if (!DEED_TYPES.has(inst.document_type)) continue;
    const grantors = inst.parties.filter((p) => GRANTOR_SIDE_ROLES.has(p.role));
    if (grantors.length === 0) continue;

    const matchesSurname = (name: string, surname: string): boolean =>
      name.toUpperCase().includes(surname.toUpperCase());

    const anyHasFamilySurname = grantors.some((g) =>
      matchesSurname(g.name, firstLast.surname),
    );
    if (!anyHasFamilySurname) continue; // not a community conveyance

    const firstJoined = grantors.some((g) =>
      matchesSurname(g.name, firstLast.given),
    );
    const secondJoined = grantors.some(
      (g) =>
        matchesSurname(g.name, secondSurname) ||
        // Spouse listed with same surname + a distinct given name
        (matchesSurname(g.name, firstLast.surname) &&
          !matchesSurname(g.name, firstLast.given)),
    );

    if (firstJoined && secondJoined) {
      // Positive pass — surface as info so the examiner sees the check ran.
      findings.push(
        makeFinding({
          ruleId: "R9",
          parcelApn: parcel.apn,
          evidenceInstruments: [inst.instrument_number],
          confidence: 0.9,
          placeholders: {
            outcome: "both spouses joined ✓",
            deed: inst.instrument_number,
            owner_pair: parcel.current_owner,
            action:
              "No action — joinder satisfied per A.R.S. § 25-214(C). Recorded as positive-pass confirmation.",
          },
        }),
      );
      continue;
    }

    // One spouse missing — this is the title defect.
    findings.push(
      makeFinding({
        ruleId: "R9",
        parcelApn: parcel.apn,
        evidenceInstruments: [inst.instrument_number],
        confidence: 0.85,
        placeholders: {
          outcome: "only one spouse joined — joinder defect",
          deed: inst.instrument_number,
          owner_pair: parcel.current_owner,
          action:
            "Obtain a ratification deed or quit-claim from the non-joining spouse before closing. Flag as Schedule B-II exception if unresolved.",
        },
      }),
    );
  }

  // Keep at most one positive-pass and promote the most recent defect
  // (if any) above it. Deterministic ordering: defects first, positive
  // passes collapsed to a single summary.
  const defects = findings.filter(
    (f) => !f.title.includes("both spouses joined"),
  );
  const positives = findings.filter((f) =>
    f.title.includes("both spouses joined"),
  );
  if (defects.length > 0) return defects;
  if (positives.length === 0) return [];
  // Collapse positives into a single summary that references every deed.
  const allDeeds = positives.flatMap((p) => p.evidence_instruments);
  return [
    makeFinding({
      ruleId: "R9",
      parcelApn: parcel.apn,
      evidenceInstruments: allDeeds,
      confidence: 0.9,
      placeholders: {
        outcome: `both spouses joined on all ${allDeeds.length} community conveyance${allDeeds.length === 1 ? "" : "s"} ✓`,
        deed: allDeeds.join(", "),
        owner_pair: parcel.current_owner,
        action:
          "No action — joinder satisfied per A.R.S. § 25-214(C). Recorded as positive-pass confirmation.",
      },
    }),
  ];
}

// -- Internals --

interface OwnerName {
  given: string;
  surname: string;
}

/**
 * Parse "POPHAM CHRISTOPHER / ASHLEY" into
 *   [{given: "CHRISTOPHER", surname: "POPHAM"}, "ASHLEY"].
 * Handles:
 *   "SURNAME GIVEN1 / GIVEN2"   common joint-owner form on assessor record
 *   "GIVEN1 SURNAME / GIVEN2 SURNAME" less common full form
 *
 * Returns null when not a joint pair.
 */
function splitOwnerPair(current_owner: string): [OwnerName, string] | null {
  const parts = current_owner.split("/").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const left = parts[0].split(/\s+/).filter(Boolean);
  const right = parts[1].split(/\s+/).filter(Boolean);
  if (left.length < 2 || right.length < 1) return null;
  // Assume "SURNAME GIVEN" ordering — matches assessor convention and
  // matches the five curated POPHAM instruments.
  const [surname, ...givenParts] = left;
  const given = givenParts.join(" ");
  const secondGiven =
    right.length === 1 ? right[0] : right.slice(0, -1).join(" ");
  return [{ given, surname }, secondGiven];
}
