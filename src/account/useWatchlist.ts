import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.watchlist.v1";

interface State {
  parcels: string[];
  parties: string[];
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { parcels: [], parties: [] };
    const parsed = JSON.parse(raw);
    return {
      parcels: Array.isArray(parsed.parcels) ? parsed.parcels : [],
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
    };
  } catch {
    return { parcels: [], parties: [] };
  }
}

export function useWatchlist() {
  const [state, setState] = useState<State>(() => read());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  const toggleParcel = useCallback((apn: string) => {
    setState((s) => ({
      ...s,
      parcels: s.parcels.includes(apn) ? s.parcels.filter((a) => a !== apn) : [...s.parcels, apn],
    }));
  }, []);

  const toggleParty = useCallback((normalizedName: string) => {
    setState((s) => ({
      ...s,
      parties: s.parties.includes(normalizedName)
        ? s.parties.filter((n) => n !== normalizedName)
        : [...s.parties, normalizedName],
    }));
  }, []);

  const isParcelWatched = useCallback((apn: string) => state.parcels.includes(apn), [state.parcels]);
  const isPartyWatched = useCallback(
    (n: string) => state.parties.includes(n),
    [state.parties],
  );

  return { parcels: state.parcels, parties: state.parties, toggleParcel, toggleParty, isParcelWatched, isPartyWatched };
}
