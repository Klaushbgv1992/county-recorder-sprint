import { Link } from "react-router";
import type { LienSignal } from "../logic/subdivision-signals";

interface Props {
  signals: LienSignal[];
  subdivision: string;
}

export function SubdivisionSignalsCard({ signals, subdivision }: Props) {
  if (signals.length === 0) return null;

  const count = signals.length;
  const first = signals[0];

  return (
    <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Subdivision signals
          </div>
          <p className="mt-1 text-sm text-amber-950">
            <strong>
              {count} active HOA lien{count === 1 ? "" : "s"} in {subdivision}
            </strong>
            {count === 1 && (
              <>
                {" "}— Lot from APN {first.apn} ({first.currentOwner}).
              </>
            )}{" "}
            <span className="text-amber-800">Not on this parcel.</span>
          </p>
          <p className="mt-1 text-xs text-amber-800">
            The public recorder API surfaces this by walking lot-by-lot.
            Name-indexed title plants cannot reconstruct subdivision-wide
            encumbrance density.
          </p>
        </div>
        <Link
          to={`/parcel/${first.apn}/encumbrances`}
          className="shrink-0 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
        >
          View Lot →
        </Link>
      </div>
    </div>
  );
}
