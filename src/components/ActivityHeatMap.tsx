// src/components/ActivityHeatMap.tsx
import { useState, useMemo } from "react";
import { Link } from "react-router";
import activity from "../data/activity-synthetic.json";
import {
  aggregateActivity,
  type ActivityRecord,
} from "../logic/activity-aggregator";

const WINDOWS = [30, 60, 90] as const;

export function ActivityHeatMap() {
  const [windowDays, setWindowDays] = useState<number>(30);

  const byMunicipality = useMemo(
    () =>
      aggregateActivity(activity.records as ActivityRecord[], {
        groupBy: "municipality",
        windowDays,
        referenceDate: "2026-04-09",
      }),
    [windowDays],
  );

  const byDate = useMemo(
    () =>
      aggregateActivity(activity.records as ActivityRecord[], {
        groupBy: "date",
        windowDays,
        referenceDate: "2026-04-09",
      }),
    [windowDays],
  );

  const max = Math.max(...byMunicipality.map((b) => b.total), 1);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <nav className="mb-6 text-sm">
        <Link to="/" className="text-slate-600 underline underline-offset-2">
          ← Back to portal
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          County Recording Activity
        </h1>
        <p className="text-sm text-slate-600">
          Last {windowDays} days · indexed through 2026-04-09 · synthesized for demo
        </p>
      </header>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-slate-700">Window:</span>
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWindowDays(w)}
            className={`px-3 py-1 text-sm rounded-md border ${
              windowDays === w
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300"
            }`}
          >
            {w} days
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            By municipality
          </h2>
          <ul className="space-y-2">
            {byMunicipality.map((b) => (
              <li key={b.key} className="flex items-center gap-3">
                <span className="w-28 text-xs text-slate-700">{b.key}</span>
                <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(b.total / max) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-mono text-slate-900">
                  {b.total.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Daily volume
          </h2>
          <p className="text-xs text-slate-500 mb-2">
            Title plants typically lag indexing by 14–28 days.{" "}
            <strong>This view updates nightly.</strong>
          </p>
          <div className="flex items-end gap-px h-32">
            {byDate.map((b) => (
              <div
                key={b.key}
                title={`${b.key}: ${b.total}`}
                className="flex-1 bg-slate-700"
                style={{
                  height: `${(b.total / Math.max(...byDate.map((x) => x.total))) * 100}%`,
                  minHeight: "2px",
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
