import { Link } from "react-router";
import { STEPS, TOTAL_STEPS } from "../walkthrough/steps";

/**
 * Prominent "Start examiner walkthrough" card rendered on the landing
 * page when the tour is not already active. Establishes the one dominant
 * path for first-time reviewers: search → chain → open encumbrance →
 * candidate release review → commitment export.
 */
export function WalkthroughCTA() {
  const beats = STEPS.map((s) => s.heading);
  return (
    <section
      aria-label="Examiner walkthrough"
      className="bg-gradient-to-br from-moat-700 to-recorder-800 text-white px-6 py-6 border-b border-moat-800"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-moat-100/90">
            Examiner walkthrough · {TOTAL_STEPS} steps · ~60 seconds
          </p>
          <h2 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight">
            See how a title examiner closes a chain
          </h2>
          <p className="mt-1 text-sm text-moat-100/90 max-w-2xl">
            One real parcel, end to end: {beats.join(" → ")}.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <Link
            to={STEPS[0].path}
            className="inline-flex items-center rounded-md bg-white text-moat-800 text-sm font-semibold px-4 py-2 shadow-sm hover:bg-moat-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Start walkthrough →
          </Link>
        </div>
      </div>
    </section>
  );
}
