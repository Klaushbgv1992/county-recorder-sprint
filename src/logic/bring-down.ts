import type { Instrument, Parcel } from "../types";

export interface BringDownInput {
  watchedApns: string[];
  parcels: Parcel[];
  instruments: Instrument[];
  asOf: string;
  lastChecked: Record<string, string>;
  defaultLookbackDays: number;
}

export interface BringDownInstrument {
  instrumentNumber: string;
  recordingDate: string;
  documentTypeRaw: string;
  documentType: string;
}

export interface BringDownDocTypeBucket {
  docCode: string;
  count: number;
}

export interface BringDownRow {
  apn: string;
  ownerLabel: string;
  parcelMissing: boolean;
  lastCheckedAt: string;
  lastCheckedDefaulted: boolean;
  newInstruments: BringDownInstrument[];
  totalNewCount: number;
  byDocType: BringDownDocTypeBucket[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function subtractDays(iso: string, days: number): string {
  const t = new Date(`${iso}T00:00:00Z`).getTime() - days * MS_PER_DAY;
  return new Date(t).toISOString().slice(0, 10);
}

export function computeBringDown(input: BringDownInput): BringDownRow[] {
  const parcelByApn = new Map(input.parcels.map((p) => [p.apn, p]));
  const instrumentByNumber = new Map(
    input.instruments.map((i) => [i.instrument_number, i]),
  );
  const defaultLastChecked = subtractDays(input.asOf, input.defaultLookbackDays);

  return input.watchedApns.map((apn) => {
    const parcel = parcelByApn.get(apn);
    if (!parcel) {
      return {
        apn,
        ownerLabel: "Unknown parcel",
        parcelMissing: true,
        lastCheckedAt: input.lastChecked[apn] ?? defaultLastChecked,
        lastCheckedDefaulted: !(apn in input.lastChecked),
        newInstruments: [],
        totalNewCount: 0,
        byDocType: [],
      };
    }

    const lastCheckedAt = input.lastChecked[apn] ?? defaultLastChecked;
    const lastCheckedDefaulted = !(apn in input.lastChecked);

    const parcelInstruments = (parcel.instrument_numbers ?? [])
      .map((n) => instrumentByNumber.get(n))
      .filter((i): i is Instrument => Boolean(i));

    const newInstruments: BringDownInstrument[] = parcelInstruments
      .filter(
        (i) => i.recording_date > lastCheckedAt && i.recording_date <= input.asOf,
      )
      .sort((a, b) => b.recording_date.localeCompare(a.recording_date))
      .map((i) => ({
        instrumentNumber: i.instrument_number,
        recordingDate: i.recording_date,
        documentTypeRaw: i.document_type_raw,
        documentType: i.document_type,
      }));

    const docTypeMap = new Map<string, number>();
    for (const ni of newInstruments) {
      docTypeMap.set(ni.documentTypeRaw, (docTypeMap.get(ni.documentTypeRaw) ?? 0) + 1);
    }
    const byDocType = [...docTypeMap.entries()]
      .map(([docCode, count]) => ({ docCode, count }))
      .sort((a, b) => b.count - a.count);

    return {
      apn,
      ownerLabel: parcel.current_owner,
      parcelMissing: false,
      lastCheckedAt,
      lastCheckedDefaulted,
      newInstruments,
      totalNewCount: newInstruments.length,
      byDocType,
    };
  });
}
