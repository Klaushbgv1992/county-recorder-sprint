import { Outlet, useMatch } from "react-router";
import { PipelineBanner } from "./PipelineBanner";

export function RootLayout() {
  // Sitewide banner is hidden on /staff/* because internal staff routes
  // mount StaffPageFrame, which has its own header treatment and a
  // session-only-actions warning. Keep this match list in sync with the
  // staff route table in src/router.tsx.
  const onStaff = useMatch("/staff/*") !== null;
  return (
    <>
      {!onStaff && <PipelineBanner />}
      <Outlet />
    </>
  );
}
