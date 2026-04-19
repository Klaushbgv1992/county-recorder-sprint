import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { SearchHero } from "./SearchHero";
import { useAllParcels } from "../hooks/useAllParcels";
import { useLandingUrlState } from "../hooks/useLandingUrlState";
import { buildSearchableIndex } from "../logic/searchable-index";
import { AssessorParcel } from "../logic/assessor-parcel";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import type { CacheEntry } from "../data/load-cached-neighbors";

interface ExampleChip {
  label: string;
  query: string;
  hint: string;
}

const EXAMPLES: ExampleChip[] = [
  {
    label: "WELLS FARGO",
    query: "WELLS FARGO",
    hint: "Party search — every instrument a lender released in the corpus",
  },
  {
    label: "20130183449",
    query: "20130183449",
    hint: "Paste an 11-digit instrument number from an underwriter email",
  },
  {
    label: "3674 E Palmer St",
    query: "3674 E Palmer St",
    hint: "Address or APN — lands on the parcel chain of title",
  },
];

export function SearchPage() {
  const navigate = useNavigate();
  const parcels = useAllParcels();
  const { query, setQuery } = useLandingUrlState();

  const [assessor, setAssessor] = useState<GeoJSON.FeatureCollection | null>(null);
  useEffect(() => {
    import("../data/gilbert-parcels-geo.json").then((m) =>
      setAssessor(m.default as GeoJSON.FeatureCollection),
    );
  }, []);

  const [cachedData, setCachedData] = useState<Map<string, CacheEntry> | null>(null);
  useEffect(() => {
    import("../data/load-cached-neighbors").then((m) => setCachedData(m.default));
  }, []);

  const searchables = useMemo(() => {
    if (!assessor) return [];
    const parsed = assessor.features
      .map((f) => {
        try {
          return AssessorParcel.parse(f.properties);
        } catch {
          return null;
        }
      })
      .filter((p): p is ReturnType<typeof AssessorParcel.parse> => p !== null);
    const cacheMap = new Map(
      [...(cachedData?.entries() ?? [])].map(([apn, v]) => [
        apn,
        { recent_instruments: v.recent_instruments },
      ]),
    );
    return buildSearchableIndex(parcels, cacheMap, parsed);
  }, [parcels, assessor, cachedData]);

  const allInstruments = useMemo(() => loadAllInstruments(), []);

  const instrumentToApn = useMemo(() => {
    const allParcels = loadAllParcels();
    const m = new Map<string, string>();
    for (const p of allParcels) {
      for (const num of p.instrument_numbers ?? []) {
        m.set(num, p.apn);
      }
    }
    return m;
  }, []);

  return (
    <main className="flex-1 flex flex-col bg-slate-50">
      <SearchHero
        value={query}
        onChange={setQuery}
        searchables={searchables}
        instruments={allInstruments}
        instrumentToApn={instrumentToApn}
        onSelectCurated={(apn) => navigate(`/parcel/${apn}`)}
        onSelectInstrument={(apn, n) => navigate(`/parcel/${apn}/instrument/${n}`)}
        onSelectDrawer={(apn) => navigate(`/parcel/${apn}`)}
        onSelectParty={(normalizedName) => navigate(`/party/${normalizedName}`)}
      />
      {!query && (
        <section
          aria-label="Try an example search"
          className="px-6 pt-8 pb-16"
        >
          <div className="max-w-2xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              How examiners actually begin
            </p>
            <p className="mt-2 text-sm text-slate-600">
              An examiner rarely arrives with a known APN. They have a party
              name from a payoff request, an 11-digit number from an underwriter
              email, or a street address from an order. Try one:
            </p>
            <ul className="mt-5 space-y-3">
              {EXAMPLES.map((ex) => (
                <li key={ex.query}>
                  <button
                    type="button"
                    onClick={() => setQuery(ex.query)}
                    className="group w-full text-left rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-moat-400 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-sm font-semibold text-recorder-900">
                        {ex.label}
                      </span>
                      <span className="text-xs text-moat-700 group-hover:text-moat-900">
                        Try it →
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-snug">
                      {ex.hint}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
