// src/components/homeowner/OpenLiensCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function OpenLiensCard({ apn, openLiens }: { apn: string; openLiens: HomeownerAnswers["openLiens"] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Are there open liens?</h2>
      {openLiens.count === 0 ? (
        <p className="mt-2 text-xl font-semibold text-slate-900">No open liens on record</p>
      ) : (
        <>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {openLiens.count} open item{openLiens.count === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 list-disc list-inside">
            {openLiens.summaries.map((s) => (
              <li key={s.lifecycleId}>{s.rationale}</li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}/encumbrances`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: encumbrance lifecycle analysis</span>
      </div>
    </section>
  );
}
