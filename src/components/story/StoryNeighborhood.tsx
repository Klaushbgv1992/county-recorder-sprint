import { Link } from "react-router";
import type { StoryPageData } from "../../narrative/types";

export function StoryNeighborhood({ data }: { data: StoryPageData }) {
  const { subdivision_line, neighbors } = data.neighborhood;

  if (neighbors.length === 0 && !subdivision_line) {
    return null;
  }

  return (
    <section aria-labelledby="story-neighborhood">
      <h2 id="story-neighborhood" className="text-lg font-semibold text-recorder-900">
        In your neighborhood
      </h2>
      <div className="mt-2 space-y-2 max-w-prose text-sm text-slate-700">
        {subdivision_line && <p>{subdivision_line}</p>}
        {neighbors.length > 0 && (
          <p>
            Your neighbors with records in the county's cache:{" "}
            {neighbors.map((n, i) => (
              <span key={n.apn}>
                <Link
                  to={`/parcel/${n.apn}/story`}
                  className="text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
                >
                  {n.address}
                </Link>
                {i < neighbors.length - 1 ? ", " : ""}
              </span>
            ))}
            .
          </p>
        )}
        {neighbors.length > 0 && neighbors.length < 5 && (
          <p className="text-xs text-slate-500">We index neighbors as we add them.</p>
        )}
      </div>
    </section>
  );
}
