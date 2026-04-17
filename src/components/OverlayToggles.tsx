import type { OverlayName } from "../logic/overlay-state";

interface Props {
  overlays: Set<OverlayName>;
  onToggle: (n: OverlayName) => void;
}

const PILL_CONFIG: Array<{ name: OverlayName; label: string; pressedClass: string }> = [
  { name: "encumbrance", label: "Open encumbrances", pressedClass: "bg-moat-600 text-white" },
  { name: "anomaly", label: "Curator anomalies", pressedClass: "bg-amber-500 text-white" },
  { name: "lastdeed", label: "Last deed recorded", pressedClass: "bg-emerald-500 text-white" },
];

export function OverlayToggles({ overlays, onToggle }: Props) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-wrap gap-2">
      {PILL_CONFIG.map((p) => {
        const on = overlays.has(p.name);
        return (
          <button
            key={p.name}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(p.name)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium shadow-md focus-visible:ring-2 focus-visible:ring-recorder-500 focus-visible:outline-none transition-colors ${on ? p.pressedClass : "bg-white/95 text-slate-700 hover:bg-slate-100"}`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
