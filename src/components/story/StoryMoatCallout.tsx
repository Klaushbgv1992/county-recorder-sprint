import { Link } from "react-router";
import type { StoryPageData } from "../../narrative/types";

export function StoryMoatCallout({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-moat" className="border-l-4 border-moat-500 pl-4 py-2">
      <h2 id="story-moat" className="text-base font-semibold text-moat-800">
        Why this comes from the county, not a title plant
      </h2>
      <p className="mt-2 text-sm text-slate-700 max-w-prose">
        {data.moatCallout}{" "}
        <Link
          to="/moat-compare"
          className="text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        >
          See how we compare to a title plant →
        </Link>
      </p>
    </section>
  );
}
