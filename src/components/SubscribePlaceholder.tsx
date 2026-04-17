import { Link, useSearchParams } from "react-router";

export function SubscribePlaceholder() {
  const [params] = useSearchParams();
  const apn = params.get("apn");
  return (
    <main className="max-w-xl mx-auto px-6 py-12 text-slate-800">
      <h1 className="text-2xl font-semibold text-recorder-900">
        Subscribe to new filings{apn ? ` for parcel ${apn}` : ""}
      </h1>
      <p className="mt-3 text-sm leading-relaxed">
        This feature is coming. When a new document is recorded against
        {apn ? ` ${apn}` : " a parcel you're watching"}, the county portal
        will email or text you the same day — no third-party plant, no lag.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Title-plant vendors batch their updates every 4–7 days. The county
        can offer this because the county owns the recording pipeline.
      </p>
      {apn && (
        <p className="mt-6 text-sm">
          <Link to={`/parcel/${apn}/story`} className="text-moat-700 hover:underline">
            ← Back to this parcel's story
          </Link>
        </p>
      )}
    </main>
  );
}
