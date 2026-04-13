import { useState } from "react";
import { useParcelData } from "./hooks/useParcelData";
import { useExaminerActions } from "./hooks/useExaminerActions";
import { SearchEntry } from "./components/SearchEntry";
import { ChainOfTitle } from "./components/ChainOfTitle";
import { EncumbranceLifecycle } from "./components/EncumbranceLifecycle";
import { ProofDrawer } from "./components/ProofDrawer";

type Screen = "search" | "chain" | "encumbrance";

export default function App() {
  const data = useParcelData();
  const examiner = useExaminerActions(data.links);
  const [screen, setScreen] = useState<Screen>("search");
  const [drawerInstrument, setDrawerInstrument] = useState<string | null>(null);

  const openDrawer = (instrumentNumber: string) =>
    setDrawerInstrument(instrumentNumber);
  const closeDrawer = () => setDrawerInstrument(null);

  const drawerOpen = drawerInstrument !== null;
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
        <h1 className="text-lg font-semibold text-blue-900">
          Maricopa County Recorder
        </h1>
        <button
          onClick={() => setScreen("search")}
          className={`px-3 py-1 rounded text-sm ${screen === "search" ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Search
        </button>
        <button
          onClick={() => setScreen("chain")}
          className={`px-3 py-1 rounded text-sm ${screen === "chain" ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Chain of Title
        </button>
        <button
          onClick={() => setScreen("encumbrance")}
          className={`px-3 py-1 rounded text-sm ${screen === "encumbrance" ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Encumbrances
        </button>
      </nav>

      {/* Split pane: main content + drawer side-by-side when drawer is open */}
      <div className="flex-1 flex overflow-hidden">
        <main
          className={`${drawerOpen ? "w-1/2" : "w-full"} overflow-auto transition-[width] duration-200`}
        >
          <div className="max-w-6xl mx-auto px-6 py-6">
            {screen === "search" && (
              <SearchEntry
                parcel={data.parcel}
                onSelectParcel={() => setScreen("chain")}
              />
            )}
            {screen === "chain" && (
              <ChainOfTitle
                parcel={data.parcel}
                instruments={data.instruments}
                links={data.links}
                onOpenDocument={openDrawer}
              />
            )}
            {screen === "encumbrance" && (
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
              onClose={closeDrawer}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
