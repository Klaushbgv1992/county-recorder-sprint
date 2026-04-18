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
    <section className="relative overflow-hidden bg-white border-b border-slate-200 px-6 py-12">
      {/* Decorative backdrop — a faint line-drawn house + deed motif that
          distinguishes homeowner mode from the examiner search hero. The
          SVG is absolutely positioned and aria-hidden so it never blocks
          form interaction or screen readers. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 240"
        className="pointer-events-none absolute -right-8 -top-6 w-[420px] max-w-[55%] text-moat-200/60 hidden md:block"
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
      <div className="relative max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-moat-700">
          Homeowner view
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold text-recorder-900 tracking-tight">
          What does the county know about your home?
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Every ownership transfer, mortgage, release, and lien is recorded here. Type your property address and we&rsquo;ll show you the four things that matter &mdash; in plain English.
        </p>
        <form
          className="mt-5 flex flex-col sm:flex-row gap-2"
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
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-moat-500 focus:border-transparent hover:shadow-md transition-shadow"
          />
          <button
            type="submit"
            className="rounded-lg bg-moat-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-moat-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:ring-offset-2 transition-colors"
          >
            See what the county knows
          </button>
        </form>
        {noMatch && (
          <p role="status" className="mt-3 text-sm text-amber-700">
            No match in the Gilbert sample. Try a street address like &ldquo;3674 E Palmer St&rdquo; or &ldquo;2715 E Palmer St&rdquo;.
          </p>
        )}
      </div>
    </section>
  );
}
