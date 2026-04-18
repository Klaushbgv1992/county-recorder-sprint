import { useState } from "react";
import { useTerminology } from "../../terminology/TerminologyContext";

export interface CitationEntry {
  citingInstrument: string;
  targetLifecycleId: string;
  targetInstruments: string[];
}

interface Props {
  inbound: CitationEntry[];
  onJump: (lifecycleId: string) => void;
}

function CitationLink({
  entry,
  onJump,
}: {
  entry: CitationEntry;
  onJump: (lifecycleId: string) => void;
}) {
  return (
    <button
      onClick={() => onJump(entry.targetLifecycleId)}
      className="font-mono text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded"
    >
      {entry.citingInstrument} in {entry.targetLifecycleId}
      {entry.targetInstruments.length > 1 && ` (×${entry.targetInstruments.length})`}
    </button>
  );
}

export function CitationsRow({ inbound, onJump }: Props) {
  const { t } = useTerminology();
  const [expanded, setExpanded] = useState(false);
  const total = inbound.length;
  if (total === 0) return null;

  // Single source: render inline without a disclosure — one click, no extra
  // chrome. 2+ sources collapse behind a "Sources (N)" disclosure so dense
  // swimlanes stay scannable.
  if (total === 1) {
    return (
      <div className="border-t border-slate-100 mt-2 pt-1 text-[11px]">
        <span className="font-medium text-slate-600">{t("cited by")}: </span>
        <CitationLink entry={inbound[0]} onJump={onJump} />
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 mt-2 pt-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded"
        aria-expanded={expanded}
      >
        <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
        <span>Sources ({total})</span>
      </button>
      {expanded && (
        <div className="mt-1 pl-4 space-y-1 text-[11px]">
          <div>
            <span className="font-medium text-slate-600">{t("cited by")}: </span>
            {inbound.map((c, i) => (
              <span key={`${c.citingInstrument}-${i}`}>
                {i > 0 && ", "}
                <CitationLink entry={c} onJump={onJump} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
