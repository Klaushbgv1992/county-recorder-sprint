import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.recentlyViewed.v1";
const MAX = 8;

export interface RecentItem {
  kind: "parcel" | "party";
  id: string;
  label: string;
  visited_at: string;
}

function readAll(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch { return []; }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const record = useCallback((entry: Omit<RecentItem, "visited_at">) => {
    setItems((s) => {
      const without = s.filter((x) => !(x.kind === entry.kind && x.id === entry.id));
      const next: RecentItem = { ...entry, visited_at: new Date().toISOString() };
      return [next, ...without].slice(0, MAX);
    });
  }, []);

  return { items, record };
}
