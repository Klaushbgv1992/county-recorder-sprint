import { useMemo, useState } from "react";
import { Link } from "react-router";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
} from "../types";
import { detectAnomalies } from "../logic/anomaly-detector";
import { AnomalyPanel } from "./AnomalyPanel";
import { AiSummaryStatic } from "./AiSummaryStatic";
import { ChainSwimlane } from "./ChainSwimlane";
import { Term, TermSection } from "../terminology/Term";
import { storyPageExists } from "../narrative/availability";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
  // Optional. When supplied, back-reference chips on the swimlane jump to
  // the owning lifecycle on the Encumbrance screen. The /parcel/:apn route
  // passes this through; the staff-preview embed can omit it.
  lifecycles?: EncumbranceLifecycle[];
}

export function ChainOfTitle({
  parcel,
  instruments,
  links,
  onOpenDocument,
  lifecycles,
}: Props) {
  const findings = useMemo(() => detectAnomalies(parcel.apn), [parcel.apn]);
  const knownInstruments = useMemo(
    () => new Set(instruments.map((i) => i.instrument_number)),
    [instruments],
  );
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div>
      <TermSection id="chain-heading">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {parcel.address}, {parcel.city} {parcel.state}
          </h1>
          <div className="flex items-baseline gap-3 flex-wrap mt-1">
            <h2 className="text-base font-semibold text-gray-700">
              <Term professional="Chain of Title" />
            </h2>
            {storyPageExists(parcel.apn) && (
              <Link
                to={`/parcel/${parcel.apn}/story`}
                className="text-xs text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              >
                Read as a story →
              </Link>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            APN: <span className="font-mono">{parcel.apn}</span>
          </p>
        </div>
      </TermSection>

      <AnomalyPanel findings={findings} apn={parcel.apn} />

      {/* Work-product first: swimlane is the primary surface. The AI summary
          lives behind a disclosure below so the page opens on the chain
          itself, not on a block of prose. */}
      <ChainSwimlane
        parcel={parcel}
        instruments={instruments}
        links={links}
        onOpenDocument={onOpenDocument}
        lifecycles={lifecycles}
      />

      <section className="mt-6 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          aria-expanded={aiOpen}
          aria-controls="chain-ai-summary"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded flex items-center gap-1"
        >
          <span aria-hidden="true">{aiOpen ? "▾" : "▸"}</span>
          <span>
            {aiOpen ? "Hide AI summary" : "View AI summary"}
          </span>
        </button>
        {aiOpen && (
          <div id="chain-ai-summary" className="mt-3">
            <AiSummaryStatic
              parcel={parcel}
              knownInstruments={knownInstruments}
              onOpenDocument={onOpenDocument}
            />
          </div>
        )}
      </section>
    </div>
  );
}
