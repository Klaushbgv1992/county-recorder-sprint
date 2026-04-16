import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router";
import state from "../data/pipeline-state.json";
import {
  currentFreshness,
  type PipelineState,
} from "../logic/pipeline-selectors";
import {
  MARICOPA_BUSINESS_DAY_RECORDING_VOLUME,
  arizonaHour,
  countAtTime,
  shouldRenderHeartbeat,
  sparklineBars,
  type SparklineBar,
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
  const bars = sparklineBars(t);
  const elapsedHours = Math.floor(arizonaHour(t));

  return (
    <section
      aria-label="Maricopa Recorder live-pacing band"
      aria-describedby="heartbeat-provenance"
      className="border-b border-slate-200 bg-white"
    >
      <div className="px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:gap-8">
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

        <div className="hidden md:block md:flex-1">
          <Sparkline bars={bars} elapsedHours={elapsedHours} />
        </div>

        <div className="hidden md:flex md:items-center md:gap-6">
          <p className="text-sm text-slate-700 max-w-xs">
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

function Sparkline({
  bars,
  elapsedHours,
}: {
  bars: SparklineBar[];
  elapsedHours: number;
}): ReactElement {
  const WIDTH = 240;
  const HEIGHT = 100;
  const BAR_GAP = 2;
  const BAR_WIDTH = (WIDTH - 23 * BAR_GAP) / 24;
  const BASELINE_Y = HEIGHT - 1;

  return (
    <svg
      role="img"
      aria-label={`Filing volume by hour — ${elapsedHours} of 24 hours elapsed, business-hour pacing`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-auto max-h-[100px]"
      preserveAspectRatio="none"
    >
      <line
        x1={0}
        y1={BASELINE_Y}
        x2={WIDTH}
        y2={BASELINE_Y}
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      {bars.map((bar) => {
        if (bar.heightFraction === 0) return null;
        const barHeight = bar.heightFraction * (HEIGHT - 2);
        const x = bar.hour * (BAR_WIDTH + BAR_GAP);
        const y = BASELINE_Y - barHeight;
        const commonProps = {
          key: bar.hour,
          "data-hour": bar.hour,
          "data-elapsed": bar.elapsed ? "true" : "false",
          x,
          y,
          width: BAR_WIDTH,
          height: barHeight,
        } as const;
        return bar.elapsed ? (
          <rect {...commonProps} fill="#475569" />
        ) : (
          <rect {...commonProps} fill="none" stroke="#cbd5e1" strokeWidth={1} />
        );
      })}
    </svg>
  );
}
