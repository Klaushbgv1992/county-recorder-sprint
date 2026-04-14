import {
  ParcelsFile,
  InstrumentFile,
  LinksFile,
  LifecyclesFile,
} from "./schemas";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
} from "./types";

import parcelsRaw from "./data/parcels.json";
import inst20130183449 from "./data/instruments/20130183449.json";
import inst20130183450 from "./data/instruments/20130183450.json";
import inst20210057846 from "./data/instruments/20210057846.json";
import inst20210057847 from "./data/instruments/20210057847.json";
import inst20210075858 from "./data/instruments/20210075858.json";
import inst20150516729 from "./data/instruments/20150516729.json";
import inst20150516730 from "./data/instruments/20150516730.json";
import linksRaw from "./data/links.json";
import lifecyclesRaw from "./data/lifecycles.json";

const instrumentsRaw = [
  inst20130183449,
  inst20130183450,
  inst20210057846,
  inst20210057847,
  inst20210075858,
  inst20150516729,
  inst20150516730,
];

// Default parcel for the single-parcel UI contract — POPHAM primary.
// Wave 2 will switch the UI to multi-parcel selection.
const DEFAULT_APN = "304-78-386";

export interface ParcelData {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
}

export function loadAllParcels(): Parcel[] {
  return ParcelsFile.parse(parcelsRaw);
}

export function loadAllInstruments(): Instrument[] {
  return instrumentsRaw.map((raw) => InstrumentFile.parse(raw));
}

export function loadParcelDataByApn(apn: string): ParcelData {
  const parcels = loadAllParcels();
  const parcel = parcels.find((p) => p.apn === apn);
  if (!parcel) {
    throw new Error(`Parcel not found for APN: ${apn}`);
  }

  const allInstruments = loadAllInstruments();
  const allLinks = LinksFile.parse(linksRaw);
  const lifecyclesFile = LifecyclesFile.parse(lifecyclesRaw);

  // Scope instruments/links/lifecycles to this parcel's curated set.
  const parcelInstrumentIds = new Set(parcel.instrument_numbers ?? []);
  const instruments = parcelInstrumentIds.size > 0
    ? allInstruments.filter((i) => parcelInstrumentIds.has(i.instrument_number))
    : allInstruments;

  const links = parcelInstrumentIds.size > 0
    ? allLinks.filter(
        (l) =>
          parcelInstrumentIds.has(l.source_instrument) ||
          parcelInstrumentIds.has(l.target_instrument),
      )
    : allLinks;

  const lifecycles = parcelInstrumentIds.size > 0
    ? lifecyclesFile.lifecycles.filter((lc) =>
        parcelInstrumentIds.has(lc.root_instrument),
      )
    : lifecyclesFile.lifecycles;

  return {
    parcel,
    instruments,
    links,
    lifecycles,
    pipelineStatus: lifecyclesFile.pipeline_status,
  };
}

// Backward-compatible single-parcel loader used by the current UI.
// Returns the default (POPHAM) parcel scoped to its own corpus.
export function loadParcelData(): ParcelData {
  return loadParcelDataByApn(DEFAULT_APN);
}
