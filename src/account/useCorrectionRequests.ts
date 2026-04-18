import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.correctionRequests.v1";

export interface CorrectionRequest {
  id: string;
  ref: string;
  parcel_apn: string;
  claim: string;
  correction: string;
  submitted_at: string;
  status: "pending" | "under_review" | "resolved";
}

function readAll(): CorrectionRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CorrectionRequest[]) : [];
  } catch { return []; }
}

function makeRef(id: string): string {
  const n = Array.from(id).reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 100000, 0);
  return `MCR-CORR-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}

export function useCorrectionRequests() {
  const [items, setItems] = useState<CorrectionRequest[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const submit = useCallback(
    (input: { parcel_apn: string; claim: string; correction: string }): CorrectionRequest => {
      const id = crypto.randomUUID();
      const entry: CorrectionRequest = {
        id, ref: makeRef(id),
        parcel_apn: input.parcel_apn, claim: input.claim, correction: input.correction,
        submitted_at: new Date().toISOString(), status: "pending",
      };
      setItems((s) => [entry, ...s]);
      return entry;
    },
    [],
  );

  return { items, submit };
}
