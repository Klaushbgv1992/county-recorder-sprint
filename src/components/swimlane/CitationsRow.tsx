import { useState } from "react";
import { useTerminology } from "../../terminology/TerminologyContext";

export interface CitationEntry {
  citingInstrument: string;
  targetLifecycleId: string;
  targetInstruments: string[];
}

interface Props {
  inbound: CitationEntry[];
  outbound: CitationEntry[];
  onJump: (lifecycleId: string) => void;
}

export function CitationsRow({ inbound, outbound, onJump }: Props) {
  const { t } = useTerminology();
  const [expanded, setExpanded] = useState(false);
  const total = inbound.length + outbound.length;
  if (total === 0) return null;
  const label = `${total} ${t(total === 1 ? "citation" : "citations")}`;

  return (
    <div className="border-t border-slate-100 mt-2 pt-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
        aria-expanded={expanded}
      >
        <span>{expanded ? "▾" : "▸"}</span>
        <span>{label}</span>
      </button>
      {expanded && (
        <div className="mt-1 pl-4 space-y-1 text-[11px]">
          {inbound.length > 0 && (
            <div>
              <span className="font-medium text-slate-600">{t("cited by")}: </span>
              {inbound.map((c, i) => (
                <span key={`${c.citingInstrument}-${i}`}>
                  {i > 0 && ", "}
                  <button
                    onClick={() => onJump(c.targetLifecycleId)}
                    className="font-mono text-blue-700 hover:underline"
                  >
                    {c.citingInstrument} in {c.targetLifecycleId}
                    {c.targetInstruments.length > 1 && ` (×${c.targetInstruments.length})`}
                  </button>
                </span>
              ))}
            </div>
          )}
          {outbound.length > 0 && (
            <div>
              <span className="font-medium text-slate-600">{t("cites")}: </span>
              {outbound.map((c, i) => (
                <span key={`${c.citingInstrument}-${i}`}>
                  {i > 0 && ", "}
                  <button
                    onClick={() => onJump(c.targetLifecycleId)}
                    className="font-mono text-blue-700 hover:underline"
                  >
                    {c.targetLifecycleId}
                    {c.targetInstruments.length > 1 && ` (×${c.targetInstruments.length})`}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
