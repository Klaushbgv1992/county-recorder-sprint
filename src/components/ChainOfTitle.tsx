import type { Parcel, Instrument, DocumentLink } from "../types";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
}

export function ChainOfTitle({ parcel }: Props) {
  return <div>ChainOfTitle stub — {parcel.apn}</div>;
}
