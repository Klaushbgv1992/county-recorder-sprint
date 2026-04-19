import type { Instrument } from "../types";
import type { AnomalyFinding } from "../types/anomaly";

// ---------------------------------------------------------------------------
// computeTimeAxisDomain
// ---------------------------------------------------------------------------

export function computeTimeAxisDomain(
  instruments: Instrument[],
  verifiedThroughDate?: string,
): [string, string] | [null, null] {
  if (instruments.length === 0) return [null, null];
  let minT = Infinity;
  let maxT = -Infinity;
  for (const i of instruments) {
    const t = new Date(i.recording_date).getTime();
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
  }
  if (verifiedThroughDate) {
    const vt = new Date(verifiedThroughDate).getTime();
    if (!Number.isNaN(vt) && vt > maxT) maxT = vt;
  }
  const minYear = new Date(minT).getUTCFullYear();
  const maxYear = new Date(maxT).getUTCFullYear();
  return [`${minYear}-01-01`, `${maxYear + 1}-01-01`];
}

// ---------------------------------------------------------------------------
// computeNodeX
// ---------------------------------------------------------------------------

export function computeNodeX(
  date: string,
  domain: [string, string],
  pxWidth: number,
): number {
  const t = new Date(date).getTime();
  const t0 = new Date(domain[0]).getTime();
  const t1 = new Date(domain[1]).getTime();
  if (t <= t0) return 0;
  if (t >= t1) return pxWidth;
  return ((t - t0) / (t1 - t0)) * pxWidth;
}

// ---------------------------------------------------------------------------
// groupSameDayInstruments
// ---------------------------------------------------------------------------

export type SwimlaneNode =
  | { kind: "single"; instrument: Instrument }
  | { kind: "composite"; date: string; instruments: Instrument[] };

export function groupSameDayInstruments(instruments: Instrument[]): SwimlaneNode[] {
  const byDate = new Map<string, Instrument[]>();
  const order: string[] = [];
  for (const i of instruments) {
    const d = i.recording_date;
    if (!byDate.has(d)) {
      byDate.set(d, []);
      order.push(d);
    }
    byDate.get(d)!.push(i);
  }
  return order.map((d) => {
    const list = byDate.get(d)!;
    return list.length === 1
      ? { kind: "single", instrument: list[0] }
      : { kind: "composite", date: d, instruments: list };
  });
}

// ---------------------------------------------------------------------------
// detectMersGap
// ---------------------------------------------------------------------------

export interface MersGap {
  dot_instrument: string;
  release_instrument: string;
  originator: string;
  releaser: string;
  /**
   * Optional servicing-agent string extracted from the release instrument's
   * `mers_note` field (e.g. "CAS Nationwide Title Clearing"). Only present
   * when the note explicitly names the executing agent. Rendered as a
   * subtitle on the MersCallout so the ribbon surfaces the disintermediation
   * chain the way the instrument body describes it.
   */
  via: string | null;
  rule_finding: AnomalyFinding;
}

/**
 * Parse the optional "via X" clause out of a release instrument's
 * `mers_note` field. We match "executed by Y via Z," or similar
 * servicing-agent phrasing and return the trimmed agent name. Returns
 * null when the note is missing, empty, or doesn't contain the pattern.
 *
 * Exported for unit testing of the mers_note → ribbon wiring.
 */
export function extractMersVia(mersNote: string | undefined): string | null {
  if (!mersNote) return null;
  // "executed by <releaser> via <agent>," / ". " / " and " / EOS
  const match = /executed by [^.]+?\bvia\b\s+([^,.]+?)(?=[,.]|\s+and\s|$)/i.exec(
    mersNote,
  );
  if (!match) return null;
  return match[1].trim().replace(/,$/, "");
}

/**
 * Regex that parses the R3 `description_template` emitted by
 * `src/data/anomaly-rules.json` after placeholder substitution.
 *
 * Source of truth: the `description_template` field of the R3 rule entry.
 * Positional contract: `evidence_instruments[0]` is the DOT and
 * `evidence_instruments[1]` is the release — matching the order in which
 * `src/logic/rules/r3-mers-nominee.ts` pushes items into the finding.
 * Fallback: `detectMersGap` returns `null` if no matching R3 finding exists
 * or if this regex fails to match. UI components must degrade gracefully —
 * render DOT → release with a solid connector and no callout.
 */
const R3_DESC_RE =
  /names MERS as beneficiary as nominee for (.+?)\. Release was executed by (.+?), not/;

/**
 * Extracts MERS-gap metadata from the R3 finding for `dotInstrumentNumber`.
 * See `R3_DESC_RE` for the coupling contract.
 *
 * When `instruments` is supplied, the release instrument's `mers_note` is
 * parsed for a "via <agent>" clause (see `extractMersVia`) and returned as
 * `MersGap.via`. Omitting `instruments` is still valid — `via` is just null,
 * and the ribbon renders originator → MERS → releaser without a subtitle.
 */
export function detectMersGap(
  dotInstrumentNumber: string,
  findings: AnomalyFinding[],
  instruments?: Instrument[],
): MersGap | null {
  const finding = findings.find(
    (f) =>
      f.rule_id === "R3" &&
      f.evidence_instruments[0] === dotInstrumentNumber,
  );
  if (!finding) return null;
  const match = R3_DESC_RE.exec(finding.description);
  if (!match) return null;
  const releaseInstrumentNumber = finding.evidence_instruments[1];
  const releaseInstrument = instruments?.find(
    (i) => i.instrument_number === releaseInstrumentNumber,
  );
  return {
    dot_instrument: dotInstrumentNumber,
    release_instrument: releaseInstrumentNumber,
    originator: match[1],
    releaser: match[2],
    via: extractMersVia(releaseInstrument?.mers_note),
    rule_finding: finding,
  };
}

// ---------------------------------------------------------------------------
// layoutNodesWithCollisionAvoidance
// ---------------------------------------------------------------------------

export interface NodeLayoutInput {
  axisX: number;
}
export interface NodeLayoutOutput {
  axisX: number;
  visualX: number;
  leader: boolean;
}

/**
 * Resolve horizontal collisions among same-swimlane nodes by nudging each
 * colliding node to the right of the previous node + minSpacing, and flagging
 * those that were nudged so the renderer can draw a leader line back to the
 * true axis position.
 *
 * Input nodes are assumed to be in chronological order (caller's
 * responsibility — same as groupSameDayInstruments).
 */
export function layoutNodesWithCollisionAvoidance(
  nodes: NodeLayoutInput[],
  minSpacing: number,
): NodeLayoutOutput[] {
  const out: NodeLayoutOutput[] = [];
  let prevVisualX = -Infinity;
  for (const n of nodes) {
    const minVisualX = prevVisualX + minSpacing;
    const collided = n.axisX < minVisualX;
    const visualX = collided ? minVisualX : n.axisX;
    out.push({ axisX: n.axisX, visualX, leader: collided });
    prevVisualX = visualX;
  }
  return out;
}

// ---------------------------------------------------------------------------
// resolveMatcherSlotState
// ---------------------------------------------------------------------------

export type MatcherSlotState =
  | "closed"
  | "expanded-fan"
  | "expanded-empty-with-scan"
  | "collapsed-pill";

export interface ResolveMatcherSlotStateInput {
  rowsCount: number;
  scannedPartyCount: number;
  hasAcceptedRelease: boolean;
}

export function resolveMatcherSlotState(
  input: ResolveMatcherSlotStateInput,
): MatcherSlotState {
  if (input.hasAcceptedRelease) return "closed";
  if (input.rowsCount > 0) return "expanded-fan";
  if (input.scannedPartyCount > 0) return "expanded-empty-with-scan";
  return "collapsed-pill";
}
