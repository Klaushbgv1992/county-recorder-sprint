// scripts/lib/seville-fetch.ts
// Pure helpers for the Seville neighbor recorder cache fetch. No network, no fs
// except where explicitly called by the shell script.

// ---------------------------------------------------------------------------
// Date normalisation
// ---------------------------------------------------------------------------

// Maricopa API returns dates in M-D-YYYY format (no leading zeros).
// Normalise to ISO 8601 YYYY-MM-DD.
export function toIsoDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) throw new Error(`Unexpected date format: "${raw}"`);
  const [m, d, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Sleep / budget helpers
// ---------------------------------------------------------------------------

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function callBudget(cap: number) {
  let used = 0;
  return {
    consume() {
      used += 1;
      if (used > cap) {
        throw new Error(
          `HALT: call budget exceeded (cap=${cap}). Stop and report.`,
        );
      }
    },
    get used() {
      return used;
    },
  };
}

// ---------------------------------------------------------------------------
// Display-field normalisation
// ---------------------------------------------------------------------------

export type RawDoc = {
  recordingNumber: string;
  recordingDate: string;
  documentCode: string;
  names?: string[];
};

export type DisplayFields = {
  last_recorded_date: string;
  last_doc_type: string;
  recent_instruments: Array<{
    recording_number: string;
    recording_date: string;
    doc_type: string;
    parties: string[];
  }>;
};

export function normalizeDisplayFields(docs: RawDoc[]): DisplayFields {
  const sorted = [...docs].sort((a, b) =>
    toIsoDate(b.recordingDate).localeCompare(toIsoDate(a.recordingDate)),
  );
  return {
    last_recorded_date: toIsoDate(sorted[0].recordingDate),
    last_doc_type: sorted[0].documentCode,
    recent_instruments: sorted.map((d) => ({
      recording_number: d.recordingNumber,
      recording_date: toIsoDate(d.recordingDate),
      doc_type: d.documentCode,
      parties: d.names ?? [],
    })),
  };
}
