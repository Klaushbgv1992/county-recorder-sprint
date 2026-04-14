import { Link } from "react-router";

const ROW_LABELS = [
  { id: "row-1", label: "Current owner of record" },
  { id: "row-2", label: "Open encumbrances (DOTs / liens)" },
  { id: "row-3", label: "Lien search by recording code" },
  { id: "row-4", label: "Document image source" },
  { id: "row-5", label: "Index freshness" },
] as const;

export function MoatCompareRoute() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Moat comparison: aggregator vs. county-owned portal
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Showing parcel 304-78-386 — POPHAM CHRISTOPHER / ASHLEY,
          3674 E Palmer Street, Gilbert. Prototype corpus contains
          two parcels; the second (HOGUE 304-77-689) is reachable
          via <Link to="/" className="text-blue-700 hover:underline">Search</Link>.
        </p>
      </header>

      <div className="hidden lg:grid grid-cols-[1fr_12rem_1fr] gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            Aggregator-style property report
          </h2>
        </div>
        <div className="bg-white border-b border-gray-200" />
        <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-blue-900">
            County-owned prototype
          </h2>
        </div>

        {ROW_LABELS.map((row) => (
          <div key={row.id} className="contents" data-row-id={row.id}>
            <div className="bg-gray-50 px-4 py-4 border-t border-gray-200" />
            <div className="bg-white px-3 py-4 border-t border-gray-200 text-center text-xs font-medium text-gray-700">
              {row.label}
            </div>
            <div className="bg-blue-50 px-4 py-4 border-t border-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
