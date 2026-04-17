import type {
  Instrument,
  DocumentLink,
  Parcel,
} from "../types";

export type StoryMode = "curated" | "partial";

export interface NarrativeOverlay {
  hero_override: string | null;
  callouts: Record<string, string>;
  what_this_means: string | null;
  moat_note: string | null;
}

export interface InstrumentGroup {
  instruments: Instrument[];
  recording_date: string;
  same_day_group_id: string | null;
}

export interface Pattern {
  id: string;
  match: (group: InstrumentGroup, ctx: PatternContext) => boolean;
  render: (group: InstrumentGroup, ctx: PatternContext) => string;
}

export interface PatternContext {
  apn: string;
  mode: StoryMode;
  allInstruments: Instrument[];
  allLinks: DocumentLink[];
  parcel: Parcel;
}

export interface TimelineBlock {
  instrument_numbers: string[];
  pattern_id: string;
  prose: string;
  callouts: string[];
}

export interface CurrentClaim {
  lifecycle_id: string;
  summary: string;
}

export interface NeighborLink {
  apn: string;
  address: string;
  mode: StoryMode;
}

export interface NeighborhoodSection {
  subdivision_line: string | null;
  neighbors: NeighborLink[];
}

export interface StoryPageData {
  apn: string;
  mode: StoryMode;
  parcel: Parcel;
  hero: { oneLiner: string; metaDescription: string };
  timelineBlocks: TimelineBlock[];
  currentlyOpen: CurrentClaim[];
  neighborhood: NeighborhoodSection;
  whatThisMeans: string;
  moatCallout: string;
}
