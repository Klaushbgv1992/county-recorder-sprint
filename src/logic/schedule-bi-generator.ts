import type { AnomalyFinding } from "../types/anomaly";
import type { BIItem, TransactionInputs } from "../types/commitment";
import { getBuyerOrBorrower, getNewLender } from "../types/commitment";
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
  verifiedThrough?: string;
}

interface StagedItem {
  template_id: string;
  text_placeholders: Record<string, string>;
  why_placeholders: Record<string, string>;
  origin_anomaly_id: string | null;
  origin_lifecycle_id: string | null;
}

// ---------------------------------------------------------------------------
// Helper: resolve the beneficiary name from a DOT instrument's parties
// ---------------------------------------------------------------------------
function resolveBeneficiary(root: Instrument): string {
  const mersNominee = root.parties.find(
    (p) => p.role === "nominee" && p.nominee_for?.party_name,
  );
  const beneficiaryParty = root.parties.find(
    (p) => p.role === "beneficiary" && !p.nominee_for,
  );
  const lenderParty = root.parties.find((p) => p.role === "lender");

  if (mersNominee?.nominee_for?.party_name) {
    return mersNominee.nominee_for.party_name;
  } else if (beneficiaryParty) {
    return beneficiaryParty.name;
  } else if (lenderParty) {
    return lenderParty.name;
  }
  return "Current note holder (identity pending verification)";
}

// ---------------------------------------------------------------------------
// Emit helpers — each pushes staged items and returns nothing
// ---------------------------------------------------------------------------

function emitPayoffAllOpenDots(
  staged: StagedItem[],
  lifecycles: EncumbranceLifecycle[],
  byNumber: Map<string, Instrument>,
  inputs: TransactionInputs,
): void {
  for (const lc of lifecycles) {
    if (lc.status === "released") continue;
    const root = byNumber.get(lc.root_instrument);
    if (!root) continue;
    if (root.document_type !== "deed_of_trust") continue;

    const currentBeneficiary = resolveBeneficiary(root);
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
}

function emitPayoffSpecificDot(
  staged: StagedItem[],
  lifecycles: EncumbranceLifecycle[],
  byNumber: Map<string, Instrument>,
  lifecycleId: string,
  inputs: TransactionInputs,
  action: string,
): void {
  const lc = lifecycles.find((l) => l.id === lifecycleId);
  if (!lc) return;
  const root = byNumber.get(lc.root_instrument);
  if (!root) return;

  const currentBeneficiary = resolveBeneficiary(root);
  const placeholders: Record<string, string> = {
    current_beneficiary: currentBeneficiary,
    instrument_number: root.instrument_number,
    recording_date: root.recording_date,
    lifecycle_id: lc.id,
    effective_date: inputs.effective_date,
    action,
    transaction_type: inputs.transaction_type,
  };

  staged.push({
    template_id: "BI-PAYOFF-SPECIFIC-DOT",
    text_placeholders: placeholders,
    why_placeholders: placeholders,
    origin_anomaly_id: null,
    origin_lifecycle_id: lc.id,
  });
}

function emitRecordWarrantyDeed(
  staged: StagedItem[],
  inputs: TransactionInputs,
): void {
  if (inputs.transaction_type !== "purchase" && inputs.transaction_type !== "cash_sale") return;
  const placeholders: Record<string, string> = {
    seller: inputs.sellers,
    buyer: inputs.buyers,
    transaction_type: inputs.transaction_type,
  };
  staged.push({
    template_id: "BI-RECORD-WARRANTY-DEED",
    text_placeholders: placeholders,
    why_placeholders: placeholders,
    origin_anomaly_id: null,
    origin_lifecycle_id: null,
  });
}

function emitRecordNewDot(
  staged: StagedItem[],
  inputs: TransactionInputs,
): void {
  const newLender = getNewLender(inputs);
  if (!newLender) return;
  const borrower = getBuyerOrBorrower(inputs);
  let loanAmount: string;
  switch (inputs.transaction_type) {
    case "purchase":
      loanAmount = inputs.loan_amount;
      break;
    case "refinance":
      loanAmount = inputs.new_loan_amount;
      break;
    case "second_dot":
      loanAmount = inputs.loan_amount;
      break;
    case "heloc":
      loanAmount = inputs.credit_limit;
      break;
    default:
      return;
  }
  const placeholders: Record<string, string> = {
    new_lender: newLender,
    loan_amount: loanAmount,
    borrower,
    transaction_type: inputs.transaction_type,
  };
  staged.push({
    template_id: "BI-RECORD-NEW-DOT",
    text_placeholders: placeholders,
    why_placeholders: placeholders,
    origin_anomaly_id: null,
    origin_lifecycle_id: null,
  });
}

function emitSubordination(
  staged: StagedItem[],
  lifecycles: EncumbranceLifecycle[],
  byNumber: Map<string, Instrument>,
  excludeLifecycleId: string,
): void {
  for (const lc of lifecycles) {
    if (lc.status === "released") continue;
    if (lc.id === excludeLifecycleId) continue;
    const root = byNumber.get(lc.root_instrument);
    if (!root) continue;
    if (root.document_type !== "deed_of_trust") continue;

    const beneficiary = resolveBeneficiary(root);
    const placeholders: Record<string, string> = {
      junior_lender: beneficiary,
      junior_instrument: root.instrument_number,
      junior_lifecycle_id: lc.id,
      target_position: "first",
    };
    staged.push({
      template_id: "BI-SUBORDINATION",
      text_placeholders: placeholders,
      why_placeholders: placeholders,
      origin_anomaly_id: null,
      origin_lifecycle_id: lc.id,
    });
  }
}

function emitVerifyFirstPosition(
  staged: StagedItem[],
  lifecycles: EncumbranceLifecycle[],
  byNumber: Map<string, Instrument>,
  firstPositionLifecycleId: string,
  inputs: TransactionInputs,
): void {
  const lc = lifecycles.find((l) => l.id === firstPositionLifecycleId);
  if (!lc) return;
  const root = byNumber.get(lc.root_instrument);
  if (!root) return;

  const placeholders: Record<string, string> = {
    instrument_number: root.instrument_number,
    recording_date: root.recording_date,
    lifecycle_id: lc.id,
    transaction_type: inputs.transaction_type,
  };
  staged.push({
    template_id: "BI-VERIFY-FIRST-POSITION",
    text_placeholders: placeholders,
    why_placeholders: placeholders,
    origin_anomaly_id: null,
    origin_lifecycle_id: lc.id,
  });
}

function emitTerminateExistingHeloc(
  staged: StagedItem[],
  lifecycles: EncumbranceLifecycle[],
  byNumber: Map<string, Instrument>,
  helocLifecycleId: string | null,
  inputs: TransactionInputs,
): void {
  if (!helocLifecycleId) return;
  const lc = lifecycles.find((l) => l.id === helocLifecycleId);
  if (!lc) return;
  const root = byNumber.get(lc.root_instrument);
  if (!root) return;

  const beneficiary = resolveBeneficiary(root);
  const placeholders: Record<string, string> = {
    instrument_number: root.instrument_number,
    lifecycle_id: lc.id,
    beneficiary,
    transaction_type: inputs.transaction_type,
  };
  staged.push({
    template_id: "BI-TERMINATE-EXISTING-HELOC",
    text_placeholders: placeholders,
    why_placeholders: placeholders,
    origin_anomaly_id: null,
    origin_lifecycle_id: lc.id,
  });
}

function emitSellerAuthority(
  staged: StagedItem[],
  parcel: Parcel,
  instruments: Instrument[],
): void {
  if (!TRUST_RE.test(parcel.current_owner)) return;

  // Find the trust instrument recording number by looking for an instrument
  // whose parties include a trust name matching current_owner.
  let trustInstrumentNumber = "pending";
  for (const inst of instruments) {
    for (const p of inst.parties) {
      if (TRUST_RE.test(p.name) && p.name.includes(parcel.current_owner.split(" ")[0])) {
        trustInstrumentNumber = inst.instrument_number;
        break;
      }
    }
    if (trustInstrumentNumber !== "pending") break;
  }

  const placeholders: Record<string, string> = {
    trust_name: parcel.current_owner,
    trust_instrument_number: trustInstrumentNumber,
  };
  staged.push({
    template_id: "BI-SELLER-AUTHORITY-TRUST",
    text_placeholders: placeholders,
    why_placeholders: placeholders,
    origin_anomaly_id: null,
    origin_lifecycle_id: null,
  });
}

function emitAnomalyItems(
  staged: StagedItem[],
  apn: string,
  anomalies: AnomalyFinding[],
  byNumber: Map<string, Instrument>,
  parcel: Parcel,
  inputs: TransactionInputs,
): void {
  // R4: BI-ASSIGNMENT-VERIFY
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
    staged.push({
      template_id: "BI-ASSIGNMENT-VERIFY",
      text_placeholders: {
        originator,
        current_holder: currentHolder,
        instrument_number: firstEvidence,
      },
      why_placeholders: {
        anomaly_id: anomalyId,
        anomaly_title: f.title,
      },
      origin_anomaly_id: anomalyId,
      origin_lifecycle_id: null,
    });
  }

  // R5: BI-TRUST-CERT
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

  // R3: BI-CURATIVE-AFFIDAVIT
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
}

function emitHoaEstoppel(
  staged: StagedItem[],
  parcel: Parcel,
  inputs: TransactionInputs,
): void {
  if (!parcel.subdivision || parcel.subdivision.trim() === "") return;
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

function emitTaxCert(
  staged: StagedItem[],
  inputs: TransactionInputs,
): void {
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

function emitBringDown(
  staged: StagedItem[],
  verifiedThrough: string | undefined,
): void {
  const placeholders: Record<string, string> = {
    verified_through: verifiedThrough ?? "corpus boundary date",
  };
  staged.push({
    template_id: "BI-BRING-DOWN-SEARCH",
    text_placeholders: placeholders,
    why_placeholders: placeholders,
    origin_anomaly_id: null,
    origin_lifecycle_id: null,
  });
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Pure function — deterministically produces the Schedule B-I (Requirements)
 * items for a commitment given the parcel context and transaction inputs.
 *
 * Per-type emission logic:
 *   purchase:   payoff ALL open DOTs + warranty deed + new DOT + seller-authority
 *               (if trust) + anomaly items + HOA estoppel + tax cert + bring-down
 *   refinance:  payoff SPECIFIC DOT + new DOT + subordination of other open DOTs
 *               + anomaly items + tax cert + bring-down
 *   second_dot: new DOT + verify first-position + anomaly items + tax cert + bring-down
 *   heloc:      new DOT + verify first-position + terminate existing HELOC (optional)
 *               + anomaly items + tax cert + bring-down
 *   cash_sale:  payoff ALL open DOTs + warranty deed + seller-authority (if trust)
 *               + anomaly items + HOA estoppel + tax cert + bring-down
 *
 * `item_id` is `"{template_id}-{seq}"` where seq is a 1-based counter
 * within the same template_id.
 */
export function generateScheduleBI(input: GenerateInput): BIItem[] {
  const { apn, lifecycles, anomalies, instruments, parcel, inputs, verifiedThrough } = input;
  const staged: StagedItem[] = [];
  const byNumber = new Map(instruments.map((i) => [i.instrument_number, i]));

  switch (inputs.transaction_type) {
    case "purchase": {
      emitPayoffAllOpenDots(staged, lifecycles, byNumber, inputs);
      emitRecordWarrantyDeed(staged, inputs);
      emitRecordNewDot(staged, inputs);
      emitSellerAuthority(staged, parcel, instruments);
      emitAnomalyItems(staged, apn, anomalies, byNumber, parcel, inputs);
      emitHoaEstoppel(staged, parcel, inputs);
      emitTaxCert(staged, inputs);
      emitBringDown(staged, verifiedThrough);
      break;
    }
    case "refinance": {
      emitPayoffSpecificDot(staged, lifecycles, byNumber, inputs.existing_dot_lifecycle_id, inputs, "refinanced");
      emitRecordNewDot(staged, inputs);
      emitSubordination(staged, lifecycles, byNumber, inputs.existing_dot_lifecycle_id);
      emitAnomalyItems(staged, apn, anomalies, byNumber, parcel, inputs);
      emitTaxCert(staged, inputs);
      emitBringDown(staged, verifiedThrough);
      break;
    }
    case "second_dot": {
      emitRecordNewDot(staged, inputs);
      emitVerifyFirstPosition(staged, lifecycles, byNumber, inputs.first_position_lifecycle_id, inputs);
      emitAnomalyItems(staged, apn, anomalies, byNumber, parcel, inputs);
      emitTaxCert(staged, inputs);
      emitBringDown(staged, verifiedThrough);
      break;
    }
    case "heloc": {
      emitRecordNewDot(staged, inputs);
      emitVerifyFirstPosition(staged, lifecycles, byNumber, inputs.first_position_lifecycle_id, inputs);
      emitTerminateExistingHeloc(staged, lifecycles, byNumber, inputs.existing_heloc_lifecycle_id, inputs);
      emitAnomalyItems(staged, apn, anomalies, byNumber, parcel, inputs);
      emitTaxCert(staged, inputs);
      emitBringDown(staged, verifiedThrough);
      break;
    }
    case "cash_sale": {
      emitPayoffAllOpenDots(staged, lifecycles, byNumber, inputs);
      emitRecordWarrantyDeed(staged, inputs);
      emitSellerAuthority(staged, parcel, instruments);
      emitAnomalyItems(staged, apn, anomalies, byNumber, parcel, inputs);
      emitHoaEstoppel(staged, parcel, inputs);
      emitTaxCert(staged, inputs);
      emitBringDown(staged, verifiedThrough);
      break;
    }
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
