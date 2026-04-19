import { Link, NavLink, useLocation } from "react-router";
import { usePortalMode } from "../hooks/usePortalMode";
import { PortalModeToggle } from "./PortalModeToggle";
import { useAuth } from "../account/AuthContext";
import { SignInButton } from "./account/SignInButton";
import { NotificationBell } from "./account/NotificationBell";
import { AccountMenu } from "./account/AccountMenu";

// Persistent brand/chrome rail. Mounted by RootLayout on public routes
// above PipelineBanner so every public page shares the same anchor.
// Staff routes mount their own StaffPageFrame and opt out in RootLayout.
export function AppHeader() {
  const { mode, setMode } = usePortalMode();
  const { user } = useAuth();
  const location = useLocation();
  const onLanding = location.pathname === "/";

  return (
    <header className="h-14 shrink-0 border-b border-slate-200 bg-white">
      <div className="h-full px-5 flex items-center gap-5">
        <Link
          to="/"
          aria-label="Maricopa Land Custodian Portal — home"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded"
        >
          {/* County-seal glyph — abstract shield+sun mark, avoids legal risk
              of the real seal while giving the header a memorable anchor. */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 32 32"
            aria-hidden="true"
            className="shrink-0"
          >
            <defs>
              <linearGradient id="seal-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>
            <path
              d="M16 2 L28 7 V17 C28 23.5 22.6 28.5 16 30 C9.4 28.5 4 23.5 4 17 V7 Z"
              fill="url(#seal-g)"
            />
            <circle cx="16" cy="14" r="3.2" fill="#10b981" />
            <path
              d="M10 21 L22 21"
              stroke="#10b981"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-moat-700">
              Maricopa County
            </span>
            <span className="text-sm font-semibold text-recorder-900 tracking-tight">
              Land Custodian Portal
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-4 ml-4 text-xs font-medium text-slate-500">
          <HeaderLink to="/search">
            Search
          </HeaderLink>
          <HeaderLink to="/county-activity">Bring-down</HeaderLink>
          <HeaderLink to="/moat-compare">Compare vs. plant</HeaderLink>
          <HeaderLink to="/why">Why this matters</HeaderLink>
          <HeaderLink to="/enterprise">Enterprise</HeaderLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {onLanding && <PortalModeToggle mode={mode} onChange={setMode} />}
          <Link
            to="/staff"
            className="text-[11px] text-slate-400 hover:text-slate-700 hover:underline underline-offset-2"
          >
            Staff workbench
          </Link>
          {/* Account affordances: signed-out → Google sign-in button;
              signed-in → notification bell + account menu. The
              AuthProvider in RootLayout guarantees useAuth works here. */}
          {user ? (
            <>
              <NotificationBell />
              <AccountMenu />
            </>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `hover:text-recorder-900 transition-colors ${
          isActive ? "text-recorder-900" : ""
        }`
      }
    >
      {children}
    </NavLink>
  );
}
