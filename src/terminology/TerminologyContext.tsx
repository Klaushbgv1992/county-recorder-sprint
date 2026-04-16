import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { translate } from "./glossary";

type Mode = "professional" | "plain";

interface TerminologyContextValue {
  mode: Mode;
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

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(readStoredMode);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "professional" ? "plain" : "professional";
      try { localStorage.setItem("terminology-mode", next); } catch {}
      return next;
    });
  }, []);

  const t = useCallback(
    (term: string): string => (mode === "plain" ? translate(term) : term),
    [mode],
  );

  return <Ctx value={{ mode, toggle, t }}>{children}</Ctx>;
}

export function useTerminology(): TerminologyContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTerminology must be inside TerminologyProvider");
  return ctx;
}
