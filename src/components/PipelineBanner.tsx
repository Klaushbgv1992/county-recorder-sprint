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
    <div className="h-10 px-4 flex items-center gap-2.5 text-xs text-slate-700 bg-gradient-to-b from-white to-slate-50 border-b border-moat-200/70 shadow-[0_1px_0_rgba(15,23,42,0.02)] shrink-0">
      {/* Live-indicator dot — reads as "the custodian is feeding this
          page" vs a static snapshot. 1.6s pulse-glow ring animation is
          suppressed under prefers-reduced-motion (see index.css). */}
      <span
        aria-label="Live data feed"
        className="inline-block w-2 h-2 rounded-full bg-moat-500 animate-pulse-glow shrink-0"
      />
      <span className="text-slate-600">
        Verified through{" "}
        <span className="font-mono font-semibold text-sm text-slate-900">{verifiedThrough}</span>
      </span>
      <span className="text-slate-300">·</span>
      {/* Days-ahead is emphasised with font-weight, not color. Color is
          reserved for the interactive affordance (the link). */}
      <span className="text-slate-600">
        <span
          data-testid="days-ahead-count"
          className="font-medium text-slate-900"
        >
          {daysAhead}
        </span>{" "}
        days ahead of typical title-plant cycle
      </span>
      <span className="text-slate-300">·</span>
      <Link
        to="/pipeline"
        className="text-moat-700 hover:text-moat-900 font-medium underline underline-offset-2 decoration-moat-300 hover:decoration-moat-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded"
      >
        See pipeline →
      </Link>
    </div>
  );
}
