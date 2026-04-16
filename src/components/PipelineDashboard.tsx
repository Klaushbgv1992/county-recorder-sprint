import state from "../data/pipeline-state.json";
import {
  laggingVsPlant,
  overSLAStages,
  type PipelineStage,
  type PipelineState,
} from "../logic/pipeline-selectors";

const pipelineState = state as unknown as PipelineState;

function formatAsOf(iso: string): string {
  const d = new Date(iso);
  const formatted = d.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  });
  return `${formatted} MST (Arizona time)`;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function StageCard({
  stage,
  overSLA,
  referenceDate,
}: {
  stage: PipelineStage;
  overSLA: boolean;
  referenceDate: string;
}) {
  const daysBehind = daysBetween(referenceDate, stage.verified_through);
  const daysOverSLA = daysBehind - stage.sla_days;
  return (
    <div className="bg-white border border-recorder-50/60 rounded-lg p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{stage.label}</h3>
        {overSLA ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
            Over SLA ({daysOverSLA}d behind)
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-800">
            Within SLA
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">
        Verified through
      </div>
      <div className="font-mono text-sm text-gray-900">
        {stage.verified_through}
      </div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
        Docs behind
      </div>
      <div className="font-mono text-sm text-gray-900">
        {stage.docs_behind.toLocaleString()}
      </div>
      <div className="text-[11px] text-gray-400 mt-1">
        SLA: {stage.sla_days}d
      </div>
    </div>
  );
}

function HistoryChart() {
  const history = pipelineState.history_30d;
  const width = 800;
  const height = 200;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const offsets = history.map((h) => ({
    i: daysBetween(h.date, h.index_vt),
    o: daysBetween(h.date, h.ocr_vt),
    c: daysBetween(h.date, h.curator_vt),
  }));
  const maxY = Math.max(...offsets.flatMap((o) => [o.i, o.o, o.c]));
  const yScale = (v: number) =>
    padT + innerH - (v / Math.max(maxY, 1)) * innerH;
  const xScale = (idx: number) =>
    padL + (idx / Math.max(history.length - 1, 1)) * innerW;

  const toPoints = (key: "i" | "o" | "c") =>
    offsets.map((o, idx) => `${xScale(idx)},${yScale(o[key])}`).join(" ");

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800">
          Verified-through, last 30 days
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-600" />
            Index
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-purple-600" />
            OCR
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-amber-600" />
            Curator
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="30-day pipeline verified-through chart"
      >
        <line
          x1={padL}
          y1={padT + innerH}
          x2={width - padR}
          y2={padT + innerH}
          stroke="#e5e7eb"
        />
        <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#e5e7eb" />
        <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="10" fill="#6b7280">
          0d
        </text>
        <text
          x={padL - 6}
          y={padT + innerH + 4}
          textAnchor="end"
          fontSize="10"
          fill="#6b7280"
        >
          {maxY}d
        </text>
        <text
          x={padL}
          y={height - 8}
          fontSize="10"
          fill="#6b7280"
        >
          {history[0].date}
        </text>
        <text
          x={width - padR}
          y={height - 8}
          textAnchor="end"
          fontSize="10"
          fill="#6b7280"
        >
          {history[history.length - 1].date}
        </text>
        <polyline
          points={toPoints("i")}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
        />
        <polyline
          points={toPoints("o")}
          fill="none"
          stroke="#9333ea"
          strokeWidth="2"
        />
        <polyline
          points={toPoints("c")}
          fill="none"
          stroke="#d97706"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export function PipelineDashboard() {
  const referenceDate = pipelineState.current.as_of.slice(0, 10);
  const overSLA = overSLAStages(pipelineState, { referenceDate });
  const overSLAIds = new Set(overSLA.map((s) => s.stage_id));
  const lag = laggingVsPlant(pipelineState, { referenceDate });
  const plantRef = pipelineState.plant_lag_reference;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900">
            Pipeline transparency
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            As of {formatAsOf(pipelineState.current.as_of)}
          </p>
        </header>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Stages
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pipelineState.current.stages.map((stage) => (
              <StageCard
                key={stage.stage_id}
                stage={stage}
                overSLA={overSLAIds.has(stage.stage_id)}
                referenceDate={referenceDate}
              />
            ))}
          </div>
        </section>

        <section>
          <HistoryChart />
        </section>

        <section className="bg-moat-50 border border-moat-100 rounded-lg p-5 shadow-sm">
          <p className="text-lg text-moat-900">
            <strong className="font-semibold">
              {lag.days_ahead_of_min_plant_lag} days ahead of typical title
              plant
            </strong>{" "}
            <span className="text-moat-700">
              ({plantRef.lag_days_min}–{plantRef.lag_days_max} day lag)
            </span>
          </p>
          <p className="text-xs text-moat-700 mt-2">{plantRef.source_note}</p>
        </section>

        <section className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            Why this dashboard shows five dates, not one
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Title plants publish one "current as of" date. The county custodian
            states verified-through per stage — because OCR, entity resolution,
            and curator review each advance on different cadences. This
            dashboard shows all of them honestly.
          </p>
        </section>
      </div>
    </div>
  );
}
