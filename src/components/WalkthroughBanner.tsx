import { useWalkthrough } from "../walkthrough/useWalkthrough";
import { TOTAL_STEPS } from "../walkthrough/steps";

/**
 * Persistent top-of-page banner that narrates the current examiner-walkthrough
 * step and carries the next-step CTA. Renders null outside the walkthrough.
 *
 * Mounted twice: once inside AppShell (covers /parcel/:apn/*) and once inside
 * LandingPage (covers /). Both mounts read the same URL-driven state so only
 * one banner ever appears per route.
 */
export function WalkthroughBanner() {
  const { active, currentStep, nextStep, advance, exit } = useWalkthrough();
  if (!active || !currentStep) return null;

  return (
    <div
      role="region"
      aria-label="Examiner walkthrough"
      className="bg-moat-700 text-white px-4 sm:px-6 py-3 border-b border-moat-800 shadow-sm"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-white/15 text-white text-[11px] font-semibold px-2 py-0.5 tracking-wide">
            Step {currentStep.step} / {TOTAL_STEPS}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-snug">
              {currentStep.heading}
            </div>
            <div className="text-[12px] leading-snug text-moat-100/90">
              {currentStep.why}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={advance}
            className="rounded-md bg-white text-moat-800 text-xs font-semibold px-3 py-1.5 hover:bg-moat-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {nextStep ? currentStep.ctaLabel : "Finish walkthrough"}
          </button>
          <button
            type="button"
            onClick={exit}
            className="text-[11px] font-medium text-white/80 hover:text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
