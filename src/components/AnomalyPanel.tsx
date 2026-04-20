import { useState } from "react";
import { Link } from "react-router";
import type { AnomalyFinding, Severity } from "../types/anomaly";
import { NoAnomaliesFound } from "./EmptyStates";
import { useTerminology } from "../terminology/TerminologyContext";

// Severity color mapping. No shared severity→class file exists in the project
// (StatusBadge.tsx uses per-status inline mappings, lifecycle-status.ts only
// computes status, not colors), so we define the mapping inline here.
// Choices: red=high, amber=medium, yellow=low, blue=info — matches Tailwind
// severity conventions used elsewhere (bg-red for open DOTs in StatusBadge,
// bg-amber for unresolved, bg-blue for info in MoatBanner / possible_match).
const SEVERITY_CLASS: Record<Severity, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
};

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low", "info"];

interface AnomalyPanelProps {
  findings: AnomalyFinding[];
  apn: string;
}

function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${SEVERITY_CLASS[severity]}`}
    >
      {severity}
    </span>
  );
}

export function AnomalyPanel({ findings, apn }: AnomalyPanelProps) {
  const { t } = useTerminology();
  const [expanded, setExpanded] = useState(false);

  if (findings.length === 0) {
    return <NoAnomaliesFound />;
  }

  const counts: Record<Severity, number> = {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) counts[f.severity]++;

  const anomalyWord = findings.length === 1 ? t("anomaly") : t("anomalies");
  const totalLabel = `${findings.length} ${anomalyWord}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-gray-800">{totalLabel}</span>
          <div className="flex items-center gap-1.5">
            {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${SEVERITY_CLASS[s]}`}
              >
                {counts[s]} {s}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/parcel/${apn}/commitment/new`}
            className="text-xs font-medium text-blue-700 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          >
            Start transaction wizard &rarr;
          </Link>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs font-medium text-blue-700 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-gray-100">
          {findings.map((f, idx) => (
            <div key={`${f.rule_id}-${idx}`} className="px-4 py-3 shadow-sm border border-recorder-50/60 rounded-lg mx-3 my-2">
              <div className="flex items-center gap-2 mb-1">
                <SeverityPill severity={f.severity} />
                <h3 className="text-sm font-semibold text-gray-800">
                  {f.title}
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-2">{f.description}</p>
              {f.evidence_instruments.length > 0 && (
                <p className="text-xs text-gray-600 mb-1">
                  <span className="font-medium">{t("Evidence")}:</span>{" "}
                  {f.evidence_instruments.map((num, i) => (
                    <span key={num}>
                      {i > 0 && ", "}
                      <Link
                        to={`/parcel/${apn}/instrument/${num}`}
                        className="font-mono text-blue-700 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
                      >
                        {num}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              <p className="text-xs text-gray-700 mb-1">
                <span className="font-medium">{t("Examiner action")}:</span>{" "}
                {f.examiner_action}
              </p>
              <p className="text-[11px] text-gray-400">
                Rule: {f.detection_provenance.rule_name} v
                <span>{f.detection_provenance.rule_version}</span> (confidence:{" "}
                <span>{f.detection_provenance.confidence}</span>)
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
