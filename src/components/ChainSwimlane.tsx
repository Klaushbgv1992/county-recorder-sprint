import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  OwnerPeriod,
} from "../types";
import { buildOwnerPeriods } from "../logic/chain-builder";
import { getGrantors } from "../logic/party-roles";
import {
  computeTimeAxisDomain,
  computeNodeX,
  groupSameDayInstruments,
  layoutNodesWithCollisionAvoidance,
} from "../logic/swimlane-layout";
import { TimeAxis } from "./swimlane/TimeAxis";
import { InstrumentNode } from "./swimlane/InstrumentNode";
import { useTerminology } from "../terminology/TerminologyContext";
import { Term, TermSection } from "../terminology/Term";

const DEED_TYPES = new Set([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
]);

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
  // Optional: when supplied, back_reference links from a track instrument to
  // an instrument that is a root/child of one of these lifecycles render a
  // "cites lc-NNN" jump chip. Jumping is handled by onJumpLifecycle; when
  // that's not supplied the chip navigates to the encumbrance screen anchor.
  lifecycles?: EncumbranceLifecycle[];
  onJumpLifecycle?: (lifecycleId: string) => void;
}

// Minimum track height — short periods (same-year refinances, immediate
// trust-into-self transfers) clamp to this so their nodes don't collapse.
const MIN_TRACK_HEIGHT = 60;
// Maximum track height — long holds (20+ years, prior-to-corpus periods)
// clamp to this so a single period can't push the next owner off-screen.
const MAX_TRACK_HEIGHT = 220;
// px per year. At 16 px/yr, a 9-year Silva-trust hold renders ~204 px tall
// vs a 1.5-year pre-trust period at ~84 px — the ~2.4x ratio is what
// makes the succession story readable without labels.
const PX_PER_YEAR = 16;
// Pins and the horizontal connector line live in the top 60 px of every
// track (unchanged from the flat-block layout). Anything below that is
// "time-held" empty space — the vertical visualization of how long this
// owner held title. Keeps pin/line alignment identical across heights.
const HEADER_HEIGHT = 60;
const Y_CENTER = 30;

function yearsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!isFinite(start) || !isFinite(end) || end < start) return 0;
  return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
}

function computeTrackHeight(years: number): number {
  return Math.min(
    MAX_TRACK_HEIGHT,
    Math.max(MIN_TRACK_HEIGHT, MIN_TRACK_HEIGHT + years * PX_PER_YEAR),
  );
}

function formatDuration(years: number): string {
  if (years < 1 / 12) return "< 1 mo";
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} mo`;
  }
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (months === 0) return `${whole} yr`;
  if (months === 12) return `${whole + 1} yr`;
  return `${whole} yr ${months} mo`;
}

export function ChainSwimlane({
  parcel,
  instruments,
  links,
  onOpenDocument,
  lifecycles,
  onJumpLifecycle,
}: Props) {
  const deeds = useMemo(
    () =>
      instruments
        .filter((i) => DEED_TYPES.has(i.document_type))
        .sort(
          (a, b) =>
            new Date(a.recording_date).getTime() -
            new Date(b.recording_date).getTime(),
        ),
    [instruments],
  );

  const ownerPeriods = useMemo(
    () => buildOwnerPeriods(instruments),
    [instruments],
  );

  const priorOwner = useMemo(() => {
    if (deeds.length === 0) return null;
    const first = deeds[0];
    const grantors = getGrantors(first);
    if (grantors.length === 0) return null;
    return { name: grantors.join(" & "), end_date: first.recording_date };
  }, [deeds]);

  // Same-day, non-deed instruments linked to each deed via same_day_transaction.
  // Links are bidirectional — either endpoint can be the "source". We match
  // both directions and only include non-deed instruments (DOTs, UCCs, etc.)
  // because deeds themselves already anchor their own period.
  const byNumber = useMemo(
    () => new Map(instruments.map((i) => [i.instrument_number, i])),
    [instruments],
  );
  const sameDayAttachments = useMemo(() => {
    const result = new Map<string, Instrument[]>();
    for (const d of deeds) result.set(d.instrument_number, []);
    const sameDayLinks = links.filter(
      (l) => l.link_type === "same_day_transaction",
    );
    for (const l of sameDayLinks) {
      const a = byNumber.get(l.source_instrument);
      const b = byNumber.get(l.target_instrument);
      if (!a || !b) continue;
      const deed = DEED_TYPES.has(a.document_type)
        ? a
        : DEED_TYPES.has(b.document_type)
          ? b
          : null;
      const other = deed === a ? b : deed === b ? a : null;
      if (!deed || !other) continue;
      if (DEED_TYPES.has(other.document_type)) continue;
      result.get(deed.instrument_number)?.push(other);
    }
    return result;
  }, [deeds, links, byNumber]);

  // All instruments that will land on a swimlane track — deeds + their
  // same-day attachments. Feeds the global time axis so every visible pin
  // fits inside the domain.
  const trackInstruments = useMemo(() => {
    const out: Instrument[] = [];
    for (const d of deeds) {
      out.push(d);
      for (const a of sameDayAttachments.get(d.instrument_number) ?? []) {
        out.push(a);
      }
    }
    return out;
  }, [deeds, sameDayAttachments]);

  const domain = useMemo(
    () => computeTimeAxisDomain(trackInstruments),
    [trackInstruments],
  );

  // Back-reference targets → lifecycle id. Only filled when lifecycles are
  // supplied by the caller. Covers both root and child instruments.
  const lifecycleOfInstrument = useMemo(() => {
    const map = new Map<string, string>();
    for (const lc of lifecycles ?? []) {
      map.set(lc.root_instrument, lc.id);
      for (const c of lc.child_instruments) map.set(c, lc.id);
    }
    return map;
  }, [lifecycles]);

  const backRefsByInstrument = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const l of links) {
      if (l.link_type !== "back_reference") continue;
      const targetLc = lifecycleOfInstrument.get(l.target_instrument);
      if (!targetLc) continue;
      const list = out.get(l.source_instrument) ?? [];
      if (!list.includes(targetLc)) list.push(targetLc);
      out.set(l.source_instrument, list);
    }
    return out;
  }, [links, lifecycleOfInstrument]);

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

  const defaultJumpLifecycle = useCallback(
    (lifecycleId: string) => {
      if (onJumpLifecycle) {
        onJumpLifecycle(lifecycleId);
        return;
      }
      // Fallback: navigate to the encumbrance screen anchor for that
      // lifecycle. A full in-app jump would use useNavigate from react-router,
      // but ChainSwimlane is meant to be router-agnostic; the caller wires
      // onJumpLifecycle when a deeper integration is needed.
      if (typeof window !== "undefined") {
        window.location.assign(
          `/parcel/${parcel.apn}/encumbrances#${lifecycleId}`,
        );
      }
    },
    [onJumpLifecycle, parcel.apn],
  );

  const anySynthesized = deeds.some((d) => d.raw_api_response?.synthesized);

  if (deeds.length === 0) {
    return (
      <section className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        <strong className="font-semibold text-slate-900">
          No conveyance instruments in corpus
        </strong>
        <span className="ml-1">
          for APN {parcel.apn}. A production chain would probe the county
          index for docket/book references predating the 1974 image depth.
        </span>
      </section>
    );
  }

  // Prior-to-corpus period: appears as a dashed-outline first track. It has
  // no deed node of its own — the track is the visual representation that
  // the chain begins earlier than the curated corpus reaches.
  const priorPeriod =
    priorOwner !== null
      ? {
          kind: "prior" as const,
          owner: priorOwner.name,
          end_date: priorOwner.end_date,
        }
      : null;

  if (!domain[0] || !domain[1]) {
    // defensive: should not happen once deeds.length > 0, but keeps the
    // narrowed type happy and degrades gracefully if instruments are empty.
    return null;
  }
  const safeDomain: [string, string] = [domain[0], domain[1]];

  return (
    <div ref={containerRef}>
      <TermSection id="chain-swimlane">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          <Term professional="Chain of Title" /> Timeline
        </h3>

        {anySynthesized && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold">
              Historical chain extended by demo reconstruction.
            </strong>{" "}
            Nodes marked{" "}
            <span className="inline-block rounded-full bg-amber-100 px-1.5 py-0.5 font-medium">
              synthetic
            </span>{" "}
            (1978&ndash;2006) model the pre-subdivision parent tract and the
            first post-plat ownership period &mdash; they do not resolve
            against <code className="font-mono">publicapi.recorder.maricopa.gov</code>.
            The real, OCR-curated chain starts with the 2013 purchase. In
            production, this segment would be reconstructed from the
            1974-forward image depth plus pre-1974 docket/book references.
          </div>
        )}

        <div data-chain-timeaxis className="px-3">
          <TimeAxis domain={safeDomain} widthPx={widthPx} />
        </div>

        {priorPeriod && (
          <PriorTrack
            owner={priorPeriod.owner}
            endDate={priorPeriod.end_date}
            trackIndex={0}
          />
        )}

        {ownerPeriods.map((period, idx) => (
          <ChainTrack
            key={period.start_instrument}
            period={period}
            deed={byNumber.get(period.start_instrument)!}
            sameDayAttachments={
              sameDayAttachments.get(period.start_instrument) ?? []
            }
            domain={safeDomain}
            widthPx={widthPx}
            onOpenDocument={onOpenDocument}
            backRefsByInstrument={backRefsByInstrument}
            onJumpLifecycle={defaultJumpLifecycle}
            trackIndex={priorPeriod ? idx + 1 : idx}
          />
        ))}

        {parcel.apn === "304-77-689" && (
          <p className="mt-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
            <strong className="font-semibold text-slate-900">
              Sparse by design.
            </strong>{" "}
            HOGUE is the demo&apos;s counter-example parcel. The 2015 purchase
            is the only curated deed &mdash; no post-2015 sale or refinance is
            in the corpus. Title plants paper over gaps like this with
            third-party feeds; a county custodian is honest about what it
            recorded.
          </p>
        )}
      </TermSection>
    </div>
  );
}

function PriorTrack({
  owner,
  endDate,
  trackIndex,
}: {
  owner: string;
  endDate: string;
  trackIndex: number;
}) {
  // Prior-to-corpus period uses MIN_TRACK_HEIGHT — its real duration is
  // unknown (reaches before the 1974 image depth), so the track's visual
  // weight is intentionally neutral.
  return (
    <section className="border border-dashed border-gray-300 rounded-lg mb-3 bg-gray-50">
      <div className="px-3 py-2 border-b border-dashed border-gray-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-gray-700 truncate">{owner}</span>
          <span className="text-[11px] text-gray-500">Prior to {endDate}</span>
        </div>
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
          Prior to corpus scope
        </span>
      </div>
      <div className="relative px-3" style={{ height: MIN_TRACK_HEIGHT }}>
        <svg
          className="absolute inset-0 animate-track-grow origin-left"
          width="100%"
          height={MIN_TRACK_HEIGHT}
          aria-hidden
          style={{ animationDelay: `${trackIndex * 100}ms` }}
        >
          <line
            x1={0}
            x2="100%"
            y1={Y_CENTER}
            y2={Y_CENTER}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        </svg>
      </div>
    </section>
  );
}

interface ChainTrackProps {
  period: OwnerPeriod;
  deed: Instrument;
  sameDayAttachments: Instrument[];
  domain: [string, string];
  widthPx: number;
  onOpenDocument: (instrumentNumber: string) => void;
  backRefsByInstrument: Map<string, string[]>;
  onJumpLifecycle: (lifecycleId: string) => void;
  trackIndex: number;
}

function ChainTrack({
  period,
  deed,
  sameDayAttachments,
  domain,
  widthPx,
  onOpenDocument,
  backRefsByInstrument,
  onJumpLifecycle,
  trackIndex,
}: ChainTrackProps) {
  // Hovered node index drives the connector-line glow. Hovering a node
  // brightens its adjoining line segments (stroke-width 2→4, opacity 0.5→1)
  // so the examiner can trace how same-day instruments chain within a track.
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState<number | null>(null);
  const { t } = useTerminology();
  const trackInstruments = [deed, ...sameDayAttachments];
  const nodes = groupSameDayInstruments(trackInstruments);
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

  const hasSynthetic = trackInstruments.some(
    (i) => i.raw_api_response?.synthesized,
  );

  const borderClass = period.is_current
    ? "border-blue-300 bg-blue-50"
    : "border-gray-200 bg-white";

  // Scale the track's vertical size to how long the owner held title. A
  // one-month Moore-trust hold and a nine-year Silva-trust hold should
  // NOT render as the same-sized block. Current (is_current) periods use
  // today's date as the implicit end date.
  const yearsHeld = yearsBetween(
    period.start_date,
    period.end_date ?? new Date().toISOString().slice(0, 10),
  );
  const trackHeight = computeTrackHeight(yearsHeld);
  const durationLabel = formatDuration(yearsHeld);
  // Any track height above HEADER_HEIGHT is the "time-held rail" — a
  // vertical band below the line that grows with the owner's hold period.
  const railHeight = Math.max(0, trackHeight - HEADER_HEIGHT);
  // Periods held 5+ years get a "long hold" visual accent on the duration
  // pill — the Silva-trust 9-year hold reads as the clear outlier.
  const isLongHold = yearsHeld >= 5;

  return (
    <section
      aria-label={`Ownership period: ${period.owner}`}
      className={`border rounded-lg mb-3 ${borderClass}`}
    >
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-slate-800 truncate">
            {period.owner}
          </span>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            {period.start_date}
            {period.end_date ? ` → ${period.end_date}` : " → present"}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
              isLongHold
                ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                : "bg-slate-100 text-slate-700"
            }`}
            title={`Owner held title for ${durationLabel} (${yearsHeld.toFixed(1)} years)`}
          >
            held {durationLabel}
          </span>
          {hasSynthetic && (
            <span
              className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-medium"
              title="This ownership period includes demo-only synthesized rows"
            >
              synthetic
            </span>
          )}
        </div>
        {period.is_current && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            {t("Current Owner")}
          </span>
        )}
      </div>

      <div className="relative px-3" style={{ height: trackHeight }}>
        <svg
          className="absolute inset-0 animate-track-grow origin-left"
          width="100%"
          height={trackHeight}
          aria-hidden
          style={{ animationDelay: `${trackIndex * 100}ms` }}
        >
          <line
            x1={0}
            x2={widthPx}
            y1={Y_CENTER}
            y2={Y_CENTER}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          {nodes.map((_n, i) => {
            if (i === 0) return null;
            // A connector between node i-1 and i glows if either endpoint
            // is the currently hovered node.
            const isGlow =
              hoveredNodeIndex === i - 1 || hoveredNodeIndex === i;
            return (
              <line
                key={i}
                x1={nodesWithLayout[i - 1].visualX}
                x2={nodesWithLayout[i].visualX}
                y1={Y_CENTER}
                y2={Y_CENTER}
                stroke="#64748b"
                strokeWidth={isGlow ? 4 : 2}
                opacity={isGlow ? 1 : 0.5}
                className="transition-all duration-200"
              />
            );
          })}
          {nodesWithLayout.map((nl, i) =>
            nl.leader ? (
              <g key={`leader-${i}`}>
                <line
                  x1={nl.axisX}
                  x2={nl.axisX}
                  y1={Y_CENTER - 10}
                  y2={Y_CENTER}
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
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
          {/*
            Time-held rail: a vertical band below the axis line whose
            height is proportional to how long the owner held title.
            Same visual idiom as a D3 vertical time axis — longer hold
            = taller rail = more visual weight. Only rendered when the
            track has extra height beyond the base pin+line zone.
          */}
          {railHeight > 0 && (
            <g aria-hidden>
              <rect
                x={20}
                y={HEADER_HEIGHT}
                width={3}
                height={railHeight}
                rx={1.5}
                fill={
                  period.is_current
                    ? "#3b82f6" /* moat-blue current */
                    : isLongHold
                      ? "#d97706" /* amber-600 long hold */
                      : "#94a3b8" /* slate-400 normal */
                }
                opacity={period.is_current ? 0.7 : 0.55}
              />
              {/* Subtle horizontal tick at the bottom of the rail */}
              <line
                x1={15}
                x2={28}
                y1={trackHeight - 1}
                y2={trackHeight - 1}
                stroke={
                  period.is_current
                    ? "#3b82f6"
                    : isLongHold
                      ? "#d97706"
                      : "#94a3b8"
                }
                strokeWidth={1.5}
                opacity={0.7}
              />
            </g>
          )}
        </svg>

        {/*
          Duration annotation floats to the right of the rail on any
          period tall enough to host it (≥ 90 px). Keeps the "held N yr"
          visible INSIDE the card's visual scan path, not just as a pill
          in the header.
        */}
        {railHeight >= 30 && (
          <div
            className="absolute text-[11px] font-medium pointer-events-none select-none"
            style={{
              left: 36,
              top: HEADER_HEIGHT + 4,
              color: period.is_current
                ? "#1d4ed8"
                : isLongHold
                  ? "#92400e"
                  : "#64748b",
            }}
          >
            {durationLabel}
            <span className="block text-[10px] text-slate-400 font-normal">
              {period.is_current ? "still held" : "held"}
            </span>
          </div>
        )}

        {nodes.map((n, i) => {
          const date = n.kind === "single" ? n.instrument.recording_date : n.date;
          const x = nodesWithLayout[i].visualX;
          const backRefInstrument =
            n.kind === "single" ? n.instrument.instrument_number : null;
          const backRefs = backRefInstrument
            ? (backRefsByInstrument.get(backRefInstrument) ?? []).map((lcId) => ({
                lifecycleId: lcId,
                onJump: () => onJumpLifecycle(lcId),
              }))
            : [];
          // Node pop-in: +300ms offset lets the track line finish growing
          // before its instruments appear; +80ms per node staggers them
          // left-to-right along the track.
          const nodeDelayMs = trackIndex * 100 + 300 + i * 80;
          return (
            <div
              key={n.kind === "single" ? n.instrument.instrument_number : date}
              className="animate-fade-in-up"
              style={{ animationDelay: `${nodeDelayMs}ms` }}
              onMouseEnter={() => setHoveredNodeIndex(i)}
              onMouseLeave={() => setHoveredNodeIndex(null)}
            >
              <InstrumentNode
                xPx={x}
                kind={n.kind}
                instrument={n.kind === "single" ? n.instrument : undefined}
                instruments={n.kind === "composite" ? n.instruments : undefined}
                date={date}
                onOpenDocument={onOpenDocument}
                backRefsOut={backRefs}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
