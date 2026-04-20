import { useState, useRef, useEffect } from "react";
import type { LifecycleStatus } from "../../types";
import { useTerminology } from "../../terminology/TerminologyContext";

interface Props {
  currentOverride: LifecycleStatus | null;
  statusRationale: string;
  onSetOverride: (s: LifecycleStatus) => void;
}

export function OverrideMenu({
  currentOverride,
  statusRationale,
  onSetOverride,
}: Props) {
  const { t } = useTerminology();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Examiner overrides"
        title="Examiner overrides"
      >
        <span>{t("Override")}</span>
        <span aria-hidden="true" className="text-slate-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded shadow-lg p-3 w-64"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
            {t("Override status")}
          </div>
          <div className="flex gap-1 mb-3">
            {(["open", "released", "unresolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onSetOverride(s)}
                className={`px-2 py-1 rounded text-[11px] font-medium ${
                  currentOverride === s
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t(s.charAt(0).toUpperCase() + s.slice(1))}
              </button>
            ))}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
            Status rationale
          </div>
          <div className="text-[11px] text-slate-600 leading-snug">
            {statusRationale}
          </div>
        </div>
      )}
    </div>
  );
}
