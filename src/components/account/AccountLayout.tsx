import { NavLink, Outlet } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { SignInButton } from "./SignInButton";
import { Icon } from "../ui/Icon";
import { EmptyState } from "../ui/EmptyState";

const NAV: Array<{ to: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; end?: boolean }> = [
  { to: "/account", label: "Dashboard", icon: "sparkle", end: true },
  { to: "/account/watchlist", label: "Watchlist", icon: "star" },
  { to: "/account/inbox", label: "Inbox", icon: "inbox" },
  { to: "/account/notices", label: "Statutory notices", icon: "gavel" },
  { to: "/account/preferences", label: "Preferences", icon: "gear" },
  { to: "/account/records-request", label: "Records requests", icon: "file" },
  { to: "/account/commitments", label: "My commitments", icon: "building" },
];

export function AccountLayout() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <EmptyState
          icon="gear"
          title="Sign in to access your account"
          body="One-click demo sign-in, no password required. Your session persists in this browser."
          action={<SignInButton />}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex gap-8 px-6 py-8">
      <nav className="w-56 shrink-0">
        <div className="sticky top-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Account
          </p>
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors relative ${
                      isActive
                        ? "bg-moat-50 font-semibold text-moat-900"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-moat-600" />
                      )}
                      <span className={isActive ? "text-moat-700" : "text-slate-400 group-hover:text-slate-600"}>
                        <Icon name={item.icon} size={16} />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
