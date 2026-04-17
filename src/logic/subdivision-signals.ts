import type {
  Parcel,
  Instrument,
  EncumbranceLifecycle,
  DocumentType,
} from "../types";

const LIEN_DOCUMENT_TYPES: ReadonlySet<DocumentType> = new Set([
  "hoa_lien",
]);

export interface LienSignal {
  apn: string;
  currentOwner: string;
  subdivision: string;
  documentType: DocumentType;
  lifecycleId: string;
  instrumentNumber: string;
}

export function getOpenLiensInSubdivision(
  subdivision: string,
  excludeApn: string,
  parcels: Parcel[],
  lifecycles: EncumbranceLifecycle[],
  instruments: Instrument[],
): LienSignal[] {
  const instrumentByNumber = new Map(
    instruments.map((i) => [i.instrument_number, i]),
  );
  const parcelByInstrument = new Map<string, Parcel>();
  for (const p of parcels) {
    for (const n of p.instrument_numbers ?? []) {
      parcelByInstrument.set(n, p);
    }
  }

  const out: LienSignal[] = [];
  for (const lc of lifecycles) {
    if (lc.status !== "open") continue;
    const instrument = instrumentByNumber.get(lc.root_instrument);
    if (!instrument) continue;
    if (!LIEN_DOCUMENT_TYPES.has(instrument.document_type)) continue;
    const parcel = parcelByInstrument.get(lc.root_instrument);
    if (!parcel) continue;
    if (parcel.subdivision !== subdivision) continue;
    if (parcel.apn === excludeApn) continue;
    out.push({
      apn: parcel.apn,
      currentOwner: parcel.current_owner,
      subdivision: parcel.subdivision,
      documentType: instrument.document_type,
      lifecycleId: lc.id,
      instrumentNumber: instrument.instrument_number,
    });
  }
  return out;
}
