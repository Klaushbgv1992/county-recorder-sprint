import { useMemo, useState } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
} from "../../types";
import {
  buildCandidateRows,
  type CandidateAction,
} from "../../logic/release-candidate-matcher";
import { resolveMatcherSlotState } from "../../logic/swimlane-layout";
import { CandidateReleasesPanel } from "../CandidateReleasesPanel";

interface Props {
  lifecycleId: string;
  dot: Instrument;
  parcel: Parcel;
  pool: Instrument[];
  releaseLinks: DocumentLink[];
  lifecycles: LifecycleType[];
  candidateActions: Record<string, CandidateAction>;
  onSetCandidateAction: (
    key: string,
    action: CandidateAction,
    candidate: Instrument,
    score: number,
  ) => void;
  onOpenDocument: (n: string) => void;
  hasAcceptedRelease: boolean;
  scannedPartyCount: number;
}

export function CandidateMatcherSlot(props: Props) {
  const [forceExpanded, setForceExpanded] = useState(false);

  const { rows, total, aboveThresholdCount } = useMemo(
    () =>
      buildCandidateRows({
        lifecycleId: props.lifecycleId,
        dot: props.dot,
        pool: props.pool,
        releaseLinks: props.releaseLinks,
        lifecycles: props.lifecycles,
        candidateActions: props.candidateActions,
      }),
    [
      props.lifecycleId,
      props.dot,
      props.pool,
      props.releaseLinks,
      props.lifecycles,
      props.candidateActions,
    ],
  );

  const slotState = resolveMatcherSlotState({
    rowsCount: rows.length,
    scannedPartyCount: props.scannedPartyCount,
    hasAcceptedRelease: props.hasAcceptedRelease,
  });

  if (slotState === "closed") return null;

  if (slotState === "collapsed-pill" && !forceExpanded) {
    return (
      <button
        onClick={() => setForceExpanded(true)}
        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-100 hover:bg-indigo-100"
      >
        Matcher · scanned {total} instrument{total === 1 ? "" : "s"} · {aboveThresholdCount} above threshold · Expand →
      </button>
    );
  }

  return (
    <CandidateReleasesPanel
      lifecycleId={props.lifecycleId}
      dot={props.dot}
      parcel={props.parcel}
      pool={props.pool}
      releaseLinks={props.releaseLinks}
      lifecycles={props.lifecycles}
      candidateActions={props.candidateActions}
      onSetCandidateAction={props.onSetCandidateAction}
      onOpenDocument={props.onOpenDocument}
    />
  );
}
