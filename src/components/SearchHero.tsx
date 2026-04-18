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
  decedent: "decedent",
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
        className="bg-moat-100 text-moat-900 rounded-sm px-0.5"
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
    <section
      aria-label="Parcel search"
      className="relative bg-gradient-to-br from-white via-white to-slate-50 border-b border-slate-200 px-6 py-10 overflow-hidden"
    >
      {/* Soft moat glow — pure decoration, placed behind content so it
          doesn't block hits. Tailored to not tint type contrast. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[320px] rounded-full bg-moat-200/30 blur-3xl -z-0"
      />
      <div className="relative max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-moat-700">
          Maricopa County Recorder
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold text-recorder-900 tracking-tight">
          Search the source of record
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Chain of title, encumbrance lifecycle, and release matching — served
          directly from the custodian of the record, not a title-plant mirror.
        </p>
      </div>
      <div className="relative max-w-3xl mx-auto mt-6">
        {/* Leading search glyph, positioned inside the input by padding. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" />
        </svg>
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
          placeholder="APN, address, owner, party, subdivision, or 11-digit instrument"
          className="w-full rounded-xl border border-slate-300 bg-white pl-11 pr-20 py-3.5 text-base shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-moat-500 focus:border-transparent transition-shadow hover:shadow-md"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); const h = hits[activeIdx]; if (h) onPick(h, value); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {/* Keyboard hint — hidden once the user has begun typing so it
            doesn't compete with the clear-icon affordance. */}
        {!value && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 shadow-sm"
          >
            <span className="text-slate-400">⌘</span>K
          </kbd>
        )}
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
                  const curated = s.tier === "curated";
                  return (
                    <li
                      key={rowKey}
                      role="option"
                      aria-selected={active}
                      className={`animate-fade-in-up relative flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-recorder-50" : "hover:bg-slate-50"} ${isSelected ? "animate-bounce-soft" : ""}`}
                      style={{ animationDelay: `${i * 20}ms` }}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => { setSelectedKey(rowKey); onPick(h, value); }}
                    >
                      {/* Curated tier gets a left-border accent instead of a
                          chip, so the single category that matters is felt
                          pre-attentively without adding chip noise. */}
                      {curated && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-sm bg-moat-500"
                        />
                      )}
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
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${entity.className}`}>
                          {entity.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tier.className}`}>
                          <span
                            aria-hidden="true"
                            className={`inline-block w-1.5 h-1.5 rounded-full ${curated ? "bg-moat-500" : "bg-slate-400"}`}
                          />
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
