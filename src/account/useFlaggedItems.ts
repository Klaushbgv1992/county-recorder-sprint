import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.flaggedItems.v1";

export interface FlaggedItem {
  id: string;
  ref: string;
  instrument_number: string;
  parcel_apn?: string;
  reason: string;
  note: string;
  submitted_at: string;
  status: "pending" | "accepted" | "rejected";
}

function readAll(): FlaggedItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function readAllFlaggedItemsFromStorage(): FlaggedItem[] {
  return readAll();
}

function makeRef(id: string): string {
  const n = Array.from(id).reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 100000, 0);
  return `MCR-REPORT-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}

export function useFlaggedItems() {
  const [items, setItems] = useState<FlaggedItem[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const submit = useCallback(
    (input: { instrument_number: string; parcel_apn?: string; reason: string; note: string }): FlaggedItem => {
      const id = crypto.randomUUID();
      const entry: FlaggedItem = {
        id,
        ref: makeRef(id),
        instrument_number: input.instrument_number,
        parcel_apn: input.parcel_apn,
        reason: input.reason,
        note: input.note,
        submitted_at: new Date().toISOString(),
        status: "pending",
      };
      setItems((s) => [entry, ...s]);
      return entry;
    },
    [],
  );

  return { items, submit };
}
