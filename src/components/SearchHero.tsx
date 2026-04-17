import { useMemo, useState } from "react";
import { searchAll, addressOf, ownerOf, subdivisionOf, type Searchable, type SearchHit, type MatchType } from "../logic/searchable-index";

const TIER_CHIP: Record<Searchable["tier"], { label: string; className: string }> = {
  curated: { label: "Curated", className: "bg-emerald-100 text-emerald-900" },
  recorder_cached: { label: "Recorder", className: "bg-moat-100 text-moat-900" },
  assessor_only: { label: "Assessor", className: "bg-slate-100 text-slate-700" },
};

const ENTITY_CHIP: Record<MatchType, { label: string; className: string }> = {
  instrument: { label: "Instrument", className: "bg-indigo-100 text-indigo-900" },
  apn: { label: "APN", className: "bg-blue-100 text-blue-900" },
  address: { label: "Address", className: "bg-teal-100 text-teal-900" },
  owner: { label: "Owner", className: "bg-purple-100 text-purple-900" },
  subdivision: { label: "Subdivision", className: "bg-amber-100 text-amber-900" },
};

interface Props {
  value: string;
  onChange: (v: string) => void;
  searchables: Searchable[];
  onSelectCurated: (apn: string, instrumentNumber?: string) => void;
  onSelectDrawer: (apn: string) => void;
  onSelectInstrument: (apn: string, instrumentNumber: string) => void;
}

export function SearchHero({ value, onChange, searchables, onSelectCurated, onSelectDrawer, onSelectInstrument }: Props) {
  const [open, setOpen] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const hits = useMemo(
    () => (value ? searchAll(value, searchables, { limit: 8 }) : []),
    [value, searchables],
  );
  const total = useMemo(
    () => (value ? searchAll(value, searchables).length : 0),
    [value, searchables],
  );

  const onPick = (hit: SearchHit, rawQuery: string) => {
    const s = hit.searchable;
    if (hit.matchType === "instrument") {
      onSelectInstrument(s.apn, rawQuery.trim());
      return;
    }
    if (s.tier === "curated") {
      onSelectCurated(s.apn);
      return;
    }
    onSelectDrawer(s.apn);
  };

  const showDropdown = open && value.length > 0 && hits.length > 0;

  return (
    <section aria-label="Parcel search" className="bg-white border-b border-slate-200 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-moat-700">
          Maricopa County Recorder
        </p>
        <h1 className="mt-1 text-2xl md:text-3xl font-semibold text-recorder-900 tracking-tight">
          Land Custodian Portal
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Structured title research for abstractors and examiners — chain of title,
          encumbrance lifecycle, and release matching, served directly from the
          custodian of the record.
        </p>
      </div>
      <div className="max-w-3xl mx-auto relative mt-6">
        <input
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-hero-results"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value) setOpen(true);
            setActiveIdx(0);
          }}
          placeholder="Search APN, address, owner, subdivision, or 11-digit instrument"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); const h = hits[activeIdx]; if (h) onPick(h, value); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {showDropdown && (
          <ul
            id="search-hero-results"
            role="listbox"
            className="absolute left-0 right-0 mt-1 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl z-30"
          >
            {hits.map((h, i) => {
              const s = h.searchable;
              const entity = ENTITY_CHIP[h.matchType];
              const tier = TIER_CHIP[s.tier];
              const active = i === activeIdx;
              return (
                <li
                  key={s.apn + ":" + h.matchType}
                  role="option"
                  aria-selected={active}
                  className={`flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => onPick(h, value)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-recorder-900 truncate">
                      {addressOf(s) || s.apn}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {ownerOf(s) || "—"}{" · "}
                      <span className="font-mono">{s.apn}</span>
                      {subdivisionOf(s) ? ` · ${subdivisionOf(s)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${entity.className}`}>
                      {entity.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.className}`}>
                      {tier.label}
                    </span>
                  </div>
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
    </section>
  );
}
