import { useMemo, useState } from "react";
import type { Parcel } from "../types";
import sweepsRaw from "../data/party-judgment-sweeps.json";

interface ScannedIndex {
  name: string;
  short: string;
  custodian: string;
  coverage: string;
  provenance: string;
  note?: string;
}

interface Hit {
  id: string;
  party_name: string;
  party_role_in_chain: string;
  index: string;
  result_type: string;
  recording_number?: string;
  recording_date?: string;
  doc_type_raw?: string;
  summary: string;
  ai_judgment: "probable_false_positive" | "requires_examiner_review" | "confirmed_exposure";
  ai_rationale: string;
  confidence: number;
  provenance: string;
  action_required: string;
}

interface Miss {
  party_name: string;
  indexes_scanned: string[];
  result: "no_hits";
}

interface Sweep {
  apn: string;
  verified_through: string;
  swept_at: string | null;
  scanned_indexes: ScannedIndex[];
  scanned_parties: string[];
  hits: Hit[];
  misses: Miss[];
  summary: {
    parties_scanned: number;
    indexes_scanned: number;
    raw_hits: number;
    post_judgment_hits_requiring_action: number;
    all_clear: boolean;
    all_clear_after_judgment: boolean;
    note: string;
  };
  blocked_reason?: {
    status: "blocked_by_public_api";
    explanation: string;
    what_production_would_do: string;
  };
}

interface SweepFile {
  sweeps: Record<string, Sweep>;
}

const sweeps = sweepsRaw as SweepFile;

interface Props {
  parcel: Parcel;
  onOpenDocument?: (instrumentNumber: string) => void;
}

function JudgmentBadge({ judgment }: { judgment: Hit["ai_judgment"] }) {
  const spec: Record<Hit["ai_judgment"], { label: string; cls: string }> = {
    probable_false_positive: {
      label: "AI: probable false positive",
      cls: "bg-slate-100 text-slate-700 border-slate-200",
    },
    requires_examiner_review: {
      label: "AI: requires review",
      cls: "bg-amber-100 text-amber-900 border-amber-200",
    },
    confirmed_exposure: {
      label: "AI: confirmed exposure",
      cls: "bg-red-100 text-red-900 border-red-200",
    },
  };
  const s = spec[judgment];
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function PartyJudgmentSweep({ parcel, onOpenDocument }: Props) {
  const sweep = sweeps.sweeps[parcel.apn] as Sweep | undefined;
  const [showIndexes, setShowIndexes] = useState(false);

  const bannerVariant: "clear" | "review" | "blocked" = useMemo(() => {
    if (!sweep) return "blocked";
    if (sweep.blocked_reason) return "blocked";
    if (sweep.summary.post_judgment_hits_requiring_action > 0) return "review";
    return "clear";
  }, [sweep]);

  if (!sweep) {
    return null;
  }

  const bannerCls = {
    clear: "border-emerald-200 bg-emerald-50",
    review: "border-amber-200 bg-amber-50",
    blocked: "border-slate-300 bg-slate-50",
  }[bannerVariant];

  return (
    <section
      aria-labelledby="party-judgment-sweep-heading"
      className={`mt-6 rounded-md border ${bannerCls} p-5`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="party-judgment-sweep-heading"
            className="text-sm font-semibold uppercase tracking-wide text-slate-700"
          >
            Party Judgment Sweep
          </h3>
          <p className="mt-1 text-sm text-slate-800">
            {bannerVariant === "clear" && (
              <>
                <span className="font-semibold text-emerald-800">
                  All clear after AI judgment.
                </span>{" "}
                Swept {sweep.summary.parties_scanned} parties across{" "}
                {sweep.summary.indexes_scanned} custodial indexes. {sweep.summary.raw_hits} raw
                hit{sweep.summary.raw_hits === 1 ? "" : "s"}, {sweep.summary.post_judgment_hits_requiring_action} requiring
                examiner action.
              </>
            )}
            {bannerVariant === "review" && (
              <>
                <span className="font-semibold text-amber-900">
                  {sweep.summary.post_judgment_hits_requiring_action} item
                  {sweep.summary.post_judgment_hits_requiring_action === 1 ? "" : "s"} require
                  review.
                </span>{" "}
                Swept {sweep.summary.parties_scanned} parties across{" "}
                {sweep.summary.indexes_scanned} custodial indexes.
              </>
            )}
            {bannerVariant === "blocked" && (
              <>
                <span className="font-semibold text-slate-800">
                  Sweep blocked by public API limitation.
                </span>{" "}
                This is the moat moment — the county's internal index can run this; the
                public API cannot.
              </>
            )}
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-500 space-y-0.5 shrink-0">
          <div>
            Verified through{" "}
            <span className="font-mono text-slate-700">
              {sweep.verified_through}
            </span>
          </div>
          {sweep.swept_at && (
            <div>
              Swept at{" "}
              <span className="font-mono text-slate-700">
                {new Date(sweep.swept_at).toISOString().slice(0, 16).replace("T", " ")} UTC
              </span>
            </div>
          )}
        </div>
      </header>

      {bannerVariant === "blocked" && sweep.blocked_reason && (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-slate-300 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Why this sweep didn't run
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {sweep.blocked_reason.explanation}
            </p>
          </div>
          <div className="rounded-md border border-moat-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-moat-700">
              What a production deploy would do
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {sweep.blocked_reason.what_production_would_do}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Parties that would be swept once the county-internal index is wired:{" "}
            {sweep.scanned_parties.map((p, i) => (
              <span key={p} className="font-mono">
                {p}
                {i < sweep.scanned_parties.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      )}

      {bannerVariant !== "blocked" && (
        <>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="text-lg font-semibold text-slate-900">
                {sweep.summary.parties_scanned}
              </div>
              <div className="text-[11px] text-slate-500">Parties</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="text-lg font-semibold text-slate-900">
                {sweep.summary.indexes_scanned}
              </div>
              <div className="text-[11px] text-slate-500">Indexes</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="text-lg font-semibold text-slate-900">
                {sweep.summary.raw_hits}
              </div>
              <div className="text-[11px] text-slate-500">Raw hits</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="text-lg font-semibold text-slate-900">
                {sweep.summary.raw_hits - sweep.summary.post_judgment_hits_requiring_action}
              </div>
              <div className="text-[11px] text-slate-500">Dismissed (AI)</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div
                className={`text-lg font-semibold ${
                  sweep.summary.post_judgment_hits_requiring_action === 0
                    ? "text-emerald-700"
                    : "text-amber-800"
                }`}
              >
                {sweep.summary.post_judgment_hits_requiring_action}
              </div>
              <div className="text-[11px] text-slate-500">Need action</div>
            </div>
          </div>

          {sweep.hits.length > 0 && (
            <ul className="mt-4 space-y-3">
              {sweep.hits.map((h) => (
                <li
                  key={h.id}
                  className="rounded-md border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm text-slate-900">
                        {h.party_name}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">
                        ({h.party_role_in_chain})
                      </span>
                    </div>
                    <JudgmentBadge judgment={h.ai_judgment} />
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{h.summary}</p>
                  <div className="mt-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                    <span className="font-semibold text-slate-700">
                      AI rationale:
                    </span>{" "}
                    {h.ai_rationale}
                    <span className="ml-2 text-[11px] text-slate-500">
                      (confidence {(h.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>
                      Index:{" "}
                      <span className="text-slate-700">{h.index}</span>
                    </span>
                    {h.recording_number && (
                      <span>
                        Recording:{" "}
                        {onOpenDocument ? (
                          <button
                            onClick={() =>
                              onOpenDocument(h.recording_number!)
                            }
                            className="font-mono text-moat-700 hover:underline"
                          >
                            {h.recording_number}
                          </button>
                        ) : (
                          <span className="font-mono text-slate-700">
                            {h.recording_number}
                          </span>
                        )}
                      </span>
                    )}
                    {h.recording_date && (
                      <span>
                        Date:{" "}
                        <span className="font-mono text-slate-700">
                          {h.recording_date}
                        </span>
                      </span>
                    )}
                    <span>
                      Action:{" "}
                      <span className="text-slate-700">
                        {h.action_required === "none" ? "—" : h.action_required}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <details
            className="mt-4 rounded-md border border-slate-200 bg-white"
            open={showIndexes}
            onToggle={(e) =>
              setShowIndexes((e.target as HTMLDetailsElement).open)
            }
          >
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-slate-700">
              Indexes scanned ({sweep.scanned_indexes.length}) ·{" "}
              {sweep.scanned_parties.length} parties ·{" "}
              <span className="font-normal text-slate-500">click to expand</span>
            </summary>
            <div className="border-t border-slate-100 px-3 py-3 space-y-2 text-[12px]">
              {sweep.scanned_indexes.map((idx) => (
                <div
                  key={idx.short}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      {idx.name}
                    </span>
                    <span className="ml-2 text-slate-500">
                      · {idx.custodian}
                    </span>
                    {idx.note && (
                      <p className="text-slate-500 leading-relaxed mt-0.5">
                        {idx.note}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-slate-600 text-[11px]">
                    coverage {idx.coverage}
                  </span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-100 text-slate-500">
                Parties swept:{" "}
                {sweep.scanned_parties.map((p, i) => (
                  <span key={p} className="font-mono text-slate-700">
                    {p}
                    {i < sweep.scanned_parties.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          </details>
        </>
      )}

      <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
        The Party Judgment Sweep is a county-custodian capability. It runs against the
        recorder's internal full-name index plus four external custodial feeds (superior
        court civil judgments, state tax liens, federal tax liens, federal bankruptcy) —
        none of which are reachable by name from the public API. An abstractor's B-II
        schedule is only defensible if the sweep behind it is visible; this panel makes it
        visible.
      </p>
    </section>
  );
}
