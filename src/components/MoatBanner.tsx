import type { PipelineStatus } from "../types";
import { useTerminology } from "../terminology/TerminologyContext";

const STAGE_ORDER = ["received", "recorded", "indexed", "verified", "published"];

interface Props {
  pipelineStatus: PipelineStatus;
}

export function MoatBanner({ pipelineStatus }: Props) {
  const { t } = useTerminology();
  const currentIdx = STAGE_ORDER.indexOf(pipelineStatus.current_stage);

  return (
    <div className="bg-moat-900 text-white px-4 py-3 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">
          {t("County Recording Pipeline Status")}
        </span>
        <span className="text-xs text-moat-200">
          Records verified through{" "}
          <span className="font-mono font-semibold text-white">
            {pipelineStatus.verified_through_date}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((stage, idx) => {
          // The "active" stage is the last lit-up chip. A static moat-300
          // ring plus a small inner white dot marks it — meaning cue
          // without a motion loop. Prior stages stay solid; upcoming
          // stages stay dim.
          const isActive = idx === currentIdx;
          const isLit = idx <= currentIdx;
          return (
            <div key={stage} className="flex items-center gap-1">
              <div
                className={`px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1 ${
                  isLit
                    ? "bg-moat-500 text-white"
                    : "bg-moat-800 text-moat-400"
                } ${isActive ? "ring-1 ring-moat-300" : ""}`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-1.5 rounded-full bg-white ring-2 ring-white/50"
                  />
                )}
                {t(stage.charAt(0).toUpperCase() + stage.slice(1))}
              </div>
              {idx < STAGE_ORDER.length - 1 && (
                <span
                  className={`text-xs ${idx < currentIdx ? "text-moat-400" : "text-moat-700"}`}
                >
                  &rarr;
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-moat-300 mt-2">
        {t("Source")}: Maricopa County Recorder — authoritative county data, not a
        third-party aggregation
      </p>
    </div>
  );
}
