import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { Instrument } from "../types";
import type { Searchable } from "../logic/searchable-index";
import { searchAll, addressOf, ownerOf, subdivisionOf } from "../logic/searchable-index";
import { searchParties, type PartyHit } from "../logic/party-search";

export interface HomeownerHeroProps {
  searchables: Searchable[];
  instruments: Instrument[];
  instrumentToApn: Map<string, string>;
  onResolve: (apn: string) => void;
  onSelectParty: (normalizedName: string) => void;
}

const PARCEL_LIMIT = 6;
const PARTY_LIMIT = 5;

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
      <mark key={`m${keyN++}`} className="bg-moat-100 text-moat-900 rounded-sm px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
    idx = lowerText.indexOf(lowerQ, cursor);
  }
  if (cursor < text.length) parts.push(<Fragment key={`t${keyN++}`}>{text.slice(cursor)}</Fragment>);
  return <>{parts}</>;
}

export function HomeownerHero({
  searchables,
  instruments,
  instrumentToApn,
  onResolve,
  onSelectParty,
}: HomeownerHeroProps) {
  const [query, setQuery] = useState("");
  const [noMatch, setNoMatch] = useState(false);
  const [open, setOpen] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const hits = useMemo(
    () => (query ? searchAll(query, searchables, { limit: PARCEL_LIMIT }) : []),
    [query, searchables],
  );
  const total = useMemo(
    () => (query ? searchAll(query, searchables).length : 0),
    [query, searchables],
  );
  const partyHits = useMemo<PartyHit[]>(
    () =>
      query
        ? searchParties(query, instruments, instrumentToApn).slice(0, PARTY_LIMIT)
        : [],
    [query, instruments, instrumentToApn],
  );
  const partyTotal = useMemo(
    () => (query ? searchParties(query, instruments, instrumentToApn).length : 0),
    [query, instruments, instrumentToApn],
  );

  function resolveParcel(apn: string) {
    setOpen(false);
    setNoMatch(false);
    onResolve(apn);
  }

  function pickParty(normalizedName: string) {
    setOpen(false);
    setNoMatch(false);
    onSelectParty(normalizedName);
  }

  function submit() {
    const curated = hits.find((h) => h.searchable.tier === "curated");
    const chosen = curated ?? hits[0];
    if (chosen) {
      resolveParcel(chosen.searchable.apn);
      return;
    }
    const firstParty = partyHits[0];
    if (firstParty) {
      pickParty(firstParty.normalizedName);
      return;
    }
    setNoMatch(true);
  }

  const showDropdown =
    open && query.length > 0 && (hits.length > 0 || partyHits.length > 0);

  return (
    <section className="relative bg-white border-b border-slate-200 px-6 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          viewBox="0 0 400 240"
          className="absolute -right-8 -top-6 w-[420px] max-w-[55%] text-moat-200/60 hidden md:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M60 130 L60 210 L180 210 L180 130" />
          <path d="M40 140 L120 70 L200 140" />
          <rect x="100" y="160" width="40" height="50" />
          <path d="M235 80 L360 80 L360 200 L235 200 Z" />
          <path d="M250 105 L345 105 M250 125 L345 125 M250 145 L310 145" />
          <circle cx="340" cy="175" r="10" />
          <path d="M340 170 v10 M335 175 h10" />
        </svg>
      </div>
      <div className="relative max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-moat-700">
          Homeowner view
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold text-recorder-900 tracking-tight">
          What does the county know about your home?
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Every ownership transfer, mortgage, release, and lien is recorded here. Search by address, owner name, lender, or subdivision and we&rsquo;ll show you the four things that matter &mdash; in plain English.
        </p>
        <form
          className="mt-5 flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="relative flex-1">
            <input
              type="search"
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls="homeowner-hero-results"
              aria-autocomplete="list"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (noMatch) setNoMatch(false);
                if (e.target.value) setOpen(true);
                setActiveIdx(0);
              }}
              onFocus={() => {
                if (query) setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && showDropdown) {
                  const h = hits[activeIdx];
                  if (h) {
                    e.preventDefault();
                    resolveParcel(h.searchable.apn);
                  }
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Enter address, owner, lender, or subdivision"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-moat-500 focus:border-transparent hover:shadow-md transition-shadow"
            />
            {showDropdown && (
              <div
                id="homeowner-hero-results"
                className="absolute left-0 right-0 mt-1 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl z-30"
              >
                {hits.length > 0 && (
                  <ul role="listbox" aria-label="Matching properties">
                    {hits.map((h, i) => {
                      const s = h.searchable;
                      const active = i === activeIdx;
                      const curated = s.tier === "curated";
                      const address = addressOf(s) || "—";
                      const owner = ownerOf(s);
                      const sub = subdivisionOf(s);
                      return (
                        <li
                          key={`${query}:${s.apn}:${i}`}
                          role="option"
                          aria-selected={active}
                          className={`relative flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 ${active ? "bg-moat-50" : "hover:bg-slate-50"}`}
                          onMouseEnter={() => setActiveIdx(i)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            resolveParcel(s.apn);
                          }}
                        >
                          {curated && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-2 bottom-2 w-1 rounded-r-sm bg-moat-500"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-recorder-900 truncate">
                              {highlight(address, query)}
                            </div>
                            <div className="text-xs text-slate-600 truncate">
                              {owner ? highlight(owner, query) : "Owner not on file"}
                              {sub ? <> &middot; {highlight(sub, query)}</> : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {total > hits.length && (
                      <li className="px-4 py-2 text-xs text-slate-500">
                        +{total - hits.length} more &mdash; narrow your search
                      </li>
                    )}
                  </ul>
                )}
                {partyHits.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Names on records &middot; {partyTotal} match{partyTotal === 1 ? "" : "es"}
                    </div>
                    <ul role="listbox" aria-label="Matching names" className="bg-white">
                      {partyHits.map((p, i) => {
                        const rowKey = `${query}:party:${p.normalizedName}:${i}`;
                        return (
                          <li
                            key={rowKey}
                            role="option"
                            aria-selected={false}
                            className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm cursor-pointer last:border-b-0 hover:bg-slate-50"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pickParty(p.normalizedName);
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-recorder-900 truncate">
                                {highlight(p.displayName, query)}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                On {p.totalInstruments} record{p.totalInstruments === 1 ? "" : "s"} across {p.parcels} propert{p.parcels === 1 ? "y" : "ies"}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                      {partyTotal > partyHits.length && (
                        <li className="px-4 py-2 text-xs text-slate-500">
                          +{partyTotal - partyHits.length} more &mdash; narrow your search
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="rounded-lg bg-moat-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-moat-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:ring-offset-2 transition-colors"
          >
            See what the county knows
          </button>
        </form>
        {noMatch && (
          <p role="status" className="mt-3 text-sm text-amber-700">
            No match in the Gilbert sample. Try a street address like &ldquo;3674 E Palmer St&rdquo; or a lender like &ldquo;Wells Fargo&rdquo;.
          </p>
        )}
      </div>
    </section>
  );
}
