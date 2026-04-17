import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router";
import state from "../data/pipeline-state.json";
import {
  currentFreshness,
  type PipelineState,
} from "../logic/pipeline-selectors";
import {
  MARICOPA_BUSINESS_DAY_RECORDING_VOLUME,
  countAtTime,
  shouldRenderHeartbeat,
} from "../logic/heartbeat-model";

const pipelineState = state as unknown as PipelineState;

export function CountyHeartbeat({ now }: { now?: number }): ReactElement | null {
  const freshness = currentFreshness(pipelineState);
  const verifiedThrough = freshness.index;
  const { lag_days_min: lagMin, lag_days_max: lagMax } =
    pipelineState.plant_lag_reference;

  // Hooks must not run below a conditional return, so this guard runs first.
  if (
    !shouldRenderHeartbeat({
      dailyTotal: MARICOPA_BUSINESS_DAY_RECORDING_VOLUME,
      verifiedThrough,
      lagMin,
      lagMax,
    })
  ) {
    return null;
  }

  return (
    <HeartbeatInner now={now} lagMin={lagMin} lagMax={lagMax} />
  );
}

function HeartbeatInner({
  now,
  lagMin,
  lagMax,
}: {
  now: number | undefined;
  lagMin: number;
  lagMax: number;
}): ReactElement {
  const [t, setT] = useState<number>(() => now ?? Date.now());

  useEffect(() => {
    if (now !== undefined) {
      setT(now);
      return;
    }
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, [now]);

  const count = countAtTime(t);

  return (
    <section
      aria-label="Maricopa Recorder live-pacing band"
      aria-describedby="heartbeat-provenance"
      className="border-b border-slate-200 bg-white"
    >
      <div className="px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex flex-col items-center md:items-start">
          <span
            aria-label="Documents filed by this hour in a Maricopa business day"
            className="font-mono tabular-nums text-3xl md:text-4xl font-semibold text-recorder-900"
          >
            {count.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">
            documents filed by this hour
          </span>
        </div>

        <div className="hidden md:flex md:items-center md:gap-6">
          <p className="text-sm text-slate-700 max-w-md">
            <strong className="font-semibold text-slate-900">
              The county operates the recording day.
            </strong>{" "}
            Title plants refresh {lagMin}–{lagMax} days behind.
          </p>
          <Link
            to="/pipeline"
            className="hidden md:inline-block text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors duration-150 whitespace-nowrap"
          >
            See pipeline →
          </Link>
        </div>

        <p className="md:hidden text-sm text-slate-700 leading-snug mt-2 text-center">
          <strong className="font-semibold text-slate-900">
            County operates the recording day
          </strong>{" "}
          · title plants lag {lagMin}–{lagMax}d
        </p>
      </div>

      <p
        id="heartbeat-provenance"
        className="max-md:sr-only md:block px-6 pb-2 text-[11px] text-slate-500 leading-tight"
      >
        Replaying Maricopa's ~4,000-doc business day (~1M/yr,{" "}
        <a
          href="https://recorder.maricopa.gov/site/about.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-slate-700 transition-colors duration-150"
        >
          per the Recorder's Office
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        ) at this hour · total volume cited; intra-day pacing modeled.
      </p>
    </section>
  );
}

// The 24-hour sparkline was removed post-merge after user feedback that
// the bars read as decorative rather than informative — without a visible
// caption or time-axis markers, the 7-zero + 10-equal + 7-trickle shape
// was confusing to demo. The pure function sparklineBars remains in
// src/logic/heartbeat-model.ts (unused but exported) in case we want to
// reintroduce a labeled version later. See user feedback 2026-04-17.
