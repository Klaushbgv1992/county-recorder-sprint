import { Link } from "react-router";
import { useWatchlist } from "../../account/useWatchlist";
import { Card, CardBody } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { PreviewPill } from "./PreviewPill";
import seed from "../../data/account/seed-statutory-notices.json";

interface Notice {
  id: string;
  kind: "tax_sale" | "probate" | "lis_pendens";
  parcel_apn: string;
  neighbor_of?: string[];
  published_at: string;
  deadline_at?: string;
  title: string;
  body: string;
}

const KIND_LABEL: Record<Notice["kind"], string> = {
  tax_sale: "Tax sale",
  probate: "Probate",
  lis_pendens: "Lis pendens",
};

export function AccountStatutoryNotices() {
  const wl = useWatchlist();
  const watched = new Set(wl.parcels);

  const filtered = (seed.items as Notice[]).filter(
    (n) => watched.has(n.parcel_apn) || (n.neighbor_of ?? []).some((apn) => watched.has(apn)),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Statutory notices</h1>
          <p className="mt-1 text-sm text-slate-600">
            Legally-published notices on or near parcels you watch.
          </p>
        </div>
        <PreviewPill productionNote="production pulls from the recorder's notice-publication stream" />
      </header>

      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moat-50 text-moat-700 ring-1 ring-moat-200">
              <Icon name="gavel" size={16} />
            </span>
            <div className="text-xs leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">Why this only exists here</p>
              <p className="mt-1">
                Only the county publishes statutory notice (tax sales, probate, lis pendens) —
                this is a legal function of the recorder's office. Title plants resell search
                results and cannot aggregate notice by your watchlist. Production adds
                legally-required acknowledgement and a timestamped receipt.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon="gavel"
          title="No active statutory notices near your watched parcels"
          body="When a tax sale, probate publication, or lis pendens is filed on or adjacent to a watched parcel, it will appear here."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {filtered.map((n) => (
                <li key={n.id} className="p-5">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2">
                      <Chip tone="warn">{KIND_LABEL[n.kind]}</Chip>
                      <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                    </div>
                    <time className="text-[11px] text-slate-500">Published {n.published_at}</time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  {n.deadline_at && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-200">
                      Deadline: {n.deadline_at}
                    </p>
                  )}
                  <Link
                    to={`/parcel/${n.parcel_apn}`}
                    className="mt-2 inline-block text-xs text-moat-700 hover:underline"
                  >
                    Open parcel {n.parcel_apn} →
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
