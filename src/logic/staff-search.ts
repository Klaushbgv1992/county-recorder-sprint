import staffIndex from "../data/staff-index.json";

export interface StaffIndexRow {
  instrument_number: string;
  recording_date: string;
  document_type: string;
  names: string[];
  attributed_parcel_apn: string;
  suppressed_same_name_of: string | null;
}

export interface SearchResultGroup {
  kind: "attributed" | "same_name_candidate";
  attributed_parcel_apn: string;
  results: StaffIndexRow[];
}

export function searchByName(query: string): SearchResultGroup[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toUpperCase();
  const rows = staffIndex as unknown as StaffIndexRow[];
  const matched = rows.filter((r) =>
    r.names.some((n) => n.toUpperCase().includes(q)),
  );
  if (matched.length === 0) return [];
  const groups = new Map<string, SearchResultGroup>();
  for (const r of matched) {
    const key = r.suppressed_same_name_of
      ? `suppressed:${r.suppressed_same_name_of}`
      : `attributed:${r.attributed_parcel_apn}`;
    const existing = groups.get(key);
    if (existing) {
      existing.results.push(r);
    } else {
      groups.set(key, {
        kind: r.suppressed_same_name_of ? "same_name_candidate" : "attributed",
        attributed_parcel_apn:
          r.suppressed_same_name_of ?? r.attributed_parcel_apn,
        results: [r],
      });
    }
  }
  return [...groups.values()];
}
