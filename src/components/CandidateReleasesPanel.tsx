import { useMemo } from "react";
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
import { getReleasingParties } from "../logic/party-roles";

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
