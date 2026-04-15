import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function StaffPageFrame({ title, subtitle, children }: Props) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-amber-100 text-amber-800 text-xs text-center py-1.5 px-4 border-b border-amber-200">
        Staff preview (demo) &mdash; actions here are session-only and not
        persisted
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
