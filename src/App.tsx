import "maplibre-gl/dist/maplibre-gl.css";
import { Link, Outlet, useMatch, useParams } from "react-router";
import { useParcelData } from "./hooks/useParcelData";
import { useAllParcels } from "./hooks/useAllParcels";
import { PipelineBanner } from "./components/PipelineBanner";

export function AppShell() {
  const params = useParams();
  const selectedApn = params.apn ?? null;

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
          <h1 className="text-lg font-semibold text-blue-900">
            Land Custodian Portal
          </h1>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Maricopa County, AZ
          </span>
        </div>
        <Link
          to="/"
          className={`px-3 py-1 rounded text-sm ${onSearch ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Search
        </Link>
        {hasParcel ? (
          <Link
            to={`/parcel/${selectedApn}`}
            className={`px-3 py-1 rounded text-sm ${onChain ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            Chain of Title
          </Link>
        ) : (
          <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
            Chain of Title
          </span>
        )}
        {hasParcel ? (
          <Link
            to={`/parcel/${selectedApn}/encumbrances`}
            className={`px-3 py-1 rounded text-sm ${onEncumbrance ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            Encumbrances
          </Link>
        ) : (
          <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
            Encumbrances
          </span>
        )}
        {hasParcel && !onSearch && (
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span>
              {parcelData.parcel.address} &middot; APN <span className="font-mono">{parcelData.parcel.apn}</span>
            </span>
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              &larr; Search another parcel
            </Link>
          </div>
        )}
      </nav>

      <Outlet />
    </div>
  );
}
