// src/components/LandingPage.tsx
import { useNavigate, Link } from "react-router";
import { CountyMap, type HighlightedParcel } from "./CountyMap";
import { SearchEntry } from "./SearchEntry";
import { FeaturedParcels } from "./FeaturedParcels";
import { PersonaRow } from "./PersonaRow";
import { useAllParcels } from "../hooks/useAllParcels";
import { CountyHeartbeat } from "./CountyHeartbeat";
import { useNowOverrideFromSearchParams } from "../hooks/useNowOverrideFromSearchParams";

const HIGHLIGHTED: HighlightedParcel[] = [
  { apn: "304-78-386", status: "primary", label: "POPHAM" },
  { apn: "304-77-689", status: "backup", label: "HOGUE (counter-example)" },
  { apn: "304-78-409", status: "subdivision_common", label: "Seville HOA tract" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const parcels = useAllParcels();
  const nowOverride = useNowOverrideFromSearchParams();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      {/* === BEGIN CountyHeartbeat block (feature/landing-heartbeat) ===
          Do not refactor this block as part of map-redesign work — it is
          scoped to a single <CountyHeartbeat/> mount so the parallel
          agent's diff path stays clean. === */}
      <CountyHeartbeat now={nowOverride} />
      {/* === END CountyHeartbeat block === */}

      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-recorder-900">
              Maricopa County Recorder
            </h1>
            <p className="text-sm text-recorder-500">
              The county owns the record. Everyone else owns a copy.
            </p>
          </div>
          <Link
            to="/why"
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 pt-1"
          >
            Why this matters →
          </Link>
        </div>
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

      <FeaturedParcels parcels={parcels} />

      <section
        role="search"
        className="px-6 py-8 bg-white border-b border-slate-200"
      >
        <div className="max-w-2xl mx-auto">
          <PersonaRow />
          <h2 className="text-sm font-medium text-slate-700 mb-2">
            Or look up a parcel directly
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

      <section className="px-6 py-6 bg-recorder-50 border-b border-recorder-100">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/"
            className="group block rounded-lg border border-recorder-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
          >
            <p className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700">Spatial custody</p>
            <p className="text-xs text-recorder-500 mt-1">County-authoritative parcel polygons from the assessor. No licensing layer.</p>
          </Link>
          <Link
            to="/pipeline"
            className="group block rounded-lg border border-recorder-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
          >
            <p className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700">Verified freshness</p>
            <p className="text-xs text-recorder-500 mt-1">Per-stage pipeline verification with SLA tracking. Know exactly how current your data is.</p>
          </Link>
          <Link
            to={`/parcel/304-78-386/encumbrances`}
            className="group block rounded-lg border border-recorder-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
          >
            <p className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700">Chain intelligence</p>
            <p className="text-xs text-recorder-500 mt-1">Same-day transaction grouping, MERS annotations, and release matching. Structured title work, not a document list.</p>
          </Link>
        </div>
      </section>

      <footer className="px-6 py-4 flex justify-between items-center text-xs text-slate-500 flex-wrap gap-2">
        <Link
          to="/county-activity"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → View county activity
        </Link>
        <Link
          to="/why"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → Why this matters
        </Link>
        <Link
          to="/moat-compare"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          → Compare to a title-plant report
        </Link>
        <Link
          to="/staff"
          className="underline underline-offset-2 text-slate-400 hover:text-slate-600"
        >
          County staff? Open workbench &rarr;
        </Link>
      </footer>
    </main>
  );
}
