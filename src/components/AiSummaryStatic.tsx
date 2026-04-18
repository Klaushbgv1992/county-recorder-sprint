import { useLayoutEffect, useRef, useState } from "react";
import type { Parcel } from "../types";
import { renderWithCitations } from "../narrative/render-citations";
import { parcelHasSyntheticInstrument } from "../lib/synthetic-instruments";

const SUMMARY_CAP_PX = 600;

import popham_md from "../data/ai-summaries/304-78-386/summary.md?raw";
import popham_prompt from "../data/ai-summaries/304-78-386/prompt.txt?raw";
import popham_meta from "../data/ai-summaries/304-78-386/metadata.json";
import hogue_md from "../data/ai-summaries/304-77-689/summary.md?raw";
import hogue_prompt from "../data/ai-summaries/304-77-689/prompt.txt?raw";
import hogue_meta from "../data/ai-summaries/304-77-689/metadata.json";
import hoa_md from "../data/ai-summaries/304-78-409/summary.md?raw";
import hoa_prompt from "../data/ai-summaries/304-78-409/prompt.txt?raw";
import hoa_meta from "../data/ai-summaries/304-78-409/metadata.json";
import warner_md from "../data/ai-summaries/304-78-374/summary.md?raw";
import warner_prompt from "../data/ai-summaries/304-78-374/prompt.txt?raw";
import warner_meta from "../data/ai-summaries/304-78-374/metadata.json";
import lowry_md from "../data/ai-summaries/304-78-383/summary.md?raw";
import lowry_prompt from "../data/ai-summaries/304-78-383/prompt.txt?raw";
import lowry_meta from "../data/ai-summaries/304-78-383/metadata.json";
import phoenix_md from "../data/ai-summaries/304-78-367/summary.md?raw";
import phoenix_prompt from "../data/ai-summaries/304-78-367/prompt.txt?raw";
import phoenix_meta from "../data/ai-summaries/304-78-367/metadata.json";
// Scenario corpus summaries (hand-curated to accompany the demo-only
// synthesized parcels — model_id: hand-curated-demo-scenario-summary)
import chen_md from "../data/ai-summaries/999-01-362/summary.md?raw";
import chen_prompt from "../data/ai-summaries/999-01-362/prompt.txt?raw";
import chen_meta from "../data/ai-summaries/999-01-362/metadata.json";
import martinez_md from "../data/ai-summaries/999-02-555/summary.md?raw";
import martinez_prompt from "../data/ai-summaries/999-02-555/prompt.txt?raw";
import martinez_meta from "../data/ai-summaries/999-02-555/metadata.json";
import delgado_md from "../data/ai-summaries/999-03-411/summary.md?raw";
import delgado_prompt from "../data/ai-summaries/999-03-411/prompt.txt?raw";
import delgado_meta from "../data/ai-summaries/999-03-411/metadata.json";
import bryant_md from "../data/ai-summaries/999-04-401/summary.md?raw";
import bryant_prompt from "../data/ai-summaries/999-04-401/prompt.txt?raw";
import bryant_meta from "../data/ai-summaries/999-04-401/metadata.json";

type Metadata = {
  generated_at: string;
  model_id: string;
  input_token_count: number;
  output_token_count: number;
  prompt_hash: string;
};

type Artifacts = { md: string; prompt: string; meta: Metadata };

const BY_APN: Record<string, Artifacts> = {
  "304-78-386": { md: popham_md, prompt: popham_prompt, meta: popham_meta as Metadata },
  "304-77-689": { md: hogue_md, prompt: hogue_prompt, meta: hogue_meta as Metadata },
  "304-78-409": { md: hoa_md, prompt: hoa_prompt, meta: hoa_meta as Metadata },
  "304-78-374": { md: warner_md, prompt: warner_prompt, meta: warner_meta as Metadata },
  "304-78-383": { md: lowry_md, prompt: lowry_prompt, meta: lowry_meta as Metadata },
  "304-78-367": { md: phoenix_md, prompt: phoenix_prompt, meta: phoenix_meta as Metadata },
  "999-01-362": { md: chen_md, prompt: chen_prompt, meta: chen_meta as Metadata },
  "999-02-555": { md: martinez_md, prompt: martinez_prompt, meta: martinez_meta as Metadata },
  "999-03-411": { md: delgado_md, prompt: delgado_prompt, meta: delgado_meta as Metadata },
  "999-04-401": { md: bryant_md, prompt: bryant_prompt, meta: bryant_meta as Metadata },
};

interface Props {
  parcel: Parcel;
  knownInstruments: Set<string>;
  onOpenDocument: (instrumentNumber: string) => void;
}

export function AiSummaryStatic({ parcel, knownInstruments, onOpenDocument }: Props) {
  const a = BY_APN[parcel.apn];
  const proseRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    if (!a || expanded) return;
    const el = proseRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > SUMMARY_CAP_PX + 4);
  }, [a, expanded, parcel.apn]);

  if (!a) return null;
  const dateShort = a.meta.generated_at.slice(0, 10);
  const hasSynthetic = parcelHasSyntheticInstrument(parcel.apn);
  const capped = overflowing && !expanded;

  return (
    <section className="mb-6 border border-moat-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 bg-moat-50 border-b border-moat-200">
        <h3 className="text-sm font-semibold text-moat-900">AI Chain Summary</h3>
        <span className="text-[11px] text-moat-700">
          Baked at build time · grounded in this parcel&apos;s corpus · citations clickable
        </span>
      </div>
      <div className="px-4 py-3">
        {hasSynthetic && (
          <div
            role="note"
            data-testid="ai-summary-synthetic-banner"
            className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-900"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 mr-1 align-[1px]">
              synthetic · demo-only
            </span>
            This summary references instruments tagged{" "}
            <span className="font-medium">synthetic &middot; demo-only</span> &mdash; fabricated
            to illustrate a title pathology, not present in
            publicapi.recorder.maricopa.gov. Click any recording number to open
            the full per-instrument disclosure.
          </div>
        )}
        <div className="relative">
          <div
            ref={proseRef}
            className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed overflow-hidden"
            style={capped ? { maxHeight: SUMMARY_CAP_PX } : undefined}
          >
            {renderWithCitations(a.md, knownInstruments, onOpenDocument)}
          </div>
          {capped && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-white"
            />
          )}
        </div>
        {overflowing && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="text-xs font-medium text-moat-700 hover:text-moat-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded px-1"
            >
              {expanded ? "Show less ↑" : "Read full brief ↓"}
            </button>
          </div>
        )}
        <footer className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          Generated {dateShort} by {a.meta.model_id}
          <span className="mx-1">·</span>
          <details className="inline">
            <summary className="inline cursor-pointer underline">view prompt</summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap bg-slate-50 p-2 text-[10px]">
              {a.prompt}
            </pre>
          </details>
          <span className="mx-1">·</span>
          <details className="inline">
            <summary className="inline cursor-pointer underline">view metadata</summary>
            <pre className="mt-1 whitespace-pre-wrap bg-slate-50 p-2 text-[10px]">
              {JSON.stringify(a.meta, null, 2)}
            </pre>
          </details>
        </footer>
      </div>
    </section>
  );
}
