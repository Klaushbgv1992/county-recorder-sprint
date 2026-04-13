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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
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

      <main className="max-w-6xl mx-auto px-6 py-6">
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
      </main>

      {drawerInstrument && (
        <ProofDrawer
          instrument={data.instruments.find(
            (i) => i.instrument_number === drawerInstrument,
          )!}
          links={data.links.filter(
            (l) =>
              l.source_instrument === drawerInstrument ||
              l.target_instrument === drawerInstrument,
          )}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
