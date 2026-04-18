// src/components/PortalModeToggle.tsx
import type { PortalMode } from "../hooks/usePortalMode";

export interface PortalModeToggleProps {
  mode: PortalMode;
  onChange: (next: PortalMode) => void;
}

export function PortalModeToggle({ mode, onChange }: PortalModeToggleProps) {
  const next: PortalMode = mode === "homeowner" ? "examiner" : "homeowner";
  const label = mode === "homeowner" ? "Open examiner view →" : "Homeowner view →";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline underline-offset-2"
    >
      {label}
    </button>
  );
}
