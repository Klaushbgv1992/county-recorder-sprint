import { Link, useNavigate, useParams } from "react-router";
import { useEffect } from "react";
import type { RouteObject } from "react-router";
import type { Parcel } from "./types";
import { searchParcels } from "./logic/search";
import { AppShell } from "./App";
import { useAllParcels } from "./hooks/useAllParcels";

/**
 * Resolve a bare 11-digit instrument number to the APN of the single
 * parcel that owns it. Returns null when the input isn't an 11-digit
 * number, or when no parcel in the corpus owns the instrument. Used by
 * the /instrument/:n client-side redirect resolver.
 */
export function resolveInstrumentToApn(
  instrumentNumber: string,
  parcels: Parcel[],
): string | null {
  const results = searchParcels(instrumentNumber, parcels);
  if (results.length !== 1) return null;
  const only = results[0];
  if (only.matchType !== "instrument") return null;
  return only.parcel.apn;
}

function NotFoundPanel({
  title = "Not in this corpus",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 mb-6">{subtitle}</p>}
      <Link to="/" className="text-blue-600 hover:text-blue-800 hover:underline">
        Return to search
      </Link>
    </div>
  );
}

function SearchRoute() {
  return <div data-testid="route-search">search</div>;
}

function ChainRoute() {
  return <div data-testid="route-chain">chain</div>;
}

function EncumbranceRoute() {
  return <div data-testid="route-encumbrance">encumbrance</div>;
}

function InstrumentResolver() {
  const { instrumentNumber } = useParams();
  const parcels = useAllParcels();
  const navigate = useNavigate();

  useEffect(() => {
    if (!instrumentNumber) return;
    const apn = resolveInstrumentToApn(instrumentNumber, parcels);
    if (apn) {
      navigate(`/parcel/${apn}/instrument/${instrumentNumber}`, {
        replace: true,
      });
    }
  }, [instrumentNumber, parcels, navigate]);

  const apn = instrumentNumber
    ? resolveInstrumentToApn(instrumentNumber, parcels)
    : null;
  if (instrumentNumber && !apn) {
    return (
      <NotFoundPanel
        title="Instrument not in this corpus"
        subtitle={`No parcel owns instrument ${instrumentNumber} in the curated set.`}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center text-sm text-gray-600">
      Resolving instrument…
    </div>
  );
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { id: "search", index: true, element: <SearchRoute /> },
      {
        id: "chain",
        path: "parcel/:apn",
        element: <ChainRoute />,
      },
      {
        id: "chain-instrument",
        path: "parcel/:apn/instrument/:instrumentNumber",
        element: <ChainRoute />,
      },
      {
        id: "encumbrance",
        path: "parcel/:apn/encumbrances",
        element: <EncumbranceRoute />,
      },
      {
        id: "encumbrance-instrument",
        path: "parcel/:apn/encumbrances/instrument/:instrumentNumber",
        element: <EncumbranceRoute />,
      },
      {
        id: "instrument-resolver",
        path: "instrument/:instrumentNumber",
        element: <InstrumentResolver />,
      },
      {
        id: "not-found",
        path: "*",
        element: <NotFoundPanel />,
      },
    ],
  },
];
