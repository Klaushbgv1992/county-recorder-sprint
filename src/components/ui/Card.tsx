import type { ReactNode } from "react";

export function Card({
  children,
  interactive,
  className = "",
}: {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
        interactive
          ? "transition-all duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-start justify-between gap-3 px-5 pt-4 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-4 pt-3 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-3 border-t border-slate-100 text-xs text-slate-600 ${className}`}>
      {children}
    </div>
  );
}
