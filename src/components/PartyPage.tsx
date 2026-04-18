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
  decedent: "decedent",
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
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <NotInCorpusParcel
          title="No matching party in this corpus"
          message={`No curated party matches "${normalizedName ?? ""}".`}
        />
        <PartyMoatExplainer />
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

      <PartyMoatExplainer />

      <section className="space-y-6">
        {parcelEntries.map(([apn, refs]) => {
          const owner = apnToOwner.get(apn) ?? "—";
          const address = apnToAddress.get(apn) ?? apn;
          const sorted = [...refs].sort((a, b) =>
            a.recordingDate < b.recordingDate ? 1 : a.recordingDate > b.recordingDate ? -1 : 0,
          );
          // "Why am I seeing this" summary — distinct roles the party
          // plays on THIS parcel, with the verbatim variant that matched.
          const distinctRoles = Array.from(new Set(refs.map((r) => r.role)));
          const verbatimVariants = Array.from(
            new Set(refs.map((r) => r.matchedNameVerbatim)),
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
              <div
                className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-600"
                data-testid="party-match-hint"
              >
                <span className="font-semibold text-slate-700">
                  Matched on
                </span>
                :{" "}
                {verbatimVariants.map((v, i) => (
                  <span key={v} className="font-mono">
                    {i > 0 ? ", " : ""}&ldquo;{v}&rdquo;
                  </span>
                ))}
                {" "}as{" "}
                {distinctRoles
                  .map((r) => ROLE_LABEL[r] ?? r)
                  .join(" / ")}
                . {refs.length} instrument{refs.length === 1 ? "" : "s"} on
                this parcel. Role attribution is hand-curated — the public
                API returns flat names without roles (Decision&nbsp;#19).
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
                        <span
                          className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono ${
                            ref.roleProvenance === "ocr"
                              ? "bg-indigo-50 text-indigo-800"
                              : ref.roleProvenance === "manual_entry"
                                ? "bg-amber-50 text-amber-800"
                                : ref.roleProvenance === "demo_synthetic"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                          title={`Role assignment provenance: ${ref.roleProvenance} (confidence ${Math.round(ref.roleConfidence * 100)}%)`}
                        >
                          {ref.roleProvenance}
                          {" · "}
                          {Math.round(ref.roleConfidence * 100)}%
                        </span>
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

/**
 * Plain-English moat paragraph — rendered both on the populated party page
 * (under the header) and on the empty-state page (under "No matching
 * party"). Kept tight (~80 words) and citation-anchored to the hunt log.
 */
function PartyMoatExplainer() {
  return (
    <aside
      aria-label="Why cross-parcel party search needs the custodian"
      data-testid="party-moat-explainer"
      className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-snug text-slate-700"
    >
      <p className="font-semibold text-slate-800">
        Why this view needs the custodian
      </p>
      <p className="mt-1">
        The Maricopa public API
        {" "}
        <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">
          publicapi.recorder.maricopa.gov
        </code>
        {" "}
        has no name-filtered or role-filtered search endpoint. We logged a
        45-minute live attempt against it — see the
        {" "}
        <a
          href="https://github.com/Klaushbgv1992/county-recorder-sprint/blob/main/docs/hunt-log-known-gap-2.md"
          className="text-moat-700 underline hover:text-moat-900"
          target="_blank"
          rel="noreferrer"
        >
          hunt log
        </a>
        {" "}
        — and five separate API layers blocked it. Title plants index by
        name but lag the record by days. Resolving a party to its roles
        (grantor, lender, releasing party) across every parcel only happens
        inside the custodian.
      </p>
    </aside>
  );
}
