import { useEffect } from "react";
import { Link } from "react-router";

type Severity = "high" | "medium" | "low";

interface Anomaly {
  id: string;
  parcel_apn: string;
  severity: Severity;
  title: string;
  description: string;
}

interface Props {
  anomalies: Anomaly[];
  open: boolean;
  onClose: () => void;
}

const DOT: Record<Severity, string> = {
  high: "bg-red-600",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export function AnomalySummaryPanel({ anomalies, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const byApn = new Map<string, Anomaly[]>();
  for (const a of anomalies) {
    const arr = byApn.get(a.parcel_apn) ?? [];
    arr.push(a);
    byApn.set(a.parcel_apn, arr);
  }

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
            <Link to={`/parcel/${apn}`} className="mb-1 inline-block font-mono text-xs text-recorder-700 hover:underline">
              {apn}
            </Link>
            <ul className="space-y-1">
              {items.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs">
                  <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${DOT[a.severity]}`} aria-label={a.severity} />
                  <span className="text-slate-700">{a.title}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
