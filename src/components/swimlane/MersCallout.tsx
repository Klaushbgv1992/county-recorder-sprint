import type { MersGap } from "../../logic/swimlane-layout";

interface Props {
  gap: MersGap;
  xPx: number;
  yCenter: number;
}

export function MersCallout({ gap, xPx, yCenter }: Props) {
  return (
    <div
      className="absolute -translate-x-1/2 bg-white border border-amber-300 rounded shadow-sm px-2 py-1.5 z-10"
      style={{ left: xPx, top: yCenter - 30, width: 200 }}
      role="note"
      aria-label={gap.rule_finding.title}
    >
      <div className="text-[9px] uppercase tracking-wide text-amber-700 font-semibold mb-1">
        ⚠ Unrecorded transfer
      </div>
      <div className="flex items-center gap-1 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap truncate" title={gap.originator}>
          {gap.originator}
        </span>
        <span className="text-slate-400" aria-hidden>→</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-dashed border-amber-400 whitespace-nowrap" title="Note transferred via MERS outside the public record">
          ⛓ MERS
        </span>
        <span className="text-slate-400" aria-hidden>→</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap truncate" title={gap.releaser}>
          {gap.releaser}
        </span>
      </div>
    </div>
  );
}
