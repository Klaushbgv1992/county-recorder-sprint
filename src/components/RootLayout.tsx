import { Outlet } from "react-router";
import { PipelineBanner } from "./PipelineBanner";
import { AppHeader } from "./AppHeader";
import { AuthProvider } from "../account/AuthContext";
import { ToastProvider } from "./ui/Toast";

export function RootLayout() {
  // AppHeader + PipelineBanner render on every route, including /staff/*.
  // The staff surface keeps its own amber identity strip inside
  // StaffPageFrame; the sitewide header gives a consistent brand/anchor
  // and a clickable route back to /. AuthProvider + ToastProvider wrap
  // every route so account hooks (useAuth, useToast) work anywhere below.
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <AppHeader />
          <PipelineBanner />
          <div className="flex-1 min-h-0 overflow-auto">
            <Outlet />
          </div>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
