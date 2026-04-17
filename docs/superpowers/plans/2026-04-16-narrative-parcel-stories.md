# Narrative Parcel Stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/parcel/:apn/story` — a homeowner-readable narrative page generated from curated instrument data, covering 5 curated parcels (full stories) and 5 cached neighbors (honest partial stories), with inline moat callouts and SEO-indexable meta.

**Architecture:** Pure-function pattern registry (14 patterns) walks same-day instrument groups and emits prose. Per-parcel narrative overlay JSON at `src/data/narratives/{apn}.json` provides hero override + per-instrument color callouts + hand-authored "what this means" prose. React components consume a composed `StoryPageData` object from a single `useStoryData(apn)` hook. Cached-neighbor data is adapted from the public-API response into the same instrument shape used by curated data. Story pages coexist with — and do not replace — the 2026-04-15 terminology toggle; the toggle is hidden on story routes.

**Tech Stack:** React 19, react-router 7, TypeScript, Vite 8, Tailwind v4, Vitest 4, Zod 4, `@testing-library/react`.

**Spec reference:** [docs/superpowers/specs/2026-04-16-narrative-parcel-stories-design.md](../specs/2026-04-16-narrative-parcel-stories-design.md)

---

## File structure

**New files:**
- `src/narrative/types.ts` — `NarrativeOverlay`, `Pattern`, `TimelineBlock`, `StoryPageData`, `StoryMode`
- `src/narrative/availability.ts` — `storyPageExists(apn)`, `getStoryMode(apn)`
- `src/narrative/adapter.ts` — cached-neighbor → `Instrument` normalization
- `src/narrative/overlays.ts` — per-APN overlay loader + Zod validation
- `src/narrative/patterns.ts` — pattern registry (14 patterns)
- `src/narrative/engine.ts` — `renderTimeline`, `renderHero`, `groupBySameDay`
- `src/hooks/useStoryData.ts` — data composition hook
- `src/components/story/StoryPage.tsx`
- `src/components/story/StoryHero.tsx`
- `src/components/story/StoryTimeline.tsx`
- `src/components/story/StoryCurrentClaims.tsx`
- `src/components/story/StoryNeighborhood.tsx`
- `src/components/story/StoryWhatThisMeans.tsx`
- `src/components/story/StoryMoatCallout.tsx`
- `src/components/story/StoryFooterCtas.tsx`
- `src/components/SubscribePlaceholder.tsx`
- `src/data/narratives/304-78-386.json` — POPHAM (full overlay)
- `src/data/narratives/304-77-689.json` — HOGUE (`what_this_means` only)
- `src/data/narratives/304-78-374.json` — WARNER (`what_this_means` only)
- `src/data/narratives/304-78-383.json` — LOWRY (`what_this_means` only)
- `src/data/narratives/304-78-409.json` — Seville HOA (`what_this_means` only)
- Test files alongside each source file (`*.test.ts`, `*.test.tsx`)

**Modified files:**
- `src/schemas.ts` — add `NarrativeOverlayFile` schema
- `src/router.tsx` — register `/parcel/:apn/story` and `/subscribe` routes
- `src/components/PersonaRow.tsx` + `src/components/PersonaRow.test.tsx` — retarget "For homeowners"
- `src/components/ChainOfTitle.tsx` — add "Read as a story →" link
- `src/components/FeaturedParcels.tsx` + `src/components/FeaturedParcels.test.tsx` — add secondary story link

---

## Task 1: Narrative types foundation

**Files:**
- Create: `src/narrative/types.ts`
- Test: `src/narrative/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/narrative/types.test.ts
import { describe, it, expect } from "vitest";
import type {
  NarrativeOverlay,
  Pattern,
  TimelineBlock,
  StoryPageData,
  StoryMode,
} from "./types";

describe("narrative types", () => {
  it("NarrativeOverlay accepts full POPHAM-shaped object", () => {
    const ov: NarrativeOverlay = {
      hero_override: "custom hero",
      callouts: { "20130183449": "a note" },
      what_this_means: "for you",
      moat_note: "vs plant",
    };
    expect(ov.callouts["20130183449"]).toBe("a note");
  });

  it("NarrativeOverlay accepts sparse object with only what_this_means", () => {
    const ov: NarrativeOverlay = {
      hero_override: null,
      callouts: {},
      what_this_means: "for you",
      moat_note: null,
    };
    expect(ov.what_this_means).toBeDefined();
  });

  it("StoryMode is curated or partial", () => {
    const a: StoryMode = "curated";
    const b: StoryMode = "partial";
    expect([a, b]).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/narrative/types.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the types**

```ts
// src/narrative/types.ts
import type { Instrument, DocumentLink, EncumbranceLifecycle, Parcel } from "../types";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/narrative/types.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/narrative/types.ts src/narrative/types.test.ts
git commit -m "feat(narrative): add type foundation for story pages"
```

---

## Task 2: Story-page availability helper

**Files:**
- Create: `src/narrative/availability.ts`
- Test: `src/narrative/availability.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/narrative/availability.test.ts
import { describe, it, expect } from "vitest";
import { storyPageExists, getStoryMode } from "./availability";

describe("storyPageExists", () => {
  it("returns true for POPHAM curated APN", () => {
    expect(storyPageExists("304-78-386")).toBe(true);
  });
  it("returns true for a cached-neighbor APN (304-78-406)", () => {
    expect(storyPageExists("304-78-406")).toBe(true);
  });
  it("returns false for an unknown APN", () => {
    expect(storyPageExists("999-99-999")).toBe(false);
  });
});

describe("getStoryMode", () => {
  it("returns 'curated' for POPHAM", () => {
    expect(getStoryMode("304-78-386")).toBe("curated");
  });
  it("returns 'partial' for cached neighbor", () => {
    expect(getStoryMode("304-78-406")).toBe("partial");
  });
  it("returns null for unknown APN", () => {
    expect(getStoryMode("999-99-999")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/narrative/availability.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```ts
// src/narrative/availability.ts
import type { StoryMode } from "./types";
import parcelsRaw from "../data/parcels.json";
import cachedNeighborIndex from "../data/api-cache/recorder/index.json";

const CURATED_APNS: ReadonlySet<string> = new Set(
  (parcelsRaw as Array<{ apn: string }>).map((p) => p.apn),
);
const CACHED_NEIGHBOR_APNS: ReadonlySet<string> = new Set(cachedNeighborIndex as string[]);

export function storyPageExists(apn: string): boolean {
  return CURATED_APNS.has(apn) || CACHED_NEIGHBOR_APNS.has(apn);
}

export function getStoryMode(apn: string): StoryMode | null {
  if (CURATED_APNS.has(apn)) return "curated";
  if (CACHED_NEIGHBOR_APNS.has(apn)) return "partial";
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/narrative/availability.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/narrative/availability.ts src/narrative/availability.test.ts
git commit -m "feat(narrative): add storyPageExists + getStoryMode helpers"
```

---

## Task 3: Cached-neighbor instrument adapter

**Files:**
- Create: `src/narrative/adapter.ts`
- Test: `src/narrative/adapter.test.ts`

Cached-neighbor JSON is the shape returned by `/documents/{recordingNumber}` on the public API — flat `names[]`, `recordingDate` in `M-D-YYYY`, `documentCodes[]`. The adapter normalizes to a partial `Instrument` shape with empty `parties[]` (role inference is unreliable per Decision #29) so patterns that require role data skip it.

- [ ] **Step 1: Inspect one cached-neighbor JSON to match its shape exactly**

Read `src/data/api-cache/recorder/304-78-406.json` and confirm the top-level `instruments` array shape before writing the test.

- [ ] **Step 2: Write the failing test**

```ts
// src/narrative/adapter.test.ts
import { describe, it, expect } from "vitest";
import { loadCachedNeighborInstruments } from "./adapter";

describe("loadCachedNeighborInstruments", () => {
  it("returns normalized instruments for a known cached APN", () => {
    const instruments = loadCachedNeighborInstruments("304-78-406");
    expect(instruments.length).toBeGreaterThan(0);
    for (const inst of instruments) {
      expect(inst.instrument_number).toMatch(/^\d{11}$/);
      expect(inst.recording_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(inst.parties).toEqual([]);
      expect(inst.raw_api_response.names.length).toBeGreaterThan(0);
    }
  });
  it("returns empty array for an unknown APN", () => {
    expect(loadCachedNeighborInstruments("999-99-999")).toEqual([]);
  });
  it("normalizes M-D-YYYY recording date to YYYY-MM-DD", () => {
    const instruments = loadCachedNeighborInstruments("304-78-406");
    for (const inst of instruments) {
      const [y, m, d] = inst.recording_date.split("-");
      expect(Number(y)).toBeGreaterThan(2000);
      expect(Number(m)).toBeGreaterThanOrEqual(1);
      expect(Number(m)).toBeLessThanOrEqual(12);
      expect(Number(d)).toBeGreaterThanOrEqual(1);
      expect(Number(d)).toBeLessThanOrEqual(31);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/narrative/adapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement the adapter**

```ts
// src/narrative/adapter.ts
import type { Instrument } from "../types";
import cache304_78_338 from "../data/api-cache/recorder/304-78-338.json";
import cache304_78_367 from "../data/api-cache/recorder/304-78-367.json";
import cache304_78_369 from "../data/api-cache/recorder/304-78-369.json";
import cache304_78_406 from "../data/api-cache/recorder/304-78-406.json";
import cache304_78_408 from "../data/api-cache/recorder/304-78-408.json";

interface CachedNeighborFile {
  apn: string;
  instruments: Array<{
    recordingNumber: string;
    recordingDate: string;
    names: string[];
    documentCodes: string[];
    pageAmount?: number;
    restricted?: boolean;
  }>;
}

const CACHE_BY_APN: Record<string, CachedNeighborFile> = {
  "304-78-338": cache304_78_338 as CachedNeighborFile,
  "304-78-367": cache304_78_367 as CachedNeighborFile,
  "304-78-369": cache304_78_369 as CachedNeighborFile,
  "304-78-406": cache304_78_406 as CachedNeighborFile,
  "304-78-408": cache304_78_408 as CachedNeighborFile,
};

function normalizeDate(mdY: string): string {
  const [m, d, y] = mdY.split("-");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function documentTypeFromCode(codes: string[]): Instrument["document_type"] {
  const primary = codes[0] ?? "";
  switch (primary) {
    case "WAR DEED":
    case "GRANT DEED": return "warranty_deed";
    case "SPCL WD": return "special_warranty_deed";
    case "Q/CL DEED": return "quit_claim_deed";
    case "DEED TRST": return "deed_of_trust";
    case "ASN DT": return "assignment_of_dot";
    case "REL D/T": return "full_reconveyance";
    case "T FIN ST": return "ucc_termination";
    case "DISCLAIMR":
    case "AF DISCLS": return "affidavit_of_disclosure";
    default: return "other";
  }
}

export function loadCachedNeighborInstruments(apn: string): Instrument[] {
  const file = CACHE_BY_APN[apn];
  if (!file) return [];
  return file.instruments.map((raw): Instrument => ({
    instrument_number: raw.recordingNumber,
    recording_date: normalizeDate(raw.recordingDate),
    document_type: documentTypeFromCode(raw.documentCodes),
    document_type_raw: raw.documentCodes.join(" + "),
    bundled_document_types: [],
    parties: [],
    legal_description: null,
    extracted_fields: {},
    back_references: [],
    same_day_group: [],
    source_image_path: null,
    page_count: raw.pageAmount ?? null,
    raw_api_response: {
      names: raw.names,
      documentCodes: raw.documentCodes,
      recordingDate: raw.recordingDate,
      recordingNumber: raw.recordingNumber,
      pageAmount: raw.pageAmount ?? 0,
      docketBook: 0,
      pageMap: 0,
      affidavitPresent: false,
      affidavitPageAmount: 0,
      restricted: raw.restricted ?? false,
    },
    corpus_boundary_note: "Cached from public API; no OCR or curation",
    provenance_summary: null,
    same_day_group_id: null,
  }));
}
```

**Note:** If the `Instrument` type in `src/types.ts` requires fields this adapter doesn't supply (e.g., `provenance_summary` non-null), the adapter must be reconciled. If the type disagrees, prefer loosening the type with `| null` to accepting synthetic provenance data. Run `npx tsc -b` to check.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/narrative/adapter.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 6: Commit**

```bash
git add src/narrative/adapter.ts src/narrative/adapter.test.ts
git commit -m "feat(narrative): add cached-neighbor instrument adapter"
```

---

## Task 4: Narrative overlay schema + loader

**Files:**
- Modify: `src/schemas.ts` (append)
- Create: `src/narrative/overlays.ts`
- Test: `src/narrative/overlays.test.ts`

- [ ] **Step 1: Append schema to `src/schemas.ts`**

Append at end of `src/schemas.ts`:

```ts
// -- Narrative overlay --

export const NarrativeOverlayFile = z.object({
  hero_override: z.string().nullable(),
  callouts: z.record(z.string(), z.string()),
  what_this_means: z.string().nullable(),
  moat_note: z.string().nullable(),
});
```

- [ ] **Step 2: Write the failing test**

```ts
// src/narrative/overlays.test.ts
import { describe, it, expect } from "vitest";
import { loadOverlayForApn } from "./overlays";

describe("loadOverlayForApn", () => {
  it("returns null for an APN with no overlay file", () => {
    expect(loadOverlayForApn("999-99-999")).toBeNull();
  });
});
```

The test is intentionally minimal — we validate a specific overlay's content in later tasks once the POPHAM overlay exists.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/narrative/overlays.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement loader**

```ts
// src/narrative/overlays.ts
import type { NarrativeOverlay } from "./types";
import { NarrativeOverlayFile } from "../schemas";

// Overlays are static JSON; Vite will bundle only those imported here.
// New overlays require an entry in OVERLAY_FILES plus a named import.
// Missing file (e.g. pre-overlay task ordering) MUST be tolerated — the
// file may not exist yet when this module is compiled.
const OVERLAY_FILES: Record<string, unknown> = {};

async function tryImport(apn: string): Promise<unknown | null> {
  try {
    const mod = await import(`../data/narratives/${apn}.json`);
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

const CACHE = new Map<string, NarrativeOverlay | null>();

export function loadOverlayForApn(apn: string): NarrativeOverlay | null {
  if (CACHE.has(apn)) return CACHE.get(apn) ?? null;

  const raw = OVERLAY_FILES[apn];
  if (raw === undefined) {
    CACHE.set(apn, null);
    return null;
  }
  const parsed = NarrativeOverlayFile.safeParse(raw);
  if (!parsed.success) {
    if (typeof console !== "undefined") {
      console.warn(`[narrative] overlay for ${apn} failed schema`, parsed.error);
    }
    CACHE.set(apn, null);
    return null;
  }
  CACHE.set(apn, parsed.data);
  return parsed.data;
}

export function registerOverlay(apn: string, raw: unknown): void {
  CACHE.delete(apn);
  OVERLAY_FILES[apn] = raw;
}
```

Note the `tryImport` helper is defined but not wired — we register overlays synchronously via `registerOverlay` from a single bootstrap file we add in Task 17. This keeps loader pure and test-friendly.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/narrative/overlays.test.ts`
Expected: PASS, 1 test

- [ ] **Step 6: Commit**

```bash
git add src/schemas.ts src/narrative/overlays.ts src/narrative/overlays.test.ts
git commit -m "feat(narrative): add overlay schema + registration loader"
```

---

## Task 5: Pattern registry — subdivision + deeds

**Files:**
- Create: `src/narrative/patterns.ts` (first six patterns)
- Test: `src/narrative/patterns.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/narrative/patterns.test.ts
import { describe, it, expect } from "vitest";
import { PATTERNS, findMatchingPattern } from "./patterns";
import type { PatternContext, InstrumentGroup } from "./types";
import type { Instrument } from "../types";

const popham: Parameters<typeof findMatchingPattern>[1] = {
  apn: "304-78-386",
  mode: "curated",
  allInstruments: [],
  allLinks: [],
  parcel: {
    apn: "304-78-386",
    address: "3674 E Palmer St",
    city: "Gilbert",
    state: "AZ",
    zip: "85298",
    legal_description: "Lot 46, SEVILLE PARCEL 3",
    current_owner: "POPHAM CHRISTOPHER / ASHLEY",
    type: "residential",
    subdivision: "Seville Parcel 3",
    assessor_url: "",
    instrument_numbers: [],
  } as never,
};

function groupOf(...instruments: Instrument[]): InstrumentGroup {
  return {
    instruments,
    recording_date: instruments[0].recording_date,
    same_day_group_id: instruments[0].same_day_group_id ?? null,
  };
}

function stubInstrument(overrides: Partial<Instrument>): Instrument {
  return {
    instrument_number: "20000000000",
    recording_date: "2000-01-01",
    document_type: "other",
    document_type_raw: "OTHER",
    bundled_document_types: [],
    parties: [],
    legal_description: null,
    extracted_fields: {},
    back_references: [],
    same_day_group: [],
    source_image_path: null,
    page_count: null,
    raw_api_response: {
      names: [], documentCodes: [], recordingDate: "1-1-2000",
      recordingNumber: "20000000000", pageAmount: 0, docketBook: 0,
      pageMap: 0, affidavitPresent: false, affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "",
    provenance_summary: null,
    same_day_group_id: null,
    ...overrides,
  } as Instrument;
}

describe("subdivision_plat pattern", () => {
  it("matches instrument 20010093192 (Seville Parcel 3 plat)", () => {
    const inst = stubInstrument({ instrument_number: "20010093192", recording_date: "2001-01-30" });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("subdivision_plat");
  });
});

describe("affidavit_of_correction pattern", () => {
  it("matches an affidavit back-referencing a plat", () => {
    const inst = stubInstrument({
      instrument_number: "20010849180",
      recording_date: "2001-09-14",
      back_references: ["20010093192"],
    });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("affidavit_of_correction");
  });
});

describe("purchase_from_trust pattern", () => {
  it("matches a warranty deed whose grantor is a trust", () => {
    const inst = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "THE BRIAN J. AND TANYA R. MADISON LIVING TRUST", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "CHRISTOPHER POPHAM", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ] as never,
    });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("purchase_from_trust");
  });
});

describe("purchase_from_individual pattern", () => {
  it("matches a warranty deed with an individual grantor", () => {
    const inst = stubInstrument({
      instrument_number: "20150516729",
      recording_date: "2015-06-30",
      document_type: "warranty_deed",
      parties: [
        { name: "JANE SMITH", role: "grantor", provenance: "manual_entry", confidence: 1 },
        { name: "JASON HOGUE", role: "grantee", provenance: "manual_entry", confidence: 1 },
      ] as never,
    });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("purchase_from_individual");
  });
});

describe("render output", () => {
  it("subdivision_plat renders prose with subdivision name + date", () => {
    const inst = stubInstrument({ instrument_number: "20010093192", recording_date: "2001-01-30" });
    const match = findMatchingPattern(groupOf(inst), popham)!;
    const prose = match.render(groupOf(inst), popham);
    expect(prose).toContain("Seville Parcel 3");
    expect(prose).toContain("2001");
  });
});

describe("PATTERNS registry", () => {
  it("exports patterns in first-match-wins order", () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(ids.indexOf("subdivision_plat")).toBeLessThan(ids.indexOf("purchase_from_individual"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/narrative/patterns.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement first six patterns**

```ts
// src/narrative/patterns.ts
import type { Pattern, InstrumentGroup, PatternContext } from "./types";
import type { Instrument } from "../types";
import subdivisionPlatsRaw from "../data/subdivision-plats.json";

interface SubdivisionPlatFeature {
  properties: {
    plat_instrument: string;
    display_name: string;
    plat_book: string;
    plat_page: string;
    dedicated_by: string;
    dedication_date: string;
  };
}

const PLAT_INSTRUMENTS: Record<string, SubdivisionPlatFeature["properties"]> = {};
for (const f of (subdivisionPlatsRaw as { features: SubdivisionPlatFeature[] }).features) {
  PLAT_INSTRUMENTS[f.properties.plat_instrument] = f.properties;
}

function year(date: string): string {
  return date.slice(0, 4);
}

function isTrustEntity(name: string): boolean {
  return /\b(TRUST|LIVING TRUST|FAMILY TRUST|REVOCABLE TRUST)\b/i.test(name);
}

function grantorNames(inst: Instrument): string[] {
  return inst.parties.filter((p) => p.role === "grantor").map((p) => p.name);
}

function granteeNames(inst: Instrument): string[] {
  return inst.parties.filter((p) => p.role === "grantee").map((p) => p.name);
}

function lastNameOf(fullName: string): string {
  // "CHRISTOPHER POPHAM" -> "Popham"; trust names returned verbatim.
  if (isTrustEntity(fullName)) return fullName;
  const parts = fullName.trim().split(/\s+/);
  return titleCase(parts[parts.length - 1] ?? fullName);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function grantorsPhrase(inst: Instrument): string {
  return grantorNames(inst).map(titleCase).join(" and ");
}

function granteesPhrase(inst: Instrument): string {
  const names = granteeNames(inst);
  if (names.length === 2) return `${titleCase(names[0])} and ${titleCase(names[1])}`;
  return names.map(titleCase).join(", ");
}

function granteeFamilyPhrase(inst: Instrument): string {
  const lastNames = Array.from(new Set(granteeNames(inst).map(lastNameOf)));
  if (lastNames.length === 1) return `the ${lastNames[0]}s`;
  return granteesPhrase(inst);
}

// -- Patterns (first-match-wins order) --

const subdivision_plat: Pattern = {
  id: "subdivision_plat",
  match: (g) => g.instruments.some((i) => PLAT_INSTRUMENTS[i.instrument_number] !== undefined),
  render: (g) => {
    const inst = g.instruments.find((i) => PLAT_INSTRUMENTS[i.instrument_number])!;
    const meta = PLAT_INSTRUMENTS[inst.instrument_number];
    return `Your lot was first platted as part of ${meta.display_name}, a subdivision recorded ${meta.dedication_date} by ${titleCase(meta.dedicated_by)}.`;
  },
};

const affidavit_of_correction: Pattern = {
  id: "affidavit_of_correction",
  match: (g) => g.instruments.some(
    (i) => i.back_references.some((ref) => PLAT_INSTRUMENTS[ref] !== undefined),
  ),
  render: (g) => {
    const inst = g.instruments[0];
    return `The plat was later corrected by an affidavit recorded ${inst.recording_date} — this fixed a minor legal-description issue the county caught before sales began.`;
  },
};

const purchase_from_trust: Pattern = {
  id: "purchase_from_trust",
  match: (g) => {
    const inst = g.instruments.find(isDeed);
    if (!inst) return false;
    const grantors = grantorNames(inst);
    return grantors.length > 0 && grantors.every(isTrustEntity);
  },
  render: (g) => {
    const deed = g.instruments.find(isDeed)!;
    const trustName = grantorNames(deed)[0];
    const buyers = granteeFamilyPhrase(deed);
    return `In ${year(deed.recording_date)}, ${buyers} purchased the home from ${trustName} — a revocable family living trust, a common way families pass homes between generations.`;
  },
};

const purchase_from_individual: Pattern = {
  id: "purchase_from_individual",
  match: (g) => {
    const inst = g.instruments.find(isDeed);
    if (!inst) return false;
    const grantors = grantorNames(inst);
    return grantors.length > 0 && !grantors.some(isTrustEntity);
  },
  render: (g) => {
    const deed = g.instruments.find(isDeed)!;
    const buyers = granteeFamilyPhrase(deed);
    const sellers = grantorsPhrase(deed);
    return `In ${year(deed.recording_date)}, ${buyers} bought the home from ${sellers}.`;
  },
};

function isDeed(i: Instrument): boolean {
  return (
    i.document_type === "warranty_deed" ||
    i.document_type === "special_warranty_deed" ||
    i.document_type === "quit_claim_deed" ||
    i.document_type === "grant_deed"
  );
}

export const PATTERNS: Pattern[] = [
  subdivision_plat,
  affidavit_of_correction,
  purchase_from_trust,
  purchase_from_individual,
  // Tasks 6–7 append additional patterns below this line.
];

export function findMatchingPattern(
  group: InstrumentGroup,
  ctx: PatternContext,
): Pattern | null {
  for (const p of PATTERNS) {
    if (p.match(group, ctx)) return p;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/narrative/patterns.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/narrative/patterns.ts src/narrative/patterns.test.ts
git commit -m "feat(narrative): add subdivision + deed patterns (first 4 of 14)"
```

---

## Task 6: Pattern registry — financing family

**Files:**
- Modify: `src/narrative/patterns.ts`
- Modify: `src/narrative/patterns.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/narrative/patterns.test.ts`:

```ts
describe("purchase_money_dot pattern", () => {
  it("matches a DOT same-day-grouped with a deed", () => {
    const deed = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "SELLER", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "BUYER", role: "grantee", provenance: "ocr", confidence: 1 },
      ] as never,
      same_day_group: ["20130183450"],
    });
    const dot = stubInstrument({
      instrument_number: "20130183450",
      recording_date: "2013-02-27",
      document_type: "deed_of_trust",
      parties: [
        { name: "BUYER", role: "trustor", provenance: "ocr", confidence: 1 },
        { name: "VIP MORTGAGE", role: "lender", provenance: "ocr", confidence: 1 },
      ] as never,
      same_day_group: ["20130183449"],
    });
    const ctx = { ...popham, allInstruments: [deed, dot] };
    const match = findMatchingPattern(groupOf(dot), ctx);
    expect(match?.id).toBe("purchase_money_dot");
  });
});

describe("refinance_dot pattern", () => {
  it("matches a DOT not same-day-grouped with a deed", () => {
    const dot = stubInstrument({
      instrument_number: "20210057846",
      recording_date: "2021-01-19",
      document_type: "deed_of_trust",
      parties: [
        { name: "POPHAM", role: "trustor", provenance: "ocr", confidence: 1 },
        { name: "WELLS FARGO", role: "lender", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const match = findMatchingPattern(groupOf(dot), popham);
    expect(match?.id).toBe("refinance_dot");
  });
});

describe("heloc_dot pattern", () => {
  it("matches a heloc_dot document type", () => {
    const inst = stubInstrument({ document_type: "heloc_dot" });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("heloc_dot");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/narrative/patterns.test.ts`
Expected: FAIL — 3 new tests fail

- [ ] **Step 3: Add patterns to `src/narrative/patterns.ts`**

Insert before the `PATTERNS` export:

```ts
function lenderName(inst: Instrument): string {
  const lender = inst.parties.find((p) => p.role === "lender");
  if (lender) return titleCase(lender.name);
  // Fall back to beneficiary if no explicit lender role (MERS cases etc.)
  const beneficiary = inst.parties.find((p) => p.role === "beneficiary");
  if (beneficiary?.nominee_for) return `${titleCase(beneficiary.nominee_for.party_name)}`;
  if (beneficiary) return titleCase(beneficiary.name);
  return "a lender";
}

function isDOT(i: Instrument): boolean {
  return i.document_type === "deed_of_trust";
}

const purchase_money_dot: Pattern = {
  id: "purchase_money_dot",
  match: (g, ctx) => {
    const dot = g.instruments.find(isDOT);
    if (!dot) return false;
    if (dot.same_day_group.length === 0) return false;
    return dot.same_day_group.some((n) =>
      ctx.allInstruments.some((i) => i.instrument_number === n && isDeed(i)),
    );
  },
  render: (g) => {
    const dot = g.instruments.find(isDOT)!;
    return `They financed the purchase with a mortgage from ${lenderName(dot)}, recorded the same day as the sale.`;
  },
};

const refinance_dot: Pattern = {
  id: "refinance_dot",
  match: (g, ctx) => {
    const dot = g.instruments.find(isDOT);
    if (!dot) return false;
    // Not same-day-grouped with a deed → not purchase money. Heuristic.
    const hasSameDayDeed = dot.same_day_group.some((n) =>
      ctx.allInstruments.some((i) => i.instrument_number === n && isDeed(i)),
    );
    return !hasSameDayDeed;
  },
  render: (g) => {
    const dot = g.instruments.find(isDOT)!;
    return `On ${dot.recording_date}, they refinanced with a new mortgage from ${lenderName(dot)} — a typical pattern for homeowners locking in lower rates.`;
  },
};

const heloc_dot: Pattern = {
  id: "heloc_dot",
  match: (g) => g.instruments.some((i) => i.document_type === "heloc_dot"),
  render: (g) => {
    const inst = g.instruments.find((i) => i.document_type === "heloc_dot")!;
    return `On ${inst.recording_date}, they opened a home-equity line of credit with ${lenderName(inst)}.`;
  },
};
```

Update `PATTERNS` array — insert after `purchase_from_individual`, before the "Tasks 6–7" comment:

```ts
export const PATTERNS: Pattern[] = [
  subdivision_plat,
  affidavit_of_correction,
  purchase_from_trust,
  purchase_from_individual,
  purchase_money_dot,
  heloc_dot,
  refinance_dot,
  // Task 7 patterns append below
];
```

**Ordering note:** `purchase_money_dot` must come before `refinance_dot` because every DOT matches `refinance_dot`'s predicate (which is "not same-day-grouped with a deed"), and purchase-money DOTs must short-circuit first. `heloc_dot` sits before `refinance_dot` so heloc instruments never fall through to the refi sentence.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/narrative/patterns.test.ts`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/narrative/patterns.ts src/narrative/patterns.test.ts
git commit -m "feat(narrative): add financing patterns (purchase-money, refi, heloc)"
```

---

## Task 7: Pattern registry — releases, UCC, partial, fallback

**Files:**
- Modify: `src/narrative/patterns.ts`
- Modify: `src/narrative/patterns.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/narrative/patterns.test.ts`:

```ts
describe("release_by_third_party pattern (MERS case)", () => {
  it("matches a reconveyance whose releasing_party is not the original beneficiary", () => {
    const release = stubInstrument({
      instrument_number: "20210075858",
      recording_date: "2021-01-22",
      document_type: "full_reconveyance",
      parties: [
        { name: "WELLS FARGO", role: "releasing_party", provenance: "ocr", confidence: 1 },
      ] as never,
      back_references: ["20130183450"],
    });
    const originalDot = stubInstrument({
      instrument_number: "20130183450",
      recording_date: "2013-02-27",
      document_type: "deed_of_trust",
      parties: [
        { name: "VIP MORTGAGE", role: "beneficiary", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...popham, allInstruments: [release, originalDot] };
    const match = findMatchingPattern(groupOf(release), ctx);
    expect(match?.id).toBe("release_by_third_party");
  });
});

describe("release_clean pattern", () => {
  it("matches a reconveyance whose releasing_party matches the original beneficiary", () => {
    const release = stubInstrument({
      instrument_number: "20000000009",
      recording_date: "2020-06-01",
      document_type: "full_reconveyance",
      parties: [
        { name: "VIP MORTGAGE", role: "releasing_party", provenance: "ocr", confidence: 1 },
      ] as never,
      back_references: ["20000000008"],
    });
    const dot = stubInstrument({
      instrument_number: "20000000008",
      recording_date: "2015-01-01",
      document_type: "deed_of_trust",
      parties: [
        { name: "VIP MORTGAGE", role: "beneficiary", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...popham, allInstruments: [release, dot] };
    const match = findMatchingPattern(groupOf(release), ctx);
    expect(match?.id).toBe("release_clean");
  });
});

describe("ucc_termination pattern", () => {
  it("matches a UCC termination", () => {
    const inst = stubInstrument({ document_type: "ucc_termination", recording_date: "2020-05-05" });
    const match = findMatchingPattern(groupOf(inst), popham);
    expect(match?.id).toBe("ucc_termination");
  });
});

describe("generic_recording pattern (partial mode)", () => {
  it("fires for cached-neighbor instruments when no role-aware pattern matches", () => {
    const inst = stubInstrument({
      document_type: "warranty_deed",
      parties: [], // no role data — adapter behavior
      raw_api_response: {
        names: ["SELLER SAM", "BUYER BETTY"],
        documentCodes: ["WAR DEED"],
        recordingDate: "6-15-2019",
        recordingNumber: "20190123456",
        pageAmount: 2,
        docketBook: 0, pageMap: 0, affidavitPresent: false,
        affidavitPageAmount: 0, restricted: false,
      },
    });
    const ctx = { ...popham, mode: "partial" as const };
    const match = findMatchingPattern(groupOf(inst), ctx);
    expect(match?.id).toBe("generic_recording");
  });
});

describe("partial_chain_disclosure pattern", () => {
  it("exists in the registry", () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(ids).toContain("partial_chain_disclosure");
  });
});

describe("fallback pattern", () => {
  it("is last in the registry", () => {
    expect(PATTERNS[PATTERNS.length - 1].id).toBe("fallback");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/narrative/patterns.test.ts`
Expected: 6 new tests fail

- [ ] **Step 3: Add patterns to `src/narrative/patterns.ts`**

Insert before the `PATTERNS` export:

```ts
function releasingPartyName(inst: Instrument): string | null {
  const rp = inst.parties.find((p) => p.role === "releasing_party");
  return rp ? rp.name : null;
}

function originalBeneficiary(
  releaseInst: Instrument,
  ctx: PatternContext,
): string | null {
  for (const ref of releaseInst.back_references) {
    const referenced = ctx.allInstruments.find((i) => i.instrument_number === ref);
    if (!referenced) continue;
    const ben = referenced.parties.find((p) => p.role === "beneficiary");
    if (ben) {
      // Prefer real lender when beneficiary is a nominee
      return ben.nominee_for ? ben.nominee_for.party_name : ben.name;
    }
    const lender = referenced.parties.find((p) => p.role === "lender");
    if (lender) return lender.name;
  }
  return null;
}

function namesEquivalent(a: string, b: string): boolean {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");
  return norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

const release_clean: Pattern = {
  id: "release_clean",
  match: (g, ctx) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance");
    if (!inst) return false;
    const releaser = releasingPartyName(inst);
    const original = originalBeneficiary(inst, ctx);
    if (!releaser || !original) return false;
    return namesEquivalent(releaser, original);
  },
  render: (g) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance")!;
    return `That mortgage was paid off on ${inst.recording_date}.`;
  },
};

const release_by_third_party: Pattern = {
  id: "release_by_third_party",
  match: (g, ctx) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance");
    if (!inst) return false;
    const releaser = releasingPartyName(inst);
    const original = originalBeneficiary(inst, ctx);
    if (!releaser || !original) return false;
    return !namesEquivalent(releaser, original);
  },
  render: (g, ctx) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance")!;
    const releaser = titleCase(releasingPartyName(inst)!);
    return `That mortgage was paid off on ${inst.recording_date} — the release was signed by ${releaser}, not the original lender, because the loan had been sold or transferred. The county records the release either way.`;
  },
};

const ucc_termination: Pattern = {
  id: "ucc_termination",
  match: (g) => g.instruments.some((i) => i.document_type === "ucc_termination"),
  render: (g) => {
    const inst = g.instruments.find((i) => i.document_type === "ucc_termination")!;
    return `A UCC financing statement — a filing used for personal-property collateral like solar leases — was terminated on ${inst.recording_date}.`;
  },
};

const partial_chain_disclosure: Pattern = {
  id: "partial_chain_disclosure",
  match: (_g, ctx) => ctx.mode === "partial",
  // This pattern is rendered once at the top of the timeline, separate from
  // per-group iteration. The engine handles it specially in renderTimeline.
  render: (_g, ctx) => {
    const n = ctx.allInstruments.length;
    return `The county has ${n} recorded document${n === 1 ? "" : "s"} for this parcel — here's what we can see. This isn't a complete ownership history; for older records, a title examiner would request the county archive. You're seeing the same authoritative record they'd see.`;
  },
};

const generic_recording: Pattern = {
  id: "generic_recording",
  match: (g, ctx) => ctx.mode === "partial",
  render: (g) => {
    const inst = g.instruments[0];
    const names = inst.raw_api_response.names.slice(0, 3).map(titleCase).join(", ");
    const label = docTypeLabel(inst.document_type);
    const nameList = names.length > 0 ? ` naming ${names}` : "";
    return `On ${inst.recording_date}, a ${label} was recorded for this parcel${nameList}.`;
  },
};

const fallback: Pattern = {
  id: "fallback",
  match: () => true,
  render: (g) => {
    const inst = g.instruments[0];
    return `On ${inst.recording_date}, a ${docTypeLabel(inst.document_type)} was recorded.`;
  },
};

function docTypeLabel(t: Instrument["document_type"]): string {
  const labels: Record<Instrument["document_type"], string> = {
    warranty_deed: "Warranty Deed",
    special_warranty_deed: "Special Warranty Deed",
    quit_claim_deed: "Quit Claim Deed",
    grant_deed: "Grant Deed",
    deed_of_trust: "Deed of Trust",
    assignment_of_dot: "Assignment of Deed of Trust",
    substitution_of_trustee: "Substitution of Trustee",
    full_reconveyance: "Full Reconveyance",
    partial_reconveyance: "Partial Reconveyance",
    modification: "Modification",
    heloc_dot: "HELOC Deed of Trust",
    ucc_termination: "UCC Termination",
    affidavit_of_disclosure: "Affidavit of Disclosure",
    other: "document",
  };
  return labels[t] ?? "document";
}
```

Update `PATTERNS` export:

```ts
export const PATTERNS: Pattern[] = [
  subdivision_plat,
  affidavit_of_correction,
  purchase_from_trust,
  purchase_from_individual,
  purchase_money_dot,
  heloc_dot,
  refinance_dot,
  release_clean,
  release_by_third_party,
  ucc_termination,
  generic_recording,
  fallback,
];
```

**`partial_chain_disclosure` is intentionally absent from `PATTERNS`** — it's invoked by `renderTimeline` directly once per page (the hero aside at the top of partial pages), not through the per-group `findMatchingPattern` loop.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/narrative/patterns.test.ts`
Expected: PASS, 15 tests

- [ ] **Step 5: Commit**

```bash
git add src/narrative/patterns.ts src/narrative/patterns.test.ts
git commit -m "feat(narrative): add release, UCC, partial, and fallback patterns"
```

---

## Task 8: Engine — renderTimeline + group-by-same-day

**Files:**
- Create: `src/narrative/engine.ts`
- Test: `src/narrative/engine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/narrative/engine.test.ts
import { describe, it, expect } from "vitest";
import { renderTimeline, groupBySameDay } from "./engine";
import type { PatternContext } from "./types";
import type { Instrument } from "../types";

function stubInstrument(overrides: Partial<Instrument>): Instrument {
  // Same helper as patterns.test.ts — duplicated to avoid cross-test
  // imports; for this sprint one copy per test file is acceptable.
  return {
    instrument_number: "20000000000",
    recording_date: "2000-01-01",
    document_type: "other",
    document_type_raw: "OTHER",
    bundled_document_types: [],
    parties: [],
    legal_description: null,
    extracted_fields: {},
    back_references: [],
    same_day_group: [],
    source_image_path: null,
    page_count: null,
    raw_api_response: {
      names: [], documentCodes: [], recordingDate: "1-1-2000",
      recordingNumber: "20000000000", pageAmount: 0, docketBook: 0,
      pageMap: 0, affidavitPresent: false, affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "",
    provenance_summary: null,
    same_day_group_id: null,
    ...overrides,
  } as Instrument;
}

const ctxBase: PatternContext = {
  apn: "304-78-386",
  mode: "curated",
  allInstruments: [],
  allLinks: [],
  parcel: {
    apn: "304-78-386", address: "3674 E Palmer St", city: "Gilbert",
    state: "AZ", zip: "85298", legal_description: "", current_owner: "",
    type: "residential", subdivision: "Seville Parcel 3",
    assessor_url: "", instrument_numbers: [],
  } as never,
};

describe("groupBySameDay", () => {
  it("groups instruments sharing same_day_group_id", () => {
    const a = stubInstrument({ instrument_number: "1", recording_date: "2013-02-27", same_day_group_id: "g1" });
    const b = stubInstrument({ instrument_number: "2", recording_date: "2013-02-27", same_day_group_id: "g1" });
    const c = stubInstrument({ instrument_number: "3", recording_date: "2020-01-01", same_day_group_id: null });
    const groups = groupBySameDay([a, b, c]);
    expect(groups).toHaveLength(2);
    expect(groups[0].instruments.map((i) => i.instrument_number).sort()).toEqual(["1", "2"]);
  });

  it("sorts groups chronologically by recording_date", () => {
    const a = stubInstrument({ instrument_number: "1", recording_date: "2021-01-01", same_day_group_id: null });
    const b = stubInstrument({ instrument_number: "2", recording_date: "2013-01-01", same_day_group_id: null });
    const groups = groupBySameDay([a, b]);
    expect(groups[0].recording_date).toBe("2013-01-01");
  });
});

describe("renderTimeline", () => {
  it("produces one TimelineBlock per group", () => {
    const deed = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "SELLER", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "POPHAM", role: "grantee", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...ctxBase, allInstruments: [deed] };
    const blocks = renderTimeline([deed], ctx);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].pattern_id).toBe("purchase_from_individual");
    expect(blocks[0].prose).toContain("2013");
  });

  it("emits partial_chain_disclosure block first in partial mode", () => {
    const inst = stubInstrument({
      instrument_number: "20190001234",
      recording_date: "2019-06-01",
      document_type: "warranty_deed",
      raw_api_response: { names: ["FOO", "BAR"], documentCodes: ["WAR DEED"],
        recordingDate: "6-1-2019", recordingNumber: "20190001234", pageAmount: 2,
        docketBook: 0, pageMap: 0, affidavitPresent: false,
        affidavitPageAmount: 0, restricted: false } as never,
    });
    const ctx = { ...ctxBase, mode: "partial" as const, allInstruments: [inst] };
    const blocks = renderTimeline([inst], ctx);
    expect(blocks[0].pattern_id).toBe("partial_chain_disclosure");
    expect(blocks[1].pattern_id).toBe("generic_recording");
  });

  it("attaches overlay callouts to the matching instrument's block", () => {
    const deed = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "SELLER", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "POPHAM", role: "grantee", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const ctx = { ...ctxBase, allInstruments: [deed] };
    const overlay = { hero_override: null, callouts: { "20130183449": "callout!" }, what_this_means: null, moat_note: null };
    const blocks = renderTimeline([deed], ctx, overlay);
    expect(blocks[0].callouts).toEqual(["callout!"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/narrative/engine.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/narrative/engine.ts`**

```ts
// src/narrative/engine.ts
import type { Instrument } from "../types";
import type {
  InstrumentGroup,
  PatternContext,
  TimelineBlock,
  NarrativeOverlay,
} from "./types";
import { PATTERNS, findMatchingPattern } from "./patterns";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/narrative/engine.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/narrative/engine.ts src/narrative/engine.test.ts
git commit -m "feat(narrative): add renderTimeline engine + same-day grouping"
```

---

## Task 9: Engine — renderHero

**Files:**
- Modify: `src/narrative/engine.ts`
- Modify: `src/narrative/engine.test.ts`

- [ ] **Step 1: Add failing test**

Append to `src/narrative/engine.test.ts`:

```ts
import { renderHero } from "./engine";

describe("renderHero", () => {
  it("uses overlay.hero_override when provided", () => {
    const parcel = ctxBase.parcel;
    const overlay = { hero_override: "Custom hero", callouts: {}, what_this_means: null, moat_note: null };
    const hero = renderHero(parcel, [], overlay);
    expect(hero.oneLiner).toBe("Custom hero");
    expect(hero.metaDescription).toBe("Custom hero");
  });

  it("generates a one-liner from most recent deed grantees", () => {
    const deed = stubInstrument({
      instrument_number: "20130183449",
      recording_date: "2013-02-27",
      document_type: "warranty_deed",
      parties: [
        { name: "THE MADISON LIVING TRUST", role: "grantor", provenance: "ocr", confidence: 1 },
        { name: "CHRISTOPHER POPHAM", role: "grantee", provenance: "ocr", confidence: 1 },
        { name: "ASHLEY POPHAM", role: "grantee", provenance: "ocr", confidence: 1 },
      ] as never,
    });
    const hero = renderHero(ctxBase.parcel, [deed], null);
    expect(hero.oneLiner).toContain("3674 E Palmer St");
    expect(hero.oneLiner).toMatch(/Popham/i);
    expect(hero.oneLiner).toContain("2013");
  });

  it("falls back to a generic sentence with no deeds", () => {
    const hero = renderHero(ctxBase.parcel, [], null);
    expect(hero.oneLiner).toContain("3674 E Palmer St");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/narrative/engine.test.ts`
Expected: FAIL — renderHero not exported

- [ ] **Step 3: Implement `renderHero`**

Append to `src/narrative/engine.ts`:

```ts
import type { Parcel } from "../types";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/narrative/engine.test.ts`
Expected: PASS, all previous + 3 new = 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/narrative/engine.ts src/narrative/engine.test.ts
git commit -m "feat(narrative): add renderHero with overlay override + fallback"
```

---

## Task 10: `useStoryData` hook

**Files:**
- Create: `src/hooks/useStoryData.ts`
- Test: `src/hooks/useStoryData.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useStoryData.test.ts
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStoryData } from "./useStoryData";

describe("useStoryData", () => {
  it("returns curated data for POPHAM", () => {
    const { result } = renderHook(() => useStoryData("304-78-386"));
    expect(result.current).not.toBeNull();
    expect(result.current!.mode).toBe("curated");
    expect(result.current!.parcel.current_owner).toContain("POPHAM");
    expect(result.current!.timelineBlocks.length).toBeGreaterThan(0);
  });

  it("returns partial-mode data for a cached neighbor", () => {
    const { result } = renderHook(() => useStoryData("304-78-406"));
    expect(result.current).not.toBeNull();
    expect(result.current!.mode).toBe("partial");
    expect(result.current!.timelineBlocks[0].pattern_id).toBe("partial_chain_disclosure");
  });

  it("returns null for unknown APN", () => {
    const { result } = renderHook(() => useStoryData("999-99-999"));
    expect(result.current).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useStoryData.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/hooks/useStoryData.ts
import { useMemo } from "react";
import type { StoryPageData } from "../narrative/types";
import type { Parcel, Instrument } from "../types";
import { getStoryMode } from "../narrative/availability";
import { loadOverlayForApn } from "../narrative/overlays";
import { loadCachedNeighborInstruments } from "../narrative/adapter";
import { renderTimeline, renderHero } from "../narrative/engine";
import { loadParcelDataByApn } from "../data-loader";
import parcelsRaw from "../data/parcels.json";
import adjacentRaw from "../data/adjacent-parcels.json";

interface CuratedSlice {
  parcel: Parcel;
  instruments: Instrument[];
}

function curatedParcelOrNull(apn: string): CuratedSlice | null {
  try {
    const data = loadParcelDataByApn(apn);
    return { parcel: data.parcel, instruments: data.instruments };
  } catch {
    return null;
  }
}

function partialParcelOrNull(apn: string): CuratedSlice | null {
  const instruments = loadCachedNeighborInstruments(apn);
  if (instruments.length === 0) return null;
  const parcel: Parcel = {
    apn,
    address: `APN ${apn}`,
    city: "Gilbert",
    state: "AZ",
    zip: "",
    legal_description: "",
    current_owner: "",
    type: "residential",
    subdivision: "Seville Parcel 3",
    assessor_url: `https://mcassessor.maricopa.gov/mcs/?q=${apn.replace(/-/g, "")}&mod=pd`,
    instrument_numbers: instruments.map((i) => i.instrument_number),
  } as never;
  return { parcel, instruments };
}

function neighborLinks(apn: string) {
  const all = (parcelsRaw as Array<{ apn: string; address: string }>).map((p) => p);
  const adjacent = (adjacentRaw as { features: Array<{ properties: { APN: string; SITUS_ADDRESS: string } } > }).features;

  const seen = new Set<string>([apn]);
  const results: { apn: string; address: string; mode: "curated" | "partial" }[] = [];

  for (const f of adjacent) {
    const nApn = f.properties.APN;
    if (seen.has(nApn)) continue;
    const mode = getStoryMode(nApn);
    if (!mode) continue;
    results.push({ apn: nApn, address: f.properties.SITUS_ADDRESS, mode });
    seen.add(nApn);
    if (results.length >= 5) break;
  }

  if (results.length < 5) {
    for (const p of all) {
      if (seen.has(p.apn)) continue;
      const mode = getStoryMode(p.apn);
      if (!mode) continue;
      results.push({ apn: p.apn, address: p.address, mode });
      seen.add(p.apn);
      if (results.length >= 5) break;
    }
  }

  return results;
}

export function useStoryData(apn: string): StoryPageData | null {
  return useMemo<StoryPageData | null>(() => {
    const mode = getStoryMode(apn);
    if (!mode) return null;

    const slice = mode === "curated"
      ? curatedParcelOrNull(apn)
      : partialParcelOrNull(apn);
    if (!slice) return null;

    const overlay = loadOverlayForApn(apn);

    const ctx = {
      apn,
      mode,
      allInstruments: slice.instruments,
      allLinks: [],
      parcel: slice.parcel,
    };

    const hero = renderHero(slice.parcel, slice.instruments, overlay);
    const timelineBlocks = renderTimeline(slice.instruments, ctx, overlay);

    const curatedLifecycles = mode === "curated"
      ? (() => {
          try {
            const d = loadParcelDataByApn(apn);
            return d.lifecycles.filter((lc) => lc.status === "open").map((lc) => ({
              lifecycle_id: lc.id,
              summary: `Open obligation recorded ${lc.root_instrument_date ?? ""}`,
            }));
          } catch {
            return [];
          }
        })()
      : [];

    const subdivisionLine = slice.parcel.subdivision
      ? `Part of ${slice.parcel.subdivision}.`
      : null;

    const overlayWhatThisMeans = overlay?.what_this_means ?? null;
    const whatThisMeans = overlayWhatThisMeans ??
      `This is the recorded ownership history of ${slice.parcel.address}, assembled from documents filed at the Maricopa County Recorder. If you're buying, selling, or refinancing, a title examiner would verify this chain against the same documents.`;

    const overlayMoat = overlay?.moat_note ?? null;
    const moatCallout = overlayMoat ??
      `A title-plant snapshot would show you the document list above — but the details that live only in each document's pages (legal descriptions, trust names, MERS relationships) come directly from the county's records.`;

    return {
      apn,
      mode,
      parcel: slice.parcel,
      hero,
      timelineBlocks,
      currentlyOpen: curatedLifecycles,
      neighborhood: {
        subdivision_line: subdivisionLine,
        neighbors: neighborLinks(apn),
      },
      whatThisMeans,
      moatCallout,
    };
  }, [apn]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useStoryData.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStoryData.ts src/hooks/useStoryData.test.ts
git commit -m "feat(narrative): add useStoryData composition hook"
```

---

## Task 11: StoryPage shell + route registration

**Files:**
- Create: `src/components/story/StoryPage.tsx`
- Modify: `src/router.tsx`
- Test: `src/components/story/StoryPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/story/StoryPage.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { StoryPage } from "./StoryPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/parcel/:apn/story" element={<StoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StoryPage", () => {
  it("renders the hero one-liner for POPHAM", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the 'not in this corpus' fallback for unknown APN", () => {
    renderAt("/parcel/999-99-999/story");
    expect(screen.getByText(/not in this corpus/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/story/StoryPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Create minimal StoryPage shell**

```tsx
// src/components/story/StoryPage.tsx
import { useParams } from "react-router";
import { useStoryData } from "../../hooks/useStoryData";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { NotInCorpusParcel } from "../EmptyStates";

export function StoryPage() {
  const { apn } = useParams();
  const data = useStoryData(apn ?? "");

  useDocumentMeta({
    title: data
      ? `${data.parcel.address} — Ownership Story | Maricopa County Recorder`
      : "Parcel not in this corpus | Maricopa County Recorder",
    description: data ? data.hero.metaDescription : undefined,
    ogImage: "/og-default.png",
    ogUrl: typeof window !== "undefined"
      ? `${window.location.origin}/parcel/${apn}/story`
      : undefined,
  });

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <NotInCorpusParcel
          title="Parcel not in this corpus"
          message={apn ? `APN ${apn} is not in the curated or cached set.` : undefined}
        />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
      <h1 className="text-3xl font-semibold text-recorder-900 leading-tight">
        {data.hero.oneLiner}
      </h1>
      {/* Tasks 12–16 add the remaining sections here. */}
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/story/StoryPage.test.tsx`
Expected: PASS, 2 tests

- [ ] **Step 5: Register route in `src/router.tsx`**

Add import near the other component imports:

```ts
import { StoryPage } from "./components/story/StoryPage";
```

Add entry to the `AppShell` children `routes` array (after `encumbrance-instrument` and before `instrument-resolver`):

```ts
{
  id: "story",
  path: "parcel/:apn/story",
  element: <StoryPage />,
},
```

- [ ] **Step 6: Hide the terminology toggle on story routes**

The spec requires the header's Professional/Plain terminology toggle to be hidden on `/parcel/:apn/story` URLs (narrative prose doesn't interact with the glossary). Edit `src/App.tsx` — inside `AppShell`, compute a new match:

```ts
const matchStory = useMatch("/parcel/:apn/story");
const onStory = matchStory !== null;
```

Wrap the existing terminology toggle `<div>` (the block currently containing "Terminology: / Professional / Plain English") in a conditional:

```tsx
{!onStory && (
  <div className="flex items-center gap-1 text-xs">
    {/* existing toggle buttons unchanged */}
  </div>
)}
```

No other nav elements change.

- [ ] **Step 7: Smoke-check build + lint**

Run: `npx tsc -b && npm run lint`
Expected: both clean. Navigate to `/parcel/304-78-386/story` — toggle is absent. Navigate to `/parcel/304-78-386` — toggle is present.

- [ ] **Step 8: Commit**

```bash
git add src/components/story/StoryPage.tsx src/components/story/StoryPage.test.tsx src/router.tsx src/App.tsx
git commit -m "feat(narrative): register /parcel/:apn/story route + page shell"
```

---

## Task 12: StoryHero + StoryCurrentClaims components

**Files:**
- Create: `src/components/story/StoryHero.tsx`
- Create: `src/components/story/StoryCurrentClaims.tsx`
- Modify: `src/components/story/StoryPage.tsx`

- [ ] **Step 1: Implement StoryHero**

```tsx
// src/components/story/StoryHero.tsx
import type { StoryPageData } from "../../narrative/types";

export function StoryHero({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-hero">
      <h1 id="story-hero" className="text-3xl md:text-4xl font-semibold text-recorder-900 leading-tight">
        {data.hero.oneLiner}
      </h1>
      <p className="mt-2 text-xs text-slate-500">
        APN <span className="font-mono">{data.parcel.apn}</span>
        {data.parcel.subdivision ? ` · ${data.parcel.subdivision}` : null}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Implement StoryCurrentClaims**

```tsx
// src/components/story/StoryCurrentClaims.tsx
import type { StoryPageData } from "../../narrative/types";

export function StoryCurrentClaims({ data }: { data: StoryPageData }) {
  const heading = "Currently open claims";
  if (data.mode === "partial") {
    return (
      <section aria-labelledby="story-current">
        <h2 id="story-current" className="text-lg font-semibold text-recorder-900">{heading}</h2>
        <p className="mt-2 text-sm text-slate-700 max-w-prose">
          We don't have enough documents on file for this parcel to determine which claims are currently open. A title examiner would request older records from the county archive — the county has them.
        </p>
      </section>
    );
  }
  if (data.currentlyOpen.length === 0) {
    return (
      <section aria-labelledby="story-current">
        <h2 id="story-current" className="text-lg font-semibold text-recorder-900">{heading}</h2>
        <p className="mt-2 text-sm text-slate-700 max-w-prose">
          No claims are currently open against this property.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="story-current">
      <h2 id="story-current" className="text-lg font-semibold text-recorder-900">{heading}</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700 max-w-prose">
        {data.currentlyOpen.map((c) => (
          <li key={c.lifecycle_id}>{c.summary}</li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Wire both into StoryPage**

Replace the contents of `<main>` in `src/components/story/StoryPage.tsx`:

```tsx
return (
  <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
    <StoryHero data={data} />
    {/* StoryTimeline added in Task 13 */}
    <StoryCurrentClaims data={data} />
    {/* StoryNeighborhood added in Task 14 */}
    {/* StoryWhatThisMeans + StoryMoatCallout added in Task 15 */}
    {/* StoryFooterCtas added in Task 16 */}
  </main>
);
```

Add imports at top:

```ts
import { StoryHero } from "./StoryHero";
import { StoryCurrentClaims } from "./StoryCurrentClaims";
```

Remove the now-redundant `<h1>` block that was in the minimal shell.

- [ ] **Step 4: Verify tests pass**

Run: `npx vitest run src/components/story/StoryPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/story/StoryHero.tsx src/components/story/StoryCurrentClaims.tsx src/components/story/StoryPage.tsx
git commit -m "feat(narrative): add StoryHero + StoryCurrentClaims sections"
```

---

## Task 13: StoryTimeline component

**Files:**
- Create: `src/components/story/StoryTimeline.tsx`
- Modify: `src/components/story/StoryPage.tsx`

- [ ] **Step 1: Implement StoryTimeline**

```tsx
// src/components/story/StoryTimeline.tsx
import type { StoryPageData } from "../../narrative/types";

export function StoryTimeline({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-timeline">
      <h2 id="story-timeline" className="text-lg font-semibold text-recorder-900">
        Ownership history
      </h2>
      <div className="mt-3 space-y-4 max-w-prose">
        {data.timelineBlocks.map((block, i) => (
          <div key={`${block.pattern_id}-${i}`}>
            <p className="text-[15px] leading-relaxed text-slate-800">{block.prose}</p>
            {block.callouts.map((c, j) => (
              <aside
                key={j}
                className="mt-2 pl-3 border-l-2 border-moat-300 text-sm text-slate-600"
              >
                {c}
              </aside>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into StoryPage**

Add import:

```ts
import { StoryTimeline } from "./StoryTimeline";
```

Replace the timeline placeholder comment with the component in the render tree, placed after `<StoryHero />` and before `<StoryCurrentClaims />`:

```tsx
<StoryHero data={data} />
<StoryTimeline data={data} />
<StoryCurrentClaims data={data} />
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx vitest run src/components/story/StoryPage.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/story/StoryTimeline.tsx src/components/story/StoryPage.tsx
git commit -m "feat(narrative): add StoryTimeline with inline callout asides"
```

---

## Task 14: StoryNeighborhood component

**Files:**
- Create: `src/components/story/StoryNeighborhood.tsx`
- Modify: `src/components/story/StoryPage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/story/StoryNeighborhood.tsx
import { Link } from "react-router";
import type { StoryPageData } from "../../narrative/types";

export function StoryNeighborhood({ data }: { data: StoryPageData }) {
  const { subdivision_line, neighbors } = data.neighborhood;

  if (neighbors.length === 0 && !subdivision_line) {
    return null;
  }

  return (
    <section aria-labelledby="story-neighborhood">
      <h2 id="story-neighborhood" className="text-lg font-semibold text-recorder-900">
        In your neighborhood
      </h2>
      <div className="mt-2 space-y-2 max-w-prose text-sm text-slate-700">
        {subdivision_line && <p>{subdivision_line}</p>}
        {neighbors.length > 0 && (
          <p>
            Your neighbors with records in the county's cache:{" "}
            {neighbors.map((n, i) => (
              <span key={n.apn}>
                <Link
                  to={`/parcel/${n.apn}/story`}
                  className="text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
                >
                  {n.address}
                </Link>
                {i < neighbors.length - 1 ? ", " : ""}
              </span>
            ))}
            .
          </p>
        )}
        {neighbors.length > 0 && neighbors.length < 5 && (
          <p className="text-xs text-slate-500">We index neighbors as we add them.</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into StoryPage**

Add import and place after `<StoryCurrentClaims />`:

```tsx
import { StoryNeighborhood } from "./StoryNeighborhood";

// in render:
<StoryCurrentClaims data={data} />
<StoryNeighborhood data={data} />
```

- [ ] **Step 3: Test + commit**

```bash
npx vitest run src/components/story/StoryPage.test.tsx
git add src/components/story/StoryNeighborhood.tsx src/components/story/StoryPage.tsx
git commit -m "feat(narrative): add StoryNeighborhood with crosslinks"
```

Expected: tests pass; commit succeeds.

---

## Task 15: StoryWhatThisMeans + StoryMoatCallout

**Files:**
- Create: `src/components/story/StoryWhatThisMeans.tsx`
- Create: `src/components/story/StoryMoatCallout.tsx`
- Modify: `src/components/story/StoryPage.tsx`

- [ ] **Step 1: Implement StoryWhatThisMeans**

```tsx
// src/components/story/StoryWhatThisMeans.tsx
import type { StoryPageData } from "../../narrative/types";

export function StoryWhatThisMeans({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-what-this-means" className="rounded-md bg-recorder-50 border border-recorder-100 p-4">
      <h2 id="story-what-this-means" className="text-base font-semibold text-recorder-900">
        What this means for you
      </h2>
      <p className="mt-2 text-sm text-slate-700 max-w-prose">{data.whatThisMeans}</p>
    </section>
  );
}
```

- [ ] **Step 2: Implement StoryMoatCallout**

```tsx
// src/components/story/StoryMoatCallout.tsx
import { Link } from "react-router";
import type { StoryPageData } from "../../narrative/types";

export function StoryMoatCallout({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-moat" className="border-l-4 border-moat-500 pl-4 py-2">
      <h2 id="story-moat" className="text-base font-semibold text-moat-800">
        Why this comes from the county, not a title plant
      </h2>
      <p className="mt-2 text-sm text-slate-700 max-w-prose">
        {data.moatCallout}{" "}
        <Link
          to="/moat-compare"
          className="text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        >
          See how we compare to a title plant →
        </Link>
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Wire into StoryPage**

Add imports and place after `<StoryNeighborhood />`:

```tsx
import { StoryWhatThisMeans } from "./StoryWhatThisMeans";
import { StoryMoatCallout } from "./StoryMoatCallout";

// in render:
<StoryNeighborhood data={data} />
<StoryWhatThisMeans data={data} />
<StoryMoatCallout data={data} />
```

- [ ] **Step 4: Test + commit**

```bash
npx vitest run src/components/story/StoryPage.test.tsx
git add src/components/story/StoryWhatThisMeans.tsx src/components/story/StoryMoatCallout.tsx src/components/story/StoryPage.tsx
git commit -m "feat(narrative): add what-this-means + inline moat callout"
```

Expected: tests pass.

---

## Task 16: StoryFooterCtas + Subscribe stub route

**Files:**
- Create: `src/components/story/StoryFooterCtas.tsx`
- Create: `src/components/SubscribePlaceholder.tsx`
- Modify: `src/components/story/StoryPage.tsx`
- Modify: `src/router.tsx`

- [ ] **Step 1: Implement StoryFooterCtas**

```tsx
// src/components/story/StoryFooterCtas.tsx
import { Link } from "react-router";
import type { StoryPageData } from "../../narrative/types";

export function StoryFooterCtas({ data }: { data: StoryPageData }) {
  const ctas = [
    { to: `/parcel/${data.apn}`, label: "Read the examiner's detailed chain →" },
    { to: `/parcel/${data.apn}/commitment/new`, label: "Export as commitment →" },
    { to: `/parcel/${data.apn}/encumbrances`, label: "See all claims against this parcel →" },
    { to: `/subscribe?apn=${data.apn}`, label: "Subscribe to new filings on this parcel →" },
  ];
  return (
    <nav aria-label="Actions for this parcel" className="border-t border-slate-200 pt-4 mt-6">
      <p className="text-xs text-slate-500 mb-2">
        All facts on this page cite recorded documents.
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {ctas.map((c) => (
          <li key={c.to}>
            <Link
              to={c.to}
              className="text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Implement SubscribePlaceholder**

```tsx
// src/components/SubscribePlaceholder.tsx
import { Link, useSearchParams } from "react-router";

export function SubscribePlaceholder() {
  const [params] = useSearchParams();
  const apn = params.get("apn");
  return (
    <main className="max-w-xl mx-auto px-6 py-12 text-slate-800">
      <h1 className="text-2xl font-semibold text-recorder-900">
        Subscribe to new filings{apn ? ` for parcel ${apn}` : ""}
      </h1>
      <p className="mt-3 text-sm leading-relaxed">
        This feature is coming. When a new document is recorded against
        {apn ? ` ${apn}` : " a parcel you're watching"}, the county portal
        will email or text you the same day — no third-party plant, no lag.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Title-plant vendors batch their updates every 4–7 days. The county
        can offer this because the county owns the recording pipeline.
      </p>
      {apn && (
        <p className="mt-6 text-sm">
          <Link to={`/parcel/${apn}/story`} className="text-moat-700 hover:underline">
            ← Back to this parcel's story
          </Link>
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Register subscribe route in `src/router.tsx`**

Add import:

```ts
import { SubscribePlaceholder } from "./components/SubscribePlaceholder";
```

Add entry inside the `AppShell` children array:

```ts
{
  id: "subscribe",
  path: "subscribe",
  element: <SubscribePlaceholder />,
},
```

- [ ] **Step 4: Wire footer into StoryPage**

```tsx
import { StoryFooterCtas } from "./StoryFooterCtas";

// in render, after StoryMoatCallout:
<StoryMoatCallout data={data} />
<StoryFooterCtas data={data} />
```

- [ ] **Step 5: Test + commit**

```bash
npx vitest run src/components/story/StoryPage.test.tsx && npx tsc -b
git add src/components/story/StoryFooterCtas.tsx src/components/SubscribePlaceholder.tsx src/components/story/StoryPage.tsx src/router.tsx
git commit -m "feat(narrative): add footer CTAs + subscribe stub route"
```

Expected: tests + typecheck pass.

---

## Task 17: POPHAM narrative overlay (full)

**Files:**
- Create: `src/data/narratives/304-78-386.json`
- Create: `src/narrative/register-overlays.ts`
- Modify: `src/narrative/overlays.ts` (wire import)
- Modify: `src/main.tsx` (or wherever `TerminologyProvider` is rendered — wire the registration)

- [ ] **Step 1: Create POPHAM overlay file**

```json
{
  "hero_override": "3674 E Palmer St in Gilbert is owned by Christopher & Ashley Popham, who bought the home from the Madison Family Living Trust in February 2013. One mortgage is currently open with Wells Fargo.",
  "callouts": {
    "20130183449": "The Madison Living Trust selling the house is the piece of data the county has that a title plant doesn't: the trust's full name and its 2006 execution date live only in the deed's PDF body. The county preserves them; the plant drops them.",
    "20210057846": "The refinance was recorded three days before the old mortgage was paid off — the standard pattern lenders use so the new loan is on title before the old one comes off.",
    "20210075858": "This release was signed by Wells Fargo via CAS Nationwide Title Clearing, not by VIP Mortgage. The note moved between servicers outside the public record — MERS, the Mortgage Electronic Registration Systems, exists precisely to track that invisible transfer. The county records the release either way; a title plant has to guess which entity actually held the loan."
  },
  "what_this_means": "If you're selling or refinancing 3674 E Palmer St, a title examiner would look at exactly what you see here — plus deeper context on the 2013 Madison Trust conveyance and the 2021 MERS-signed release. Both are well-documented and resolvable; they're the kind of details the county preserves so the next buyer doesn't inherit a mystery.",
  "moat_note": "A title-plant snapshot of this parcel would show you the instrument list, but would miss the Madison Trust's full name, the Seville Parcel 3 plat reference (Book 554, Page 19), and the MERS-as-nominee relationship on the 2013 mortgage. Those live only in the documents the county holds."
}
```

- [ ] **Step 2: Create registration module**

```ts
// src/narrative/register-overlays.ts
import { registerOverlay } from "./overlays";
import popham from "../data/narratives/304-78-386.json";
import hogue from "../data/narratives/304-77-689.json";
import warner from "../data/narratives/304-78-374.json";
import lowry from "../data/narratives/304-78-383.json";
import seville from "../data/narratives/304-78-409.json";

registerOverlay("304-78-386", popham);
registerOverlay("304-77-689", hogue);
registerOverlay("304-78-374", warner);
registerOverlay("304-78-383", lowry);
registerOverlay("304-78-409", seville);
```

*Wire this module in `src/main.tsx`* by adding at the top:

```ts
import "./narrative/register-overlays";
```

**Important:** The 4 non-POPHAM JSON files don't exist yet — Task 18 creates them. The registration module will fail to import until Task 18 completes. To keep CI green between tasks, stub the 4 missing files in this task with minimal valid overlays:

For each of `304-77-689.json`, `304-78-374.json`, `304-78-383.json`, `304-78-409.json` create:

```json
{
  "hero_override": null,
  "callouts": {},
  "what_this_means": null,
  "moat_note": null
}
```

Task 18 fills in the real `what_this_means` content.

- [ ] **Step 3: Add assertion test for POPHAM overlay**

Append to `src/narrative/overlays.test.ts`:

```ts
import "./register-overlays";

describe("POPHAM overlay", () => {
  it("is loaded and has a hero_override", () => {
    const ov = loadOverlayForApn("304-78-386");
    expect(ov).not.toBeNull();
    expect(ov!.hero_override).toContain("3674 E Palmer St");
    expect(ov!.callouts["20130183449"]).toContain("Madison");
  });
});
```

- [ ] **Step 4: Run tests + verify SEO hero works**

```bash
npx vitest run src/narrative/overlays.test.ts
```

Expected: PASS.

Also verify the page manually:

```bash
npm run dev
# Navigate to http://localhost:5173/parcel/304-78-386/story
# Confirm hero text matches overlay.hero_override, not generated text.
```

- [ ] **Step 5: Commit**

```bash
git add src/data/narratives/ src/narrative/register-overlays.ts src/main.tsx src/narrative/overlays.test.ts
git commit -m "feat(narrative): add POPHAM overlay + registration"
```

---

## Task 18: Four other curated-parcel overlays

**Files:**
- Modify: `src/data/narratives/304-77-689.json` (HOGUE)
- Modify: `src/data/narratives/304-78-374.json` (WARNER)
- Modify: `src/data/narratives/304-78-383.json` (LOWRY)
- Modify: `src/data/narratives/304-78-409.json` (Seville HOA)

Each gets a `what_this_means` paragraph appropriate to the parcel. The other fields stay null.

- [ ] **Step 1: HOGUE (304-77-689)**

Replace `src/data/narratives/304-77-689.json`:

```json
{
  "hero_override": null,
  "callouts": {},
  "what_this_means": "If you're researching 2715 E Palmer St, the recorded history here is short — just the 2015 purchase and its mortgage. Older records and any releases prior to 2015 would need to be pulled from the county's archive. The absence of a recorded release for an older loan isn't a problem flag by itself; it's the kind of thing a title examiner would ask about during a search.",
  "moat_note": null
}
```

- [ ] **Step 2: WARNER (304-78-374)**

```json
{
  "hero_override": null,
  "callouts": {},
  "what_this_means": "This parcel's recorded history starts with the subdivision plat, then a 2013 sale. A homeowner reviewing their own title would look at the current mortgage status and whether any older releases need to be recorded; a title examiner would do the same before clearing the property for sale.",
  "moat_note": null
}
```

- [ ] **Step 3: LOWRY (304-78-383)**

```json
{
  "hero_override": null,
  "callouts": {},
  "what_this_means": "3702 E Palmer St shares the same Seville Parcel 3 plat as its neighbors and has its own recorded ownership history on file. If you're considering buying or selling here, the details a title examiner checks — the sequence of deeds, open mortgages, and any subdivision-level encumbrances — all trace back to recordings like the ones listed above.",
  "moat_note": null
}
```

- [ ] **Step 4: Seville HOA (304-78-409)**

```json
{
  "hero_override": null,
  "callouts": {},
  "what_this_means": "This parcel is the common-area tract for Seville Parcel 3 — owned by the homeowners association on behalf of every lot in the subdivision. It doesn't change hands the way a residential lot does, but its recorded history (the original plat and the affidavit of correction) is what gives every other lot its legal boundary.",
  "moat_note": null
}
```

- [ ] **Step 5: Verify build + spot-check renders**

```bash
npx tsc -b && npx vitest run
npm run dev
# Visit /parcel/304-77-689/story — should show HOGUE's what-this-means paragraph
# Visit /parcel/304-78-374/story — WARNER
# Visit /parcel/304-78-383/story — LOWRY
# Visit /parcel/304-78-409/story — Seville HOA
```

- [ ] **Step 6: Commit**

```bash
git add src/data/narratives/304-77-689.json src/data/narratives/304-78-374.json src/data/narratives/304-78-383.json src/data/narratives/304-78-409.json
git commit -m "feat(narrative): add what-this-means overlays for HOGUE, WARNER, LOWRY, Seville HOA"
```

---

## Task 19: PersonaRow retarget

**Files:**
- Modify: `src/components/PersonaRow.tsx`
- Modify: `src/components/PersonaRow.test.tsx`

- [ ] **Step 1: Update test first**

Find the test that asserts the "For homeowners" navigation target and change the expected path from `/parcel/304-78-386` to `/parcel/304-78-386/story`. The assertion typically looks like `expect(navigate).toHaveBeenCalledWith("/parcel/304-78-386")` — update to `/parcel/304-78-386/story`.

Add a new test that verifies the terminology mode is no longer switched (since narrative mode replaces the need for it):

```tsx
it("does NOT change terminology mode when navigating to the story", () => {
  const setMode = vi.fn();
  // ... render with a mocked TerminologyContext exposing setMode ...
  fireEvent.click(screen.getByRole("button", { name: /for homeowners/i }));
  expect(setMode).not.toHaveBeenCalled();
});
```

Alternatively, if `setMode` in the existing test is being called with "plain", keep that test but update the assertion path — the existing behavior of switching to "plain" is still valuable for a homeowner who clicks "See examiner's chain" from the story. Pick one approach consistent with the existing test style.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PersonaRow.test.tsx`
Expected: FAIL

- [ ] **Step 3: Update PersonaRow.tsx**

In `src/components/PersonaRow.tsx` change `goHomeowner`:

```ts
const goHomeowner = () => {
  navigate("/parcel/304-78-386/story");
};
```

Remove the `setMode("plain")` call; narrative mode does not depend on the terminology toggle. If the test in Step 1 kept the `setMode` call, leave it. Otherwise drop the `useTerminology` import if it's no longer needed.

Update the aria-label to match the new destination:

```tsx
aria-label="For homeowners — read this parcel's ownership story"
```

- [ ] **Step 4: Run tests + commit**

```bash
npx vitest run src/components/PersonaRow.test.tsx
git add src/components/PersonaRow.tsx src/components/PersonaRow.test.tsx
git commit -m "feat(narrative): retarget homeowner persona button to story page"
```

Expected: tests pass.

---

## Task 20: ChainOfTitle "Read as a story →" link

**Files:**
- Modify: `src/components/ChainOfTitle.tsx`

- [ ] **Step 1: Add import**

At the top of `src/components/ChainOfTitle.tsx`:

```ts
import { Link } from "react-router";
import { storyPageExists } from "../narrative/availability";
```

- [ ] **Step 2: Add the link next to the heading**

Replace the existing heading block:

```tsx
<TermSection id="chain-heading">
  <div className="mb-6">
    <h2 className="text-2xl font-bold text-gray-800"><Term professional="Chain of Title" /></h2>
    <p className="text-sm text-gray-500 mt-1">
      {parcel.address} &mdash; APN: <span className="font-mono">{parcel.apn}</span>
    </p>
  </div>
</TermSection>
```

with:

```tsx
<TermSection id="chain-heading">
  <div className="mb-6">
    <div className="flex items-baseline gap-3 flex-wrap">
      <h2 className="text-2xl font-bold text-gray-800"><Term professional="Chain of Title" /></h2>
      {storyPageExists(parcel.apn) && (
        <Link
          to={`/parcel/${parcel.apn}/story`}
          className="text-xs text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        >
          Read as a story →
        </Link>
      )}
    </div>
    <p className="text-sm text-gray-500 mt-1">
      {parcel.address} &mdash; APN: <span className="font-mono">{parcel.apn}</span>
    </p>
  </div>
</TermSection>
```

- [ ] **Step 3: Verify existing ChainOfTitle tests still pass**

Run: `npx vitest run src/components/ChainOfTitle`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ChainOfTitle.tsx
git commit -m "feat(narrative): add 'Read as a story →' link on professional chain view"
```

---

## Task 21: FeaturedParcels secondary "Read the story" link

**Files:**
- Modify: `src/components/FeaturedParcels.tsx`
- Modify: `src/components/FeaturedParcels.test.tsx`

- [ ] **Step 1: Read current component + tests**

Read `src/components/FeaturedParcels.tsx` and its test file to understand the card structure.

- [ ] **Step 2: Add link + test assertion**

In `FeaturedParcels.tsx`, for each parcel card add a secondary link to `/parcel/:apn/story` beneath the existing primary CTA. Example (the exact JSX depends on current structure — keep to the existing card's visual layout):

```tsx
<Link
  to={`/parcel/${parcel.apn}/story`}
  className="text-xs text-moat-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
>
  Read the story →
</Link>
```

Add a test assertion in `FeaturedParcels.test.tsx`:

```ts
it("renders a 'Read the story' link for each curated parcel", () => {
  renderWithRouter(<FeaturedParcels />);
  expect(screen.getAllByRole("link", { name: /read the story/i }).length).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Verify + commit**

```bash
npx vitest run src/components/FeaturedParcels.test.tsx
git add src/components/FeaturedParcels.tsx src/components/FeaturedParcels.test.tsx
git commit -m "feat(narrative): add secondary story link on featured parcel cards"
```

Expected: tests pass.

---

## Task 22: Integration test + final QA sweep

**Files:**
- Modify: `src/components/story/StoryPage.test.tsx` (add integration assertions)
- Run full QA

- [ ] **Step 1: Expand StoryPage integration tests**

Append to `src/components/story/StoryPage.test.tsx`:

```tsx
describe("StoryPage integration — POPHAM (curated)", () => {
  it("renders all 7 sections", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/3674 E Palmer St/i);
    expect(screen.getByRole("heading", { name: /ownership history/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /currently open claims/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /in your neighborhood/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what this means for you/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /why this comes from the county/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /actions for this parcel/i })).toBeInTheDocument();
  });

  it("includes the MERS transparency callout in prose", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByText(/MERS/i)).toBeInTheDocument();
  });

  it("links to /moat-compare from the moat callout", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("link", { name: /compare to a title plant/i })).toHaveAttribute("href", "/moat-compare");
  });

  it("links to 4 footer CTAs including subscribe", () => {
    renderAt("/parcel/304-78-386/story");
    expect(screen.getByRole("link", { name: /examiner's detailed chain/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /export as commitment/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all claims/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /subscribe to new filings/i })).toBeInTheDocument();
  });
});

describe("StoryPage integration — 304-78-406 (cached neighbor, partial)", () => {
  it("renders the partial-chain disclosure", () => {
    renderAt("/parcel/304-78-406/story");
    expect(screen.getByText(/the county has \d+ recorded document/i)).toBeInTheDocument();
  });

  it("renders a partial-specific empty state for currently open claims", () => {
    renderAt("/parcel/304-78-406/story");
    expect(screen.getByText(/don't have enough documents/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the whole test suite**

Run: `npx vitest run`
Expected: ALL PASS, no regressions.

- [ ] **Step 3: Typecheck + lint + build**

Run in sequence:

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: all clean.

- [ ] **Step 4: Manual browser QA — the 10 story URLs**

```bash
npm run dev
```

Visit each URL and confirm the page renders without console errors:

- `/parcel/304-78-386/story` — POPHAM (full story, MERS note visible)
- `/parcel/304-77-689/story` — HOGUE (full curated, what-this-means visible)
- `/parcel/304-78-374/story` — WARNER
- `/parcel/304-78-383/story` — LOWRY
- `/parcel/304-78-409/story` — Seville HOA common tract
- `/parcel/304-78-338/story` — cached neighbor (partial)
- `/parcel/304-78-367/story` — cached neighbor (partial)
- `/parcel/304-78-369/story` — cached neighbor (partial)
- `/parcel/304-78-406/story` — cached neighbor (partial)
- `/parcel/304-78-408/story` — cached neighbor (partial)
- `/parcel/999-99-999/story` — "Parcel not in this corpus" fallback
- `/` — click "For homeowners" → lands on POPHAM story
- `/parcel/304-78-386` → see "Read as a story →" link near heading
- `/subscribe?apn=304-78-386` → placeholder page renders

Open browser devtools on at least POPHAM's story page and confirm:
- `document.title` contains "3674 E Palmer St" and "Ownership Story"
- `<meta name="description">` matches the hero one-liner

- [ ] **Step 5: Commit integration tests**

```bash
git add src/components/story/StoryPage.test.tsx
git commit -m "test(narrative): add StoryPage integration coverage for curated + partial modes"
```

- [ ] **Step 6: Final sanity commit**

If everything checks out, the branch is ready to merge. Push if authorized.

```bash
git log --oneline -25
```

Expected: a clean series of narrative-* feat commits from Task 1 through Task 22.
