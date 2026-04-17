import type { Instrument, Parcel } from "../types";
import type {
  InstrumentGroup,
  PatternContext,
  TimelineBlock,
  NarrativeOverlay,
} from "./types";
import { findMatchingPattern, partial_chain_disclosure } from "./patterns";

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

function titleCaseName(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

function granteeFamilyShortForm(inst: Instrument): string {
  const grantees = inst.parties.filter((p) => p.role === "grantee").map((p) => p.name);
  const lastNames = Array.from(
    new Set(
      grantees.map((full) => {
        const parts = full.trim().split(/\s+/);
        return titleCaseName(parts[parts.length - 1] ?? full);
      }),
    ),
  );
  if (lastNames.length === 0) return "the current owners";
  if (lastNames.length === 1) return `the ${lastNames[0]}s`;
  return lastNames.join(" & ");
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
  const family = granteeFamilyShortForm(deed);
  const year = deed.recording_date.slice(0, 4);
  const sentence = `${parcel.address} in ${parcel.city}, ${parcel.state} is owned by ${family}, who acquired it in ${year} according to the county's recorded ownership history.`;
  return { oneLiner: sentence, metaDescription: sentence };
}
