import { Link } from "react-router";
import pipelineState from "../data/pipeline-state.json";
import anomaliesRaw from "../data/staff-anomalies.json";
import {
  currentFreshness,
  type PipelineState,
} from "../logic/pipeline-selectors";
import { StaffPageFrame } from "./StaffPageFrame";
import type { StaffAnomaly } from "../types/staff-anomaly";

const state = pipelineState as unknown as PipelineState;
// TODO(C.3): remove this cast after schema migration
const anomalies = anomaliesRaw as unknown as StaffAnomaly[];

interface CardProps {
  label: string;
  value: string;
  note?: string;
}

function Card({ label, value, note }: CardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-semibold text-gray-800 mt-1">{value}</div>
      {note && <div className="text-xs text-gray-500 mt-1">{note}</div>}
    </div>
  );
}

export function StaffWorkbench() {
  const fresh = currentFreshness(state);
  const pendingCount = anomalies.length;
  const openLifecycles = 2;

  return (
    <StaffPageFrame
      title="Staff Workbench"
      subtitle="Curator-facing entry points. Search by name, triage anomalies, drill into a parcel."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card
          label="Open lifecycles"
          value={String(openLifecycles)}
          note="lc-002 (POPHAM), lc-003 (HOGUE)"
        />
        <Card
          label="Pending curator actions"
          value={String(pendingCount)}
          note="See /staff/queue"
        />
        <Card
          label="Current pipeline"
          value={fresh.curator}
          note={`index ${fresh.index} · OCR ${fresh.ocr}`}
        />
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Session audit log
          </div>
          <div className="text-xs text-gray-600 mt-2 leading-snug">
            Actions on /staff/queue and /staff/parcel/:apn append to a per-page
            session log. Production: signed database entries with actor
            identity.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          to="/staff/search"
          className="block border border-gray-200 rounded-lg p-4 bg-white hover:bg-blue-50 hover:border-blue-300"
        >
          <div className="font-semibold text-gray-800">Name-filtered search</div>
          <div className="text-xs text-gray-500 mt-1">
            See same-name candidates the public chain-of-title suppresses.
          </div>
        </Link>
        <Link
          to="/staff/queue"
          className="block border border-gray-200 rounded-lg p-4 bg-white hover:bg-blue-50 hover:border-blue-300"
        >
          <div className="font-semibold text-gray-800">Curator queue</div>
          <div className="text-xs text-gray-500 mt-1">
            Accept or reject flagged anomalies. Actions emit audit entries.
          </div>
        </Link>
        <Link
          to="/staff/parcel/304-78-386"
          className="block border border-gray-200 rounded-lg p-4 bg-white hover:bg-blue-50 hover:border-blue-300"
        >
          <div className="font-semibold text-gray-800">
            POPHAM &mdash; 304-78-386
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Staff parcel view with attribution confidence and suppressed
            instruments.
          </div>
        </Link>
        <Link
          to="/staff/parcel/304-77-689"
          className="block border border-gray-200 rounded-lg p-4 bg-white hover:bg-blue-50 hover:border-blue-300"
        >
          <div className="font-semibold text-gray-800">
            HOGUE &mdash; 304-77-689
          </div>
          <div className="text-xs text-gray-500 mt-1">
            lc-003 open: run cross-parcel release hunt from the parcel view.
          </div>
        </Link>
      </div>
    </StaffPageFrame>
  );
}
