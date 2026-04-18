import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: "success" | "info" | "warn";
}

interface ToastValue {
  show: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((t: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[280px] max-w-sm rounded-lg border px-4 py-3 shadow-lg animate-[slideUp_160ms_cubic-bezier(0.16,1,0.3,1)] ${
              t.tone === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : t.tone === "warn"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
            role="status"
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.body && <div className="mt-0.5 text-xs opacity-80">{t.body}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
