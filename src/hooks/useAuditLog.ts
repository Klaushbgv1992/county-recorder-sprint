import { useState, useCallback } from "react";

export interface AuditRow {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  note?: string;
}

export function useAuditLog(): {
  rows: AuditRow[];
  append: (row: Omit<AuditRow, "timestamp">) => void;
  clear: () => void;
} {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const append = useCallback((row: Omit<AuditRow, "timestamp">) => {
    setRows((r) => [...r, { ...row, timestamp: new Date().toISOString() }]);
  }, []);
  const clear = useCallback(() => setRows([]), []);
  return { rows, append, clear };
}
