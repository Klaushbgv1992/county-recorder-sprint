import {
  ParcelsFile,
  InstrumentFile,
  LinksFile,
  LifecyclesFile,
} from "./schemas";
import { inferSameDayGroups } from "./logic/same-day-group-inferrer";
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
import inst20010093192 from "./data/instruments/20010093192.json";
import inst20010849180 from "./data/instruments/20010849180.json";
import inst20070834753 from "./data/instruments/20070834753.json";
import inst20070834755 from "./data/instruments/20070834755.json";
import inst20130087108 from "./data/instruments/20130087108.json";
import inst20130087109 from "./data/instruments/20130087109.json";
import inst20200620456 from "./data/instruments/20200620456.json";
import inst20200620457 from "./data/instruments/20200620457.json";
import inst20230100000 from "./data/instruments/20230100000.json";
import inst20190100001 from "./data/instruments/20190100001.json";
import inst20090100001 from "./data/instruments/20090100001.json";
import inst20220100001 from "./data/instruments/20220100001.json";
// Scenario corpus — 4 demo-only parcels (probate / divorce Q/CL / LLC / tax-sale REO)
import inst20080200001 from "./data/instruments/20080200001.json";
import inst20080200002 from "./data/instruments/20080200002.json";
import inst20190200001 from "./data/instruments/20190200001.json";
import inst20230200001 from "./data/instruments/20230200001.json";
import inst20240200001 from "./data/instruments/20240200001.json";
import inst20160200001 from "./data/instruments/20160200001.json";
import inst20160200002 from "./data/instruments/20160200002.json";
import inst20210200001 from "./data/instruments/20210200001.json";
import inst20210200002 from "./data/instruments/20210200002.json";
import inst20220200001 from "./data/instruments/20220200001.json";
import inst20170200001 from "./data/instruments/20170200001.json";
import inst20170200002 from "./data/instruments/20170200002.json";
import inst20220200002 from "./data/instruments/20220200002.json";
import inst20220200003 from "./data/instruments/20220200003.json";
import inst20220200004 from "./data/instruments/20220200004.json";
import inst20050200001 from "./data/instruments/20050200001.json";
import inst20050200002 from "./data/instruments/20050200002.json";
import inst20220200005 from "./data/instruments/20220200005.json";
import inst20230200002 from "./data/instruments/20230200002.json";
import inst20230200003 from "./data/instruments/20230200003.json";
// POPHAM historical-chain reconstruction (1978–2006). All synthetic —
// extends the chain-of-title back beyond the real 2013 curated start so
// the demo shows a full examiner lookback. See each file's source_note
// and raw_api_response.synthesized_note for provenance.
import inst19780100001 from "./data/instruments/19780100001.json";
import inst19950100001 from "./data/instruments/19950100001.json";
import inst19990100001 from "./data/instruments/19990100001.json";
import inst20020100001 from "./data/instruments/20020100001.json";
import inst20020100002 from "./data/instruments/20020100002.json";
import inst20050100001 from "./data/instruments/20050100001.json";
import inst20060100001 from "./data/instruments/20060100001.json";
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
  inst20010093192,
  inst20010849180,
  inst20070834753,
  inst20070834755,
  inst20130087108,
  inst20130087109,
  inst20200620456,
  inst20200620457,
  inst20230100000,
  inst20190100001,
  inst20090100001,
  inst20220100001,
  // Scenario corpus
  inst20080200001,
  inst20080200002,
  inst20190200001,
  inst20230200001,
  inst20240200001,
  inst20160200001,
  inst20160200002,
  inst20210200001,
  inst20210200002,
  inst20220200001,
  inst20170200001,
  inst20170200002,
  inst20220200002,
  inst20220200003,
  inst20220200004,
  inst20050200001,
  inst20050200002,
  inst20220200005,
  inst20230200002,
  inst20230200003,
  // POPHAM historical-chain extension
  inst19780100001,
  inst19950100001,
  inst19990100001,
  inst20020100001,
  inst20020100002,
  inst20050100001,
  inst20060100001,
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
  const instruments = instrumentsRaw.map((raw) => InstrumentFile.parse(raw));
  const inferred = inferSameDayGroups(
    instruments.map((i) => ({
      instrument_number: i.instrument_number,
      recording_date: i.recording_date,
      names: i.raw_api_response.names ?? [],
    }))
  );
  const groupIdByNumber = new Map(
    inferred.map((r) => [r.instrument_number, r.same_day_group_id])
  );
  return instruments.map((i) => ({
    ...i,
    same_day_group_id: groupIdByNumber.get(i.instrument_number) ?? null,
  }));
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

export function loadAllLifecycles(): EncumbranceLifecycle[] {
  return LifecyclesFile.parse(lifecyclesRaw).lifecycles;
}
