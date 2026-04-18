// src/components/homeowner/HomeownerCardPage.tsx
import { Link, useParams } from "react-router";
import { loadAllInstruments, loadAllParcels } from "../../data-loader";
import { LifecyclesFile } from "../../schemas";
import lifecyclesRaw from "../../data/lifecycles.json";
import { computeHomeownerAnswers } from "../../logic/homeowner-answers";
import { TitleCleanCard } from "./TitleCleanCard";
import { LastSaleCard } from "./LastSaleCard";
import { OpenLiensCard } from "./OpenLiensCard";
import { LenderHistoryCard } from "./LenderHistoryCard";

const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

export function HomeownerCardPage() {
  const { apn = "" } = useParams();
  const parcels = loadAllParcels();
  const parcel = parcels.find((p) => p.apn === apn);

  if (!parcel) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">Not in the corpus</h1>
        <p className="mt-2 text-sm text-slate-600">
          This parcel isn't part of the curated Gilbert sample. Try the{" "}
          <Link to="/" className="text-indigo-700 hover:underline">home page</Link>.
        </p>
      </main>
    );
  }

  const instruments = loadAllInstruments().filter((i) =>
    parcel.instrument_numbers?.includes(i.instrument_number),
  );
  const answers = computeHomeownerAnswers(parcel, instruments, LIFECYCLES);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-500">{parcel.city}, {parcel.state}</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{parcel.address}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Four things the county's records say about this property. Each answer links to the underlying document.
        </p>
      </header>
      <div className="space-y-4">
        <TitleCleanCard apn={parcel.apn} titleClean={answers.titleClean} />
        <LastSaleCard apn={parcel.apn} lastSale={answers.lastSale} />
        <OpenLiensCard apn={parcel.apn} openLiens={answers.openLiens} />
        <LenderHistoryCard apn={parcel.apn} lenderHistory={answers.lenderHistory} />
      </div>
      <footer className="mt-8 border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Same data a title examiner would see — county-authoritative, not a title plant.</span>
        <Link to={`/parcel/${parcel.apn}?mode=examiner`} className="text-slate-700 font-medium hover:underline">
          Open examiner view →
        </Link>
      </footer>
    </main>
  );
}
