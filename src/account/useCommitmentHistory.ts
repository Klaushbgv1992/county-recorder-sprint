import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.commitmentHistory.v1";

export interface CommitmentExport {
  id: string;
  parcel_apn: string;
  exported_at: string;
  instrument_count: number;
  open_encumbrance_count: number;
}

function readAll(): CommitmentExport[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CommitmentExport[]) : [];
  } catch { return []; }
}

export function useCommitmentHistory() {
  const [items, setItems] = useState<CommitmentExport[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const record = useCallback((entry: Omit<CommitmentExport, "id" | "exported_at">) => {
    const full: CommitmentExport = {
      id: crypto.randomUUID(),
      exported_at: new Date().toISOString(),
      ...entry,
    };
    setItems((s) => [full, ...s]);
    return full;
  }, []);

  return { items, record };
}
