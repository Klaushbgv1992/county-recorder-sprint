import { useState } from "react";
import type { Instrument, DocumentType } from "../../types";
import { useTerminology } from "../../terminology/TerminologyContext";

const SHORT_LABEL: Record<DocumentType, string> = {
  warranty_deed: "Deed",
  special_warranty_deed: "Deed",
  quit_claim_deed: "Deed",
  grant_deed: "Deed",
  deed_of_trust: "DOT",
  heloc_dot: "HELOC",
  assignment_of_dot: "Assign.",
  substitution_of_trustee: "Sub.T.",
  full_reconveyance: "Release",
  partial_reconveyance: "Release",
  modification: "Mod.",
  ucc_termination: "UCC-3",
  hoa_lien: "Lien",
  affidavit_of_disclosure: "Affid.",
  other: "Doc",
};

interface BackRefChip {
  lifecycleId: string;
  onJump: () => void;
}

interface Props {
  xPx: number;
  kind: "single" | "composite";
  instrument?: Instrument;
  instruments?: Instrument[];
  date: string;
  onOpenDocument: (instrumentNumber: string) => void;
  backRefsOut: BackRefChip[];
  isMersGapEnd?: "dot" | "release";
}

export function InstrumentNode({
  xPx,
  kind,
  instrument,
  instruments,
  date,
  onOpenDocument,
  backRefsOut,
  isMersGapEnd,
}: Props) {
  const { t } = useTerminology();
  const [expanded, setExpanded] = useState(false);

  if (kind === "composite" && instruments) {
    const count = instruments.length;
    return (
      <div
        className="absolute -translate-x-1/2 flex flex-col items-center"
        style={{ left: xPx, top: 0 }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="relative w-7 h-7 rounded-full bg-slate-700 text-white text-[11px] font-bold grid place-items-center shadow-sm hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          aria-label={`${count} same-day instruments recorded ${date}`}
          title={`${count} instruments · ${date}`}
        >
          ×{count}
        </button>
        <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{date}</div>
        {expanded && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 bg-white border border-slate-200 rounded shadow-md p-2 min-w-[220px]">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              Same-day transaction
            </div>
            {instruments.map((i) => (
              <button
                key={i.instrument_number}
                onClick={() => onOpenDocument(i.instrument_number)}
                className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded"
              >
                <div className="font-mono text-xs text-blue-700">{i.instrument_number}</div>
                <div className="text-[11px] text-slate-600">
                  {t(SHORT_LABEL[i.document_type])}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (kind === "single" && instrument) {
    const label = t(SHORT_LABEL[instrument.document_type]);
    const ringClass =
      isMersGapEnd === "dot"
        ? "ring-2 ring-amber-400"
        : isMersGapEnd === "release"
          ? "ring-2 ring-amber-400"
          : "";
    return (
      <div
        className="absolute -translate-x-1/2 flex flex-col items-center"
        style={{ left: xPx, top: 0 }}
      >
        <button
          onClick={() => onOpenDocument(instrument.instrument_number)}
          className={`w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-semibold grid place-items-center shadow-sm hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${ringClass}`}
          aria-label={`${label} ${instrument.instrument_number} recorded ${instrument.recording_date}`}
          title={`${label} · ${instrument.instrument_number}`}
        >
          {label.slice(0, 3)}
        </button>
        <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
          {instrument.recording_date}
        </div>
        {backRefsOut.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {backRefsOut.map((chip) => (
              <button
                key={chip.lifecycleId}
                onClick={chip.onJump}
                className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                title={`Jump to ${chip.lifecycleId}`}
              >
                ↗ {t("cites")} {chip.lifecycleId}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
