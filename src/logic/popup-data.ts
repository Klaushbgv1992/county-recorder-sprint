import type { Parcel, Instrument, EncumbranceLifecycle } from "../types";

export type PopupVariant = "residential" | "subdivision_common";

export interface PopupData {
  apn: string;
  type: PopupVariant;
  owner: string;
  address: string;
  lastRecordingDate: string | null;
  openLifecycleCount: number;
}

export interface PopupDataInputs {
  parcels: Parcel[];
  instruments: Instrument[];
  lifecycles: EncumbranceLifecycle[];
}

export function resolvePopupData(
  apn: string,
  inputs: PopupDataInputs,
): PopupData | null {
  const parcel = inputs.parcels.find((p) => p.apn === apn);
  if (!parcel) return null;

  const parcelInstrumentIds = new Set(parcel.instrument_numbers ?? []);

  const parcelInstruments = inputs.instruments.filter((i) =>
    parcelInstrumentIds.has(i.instrument_number),
  );
  // Lexicographic sort == chronological because Instrument.recording_date is
  // schema-validated as YYYY-MM-DD (src/schemas.ts). Do not relax that
  // validation without revisiting this sort.
  const lastRecordingDate =
    parcelInstruments.length === 0
      ? null
      : parcelInstruments
          .map((i) => i.recording_date)
          .sort()
          .at(-1) ?? null;

  // Reads lc.status from the curated lifecycles.json baseline, not from the
  // useExaminerActions localStorage snapshot the encumbrance panel computes
  // live. This means an examiner who accepts a release in-session and returns
  // to the landing map will still see the pre-accept count here. Intentional
  // for the prototype — same family as Decisions #16, #36, #41 (live-sync
  // and server-side state stubbed). Production would thread the runtime
  // status through PopupDataInputs and reuse computeLifecycleStatus().
  const openLifecycleCount = inputs.lifecycles.filter(
    (lc) =>
      parcelInstrumentIds.has(lc.root_instrument) && lc.status === "open",
  ).length;

  return {
    apn,
    type: parcel.type ?? "residential",
    owner: parcel.current_owner,
    address: parcel.address,
    lastRecordingDate,
    openLifecycleCount,
  };
}
