import { useMemo } from "react";
import type { Parcel, Instrument, DocumentLink } from "../types";
import { buildOwnerPeriods } from "../logic/chain-builder";
import { InstrumentRow } from "./InstrumentRow";

const DEED_TYPES = new Set([
  "warranty_deed",
  "special_warranty_deed",
  "quit_claim_deed",
  "grant_deed",
]);

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  onOpenDocument: (instrumentNumber: string) => void;
}

export function ChainOfTitle({
  parcel,
  instruments,
  links: _links,
  onOpenDocument,
}: Props) {
  const ownerPeriods = useMemo(
    () => buildOwnerPeriods(instruments),
    [instruments],
  );
  const deeds = useMemo(
    () =>
      instruments
        .filter((i) => DEED_TYPES.has(i.document_type))
        .sort(
          (a, b) =>
            new Date(a.recording_date).getTime() -
            new Date(b.recording_date).getTime(),
        ),
    [instruments],
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Chain of Title</h2>
        <p className="text-sm text-gray-500 mt-1">
          {parcel.address} &mdash; APN: {parcel.apn}
        </p>
      </div>

      {/* Owner Period Timeline */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Ownership Periods
        </h3>
        <div className="relative">
          {ownerPeriods.map((period, idx) => (
            <div key={period.start_instrument} className="flex mb-4">
              <div className="flex flex-col items-center mr-4">
                <div
                  className={`w-3 h-3 rounded-full ${period.is_current ? "bg-blue-600" : "bg-gray-400"}`}
                />
                {idx < ownerPeriods.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-1" />
                )}
              </div>

              <div
                className={`flex-1 border rounded-lg p-3 ${period.is_current ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">
                    {period.owner}
                  </span>
                  {period.is_current && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                      Current Owner
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {period.start_date}
                  {period.end_date ? ` to ${period.end_date}` : " to present"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deed List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Conveyance Instruments
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {deeds.map((deed) => (
            <InstrumentRow
              key={deed.instrument_number}
              instrument={deed}
              onOpenDocument={onOpenDocument}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-right">
        {deeds[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}
