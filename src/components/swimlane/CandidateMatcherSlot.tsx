import { useEffect, useMemo, useState } from "react";
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
import { useWalkthrough } from "../../walkthrough/useWalkthrough";
import { WALKTHROUGH_HERO_LIFECYCLE_ID } from "../../walkthrough/steps";

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
  const { currentStep } = useWalkthrough();

  // When the examiner walkthrough is on step 4 and we're the hero lifecycle's
  // matcher, auto-expand so a scanning reviewer cannot miss the evidence —
  // the collapsed-pill default is fine during normal use but buries the
  // money moment of the tour.
  useEffect(() => {
    if (
      currentStep?.step === 4 &&
      props.lifecycleId === WALKTHROUGH_HERO_LIFECYCLE_ID
    ) {
      setForceExpanded(true);
    }
  }, [currentStep?.step, props.lifecycleId]);

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
        Cross-parcel scan · scanned {total} instrument{total === 1 ? "" : "s"} · {aboveThresholdCount} above threshold · Expand →
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
