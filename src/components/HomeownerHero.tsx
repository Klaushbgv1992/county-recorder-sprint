import { useState } from "react";
import type { Searchable } from "../logic/searchable-index";
import { searchAll } from "../logic/searchable-index";

export interface HomeownerHeroProps {
  searchables: Searchable[];
  onResolve: (apn: string) => void;
}

export function HomeownerHero({ searchables, onResolve }: HomeownerHeroProps) {
  const [query, setQuery] = useState("");
  const [noMatch, setNoMatch] = useState(false);

  function submit() {
    const hits = searchAll(query, searchables);
    // Prefer curated tier; otherwise accept any tier (the homeowner card page
    // handles non-curated parcels with a graceful "partial chain" message).
    const curated = hits.find((h) => h.searchable.tier === "curated");
    const chosen = curated ?? hits[0];
    if (!chosen) {
      setNoMatch(true);
      return;
    }
    setNoMatch(false);
    onResolve(chosen.searchable.apn);
  }

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          What does the county know about your home?
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Every ownership transfer, mortgage, release, and lien is recorded here. Type your property address and we'll show you the four things that matter — in plain English.
        </p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (noMatch) setNoMatch(false);
            }}
            placeholder="Enter your property address"
            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            See what the county knows
          </button>
        </form>
        {noMatch && (
          <p role="status" className="mt-3 text-sm text-amber-700">
            No match in the Gilbert sample. Try a street address like "3674 E Palmer St" or "2715 E Palmer St".
          </p>
        )}
      </div>
    </section>
  );
}
