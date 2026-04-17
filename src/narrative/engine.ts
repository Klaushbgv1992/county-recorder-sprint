import type { Instrument } from "../types";
import type {
  InstrumentGroup,
  PatternContext,
  TimelineBlock,
  NarrativeOverlay,
} from "./types";
import { findMatchingPattern } from "./patterns";

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

// Dedicated partial-disclosure pattern — intentionally lives outside the
// matcher loop. Called once per partial-mode page to render the hero aside.
const PARTIAL_DISCLOSURE_ID = "partial_chain_disclosure";

export function renderTimeline(
  instruments: Instrument[],
  ctx: PatternContext,
  overlay?: NarrativeOverlay | null,
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  if (ctx.mode === "partial") {
    const n = ctx.allInstruments.length;
    blocks.push({
      instrument_numbers: [],
      pattern_id: PARTIAL_DISCLOSURE_ID,
      prose: `The county has ${n} recorded document${n === 1 ? "" : "s"} for this parcel — here's what we can see. This isn't a complete ownership history; for older records, a title examiner would request the county archive. You're seeing the same authoritative record they'd see.`,
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
