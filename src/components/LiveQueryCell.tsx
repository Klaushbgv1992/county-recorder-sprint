import { useState } from "react";
import type { QueryResult, Hit, FailureMode } from "../lib/custodian-query-engine.schema";

export type CellState = "idle" | "loading" | "resolved";

interface Props {
  state: CellState;
  party: string;
  indexShort: string;
  result?: QueryResult;
  coverage?: string;
}

function JudgmentLabel({ j }: { j: Hit["ai_judgment"] }) {
  if (j === "probable_false_positive") return <>AI: false positive</>;
  if (j === "requires_examiner_review") return <>AI: requires review</>;
  return <>AI: confirmed exposure</>;
}

function HitBody({ hits }: { hits: Hit[] }) {
  const primary = hits[0];
  return (
    <div className="mt-2 rounded border border-amber-200 bg-amber-50/50 p-2 text-[11px] leading-relaxed text-slate-700">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-slate-900">{primary.party_name}</span>
        <span className="text-[10px] uppercase tracking-wide text-amber-900">
          <JudgmentLabel j={primary.ai_judgment} />
        </span>
      </div>
      <p className="mt-1">{primary.summary}</p>
      <p className="mt-1 italic text-slate-600">
        <span className="font-semibold not-italic text-slate-700">AI rationale:</span>{" "}
        {primary.ai_rationale} <span className="text-slate-500">({Math.round(primary.confidence * 100)}%)</span>
      </p>
      {primary.recording_number && primary.recording_date && (
        <p className="mt-1 font-mono text-slate-600">
          {primary.recording_number} · {primary.recording_date} · {primary.doc_type_raw}
        </p>
      )}
    </div>
  );
}

function FailurePopover({ f }: { f: FailureMode }) {
  return (
    <div className="mt-2 rounded border border-slate-300 bg-white p-2 text-[11px] leading-relaxed text-slate-700">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        {f.kind.replace(/_/g, " ")}
        {f.http_status ? ` · ${f.http_status}` : ""}
      </div>
      <p className="mt-1">{f.message}</p>
      {f.captured_url && (
        <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{f.captured_url}</p>
      )}
      {f.captured_response_excerpt && (
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 font-mono text-[10px] text-slate-600">
          {f.captured_response_excerpt.slice(0, 500)}
        </pre>
      )}
    </div>
  );
}

export function LiveQueryCell({ state, party, indexShort, result, coverage }: Props) {
  const [expanded, setExpanded] = useState(false);

  const base = "rounded-md border p-2 text-[12px] transition-colors";
  const partyLine = <div className="font-mono text-[11px] text-slate-500 truncate">{party}</div>;
  const indexLine = <div className="text-[10px] uppercase tracking-wide text-slate-500">{indexShort}</div>;

  if (state === "idle") {
    return (
      <div className={`${base} border-slate-200 bg-slate-50`}>
        {partyLine}
        {indexLine}
        <div className="mt-1 text-slate-500">awaiting sweep</div>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className={`${base} border-slate-300 bg-white`} aria-busy="true">
        {partyLine}
        {indexLine}
        <div className="mt-1 flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-400" aria-hidden />
          querying {indexShort}…
        </div>
      </div>
    );
  }
  // resolved
  if (!result) {
    return (
      <div className={`${base} border-slate-200 bg-white`}>
        {partyLine}
        {indexLine}
        <div className="mt-1 text-slate-500">no data</div>
      </div>
    );
  }
  if (result.status === "zero") {
    return (
      <div className={`${base} border-emerald-200 bg-emerald-50`}>
        {partyLine}
        {indexLine}
        <div className="mt-1 text-emerald-800">
          <span aria-hidden>✓</span> verified zero {coverage && <span className="text-[10px] text-emerald-700">· {coverage}</span>}
        </div>
      </div>
    );
  }
  if (result.status === "hit") {
    const primary = result.hits[0];
    return (
      <div className={`${base} border-amber-200 bg-amber-50/60`}>
        {partyLine}
        {indexLine}
        <button
          type="button"
          className="mt-1 flex items-baseline gap-1 text-left text-amber-900 hover:underline"
          aria-label="hit details"
          onClick={() => setExpanded((x) => !x)}
        >
          <span aria-hidden>●</span>
          <span>{result.hits.length} hit{result.hits.length === 1 ? "" : "s"} · </span>
          <span className="font-semibold"><JudgmentLabel j={primary.ai_judgment} /></span>
        </button>
        {expanded && <HitBody hits={result.hits} />}
      </div>
    );
  }
  if (result.status === "blocked") {
    return (
      <div className={`${base} border-slate-300 bg-slate-50`}>
        {partyLine}
        {indexLine}
        <button
          type="button"
          className="mt-1 block w-full text-left text-slate-700 hover:underline"
          aria-label="failure details"
          onClick={() => setExpanded((x) => !x)}
        >
          <span aria-hidden>×</span> {result.failure.message}
        </button>
        {expanded && <FailurePopover f={result.failure} />}
      </div>
    );
  }
  // no_capture_available — not expected on the showpiece; render as blocked-style
  return (
    <div className={`${base} border-slate-300 bg-slate-50`}>
      {partyLine}
      {indexLine}
      <div className="mt-1 text-slate-600">not captured</div>
    </div>
  );
}
