import { useMemo } from "react";
import { Link } from "react-router";
import { useAuth } from "../account/AuthContext";
import { useWatchlist } from "../account/useWatchlist";
import { useBringDownChecks } from "../account/useBringDownChecks";
import { computeBringDown } from "../logic/bring-down";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import { aggregateActivity, type ActivityRecord } from "../logic/activity-aggregator";
import activity from "../data/activity-synthetic.json";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Chip } from "./ui/Chip";
import { EmptyState } from "./ui/EmptyState";

const AS_OF = "2026-04-09";
const PLANT_LAG_DAYS = 14;
const DEMO_WATCH_SUGGESTIONS: { apn: string; label: string; hook: string }[] = [
  { apn: "304-77-566", label: "304-77-566 — Silva → Moore (Lot 224 Shamrock 2A)", hook: "Trustee succession recorded 9 days after both grantors died — title plants don't show this yet." },
  { apn: "304-78-386", label: "304-78-386 — POPHAM (Lot 46 Seville 3)", hook: "Federal tax lien recorded against this owner — see what your bring-down catches." },
  { apn: "304-77-689", label: "304-77-689 — HOGUE (Lot 348 Shamrock 2A)", hook: "Quiet parcel — confirms zero new activity since your last bring-down." },
];

const DOC_LABEL: Record<string, string> = {
  "WAR DEED": "Warranty deed",
  "DEED TRST": "Deed of trust",
  "REL D/T": "Release of DOT",
  "AF DISCLS": "Affidavit of disclosure",
  "TRST DEED": "Trustee's deed",
  "Q/CL DEED": "Quit-claim deed",
  "T FIN ST": "UCC termination",
  "DISCLAIMR": "Disclaimer",
  "DEATH CER": "Death certificate",
  "ASGN D/T": "Assignment of DOT",
  "FED TAX L": "Federal tax lien",
  "AFFD": "Affidavit",
  "AF VAL": "Affidavit of value",
};

function prettyDocCode(raw: string): string {
  return DOC_LABEL[raw] ?? raw;
}

export function BringDownPage() {
  const { user } = useAuth();
  const wl = useWatchlist();
  const checks = useBringDownChecks();

  const rows = useMemo(() => {
    if (!user || wl.parcels.length === 0) return [];
    return computeBringDown({
      watchedApns: wl.parcels,
      parcels: loadAllParcels(),
      instruments: loadAllInstruments(),
      asOf: AS_OF,
      lastChecked: checks.lastChecked,
      defaultLookbackDays: 90,
    });
  }, [user, wl.parcels, checks.lastChecked]);

  const totalNew = rows.reduce((s, r) => s + r.totalNewCount, 0);

  // Title-plant-gap headline (always computed; used for empty state + footer texture)
  const gapByDocCode = useMemo(
    () =>
      aggregateActivity(activity.records as ActivityRecord[], {
        groupBy: "doc_code",
        windowDays: PLANT_LAG_DAYS,
        referenceDate: AS_OF,
      }),
    [],
  );
  const gapTotal = gapByDocCode.reduce((s, b) => s + b.total, 0);

  const byDate = useMemo(
    () =>
      aggregateActivity(activity.records as ActivityRecord[], {
        groupBy: "date",
        windowDays: 30,
        referenceDate: AS_OF,
      }),
    [],
  );
  const byDateMax = Math.max(...byDate.map((b) => b.total), 1);

  const showWorkflow = Boolean(user) && wl.parcels.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <nav className="mb-6 text-sm">
        <Link to="/" className="text-slate-600 underline underline-offset-2">
          ← Back to portal
        </Link>
      </nav>

      <header className="mb-6 max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">Bring-Down Watch</h1>
        <p className="mt-1 text-sm text-slate-600">
          The gap-out you run before every close — automated against the live county index.{" "}
          Title plants typically lag indexing by 14–28 days; we update nightly.
        </p>
      </header>

      {showWorkflow ? (
        <SignedInWorkflow rows={rows} totalNew={totalNew} onMarkChecked={checks.markChecked} />
      ) : (
        <EmptyHero
          gapTotal={gapTotal}
          gapByDocCode={gapByDocCode}
          isSignedIn={Boolean(user)}
          onWatchDemo={(apn) => wl.toggleParcel(apn)}
          watchedApns={wl.parcels}
        />
      )}

      <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">
              Last 30 days, by document type
            </h2>
            <Chip tone="neutral">replaces municipality view</Chip>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-slate-500 mb-3">
              Doc-type mix is what abstractors actually filter on — DOTs, releases, NODs, assignments — not city counts.
            </p>
            <ul className="space-y-2">
              {gapByDocCode.length === 0 ? (
                <li className="text-xs text-slate-500">No activity in this window.</li>
              ) : (
                <DocTypeBars buckets={gapByDocCode} />
              )}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Daily volume</h2>
            <Chip tone="moat">{`14 days ahead of plants`}</Chip>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-slate-500 mb-2">
              Title plants typically lag indexing by 14–28 days.{" "}
              <strong>This view updates nightly.</strong>
            </p>
            <div className="flex items-end gap-px h-32">
              {byDate.map((b) => (
                <div
                  key={b.key}
                  title={`${b.key}: ${b.total}`}
                  className="flex-1 bg-slate-700"
                  style={{
                    height: `${(b.total / byDateMax) * 100}%`,
                    minHeight: "2px",
                  }}
                />
              ))}
            </div>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}

function SignedInWorkflow({
  rows,
  totalNew,
  onMarkChecked,
}: {
  rows: ReturnType<typeof computeBringDown>;
  totalNew: number;
  onMarkChecked: (apn: string, isoDate: string) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-slate-900">{totalNew}</span>
        <span className="text-sm text-slate-600">
          new instrument{totalNew === 1 ? "" : "s"} on your watched parcels since your last bring-down
        </span>
      </div>

      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.apn}>
            <Card>
              <CardHeader>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/parcel/${row.apn}`}
                      className="font-mono text-sm text-moat-700 hover:underline"
                    >
                      {row.apn}
                    </Link>
                    {row.parcelMissing ? (
                      <Chip tone="warn">parcel not in corpus</Chip>
                    ) : (
                      <span className="text-sm text-slate-700">{row.ownerLabel}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Last bring-down:{" "}
                    <span className="font-mono">{row.lastCheckedAt}</span>
                    {row.lastCheckedDefaulted ? (
                      <span className="ml-1 text-slate-400">(90-day default)</span>
                    ) : null}
                  </p>
                </div>
                {row.totalNewCount > 0 ? (
                  <Chip tone="warn">{row.totalNewCount} new</Chip>
                ) : (
                  <Chip tone="success">clear</Chip>
                )}
              </CardHeader>
              <CardBody>
                {row.totalNewCount === 0 ? (
                  <p className="text-sm text-slate-600">
                    No new instruments since {row.lastCheckedAt}. Safe to issue or update commitment.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y divide-slate-100">
                      {row.newInstruments.map((ni) => (
                        <li key={ni.instrumentNumber} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-slate-900">{ni.instrumentNumber}</span>
                            <span className="text-xs text-slate-500">{ni.recordingDate}</span>
                            <Chip tone="info">{ni.documentTypeRaw}</Chip>
                            <span className="text-xs text-slate-700">
                              {prettyDocCode(ni.documentTypeRaw)}
                            </span>
                          </div>
                          <Link
                            to={`/parcel/${row.apn}/instrument/${ni.instrumentNumber}`}
                            className="text-xs text-moat-700 underline underline-offset-2"
                          >
                            Open ↗
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {row.byDocType.length > 1 ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Doc-type mix:{" "}
                        {row.byDocType
                          .map((d) => `${d.count} × ${prettyDocCode(d.docCode)}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </>
                )}
              </CardBody>
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  to={`/parcel/${row.apn}/encumbrances`}
                  className="text-moat-700 hover:underline"
                >
                  Open encumbrance lifecycle →
                </Link>
                <button
                  type="button"
                  onClick={() => onMarkChecked(row.apn, AS_OF)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mark reviewed through {AS_OF}
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyHero({
  gapTotal,
  gapByDocCode,
  isSignedIn,
  onWatchDemo,
  watchedApns,
}: {
  gapTotal: number;
  gapByDocCode: { key: string; total: number }[];
  isSignedIn: boolean;
  onWatchDemo: (apn: string) => void;
  watchedApns: string[];
}) {
  const topThree = gapByDocCode.slice(0, 3);
  return (
    <section>
      <Card>
        <CardBody>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums text-slate-900">
              {gapTotal.toLocaleString()}
            </span>
            <span className="text-sm text-slate-600">
              instruments recorded in the last {PLANT_LAG_DAYS} days that title plants don't have yet.
            </span>
          </div>
          {topThree.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Including{" "}
              {topThree
                .map((b) => `${b.total.toLocaleString()} ${prettyDocCode(b.key)}`)
                .join(", ")}
              .
            </p>
          ) : null}
          <p className="mt-4 text-sm text-slate-700">
            {isSignedIn
              ? "Watch one or more parcels and we'll surface every new instrument the moment it indexes — the gap-out you run before every close, automated."
              : "Sign in and watch a parcel — we'll surface every new instrument the moment it indexes, days before it appears in title plants."}
          </p>
        </CardBody>
      </Card>

      {isSignedIn ? (
        <Card className="mt-4">
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Try a curated parcel</h2>
            <Chip tone="neutral">demo</Chip>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-slate-500 mb-3">
              These parcels have curated chains in the demo corpus. Add one to your watchlist to see the bring-down workflow.
            </p>
            <ul className="space-y-2">
              {DEMO_WATCH_SUGGESTIONS.map((s) => {
                const watched = watchedApns.includes(s.apn);
                return (
                  <li key={s.apn} className="flex items-start justify-between gap-3 py-1">
                    <div>
                      <div className="text-sm text-slate-900">{s.label}</div>
                      <div className="text-xs text-slate-500">{s.hook}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onWatchDemo(s.apn)}
                      disabled={watched}
                      className={`shrink-0 rounded-md border px-3 py-1 text-xs font-medium ${
                        watched
                          ? "border-slate-200 bg-slate-100 text-slate-400"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {watched ? "Watched" : "Watch this parcel"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon="star"
            title="Sign in to watch parcels"
            body="Bring-Down Watch is a signed-in feature. Sign in (demo) from the top-right to try it."
          />
        </div>
      )}
    </section>
  );
}

function DocTypeBars({ buckets }: { buckets: { key: string; total: number }[] }) {
  const max = Math.max(...buckets.map((b) => b.total), 1);
  return (
    <>
      {buckets.map((b) => (
        <li key={b.key} className="flex items-center gap-3">
          <span className="w-36 text-xs text-slate-700">{prettyDocCode(b.key)}</span>
          <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${(b.total / max) * 100}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs font-mono text-slate-900">
            {b.total.toLocaleString()}
          </span>
        </li>
      ))}
    </>
  );
}
