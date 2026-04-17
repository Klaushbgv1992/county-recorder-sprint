import { useMemo, useState } from "react";
import type {
  Instrument,
  Parcel,
  DocumentLink,
  EncumbranceLifecycle,
} from "../types";
import {
  buildCandidateRows,
  buildEmptyStateRationale,
  candidateKey,
  type CandidateAction,
  type CandidateRow,
} from "../logic/release-candidate-matcher";
import { getReleasingParties, getTrustors } from "../logic/party-roles";
import {
  huntCrossParcelRelease,
  type HuntResult,
} from "../logic/cross-parcel-release-hunt";

interface Props {
  lifecycleId: string;
  dot: Instrument;
  parcel: Parcel;
  pool: Instrument[];
  releaseLinks: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  candidateActions: Record<string, CandidateAction>;
  onSetCandidateAction: (
    key: string,
    action: CandidateAction,
    candidate: Instrument,
    score: number,
  ) => void;
  onOpenDocument: (instrumentNumber: string) => void;
}

function FeatureBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-28 text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-1.5 overflow-hidden">
        <div
          className="bg-indigo-500 h-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right tabular-nums text-gray-700">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function CandidateRowView({
  row,
  lifecycleId,
  onSetCandidateAction,
  onOpenDocument,
}: {
  row: CandidateRow;
  lifecycleId: string;
  onSetCandidateAction: Props["onSetCandidateAction"];
  onOpenDocument: Props["onOpenDocument"];
}) {
  const key = candidateKey(lifecycleId, row.candidate.instrument_number);
  const releasingParty =
    getReleasingParties(row.candidate).join(", ") || "Unknown";
  const isRejected = row.action === "rejected";
  const isAccepted = row.action === "accepted";

  return (
    <div
      className={`px-4 py-3 border-t border-indigo-100 ${
        isRejected ? "opacity-50 bg-gray-50" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenDocument(row.candidate.instrument_number)}
              className="font-mono text-sm text-indigo-700 hover:underline"
            >
              {row.candidate.instrument_number}
            </button>
            <span className="text-xs text-gray-500">
              {row.candidate.recording_date}
            </span>
            <span className="text-xs text-gray-700 truncate">
              {releasingParty}
            </span>
            {row.alreadyLinkedTo && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                Already linked to {row.alreadyLinkedTo}
              </span>
            )}
            {isRejected && (
              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                rejected
              </span>
            )}
            {isAccepted && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                accepted
              </span>
            )}
          </div>
          <div className="mt-2 grid gap-1 max-w-md">
            <FeatureBar
              label="Party name match"
              value={row.features.partyNameSim}
            />
            <FeatureBar
              label="Date proximity"
              value={row.features.dateProximity}
            />
            <FeatureBar
              label="Legal description match"
              value={row.features.legalDescOverlap}
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-xs text-gray-500">Score</div>
          <div className="font-mono text-lg font-semibold text-indigo-700">
            {row.score.toFixed(2)}
          </div>
          <div className="flex gap-1">
            <button
              disabled={!row.canAccept || isAccepted}
              onClick={() =>
                onSetCandidateAction(
                  key,
                  "accepted",
                  row.candidate,
                  row.score,
                )
              }
              title={
                row.alreadyLinkedTo
                  ? "This reconveyance is already accepted for another lifecycle. Releases are 1:1 with DOTs."
                  : "Accept this candidate release"
              }
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isAccepted
                  ? "bg-green-600 text-white"
                  : row.canAccept
                    ? "bg-gray-100 text-gray-700 hover:bg-green-100"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Accept
            </button>
            <button
              onClick={() =>
                onSetCandidateAction(
                  key,
                  "rejected",
                  row.candidate,
                  row.score,
                )
              }
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isRejected
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-red-100"
              }`}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Trustor party names on DOT instruments are stored first-last
// ("JASON HOGUE") but the Maricopa staff name index (and the hunt's
// surname bucket on `split(" ")[0]`) uses last-first ("HOGUE JASON").
// Flip the last token to the front; passthrough for single-token
// (company) names.
function toRecorderNameOrder(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return `${last} ${rest}`;
}

interface CountyWideScanProps {
  dot: Instrument;
  parcel: Parcel;
  lifecycleId: string;
  onOpenDocument: (n: string) => void;
}

function CountyWideScanAffordance({
  dot,
  parcel,
  lifecycleId,
  onOpenDocument,
}: CountyWideScanProps) {
  const [result, setResult] = useState<HuntResult | null>(null);

  const borrowerNames = useMemo(() => {
    const trustors = getTrustors(dot).map(toRecorderNameOrder);
    if (trustors.length > 0) return trustors;
    // Fallback: current owner tokens split on common separators.
    return parcel.current_owner
      .split(/\s*[&/]\s*|\s+AND\s+/i)
      .map((n) => toRecorderNameOrder(n.trim()))
      .filter(Boolean);
  }, [dot, parcel]);

  const runHunt = () => {
    setResult(
      huntCrossParcelRelease({
        lifecycle_id: lifecycleId,
        parcel_apn: parcel.apn,
        borrower_names: borrowerNames,
      }),
    );
  };

  return (
    <div className="px-4 pb-3">
      <div className="border border-moat-300 bg-moat-50 rounded p-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-moat-900">
              Run county-wide name scan
            </div>
            <p className="text-[11px] text-moat-800/80 mt-1 leading-relaxed">
              The public recorder API cannot filter releases by name. The
              county&apos;s internal full-name index can — this is the moat.
              Scanning for{" "}
              <span className="font-mono">
                {borrowerNames.join(", ")}
              </span>{" "}
              across every parcel attributed in the index.
            </p>
          </div>
          {result === null && (
            <button
              type="button"
              onClick={runHunt}
              className="shrink-0 text-xs font-medium px-3 py-1 rounded bg-moat-700 text-white hover:bg-moat-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              Run county-wide scan →
            </button>
          )}
        </div>

        {result && (
          <div className="mt-3 border-t border-moat-200 pt-3">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="text-xs font-semibold text-moat-900">
                Scanned {result.scanned_party_count} same-surname instrument
                {result.scanned_party_count === 1 ? "" : "s"} across county
                — {result.candidates.length} release-type match
                {result.candidates.length === 1 ? "" : "es"}
              </div>
              <div className="text-[11px] font-mono text-moat-700">
                verified through {result.verified_through}
              </div>
            </div>
            {result.candidates.length === 0 ? (
              <p className="text-[11px] text-moat-800/80 mt-2 leading-relaxed">
                Honest zero. No release-type instrument for these borrowers is
                attributed to any other parcel in the county corpus. The
                lifecycle stays open — and now the examiner knows it&apos;s
                open because the record is silent, not because the search was
                blind.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {result.candidates.map((c) => (
                  <li
                    key={c.instrument_number}
                    className="text-[11px] font-mono text-moat-900 flex items-center gap-2 flex-wrap"
                  >
                    <button
                      onClick={() => onOpenDocument(c.instrument_number)}
                      className="text-moat-700 hover:underline"
                    >
                      {c.instrument_number}
                    </button>
                    <span className="text-moat-700/70">
                      {c.document_type}
                    </span>
                    <span className="text-moat-700/70">
                      {c.recording_date}
                    </span>
                    <span className="text-moat-600/80">
                      attributed to {c.attributed_parcel_apn}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CandidateReleasesPanel({
  lifecycleId,
  dot,
  parcel,
  pool,
  releaseLinks,
  lifecycles,
  candidateActions,
  onSetCandidateAction,
  onOpenDocument,
}: Props) {
  const { rows, total, aboveThresholdCount } = useMemo(
    () =>
      buildCandidateRows({
        lifecycleId,
        dot,
        pool,
        releaseLinks,
        lifecycles,
        candidateActions,
      }),
    [lifecycleId, dot, pool, releaseLinks, lifecycles, candidateActions],
  );

  const emptyMoatNote = total === 0 ? buildEmptyStateRationale(parcel) : null;

  return (
    <div className="bg-indigo-50/40 border-t border-b border-indigo-100">
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">
          Candidate releases (matcher)
        </div>
        <div className="text-[11px] text-indigo-700">
          Matcher ran against {total} reconveyance{total === 1 ? "" : "s"},{" "}
          {aboveThresholdCount} above threshold
        </div>
      </div>
      {emptyMoatNote && (
        <div className="px-4 pb-3 text-xs text-indigo-900/80 leading-relaxed">
          {emptyMoatNote}
        </div>
      )}
      {emptyMoatNote && (
        <CountyWideScanAffordance
          dot={dot}
          parcel={parcel}
          lifecycleId={lifecycleId}
          onOpenDocument={onOpenDocument}
        />
      )}
      {rows.map((row) => (
        <CandidateRowView
          key={row.candidate.instrument_number}
          row={row}
          lifecycleId={lifecycleId}
          onSetCandidateAction={onSetCandidateAction}
          onOpenDocument={onOpenDocument}
        />
      ))}
      {total > 0 && aboveThresholdCount === 0 && !emptyMoatNote && (
        <div className="px-4 pb-3 text-xs text-indigo-900/80">
          No candidates scored above the display threshold.
        </div>
      )}
    </div>
  );
}
