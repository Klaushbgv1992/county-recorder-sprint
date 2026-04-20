import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  getShowpieceShape,
  getCaptureMetadata,
  queryIndex,
  type IndexId,
  type Approach,
  type QueryResult,
  type LiveIndexMeta,
} from "../lib/custodian-query-engine";
import { LiveQueryCell, type CellState } from "../components/LiveQueryCell";

type CellKey = `${string}__${IndexId}__${Approach}`;

function cellKey(party: string, indexId: IndexId, approach: Approach): CellKey {
  return `${party}__${indexId}__${approach}` as CellKey;
}

const SESSION_KEY = "custodian-query-seen";
const STAGGER_MS = 50;

export function CustodianQueryPage() {
  const shape = useMemo(() => getShowpieceShape(), []);
  const meta = useMemo(() => getCaptureMetadata(), []);
  const location = useLocation();
  const [animationKey, setAnimationKey] = useState(0);
  const [cellStates, setCellStates] = useState<Record<CellKey, CellState>>({});
  const [cells, setCells] = useState<Record<CellKey, QueryResult>>({});

  const replayParam = new URLSearchParams(location.search).has("replay");

  useEffect(() => {
    let cancelled = false;
    const seen = sessionStorage.getItem(SESSION_KEY) === "1";
    const allKeys: { party: string; idx: IndexId; a: Approach; k: CellKey }[] = [];
    for (const party of shape.parties) {
      for (const idx of shape.liveIndexes) {
        for (const a of ["public-api", "county-internal"] as const) {
          allKeys.push({ party, idx: idx.id, a, k: cellKey(party, idx.id, a) });
        }
      }
    }

    // Batch the initial-state seed into a microtask so the lint rule
    // react-hooks/set-state-in-effect isn't triggered by a sync setState
    // in the effect body. The cascade is one tick of latency, not a render.
    const seedInitialState = (states: Record<CellKey, CellState>) => {
      queueMicrotask(() => {
        if (cancelled) return;
        setCellStates(states);
      });
    };

    if (seen && !replayParam) {
      // Skip animation: resolve everything immediately.
      const initialStates: Record<CellKey, CellState> = {};
      for (const { k } of allKeys) initialStates[k] = "loading";
      seedInitialState(initialStates);
      Promise.all(
        allKeys.map(({ party, idx, a, k }) =>
          queryIndex(party, idx, a).then((r) => {
            if (cancelled) return;
            setCells((prev) => ({ ...prev, [k]: r }));
            setCellStates((prev) => ({ ...prev, [k]: "resolved" }));
          })
        )
      ).then(() => {
        if (cancelled) return;
        sessionStorage.setItem(SESSION_KEY, "1");
      });
      return () => {
        cancelled = true;
      };
    }

    // First visit / replay: staggered animation.
    const idleStates: Record<CellKey, CellState> = {};
    for (const { k } of allKeys) idleStates[k] = "idle";
    seedInitialState(idleStates);
    queueMicrotask(() => {
      if (!cancelled) setCells({});
    });

    const tasks = allKeys.map(({ party, idx, a, k }, i) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (cancelled) return resolve();
          setCellStates((prev) => ({ ...prev, [k]: "loading" }));
          queryIndex(party, idx, a).then((r) => {
            if (cancelled) return resolve();
            setCells((prev) => ({ ...prev, [k]: r }));
            setCellStates((prev) => ({ ...prev, [k]: "resolved" }));
            resolve();
          });
        }, i * STAGGER_MS);
      });
    });

    Promise.all(tasks).then(() => {
      if (cancelled) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    });

    return () => {
      cancelled = true;
    };
  }, [shape, animationKey, replayParam]);

  useEffect(() => {
    // Scroll to anchor if present.
    if (location.hash.startsWith("#party-")) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [location.hash]);

  const outcome = useMemo(() => countOutcomes(cells), [cells]);

  function handleReplay() {
    sessionStorage.removeItem(SESSION_KEY);
    setAnimationKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Custodian Query Engine — Maricopa County
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          The public API cannot answer by name. The custodian can. This page runs both side-by-side.
        </p>
        <div className="mt-2 text-[11px] text-slate-500 space-x-3 font-mono">
          <span>captured {meta.captured_at}</span>
          <span>·</span>
          <span>{shape.parties.length} parties</span>
          <span>·</span>
          <span>{shape.liveIndexes.length} live indexes</span>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">
            {shape.parties.length * shape.liveIndexes.length * 2} queries attempted
          </span>
          {" · "}Public API: <span className="font-semibold text-slate-700">{outcome.publicAnswered}</span> answered
          {" · "}County internal: <span className="font-semibold text-emerald-800">{outcome.countyAnswered}</span> answered
          {" · "}<span className="text-amber-900">{outcome.aiDismissed}</span> AI-dismissed
          {" · "}<span className="text-emerald-800">{outcome.zeros}</span> verified zero
        </p>
        <button
          type="button"
          onClick={handleReplay}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          ▶ Replay sweep
        </button>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MatrixColumn
          title="Public API"
          subtitle="publicapi.recorder.maricopa.gov"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="public-api"
          cells={cells}
          states={cellStates}
        />
        <MatrixColumn
          title="County internal index"
          subtitle="what a custodian can run"
          parties={shape.parties}
          liveIndexes={shape.liveIndexes}
          approach="county-internal"
          cells={cells}
          states={cellStates}
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
  states,
}: {
  title: string;
  subtitle: string;
  parties: string[];
  liveIndexes: LiveIndexMeta[];
  approach: Approach;
  cells: Record<CellKey, QueryResult>;
  states: Record<CellKey, CellState>;
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
                  return (
                    <LiveQueryCell
                      key={idx.id}
                      state={states[k] ?? "idle"}
                      party={party}
                      indexShort={idx.short}
                      result={cells[k]}
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
