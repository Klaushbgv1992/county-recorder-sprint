import { useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  LifecycleStatus,
  ExaminerAction,
} from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { computeTimeAxisDomain } from "../../logic/swimlane-layout";
import type { CandidateAction } from "../../logic/release-candidate-matcher";
import { TimeAxis } from "./TimeAxis";
import { Swimlane } from "./Swimlane";
import type { CitationEntry } from "./CitationsRow";
import { huntCrossParcelRelease } from "../../logic/cross-parcel-release-hunt";
import { getTrustors } from "../../logic/party-roles";

// Lifecycles are sorted chronologically by root_instrument.recording_date to
// align with the shared global time axis (Q1 / Q5 of the brainstorm). Anomaly
// prominence is handled by AnomalyPanel at top-of-page, not by reorder.
function sortLifecycles(
  lifecycles: LifecycleType[],
  byNumber: Map<string, Instrument>,
): LifecycleType[] {
  return [...lifecycles].sort((a, b) => {
    const da = byNumber.get(a.root_instrument)?.recording_date ?? "";
    const db = byNumber.get(b.root_instrument)?.recording_date ?? "";
    return da.localeCompare(db);
  });
}

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  findings: AnomalyFinding[];
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (id: string, s: LifecycleStatus) => void;
  onOpenDocument: (n: string) => void;
}

export function SwimlaneDiagram(props: Props) {
  const byNumber = useMemo(
    () => new Map(props.instruments.map((i) => [i.instrument_number, i])),
    [props.instruments],
  );
  const sorted = useMemo(
    () => sortLifecycles(props.lifecycles, byNumber),
    [props.lifecycles, byNumber],
  );
  const domain = useMemo(
    () => computeTimeAxisDomain(props.instruments),
    [props.instruments],
  );

  const [candidateActions, setCandidateActions] = useState<
    Record<string, CandidateAction>
  >({});
  const [acceptedCandidate, setAcceptedCandidate] = useState<
    Record<string, { instrumentNumber: string; score: number }>
  >({});

  const handleSetCandidateAction = useCallback(
    (
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
          [lifecycleId]: { instrumentNumber: candidate.instrument_number, score },
        }));
      }
    },
    [],
  );

  const {
    inboundByLifecycle,
    outboundByLifecycleAndInstrument,
  } = useMemo(() => {
    const inbound = new Map<string, CitationEntry[]>();
    const outbound = new Map<string, Map<string, CitationEntry[]>>();
    for (const lc of props.lifecycles) {
      inbound.set(lc.id, []);
      outbound.set(lc.id, new Map());
    }
    const lifecycleOfRoot = new Map<string, string>();
    for (const lc of props.lifecycles) lifecycleOfRoot.set(lc.root_instrument, lc.id);
    const lifecycleOfChild = new Map<string, string>();
    for (const lc of props.lifecycles) {
      for (const c of lc.child_instruments) lifecycleOfChild.set(c, lc.id);
    }
    const memberLifecycle = (inst: string) =>
      lifecycleOfRoot.get(inst) ?? lifecycleOfChild.get(inst);

    const backRefs = props.links.filter((l) => l.link_type === "back_reference");
    const grouped = new Map<string, CitationEntry>();
    for (const l of backRefs) {
      const citing = l.source_instrument;
      const targetLc = memberLifecycle(l.target_instrument);
      if (!targetLc) continue;
      const key = `${citing}::${targetLc}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.targetInstruments.push(l.target_instrument);
      } else {
        grouped.set(key, {
          citingInstrument: citing,
          targetLifecycleId: targetLc,
          targetInstruments: [l.target_instrument],
        });
      }
    }
    for (const entry of grouped.values()) {
      inbound.get(entry.targetLifecycleId)!.push(entry);
      const citingLc = memberLifecycle(entry.citingInstrument);
      if (citingLc) {
        const perInst = outbound.get(citingLc)!;
        const list = perInst.get(entry.citingInstrument) ?? [];
        list.push(entry);
        perInst.set(entry.citingInstrument, list);
      }
    }
    return {
      inboundByLifecycle: inbound,
      outboundByLifecycleAndInstrument: outbound,
    };
  }, [props.lifecycles, props.links]);

  const scanByLifecycle = useMemo(() => {
    const map = new Map<string, number>();
    for (const lc of props.lifecycles) {
      const root = byNumber.get(lc.root_instrument);
      if (!root || root.document_type !== "deed_of_trust") {
        map.set(lc.id, 0);
        continue;
      }
      const borrowers = getTrustors(root);
      if (borrowers.length === 0) {
        map.set(lc.id, 0);
        continue;
      }
      try {
        const result = huntCrossParcelRelease({
          lifecycle_id: lc.id,
          parcel_apn: props.parcel.apn,
          borrower_names: borrowers,
        });
        map.set(lc.id, result.scanned_party_count);
      } catch {
        map.set(lc.id, 0);
      }
    }
    return map;
  }, [props.lifecycles, byNumber, props.parcel.apn]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState(800);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        setWidthPx(Math.max(400, containerRef.current.clientWidth - 24));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const [flashingId, setFlashingId] = useState<string | null>(null);
  const handleJumpLifecycle = useCallback((lifecycleId: string) => {
    const el = document.getElementById(lifecycleId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashingId(lifecycleId);
    window.setTimeout(() => setFlashingId(null), 1200);
  }, []);

  if (!domain[0] || !domain[1]) {
    return <div className="text-sm text-slate-500">No instruments to display.</div>;
  }
  const safeDomain: [string, string] = [domain[0], domain[1]];

  return (
    <div ref={containerRef}>
      <div className="px-3">
        <TimeAxis domain={safeDomain} widthPx={widthPx} />
      </div>
      {sorted.map((lc) => {
        const outboundMap =
          outboundByLifecycleAndInstrument.get(lc.id) ?? new Map();
        return (
          <Swimlane
            key={lc.id}
            lifecycle={lc}
            parcel={props.parcel}
            instruments={props.instruments}
            allInstruments={props.instruments}
            links={props.links}
            lifecycles={props.lifecycles}
            domain={safeDomain}
            trackWidthPx={widthPx}
            findings={props.findings}
            linkActions={props.linkActions}
            lifecycleOverrides={props.lifecycleOverrides}
            candidateActions={candidateActions}
            acceptedCandidate={acceptedCandidate[lc.id] ?? null}
            inboundCitations={inboundByLifecycle.get(lc.id) ?? []}
            outboundCitations={outboundMap}
            scannedPartyCount={scanByLifecycle.get(lc.id) ?? 0}
            onSetLinkAction={props.onSetLinkAction}
            onSetLifecycleOverride={props.onSetLifecycleOverride}
            onSetCandidateAction={handleSetCandidateAction}
            onOpenDocument={props.onOpenDocument}
            onJumpLifecycle={handleJumpLifecycle}
            flashing={flashingId === lc.id}
          />
        );
      })}
    </div>
  );
}
