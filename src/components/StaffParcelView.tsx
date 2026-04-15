import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useAllParcels } from "../hooks/useAllParcels";
import { useParcelData } from "../hooks/useParcelData";
import { useAuditLog } from "../hooks/useAuditLog";
import type { StaffIndexRow } from "../logic/staff-search";
import {
  huntCrossParcelRelease,
  type HuntResult,
} from "../logic/cross-parcel-release-hunt";
import staffIndex from "../data/staff-index.json";
import { ChainOfTitle } from "./ChainOfTitle";
import { AuditLogPanel } from "./AuditLogPanel";
import { StaffPageFrame } from "./StaffPageFrame";

interface OpenLifecycle {
  id: string;
  label: string;
  root_instrument: string;
  borrower_names: string[];
}

const OPEN_LIFECYCLES: Record<string, OpenLifecycle[]> = {
  "304-77-689": [
    {
      id: "lc-003",
      label: "HOGUE 2015 Deed of Trust — no release located in parcel corpus",
      root_instrument: "20150516730",
      borrower_names: ["HOGUE JASON", "HOGUE MICHELE"],
    },
  ],
  "304-78-386": [
    {
      id: "lc-002",
      label: "POPHAM 2021 Deed of Trust — no reconveyance in corpus",
      root_instrument: "20210057847",
      borrower_names: ["POPHAM CHRISTOPHER", "POPHAM ASHLEY"],
    },
  ],
};

// Curated per-instrument "attribution confidence" values. Hand-assigned per
// Decision #17; higher values reflect tighter curation signals.
const ATTRIBUTION_CONFIDENCE: Record<string, number> = {
  "20010093192": 0.99,
  "20010849180": 0.98,
  "20130183449": 0.99,
  "20130183450": 0.98,
  "20150516729": 0.99,
  "20150516730": 0.98,
  "20210057846": 0.95,
  "20210057847": 0.97,
  "20210075858": 0.96,
};

function SuppressedPanel({ apn }: { apn: string }) {
  const [open, setOpen] = useState(false);
  const suppressedGroups = useMemo(() => {
    const rows = staffIndex as unknown as StaffIndexRow[];
    return rows.filter((r) => r.suppressed_same_name_of === apn);
  }, [apn]);

  return (
    <section className="border border-gray-200 rounded-lg bg-white mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-sm font-semibold text-gray-800">
          Suppressed same-name instruments ({suppressedGroups.length})
        </span>
        <span className="text-xs text-blue-700">
          {open ? "Hide" : "Show suppressed"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-gray-100">
          {suppressedGroups.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">
              No suppressed same-name instruments for this parcel.
            </p>
          ) : (
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-1 pr-3 font-medium">Instrument</th>
                  <th className="py-1 pr-3 font-medium">Recorded</th>
                  <th className="py-1 pr-3 font-medium">Type</th>
                  <th className="py-1 pr-3 font-medium">Attributed To</th>
                  <th className="py-1 font-medium">Names</th>
                </tr>
              </thead>
              <tbody>
                {suppressedGroups.map((r) => (
                  <tr
                    key={r.instrument_number}
                    className="border-b border-gray-100 last:border-b-0 align-top"
                  >
                    <td className="py-1 pr-3 font-mono text-blue-700">
                      {r.instrument_number}
                    </td>
                    <td className="py-1 pr-3 text-gray-600 whitespace-nowrap">
                      {r.recording_date}
                    </td>
                    <td className="py-1 pr-3 text-gray-700">
                      {r.document_type}
                    </td>
                    <td className="py-1 pr-3 font-mono text-gray-600">
                      {r.attributed_parcel_apn}
                    </td>
                    <td className="py-1 text-gray-700">
                      {r.names.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

function AttributionPanel({ apn }: { apn: string }) {
  const rows = useMemo(() => {
    const all = staffIndex as unknown as StaffIndexRow[];
    return all.filter((r) => r.attributed_parcel_apn === apn);
  }, [apn]);

  return (
    <section className="border border-gray-200 rounded-lg bg-white p-4 mb-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">
        Internal attribution
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        Hand-assigned attribution confidence per instrument (per Decision #17).
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-1 pr-3 font-medium">Instrument</th>
            <th className="py-1 pr-3 font-medium">Type</th>
            <th className="py-1 font-medium text-right">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.instrument_number}
              className="border-b border-gray-100 last:border-b-0"
            >
              <td className="py-1 pr-3 font-mono text-blue-700">
                {r.instrument_number}
              </td>
              <td className="py-1 pr-3 text-gray-700">{r.document_type}</td>
              <td className="py-1 text-right font-mono text-gray-700">
                {ATTRIBUTION_CONFIDENCE[r.instrument_number]?.toFixed(2) ??
                  "0.95"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface LifecyclePanelProps {
  apn: string;
  lifecycle: OpenLifecycle;
  onHunt: (result: HuntResult) => void;
}

function LifecyclePanel({ apn, lifecycle, onHunt }: LifecyclePanelProps) {
  const [result, setResult] = useState<HuntResult | null>(null);

  const runHunt = () => {
    const r = huntCrossParcelRelease({
      lifecycle_id: lifecycle.id,
      parcel_apn: apn,
      borrower_names: lifecycle.borrower_names,
    });
    setResult(r);
    onHunt(r);
  };

  return (
    <section className="border border-gray-200 rounded-lg bg-white p-4 mb-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Open lifecycle &middot;{" "}
          <span className="font-mono">{lifecycle.id}</span>
        </h3>
        <span className="text-xs text-gray-500 font-mono">
          root {lifecycle.root_instrument}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{lifecycle.label}</p>
      <p className="text-xs text-gray-500 mt-1">
        Borrowers: {lifecycle.borrower_names.join(", ")}
      </p>
      <div className="mt-3">
        <button
          type="button"
          onClick={runHunt}
          className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Run cross-parcel release hunt
        </button>
      </div>

      {result && (
        <div className="mt-3 border border-blue-200 bg-blue-50 rounded p-3 text-xs">
          <div className="font-semibold text-blue-900 mb-1">
            Scanned {result.scanned_party_count} parties &mdash;{" "}
            {result.candidates.length} matches
          </div>
          <div className="text-slate-600 font-mono">
            verified through {result.verified_through}
          </div>
          {result.candidates.length === 0 ? (
            <p className="text-slate-700 mt-2">
              No release located in the staff name index for these borrowers
              outside this parcel. This is an honest zero: the public API cannot
              search for releases filed against a name; a county-internal
              full-name scan closes that gap.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {result.candidates.map((c) => (
                <li key={c.instrument_number} className="font-mono text-xs">
                  {c.instrument_number} &middot; {c.document_type} &middot;{" "}
                  {c.recording_date} &middot; attributed to{" "}
                  {c.attributed_parcel_apn}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function StaffParcelView() {
  const { apn } = useParams();
  const parcels = useAllParcels();
  const inCorpus = apn != null && parcels.some((p) => p.apn === apn);
  const { rows, append } = useAuditLog();

  if (!apn || !inCorpus) {
    return (
      <StaffPageFrame title="Parcel not in this corpus">
        <p className="text-sm text-gray-600">
          {apn
            ? `APN ${apn} is not in the curated set.`
            : "Missing APN in URL."}{" "}
          <Link to="/staff" className="text-blue-700 hover:underline">
            Return to staff workbench
          </Link>
          .
        </p>
      </StaffPageFrame>
    );
  }

  return <StaffParcelViewInner apn={apn} rows={rows} append={append} />;
}

type AppendFn = ReturnType<typeof useAuditLog>["append"];

function StaffParcelViewInner({
  apn,
  rows,
  append,
}: {
  apn: string;
  rows: ReturnType<typeof useAuditLog>["rows"];
  append: AppendFn;
}) {
  const data = useParcelData(apn);
  const lifecycles = OPEN_LIFECYCLES[apn] ?? [];

  return (
    <StaffPageFrame
      title={`Staff parcel view — ${apn}`}
      subtitle={`${data.parcel.address}, ${data.parcel.city} · current owner ${data.parcel.current_owner}`}
    >
      <div className="mb-4 text-xs">
        <Link
          to={`/parcel/${apn}`}
          className="text-blue-700 hover:underline mr-4"
        >
          Open public chain-of-title &rarr;
        </Link>
        <Link
          to={`/parcel/${apn}/encumbrances`}
          className="text-blue-700 hover:underline"
        >
          Open public encumbrance lifecycle &rarr;
        </Link>
      </div>

      <SuppressedPanel apn={apn} />
      <AttributionPanel apn={apn} />
      {lifecycles.map((lc) => (
        <LifecyclePanel
          key={lc.id}
          apn={apn}
          lifecycle={lc}
          onHunt={(result) =>
            append({
              actor: "demo-curator",
              action: "HUNT_RAN",
              target: `${apn}: ${result.lifecycle_id} — scanned ${result.scanned_party_count}, ${result.candidates.length} matches`,
            })
          }
        />
      ))}

      <section className="border border-gray-200 rounded-lg bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Chain-of-title (public view, embedded)
        </h3>
        <ChainOfTitle
          parcel={data.parcel}
          instruments={data.instruments}
          links={data.links}
          onOpenDocument={() => {
            // Staff preview intentionally does not open the proof drawer here;
            // use the public chain-of-title link above for document inspection.
          }}
        />
      </section>

      <AuditLogPanel rows={rows} />
    </StaffPageFrame>
  );
}
