import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { translate } from "./glossary";

type Mode = "professional" | "plain";

interface TerminologyContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggle: () => void;
  t: (term: string) => string;
}

const Ctx = createContext<TerminologyContextValue | null>(null);

function readStoredMode(): Mode {
  try {
    const v = localStorage.getItem("terminology-mode");
    return v === "plain" ? "plain" : "professional";
  } catch {
    return "professional";
  }
}

function persist(mode: Mode): void {
  try { localStorage.setItem("terminology-mode", mode); } catch { /* storage unavailable */ }
}

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(readStoredMode);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "professional" ? "plain" : "professional";
      persist(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (term: string): string => (mode === "plain" ? translate(term) : term),
    [mode],
  );

  return <Ctx value={{ mode, setMode, toggle, t }}>{children}</Ctx>;
}

export function useTerminology(): TerminologyContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTerminology must be inside TerminologyProvider");
  return ctx;
}
