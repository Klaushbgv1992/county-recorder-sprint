import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Parcel } from "../types";
import {
  getSweepForParcel,
  getDeadEnds,
  type ParcelSweep,
  type Hit,
  type DeadEndIndex,
} from "../lib/custodian-query-engine";

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

function slugify(party: string): string {
  return party.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
}

export function PartyJudgmentSweep({ parcel, onOpenDocument }: Props) {
  const [sweep, setSweep] = useState<ParcelSweep | null | undefined>(undefined);
  const deadEnds = useMemo<DeadEndIndex[]>(() => getDeadEnds(), []);
  const [showIndexes, setShowIndexes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSweepForParcel(parcel.apn).then((s) => {
      if (!cancelled) setSweep(s);
    });
    return () => {
      cancelled = true;
    };
  }, [parcel.apn]);

  if (sweep === undefined) return null; // initial loading
  if (sweep === null) return null;       // no fixture entry

  if (sweep.status === "no_capture_available") {
    return (
      <section
        aria-labelledby="party-judgment-sweep-heading"
        className="mt-6 rounded-md border border-slate-300 bg-slate-50 p-5"
      >
        <header>
          <h3
            id="party-judgment-sweep-heading"
            className="text-sm font-semibold uppercase tracking-wide text-slate-700"
          >
            Party Judgment Sweep
          </h3>
          <p className="mt-1 text-sm text-slate-800">
            <span className="font-semibold text-slate-800">
              Sweep blocked by public API limitation.
            </span>{" "}
            This is the moat moment — the county's internal index can run this; the public API cannot.
          </p>
        </header>
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-slate-300 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Why this sweep didn't run
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{sweep.reason}</p>
          </div>
          <div className="rounded-md border border-moat-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-moat-700">
              What a production deploy would do
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {sweep.what_production_would_do}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Parties that would be swept once the county-internal index is wired:{" "}
            {sweep.parties.map((p, i) => (
              <span key={p} className="font-mono">
                {p}
                {i < sweep.parties.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          <Link to="/custodian-query" className="text-moat-700 hover:underline">
            See the engine in action on POPHAM →
          </Link>
        </p>
      </section>
    );
  }

  // status === 'swept'
  // Map the hit's indexed party name to one of the swept query parties.
  // The indexed name may differ from the query ("BRIAN MADISON" vs "BRIAN J MADISON")
  // so we find the query party whose tokens all appear in the indexed name, or the
  // indexed name whose tokens all appear in the query party — whichever matches
  // first. Falls back to the plain showpiece root if no safe mapping exists.
  const anchor = (() => {
    if (sweep.hits.length === 0) return "";
    const indexed = sweep.hits[0].party_name.toUpperCase();
    const match = sweep.parties.find((p) => {
      const query = p.toUpperCase();
      return query.includes(indexed) || indexed.includes(query);
    });
    return match ? `#party-${slugify(match)}` : "";
  })();
  const bannerVariant: "clear" | "review" =
    sweep.summary.post_judgment_hits_requiring_action > 0 ? "review" : "clear";
  const bannerCls = {
    clear: "border-emerald-200 bg-emerald-50",
    review: "border-amber-200 bg-amber-50",
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
            {bannerVariant === "clear" ? (
              <>
                <span className="font-semibold text-emerald-800">All clear after AI judgment.</span>{" "}
                Swept {sweep.summary.parties_scanned} parties across{" "}
                {sweep.summary.indexes_scanned} custodial indexes. {sweep.summary.raw_hits} raw hit
                {sweep.summary.raw_hits === 1 ? "" : "s"},{" "}
                {sweep.summary.post_judgment_hits_requiring_action} requiring examiner action.
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-900">
                  {sweep.summary.post_judgment_hits_requiring_action} item
                  {sweep.summary.post_judgment_hits_requiring_action === 1 ? "" : "s"} require review.
                </span>{" "}
                Swept {sweep.summary.parties_scanned} parties across{" "}
                {sweep.summary.indexes_scanned} custodial indexes.
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 space-y-0.5 text-right text-[11px] text-slate-500">
          <div>
            Verified through <span className="font-mono text-slate-700">{sweep.verified_through}</span>
          </div>
          <div>
            Swept at{" "}
            <span className="font-mono text-slate-700">
              {new Date(sweep.swept_at).toISOString().slice(0, 16).replace("T", " ")} UTC
            </span>
          </div>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-5">
        <Metric label="Parties" value={sweep.summary.parties_scanned} />
        <Metric label="Indexes" value={sweep.summary.indexes_scanned} />
        <Metric label="Raw hits" value={sweep.summary.raw_hits} />
        <Metric label="Dismissed (AI)" value={sweep.summary.raw_hits - sweep.summary.post_judgment_hits_requiring_action} />
        <Metric
          label="Need action"
          value={sweep.summary.post_judgment_hits_requiring_action}
          cls={sweep.summary.post_judgment_hits_requiring_action === 0 ? "text-emerald-700" : "text-amber-800"}
        />
      </div>

      {sweep.hits.length > 0 && (
        <ul className="mt-4 space-y-3">
          {sweep.hits.map((h) => (
            <li key={h.id} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-sm text-slate-900">{h.party_name}</span>
                <JudgmentBadge judgment={h.ai_judgment} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{h.summary}</p>
              <div className="mt-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                <span className="font-semibold text-slate-700">AI rationale:</span> {h.ai_rationale}
                <span className="ml-2 text-[11px] text-slate-500">
                  (confidence {(h.confidence * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                {h.recording_number && (
                  <span>
                    Recording:{" "}
                    {onOpenDocument ? (
                      <button
                        onClick={() => onOpenDocument(h.recording_number!)}
                        className="font-mono text-moat-700 hover:underline"
                      >
                        {h.recording_number}
                      </button>
                    ) : (
                      <span
                        className="font-mono text-slate-700"
                        title="Outside this parcel's corpus — available in production"
                      >
                        {h.recording_number}
                      </span>
                    )}
                  </span>
                )}
                {h.recording_date && (
                  <span>
                    Date: <span className="font-mono text-slate-700">{h.recording_date}</span>
                  </span>
                )}
                <span>
                  Action:{" "}
                  <span className="text-slate-700">{h.action_required === "none" ? "—" : h.action_required}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details
        className="mt-4 rounded-md border border-slate-200 bg-white"
        open={showIndexes}
        onToggle={(e) => setShowIndexes((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-slate-700">
          Indexes scanned ({sweep.indexes.length} live · {deadEnds.length} dead-ends) ·{" "}
          {sweep.parties.length} parties ·{" "}
          <span className="font-normal text-slate-500">click to expand</span>
        </summary>
        <div className="space-y-2 border-t border-slate-100 px-3 py-3 text-[12px]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Live</div>
          {sweep.indexes.map((id) => (
            <div key={id} className="text-slate-700">
              <span className="font-mono">{id}</span>
            </div>
          ))}
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Dead-ends (production scope)
          </div>
          {deadEnds.map((d) => (
            <div key={d.id} className="leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-600">{d.name}</span> — {d.reason}
            </div>
          ))}
          <div className="mt-2 border-t border-slate-100 pt-2 text-slate-500">
            Parties swept:{" "}
            {sweep.parties.map((p, i) => (
              <span key={p} className="font-mono text-slate-700">
                {p}
                {i < sweep.parties.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      </details>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        The Party Judgment Sweep is a county-custodian capability. It runs against the recorder's
        internal full-name index plus additional custodial feeds — none of which are reachable by
        name from the public API. An abstractor's B-II schedule is only defensible if the sweep
        behind it is visible; this panel makes it visible.
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        <Link to={`/custodian-query${anchor}`} className="text-moat-700 hover:underline">
          How this sweep works →
        </Link>
      </p>
    </section>
  );
}

function Metric({ label, value, cls }: { label: string; value: number; cls?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className={`text-lg font-semibold ${cls ?? "text-slate-900"}`}>{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
