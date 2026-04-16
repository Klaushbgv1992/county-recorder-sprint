import { Link } from "react-router";
import state from "../data/pipeline-state.json";
import {
  currentFreshness,
  laggingVsPlant,
  type PipelineState,
} from "../logic/pipeline-selectors";

const pipelineState = state as unknown as PipelineState;

// Exported for unit tests. Pure.
export function shouldRenderBanner(input: {
  daysAhead: number;
  verifiedThrough: string;
}): boolean {
  if (!input.verifiedThrough) return false;
  if (!Number.isFinite(input.daysAhead)) return false;
  if (input.daysAhead < 0) return false;
  return true;
}

export function PipelineBanner() {
  const freshness = currentFreshness(pipelineState);
  const lag = laggingVsPlant(pipelineState);
  const verifiedThrough = freshness.index;
  const daysAhead = lag.days_ahead_of_min_plant_lag;

  if (!shouldRenderBanner({ daysAhead, verifiedThrough })) {
    // Silent no-render. If stale or missing, the banner sits out rather
    // than advertising "Verified through undefined" or a negative count.
    return null;
  }

  return (
    <div className="h-8 px-4 flex items-center gap-2 text-xs text-slate-700 bg-slate-100 border-b border-slate-200 shrink-0">
      <span>
        Verified through{" "}
        <span className="font-mono text-slate-900">{verifiedThrough}</span>
      </span>
      <span className="text-slate-400">·</span>
      {/* Days-ahead is emphasised with font-weight, not color. Color is
          reserved for the interactive affordance (the link). */}
      <span>
        <span
          data-testid="days-ahead-count"
          className="font-medium text-slate-900"
        >
          {daysAhead}
        </span>{" "}
        days ahead of typical title-plant cycle
      </span>
      <span className="text-slate-400">·</span>
      <Link
        to="/pipeline"
        className="text-moat-700 hover:text-moat-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        See pipeline →
      </Link>
    </div>
  );
}
