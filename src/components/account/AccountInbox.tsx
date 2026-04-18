import { Link } from "react-router";
import { useWatchlist } from "../../account/useWatchlist";
import { useNotifications, type Notification } from "../../account/useNotifications";
import { Card, CardBody } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { PreviewPill } from "./PreviewPill";

const KIND_LABEL: Record<Notification["kind"], string> = {
  new_instrument: "New filing",
  watched_party: "Watched party",
  flag_response: "Flag response",
  statutory_notice: "Statutory notice",
  digest: "Digest",
};

const KIND_TONE: Record<Notification["kind"], React.ComponentProps<typeof Chip>["tone"]> = {
  new_instrument: "moat",
  watched_party: "info",
  flag_response: "success",
  statutory_notice: "warn",
  digest: "neutral",
};

export function AccountInbox() {
  const wl = useWatchlist();
  const { items, unreadCount, markRead, markAllRead } = useNotifications({
    watchedParcels: wl.parcels,
    watchedParties: wl.parties,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Inbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span data-testid="unread-count">{unreadCount}</span> unread · {items.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PreviewPill />
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          >
            Mark all read
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Your inbox is empty"
          body="Add parcels and parties to your watchlist and activity will start appearing here."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`relative cursor-pointer px-5 py-3.5 transition-colors hover:bg-slate-50 ${
                    !n.read ? "bg-moat-50/30" : ""
                  }`}
                >
                  {!n.read && (
                    <span className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-moat-600" aria-label="unread" />
                  )}
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <Chip tone={KIND_TONE[n.kind]}>{KIND_LABEL[n.kind]}</Chip>
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{n.title}</h3>
                    </div>
                    <time className="shrink-0 text-[11px] text-slate-500">
                      {new Date(n.recorded_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {n.parcel_apn && (
                      <Link to={`/parcel/${n.parcel_apn}`} className="text-moat-700 hover:underline">
                        Open parcel {n.parcel_apn} →
                      </Link>
                    )}
                    {n.party_normalized && (
                      <Link to={`/party/${n.party_normalized}`} className="text-moat-700 hover:underline">
                        Open party →
                      </Link>
                    )}
                    {n.recording_number && (
                      <Link to={`/instrument/${n.recording_number}`} className="text-moat-700 hover:underline">
                        Open instrument {n.recording_number} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
