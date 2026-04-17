import { useCallback, useRef, useState } from "react";
import type {
  Parcel,
  Instrument,
  EncumbranceLifecycle,
} from "../types";
import type { AnomalyFinding } from "../types/anomaly";
import { useAnthropicKey } from "../hooks/useAnthropicKey";
import { streamChainSummary } from "../lib/claude-summary";
import { renderWithCitations } from "../narrative/render-citations";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  lifecycles: EncumbranceLifecycle[];
  findings: AnomalyFinding[];
  onOpenDocument: (instrumentNumber: string) => void;
}

type Phase = "idle" | "streaming" | "done" | "error";

export function AiSummaryPanel({
  parcel,
  instruments,
  lifecycles,
  findings,
  onOpenDocument,
}: Props) {
  const { key, setKey, fromEnv } = useAnthropicKey();
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const knownInstruments = new Set(
    instruments.map((i) => i.instrument_number),
  );

  const run = useCallback(() => {
    if (!key) return;
    setPhase("streaming");
    setText("");
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    streamChainSummary(
      key,
      { parcel, instruments, lifecycles, findings },
      {
        signal: ctrl.signal,
        onText: (delta) => setText((t) => t + delta),
        onDone: () => setPhase("done"),
        onError: (err) => {
          setError(err.message);
          setPhase("error");
        },
      },
    );
  }, [key, parcel, instruments, lifecycles, findings]);

  const cancel = () => {
    abortRef.current?.abort();
    setPhase("idle");
  };

  const reset = () => {
    setPhase("idle");
    setText("");
    setError(null);
  };

  // No key → inline key-entry UI. Prototype-only affordance; production
  // would proxy the call server-side so the key never reaches the browser.
  if (!key) {
    return (
      <section className="mb-6 border border-dashed border-moat-300 rounded-lg p-4 bg-moat-50/40">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-moat-900">
              AI Chain Summary
            </h3>
            <p className="text-xs text-moat-800/80 mt-1 leading-relaxed">
              Live call to Claude. Paste your Anthropic API key to enable.
              Stored only in this browser&apos;s localStorage for the
              prototype; production deployments would keep the key
              server-side.
            </p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pendingKey.trim()) {
              setKey(pendingKey.trim());
              setPendingKey("");
            }
          }}
          className="mt-3 flex gap-2"
        >
          <input
            type="password"
            value={pendingKey}
            onChange={(e) => setPendingKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 font-mono text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-moat-500"
          />
          <button
            type="submit"
            disabled={!pendingKey.trim()}
            className="text-xs font-medium px-3 py-1.5 rounded bg-moat-700 text-white hover:bg-moat-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save key
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="mb-6 border border-moat-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 bg-moat-50 border-b border-moat-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-moat-900">
            AI Chain Summary
          </h3>
          <span className="text-[11px] text-moat-700">
            Live call to Claude · grounded in this parcel&apos;s corpus ·
            citations are clickable
          </span>
        </div>
        <div className="flex items-center gap-2">
          {phase === "idle" && (
            <button
              onClick={run}
              className="text-xs font-medium px-3 py-1 rounded bg-moat-700 text-white hover:bg-moat-800"
            >
              Summarize in plain English
            </button>
          )}
          {phase === "streaming" && (
            <button
              onClick={cancel}
              className="text-xs font-medium px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Stop
            </button>
          )}
          {(phase === "done" || phase === "error") && (
            <button
              onClick={run}
              className="text-xs font-medium px-3 py-1 rounded bg-moat-100 text-moat-800 hover:bg-moat-200"
            >
              Regenerate
            </button>
          )}
          {!fromEnv && (
            <button
              onClick={() => {
                setKey(null);
                reset();
              }}
              className="text-[11px] text-gray-500 hover:text-gray-700 underline"
              title="Clear stored API key from this browser"
            >
              clear key
            </button>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        {phase === "idle" && (
          <p className="text-xs text-gray-500">
            Click <em>Summarize in plain English</em> to run a live Claude
            call over this parcel&apos;s chain, encumbrance lifecycles, and
            anomaly findings. The response will cite instrument recording
            numbers inline.
          </p>
        )}
        {(phase === "streaming" || phase === "done" || phase === "error") && (
          <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
            {renderWithCitations(text, knownInstruments, onOpenDocument)}
            {phase === "streaming" && (
              <span
                className="inline-block w-2 h-4 ml-0.5 bg-moat-600 align-text-bottom animate-pulse"
                aria-label="streaming"
              />
            )}
          </div>
        )}
        {phase === "error" && error && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
