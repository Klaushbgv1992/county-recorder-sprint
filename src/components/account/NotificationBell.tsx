import { Link } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { useNotifications } from "../../account/useNotifications";
import { useWatchlist } from "../../account/useWatchlist";
import { Icon } from "../ui/Icon";

export function NotificationBell() {
  const { user } = useAuth();
  const wl = useWatchlist();
  const { unreadCount } = useNotifications({
    watchedParcels: wl.parcels,
    watchedParties: wl.parties,
  });

  if (!user) return null;

  return (
    <Link
      to="/account/inbox"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      aria-label={`Inbox${unreadCount ? `, ${unreadCount} unread` : ""}`}
    >
      <Icon name="bell" size={18} />
      {unreadCount > 0 && (
        <span
          data-testid="bell-badge"
          className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
