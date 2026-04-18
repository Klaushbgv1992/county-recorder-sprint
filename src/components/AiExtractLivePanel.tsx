import { useCallback, useMemo, useRef, useState } from "react";
import { streamLiveExtraction } from "../lib/ai-extract-client";
import {
  LIVE_EXTRACT_FIELDS,
  LIVE_EXTRACT_MODEL_ID,
  RECORD_EXTRACTION_TOOL,
  SYSTEM_PROMPT,
  isRecordingNumber,
  maricopaPdfUrl,
  type LiveExtractFieldName,
  type LiveExtractStreamEvent,
} from "../lib/ai-extract-prompt";
import {
  getCuratedExtraction,
  type CuratedExtraction,
} from "../logic/curated-extraction";

/**
 * Live AI extraction panel.
 *
 * Paste a Maricopa recording number → the Vite dev server fetches the
 * PDF from publicapi.recorder.maricopa.gov → Claude Opus 4.7 streams
 * one tool call per field → each field's card fills in with its value,
 * confidence, reasoning, and latency.
 *
 * Side-by-side: if the recording number matches a curated instrument,
 * the hand-curated value is shown alongside the AI-extracted value so
 * the viewer can compare "what the humans wrote" vs "what the model
 * just read from the PDF". This is the disintermediation moment — not
 * a slide, a diff.
 *
 * The `<details>` disclosure below the card stack shows the full
 * system prompt, tool schema, and model ID — same bytes the server
 * ships to the Anthropic API, no marketing paraphrase.
 */

type FieldState =
  | { phase: "idle" }
  | { phase: "waiting" }
  | {
      phase: "filled";
      value: unknown;
      confidence: number;
      reasoning: string;
      at_ms: number;
    };

type RunState =
  | { phase: "idle" }
  | { phase: "streaming"; startedAt: number; pdfBytes?: number }
  | {
      phase: "done";
      durationMs: number;
      usage: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens: number;
        cache_read_input_tokens: number;
      };
    }
  | { phase: "error"; message: string; retriable: boolean };

const SUGGESTED: Array<{ number: string; label: string }> = [
  { number: "20210057847", label: "POPHAM Deed of Trust (2021)" },
  { number: "20210075858", label: "POPHAM Release (2021)" },
  { number: "20130183450", label: "Original VIP Mortgage DOT (2013)" },
];

export function AiExtractLivePanel() {
  const [recordingNumber, setRecordingNumber] = useState("20210057847");
  const [runState, setRunState] = useState<RunState>({ phase: "idle" });
  const [fields, setFields] = useState<Record<LiveExtractFieldName, FieldState>>(
    () => initialFields(),
  );
  const [rawEvents, setRawEvents] = useState<LiveExtractStreamEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const curated = useMemo(
    () => getCuratedExtraction(recordingNumber.trim()),
    [recordingNumber],
  );

  const start = useCallback(async () => {
    const trimmed = recordingNumber.trim();
    if (!isRecordingNumber(trimmed)) {
      setRunState({
        phase: "error",
        message: "Recording number must be 11 digits (e.g. 20210057847).",
        retriable: false,
      });
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setFields(initialFields("waiting"));
    setRawEvents([]);
    setRunState({ phase: "streaming", startedAt: Date.now() });

    try {
      for await (const event of streamLiveExtraction(trimmed, { signal: ac.signal })) {
        setRawEvents((prev) => [...prev, event]);
        if (event.type === "meta") {
          setRunState({
            phase: "streaming",
            startedAt: Date.now(),
            pdfBytes: event.pdf_bytes,
          });
        } else if (event.type === "field") {
          setFields((prev) => ({
            ...prev,
            [event.field_name]: {
              phase: "filled",
              value: event.value,
              confidence: event.confidence,
              reasoning: event.reasoning,
              at_ms: event.at_ms,
            },
          }));
        } else if (event.type === "done") {
          setRunState({
            phase: "done",
            durationMs: event.total_ms,
            usage: event.usage,
          });
        } else if (event.type === "error") {
          setRunState({
            phase: "error",
            message: event.message,
            retriable: event.retriable,
          });
          return;
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setRunState({
        phase: "error",
        message: (err as Error).message,
        retriable: true,
      });
    }
  }, [recordingNumber]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setRunState({ phase: "idle" });
    setFields(initialFields());
  }, []);

  const isStreaming = runState.phase === "streaming";

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">
          Live AI Extraction
        </h1>
        <p className="text-sm text-gray-600 max-w-2xl">
          Paste a Maricopa County recording number. The dev server fetches
          the PDF from{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            publicapi.recorder.maricopa.gov
          </code>{" "}
          and streams it to Claude Opus 4.7. Each field below fills in as
          the model finishes it — this is a real API call, not a replay.
        </p>
        <p className="text-[11px] text-gray-500">
          Every extracted value is tagged{" "}
          <code className="text-[11px] bg-amber-50 text-amber-900 px-1 rounded">
            ai_extraction
          </code>
          , rendered <em>alongside</em> curated ground truth when available —
          never on top of it.
        </p>
      </header>

      <section
        className="flex items-center gap-3 flex-wrap rounded border border-gray-200 bg-white p-4"
        aria-label="Recording number input"
      >
        <label htmlFor="ai-extract-rn" className="text-sm font-medium text-gray-700">
          Recording number
        </label>
        <input
          id="ai-extract-rn"
          type="text"
          inputMode="numeric"
          value={recordingNumber}
          onChange={(e) => setRecordingNumber(e.target.value)}
          disabled={isStreaming}
          className="font-mono text-sm border border-gray-300 rounded px-2 py-1 w-40 focus-visible:ring-2 focus-visible:ring-moat-500"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={cancel}
            className="px-4 py-1.5 text-sm font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
            disabled={!isRecordingNumber(recordingNumber.trim())}
          >
            Try it live
          </button>
        )}
        <div className="text-xs text-gray-500 ml-auto">
          Suggested:
          {SUGGESTED.map((s) => (
            <button
              key={s.number}
              type="button"
              disabled={isStreaming}
              onClick={() => setRecordingNumber(s.number)}
              className="ml-2 underline text-blue-700 hover:text-blue-900 disabled:opacity-40"
              title={s.label}
            >
              {s.number}
            </button>
          ))}
        </div>
      </section>

      <RunStatus
        state={runState}
        recordingNumber={recordingNumber.trim()}
        curatedAvailable={curated !== null}
      />

      <section aria-label="Extracted fields" className="space-y-3">
        {LIVE_EXTRACT_FIELDS.map((name) => (
          <FieldCard
            key={name}
            fieldName={name}
            state={fields[name]}
            curated={curated?.[name] ?? null}
          />
        ))}
      </section>

      <PromptDisclosure rawEvents={rawEvents} />
    </div>
  );
}

function initialFields(phase: "idle" | "waiting" = "idle"): Record<
  LiveExtractFieldName,
  FieldState
> {
  const init: Record<string, FieldState> = {};
  for (const name of LIVE_EXTRACT_FIELDS) init[name] = { phase };
  return init as Record<LiveExtractFieldName, FieldState>;
}

function RunStatus({
  state,
  recordingNumber,
  curatedAvailable,
}: {
  state: RunState;
  recordingNumber: string;
  curatedAvailable: boolean;
}) {
  if (state.phase === "idle") {
    return (
      <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-600 flex items-center justify-between">
        <span>
          Ready. Click <strong>Try it live</strong> to call Claude Opus 4.7 on
          recording{" "}
          <span className="font-mono">{recordingNumber || "…"}</span>.
        </span>
        <span>
          {curatedAvailable
            ? "✓ curated ground truth available for side-by-side"
            : "no curated comparison for this recording"}
        </span>
      </div>
    );
  }
  if (state.phase === "streaming") {
    return (
      <div
        className="rounded border border-indigo-300 bg-indigo-50 p-3 text-xs text-indigo-900 flex items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        <span>
          Streaming from Claude Opus 4.7 — PDF{" "}
          {state.pdfBytes
            ? `${Math.round(state.pdfBytes / 1024)} KB fetched`
            : "fetching…"}
          . Watching for tool calls.
        </span>
      </div>
    );
  }
  if (state.phase === "done") {
    const u = state.usage;
    return (
      <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
        Extraction complete in {state.durationMs} ms. Tokens: in={u.input_tokens},
        out={u.output_tokens}
        {u.cache_read_input_tokens > 0 && (
          <span> (cache read: {u.cache_read_input_tokens})</span>
        )}
        {u.cache_creation_input_tokens > 0 && (
          <span> (cache write: {u.cache_creation_input_tokens})</span>
        )}
        .
      </div>
    );
  }
  return (
    <div className="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900">
      <div className="font-semibold">Error: {state.message}</div>
      {state.retriable && (
        <div className="mt-1 text-[11px] text-red-700">
          This looks retriable — try again in a moment.
        </div>
      )}
    </div>
  );
}

function FieldCard({
  fieldName,
  state,
  curated,
}: {
  fieldName: LiveExtractFieldName;
  state: FieldState;
  curated: CuratedExtraction[LiveExtractFieldName] | null;
}) {
  const humanLabel = fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <article
      className={`rounded border p-4 ${
        state.phase === "filled"
          ? "border-gray-200 bg-white"
          : state.phase === "waiting"
            ? "border-indigo-200 bg-indigo-50/40"
            : "border-dashed border-gray-200 bg-gray-50"
      }`}
      aria-label={`Field ${humanLabel}`}
    >
      <header className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {humanLabel}
        </span>
        {state.phase === "filled" && (
          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={state.confidence} />
            <span
              className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded"
              title={`Model: ${LIVE_EXTRACT_MODEL_ID}`}
            >
              ai_extraction
            </span>
            <span className="text-[10px] text-gray-500">
              {state.at_ms} ms
            </span>
          </div>
        )}
        {state.phase === "waiting" && (
          <span className="text-[10px] text-indigo-700 uppercase tracking-wide animate-pulse">
            extracting…
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
            AI (Claude Opus 4.7)
          </div>
          {state.phase === "filled" ? (
            <div className="space-y-1">
              <FieldValue value={state.value} />
              <div className="text-[11px] italic text-gray-500">
                {state.reasoning}
              </div>
            </div>
          ) : state.phase === "waiting" ? (
            <ShimmerLines />
          ) : (
            <div className="text-sm italic text-gray-400">not yet run</div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
            Curator ground truth
          </div>
          {curated ? (
            <FieldValue value={curated} />
          ) : (
            <div className="text-sm italic text-gray-400">
              no curated value for this field
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-sm italic text-gray-400">(empty)</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-sm italic text-gray-400">[]</span>;
    }
    return (
      <ul className="text-sm text-gray-900 space-y-0.5 font-mono">
        {value.map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="text-sm text-gray-900 font-mono break-words">
      {String(value)}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let cls = "bg-red-100 text-red-800";
  if (confidence >= 0.85) cls = "bg-emerald-100 text-emerald-800";
  else if (confidence >= 0.7) cls = "bg-lime-100 text-lime-800";
  else if (confidence >= 0.5) cls = "bg-amber-100 text-amber-800";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {pct}% conf
    </span>
  );
}

function ShimmerLines() {
  return (
    <div className="space-y-1" aria-hidden="true">
      <div className="h-3 rounded bg-indigo-200/60 animate-pulse w-3/4" />
      <div className="h-3 rounded bg-indigo-200/40 animate-pulse w-1/2" />
    </div>
  );
}

function PromptDisclosure({
  rawEvents,
}: {
  rawEvents: LiveExtractStreamEvent[];
}) {
  const copyJson = useCallback(() => {
    const payload = JSON.stringify(rawEvents, null, 2);
    navigator.clipboard.writeText(payload).catch(() => {
      /* clipboard unavailable — non-fatal */
    });
  }, [rawEvents]);

  return (
    <details className="rounded border border-gray-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 select-none">
        Show the exact prompt, tool schema, and raw stream events
      </summary>
      <div className="px-4 pb-4 space-y-4 text-xs">
        <div>
          <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">
            Model
          </div>
          <code className="font-mono bg-gray-100 px-2 py-1 rounded">
            {LIVE_EXTRACT_MODEL_ID}
          </code>
          <span className="ml-3 text-gray-500">
            (system prompt cached via <code>cache_control: ephemeral</code>)
          </span>
        </div>
        <div>
          <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">
            PDF source (server-side fetch)
          </div>
          <code className="font-mono bg-gray-100 px-2 py-1 rounded break-all">
            {maricopaPdfUrl("{recordingNumber}")}
          </code>
        </div>
        <div>
          <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">
            System prompt (verbatim)
          </div>
          <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 font-mono text-[11px] text-gray-800 border border-gray-200 max-h-72 overflow-auto">
            {SYSTEM_PROMPT}
          </pre>
        </div>
        <div>
          <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">
            Tool schema
          </div>
          <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 font-mono text-[11px] text-gray-800 border border-gray-200">
            {JSON.stringify(RECORD_EXTRACTION_TOOL, null, 2)}
          </pre>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">
              Raw stream events ({rawEvents.length})
            </div>
            <button
              type="button"
              onClick={copyJson}
              disabled={rawEvents.length === 0}
              className="text-[11px] text-blue-700 underline disabled:opacity-40"
            >
              Copy as JSON
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 font-mono text-[11px] text-gray-800 border border-gray-200 max-h-72 overflow-auto">
            {rawEvents.length === 0
              ? "(no events yet — click Try it live)"
              : JSON.stringify(rawEvents, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  );
}
