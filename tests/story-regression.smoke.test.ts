import { describe, it, expect } from "vitest";
import { loadAllParcels, loadAllInstruments } from "../src/data-loader";
import { renderHero, renderTimeline } from "../src/narrative/engine";
import type { PatternContext } from "../src/narrative/types";

const FORBIDDEN = [
  /\bLlcs\b/,
  /\bthe\s+Llcs?\b/i,
  /\d{4}s\b/,
  /the\s+THE\b/i,
  /\bTrusts\b/,
];

describe("story-view regression: no naive-pluralization artifacts", () => {
  for (const apn of ["304-78-386", "304-77-689"]) {
    it(`${apn} narrative has no forbidden plural artifacts`, () => {
      const parcel = loadAllParcels().find((p) => p.apn === apn)!;
      const instruments = loadAllInstruments().filter((i) =>
        (parcel.instrument_numbers ?? []).includes(i.instrument_number),
      );
      const ctx: PatternContext = { allInstruments: instruments, mode: "full" };
      const hero = renderHero(parcel, instruments, null);
      const timeline = renderTimeline(instruments, ctx, null);
      const allProse = [hero.oneLiner, ...timeline.map((b) => b.prose)].join("\n");
      // eslint-disable-next-line no-console
      console.log(`\n=== ${apn} ===\nHERO: ${hero.oneLiner}`);
      for (const b of timeline) console.log(`  - ${b.prose}`);
      for (const re of FORBIDDEN) {
        expect(allProse, `matched ${re} in:\n${allProse}`).not.toMatch(re);
      }
    });
  }
});
