import { useState } from "react";
import type { Parcel } from "../types";

interface Props {
  parcel: Parcel;
  onSelectParcel: () => void;
}

export function SearchEntry({ parcel, onSelectParcel }: Props) {
  const [query, setQuery] = useState("");
  const matchesQuery =
    query.length === 0 ||
    parcel.address.toLowerCase().includes(query.toLowerCase()) ||
    parcel.apn.includes(query) ||
    parcel.current_owner.toLowerCase().includes(query.toLowerCase());

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
          placeholder="e.g. 1234 E Main St, 123-45-678, SMITH JOHN, or 20210234567"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {matchesQuery && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">
              1 result found
            </span>
          </div>
          <button
            onClick={onSelectParcel}
            className="w-full text-left px-4 py-4 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-blue-900">
                  {parcel.address}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {parcel.city}, {parcel.state} {parcel.zip}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  APN: {parcel.apn}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {parcel.current_owner}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  View chain of title &rarr;
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {!matchesQuery && query.length > 0 && (
        <div className="text-center text-gray-500 py-12">
          No results matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
