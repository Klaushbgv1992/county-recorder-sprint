import { useCallback, useRef, useState } from "react";

/**
 * Live push demo — makes the county's sync advantage visible.
 *
 * Simulates the end-to-end filing path the recorder actually executes
 * in production: an instrument is received at the counter, indexed,
 * and published. The demo runs the four steps with ~300ms pacing so
 * the reader sees them advance in real time. After completion, a
 * prominent ribbon shows how long title plants will lag before they
 * see this same instrument (from `pipeline-state.json`).
 *
 * This is a CLIENT-SIDE ANIMATION. Nothing is actually recorded. It
 * demonstrates the product claim: only the county is the origin; every
 * other surface (plant, aggregator, Zillow) is downstream and must
 * lag. See Decision #16 (live sync is a mention-only prototype claim).
 */

interface Stage {
  label: string;
  detail: string;
  /** Offset in ms from push start. */
  at_ms: number;
}

interface Props {
  lagDaysMin: number;
  lagDaysMax: number;
  /** Test hatch: override animation pacing (default real-time). */
  stageSchedule?: number[];
}

const DEFAULT_SCHEDULE = [0, 350, 700, 1050];

const STAGES: Omit<Stage, "at_ms">[] = [
  {
    label: "Received by Recorder",
    detail: "Instrument delivered to the counter. Doc type: DEED TRST. Parties logged.",
  },
  {
    label: "Recorded",
    detail: "Recording number 20260418100042 assigned. Timestamp stored to the county index.",
  },
  {
    label: "Indexed",
    detail: "Parties + legal desc + book/page written to the grantor/grantee index.",
  },
  {
    label: "Published",
    detail: "Visible at publicapi.recorder.maricopa.gov/documents/20260418100042 and on this portal.",
  },
];

type Phase =
  | { kind: "idle" }
  | { kind: "running"; startedAt: number; reachedIndex: number }
  | { kind: "done"; pushedAt: string };

export function LivePushDemo({
  lagDaysMin,
  lagDaysMax,
  stageSchedule = DEFAULT_SCHEDULE,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  const start = useCallback(() => {
    clearTimers();
    const startedAt = Date.now();
    setPhase({ kind: "running", startedAt, reachedIndex: -1 });
    // Step through stages at scheduled offsets.
    stageSchedule.forEach((offset, i) => {
      timers.current.push(
        setTimeout(() => {
          setPhase((prev) =>
            prev.kind === "running" ? { ...prev, reachedIndex: i } : prev,
          );
        }, offset),
      );
    });
    // Mark done shortly after the last stage fires.
    timers.current.push(
      setTimeout(() => {
        setPhase({
          kind: "done",
          pushedAt: new Date().toISOString(),
        });
      }, (stageSchedule[stageSchedule.length - 1] ?? 0) + 200),
    );
  }, [stageSchedule, clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setPhase({ kind: "idle" });
  }, [clearTimers]);

  const reachedIndex =
    phase.kind === "running"
      ? phase.reachedIndex
      : phase.kind === "done"
        ? STAGES.length - 1
        : -1;

  return (
    <section
      aria-label="Live push demo"
      className="rounded-lg border border-indigo-200 bg-white shadow-sm overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3 bg-indigo-50 border-b border-indigo-200">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
            Live push demo
          </div>
          <h3 className="text-base font-semibold text-indigo-900">
            Watch an instrument flow from the counter to the portal
          </h3>
          <p className="mt-1 text-xs text-indigo-800">
            No other surface can show this — only the county is the
            origin. Plant products subscribe to bulk feeds that pipe a
            copy of the same event {lagDaysMin}–{lagDaysMax} days later.
          </p>
        </div>
        {phase.kind === "idle" && (
          <button
            type="button"
            onClick={start}
            className="shrink-0 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Record new instrument now
          </button>
        )}
        {phase.kind === "done" && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded bg-white border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Reset
          </button>
        )}
      </header>

      <ol className="divide-y divide-indigo-50">
        {STAGES.map((stage, i) => {
          const reached = i <= reachedIndex;
          const isCurrent = i === reachedIndex && phase.kind === "running";
          return (
            <li
              key={stage.label}
              className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                reached ? "bg-white" : "bg-gray-50"
              }`}
              data-testid={`live-push-stage-${i}`}
              data-reached={reached}
            >
              <StageMarker reached={reached} isCurrent={isCurrent} />
              <div className="flex-1">
                <div
                  className={`text-sm font-semibold ${
                    reached ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {stage.label}
                </div>
                <div
                  className={`text-xs mt-0.5 font-mono ${
                    reached ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {stage.detail}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {phase.kind === "done" && (
        <div
          className="border-t border-indigo-200 bg-gradient-to-r from-indigo-50 to-white px-5 py-3 text-xs text-indigo-900 flex items-center gap-3"
          role="status"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          <span>
            <strong>Published {formatRelative(phase.pushedAt)}.</strong>{" "}
            Title plants consuming the next daily bulk feed will not see
            this instrument until{" "}
            <span className="font-mono">
              {lagDaysMin}–{lagDaysMax} days
            </span>{" "}
            from now. The county index is the only surface where this
            document exists right now.
          </span>
        </div>
      )}
    </section>
  );
}

function StageMarker({
  reached,
  isCurrent,
}: {
  reached: boolean;
  isCurrent: boolean;
}) {
  if (!reached) {
    return (
      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 bg-white" />
    );
  }
  if (isCurrent) {
    return (
      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-indigo-500 animate-pulse" />
    );
  }
  return (
    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white">
      ✓
    </span>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 5000) return "just now";
  const s = Math.round(ms / 1000);
  return `${s}s ago`;
}
