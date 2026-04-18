import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function EmptyState({
  icon = "inbox",
  title,
  body,
  action,
}: {
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon name={icon} size={18} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {body && <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
