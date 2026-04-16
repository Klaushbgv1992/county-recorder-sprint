import { useMemo, useState } from "react";
import type { Parcel } from "../types";
import { searchParcels, type SearchResult } from "../logic/search";

interface Props {
  parcels: Parcel[];
  onSelectParcel: (apn: string, instrumentNumber?: string) => void;
}

export function SearchEntry({ parcels, onSelectParcel }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchParcels(query, parcels),
    [query, parcels],
  );

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  const count = results.length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        Official Records Search
      </h2>
      <p className="text-sm text-gray-700 mb-1">
        The authoritative parcel-keyed index for Maricopa County &mdash;
        provenance-tagged to source, verified through April&nbsp;9,&nbsp;2026.
      </p>
      <p className="text-xs text-gray-500 mb-6">
        Search by address, APN, owner name, or instrument number.
      </p>

      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 3674 E Palmer St, 304-78-386, POPHAM, or 20210057846"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent"
        />
      </div>

      {count > 0 && hasQuery && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">
              {count} {count === 1 ? "result" : "results"} matched
            </span>
          </div>
          <ul className="divide-y divide-gray-200">
            {results.map((r) => (
              <ResultCard
                key={
                  r.matchType === "instrument" && r.instrumentNumber
                    ? `${r.parcel.apn}-${r.instrumentNumber}`
                    : r.parcel.apn
                }
                result={r}
                onSelect={onSelectParcel}
              />
            ))}
          </ul>
        </div>
      )}

      {count === 0 && hasQuery && (
        <div className="text-center text-gray-500 py-12">
          No results matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: (apn: string, instrumentNumber?: string) => void;
}) {
  const { parcel, matchType, instrumentNumber } = result;

  if (matchType === "instrument" && instrumentNumber) {
    return (
      <li>
        <button
          onClick={() => onSelect(parcel.apn, instrumentNumber)}
          className="w-full text-left px-4 py-4 hover:bg-recorder-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-recorder-900">
                Instrument <span className="font-mono">{instrumentNumber}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                on {parcel.address}, {parcel.city}, {parcel.state} {parcel.zip}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                APN: <span className="font-mono">{parcel.apn}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{parcel.current_owner}</div>
              <div className="text-xs text-recorder-500 mt-1">
                Open document &rarr;
              </div>
            </div>
          </div>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => onSelect(parcel.apn)}
        className="w-full text-left px-4 py-4 hover:bg-recorder-50 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none transition-colors duration-150"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-recorder-900">{parcel.address}</div>
            <div className="text-sm text-gray-600 mt-1">
              {parcel.city}, {parcel.state} {parcel.zip}
            </div>
            <div className="text-sm text-gray-500 mt-1">APN: <span className="font-mono">{parcel.apn}</span></div>
            <div className="text-xs text-gray-400 mt-1">
              {parcel.subdivision}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">{parcel.current_owner}</div>
            <div className="text-xs text-recorder-700 mt-1">
              View chain of title &rarr;
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}
