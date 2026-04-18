import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import anomaliesFixture from "../data/staff-anomalies.json";
import { useAuditLog } from "../hooks/useAuditLog";
import { AuditLogPanel } from "./AuditLogPanel";
import { StaffPageFrame } from "./StaffPageFrame";
import { StaffAnomalyFileSchema } from "../schemas";
import { readAllFlaggedItemsFromStorage } from "../account/useFlaggedItems";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Chip } from "./ui/Chip";
import { renderAnomalyProse } from "../narrative/engine";
import { loadAllInstruments } from "../data-loader";
import type { z } from "zod";
import type { AnomalySeverity } from "../types/staff-anomaly";

type ParsedAnomaly = z.infer<typeof StaffAnomalyFileSchema>[number];

function SeverityBadge({ severity }: { severity: AnomalySeverity }) {
  const cls =
    severity === "high"
      ? "bg-red-100 text-red-800"
      : severity === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold ${cls}`}
    >
      {severity}
    </span>
  );
}

export function CuratorQueue() {
  const all = StaffAnomalyFileSchema.parse(anomaliesFixture);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { rows, append } = useAuditLog();
  const instruments = useMemo(() => loadAllInstruments(), []);
  const navigate = useNavigate();
  const onOpenDocument = (n: string) => void navigate(`/instrument/${n}`);

  const visible = all.filter((a) => !dismissed.has(a.id));
  const userFlags = readAllFlaggedItemsFromStorage();

  const act = (anomaly: ParsedAnomaly, action: "ACCEPTED" | "REJECTED") => {
    append({
      actor: "demo-curator",
      action,
      target: `${anomaly.parcel_apn}: ${anomaly.title}`,
    });
    setDismissed((s) => new Set(s).add(anomaly.id));
  };

  return (
    <StaffPageFrame
      title="Curator queue"
      subtitle="Anomaly triage. Accept or reject each item to append a session entry below."
    >
      {userFlags.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-800">User-filed issue reports</h2>
            <Chip tone="info">{userFlags.length}</Chip>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {userFlags.map((f) => (
                <li key={f.id} className="px-5 py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] text-slate-500">{f.ref}</span>
                      <span className="font-semibold text-slate-900">{f.reason.replace(/_/g, " ")}</span>
                    </div>
                    <time className="text-[11px] text-slate-500">
                      {new Date(f.submitted_at).toLocaleDateString()}
                    </time>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Instrument <span className="font-mono">{f.instrument_number}</span>
                    {f.parcel_apn && <> · Parcel <span className="font-mono">{f.parcel_apn}</span></>}
                  </div>
                  {f.note && <p className="mt-1 text-sm text-slate-700">{f.note}</p>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-6 text-center bg-white">
          Queue empty. All session anomalies have been triaged.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((a) => (
            <li
              key={a.id}
              className="border border-gray-200 rounded-lg bg-white p-4"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <SeverityBadge severity={a.severity} />
                  <Link
                    to={`/staff/parcel/${a.parcel_apn}`}
                    className="text-xs font-mono text-blue-700 hover:underline"
                  >
                    {a.parcel_apn}
                  </Link>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {a.title}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(a, "ACCEPTED")}
                    className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => act(a, "REJECTED")}
                    className="text-xs px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm text-gray-700">
                  {renderAnomalyProse(a, instruments, onOpenDocument)}
                </div>
                <details className="mt-1 text-xs text-slate-500">
                  <summary className="cursor-pointer">Curator note</summary>
                  <p className="mt-1">{a.description}</p>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AuditLogPanel rows={rows} />
    </StaffPageFrame>
  );
}
