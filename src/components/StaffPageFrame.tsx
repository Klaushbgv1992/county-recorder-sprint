import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function StaffPageFrame({ title, subtitle, children }: Props) {
  return (
    <div className="flex-1 overflow-auto">
      {/* Staff surface identity strip. These routes (/staff, /staff/*)
          simulate the internal county workbench and are out of the
          public examiner workflow — the strip makes that unambiguous
          for anyone who arrives via the landing footer link. Actions
          here are intentionally session-only. */}
      <div className="bg-amber-50 border-b border-amber-300 px-6 py-2.5 flex items-center justify-between gap-4 text-xs">
        <div className="text-amber-900 font-medium">
          County staff view &mdash; internal workbench simulation
        </div>
        <div className="text-amber-800">
          Actions are session-only &middot;{" "}
          <a href="/" className="underline underline-offset-2 hover:text-amber-900">
            Back to public search
          </a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
