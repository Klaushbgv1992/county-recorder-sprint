import { Link } from "react-router";
import { CURATED_PARTY_SUGGESTIONS } from "../data/curated-party-suggestions";

/**
 * Landing-page hero card that promotes cross-parcel grantor / grantee /
 * lender / releasing-party search to a one-click action. Each chip is a
 * deep link to `/party/:normalizedName` — see
 * `data/curated-party-suggestions.ts` for the (corpus-validated) list.
 *
 * The card is intentionally separate from <SearchHero/>. SearchHero owns
 * the free-text input + dropdown; this card surfaces party search as a
 * named feature so a reviewer who never types in the box still tries it.
 */
export function PartySearchHeroCard() {
  return (
    <section
      aria-label="Cross-parcel party search"
      data-testid="party-search-hero-card"
      className="border-b border-slate-200 bg-white px-6 py-6"
    >
      <div className="max-w-6xl mx-auto rounded-lg border border-moat-200 bg-gradient-to-br from-moat-50 to-white p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <div className="lg:flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-moat-700">
              Custodian-only · Cross-parcel party index
            </p>
            <h2 className="mt-1 text-lg md:text-xl font-semibold text-recorder-900 tracking-tight">
              Search any party across every parcel
            </h2>
            <p className="mt-2 text-sm text-slate-700 max-w-2xl">
              Find every loan a lender originated, every release a servicer
              executed, every deed a trust ever signed — across the entire
              curated corpus, with grantor / grantee / lender / releasing-party
              roles attached.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CURATED_PARTY_SUGGESTIONS.map((s) => (
                <Link
                  key={s.normalizedName}
                  to={`/party/${s.normalizedName}`}
                  className="group inline-flex items-baseline gap-2 rounded-full border border-moat-300 bg-white px-3 py-1.5 text-sm font-medium text-recorder-900 shadow-sm hover:bg-moat-50 hover:border-moat-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
                >
                  <span>{s.display}</span>
                  <span className="text-[11px] font-normal text-slate-500 group-hover:text-moat-700">
                    {s.blurb}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <aside
            aria-label="Why this is a custodian-only feature"
            className="lg:w-80 lg:shrink-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-snug text-slate-700"
          >
            <p className="font-semibold text-slate-800">
              Why this is impossible without us
            </p>
            <p className="mt-1">
              The Maricopa public API
              {" "}
              <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">
                publicapi.recorder.maricopa.gov
              </code>
              {" "}
              has no name-filtered search endpoint. We tried — see the
              {" "}
              <a
                href="https://github.com/Klaushbgv1992/county-recorder-sprint/blob/main/docs/hunt-log-known-gap-2.md"
                className="text-moat-700 underline hover:text-moat-900"
                target="_blank"
                rel="noreferrer"
              >
                hunt log
              </a>
              {" "}(45-minute live attempt; five separate API layers blocked it).
              Title plants index by name but lag the record by days. Only the
              custodian can resolve a name to roles in real time.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
