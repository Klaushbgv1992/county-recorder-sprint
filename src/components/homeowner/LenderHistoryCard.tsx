// src/components/homeowner/LenderHistoryCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function LenderHistoryCard({ apn, lenderHistory }: { apn: string; lenderHistory: HomeownerAnswers["lenderHistory"] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Who has lent against this property?</h2>
      {lenderHistory.entries.length === 0 ? (
        <p className="mt-2 text-xl font-semibold text-slate-900">No mortgages on record</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {lenderHistory.entries.map((e) => (
            <li key={e.recordingNumber} className="flex items-baseline gap-3 text-sm">
              <span className="font-mono text-slate-500 w-12">{e.year}</span>
              <span className="text-slate-900 font-medium">{e.lenderDisplayName}</span>
              <span className="ml-auto text-[11px] text-slate-400">({e.provenance})</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: recorded deeds of trust</span>
      </div>
    </section>
  );
}
