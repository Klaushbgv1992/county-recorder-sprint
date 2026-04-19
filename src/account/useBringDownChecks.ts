import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.bringDown.v1";

type State = Record<string, string>;

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: State = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

export function useBringDownChecks() {
  const [state, setState] = useState<State>(() => read());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  const markChecked = useCallback((apn: string, isoDate: string) => {
    setState((s) => ({ ...s, [apn]: isoDate }));
  }, []);

  return { lastChecked: state, markChecked };
}
