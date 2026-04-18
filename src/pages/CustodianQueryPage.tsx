import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  getShowpieceShape,
  getCaptureMetadata,
  queryIndex,
  type IndexId,
  type Approach,
  type QueryResult,
  type LiveIndexMeta,
} from "../lib/custodian-query-engine";
import { LiveQueryCell } from "../components/LiveQueryCell";

type CellKey = `${string}__${IndexId}__${Approach}`;

function cellKey(party: string, indexId: IndexId, approach: Approach): CellKey {
  return `${party}__${indexId}__${approach}` as CellKey;
}

export function CustodianQueryPage() {
  const shape = useMemo(() => getShowpieceShape(), []);
  const meta = useMemo(() => getCaptureMetadata(), []);
  const [cells, setCells] = useState<Record<CellKey, QueryResult>>({});

  useEffect(() => {
    let cancelled = false;
    const tasks: Promise<void>[] = [];
    for (const party of shape.parties) {
      for (const idx of shape.liveIndexes) {
        for (const a of ["public-api", "county-internal"] as const) {
          tasks.push(
            queryIndex(party, idx.id, a).then((r) => {
              if (cancelled) return;
              setCells((prev) => ({ ...prev, [cellKey(party, idx.id, a)]: r }));
            })
          );
        }
      }
    }
    Promise.all(tasks);
    return () => {
      cancelled = true;
    };
  }, [shape]);

  const outcome = useMemo(() => countOutcomes(cells), [cells]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Custodian Query Engine — Maricopa County
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          The recorder's open API cannot search by name. The custodian can. This page runs both side-by-side.
        </p>
        <div className="mt-2 text-[11px] text-slate-500 space-x-3 font-mono">
          <span>captured {meta.captured_at}</span>
          <span>·</span>
          <span>{shape.parties.length} parties</span>
          <span>·</span>
          <span>{shape.liveIndexes.length} live indexes</span>
        </div>
      </header>

      <section className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">
            {shape.parties.length * shape.liveIndexes.length * 2} queries attempted
          </span>
          {" · "}API answered: <span className="font-semibold text-slate-700">{outcome.publicAnswered}</span>
          {" · "}Custodian answered: <span className="font-semibold text-emerald-800">{outcome.countyAnswered}</span>
          {" · "}<span className="text-amber-900">{outcome.aiDismissed}</span> AI-dismissed hit{outcome.aiDismissed === 1 ? "" : "s"}
          {" · "}<span className="text-emerald-800">{outcome.zeros}</span> verified zero
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MatrixColumn
          title="Public API"
          subtitle="publicapi.recorder.maricopa.gov"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="public-api"
          cells={cells}
        />
        <MatrixColumn
          title="County internal index"
          subtitle="what a custodian can run"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="county-internal"
          cells={cells}
        />
      </section>

      <section className="mt-8 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Three more indexes that would be in a production sweep
        </h2>
        <ul className="mt-3 space-y-2 text-[12px] text-slate-700">
          {shape.deadEnds.map((d) => (
            <li key={d.id} className="leading-relaxed">
              <span className="font-semibold text-slate-800">{d.name}</span> — {d.reason}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
        {meta.operator_notes && <p>{meta.operator_notes}</p>}
        <p className="mt-2">
          <Link className="text-moat-700 hover:underline" to="/parcel/304-78-386/encumbrances">
            See this sweep applied to POPHAM's parcel →
          </Link>
        </p>
      </footer>
    </div>
  );
}

function MatrixColumn({
  title,
  subtitle,
  parties,
  liveIndexes,
  approach,
  cells,
}: {
  title: string;
  subtitle: string;
  parties: string[];
  liveIndexes: LiveIndexMeta[];
  approach: Approach;
  cells: Record<CellKey, QueryResult>;
}) {
  return (
    <div>
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
        <p className="mt-0.5 text-[11px] font-mono text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-3 space-y-4">
        {parties.map((party) => {
          const slug = party.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
          return (
            <div key={party} id={`party-${slug}`} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="font-mono text-[11px] text-slate-600">{party}</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {liveIndexes.map((idx) => {
                  const k = cellKey(party, idx.id, approach);
                  const r = cells[k];
                  return (
                    <LiveQueryCell
                      key={idx.id}
                      state={r ? "resolved" : "loading"}
                      party={party}
                      indexShort={idx.short}
                      result={r}
                      coverage={idx.coverage}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function countOutcomes(cells: Record<CellKey, QueryResult>) {
  let publicAnswered = 0;
  let countyAnswered = 0;
  let aiDismissed = 0;
  let zeros = 0;
  for (const [key, r] of Object.entries(cells)) {
    const isCounty = key.endsWith("__county-internal");
    const isPublic = key.endsWith("__public-api");
    if (r.status === "zero" || r.status === "hit") {
      if (isCounty) countyAnswered += 1;
      if (isPublic) publicAnswered += 1;
    }
    if (r.status === "zero") zeros += 1;
    if (r.status === "hit") {
      for (const h of r.hits) {
        if (h.ai_judgment === "probable_false_positive") aiDismissed += 1;
      }
    }
  }
  return { publicAnswered, countyAnswered, aiDismissed, zeros };
}
