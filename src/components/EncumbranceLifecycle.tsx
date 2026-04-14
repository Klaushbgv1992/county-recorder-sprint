import { useMemo, useState } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  PipelineStatus,
  ExaminerAction,
  LifecycleStatus,
} from "../types";
import {
  computeLifecycleStatus,
  resolveLifecycleStatus,
} from "../logic/lifecycle-status";
import { getGrantors, getGrantees, getTrustors, getLenders, getReleasingParties, getPartiesByRole } from "../logic/party-roles";
import {
  synthesizeAlgorithmicLink,
  buildAcceptedRationale,
  type CandidateAction,
} from "../logic/release-candidate-matcher";
import { MoatBanner } from "./MoatBanner";
import { StatusBadge } from "./StatusBadge";
import { InstrumentRow } from "./InstrumentRow";
import { ProvenanceTag } from "./ProvenanceTag";
import { CandidateReleasesPanel } from "./CandidateReleasesPanel";
import { LinkEvidenceBars } from "./LinkEvidenceBars";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  pipelineStatus: PipelineStatus;
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (
    lifecycleId: string,
    status: LifecycleStatus,
  ) => void;
  onOpenDocument: (instrumentNumber: string) => void;
}

function formatDotParties(instrument: Instrument): string {
  const trustors = getTrustors(instrument);
  const lenders = getLenders(instrument);
  if (trustors.length > 0 && lenders.length > 0) {
    return `${trustors.join(", ")} \u2192 ${lenders.join(", ")}`;
  }
  const grantors = getGrantors(instrument);
  const grantees = getGrantees(instrument);
  if (grantors.length > 0 && grantees.length > 0) {
    return `${grantors.join(", ")} \u2192 ${grantees.join(", ")}`;
  }
  return instrument.parties.map((p) => p.name).join(", ");
}

function MersAnnotation({ instrument }: { instrument: Instrument }) {
  const nominees = getPartiesByRole(instrument, "nominee");
  if (nominees.length === 0 && !instrument.mers_note) return null;

  const nominee = nominees[0];
  return (
    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-800">
      <span className="font-medium">MERS Note:</span>{" "}
      {nominee?.nominee_for
        ? `MERS is the beneficiary of record as nominee for ${nominee.nominee_for.party_name}. `
        : ""}
      {instrument.mers_note ?? "The note may have been transferred outside the public record via the MERS system."}
    </div>
  );
}

export function EncumbranceLifecycle({
  parcel,
  instruments,
  links,
  lifecycles,
  pipelineStatus,
  linkActions,
  lifecycleOverrides,
  onSetLinkAction,
  onSetLifecycleOverride,
  onOpenDocument,
}: Props) {
  const instrumentMap = useMemo(
    () => new Map(instruments.map((i) => [i.instrument_number, i])),
    [instruments],
  );

  const reconveyancePool = useMemo(
    () =>
      instruments.filter(
        (i) =>
          i.document_type === "full_reconveyance" ||
          i.document_type === "partial_reconveyance",
      ),
    [instruments],
  );

  // Candidate accept/reject lives in component-local React state on
  // purpose. The prototype has no write path back to src/data/links.json
  // (it is a static Vite SPA), so an Accept here is a session-only
  // assertion that is lost on full reload. This matches the link-action
  // and lifecycle-override surfaces in src/hooks/useExaminerActions.ts
  // and is consistent with the prototype's snapshot-only data model
  // (CLAUDE.md Decisions #16 and #36). Documented as known-gap #14.
  const [candidateActions, setCandidateActions] = useState<
    Record<string, CandidateAction>
  >({});
  const [acceptedCandidate, setAcceptedCandidate] = useState<
    Record<string, { instrumentNumber: string; score: number }>
  >({});

  const handleSetCandidateAction = (
    key: string,
    action: CandidateAction,
    candidate: Instrument,
    score: number,
  ) => {
    setCandidateActions((prev) => ({ ...prev, [key]: action }));
    if (action === "accepted") {
      const [lifecycleId] = key.split("::");
      setAcceptedCandidate((prev) => ({
        ...prev,
        [lifecycleId]: {
          instrumentNumber: candidate.instrument_number,
          score,
        },
      }));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Encumbrance Lifecycles
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {parcel.address} &mdash; APN: {parcel.apn}
        </p>
      </div>

      <MoatBanner pipelineStatus={pipelineStatus} />

      {lifecycles.map((lifecycle) => {
        const rootInst = instrumentMap.get(lifecycle.root_instrument);
        if (!rootInst) return null;

        const childInsts = lifecycle.child_instruments
          .map((num) => instrumentMap.get(num))
          .filter(Boolean) as Instrument[];

        const relatedLinks = links.filter(
          (l) =>
            l.target_instrument === lifecycle.root_instrument ||
            l.source_instrument === lifecycle.root_instrument,
        );

        const releaseLinks = relatedLinks.filter(
          (l) => l.link_type === "release_of",
        );

        const accepted = acceptedCandidate[lifecycle.id];
        const acceptedInst = accepted
          ? instrumentMap.get(accepted.instrumentNumber)
          : undefined;
        const syntheticLink =
          accepted && acceptedInst
            ? synthesizeAlgorithmicLink({
                lifecycleId: lifecycle.id,
                dot: rootInst,
                candidate: acceptedInst,
                score: accepted.score,
              })
            : null;
        const syntheticChildren = acceptedInst ? [acceptedInst] : [];
        const mergedReleaseLinks = syntheticLink
          ? [...releaseLinks, syntheticLink]
          : releaseLinks;

        const computed = computeLifecycleStatus(
          rootInst,
          [...childInsts, ...syntheticChildren],
          mergedReleaseLinks.map((l) => ({
            ...l,
            examiner_action: linkActions[l.id] ?? l.examiner_action,
          })),
        );
        const override = lifecycleOverrides[lifecycle.id] ?? null;
        const resolved = resolveLifecycleStatus(computed, override);
        const effectiveStatus = resolved.status;
        const isOverridden = override !== null;
        const rationaleText =
          accepted && override === null
            ? buildAcceptedRationale(accepted.score)
            : resolved.status_rationale;
        const showCandidatePanel =
          !accepted &&
          (effectiveStatus === "open" || effectiveStatus === "unresolved");

        return (
          <div
            key={lifecycle.id}
            className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden"
          >
            {/* Lifecycle Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge
                  status={effectiveStatus}
                  overridden={isOverridden}
                />
                <span className="font-semibold text-gray-800">
                  DOT: {rootInst.instrument_number}
                </span>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  recorded {rootInst.recording_date}
                </span>
              </div>
              <div
                className="text-sm text-gray-500 min-w-0 truncate text-right"
                title={formatDotParties(rootInst)}
              >
                {formatDotParties(rootInst)}
              </div>
            </div>

            {/* Root instrument */}
            <div className="px-4 py-2 border-b border-gray-100">
              <InstrumentRow
                instrument={rootInst}
                onOpenDocument={onOpenDocument}
              />
            </div>

            {/* MERS annotation if applicable */}
            <MersAnnotation instrument={rootInst} />

            {/* Candidate releases (matcher) - shown on open/unresolved lifecycles */}
            {showCandidatePanel && (
              <CandidateReleasesPanel
                lifecycleId={lifecycle.id}
                dot={rootInst}
                parcel={parcel}
                pool={reconveyancePool}
                releaseLinks={links.filter(
                  (l) => l.link_type === "release_of",
                )}
                lifecycles={lifecycles}
                candidateActions={candidateActions}
                onSetCandidateAction={handleSetCandidateAction}
                onOpenDocument={onOpenDocument}
              />
            )}

            {/* Child instruments with link actions */}
            {[...childInsts, ...syntheticChildren].map((child) => {
              const link =
                syntheticLink &&
                syntheticLink.source_instrument === child.instrument_number
                  ? syntheticLink
                  : releaseLinks.find(
                      (l) => l.source_instrument === child.instrument_number,
                    );
              return (
                <div
                  key={child.instrument_number}
                  className="px-4 py-2 border-b border-gray-100 ml-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <InstrumentRow
                        instrument={child}
                        onOpenDocument={onOpenDocument}
                      />
                    </div>
                    {link && (
                      <div className="flex items-center gap-2 ml-4">
                        <ProvenanceTag
                          provenance={link.provenance}
                          confidence={link.confidence}
                        />
                        <div className="flex gap-1">
                          {(["accepted", "rejected", "unresolved"] as const).map(
                            (action) => {
                              const current = linkActions[link.id] ?? link.examiner_action;
                              const isActive = current === action;
                              const colors = {
                                accepted: isActive
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-green-100",
                                rejected: isActive
                                  ? "bg-red-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-red-100",
                                unresolved: isActive
                                  ? "bg-amber-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-amber-100",
                              };
                              return (
                                <button
                                  key={action}
                                  onClick={() => onSetLinkAction(link.id, action)}
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${colors[action]}`}
                                  title={`${action.charAt(0).toUpperCase() + action.slice(1)} this link`}
                                >
                                  {action.charAt(0).toUpperCase() + action.slice(1)}
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Releasing party annotation for reconveyance */}
                  {child.document_type === "full_reconveyance" && (
                    <div className="ml-27 text-xs text-gray-500 mt-1">
                      Released by: {getReleasingParties(child).join(", ") || "Unknown"}
                    </div>
                  )}
                  {link?.link_type === "release_of" && (
                    <LinkEvidenceBars dot={rootInst} release={child} />
                  )}
                </div>
              );
            })}

            {/* Lifecycle override + status rationale */}
            <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <span className="font-medium">Status rationale:</span>{" "}
                {rationaleText}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 mr-1">Override:</span>
                {(["open", "released", "unresolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onSetLifecycleOverride(lifecycle.id, s)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      override === s
                        ? "bg-gray-700 text-white"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 mt-6 text-right">
        {instruments[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}
