// src/components/LandingPage.tsx
import { useNavigate, Link } from "react-router";
import { CountyMap, type HighlightedParcel } from "./CountyMap";
import { SearchEntry } from "./SearchEntry";
import { useAllParcels } from "../hooks/useAllParcels";

const HIGHLIGHTED: HighlightedParcel[] = [
  { apn: "304-78-386", status: "primary", label: "POPHAM" },
  { apn: "304-77-689", status: "backup", label: "HOGUE (counter-example)" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const parcels = useAllParcels();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-semibold text-slate-900">Land Custodian Portal</h1>
        <p className="text-sm text-slate-600">
          Maricopa County Recorder · the authoritative source, presented spatially
        </p>
      </header>

      <section className="relative h-[60vh] min-h-[420px] border-b border-slate-200">
        <CountyMap
          highlightedParcels={HIGHLIGHTED}
          onParcelClick={(apn) => navigate(`/parcel/${apn}`)}
        />
        <aside className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md rounded-lg bg-white/95 p-4 shadow-lg border border-slate-200 backdrop-blur-sm">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Why this map matters.</strong>{" "}
            These polygons come from the county assessor's file. Title plants
            license them via third parties. The recorder system has no APN
            bridge (Known Gap #7) — the county is the only party that can
            serve this spatial layer authoritatively.
          </p>
        </aside>
      </section>

      <section
        role="search"
        className="px-6 py-8 bg-white border-b border-slate-200"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-medium text-slate-700 mb-2">
            Or enter a parcel or instrument number directly
          </h2>
          <SearchEntry
            parcels={parcels}
            onSelectParcel={(apn, instrumentNumber) =>
              navigate(
                instrumentNumber
                  ? `/parcel/${apn}/instrument/${instrumentNumber}`
                  : `/parcel/${apn}`,
              )
            }
          />
        </div>
      </section>

      <footer className="px-6 py-4 flex justify-between items-center text-xs text-slate-500">
        <Link
          to="/county-activity"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → View county activity
        </Link>
        <Link
          to="/moat-compare"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → Compare to a title-plant report
        </Link>
      </footer>
    </main>
  );
}
