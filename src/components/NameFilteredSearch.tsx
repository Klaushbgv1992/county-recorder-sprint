import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  searchByName,
  type SearchResultGroup,
  type StaffIndexRow,
} from "../logic/staff-search";
import { StaffPageFrame } from "./StaffPageFrame";

function RowTable({ rows }: { rows: StaffIndexRow[] }) {
  return (
    <table className="w-full text-xs mt-2">
      <thead>
        <tr className="text-left text-gray-500 border-b border-gray-200">
          <th className="py-1 pr-3 font-medium">Instrument</th>
          <th className="py-1 pr-3 font-medium">Recorded</th>
          <th className="py-1 pr-3 font-medium">Type</th>
          <th className="py-1 font-medium">Names</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.instrument_number}
            className="border-b border-gray-100 last:border-b-0 align-top"
          >
            <td className="py-1 pr-3 font-mono text-blue-700">
              {r.instrument_number}
            </td>
            <td className="py-1 pr-3 text-gray-600 whitespace-nowrap">
              {r.recording_date}
            </td>
            <td className="py-1 pr-3 text-gray-700">{r.document_type}</td>
            <td className="py-1 text-gray-700">{r.names.join("; ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AttributedGroup({ group }: { group: SearchResultGroup }) {
  return (
    <section className="border border-gray-200 rounded-lg bg-white p-4 mb-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Attributed to Parcel {group.attributed_parcel_apn}
        </h3>
        <Link
          to={`/staff/parcel/${group.attributed_parcel_apn}`}
          className="text-xs text-blue-700 hover:underline"
        >
          Open parcel view &rarr;
        </Link>
      </div>
      <RowTable rows={group.results} />
    </section>
  );
}

function SuppressedGroup({ group }: { group: SearchResultGroup }) {
  return (
    <section className="border border-amber-300 rounded-lg bg-amber-50 p-4 mb-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-amber-900">
          Same-name candidates (suppressed from public view) &mdash; original
          parcel context {group.attributed_parcel_apn}
        </h3>
        <Link
          to={`/staff/parcel/${group.attributed_parcel_apn}`}
          className="text-xs text-amber-900 hover:underline"
        >
          Open parcel view &rarr;
        </Link>
      </div>
      <p className="text-xs text-amber-800 mt-1">
        Phase 3 curation scrubs these from the public chain-of-title but they
        remain visible in the staff workbench for investigation.
      </p>
      <RowTable rows={group.results} />
    </section>
  );
}

export function NameFilteredSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(h);
  }, [q]);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debounced && debounced !== current) {
      setSearchParams({ q: debounced }, { replace: true });
    } else if (!debounced && current) {
      setSearchParams({}, { replace: true });
    }
  }, [debounced, searchParams, setSearchParams]);

  const groups = useMemo(() => searchByName(debounced), [debounced]);
  const attributed = groups.filter((g) => g.kind === "attributed");
  const suppressed = groups.filter((g) => g.kind === "same_name_candidate");

  return (
    <StaffPageFrame
      title="Name-filtered search"
      subtitle="Staff-only view including same-name candidates suppressed from the public chain-of-title."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setDebounced(q);
        }}
        className="mb-5"
      >
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Name contains
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. POPHAM or HOGUE"
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-moat-500"
          autoFocus
        />
      </form>

      {debounced.length < 2 ? (
        <p className="text-sm text-gray-500">
          Type at least two characters to search the staff name index.
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500">
          No matches for &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <div>
          {attributed.map((g) => (
            <AttributedGroup
              key={`att-${g.attributed_parcel_apn}`}
              group={g}
            />
          ))}
          {suppressed.map((g) => (
            <SuppressedGroup
              key={`sup-${g.attributed_parcel_apn}`}
              group={g}
            />
          ))}
        </div>
      )}
    </StaffPageFrame>
  );
}
