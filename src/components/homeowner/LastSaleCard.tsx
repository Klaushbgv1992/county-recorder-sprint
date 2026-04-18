// src/components/homeowner/LastSaleCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function LastSaleCard({ apn, lastSale }: { apn: string; lastSale: HomeownerAnswers["lastSale"] }) {
  if (!lastSale.found) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">When was the last sale?</h2>
        <p className="mt-2 text-xl font-semibold text-slate-900">No recent sale recorded</p>
        <p className="mt-1 text-sm text-slate-600">
          The county's curated chain for this parcel does not show a qualifying deed.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">When was the last sale?</h2>
      <p className="mt-2 text-xl font-semibold text-slate-900">{lastSale.year}</p>
      <p className="mt-1 text-sm text-slate-600">
        {lastSale.buyersPhrase} bought the home from {lastSale.sellersPhrase}.
      </p>
      <p className="mt-1 text-sm text-slate-500">{lastSale.priceDisplay}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}/instrument/${lastSale.recordingNumber}`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: county recorded deed ({lastSale.provenance})</span>
      </div>
    </section>
  );
}
