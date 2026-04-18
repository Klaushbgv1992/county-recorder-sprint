import { Link, useParams } from "react-router";
import federalTaxLien from "../../docs/hunt-log-known-gap-2.md?raw";
import sevilleMasterPlat from "../../data/raw/R-005/hunt-log.md?raw";

const RECEIPTS: Record<string, { title: string; raw: string; sourcePath: string }> = {
  "federal-tax-lien": {
    title: "Hunt log — federal tax lien (Known Gap #2)",
    raw: federalTaxLien,
    sourcePath: "docs/hunt-log-known-gap-2.md",
  },
  "seville-master-plat": {
    title: "Hunt log — Seville master plat (R-005)",
    raw: sevilleMasterPlat,
    sourcePath: "data/raw/R-005/hunt-log.md",
  },
};

export function ReceiptsPage() {
  const { slug } = useParams();
  const receipt = slug ? RECEIPTS[slug] : undefined;

  if (!receipt) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">No such receipt.</p>
        <p className="text-slate-500 mt-2">
          Valid receipt slugs:{" "}
          {Object.keys(RECEIPTS).map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              <Link to={`/receipts/${s}`} className="underline">
                {s}
              </Link>
            </span>
          ))}
          .
        </p>
        <Link to="/" className="text-recorder-700 underline mt-4 inline-block">
          ← Back to landing
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        to="/"
        className="text-xs text-recorder-700 underline underline-offset-2"
      >
        ← Back to landing
      </Link>
      <h1 className="text-lg font-semibold text-slate-900 mt-3">
        {receipt.title}
      </h1>
      <p className="text-[11px] text-slate-500 mt-1">
        Source file:{" "}
        <code className="font-mono text-slate-700">{receipt.sourcePath}</code>
        {" "}— rendered verbatim, no edits.
      </p>
      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed mt-4 bg-slate-50 border border-slate-200 rounded p-4 text-slate-800">
        {receipt.raw}
      </pre>
    </div>
  );
}
