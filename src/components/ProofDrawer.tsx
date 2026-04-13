import type { Instrument, DocumentLink } from "../types";

interface Props {
  instrument: Instrument;
  links: DocumentLink[];
  onClose: () => void;
}

export function ProofDrawer({ instrument, onClose }: Props) {
  return (
    <div>
      ProofDrawer stub — {instrument.instrument_number}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
