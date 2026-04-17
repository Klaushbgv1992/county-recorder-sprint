import { Link } from "react-router";
import type { StoryPageData } from "../../narrative/types";

export function StoryFooterCtas({ data }: { data: StoryPageData }) {
  const ctas = [
    { to: `/parcel/${data.apn}`, label: "Read the examiner's detailed chain →" },
    { to: `/parcel/${data.apn}/commitment/new`, label: "Export as commitment →" },
    { to: `/parcel/${data.apn}/encumbrances`, label: "See all claims against this parcel →" },
    { to: `/subscribe?apn=${data.apn}`, label: "Subscribe to new filings on this parcel →" },
  ];
  return (
    <nav aria-label="Actions for this parcel" className="border-t border-slate-200 pt-4 mt-6">
      <p className="text-xs text-slate-500 mb-2">
        All facts on this page cite recorded documents.
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {ctas.map((c) => (
          <li key={c.to}>
            <Link
              to={c.to}
              className="text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
