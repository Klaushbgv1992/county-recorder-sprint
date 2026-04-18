import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { Instrument, PartyRole } from "../types";
import {
  searchAll,
  addressOf,
  ownerOf,
  subdivisionOf,
  type Searchable,
  type SearchHit,
  type MatchType,
} from "../logic/searchable-index";
import { searchParties, type PartyHit } from "../logic/party-search";

// Palette note: entity chips and non-curated tier chips are uniformly
// neutral slate. Only the "Curated" tier keeps an accent (emerald) so it
// reads as the one category that matters at a glance — the other pills
// are structural labels, not priority signals. See Tier-B landing-polish.
const NEUTRAL_CHIP = "bg-slate-100 text-slate-700";

const TIER_CHIP: Record<Searchable["tier"], { label: string; className: string }> = {
  curated: { label: "Curated", className: "bg-emerald-100 text-emerald-900" },
  recorder_cached: { label: "Recorder", className: NEUTRAL_CHIP },
  assessor_only: { label: "Assessor", className: NEUTRAL_CHIP },
};

const ENTITY_CHIP: Record<MatchType, { label: string; className: string }> = {
  instrument: { label: "Instrument", className: NEUTRAL_CHIP },
  apn: { label: "APN", className: NEUTRAL_CHIP },
  address: { label: "Address", className: NEUTRAL_CHIP },
  owner: { label: "Owner", className: NEUTRAL_CHIP },
  subdivision: { label: "Subdivision", className: NEUTRAL_CHIP },
};

// Short labels for the role-breakdown chips on a party row.
const ROLE_LABEL: Record<PartyRole, string> = {
  grantor: "grantor",
  grantee: "grantee",
  trustor: "trustor",
  trustee: "trustee",
  beneficiary: "beneficiary",
  borrower: "borrower",
  lender: "lender",
  nominee: "nominee",
  releasing_party: "releasing party",
  servicer: "servicer",
  claimant: "claimant",
  debtor: "debtor",
};

const PARTY_LIMIT = 5;

// Case-insensitive substring highlight. Splits `text` around each occurrence
// of `query` and wraps matches in a <mark>. Empty queries pass through.
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q || !text) return text;
  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let idx = lowerText.indexOf(lowerQ, cursor);
  let keyN = 0;
  while (idx !== -1) {
    if (idx > cursor) parts.push(<Fragment key={`t${keyN++}`}>{text.slice(cursor, idx)}</Fragment>);
    parts.push(
      <mark
        key={`m${keyN++}`}
        className="bg-amber-100 text-amber-900 rounded-sm px-0.5"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
    idx = lowerText.indexOf(lowerQ, cursor);
  }
  if (cursor < text.length) parts.push(<Fragment key={`t${keyN++}`}>{text.slice(cursor)}</Fragment>);
  return <>{parts}</>;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  searchables: Searchable[];
  instruments: Instrument[];
  instrumentToApn: Map<string, string>;
  onSelectCurated: (apn: string, instrumentNumber?: string) => void;
  onSelectDrawer: (apn: string) => void;
  onSelectInstrument: (apn: string, instrumentNumber: string) => void;
  onSelectParty: (normalizedName: string) => void;
}

export function SearchHero({
  value,
  onChange,
  searchables,
  instruments,
  instrumentToApn,
  onSelectCurated,
  onSelectDrawer,
  onSelectInstrument,
  onSelectParty,
}: Props) {
  const [open, setOpen] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const hits = useMemo(
    () => (value ? searchAll(value, searchables, { limit: 8 }) : []),
    [value, searchables],
  );
  const total = useMemo(
    () => (value ? searchAll(value, searchables).length : 0),
    [value, searchables],
  );
  const partyHits = useMemo<PartyHit[]>(
    () =>
      value
        ? searchParties(value, instruments, instrumentToApn).slice(0, PARTY_LIMIT)
        : [],
    [value, instruments, instrumentToApn],
  );
  const partyTotal = useMemo(
    () => (value ? searchParties(value, instruments, instrumentToApn).length : 0),
    [value, instruments, instrumentToApn],
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

  const showDropdown =
    open && value.length > 0 && (hits.length > 0 || partyHits.length > 0);

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
          placeholder="Search APN, address, owner, party (grantor/lender/releasing party), subdivision, or 11-digit instrument"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); const h = hits[activeIdx]; if (h) onPick(h, value); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {showDropdown && (
          <div
            id="search-hero-results"
            className="absolute left-0 right-0 mt-1 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl z-30"
          >
            {hits.length > 0 && (
              <ul role="listbox" aria-label="Matching parcels">
                {hits.map((h, i) => {
                  const s = h.searchable;
                  const entity = ENTITY_CHIP[h.matchType];
                  const tier = TIER_CHIP[s.tier];
                  const active = i === activeIdx;
                  const rowKey = `${value}:hit:${s.apn}:${h.matchType}:${i}`;
                  const isSelected = selectedKey === rowKey;
                  return (
                    <li
                      key={rowKey}
                      role="option"
                      aria-selected={active}
                      className={`animate-fade-in-up flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"} ${isSelected ? "animate-bounce-soft" : ""}`}
                      style={{ animationDelay: `${i * 20}ms` }}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => { setSelectedKey(rowKey); onPick(h, value); }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-recorder-900 truncate">
                          {highlight(addressOf(s) || s.apn, value)}
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
            {partyHits.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50">
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Parties · {partyTotal} match{partyTotal === 1 ? "" : "es"}
                </div>
                <ul role="listbox" aria-label="Matching parties" className="bg-white">
                  {partyHits.map((p, i) => {
                    const partyKey = `${value}:party:${p.normalizedName}:${i}`;
                    const partySelected = selectedKey === partyKey;
                    return (
                    <li
                      key={partyKey}
                      role="option"
                      aria-selected={false}
                      className={`animate-fade-in-up flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 hover:bg-slate-50 ${partySelected ? "animate-bounce-soft" : ""}`}
                      style={{ animationDelay: `${i * 20}ms` }}
                      onClick={() => { setSelectedKey(partyKey); onSelectParty(p.normalizedName); }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-recorder-900 truncate">
                          {highlight(p.displayName, value)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(p.byRole).map(([role, count]) => (
                            <span
                              key={role}
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${NEUTRAL_CHIP}`}
                            >
                              {count}× {ROLE_LABEL[role as PartyRole] ?? role}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          → {p.totalInstruments} instrument{p.totalInstruments === 1 ? "" : "s"} across {p.parcels} parcel{p.parcels === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${NEUTRAL_CHIP}`}>
                          Party
                        </span>
                      </div>
                    </li>
                    );
                  })}
                  {partyTotal > partyHits.length && (
                    <li className="px-4 py-2 text-xs text-slate-500">
                      +{partyTotal - partyHits.length} more parties — narrow your search
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
