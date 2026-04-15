import type { AnomalyFinding } from "../types/anomaly";
import type { BIItem, TransactionInputs } from "../types/commitment";
import type {
  Parcel,
  Instrument,
  EncumbranceLifecycle,
} from "../types";
import templatesJson from "../data/schedule-bi-templates.json";

// County treasurer name is currently hardcoded for this demo. When the
// prototype grows past Maricopa, this should key off parcel.state or a
// county field on the parcel record.
const COUNTY_TREASURER = "Maricopa County Treasurer";

const TRUST_RE = /\bTRUST\b/i;

interface Template {
  template_id: string;
  text: string;
  why_template: string;
}

const TEMPLATES: Template[] = (templatesJson as { templates: Template[] })
  .templates;

function getTemplate(templateId: string): Template {
  const t = TEMPLATES.find((x) => x.template_id === templateId);
  if (!t) {
    throw new Error(`Unknown B-I template_id: ${templateId}`);
  }
  return t;
}

/**
 * Replace all `{name}` tokens in `template` with values from `placeholders`.
 * Missing keys are left as-is (callers should not rely on this; tests assert
 * no `{foo}` leaks into output).
 */
function interpolate(
  template: string,
  placeholders: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    if (key in placeholders) return placeholders[key];
    return `{${key}}`;
  });
}

export interface GenerateInput {
  apn: string;
  lifecycles: EncumbranceLifecycle[];
  anomalies: AnomalyFinding[];
  instruments: Instrument[];
  parcel: Parcel;
  inputs: TransactionInputs;
}

interface StagedItem {
  template_id: string;
  text_placeholders: Record<string, string>;
  why_placeholders: Record<string, string>;
  origin_anomaly_id: string | null;
  origin_lifecycle_id: string | null;
}

/**
 * Pure function — deterministically produces the Schedule B-I (Requirements)
 * items for a commitment given the parcel context and transaction inputs.
 *
 * Emission order (stable, category-grouped):
 *   1. BI-PAYOFF-OPEN-DOT     — one per open DOT-rooted lifecycle
 *   2. BI-ASSIGNMENT-VERIFY   — one per R4 finding
 *   3. BI-TRUST-CERT          — one per R5 finding
 *   4. BI-CURATIVE-AFFIDAVIT  — one per R3 finding
 *   5. BI-HOA-ESTOPPEL        — iff parcel.subdivision is non-empty
 *   6. BI-TAX-CERT            — always, once
 *
 * `item_id` is `"{template_id}-{seq}"` where seq is a 1-based counter
 * within the same template_id, so two payoff items become
 * `BI-PAYOFF-OPEN-DOT-1` and `BI-PAYOFF-OPEN-DOT-2`. This keeps the IDs
 * stable across re-runs with the same input.
 */
export function generateScheduleBI(input: GenerateInput): BIItem[] {
  const { apn, lifecycles, anomalies, instruments, parcel, inputs } = input;
  const staged: StagedItem[] = [];

  const byNumber = new Map(instruments.map((i) => [i.instrument_number, i]));

  // 1. BI-PAYOFF-OPEN-DOT — one per open DOT-rooted lifecycle.
  for (const lc of lifecycles) {
    if (lc.status !== "open") continue;
    const root = byNumber.get(lc.root_instrument);
    if (!root) continue;
    if (root.document_type !== "deed_of_trust") continue;

    const mersNominee = root.parties.find(
      (p) => p.role === "nominee" && p.nominee_for?.party_name,
    );
    const beneficiaryParty = root.parties.find(
      (p) => p.role === "beneficiary" && !p.nominee_for,
    );
    const lenderParty = root.parties.find((p) => p.role === "lender");

    let currentBeneficiary: string;
    if (mersNominee?.nominee_for?.party_name) {
      currentBeneficiary = mersNominee.nominee_for.party_name;
    } else if (beneficiaryParty) {
      currentBeneficiary = beneficiaryParty.name;
    } else if (lenderParty) {
      currentBeneficiary = lenderParty.name;
    } else {
      currentBeneficiary = "Current note holder (identity pending verification)";
    }

    const placeholders: Record<string, string> = {
      current_beneficiary: currentBeneficiary,
      instrument_number: root.instrument_number,
      recording_date: root.recording_date,
      lifecycle_id: lc.id,
      effective_date: inputs.effective_date,
    };

    staged.push({
      template_id: "BI-PAYOFF-OPEN-DOT",
      text_placeholders: placeholders,
      why_placeholders: placeholders,
      origin_anomaly_id: null,
      origin_lifecycle_id: lc.id,
    });
  }

  // 2. BI-ASSIGNMENT-VERIFY — one per R4 finding.
  for (const f of anomalies) {
    if (f.rule_id !== "R4") continue;
    const firstEvidence = f.evidence_instruments[0] ?? "unknown";
    const root = byNumber.get(firstEvidence);
    const releaseEvidence = f.evidence_instruments[1];
    const release = releaseEvidence ? byNumber.get(releaseEvidence) : undefined;

    const originatorParty =
      root?.parties.find((p) => p.role === "lender") ??
      root?.parties.find((p) => p.role === "beneficiary" && !p.nominee_for);
    const originator = originatorParty?.name ?? "original beneficiary";

    const releaserParty =
      release?.parties.find((p) => p.role === "releasing_party") ??
      release?.parties.find((p) => p.role === "beneficiary" && !p.nominee_for);
    const currentHolder = releaserParty?.name ?? "current note holder";

    const anomalyId = `R4-${apn}-${firstEvidence}`;
    const textPlaceholders: Record<string, string> = {
      originator,
      current_holder: currentHolder,
      instrument_number: firstEvidence,
    };
    const whyPlaceholders: Record<string, string> = {
      anomaly_id: anomalyId,
      anomaly_title: f.title,
    };

    staged.push({
      template_id: "BI-ASSIGNMENT-VERIFY",
      text_placeholders: textPlaceholders,
      why_placeholders: whyPlaceholders,
      origin_anomaly_id: anomalyId,
      origin_lifecycle_id: null,
    });
  }

  // 3. BI-TRUST-CERT — one per R5 finding.
  for (const f of anomalies) {
    if (f.rule_id !== "R5") continue;
    const firstEvidence = f.evidence_instruments[0] ?? "unknown";
    const inst = byNumber.get(firstEvidence);
    const trustGrantor = inst?.parties.find(
      (p) => p.role === "grantor" && TRUST_RE.test(p.name),
    );
    const trustName = trustGrantor?.name ?? "trust grantor";
    const anomalyId = `R5-${apn}-${firstEvidence}`;

    staged.push({
      template_id: "BI-TRUST-CERT",
      text_placeholders: { trust_name: trustName },
      why_placeholders: { anomaly_id: anomalyId, anomaly_title: f.title },
      origin_anomaly_id: anomalyId,
      origin_lifecycle_id: null,
    });
  }

  // 4. BI-CURATIVE-AFFIDAVIT — one per R3 finding.
  for (const f of anomalies) {
    if (f.rule_id !== "R3") continue;
    const firstEvidence = f.evidence_instruments[0] ?? "unknown";
    const anomalyId = `R3-${apn}-${firstEvidence}`;
    const summary =
      "MERS-as-nominee beneficiary with release executed by a party other than the originating lender (possible off-record note transfer)";

    staged.push({
      template_id: "BI-CURATIVE-AFFIDAVIT",
      text_placeholders: {
        grantor_name: parcel.current_owner,
        chain_anomaly_summary: summary,
        effective_date: inputs.effective_date,
      },
      why_placeholders: { anomaly_id: anomalyId },
      origin_anomaly_id: anomalyId,
      origin_lifecycle_id: null,
    });
  }

  // 5. BI-HOA-ESTOPPEL — iff parcel.subdivision is non-empty.
  if (parcel.subdivision && parcel.subdivision.trim() !== "") {
    const subdivisionName = parcel.subdivision;
    const placeholders: Record<string, string> = {
      hoa_name: `${subdivisionName} HOA`,
      subdivision_name: subdivisionName,
      effective_date: inputs.effective_date,
    };
    staged.push({
      template_id: "BI-HOA-ESTOPPEL",
      text_placeholders: placeholders,
      why_placeholders: placeholders,
      origin_anomaly_id: null,
      origin_lifecycle_id: null,
    });
  }

  // 6. BI-TAX-CERT — always emit, once.
  {
    const placeholders: Record<string, string> = {
      county_treasurer: COUNTY_TREASURER,
      effective_date: inputs.effective_date,
    };
    staged.push({
      template_id: "BI-TAX-CERT",
      text_placeholders: placeholders,
      why_placeholders: placeholders,
      origin_anomaly_id: null,
      origin_lifecycle_id: null,
    });
  }

  // Assign per-template 1-based sequence numbers and render.
  const seqCounters = new Map<string, number>();
  const items: BIItem[] = [];
  for (const s of staged) {
    const next = (seqCounters.get(s.template_id) ?? 0) + 1;
    seqCounters.set(s.template_id, next);
    const template = getTemplate(s.template_id);
    items.push({
      item_id: `${s.template_id}-${next}`,
      text: interpolate(template.text, s.text_placeholders),
      why: interpolate(template.why_template, s.why_placeholders),
      template_id: s.template_id,
      origin_anomaly_id: s.origin_anomaly_id,
      origin_lifecycle_id: s.origin_lifecycle_id,
    });
  }

  return items;
}
