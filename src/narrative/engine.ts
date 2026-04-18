import type { ReactNode } from "react";
import type { z } from "zod";
import type { Instrument, Parcel } from "../types";
import type { StaffAnomalySchema } from "../schemas";
import type {
  InstrumentGroup,
  PatternContext,
  TimelineBlock,
  NarrativeOverlay,
} from "./types";
import { findMatchingPattern, partial_chain_disclosure } from "./patterns";
import { renderWithCitations } from "./render-citations";
import { anomalyPatterns } from "./anomaly-patterns";
import { subjectPhraseFromParties } from "./subject-phrase";

type StaffAnomaly = z.infer<typeof StaffAnomalySchema>;

function isEngineAnomaly(
  a: StaffAnomaly,
): a is Extract<StaffAnomaly, { pattern_id: string }> {
  return a.references.length > 0;
}

export function groupBySameDay(instruments: Instrument[]): InstrumentGroup[] {
  const byGroupId = new Map<string, Instrument[]>();
  const ungrouped: Instrument[] = [];
  for (const inst of instruments) {
    if (inst.same_day_group_id) {
      const arr = byGroupId.get(inst.same_day_group_id) ?? [];
      arr.push(inst);
      byGroupId.set(inst.same_day_group_id, arr);
    } else {
      ungrouped.push(inst);
    }
  }
  const groups: InstrumentGroup[] = [];
  for (const [id, arr] of byGroupId) {
    groups.push({
      instruments: arr,
      recording_date: arr[0].recording_date,
      same_day_group_id: id,
    });
  }
  for (const inst of ungrouped) {
    groups.push({
      instruments: [inst],
      recording_date: inst.recording_date,
      same_day_group_id: null,
    });
  }
  groups.sort((a, b) => a.recording_date.localeCompare(b.recording_date));
  return groups;
}

export function renderTimeline(
  instruments: Instrument[],
  ctx: PatternContext,
  overlay?: NarrativeOverlay | null,
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  if (ctx.mode === "partial") {
    const emptyGroup: InstrumentGroup = {
      instruments: [],
      recording_date: "",
      same_day_group_id: null,
    };
    blocks.push({
      instrument_numbers: [],
      pattern_id: partial_chain_disclosure.id,
      prose: partial_chain_disclosure.render(emptyGroup, ctx),
      callouts: [],
    });
  }

  const groups = groupBySameDay(instruments);
  for (const group of groups) {
    const pattern = findMatchingPattern(group, ctx);
    if (!pattern) continue;
    const prose = pattern.render(group, ctx);
    const callouts: string[] = [];
    if (overlay) {
      for (const inst of group.instruments) {
        const note = overlay.callouts[inst.instrument_number];
        if (note) callouts.push(note);
      }
    }
    blocks.push({
      instrument_numbers: group.instruments.map((i) => i.instrument_number),
      pattern_id: pattern.id,
      prose,
      callouts,
    });
  }

  return blocks;
}

function latestDeed(instruments: Instrument[]): Instrument | null {
  const deeds = instruments
    .filter((i) =>
      i.document_type === "warranty_deed" ||
      i.document_type === "special_warranty_deed" ||
      i.document_type === "quit_claim_deed" ||
      i.document_type === "grant_deed",
    )
    .sort((a, b) => b.recording_date.localeCompare(a.recording_date));
  return deeds[0] ?? null;
}

export function renderHero(
  parcel: Parcel,
  instruments: Instrument[],
  overlay: NarrativeOverlay | null,
): { oneLiner: string; metaDescription: string } {
  if (overlay?.hero_override) {
    return { oneLiner: overlay.hero_override, metaDescription: overlay.hero_override };
  }
  const deed = latestDeed(instruments);
  if (!deed) {
    const sentence = `${parcel.address} in ${parcel.city}, ${parcel.state}. The county's records for this parcel are summarized below.`;
    return { oneLiner: sentence, metaDescription: sentence };
  }
  const family = subjectPhraseFromParties(deed.parties, "grantee");
  const year = deed.recording_date.slice(0, 4);
  const sentence = `${parcel.address} in ${parcel.city}, ${parcel.state} is owned by ${family}, who acquired it in ${year} according to the county's recorded ownership history.`;
  return { oneLiner: sentence, metaDescription: sentence };
}

export function renderAnomalyProse(
  anomaly: StaffAnomaly,
  instruments: Instrument[],
  onOpenDocument: (n: string) => void,
): ReactNode[] {
  const knownInstruments = new Set(instruments.map((i) => i.instrument_number));
  const prose = isEngineAnomaly(anomaly)
    ? anomalyPatterns[anomaly.pattern_id]({
        references: anomaly.references,
        instruments,
      })
    : anomaly.plain_english;
  return renderWithCitations(prose, knownInstruments, onOpenDocument);
}
