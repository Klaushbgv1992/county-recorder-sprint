import { useMemo } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  LifecycleStatus,
  ExaminerAction,
  DocumentType,
} from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { StatusBadge } from "../StatusBadge";
import { InstrumentNode } from "./InstrumentNode";
import { MersCallout } from "./MersCallout";
import { CandidateMatcherSlot } from "./CandidateMatcherSlot";
import { CitationsRow, type CitationEntry } from "./CitationsRow";
import { OverrideMenu } from "./OverrideMenu";
import {
  computeNodeX,
  groupSameDayInstruments,
  detectMersGap,
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

function rootLabel(docType: DocumentType): string {
  switch (docType) {
    case "deed_of_trust":
    case "heloc_dot":
      return "DOT";
    case "full_reconveyance":
    case "partial_reconveyance":
      return "Release";
    case "assignment_of_dot":
      return "Assignment";
    case "modification":
      return "Modification";
    case "other":
      return "Doc";
    default:
      return "Doc";
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
  const instrumentMap = useMemo(
    () => new Map(props.instruments.map((i) => [i.instrument_number, i])),
    [props.instruments],
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
  const mersGap = detectMersGap(rootInst.instrument_number, findings);

  const domain = props.domain;
  const widthPx = props.trackWidthPx;

  const reconveyancePool = useMemo(
    () =>
      props.allInstruments.filter(
        (i) =>
          i.document_type === "full_reconveyance" ||
          i.document_type === "partial_reconveyance",
      ),
    [props.allInstruments],
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

  return (
    <section
      id={props.lifecycle.id}
      aria-labelledby={`${props.lifecycle.id}-title`}
      className={`bg-white border border-slate-200 rounded-lg mb-3 ${flashClass}`}
    >
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={resolved.status} overridden={override !== null} />
          <span id={`${props.lifecycle.id}-title`} className="font-semibold text-slate-800">
            {t(rootLabel(rootInst.document_type))}: <span className="font-mono">{rootInst.instrument_number}</span>
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
            const prev = nodes[i - 1];
            const prevDate =
              prev.kind === "single" ? prev.instrument.recording_date : prev.date;
            const curDate =
              n.kind === "single" ? n.instrument.recording_date : n.date;
            const startX = computeNodeX(prevDate, domain, widthPx);
            const endX = computeNodeX(curDate, domain, widthPx);
            const style = mersGap && i === nodes.length - 1 ? "dashed" : "solid";
            return (
              <line
                key={i}
                x1={startX}
                x2={endX}
                y1={Y_CENTER}
                y2={Y_CENTER}
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray={style === "dashed" ? "4 3" : undefined}
              />
            );
          })}
        </svg>

        {nodes.map((n) => {
          const date = n.kind === "single" ? n.instrument.recording_date : n.date;
          const x = computeNodeX(date, domain, widthPx);
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
          const x1 = computeNodeX(rootInst.recording_date, domain, widthPx);
          const releaseInst = instrumentMap.get(mersGap.release_instrument);
          if (!releaseInst) return null;
          const x2 = computeNodeX(releaseInst.recording_date, domain, widthPx);
          return <MersCallout gap={mersGap} xPx={(x1 + x2) / 2} yCenter={Y_CENTER} />;
        })()}
      </div>

      <div className="px-3 pt-1 pb-2">
        <div className="text-xs italic text-slate-500">{rationale}</div>
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
          outbound={[]}
          onJump={props.onJumpLifecycle}
        />
      </div>
    </section>
  );
}
