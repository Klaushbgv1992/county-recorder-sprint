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
import { StarButton } from "./account/StarButton";
import { CorrectionRequestButton } from "./account/CorrectionRequestButton";

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
          <h1 className="text-3xl font-semibold text-recorder-900 tracking-tight">
            {parcel.address}, {parcel.city} {parcel.state}
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.12em]">
              <Term professional="Chain of Title" />
            </h2>
            <span
              aria-label={`APN ${parcel.apn}`}
              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
            >
              APN {parcel.apn}
            </span>
            {storyPageExists(parcel.apn) && (
              <Link
                to={`/parcel/${parcel.apn}/story`}
                className="text-xs font-medium text-moat-700 hover:text-moat-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded"
              >
                Read as a story →
              </Link>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <StarButton kind="parcel" id={parcel.apn} label={parcel.apn} />
            <CorrectionRequestButton parcelApn={parcel.apn} />
          </div>
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
          className="text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded flex items-center gap-1.5"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className={`w-3.5 h-3.5 transition-transform duration-150 ${aiOpen ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 4 4 4-4 4" />
          </svg>
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
