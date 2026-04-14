import { useEffect, useMemo, useState } from "react";
import { useParcelData } from "./hooks/useParcelData";
import { useAllParcels } from "./hooks/useAllParcels";
import { useExaminerActions } from "./hooks/useExaminerActions";
import { SearchEntry } from "./components/SearchEntry";
import { ChainOfTitle } from "./components/ChainOfTitle";
import { EncumbranceLifecycle } from "./components/EncumbranceLifecycle";
import { ProofDrawer } from "./components/ProofDrawer";

type Screen = "search" | "chain" | "encumbrance";

export default function App() {
  const parcels = useAllParcels();
  const [selectedApn, setSelectedApn] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("search");
  const [drawerInstrument, setDrawerInstrument] = useState<string | null>(null);

  // Scope all downstream data to the selected parcel. When none is
  // selected we still load the default corpus so hook ordering is stable,
  // but the UI is on the search screen so it doesn't render.
  const data = useParcelData(selectedApn);
  const examiner = useExaminerActions(data.links);

  const openDrawer = (instrumentNumber: string) =>
    setDrawerInstrument(instrumentNumber);
  const closeDrawer = () => setDrawerInstrument(null);

  const handleSelectParcel = (apn: string, instrumentNumber?: string) => {
    setSelectedApn(apn);
    setScreen("chain");
    // If the search resolved an 11-digit instrument number, queue the
    // Proof Drawer to open on that instrument once the new corpus loads.
    setDrawerInstrument(instrumentNumber ?? null);
  };

  const handleReturnToSearch = () => {
    setScreen("search");
    setDrawerInstrument(null);
  };

  // Guard: if drawer is pointing at an instrument that isn't in the
  // current parcel's corpus, close it. This would only happen mid-nav,
  // but it keeps state coherent.
  useEffect(() => {
    if (
      drawerInstrument &&
      !data.instruments.find((i) => i.instrument_number === drawerInstrument)
    ) {
      setDrawerInstrument(null);
    }
  }, [drawerInstrument, data.instruments]);

  const corpusProvenance = useMemo(() => {
    return data.instruments.reduce(
      (acc, inst) => {
        const s = inst.provenance_summary;
        if (!s) return acc;
        return {
          public_api: acc.public_api + s.public_api_count,
          ocr: acc.ocr + s.ocr_count,
          manual_entry: acc.manual_entry + s.manual_entry_count,
        };
      },
      { public_api: 0, ocr: 0, manual_entry: 0 },
    );
  }, [data.instruments]);

  const onSearchScreen = screen === "search" || selectedApn === null;
  const drawerOpen = !onSearchScreen && drawerInstrument !== null;
  const instrumentForDrawer = drawerOpen
    ? data.instruments.find((i) => i.instrument_number === drawerInstrument)
    : undefined;
  const linksForDrawer = drawerOpen
    ? data.links.filter(
        (l) =>
          l.source_instrument === drawerInstrument ||
          l.target_instrument === drawerInstrument,
      )
    : [];

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 shrink-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-blue-900">
            Land Custodian Portal
          </h1>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Maricopa County, AZ
          </span>
        </div>
        <button
          onClick={handleReturnToSearch}
          className={`px-3 py-1 rounded text-sm ${onSearchScreen ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Search
        </button>
        <button
          onClick={() => selectedApn && setScreen("chain")}
          disabled={!selectedApn}
          className={`px-3 py-1 rounded text-sm ${screen === "chain" && selectedApn ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"} disabled:text-gray-300 disabled:hover:text-gray-300 disabled:cursor-not-allowed`}
        >
          Chain of Title
        </button>
        <button
          onClick={() => selectedApn && setScreen("encumbrance")}
          disabled={!selectedApn}
          className={`px-3 py-1 rounded text-sm ${screen === "encumbrance" && selectedApn ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"} disabled:text-gray-300 disabled:hover:text-gray-300 disabled:cursor-not-allowed`}
        >
          Encumbrances
        </button>
        {selectedApn && !onSearchScreen && (
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span>
              {data.parcel.address} &middot; APN {data.parcel.apn}
            </span>
            <button
              onClick={handleReturnToSearch}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              &larr; Search another parcel
            </button>
          </div>
        )}
      </nav>

      {/* Split pane: main content + drawer side-by-side when drawer is open */}
      <div className="flex-1 flex overflow-hidden">
        <main
          className={`${drawerOpen ? "w-1/2" : "w-full"} overflow-auto transition-[width] duration-200`}
        >
          <div className="max-w-6xl mx-auto px-6 py-6">
            {onSearchScreen && (
              <SearchEntry
                parcels={parcels}
                onSelectParcel={handleSelectParcel}
              />
            )}
            {!onSearchScreen && screen === "chain" && (
              <ChainOfTitle
                parcel={data.parcel}
                instruments={data.instruments}
                links={data.links}
                onOpenDocument={openDrawer}
              />
            )}
            {!onSearchScreen && screen === "encumbrance" && (
              <EncumbranceLifecycle
                parcel={data.parcel}
                instruments={data.instruments}
                links={data.links}
                lifecycles={data.lifecycles}
                pipelineStatus={data.pipelineStatus}
                linkActions={examiner.linkActions}
                lifecycleOverrides={examiner.lifecycleOverrides}
                onSetLinkAction={examiner.setLinkAction}
                onSetLifecycleOverride={examiner.setLifecycleOverride}
                onOpenDocument={openDrawer}
              />
            )}
          </div>
        </main>

        {drawerOpen && instrumentForDrawer && (
          <aside className="w-1/2 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
            <ProofDrawer
              instrument={instrumentForDrawer}
              links={linksForDrawer}
              corpusProvenance={corpusProvenance}
              onClose={closeDrawer}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
