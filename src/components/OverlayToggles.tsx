import { useState } from "react";
import type { OverlayName } from "../logic/overlay-state";
import { BottomSheet } from "./BottomSheet";

interface Props {
  overlays: Set<OverlayName>;
  onToggle: (n: OverlayName) => void;
  // Optional — when true, toggles collapse into a single "Layers" pill that
  // opens a bottom-sheet. Tests render without this prop and get the desktop
  // inline-pill layout (backward-compatible).
  isMobile?: boolean;
}

const PILL_CONFIG: Array<{
  name: OverlayName;
  label: string;
  pressedClass: string;
  swatchClass: string;
}> = [
  {
    name: "encumbrance",
    label: "Open encumbrances",
    pressedClass: "bg-moat-600 text-white",
    swatchClass: "bg-moat-600",
  },
  {
    name: "anomaly",
    label: "Curator anomalies",
    pressedClass: "bg-amber-500 text-white",
    swatchClass: "bg-amber-500",
  },
  {
    name: "lastdeed",
    label: "Last deed recorded",
    pressedClass: "bg-emerald-500 text-white",
    swatchClass: "bg-emerald-500",
  },
];

export function OverlayToggles({ overlays, onToggle, isMobile = false }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isMobile) {
    const activeCount = overlays.size;
    return (
      <>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={
            activeCount > 0
              ? `Map layers — ${activeCount} active`
              : "Map layers"
          }
          aria-expanded={sheetOpen}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-recorder-500"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span>Layers</span>
          {activeCount > 0 && (
            <span
              aria-hidden="true"
              className="rounded-full bg-moat-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
            >
              {activeCount}
            </span>
          )}
        </button>
        {sheetOpen && (
          <BottomSheet
            onClose={() => setSheetOpen(false)}
            ariaLabel="Map layers"
            title="Map layers"
            maxHeight="60vh"
          >
            <ul className="flex flex-col gap-2" role="list">
              {PILL_CONFIG.map((p) => {
                const on = overlays.has(p.name);
                return (
                  <li key={p.name}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggle(p.name)}
                      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${
                        on
                          ? "border-moat-600 bg-moat-50 text-moat-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`inline-block h-3 w-3 rounded-full ${p.swatchClass}`}
                        />
                        {p.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 rounded-full ${
                          on ? "bg-moat-600" : "bg-slate-300"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </BottomSheet>
        )}
      </>
    );
  }

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
