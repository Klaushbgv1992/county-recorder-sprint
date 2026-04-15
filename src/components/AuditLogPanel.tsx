import { useEffect, useRef } from "react";
import type { AuditRow } from "../hooks/useAuditLog";

interface Props {
  rows: AuditRow[];
}

export function AuditLogPanel({ rows }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [rows.length]);

  return (
    <section className="mt-6 border border-gray-200 rounded-lg bg-white">
      <header className="px-4 py-2 border-b border-gray-100 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Audit log</h3>
        <span className="text-xs text-gray-400">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </span>
      </header>
      <div className="max-h-60 overflow-auto px-4 py-2">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-400 font-mono py-4">
            No actions yet.
          </p>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-1 pr-3 font-medium">Timestamp</th>
                <th className="py-1 pr-3 font-medium">Actor</th>
                <th className="py-1 pr-3 font-medium">Action</th>
                <th className="py-1 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.timestamp}-${i}`}
                  className="border-b border-gray-50 last:border-b-0"
                >
                  <td className="py-1 pr-3 text-gray-600 whitespace-nowrap">
                    {r.timestamp}
                  </td>
                  <td className="py-1 pr-3 text-gray-800">{r.actor}</td>
                  <td className="py-1 pr-3 text-blue-700">{r.action}</td>
                  <td className="py-1 text-gray-700 break-all">{r.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div ref={bottomRef} />
      </div>
      <footer className="px-4 py-2 border-t border-gray-100 text-[11px] text-slate-500">
        Production note: each row is a signed database entry with actor identity
        and matcher snapshot. This demo is session-only.
      </footer>
    </section>
  );
}
