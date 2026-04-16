import { Link } from "react-router";
import type { Parcel } from "../types";

const RECOMMENDED_APN = "304-78-386";

interface Props {
  parcels: Parcel[];
}

export function FeaturedParcels({ parcels }: Props) {
  return (
    <section className="px-6 py-6 bg-white border-b border-slate-200">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-sm font-semibold text-recorder-900 mb-1">
          Featured demo parcels
        </h2>
        <p className="text-xs text-recorder-500 mb-4">
          These parcels demonstrate the chain-of-title, encumbrance lifecycle,
          and anomaly detection features. Click POPHAM to start the recommended
          demo path.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parcels.map((p) => {
            const isRecommended = p.apn === RECOMMENDED_APN;
            return (
              <li key={p.apn}>
                <Link
                  to={`/parcel/${p.apn}`}
                  aria-label={`Open chain of title for ${p.current_owner}, ${p.address}`}
                  className="group block rounded-lg border border-recorder-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-moat-200 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-recorder-900 group-hover:text-moat-700 truncate">
                        {p.current_owner}
                      </div>
                      <div className="text-xs text-recorder-500 truncate">
                        {p.address}, {p.city}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        APN <span className="font-mono">{p.apn}</span>
                      </div>
                    </div>
                    {isRecommended && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide bg-moat-50 text-moat-700 border border-moat-200 rounded-full px-2 py-0.5">
                        Recommended demo
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
