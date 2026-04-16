import { Outlet, useMatch } from "react-router";
import { PipelineBanner } from "./PipelineBanner";

export function RootLayout() {
  // Sitewide banner is hidden on /staff/* because internal staff routes
  // mount StaffPageFrame, which has its own header treatment and a
  // session-only-actions warning. The wildcard automatically covers any
  // nested staff path, so new /staff/* routes need no update here.
  const onStaff = useMatch("/staff/*") !== null;
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {!onStaff && <PipelineBanner />}
      <div className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
