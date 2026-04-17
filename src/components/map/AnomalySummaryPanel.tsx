import { useEffect, useState } from "react";
import { Link } from "react-router";
import { renderAnomalyProse } from "../../narrative/engine";
import type { z } from "zod";
import type { StaffAnomalySchema } from "../../schemas";
import type { Instrument } from "../../types";

type StaffAnomaly = z.infer<typeof StaffAnomalySchema>;
type AnomalySeverity = StaffAnomaly["severity"];

interface Props {
  anomalies: StaffAnomaly[];
  instruments: Instrument[];
  open: boolean;
  onClose: () => void;
  onOpenDocument: (n: string) => void;
}

const DOT: Record<AnomalySeverity, string> = {
  high: "bg-red-600",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export function AnomalySummaryPanel({
  anomalies,
  instruments,
  open,
  onClose,
  onOpenDocument,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const byApn = new Map<string, StaffAnomaly[]>();
  for (const a of anomalies) {
    const arr = byApn.get(a.parcel_apn) ?? [];
    arr.push(a);
    byApn.set(a.parcel_apn, arr);
  }

  const toggle = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section
      className="absolute top-16 right-4 z-20 w-80 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl"
      role="region"
      aria-label="Curator anomaly summary"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h3 className="text-sm font-semibold text-recorder-900">Curator anomalies</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close anomaly panel"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-recorder-500 focus-visible:outline-none"
        >
          ×
        </button>
      </header>
      <ul className="divide-y divide-slate-100">
        {[...byApn.entries()].map(([apn, items]) => (
          <li key={apn} className="p-3">
            <Link
              to={`/parcel/${apn}`}
              className="mb-1 inline-block font-mono text-xs text-recorder-700 hover:underline"
            >
              {apn}
            </Link>
            <ul className="space-y-2">
              {items.map((a) => {
                const isOpen = expanded.has(a.id);
                return (
                  <li key={a.id} className="text-xs">
                    <button
                      type="button"
                      onClick={() => toggle(a.id)}
                      className="flex w-full items-start gap-2 text-left hover:bg-slate-50 rounded px-1 py-0.5"
                      aria-expanded={isOpen}
                    >
                      <span
                        className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${DOT[a.severity]}`}
                        aria-label={a.severity}
                      />
                      <span className="text-slate-700 flex-1">{a.title}</span>
                      <span className="text-slate-400" aria-hidden>
                        {isOpen ? "▾" : "▸"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-1 pl-4 text-slate-700 leading-relaxed">
                        {renderAnomalyProse(a, instruments, onOpenDocument)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
