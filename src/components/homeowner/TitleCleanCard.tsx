// src/components/homeowner/TitleCleanCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function TitleCleanCard({ apn, titleClean }: { apn: string; titleClean: HomeownerAnswers["titleClean"] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
        Is the title clean?
      </h2>
      <p className="mt-2 text-xl font-semibold text-slate-900">
        {titleClean.clean
          ? "Title looks clean"
          : `${titleClean.openCount} open item${titleClean.openCount === 1 ? "" : "s"} on record`}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {titleClean.clean
          ? "No unreleased mortgages or liens are recorded against this parcel."
          : "The county still shows open items that have not been resolved on the public record."}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}/encumbrances`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: county recorder + curated chain review</span>
      </div>
    </section>
  );
}
