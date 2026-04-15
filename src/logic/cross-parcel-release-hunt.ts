import staffIndex from "../data/staff-index.json";
import pipelineState from "../data/pipeline-state.json";
import { currentFreshness } from "./pipeline-selectors";
import type { StaffIndexRow } from "./staff-search";
import type { PipelineState } from "./pipeline-selectors";

const RELEASE_CODES = /RELEASE|RECONVEYANCE|REL D\/T/i;

export interface HuntInput {
  lifecycle_id: string;
  parcel_apn: string;
  borrower_names: string[];
}

export interface HuntResult {
  lifecycle_id: string;
  scanned_party_count: number;
  candidates: StaffIndexRow[];
  verified_through: string;
}

export function huntCrossParcelRelease(input: HuntInput): HuntResult {
  const rows = staffIndex as unknown as StaffIndexRow[];
  const normalized = input.borrower_names.map((n) => n.toUpperCase());
  const matched = rows.filter(
    (r) =>
      RELEASE_CODES.test(r.document_type) &&
      r.names.some((n) =>
        normalized.some((bn) => n.toUpperCase().includes(bn)),
      ) &&
      r.attributed_parcel_apn !== input.parcel_apn,
  );
  const surnames = new Set(normalized.map((n) => n.split(" ")[0]));
  const scannedPartyCount = rows.filter((r) =>
    r.names.some((n) => surnames.has(n.split(" ")[0]?.toUpperCase())),
  ).length;
  return {
    lifecycle_id: input.lifecycle_id,
    scanned_party_count: scannedPartyCount,
    candidates: matched,
    verified_through: currentFreshness(pipelineState as unknown as PipelineState)
      .curator,
  };
}
