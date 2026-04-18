import { Link } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { useWatchlist } from "../../account/useWatchlist";
import { useNotifications } from "../../account/useNotifications";
import { useRecentlyViewed } from "../../account/useRecentlyViewed";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";
import { EmptyState } from "../ui/EmptyState";
import { PreviewPill } from "./PreviewPill";

function MetricCard({
  icon, title, metric, sub, to, tone,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  metric: string;
  sub: string;
  to: string;
  tone: "moat" | "amber" | "sky" | "violet";
}) {
  const toneBg: Record<typeof tone, string> = {
    moat: "from-moat-500/10 to-moat-500/0 text-moat-700",
    amber: "from-amber-500/10 to-amber-500/0 text-amber-700",
    sky: "from-sky-500/10 to-sky-500/0 text-sky-700",
    violet: "from-violet-500/10 to-violet-500/0 text-violet-700",
  };
  return (
    <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded-xl">
      <Card interactive>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${toneBg[tone]} ring-1 ring-inset ring-slate-200/60`}>
              <Icon name={icon} size={18} />
            </span>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          </div>
          <Icon name="arrowRight" size={16} {...{ className: "text-slate-400" }} />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">{metric}</div>
          <div className="mt-1 text-xs text-slate-500">{sub}</div>
        </CardBody>
      </Card>
    </Link>
  );
}

export function AccountDashboard() {
  const { user } = useAuth();
  const wl = useWatchlist();
  const { items, unreadCount } = useNotifications({
    watchedParcels: wl.parcels,
    watchedParties: wl.parties,
  });
  const recent = useRecentlyViewed();

  if (!user) return null;

  const noticesCount = items.filter((i) => i.kind === "statutory_notice").length;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-moat-700">
            Account · Demo mode
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-recorder-900">
            Welcome back, {user.display_name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {wl.parcels.length} parcel{wl.parcels.length === 1 ? "" : "s"} · {wl.parties.length} part{wl.parties.length === 1 ? "y" : "ies"} watched
          </p>
        </div>
        <PreviewPill />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon="star" title="Watchlist" metric={String(wl.parcels.length + wl.parties.length)} sub="items watched" to="/account/watchlist" tone="amber" />
        <MetricCard icon="bell" title="Inbox" metric={String(unreadCount)} sub={unreadCount === 1 ? "unread notification" : "unread notifications"} to="/account/inbox" tone="moat" />
        <MetricCard icon="gavel" title="Statutory notices" metric={String(noticesCount)} sub="near watched parcels" to="/account/notices" tone="violet" />
        <MetricCard icon="file" title="Records requests" metric="0 open" sub="submit a new request" to="/account/records-request" tone="sky" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="sparkle" size={16} {...{ className: "text-slate-400" }} />
            <h2 className="text-sm font-semibold text-slate-800">Recent activity on your watchlist</h2>
          </div>
          <Chip tone="moat">Last 7 days</Chip>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <EmptyState
              icon="bell"
              title="No activity yet"
              body="When a new document records against a parcel or party you're watching, it'll show up here — and in your inbox."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.slice(0, 4).map((n) => (
                <li key={n.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{n.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{n.body}</div>
                  </div>
                  <time className="shrink-0 text-[11px] text-slate-400">
                    {new Date(n.recorded_at).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Recently viewed</h2>
        </CardHeader>
        <CardBody>
          {recent.items.length === 0 ? (
            <p className="text-xs text-slate-500">As you browse parcels and parties, they'll appear here.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.items.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Chip tone={r.kind === "parcel" ? "info" : "moat"}>{r.kind}</Chip>
                    <span className="truncate text-sm text-slate-800">{r.label}</span>
                  </div>
                  <Link
                    to={r.kind === "parcel" ? `/parcel/${r.id}` : `/party/${r.id}`}
                    className="text-xs text-moat-700 hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
