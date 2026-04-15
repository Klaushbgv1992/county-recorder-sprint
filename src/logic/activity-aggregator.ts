// src/logic/activity-aggregator.ts
export interface ActivityRecord {
  date: string; // YYYY-MM-DD
  municipality: string;
  doc_code: string;
  count: number;
}

export interface AggregateOptions {
  groupBy: "municipality" | "date" | "doc_code";
  windowDays?: number;
  referenceDate?: string;
}

export interface AggregateBucket {
  key: string;
  total: number;
}

export function aggregateActivity(
  records: ActivityRecord[],
  opts: AggregateOptions,
): AggregateBucket[] {
  const filtered = opts.windowDays
    ? records.filter((r) => withinWindow(r.date, opts.windowDays!, opts.referenceDate))
    : records;

  const map = new Map<string, number>();
  for (const r of filtered) {
    const k = r[opts.groupBy];
    map.set(k, (map.get(k) ?? 0) + r.count);
  }

  const sorted = [...map.entries()].map(([key, total]) => ({ key, total }));
  if (opts.groupBy === "date") {
    sorted.sort((a, b) => a.key.localeCompare(b.key));
  } else {
    sorted.sort((a, b) => b.total - a.total);
  }
  return sorted;
}

function withinWindow(dateStr: string, windowDays: number, ref?: string): boolean {
  const referenceDate = ref ? new Date(ref) : new Date();
  const target = new Date(dateStr);
  const diffMs = referenceDate.getTime() - target.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < windowDays;
}
