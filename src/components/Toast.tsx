import { useEffect } from "react";

export type ToastVariant = "info" | "success";

export interface ToastProps {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
}

export function Toast({ message, variant, onDismiss }: ToastProps) {
  useEffect(() => {
    if (variant !== "success") return;
    const id = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(id);
  }, [variant, onDismiss]);

  const colorClass =
    variant === "success"
      ? "bg-emerald-600 text-white"
      : "bg-slate-800 text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-md px-4 py-3 text-sm font-medium shadow-lg ${colorClass}`}
    >
      {message}
    </div>
  );
}
