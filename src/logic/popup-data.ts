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
  const lastRecordingDate =
    parcelInstruments.length === 0
      ? null
      : parcelInstruments
          .map((i) => i.recording_date)
          .sort()
          .at(-1) ?? null;

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
