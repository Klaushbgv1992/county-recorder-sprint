import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";

const ITEMS: Array<{ to: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }> = [
  { to: "/account", label: "Dashboard", icon: "sparkle" },
  { to: "/account/watchlist", label: "Watchlist", icon: "star" },
  { to: "/account/inbox", label: "Inbox", icon: "inbox" },
  { to: "/account/notices", label: "Statutory notices", icon: "gavel" },
  { to: "/account/preferences", label: "Preferences", icon: "gear" },
  { to: "/account/records-request", label: "Records requests", icon: "file" },
  { to: "/account/commitments", label: "My commitments", icon: "building" },
];

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.display_name} size={28} />
        <span className="hidden sm:inline">{user.display_name.split(" ")[0]}</span>
        <svg viewBox="0 0 20 20" className="h-3 w-3 text-slate-500" aria-hidden>
          <path fill="currentColor" d="M5 8l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-[slideUp_140ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-900">{user.display_name}</div>
            <div className="text-xs text-slate-500">{user.email}</div>
          </div>
          <ul className="py-1">
            {ITEMS.map((it) => (
              <li key={it.to}>
                <Link
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="text-slate-400"><Icon name={it.icon} size={16} /></span>
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
