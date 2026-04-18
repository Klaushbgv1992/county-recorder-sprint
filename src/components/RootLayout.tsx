import { Outlet, useMatch } from "react-router";
import { PipelineBanner } from "./PipelineBanner";
import { AppHeader } from "./AppHeader";
import { AuthProvider } from "../account/AuthContext";
import { ToastProvider } from "./ui/Toast";

export function RootLayout() {
  // Sitewide banner + header are hidden on /staff/* because internal staff
  // routes mount StaffPageFrame, which has its own header treatment and a
  // session-only-actions warning. The wildcard automatically covers any
  // nested staff path, so new /staff/* routes need no update here.
  //
  // AuthProvider + ToastProvider wrap every route (including /staff) so
  // account hooks (useAuth, useToast) can be consumed anywhere below.
  const onStaff = useMatch("/staff/*") !== null;
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          {!onStaff && <AppHeader />}
          {!onStaff && <PipelineBanner />}
          <div className="flex-1 min-h-0 overflow-auto">
            <Outlet />
          </div>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
