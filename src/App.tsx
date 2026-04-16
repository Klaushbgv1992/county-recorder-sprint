import "maplibre-gl/dist/maplibre-gl.css";
import { Link, Outlet, useMatch, useParams } from "react-router";
import { useParcelData } from "./hooks/useParcelData";
import { useAllParcels } from "./hooks/useAllParcels";
import { PipelineBanner } from "./components/PipelineBanner";
import { useTerminology } from "./terminology/TerminologyContext";
import { Term, TermSection } from "./terminology/Term";

export function AppShell() {
  const params = useParams();
  const selectedApn = params.apn ?? null;
  const { mode, toggle } = useTerminology();

  const matchSearch = useMatch("/");
  const matchChain = useMatch("/parcel/:apn");
  const matchChainInstrument = useMatch(
    "/parcel/:apn/instrument/:instrumentNumber",
  );
  const matchEncumbrance = useMatch("/parcel/:apn/encumbrances");
  const matchEncumbranceInstrument = useMatch(
    "/parcel/:apn/encumbrances/instrument/:instrumentNumber",
  );
  const onSearch = matchSearch !== null;
  const onChain = matchChain !== null || matchChainInstrument !== null;
  const onEncumbrance =
    matchEncumbrance !== null || matchEncumbranceInstrument !== null;

  // Only load + render the parcel label when the APN is actually in the
  // corpus; otherwise the not-found panel will render in the outlet and
  // the nav label would show stale data from the default-parcel fallback.
  const parcels = useAllParcels();
  const apnIsInCorpus =
    selectedApn !== null && parcels.some((p) => p.apn === selectedApn);
  const parcelData = useParcelData(apnIsInCorpus ? selectedApn : null);
  const hasParcel = apnIsInCorpus;

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <PipelineBanner />
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 shrink-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-recorder-900">
            Land Custodian Portal
          </h1>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Maricopa County, AZ
          </span>
        </div>
        <TermSection id="nav">
          <Link
            to="/"
            className={`px-3 py-1 rounded text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${onSearch ? "bg-recorder-100 text-recorder-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            Search
          </Link>
          {hasParcel ? (
            <Link
              to={`/parcel/${selectedApn}`}
              className={`px-3 py-1 rounded text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${onChain ? "bg-recorder-100 text-recorder-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              <Term professional="Chain of Title" />
            </Link>
          ) : (
            <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
              <Term professional="Chain of Title" />
            </span>
          )}
          {hasParcel ? (
            <Link
              to={`/parcel/${selectedApn}/encumbrances`}
              className={`px-3 py-1 rounded text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 ${onEncumbrance ? "bg-recorder-100 text-recorder-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              <Term professional="Encumbrances" />
            </Link>
          ) : (
            <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
              <Term professional="Encumbrances" />
            </span>
          )}
        </TermSection>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">Terminology:</span>
            <button
              onClick={mode === "plain" ? toggle : undefined}
              className={`px-1.5 py-0.5 rounded transition-colors duration-150 ${mode === "professional" ? "font-semibold text-gray-800" : "text-gray-400 hover:text-gray-600 cursor-pointer"}`}
            >
              Professional
            </button>
            <button
              onClick={mode === "professional" ? toggle : undefined}
              className={`px-1.5 py-0.5 rounded transition-colors duration-150 ${mode === "plain" ? "font-semibold text-gray-800" : "text-gray-400 hover:text-gray-600 cursor-pointer"}`}
            >
              Plain English
            </button>
          </div>
          {hasParcel && !onSearch && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                {parcelData.parcel.address} &middot; APN <span className="font-mono">{parcelData.parcel.apn}</span>
              </span>
              <Link
                to="/"
                className="text-recorder-500 hover:text-recorder-700 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              >
                &larr; Search another parcel
              </Link>
            </div>
          )}
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
