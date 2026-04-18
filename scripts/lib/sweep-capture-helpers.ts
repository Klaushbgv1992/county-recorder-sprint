// Capture helpers — do not ship in runtime bundle.
// Invoked by scripts/capture-sweep.ts. Assumes Playwright MCP session is open
// and the operator has agreed to the serialization protocol.

import type { FailureMode, QueryResult } from "../../src/lib/custodian-query-engine.schema";

/**
 * Classify a raw public-API response into a FailureMode.
 * Pass the response body and status from a curl invocation.
 */
export function classifyPublicApiFailure(params: {
  url: string;
  httpStatus: number;
  body: string;
  partyNameAttempted: string;
}): FailureMode {
  const { url, httpStatus, body, partyNameAttempted } = params;

  if (httpStatus === 403) {
    return {
      kind: "http_403",
      http_status: 403,
      message: `403 Forbidden — public endpoint rejected the request.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  if (/cloudflare/i.test(body) || /challenge/i.test(body)) {
    return {
      kind: "cloudflare_challenge",
      http_status: httpStatus,
      message: `Cloudflare challenge page returned instead of data.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  // Heuristic: if the response is 200 with a large unfiltered result set,
  // the name filter was silently dropped.
  if (httpStatus === 200 && body.length > 1000 && !body.includes(partyNameAttempted.split(" ")[0])) {
    return {
      kind: "filter_silently_dropped",
      http_status: 200,
      message: `name filter ignored — response does not contain "${partyNameAttempted}" and result set is large.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  if (httpStatus === 404 || /no results/i.test(body)) {
    return {
      kind: "no_public_search",
      http_status: httpStatus,
      message: `endpoint does not expose a public name-search interface.`,
      captured_url: url,
      captured_response_excerpt: body.slice(0, 500),
    };
  }
  return {
    kind: "no_public_search",
    http_status: httpStatus,
    message: `unclassified public-API response — treated as no-public-search.`,
    captured_url: url,
    captured_response_excerpt: body.slice(0, 500),
  };
}

/** Parties locked by spec §2.2. */
export const PARTIES = [
  "CHRISTOPHER POPHAM",
  "ASHLEY POPHAM",
  "BRIAN J MADISON",
  "TANYA R MADISON",
  "BRIAN J AND TANYA R MADISON LIVING TRUST",
] as const;

/** The MCR legacy name-search driver is too stateful to unit-test here; the
 *  runbook calls Playwright MCP directly. This helper only classifies output. */
export type McrRawResult = {
  party: string;
  matches: { recording_number: string; recording_date: string; doc_type: string; indexed_name: string }[];
};

export function mcrRawToQueryResult(raw: McrRawResult): QueryResult {
  if (raw.matches.length === 0) return { status: "zero" };
  return {
    status: "hit",
    hits: raw.matches.map((m, i) => ({
      id: `sweep-${raw.party.split(" ")[0].toLowerCase()}-${String(i + 1).padStart(3, "0")}`,
      party_name: m.indexed_name,
      recording_number: m.recording_number,
      recording_date: m.recording_date,
      doc_type_raw: m.doc_type,
      summary: `Recorded document matched on name "${m.indexed_name}". Requires examiner judgment — may not be the same person as the chain party.`,
      ai_judgment: "requires_examiner_review",
      ai_rationale: "Automated sweep surfaced this hit; examiner must confirm identity vs chain context.",
      confidence: 0.5,
      provenance: "county_internal_index",
      action_required: "examiner-review",
    })),
  };
}
