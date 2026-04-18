import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.recordsRequests.v1";

export interface RecordsRequest {
  id: string;
  ref: string;
  subject: string;
  details: string;
  requested_at: string;
  status: "submitted" | "in_review" | "fulfilled";
}

function readAll(): RecordsRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecordsRequest[]) : [];
  } catch { return []; }
}

function makeRef(id: string): string {
  const n = Array.from(id).reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 100000, 0);
  return `MCR-FOIA-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}

export function useRecordsRequests() {
  const [items, setItems] = useState<RecordsRequest[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const submit = useCallback(
    (input: { subject: string; details: string }): RecordsRequest => {
      const id = crypto.randomUUID();
      const entry: RecordsRequest = {
        id, ref: makeRef(id),
        subject: input.subject, details: input.details,
        requested_at: new Date().toISOString(), status: "submitted",
      };
      setItems((s) => [entry, ...s]);
      return entry;
    },
    [],
  );

  return { items, submit };
}
