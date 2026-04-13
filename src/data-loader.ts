import {
  ParcelFile,
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

import parcelRaw from "../data/parcel.json";
import inst20130183449 from "../data/instruments/20130183449.json";
import inst20130183450 from "../data/instruments/20130183450.json";
import inst20210057846 from "../data/instruments/20210057846.json";
import inst20210057847 from "../data/instruments/20210057847.json";
import inst20210075858 from "../data/instruments/20210075858.json";
import linksRaw from "../data/links.json";
import lifecyclesRaw from "../data/lifecycles.json";

const instrumentsRaw = [
  inst20130183449,
  inst20130183450,
  inst20210057846,
  inst20210057847,
  inst20210075858,
];

export interface ParcelData {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
}

export function loadParcelData(): ParcelData {
  const parcel = ParcelFile.parse(parcelRaw);
  const instruments = instrumentsRaw.map((raw) => InstrumentFile.parse(raw));
  const links = LinksFile.parse(linksRaw);
  const lifecyclesFile = LifecyclesFile.parse(lifecyclesRaw);

  return {
    parcel,
    instruments,
    links,
    lifecycles: lifecyclesFile.lifecycles,
    pipelineStatus: lifecyclesFile.pipeline_status,
  };
}
