import { Link } from "react-router";
import { useAuth } from "../account/AuthContext";
import { SignInButton } from "./account/SignInButton";
import { NotificationBell } from "./account/NotificationBell";
import { AccountMenu } from "./account/AccountMenu";

function Monogram() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-moat-600 to-moat-800 text-white font-bold text-[11px] shadow-sm ring-1 ring-white/30">
      MC
    </span>
  );
}

export function HeaderBar() {
  const { user } = useAuth();
  return (
    <header className="shrink-0 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="h-12 px-4 flex items-center justify-between">
        <Link to="/" className="group inline-flex items-center gap-2 focus-visible:outline-none">
          <Monogram />
          <span className="flex flex-col leading-none">
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
              Maricopa County
            </span>
            <span className="text-sm font-semibold text-recorder-900 group-hover:text-moat-800">
              Recorder
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
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
