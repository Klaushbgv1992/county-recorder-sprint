import { useMemo } from "react";
import { Link, useParams } from "react-router";
import type { PartyRole } from "../types";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import {
  buildInstrumentToApnMap,
  findPartyByNormalizedName,
  type PartyInstrumentRef,
} from "../logic/party-search";
import { NotInCorpusParcel } from "./EmptyStates";

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

export function PartyPage() {
  const { normalizedName } = useParams();
  const instruments = useMemo(() => loadAllInstruments(), []);
  const parcels = useMemo(() => loadAllParcels(), []);
  const instrumentToApn = useMemo(() => buildInstrumentToApnMap(parcels), [parcels]);
  const apnToOwner = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of parcels) m.set(p.apn, p.current_owner);
    return m;
  }, [parcels]);
  const apnToAddress = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of parcels) m.set(p.apn, p.address);
    return m;
  }, [parcels]);

  const hit = useMemo(
    () =>
      normalizedName
        ? findPartyByNormalizedName(normalizedName, instruments, instrumentToApn)
        : null,
    [normalizedName, instruments, instrumentToApn],
  );

  if (!hit) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <NotInCorpusParcel
          title="No matching party in this corpus"
          message={`No curated party matches "${normalizedName ?? ""}".`}
        />
      </div>
    );
  }

  // Group instruments by parcel.
  const byParcel = new Map<string, PartyInstrumentRef[]>();
  for (const ref of hit.instruments) {
    const list = byParcel.get(ref.apn) ?? [];
    list.push(ref);
    byParcel.set(ref.apn, list);
  }
  const parcelEntries = Array.from(byParcel.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <nav className="text-xs text-slate-500">
        <Link to="/" className="hover:underline">← Back to search</Link>
      </nav>
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-moat-700">
          Party
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-recorder-900">
          {hit.displayName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span>
            {hit.totalInstruments} instrument{hit.totalInstruments === 1 ? "" : "s"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {hit.parcels} parcel{hit.parcels === 1 ? "" : "s"}
          </span>
          {Object.entries(hit.byRole).map(([role, count]) => (
            <span
              key={role}
              className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700"
            >
              {count}× {ROLE_LABEL[role as PartyRole] ?? role}
            </span>
          ))}
        </div>
        <p className="mt-3 max-w-2xl text-xs text-slate-500">
          Cross-parcel party-name index built from curated role assignments. The
          Maricopa public API returns flat names without roles — this view exists
          because a custodian curated the grantor / grantee / lender / releasing
          party assignments.
        </p>
      </header>

      <section className="space-y-6">
        {parcelEntries.map(([apn, refs]) => {
          const owner = apnToOwner.get(apn) ?? "—";
          const address = apnToAddress.get(apn) ?? apn;
          const sorted = [...refs].sort((a, b) =>
            a.recordingDate < b.recordingDate ? 1 : a.recordingDate > b.recordingDate ? -1 : 0,
          );
          return (
            <div key={apn} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <Link
                    to={`/parcel/${apn}`}
                    className="font-semibold text-recorder-900 hover:underline"
                  >
                    {address}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-slate-500">
                    APN {apn}
                  </span>
                </div>
                <div className="text-xs text-slate-600">{owner}</div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Recorded</th>
                    <th className="px-4 py-2 font-medium">Instrument</th>
                    <th className="px-4 py-2 font-medium">Document type</th>
                    <th className="px-4 py-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((ref) => (
                    <tr
                      key={ref.instrumentNumber}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 text-slate-700">{ref.recordingDate}</td>
                      <td className="px-4 py-2">
                        <Link
                          to={`/parcel/${apn}/instrument/${ref.instrumentNumber}`}
                          className="font-mono text-blue-700 hover:underline"
                        >
                          {ref.instrumentNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {ref.documentType.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {ROLE_LABEL[ref.role] ?? ref.role}
                        {ref.nomineeFor && (
                          <span className="ml-1 text-xs text-slate-500">
                            (as nominee for {ref.nomineeFor.partyName})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>
    </div>
  );
}
