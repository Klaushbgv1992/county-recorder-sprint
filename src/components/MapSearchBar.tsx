import { useMemo, useState, useRef } from "react";
import {
  searchAll,
  type Searchable,
  type SearchHit,
} from "../logic/searchable-index";
import { assembleAddress } from "../logic/assessor-parcel";

interface Props {
  value: string;
  onChange: (v: string) => void;
  searchables: Searchable[];
  onSelect: (s: Searchable) => void;
}

const TIER_CHIP: Record<Searchable["tier"], { label: string; className: string }> = {
  curated: { label: "Curated · full chain", className: "bg-emerald-100 text-emerald-900" },
  recorder_cached: { label: "Recorder · cached", className: "bg-moat-100 text-moat-900" },
  assessor_only: { label: "Assessor · public GIS", className: "bg-slate-100 text-slate-700" },
};

const MATCH_LABEL: Record<SearchHit["matchType"], string> = {
  instrument: "Instrument match",
  apn: "APN match",
  address: "Address match",
  owner: "Owner match",
  subdivision: "Subdivision match",
};

function hitAddress(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.address;
  return assembleAddress(s.polygon);
}
function hitOwner(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.current_owner;
  return s.polygon.OWNER_NAME ?? "";
}
function hitSubdivision(s: Searchable): string {
  if (s.tier === "curated") return s.parcel.subdivision;
  return s.polygon.SUBNAME ?? "";
}

export function MapSearchBar({ value, onChange, searchables, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hits = useMemo(
    () => (value ? searchAll(value, searchables, { limit: 8 }) : []),
    [value, searchables],
  );

  const total = useMemo(
    () => (value ? searchAll(value, searchables).length : 0),
    [value, searchables],
  );

  const showDropdown = open && value.length > 0 && hits.length > 0;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[min(92vw,640px)]">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="map-search-results"
        aria-autocomplete="list"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value) setOpen(true);
          setActiveIdx(0);
        }}
        placeholder="Search APN, address, owner, subdivision, or 11-digit instrument"
        className="w-full rounded-lg border border-slate-300 bg-white/95 px-4 py-3 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent backdrop-blur-sm"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const h = hits[activeIdx];
            if (h) onSelect(h.searchable);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showDropdown && (
        <ul
          id="map-search-results"
          role="listbox"
          className="mt-1 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl"
        >
          {hits.map((h, i) => {
            const chip = TIER_CHIP[h.searchable.tier];
            const active = i === activeIdx;
            return (
              <li
                key={h.searchable.apn}
                role="option"
                aria-selected={active}
                className={`flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onSelect(h.searchable)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-recorder-900 truncate">
                    {hitAddress(h.searchable) || h.searchable.apn}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {hitOwner(h.searchable) || "—"}{" · "}
                    <span className="font-mono">{h.searchable.apn}</span>
                    {hitSubdivision(h.searchable) ? ` · ${hitSubdivision(h.searchable)}` : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{MATCH_LABEL[h.matchType]}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}>
                  {chip.label}
                </span>
              </li>
            );
          })}
          {total > hits.length && (
            <li className="px-4 py-2 text-xs text-slate-500">
              +{total - hits.length} more — narrow your search
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
