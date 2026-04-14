import type { Instrument } from "../types";
import {
  partyNameSimilarity,
  dateProximity,
  legalDescriptionOverlap,
} from "../logic/release-candidate-matcher";

// Renders the same three matcher features the candidate panel shows, so an
// examiner sees the matcher's view of an existing release link side-by-side
// with the link record itself. The numbers are not invented — they are the
// pure-function output of the same matcher (party name, date, legal-desc).
// The link's recorded provenance + confidence stay on the ProvenanceTag
// next to it; this panel is the matcher's independent view of the same pair.

interface Props {
  dot: Instrument;
  release: Instrument;
}

function FeatureBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-28 text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-1.5 overflow-hidden">
        <div className="bg-indigo-500 h-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums text-gray-700">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export function LinkEvidenceBars({ dot, release }: Props) {
  const partyNameSim = partyNameSimilarity(dot, release);
  const dateProx = dateProximity(dot.recording_date, release.recording_date);
  const legalDesc = legalDescriptionOverlap(dot, release);
  const overall = (partyNameSim + dateProx + legalDesc) / 3;

  return (
    <div
      data-testid="link-evidence-bars"
      className="ml-27 mt-1 mb-1 grid gap-1 max-w-md"
    >
      <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wide">
        <span>Matcher view of this link</span>
        <span className="font-mono tabular-nums">
          score {overall.toFixed(2)}
        </span>
      </div>
      <FeatureBar label="Party name match" value={partyNameSim} />
      <FeatureBar label="Date proximity" value={dateProx} />
      <FeatureBar label="Legal description match" value={legalDesc} />
    </div>
  );
}
