/**
 * Synthesize a short title opinion / marketability statement for a
 * parcel from its curated chain + lifecycles + anomaly findings.
 *
 * This is the piece an abstractor actually delivers: not a list of
 * recorded instruments, but a verbal assessment of what clouds
 * exist and what to do about them before closing. Title plants
 * aggregate; they do not synthesize. This is where the county
 * product's authority over the underlying index becomes a
 * synthesis advantage.
 *
 * Approach: DETERMINISTIC rules, not an LLM call. Every sentence
 * below traces back to a specific anomaly rule_id or lifecycle
 * state. This is both testable and defensible in a title-industry
 * context — a title opinion you can't back-trace to source facts
 * is malpractice, not marketing. (A "run this through an LLM for
 * prose polish" mode would live on top; see bake-ai-summaries.ts.)
 */

import type {
  EncumbranceLifecycle,
  Instrument,
  Parcel,
} from "../types";
import type { AnomalyFinding } from "../types/anomaly";

export interface TitleOpinionInput {
  parcel: Parcel;
  instruments: Instrument[];
  lifecycles: EncumbranceLifecycle[];
  findings: AnomalyFinding[];
  asOfDate: string; // ISO YYYY-MM-DD, typically pipelineStatus.verified_through_date
}

export interface TitleOpinionClaim {
  /** Short ID so the UI can badge each sentence back to its source. */
  source_kind:
    | "lifecycle"
    | "anomaly"
    | "chain"
    | "provenance"
    | "conclusion";
  source_ref: string; // lifecycle.id / anomaly.rule_id / etc
  text: string;
  severity: "high" | "medium" | "low" | "info";
}

export interface TitleOpinion {
  /** Overall marketability judgment — the lead sentence. */
  headline:
    | "Marketable"
    | "Marketable subject to exceptions"
    | "Unmarketable — cure required"
    | "Insufficient data";
  /** Human-readable sentences, ordered: (1) status; (2) exceptions in severity order; (3) positive confirmations; (4) provenance footer. */
  claims: TitleOpinionClaim[];
  /** Machine-readable rollup: which lifecycles need examiner action. */
  open_encumbrance_ids: string[];
  /** Machine-readable rollup: findings at severity >= medium. */
  blocking_findings: string[];
  /** ISO date the opinion was synthesized against. */
  as_of: string;
}

/**
 * Render the full title opinion. Called from both the React
 * TitleOpinionPanel and (future) the commitment export.
 */
export function buildTitleOpinion(input: TitleOpinionInput): TitleOpinion {
  const { parcel, instruments, lifecycles, findings, asOfDate } = input;
  const claims: TitleOpinionClaim[] = [];

  const openLifecycles = lifecycles.filter(
    (lc) => (lc.examiner_override ?? lc.status) === "open",
  );
  const blockingFindings = findings.filter(
    (f) => f.severity === "high" || f.severity === "medium",
  );

  const unmarketable = blockingFindings.some((f) => f.severity === "high");
  const headline: TitleOpinion["headline"] = unmarketable
    ? "Unmarketable — cure required"
    : openLifecycles.length > 0 || blockingFindings.length > 0
      ? "Marketable subject to exceptions"
      : "Marketable";

  // 1. Lead sentence
  claims.push({
    source_kind: "conclusion",
    source_ref: headline.replace(/\s/g, "_").toLowerCase(),
    severity: unmarketable ? "high" : openLifecycles.length > 0 ? "medium" : "info",
    text: leadSentence({
      headline,
      parcelApn: parcel.apn,
      currentOwner: parcel.current_owner,
      asOfDate,
    }),
  });

  // 2. High-severity findings (blockers)
  for (const f of findings.filter((x) => x.severity === "high")) {
    claims.push({
      source_kind: "anomaly",
      source_ref: f.rule_id,
      severity: "high",
      text: `${f.title}. ${f.description} ${f.examiner_action}`,
    });
  }

  // 3. Open lifecycles not already covered by a high-severity anomaly
  const openRootsCoveredByAnomaly = new Set(
    findings
      .filter((f) => f.severity === "high")
      .flatMap((f) => f.evidence_instruments),
  );
  for (const lc of openLifecycles) {
    if (openRootsCoveredByAnomaly.has(lc.root_instrument)) continue;
    const root = instruments.find((i) => i.instrument_number === lc.root_instrument);
    if (!root) continue;
    claims.push({
      source_kind: "lifecycle",
      source_ref: lc.id,
      severity: "medium",
      text: describeOpenLifecycle(lc, root),
    });
  }

  // 4. Medium-severity findings (non-blocking nuances — MERS, assignment
  //    chain breaks). One sentence each.
  for (const f of findings.filter((x) => x.severity === "medium")) {
    claims.push({
      source_kind: "anomaly",
      source_ref: f.rule_id,
      severity: "medium",
      text: `${f.title}. ${f.description}`,
    });
  }

  // 5. Positive confirmations — R9 pass, no chain gap, community-property
  //    joinder satisfied. These read as "✓ X cleared" and are important
  //    in a title opinion precisely because absence-of-checks is a
  //    recurring source of claims.
  for (const f of findings.filter((x) => x.severity === "info")) {
    // Skip R7 same-name-suppressed info because it's a corpus footnote,
    // not a parcel-specific confirmation.
    if (f.rule_id === "R7") continue;
    claims.push({
      source_kind: "anomaly",
      source_ref: f.rule_id,
      severity: "info",
      text: `${f.title}. ${f.examiner_action}`,
    });
  }

  // 6. Provenance footer — makes it legible that the opinion is
  //    traceable to sources, not AI prose.
  const provenance = countProvenance(instruments);
  claims.push({
    source_kind: "provenance",
    source_ref: "corpus",
    severity: "info",
    text: `Synthesized from ${instruments.length} curated instruments (${provenance.public_api_count} county-API + ${provenance.ocr_count} OCR'd + ${provenance.manual_entry_count} hand-curated fields) and ${findings.length} applied anomaly-rule findings, as of ${asOfDate}. Every claim above traces to a specific lifecycle ID or rule ID.`,
  });

  return {
    headline,
    claims,
    open_encumbrance_ids: openLifecycles.map((lc) => lc.id),
    blocking_findings: blockingFindings.map((f) => f.rule_id),
    as_of: asOfDate,
  };
}

function leadSentence(args: {
  headline: TitleOpinion["headline"];
  parcelApn: string;
  currentOwner: string;
  asOfDate: string;
}): string {
  const who = args.currentOwner;
  switch (args.headline) {
    case "Marketable":
      return `Title to APN ${args.parcelApn} in ${who} is marketable as of ${args.asOfDate}, with no open encumbrances and no high-severity defects detected in the curated chain.`;
    case "Marketable subject to exceptions":
      return `Title to APN ${args.parcelApn} in ${who} is marketable as of ${args.asOfDate}, subject to the exceptions below. Examiner should resolve each open item or carry it as a Schedule B-II exception at closing.`;
    case "Unmarketable — cure required":
      return `Title to APN ${args.parcelApn} in ${who} is not presently marketable as of ${args.asOfDate}. At least one high-severity defect must be cured of record before a clear title policy can issue.`;
    case "Insufficient data":
      return `Title to APN ${args.parcelApn} cannot be assessed for marketability on the available record as of ${args.asOfDate}.`;
  }
}

function describeOpenLifecycle(lc: EncumbranceLifecycle, root: Instrument): string {
  const kind = prettyDocKind(root.document_type_raw);
  return `Open lifecycle ${lc.id} — ${kind} recorded ${root.recording_date} (${root.instrument_number}) has no recorded release in the curated corpus. ${lc.status_rationale} Resolve before closing or carry as a Schedule B-II exception.`.replace(
    /\s+/g,
    " ",
  );
}

function prettyDocKind(raw: string): string {
  const upper = (raw ?? "").toUpperCase();
  if (upper.startsWith("FED TAX L")) return "Federal tax lien (NFTL)";
  if (upper.startsWith("STATE TAX L")) return "State tax lien";
  if (upper.startsWith("JUDG LIEN")) return "Judgment lien";
  if (upper.startsWith("MECH LIEN")) return "Mechanic's lien";
  if (upper.startsWith("MED LIEN")) return "Medical lien";
  if (upper.startsWith("HOA LIEN")) return "HOA assessment lien";
  if (upper.startsWith("DEED TRST")) return "Deed of Trust";
  if (upper.startsWith("WAR DEED")) return "Warranty Deed";
  if (upper.startsWith("REL")) return "Release";
  return raw || "instrument";
}

function countProvenance(instruments: Instrument[]): {
  public_api_count: number;
  ocr_count: number;
  manual_entry_count: number;
} {
  let public_api_count = 0;
  let ocr_count = 0;
  let manual_entry_count = 0;
  for (const i of instruments) {
    const s = i.provenance_summary;
    if (!s) continue;
    public_api_count += s.public_api_count;
    ocr_count += s.ocr_count;
    manual_entry_count += s.manual_entry_count;
  }
  return { public_api_count, ocr_count, manual_entry_count };
}
