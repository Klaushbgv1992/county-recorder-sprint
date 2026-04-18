import { useMemo } from "react";
import type {
  EncumbranceLifecycle,
  Instrument,
  Parcel,
  PipelineStatus,
} from "../types";
import type { AnomalyFinding } from "../types/anomaly";
import { buildTitleOpinion, type TitleOpinion } from "../logic/title-opinion";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  lifecycles: EncumbranceLifecycle[];
  findings: AnomalyFinding[];
  pipelineStatus: PipelineStatus;
}

/**
 * Title Opinion panel — the abstractor's actual deliverable.
 *
 * Renders a 3-to-6-sentence marketability assessment synthesized
 * from the parcel's chain, lifecycles, and anomaly findings. Each
 * sentence badges the source (lifecycle ID, rule ID, or provenance
 * footer) so the reader can trace it back to a fact in the curated
 * corpus — no opaque prose, no hallucination.
 *
 * This sits above the existing Encumbrance Lifecycle list. Plant
 * products aggregate liens; they do not synthesize. The county
 * product does both.
 */
export function TitleOpinionPanel(props: Props) {
  const opinion = useMemo<TitleOpinion>(
    () =>
      buildTitleOpinion({
        parcel: props.parcel,
        instruments: props.instruments,
        lifecycles: props.lifecycles,
        findings: props.findings,
        asOfDate: props.pipelineStatus.verified_through_date,
      }),
    [props.parcel, props.instruments, props.lifecycles, props.findings, props.pipelineStatus],
  );

  const headlineClass = headlineColorClasses(opinion.headline);

  return (
    <section
      aria-label="Title opinion"
      className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
    >
      <header className={`flex items-center justify-between gap-3 px-5 py-3 rounded-t-lg ${headlineClass.header}`}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            Title Opinion · APN {props.parcel.apn}
          </div>
          <div className={`text-base font-semibold ${headlineClass.text}`}>
            {opinion.headline}
          </div>
        </div>
        <div className="text-[11px] text-gray-500">
          as of {opinion.as_of}
        </div>
      </header>
      <ol className="divide-y divide-gray-100">
        {opinion.claims.map((claim, i) => (
          <li
            key={i}
            className="flex items-start gap-3 px-5 py-3 text-sm text-gray-800"
          >
            <ClaimBadge claim={claim} />
            <div className="flex-1 leading-relaxed">{claim.text}</div>
          </li>
        ))}
      </ol>
      <footer className="border-t border-gray-100 px-5 py-2 text-[11px] text-gray-500 flex items-center gap-3">
        <span>
          <span className="font-semibold">Note:</span> deterministic synthesis
          from curated facts. Every claim badges its source — no prose
          from an LLM in this panel.
        </span>
      </footer>
    </section>
  );
}

function ClaimBadge({ claim }: { claim: TitleOpinion["claims"][number] }) {
  const { source_kind, source_ref, severity } = claim;
  const label =
    source_kind === "lifecycle"
      ? source_ref
      : source_kind === "anomaly"
        ? source_ref
        : source_kind === "provenance"
          ? "sources"
          : source_kind === "conclusion"
            ? "summary"
            : source_ref;
  const sevCls =
    severity === "high"
      ? "bg-red-100 text-red-800"
      : severity === "medium"
        ? "bg-amber-100 text-amber-800"
        : severity === "low"
          ? "bg-lime-100 text-lime-800"
          : "bg-gray-100 text-gray-700";
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${sevCls}`}
      title={`${source_kind}: ${source_ref}`}
      data-testid="title-opinion-claim-badge"
    >
      {label}
    </span>
  );
}

function headlineColorClasses(h: TitleOpinion["headline"]): {
  header: string;
  text: string;
} {
  switch (h) {
    case "Marketable":
      return { header: "bg-emerald-50 border-b border-emerald-200", text: "text-emerald-900" };
    case "Marketable subject to exceptions":
      return { header: "bg-amber-50 border-b border-amber-200", text: "text-amber-900" };
    case "Unmarketable — cure required":
      return { header: "bg-red-50 border-b border-red-200", text: "text-red-900" };
    default:
      return { header: "bg-gray-50 border-b border-gray-200", text: "text-gray-900" };
  }
}
