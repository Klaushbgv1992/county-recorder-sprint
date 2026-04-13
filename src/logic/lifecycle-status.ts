import type { Instrument, DocumentLink, LifecycleStatus } from "../types";

export interface LifecycleResult {
  status: LifecycleStatus;
  status_rationale: string;
}

export function computeLifecycleStatus(
  rootDot: Instrument,
  _childInstruments: Instrument[],
  links: DocumentLink[],
): LifecycleResult {
  const releaseLinks = links.filter(
    (link) =>
      link.target_instrument === rootDot.instrument_number &&
      link.link_type === "release_of",
  );

  if (releaseLinks.length === 0) {
    return {
      status: "open",
      status_rationale: `No reconveyance found in corpus for DOT ${rootDot.instrument_number}`,
    };
  }

  const acceptedRelease = releaseLinks.find(
    (l) => l.examiner_action === "accepted",
  );
  if (acceptedRelease) {
    return {
      status: "released",
      status_rationale: `Release confirmed by examiner via ${acceptedRelease.source_instrument}`,
    };
  }

  const rejectedAll = releaseLinks.every(
    (l) => l.examiner_action === "rejected",
  );
  if (rejectedAll) {
    return {
      status: "unresolved",
      status_rationale:
        "Release candidate(s) rejected by examiner — status requires further investigation",
    };
  }

  const bestCandidate = releaseLinks.reduce((a, b) =>
    a.confidence > b.confidence ? a : b,
  );
  return {
    status: "possible_match",
    status_rationale: `Release candidate ${bestCandidate.source_instrument} pending examiner review (confidence: ${bestCandidate.confidence})`,
  };
}

export function resolveLifecycleStatus(
  computed: LifecycleResult,
  override: LifecycleStatus | null,
): LifecycleResult {
  if (override === null) return computed;
  return {
    status: override,
    status_rationale: `Examiner override: ${override} (original: ${computed.status} — ${computed.status_rationale})`,
  };
}
