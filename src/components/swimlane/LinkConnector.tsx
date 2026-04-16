import { useState, useRef, useEffect } from "react";
import type { DocumentLink, Instrument, ExaminerAction } from "../../types";
import { ProvenanceTag } from "../ProvenanceTag";
import { LinkEvidenceBars } from "../LinkEvidenceBars";

interface Props {
  startX: number;
  endX: number;
  yCenter: number;
  style: "solid" | "dashed";
  link: DocumentLink;
  linkActions: Record<string, ExaminerAction>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  dot?: Instrument;
  release?: Instrument;
  curated: boolean;
}

export function LinkConnector({
  startX,
  endX,
  yCenter,
  style,
  link,
  linkActions,
  onSetLinkAction,
  dot,
  release,
  curated,
}: Props) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const midX = (startX + endX) / 2;
  const dashArray = style === "dashed" ? "4 3" : undefined;
  const current = linkActions[link.id] ?? link.examiner_action;

  return (
    <>
      <line
        x1={startX}
        y1={yCenter}
        x2={endX}
        y2={yCenter}
        stroke="#64748b"
        strokeWidth={2}
        strokeDasharray={dashArray}
      />
      <div
        className="absolute cursor-pointer"
        style={{
          left: Math.min(startX, endX),
          top: yCenter - 8,
          width: Math.abs(endX - startX),
          height: 16,
        }}
        onClick={() => setOpen((o) => !o)}
        title="Link details"
      />
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500 text-[10px] leading-none grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        style={{ left: midX, top: yCenter }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${link.link_type.replace(/_/g, " ")} link details`}
      >
        i
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-20 bg-white border border-slate-200 rounded shadow-lg p-3 w-72"
          style={{ left: midX, top: yCenter + 16 }}
          role="dialog"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
              {link.link_type.replace(/_/g, " ")}
            </div>
            <ProvenanceTag provenance={link.provenance} confidence={link.confidence} />
          </div>
          {dot && release && link.link_type === "release_of" && (
            <LinkEvidenceBars dot={dot} release={release} />
          )}
          {!curated && (
            <div className="flex gap-1 mt-2">
              {(["accepted", "rejected", "unresolved"] as const).map((action) => {
                const isActive = current === action;
                const palette = {
                  accepted: isActive ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-green-100 text-gray-700",
                  rejected: isActive ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-red-100 text-gray-700",
                  unresolved: isActive ? "bg-amber-600 text-white" : "bg-gray-100 hover:bg-amber-100 text-gray-700",
                }[action];
                return (
                  <button
                    key={action}
                    onClick={() => onSetLinkAction(link.id, action)}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${palette}`}
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                );
              })}
            </div>
          )}
          {curated && (
            <div className="text-[10px] text-slate-500 mt-2 italic">
              Curated link. See Decision #41 — no inline unlink.
            </div>
          )}
        </div>
      )}
    </>
  );
}
