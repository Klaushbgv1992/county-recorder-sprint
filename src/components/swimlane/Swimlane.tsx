import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  LifecycleStatus,
  ExaminerAction,
  DocumentType,
} from "../../types";
import { useWalkthrough } from "../../walkthrough/useWalkthrough";
import { WALKTHROUGH_HERO_LIFECYCLE_ID } from "../../walkthrough/steps";
import type { AnomalyFinding } from "../../types/anomaly";
import { StatusBadge } from "../StatusBadge";
import { InstrumentNode } from "./InstrumentNode";
import { MersCallout, MERS_CALLOUT_WIDTH } from "./MersCallout";
import { CandidateMatcherSlot } from "./CandidateMatcherSlot";
import { CitationsRow, type CitationEntry } from "./CitationsRow";
import { OverrideMenu } from "./OverrideMenu";
import {
  computeNodeX,
  groupSameDayInstruments,
  detectMersGap,
  layoutNodesWithCollisionAvoidance,
} from "../../logic/swimlane-layout";
import {
  computeLifecycleStatus,
  resolveLifecycleStatus,
} from "../../logic/lifecycle-status";
import {
  synthesizeAlgorithmicLink,
  buildAcceptedRationale,
  type CandidateAction,
} from "../../logic/release-candidate-matcher";
import { useTerminology } from "../../terminology/TerminologyContext";

function humanizeRaw(raw: string): string {
  return raw
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function rootLabel(docType: DocumentType, rawType: string): string {
  switch (docType) {
    case "deed_of_trust":
      return "Deed of Trust";
    case "heloc_dot":
      return "HELOC Deed of Trust";
    case "full_reconveyance":
    case "partial_reconveyance":
      return "Release";
    case "assignment_of_dot":
      return "Assignment of Deed of Trust";
    case "modification":
      return "Modification";
    case "other":
      return humanizeRaw(rawType);
    default:
      return humanizeRaw(rawType);
  }
}

interface Props {
  lifecycle: LifecycleType;
  parcel: Parcel;
  instruments: Instrument[];
  allInstruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  domain: [string, string];
  trackWidthPx: number;
  findings: AnomalyFinding[];
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  candidateActions: Record<string, CandidateAction>;
  acceptedCandidate: { instrumentNumber: string; score: number } | null;
  inboundCitations: CitationEntry[];
  outboundCitations: Map<string, CitationEntry[]>;
  scannedPartyCount: number;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (id: string, s: LifecycleStatus) => void;
  onSetCandidateAction: (
    key: string,
    action: CandidateAction,
    candidate: Instrument,
    score: number,
  ) => void;
  onOpenDocument: (n: string) => void;
  onJumpLifecycle: (lifecycleId: string) => void;
  flashing: boolean;
}

const TRACK_HEIGHT = 60;
const Y_CENTER = 30;

export function Swimlane(props: Props) {
  const { t } = useTerminology();
  const { currentStep } = useWalkthrough();
  const walkthroughFocused =
    (currentStep?.step === 3 || currentStep?.step === 4) &&
    props.lifecycle.id === WALKTHROUGH_HERO_LIFECYCLE_ID;
  const focusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (walkthroughFocused && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // scroll on entering step 3 or 4; re-scroll if step flips between them.
  }, [walkthroughFocused, currentStep?.step]);

  // Fire a one-shot pulse on the just-accepted candidate node so the
  // examiner's click produces an immediate visual receipt. We key off the
  // accepted instrument number and clear after the 600ms pulse-once keyframe
  // (+100ms slack) so a fast second acceptance still re-fires cleanly.
  const acceptedNumber = props.acceptedCandidate?.instrumentNumber ?? null;
  const [justAcceptedId, setJustAcceptedId] = useState<string | null>(null);
  useEffect(() => {
    if (!acceptedNumber) return;
    setJustAcceptedId(acceptedNumber);
    const handle = window.setTimeout(() => setJustAcceptedId(null), 700);
    return () => window.clearTimeout(handle);
  }, [acceptedNumber]);

  const instrumentMap = useMemo(
    () => new Map(props.instruments.map((i) => [i.instrument_number, i])),
    [props.instruments],
  );

  const reconveyancePool = useMemo(
    () =>
      props.allInstruments.filter(
        (i) =>
          i.document_type === "full_reconveyance" ||
          i.document_type === "partial_reconveyance",
      ),
    [props.allInstruments],
  );

  const rootInst = instrumentMap.get(props.lifecycle.root_instrument);
  if (!rootInst) return null;

  const childInsts = props.lifecycle.child_instruments
    .map((n) => instrumentMap.get(n))
    .filter(Boolean) as Instrument[];

  const accepted = props.acceptedCandidate;
  const acceptedInst = accepted
    ? instrumentMap.get(accepted.instrumentNumber)
    : undefined;

  const relatedLinks = props.links.filter(
    (l) =>
      l.target_instrument === props.lifecycle.root_instrument ||
      l.source_instrument === props.lifecycle.root_instrument,
  );
  const releaseLinks = relatedLinks.filter((l) => l.link_type === "release_of");

  const syntheticLink =
    accepted && acceptedInst
      ? synthesizeAlgorithmicLink({
          lifecycleId: props.lifecycle.id,
          dot: rootInst,
          candidate: acceptedInst,
          score: accepted.score,
        })
      : null;
  const mergedReleaseLinks = syntheticLink
    ? [...releaseLinks, syntheticLink]
    : releaseLinks;

  const computed = computeLifecycleStatus(
    rootInst,
    acceptedInst ? [...childInsts, acceptedInst] : childInsts,
    mergedReleaseLinks.map((l) => ({
      ...l,
      examiner_action: props.linkActions[l.id] ?? l.examiner_action,
    })),
  );
  const override = props.lifecycleOverrides[props.lifecycle.id] ?? null;
  const resolved = resolveLifecycleStatus(computed, override);
  const rationale =
    accepted && override === null
      ? buildAcceptedRationale(accepted.score)
      : resolved.status_rationale;

  const trackChildren: Instrument[] = [
    ...childInsts,
    ...(acceptedInst ? [acceptedInst] : []),
  ];
  const nodes = groupSameDayInstruments([rootInst, ...trackChildren]);

  const findings = props.findings;
  const mersGap = detectMersGap(
    rootInst.instrument_number,
    findings,
    trackChildren,
  );

  const domain = props.domain;
  const widthPx = props.trackWidthPx;

  const nodesWithLayout = layoutNodesWithCollisionAvoidance(
    nodes.map((n) => ({
      axisX: computeNodeX(
        n.kind === "single" ? n.instrument.recording_date : n.date,
        domain,
        widthPx,
      ),
    })),
    36,
  );

  const hasAcceptedRelease = Boolean(
    releaseLinks.some(
      (l) =>
        (props.linkActions[l.id] ?? l.examiner_action) === "accepted",
    ) || accepted,
  );

  const flashClass = props.flashing
    ? "ring-2 ring-amber-400 transition-[box-shadow] duration-700 motion-reduce:transition-none"
    : "";
  const walkthroughClass = walkthroughFocused
    ? "border-moat-500 ring-2 ring-moat-400 shadow-md"
    : "border-slate-200";

  return (
    <section
      ref={focusRef}
      id={props.lifecycle.id}
      aria-labelledby={`${props.lifecycle.id}-title`}
      data-walkthrough-focus={walkthroughFocused ? "true" : undefined}
      className={`bg-white border rounded-lg mb-3 ${walkthroughClass} ${flashClass}`}
    >
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={resolved.status} overridden={override !== null} />
          <span id={`${props.lifecycle.id}-title`} className="font-semibold text-slate-800">
            {t(rootLabel(rootInst.document_type, rootInst.document_type_raw))}: <span className="font-mono">{rootInst.instrument_number}</span>
          </span>
          <span className="text-[11px] text-slate-500 truncate">
            {props.lifecycle.id}
          </span>
        </div>
        <OverrideMenu
          currentOverride={override}
          statusRationale={rationale}
          onSetOverride={(s) => props.onSetLifecycleOverride(props.lifecycle.id, s)}
        />
      </div>

      <div className="relative px-3" style={{ height: TRACK_HEIGHT }}>
        <svg
          className="absolute inset-0"
          width="100%"
          height={TRACK_HEIGHT}
          aria-hidden
        >
          <line
            x1={0}
            x2={widthPx}
            y1={Y_CENTER}
            y2={Y_CENTER}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          {nodes.map((n, i) => {
            if (i === 0) return null;
            const startX = nodesWithLayout[i - 1].visualX;
            const endX = nodesWithLayout[i].visualX;
            // A segment whose endpoint is the freshly-accepted (or already
            // curated-linked) release paints moat-green at 2.5 stroke so the
            // newly-formed chain link reads as confirmed rather than open.
            const segEndInstrument =
              n.kind === "single" ? n.instrument.instrument_number : null;
            const isLinkedSegment =
              !!acceptedInst &&
              segEndInstrument === acceptedInst.instrument_number;
            // MERS-gap segment: split into solid → dashed → solid so the line
            // itself narrates "record-record-GAP-record-record" around the
            // callout. Fallback to a single solid stroke outside the gap.
            const isMersSegment = mersGap && i === nodes.length - 1;
            if (isMersSegment) {
              const midX = (startX + endX) / 2;
              const halfW = MERS_CALLOUT_WIDTH / 2;
              // Clamp the dashed window to the segment so a very narrow axis
              // (callout wider than the DOT→Release gap) still renders three
              // segments instead of flipping the solid stubs inside-out.
              const dashStartX = Math.max(startX, midX - halfW);
              const dashEndX = Math.min(endX, midX + halfW);
              return (
                <g key={i}>
                  <line
                    x1={startX}
                    x2={dashStartX}
                    y1={Y_CENTER}
                    y2={Y_CENTER}
                    stroke="#64748b"
                    strokeWidth={2}
                  />
                  <line
                    x1={dashStartX}
                    x2={dashEndX}
                    y1={Y_CENTER}
                    y2={Y_CENTER}
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={dashEndX}
                    x2={endX}
                    y1={Y_CENTER}
                    y2={Y_CENTER}
                    stroke="#64748b"
                    strokeWidth={2}
                  />
                </g>
              );
            }
            return (
              <line
                key={i}
                x1={startX}
                x2={endX}
                y1={Y_CENTER}
                y2={Y_CENTER}
                stroke={isLinkedSegment ? "#10b981" : "#64748b"}
                strokeWidth={isLinkedSegment ? 2.5 : 2}
                className="transition-all duration-300 motion-reduce:transition-none"
              />
            );
          })}
          {nodesWithLayout.map((nl, i) =>
            nl.leader ? (
              <g key={`leader-${i}`}>
                {/* vertical tick at the true axis x */}
                <line
                  x1={nl.axisX}
                  x2={nl.axisX}
                  y1={Y_CENTER - 10}
                  y2={Y_CENTER}
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
                {/* horizontal bridge from true axis to visual position */}
                <line
                  x1={nl.axisX}
                  x2={nl.visualX}
                  y1={Y_CENTER - 10}
                  y2={Y_CENTER - 10}
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
              </g>
            ) : null,
          )}
        </svg>

        {nodes.map((n, i) => {
          const date = n.kind === "single" ? n.instrument.recording_date : n.date;
          const x = nodesWithLayout[i].visualX;
          const isMersRoot =
            mersGap && n.kind === "single" && n.instrument.instrument_number === mersGap.dot_instrument;
          const isMersRelease =
            mersGap && n.kind === "single" && n.instrument.instrument_number === mersGap.release_instrument;
          const backRefs =
            n.kind === "single"
              ? props.outboundCitations.get(n.instrument.instrument_number) ?? []
              : [];
          return (
            <InstrumentNode
              key={n.kind === "single" ? n.instrument.instrument_number : date}
              xPx={x}
              kind={n.kind}
              instrument={n.kind === "single" ? n.instrument : undefined}
              instruments={n.kind === "composite" ? n.instruments : undefined}
              date={date}
              onOpenDocument={props.onOpenDocument}
              backRefsOut={backRefs.map((c) => ({
                lifecycleId: c.targetLifecycleId,
                onJump: () => props.onJumpLifecycle(c.targetLifecycleId),
              }))}
              isMersGapEnd={
                isMersRoot ? "dot" : isMersRelease ? "release" : undefined
              }
            />
          );
        })}

        {mersGap && (() => {
          const dotIdx = nodes.findIndex((n) => n.kind === "single" && n.instrument.instrument_number === mersGap.dot_instrument);
          const releaseIdx = nodes.findIndex((n) => n.kind === "single" && n.instrument.instrument_number === mersGap.release_instrument);
          if (dotIdx === -1 || releaseIdx === -1) return null;
          const dotX = nodesWithLayout[dotIdx].visualX;
          const releaseX = nodesWithLayout[releaseIdx].visualX;
          // The MERS callout is the swimlane's "missing link" indicator.
          // A static dashed amber outline reads as "attention" without
          // motion — visible even before the examiner hovers, which is
          // strictly better for discoverability than a hover-triggered
          // animation.
          return (
            <div className="rounded border-2 border-dashed border-amber-400">
              <MersCallout gap={mersGap} xPx={(dotX + releaseX) / 2} yCenter={Y_CENTER} />
            </div>
          );
        })()}

        {justAcceptedId && acceptedInst && (() => {
          const idx = nodes.findIndex(
            (nn) =>
              nn.kind === "single" &&
              nn.instrument.instrument_number === justAcceptedId,
          );
          if (idx === -1) return null;
          const x = nodesWithLayout[idx].visualX;
          // Decorative ring overlay: the underlying InstrumentNode owns its
          // click target and label, so we render a pointer-events-none halo
          // that fires animate-pulse-once (600ms green ring + scale) at the
          // accepted node's axis position — visual receipt without touching
          // the node component's DOM.
          return (
            <div
              aria-hidden
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full animate-pulse-once"
              style={{ left: x, top: Y_CENTER }}
            />
          );
        })()}
      </div>

      <div className="px-3 pt-1 pb-2">
        {resolved.status === "unresolved" ? (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-snug">
            <span className="font-semibold">Examiner review required. </span>
            <span>{rationale}</span>
          </div>
        ) : (
          <div className="text-xs italic text-slate-500">{rationale}</div>
        )}
        {rootInst.document_type === "deed_of_trust" && (
          <div className="mt-2">
            <CandidateMatcherSlot
              lifecycleId={props.lifecycle.id}
              dot={rootInst}
              parcel={props.parcel}
              pool={reconveyancePool}
              releaseLinks={props.links.filter((l) => l.link_type === "release_of")}
              lifecycles={props.lifecycles}
              candidateActions={props.candidateActions}
              onSetCandidateAction={props.onSetCandidateAction}
              onOpenDocument={props.onOpenDocument}
              hasAcceptedRelease={hasAcceptedRelease}
              scannedPartyCount={props.scannedPartyCount}
            />
          </div>
        )}
        <CitationsRow
          inbound={props.inboundCitations}
          onJump={props.onJumpLifecycle}
        />
      </div>
    </section>
  );
}
