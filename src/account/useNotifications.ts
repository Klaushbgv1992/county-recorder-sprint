import { useCallback, useEffect, useMemo, useState } from "react";
import seed from "../data/account/seed-notifications.json";

export type NotificationKind =
  | "new_instrument" | "watched_party" | "flag_response" | "statutory_notice" | "digest";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  recorded_at: string;
  parcel_apn?: string;
  party_normalized?: string;
  recording_number?: string;
  ref?: string;
  unread_by_default: boolean;
}

const KEY = "mcr.account.notifications.readIds.v1";

function readReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}

interface Filter {
  watchedParcels: string[];
  watchedParties: string[];
}

function matchesFilter(n: Notification, f: Filter): boolean {
  if (n.kind === "digest" || n.kind === "flag_response") return true;
  if (n.parcel_apn && f.watchedParcels.includes(n.parcel_apn)) return true;
  if (n.party_normalized && f.watchedParties.includes(n.party_normalized)) return true;
  return false;
}

export function useNotifications(filter: Filter) {
  const [readIds, setReadIds] = useState<Set<string>>(() => readReadIds());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(readIds))); } catch { /* noop */ }
  }, [readIds]);

  const items = useMemo(
    () =>
      (seed.items as Notification[])
        .filter((n) => matchesFilter(n, filter))
        .map((n) => ({ ...n, read: readIds.has(n.id) || !n.unread_by_default }))
        .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)),
    [filter, readIds],
  );

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    setReadIds((s) => new Set([...s, id]));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(items.map((n) => n.id)));
  }, [items]);

  return { items, unreadCount, markRead, markAllRead };
}
