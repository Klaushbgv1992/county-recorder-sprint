# Homeowner Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reverse the polarity of the landing page so unauthenticated visitors land on a homeowner-shaped hero that answers the four questions a homeowner actually asks; keep the examiner experience one click away; fix the naive-pluralization bugs that make the story view say "The Llcs bought" and "…Living Trust, dated February 23, 2006s bought".

**Architecture:**
1. A `usePortalMode` hook reads `?mode=` from the URL, falls back to `localStorage.portalMode`, defaults to `"homeowner"`. The landing page swaps its hero region based on mode and always renders a top-right toggle. Map + plant-vs-county band stay in place.
2. A new `/parcel/:apn/home` route renders `HomeownerCardPage` — four stacked question cards (title clean? / last sale / open liens / lender history) computed from the existing curated data, each with a "See the evidence →" deep link into the examiner views. Provenance tags re-used verbatim from the instrument fields.
3. Narrative pluralization is fixed once in a shared `subjectPhraseFromParties` helper; `patterns.ts` and `engine.ts` both delegate to it. Entity suffixes (LLC, TRUST, INC, CORP, CO, LP, LLP, COMPANY, PARTNERSHIP, ESTATE) are detected; entities render as a clean proper noun without the "the ___s" wrapper.

**Tech Stack:** React 19, react-router v7, Vitest + Testing Library, Tailwind v4. URL state via `useSearchParams`; persistence via `localStorage`. No new deps.

**Coordination note:** Agent 3 is editing `src/components/LandingPage.tsx` in parallel to promote party-name search. This plan confines edits to (a) the hero region above the walkthrough banner and (b) a single anchor comment where Agent 3's card slots in. Do not touch the PlantVsCountyProof, CountyMap, OverlayToggles, AnomalySummaryPanel, ParcelDrawer, or FeaturedParcels regions.

---

## File Structure

### New files
- `src/hooks/usePortalMode.ts` — URL + localStorage mode state, typed `"homeowner" | "examiner"`
- `src/hooks/usePortalMode.test.ts` — unit tests for the hook
- `src/components/PortalModeToggle.tsx` — top-right toggle button
- `src/components/PortalModeToggle.test.tsx` — toggle rendering + click
- `src/components/HomeownerHero.tsx` — homeowner-shaped hero (address-only search, no jargon)
- `src/components/HomeownerHero.test.tsx`
- `src/components/homeowner/HomeownerCardPage.tsx` — `/parcel/:apn/home` route
- `src/components/homeowner/HomeownerCardPage.test.tsx`
- `src/components/homeowner/TitleCleanCard.tsx`
- `src/components/homeowner/LastSaleCard.tsx`
- `src/components/homeowner/OpenLiensCard.tsx`
- `src/components/homeowner/LenderHistoryCard.tsx`
- `src/components/homeowner/cards.test.tsx` — one file covering all four cards
- `src/logic/homeowner-answers.ts` — pure functions that compute the four answers from Parcel + Instrument[] + EncumbranceLifecycle[]
- `src/logic/homeowner-answers.test.ts`
- `src/narrative/subject-phrase.ts` — shared grantee-subject phrase with entity detection
- `src/narrative/subject-phrase.test.ts`

### Modified files
- `src/narrative/patterns.ts` — delete local `granteeFamilyPhrase` + `lastNameOf`; import from `subject-phrase.ts`
- `src/narrative/engine.ts` — delete local `granteeFamilyShortForm` + `titleCaseName`; import from `subject-phrase.ts`
- `src/components/LandingPage.tsx` — swap the hero region for a mode-aware hero; add Agent 3 anchor comment
- `src/router.tsx` — add `/parcel/:apn/home` route

---

## Task 1: Fix narrative pluralization — shared subject-phrase helper

**Files:**
- Create: `src/narrative/subject-phrase.ts`
- Create: `src/narrative/subject-phrase.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/narrative/subject-phrase.test.ts
import { describe, it, expect } from "vitest";
import { subjectPhraseFromParties, isEntityName, cleanEntityName } from "./subject-phrase";
import type { Party } from "../types";

function grantees(...names: string[]): Party[] {
  return names.map((name) => ({
    name,
    role: "grantee" as const,
    provenance: "manual_entry" as const,
    confidence: 0.9,
  }));
}

describe("isEntityName", () => {
  it("detects LLC, L.L.C., INC, CORP, CORPORATION, CO, L.P., LP, LLP, COMPANY, PARTNERSHIP, ESTATE, TRUST", () => {
    expect(isEntityName("ABC PROPERTIES LLC")).toBe(true);
    expect(isEntityName("Acme, L.L.C.")).toBe(true);
    expect(isEntityName("WIDGET INC")).toBe(true);
    expect(isEntityName("WIDGET INC.")).toBe(true);
    expect(isEntityName("BIG CORP")).toBe(true);
    expect(isEntityName("Big Corporation")).toBe(true);
    expect(isEntityName("Foo Co.")).toBe(true);
    expect(isEntityName("Foo, L.P.")).toBe(true);
    expect(isEntityName("Foo LP")).toBe(true);
    expect(isEntityName("Foo LLP")).toBe(true);
    expect(isEntityName("Foo Company")).toBe(true);
    expect(isEntityName("Foo Partnership")).toBe(true);
    expect(isEntityName("ESTATE OF JANE DOE")).toBe(true);
    expect(isEntityName("THE MADISON LIVING TRUST")).toBe(true);
    expect(isEntityName("THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006")).toBe(true);
  });

  it("does not flag individuals", () => {
    expect(isEntityName("POPHAM CHRISTOPHER")).toBe(false);
    expect(isEntityName("HOGUE JASON")).toBe(false);
    expect(isEntityName("JOHN SMITH")).toBe(false);
  });
});

describe("cleanEntityName", () => {
  it("title-cases ALL-CAPS entity names while preserving common acronyms", () => {
    expect(cleanEntityName("ABC PROPERTIES LLC")).toBe("ABC Properties LLC");
    expect(cleanEntityName("THE MADISON LIVING TRUST")).toBe("The Madison Living Trust");
    expect(cleanEntityName("WIDGET INC.")).toBe("Widget Inc.");
    expect(cleanEntityName("JPMORGAN CHASE BANK, N.A.")).toBe("JPMorgan Chase Bank, N.A.");
  });

  it("strips trailing ', dated <date>' on trust names", () => {
    expect(cleanEntityName("THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006"))
      .toBe("The Brian J. and Tanya R. Madison Living Trust");
  });

  it("leaves an already-clean mixed-case name alone", () => {
    expect(cleanEntityName("The Smith Family Trust")).toBe("The Smith Family Trust");
  });
});

describe("subjectPhraseFromParties (grantees)", () => {
  it("two individuals with same last name → 'the Pophams'", () => {
    expect(subjectPhraseFromParties(grantees("POPHAM CHRISTOPHER", "POPHAM ASHLEY"), "grantee"))
      .toBe("the Pophams");
  });

  it("one individual → 'Christopher Popham'", () => {
    expect(subjectPhraseFromParties(grantees("POPHAM CHRISTOPHER"), "grantee"))
      .toBe("Christopher Popham");
  });

  it("two individuals with different last names → 'Smith & Jones' (no plural)", () => {
    expect(subjectPhraseFromParties(grantees("SMITH JOHN", "JONES MARY"), "grantee"))
      .toBe("John Smith and Mary Jones");
  });

  it("single LLC grantee → clean entity name, no plural, no article", () => {
    expect(subjectPhraseFromParties(grantees("ABC PROPERTIES LLC"), "grantee"))
      .toBe("ABC Properties LLC");
  });

  it("single trust grantee → clean name without 'the ___s' wrap, no trailing date tail", () => {
    expect(subjectPhraseFromParties(
      grantees("THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006"),
      "grantee",
    )).toBe("The Brian J. and Tanya R. Madison Living Trust");
  });

  it("mixed individual + entity → comma-joined with proper casing", () => {
    expect(subjectPhraseFromParties(
      grantees("SMITH JOHN", "ABC PROPERTIES LLC"),
      "grantee",
    )).toBe("John Smith and ABC Properties LLC");
  });

  it("empty → 'the current owners' fallback for homeowner copy", () => {
    expect(subjectPhraseFromParties([], "grantee")).toBe("the current owners");
  });

  it("filters to the requested role", () => {
    const parties: Party[] = [
      { name: "SELLER ONE", role: "grantor", provenance: "manual_entry", confidence: 0.9 },
      { name: "POPHAM CHRISTOPHER", role: "grantee", provenance: "manual_entry", confidence: 0.9 },
      { name: "POPHAM ASHLEY", role: "grantee", provenance: "manual_entry", confidence: 0.9 },
    ];
    expect(subjectPhraseFromParties(parties, "grantee")).toBe("the Pophams");
    expect(subjectPhraseFromParties(parties, "grantor")).toBe("Seller One");
  });
});
```

- [ ] **Step 2: Run the tests — expected FAIL**

Run: `npx vitest run src/narrative/subject-phrase.test.ts`
Expected: all tests fail with "module not found".

- [ ] **Step 3: Implement `subject-phrase.ts`**

```ts
// src/narrative/subject-phrase.ts
import type { Party } from "../types";
import type { z } from "zod";
import type { PartyRole } from "../schemas";

type Role = z.infer<typeof PartyRole>;

const ENTITY_SUFFIXES = [
  // order matters — longer matches first
  /,\s*L\.L\.C\.?\s*$/i,
  /\bL\.L\.C\.?\s*$/i,
  /\bLLC\.?\s*$/i,
  /\bINC\.?\s*$/i,
  /\bCORP\.?\s*$/i,
  /\bCORPORATION\s*$/i,
  /,\s*L\.P\.?\s*$/i,
  /\bL\.P\.?\s*$/i,
  /\bLLP\.?\s*$/i,
  /\bLP\s*$/i,
  /\bCO\.?\s*$/i,
  /\bCOMPANY\s*$/i,
  /\bPARTNERSHIP\s*$/i,
  /\bESTATE\s+OF\b/i,
  /\bESTATE\s*$/i,
  /\bN\.A\.\s*$/i,
  /\bBANK\b/i,
  /\bTRUST\b/i,
  /\bTRUSTEE\b/i,
];

export function isEntityName(name: string): boolean {
  return ENTITY_SUFFIXES.some((re) => re.test(name));
}

// Acronyms we never title-case away from ALL CAPS.
const PRESERVE_ACRONYMS = new Set([
  "LLC", "L.L.C.", "INC", "INC.", "CORP", "CORP.", "LP", "L.P.", "LLP",
  "CO.", "N.A.", "USA", "LTD.", "LTD",
]);

function smartTitle(word: string): string {
  if (PRESERVE_ACRONYMS.has(word)) return word;
  if (/^[A-Z]{2,}$/.test(word)) {
    // ALL CAPS multi-letter word: title-case unless it's a known acronym above.
    // Special-case "JPMORGAN" style: if the uppercase word contains two capital
    // prefixes in real life, we cannot reconstruct them from ALL CAPS input.
    // Handle JPMORGAN explicitly since it appears in Maricopa lender names.
    if (word === "JPMORGAN") return "JPMorgan";
    return word[0] + word.slice(1).toLowerCase();
  }
  if (/^[a-z]/.test(word)) return word[0].toUpperCase() + word.slice(1);
  return word;
}

// Title-case a free-form string, preserving well-known acronyms and the
// internal lowercase connector words ("and", "of", "the" mid-string).
function titleCaseFreeform(s: string): string {
  const tokens = s.split(/(\s+|[,.])/); // keep separators
  const connectors = new Set(["AND", "OF", "THE", "FOR", "A", "AN"]);
  return tokens
    .map((tok, i) => {
      if (/^\s+$/.test(tok) || /^[,.]$/.test(tok)) return tok;
      if (i > 0 && connectors.has(tok.toUpperCase())) return tok.toLowerCase();
      return smartTitle(tok);
    })
    .join("")
    // first visible word should be capitalized even if it's a connector
    .replace(/^([a-z])/, (c) => c.toUpperCase());
}

export function cleanEntityName(raw: string): string {
  // Strip trust trailing ", dated <anything>" tails for display. Provenance
  // is preserved on the underlying field; this is display-only cleanup.
  const noDateTail = raw.replace(/,\s*dated\s+.+$/i, "");
  return titleCaseFreeform(noDateTail);
}

function lastNameOfIndividual(fullName: string): string {
  // Maricopa name-index format is typically "LASTNAME FIRST MIDDLE" so the
  // first whitespace-split token is the surname. Title-case the result.
  const parts = fullName.trim().split(/\s+/);
  return smartTitle(parts[0] ?? fullName);
}

function renderIndividual(fullName: string): string {
  // "LASTNAME FIRST MIDDLE" → "First Middle Lastname"
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  const last = smartTitle(parts[0]);
  const rest = parts.slice(1).map(smartTitle);
  if (rest.length === 0) return last;
  return `${rest.join(" ")} ${last}`;
}

function renderOne(name: string): string {
  if (isEntityName(name)) return cleanEntityName(name);
  return renderIndividual(name);
}

export function subjectPhraseFromParties(parties: Party[], role: Role): string {
  const names = parties.filter((p) => p.role === role).map((p) => p.name);
  if (names.length === 0) {
    return role === "grantee" ? "the current owners" : "the seller";
  }

  // All grantees are individuals with a shared surname → familial plural.
  if (names.every((n) => !isEntityName(n))) {
    const lastNames = Array.from(new Set(names.map(lastNameOfIndividual)));
    if (lastNames.length === 1) return `the ${lastNames[0]}s`;
    if (names.length === 1) return renderOne(names[0]);
    if (names.length === 2) return `${renderOne(names[0])} and ${renderOne(names[1])}`;
    return names.slice(0, -1).map(renderOne).join(", ") + ", and " + renderOne(names[names.length - 1]);
  }

  // Any entities present: render each cleanly, join with "and"/commas.
  const rendered = names.map(renderOne);
  if (rendered.length === 1) return rendered[0];
  if (rendered.length === 2) return `${rendered[0]} and ${rendered[1]}`;
  return rendered.slice(0, -1).join(", ") + ", and " + rendered[rendered.length - 1];
}
```

- [ ] **Step 4: Run the tests — expected PASS**

Run: `npx vitest run src/narrative/subject-phrase.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/narrative/subject-phrase.ts src/narrative/subject-phrase.test.ts
git commit -m "feat(narrative): add subject-phrase helper with entity detection"
```

---

## Task 2: Migrate `patterns.ts` to the shared helper

**Files:**
- Modify: `src/narrative/patterns.ts:38-63,115-145`

- [ ] **Step 1: Replace local helpers with the shared one**

In `src/narrative/patterns.ts`, delete `titleCase` (lines 38-40), `lastNameOf` (lines 42-46), `grantorsPhrase` (lines 48-50), `granteesPhrase` (lines 52-57), and `granteeFamilyPhrase` (lines 59-63). Replace the import block (line 1-3) to add:

```ts
import { subjectPhraseFromParties, cleanEntityName, isEntityName } from "./subject-phrase";
```

Retain `grantorNames` + `granteeNames` + `isTrustEntity` — they are used elsewhere in the file.

Update `purchase_from_trust.render` (was lines 123-128):

```ts
  render: (g) => {
    const deed = g.instruments.find(isDeed)!;
    const trustName = cleanEntityName(grantorNames(deed)[0]);
    const buyers = subjectPhraseFromParties(deed.parties, "grantee");
    return `In ${year(deed.recording_date)}, ${buyers} purchased the home from ${trustName} — a revocable family living trust, a common way families pass homes between generations.`;
  },
```

Update `purchase_from_individual.render` (was lines 139-144):

```ts
  render: (g) => {
    const deed = g.instruments.find(isDeed)!;
    const buyers = subjectPhraseFromParties(deed.parties, "grantee");
    const sellers = subjectPhraseFromParties(deed.parties, "grantor");
    return `In ${year(deed.recording_date)}, ${buyers} bought the home from ${sellers}.`;
  },
```

Other call sites of the deleted helpers: `lenderName` (line 74-82) uses `titleCase` — replace with a local one-liner since the shared helper is party-shaped:

```ts
function prettyName(s: string): string {
  if (isEntityName(s)) return cleanEntityName(s);
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
```

Then inside `lenderName`, replace all three `titleCase(...)` calls with `prettyName(...)`.

Also update `subdivision_plat.render` (line 97): `${titleCase(meta.dedicated_by)}` → `${prettyName(meta.dedicated_by)}`.

Also update `release_by_third_party.render` (line 246): `titleCase(releasingPartyName(inst)!)` → `prettyName(releasingPartyName(inst)!)`.

Also update `generic_recording.render` (line 276): `inst.raw_api_response.names.slice(0, 3).map(titleCase).join(", ")` → `inst.raw_api_response.names.slice(0, 3).map(prettyName).join(", ")`.

- [ ] **Step 2: Run narrative tests — expected PASS (or snapshot updates if any)**

Run: `npx vitest run src/narrative/`
Expected: all narrative tests pass. If there are snapshot tests asserting the old "the Llcs" or "Dated February 23, 2006s" output, update them to the new clean output — they were asserting the bug.

- [ ] **Step 3: Commit**

```bash
git add src/narrative/patterns.ts
git commit -m "fix(narrative): route patterns through shared subject-phrase helper"
```

---

## Task 3: Migrate `engine.ts` to the shared helper

**Files:**
- Modify: `src/narrative/engine.ts:98-127,142`

- [ ] **Step 1: Delete local `titleCaseName` (98-100) + `granteeFamilyShortForm` (114-127); import shared**

In `src/narrative/engine.ts`, update the imports block (line 11 area) to add:

```ts
import { subjectPhraseFromParties } from "./subject-phrase";
```

Delete `titleCaseName` (lines 98-100) and `granteeFamilyShortForm` (lines 114-127).

Update `renderHero` (line 142):

```ts
  const family = subjectPhraseFromParties(deed.parties, "grantee");
```

- [ ] **Step 2: Run narrative + story tests — expected PASS**

Run: `npx vitest run src/narrative/ src/components/story/ src/hooks/useStoryData.test.ts`
Expected: all pass. Update any snapshots that were locking in the bug.

- [ ] **Step 3: Commit**

```bash
git add src/narrative/engine.ts
git commit -m "fix(narrative): route engine hero through shared subject-phrase helper"
```

---

## Task 4: `usePortalMode` hook

**Files:**
- Create: `src/hooks/usePortalMode.ts`
- Create: `src/hooks/usePortalMode.test.ts`

- [ ] **Step 1: Write failing tests**

```tsx
// src/hooks/usePortalMode.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { usePortalMode } from "./usePortalMode";
import type { ReactNode } from "react";

function wrapper(initialEntries: string[]) {
  return function W({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe("usePortalMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to homeowner when URL + localStorage empty", () => {
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.mode).toBe("homeowner");
  });

  it("reads ?mode=examiner from the URL", () => {
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/?mode=examiner"]),
    });
    expect(result.current.mode).toBe("examiner");
  });

  it("URL beats localStorage when both set", () => {
    localStorage.setItem("portalMode", "homeowner");
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/?mode=examiner"]),
    });
    expect(result.current.mode).toBe("examiner");
  });

  it("reads mode from localStorage when URL absent", () => {
    localStorage.setItem("portalMode", "examiner");
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.mode).toBe("examiner");
  });

  it("setMode persists to localStorage", () => {
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/"]),
    });
    act(() => {
      result.current.setMode("examiner");
    });
    expect(localStorage.getItem("portalMode")).toBe("examiner");
    expect(result.current.mode).toBe("examiner");
  });

  it("ignores invalid localStorage values", () => {
    localStorage.setItem("portalMode", "bogus");
    const { result } = renderHook(() => usePortalMode(), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.mode).toBe("homeowner");
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL**

Run: `npx vitest run src/hooks/usePortalMode.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement**

```ts
// src/hooks/usePortalMode.ts
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";

export type PortalMode = "homeowner" | "examiner";

const STORAGE_KEY = "portalMode";

function readStorage(): PortalMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "homeowner" || raw === "examiner" ? raw : null;
}

function readParam(params: URLSearchParams): PortalMode | null {
  const raw = params.get("mode");
  return raw === "homeowner" || raw === "examiner" ? raw : null;
}

export function usePortalMode(): { mode: PortalMode; setMode: (m: PortalMode) => void } {
  const [params] = useSearchParams();
  const fromUrl = readParam(params);
  const [stored, setStored] = useState<PortalMode | null>(() => readStorage());

  // Keep stored in sync with localStorage when the URL changes persistence intent.
  useEffect(() => {
    if (fromUrl && fromUrl !== stored) {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      setStored(fromUrl);
    }
  }, [fromUrl, stored]);

  const mode: PortalMode = fromUrl ?? stored ?? "homeowner";

  const setMode = useCallback((m: PortalMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, m);
    }
    setStored(m);
  }, []);

  return { mode, setMode };
}
```

- [ ] **Step 4: Run tests — expected PASS**

Run: `npx vitest run src/hooks/usePortalMode.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePortalMode.ts src/hooks/usePortalMode.test.ts
git commit -m "feat(hooks): add usePortalMode hook with URL + localStorage persistence"
```

---

## Task 5: `PortalModeToggle` component

**Files:**
- Create: `src/components/PortalModeToggle.tsx`
- Create: `src/components/PortalModeToggle.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/PortalModeToggle.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortalModeToggle } from "./PortalModeToggle";

describe("PortalModeToggle", () => {
  it("shows 'Open examiner view' when in homeowner mode", () => {
    render(<PortalModeToggle mode="homeowner" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent(/examiner view/i);
  });

  it("shows 'Homeowner view' when in examiner mode", () => {
    render(<PortalModeToggle mode="examiner" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent(/homeowner view/i);
  });

  it("clicking toggles the opposite mode via onChange", async () => {
    const onChange = vi.fn();
    render(<PortalModeToggle mode="homeowner" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("examiner");
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL**

Run: `npx vitest run src/components/PortalModeToggle.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/components/PortalModeToggle.tsx
import type { PortalMode } from "../hooks/usePortalMode";

export interface PortalModeToggleProps {
  mode: PortalMode;
  onChange: (next: PortalMode) => void;
}

export function PortalModeToggle({ mode, onChange }: PortalModeToggleProps) {
  const next: PortalMode = mode === "homeowner" ? "examiner" : "homeowner";
  const label = mode === "homeowner" ? "Open examiner view →" : "Homeowner view →";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline underline-offset-2"
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 4: Run tests — expected PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/PortalModeToggle.tsx src/components/PortalModeToggle.test.tsx
git commit -m "feat(components): add PortalModeToggle button"
```

---

## Task 6: `HomeownerHero` component

**Files:**
- Create: `src/components/HomeownerHero.tsx`
- Create: `src/components/HomeownerHero.test.tsx`

This hero is a simplified, homeowner-framed address input. It reuses the existing `buildSearchableIndex` output so it can resolve an address token to a curated parcel. On submit, it navigates to `/parcel/:apn/home`. If the input matches a non-curated (recorder-cached or assessor-only) APN we still route to `/parcel/:apn/home` — the card page handles "not in curated chain" gracefully. If nothing matches, we surface an inline message. We do **not** show party/instrument affordances here — examiners switch modes first.

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/HomeownerHero.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { HomeownerHero } from "./HomeownerHero";
import type { Searchable } from "../logic/searchable-index";

const POPHAM: Searchable = {
  kind: "curated",
  apn: "304-78-386",
  address: "3674 E Palmer St",
  city: "Gilbert",
  owner: "POPHAM CHRISTOPHER / ASHLEY",
  subdivision: "SEVILLE PARCEL 3",
  searchBlob: "304-78-386 3674 e palmer st gilbert popham christopher ashley seville parcel 3",
};

function Wrap({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>;
}

describe("HomeownerHero", () => {
  it("renders homeowner-framed placeholder copy", () => {
    render(<HomeownerHero searchables={[POPHAM]} onResolve={() => {}} />, { wrapper: Wrap });
    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("placeholder", expect.stringMatching(/enter your property address/i));
  });

  it("resolves an address on submit by calling onResolve(apn)", async () => {
    const onResolve = vi.fn();
    render(<HomeownerHero searchables={[POPHAM]} onResolve={onResolve} />, { wrapper: Wrap });
    await userEvent.type(screen.getByRole("searchbox"), "3674 palmer");
    await userEvent.click(screen.getByRole("button", { name: /see what the county knows/i }));
    expect(onResolve).toHaveBeenCalledWith("304-78-386");
  });

  it("shows an inline empty-state when no match", async () => {
    const onResolve = vi.fn();
    render(<HomeownerHero searchables={[POPHAM]} onResolve={onResolve} />, { wrapper: Wrap });
    await userEvent.type(screen.getByRole("searchbox"), "9999 nowhere ave");
    await userEvent.click(screen.getByRole("button", { name: /see what the county knows/i }));
    expect(onResolve).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/no match/i);
  });

  it("uses homeowner-plain language — no 'party', 'grantor', 'instrument', or 'APN' in visible copy", () => {
    render(<HomeownerHero searchables={[POPHAM]} onResolve={() => {}} />, { wrapper: Wrap });
    const visible = document.body.textContent ?? "";
    expect(visible).not.toMatch(/\bparty\b/i);
    expect(visible).not.toMatch(/\bgrantor\b/i);
    expect(visible).not.toMatch(/\binstrument\b/i);
    expect(visible).not.toMatch(/\bAPN\b/);
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/HomeownerHero.tsx
import { useState } from "react";
import type { Searchable } from "../logic/searchable-index";
import { searchAll } from "../logic/searchable-index";

export interface HomeownerHeroProps {
  searchables: Searchable[];
  onResolve: (apn: string) => void;
}

export function HomeownerHero({ searchables, onResolve }: HomeownerHeroProps) {
  const [query, setQuery] = useState("");
  const [noMatch, setNoMatch] = useState(false);

  function submit() {
    const hits = searchAll(query, searchables);
    // Prefer curated; otherwise accept any tier (the homeowner card page
    // handles non-curated parcels with a graceful "partial chain" message).
    const curated = hits.find((h) => h.kind === "curated");
    const chosen = curated ?? hits[0];
    if (!chosen) {
      setNoMatch(true);
      return;
    }
    setNoMatch(false);
    onResolve(chosen.apn);
  }

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          What does the county know about your home?
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Every ownership transfer, mortgage, release, and lien is recorded here. Type your property address and we'll show you the four things that matter — in plain English.
        </p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="search"
            role="searchbox"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (noMatch) setNoMatch(false);
            }}
            placeholder="Enter your property address"
            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            See what the county knows
          </button>
        </form>
        {noMatch && (
          <p role="status" className="mt-3 text-sm text-amber-700">
            No match in the Gilbert sample. Try a street address like "3674 E Palmer St" or "2715 E Palmer St".
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests — expected PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/HomeownerHero.tsx src/components/HomeownerHero.test.tsx
git commit -m "feat(components): add homeowner-framed hero with address search"
```

---

## Task 7: `homeowner-answers` pure logic

**Files:**
- Create: `src/logic/homeowner-answers.ts`
- Create: `src/logic/homeowner-answers.test.ts`

The four answers are each a typed value with a provenance summary. The card components render these; tests assert the data shape, not the copy.

- [ ] **Step 1: Write failing tests**

```ts
// src/logic/homeowner-answers.test.ts
import { describe, it, expect } from "vitest";
import { computeHomeownerAnswers } from "./homeowner-answers";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import lifecyclesRaw from "../data/lifecycles.json";
import { LifecyclesFile } from "../schemas";

const POPHAM_APN = "304-78-386";
const HOGUE_APN = "304-77-689";
const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

describe("computeHomeownerAnswers — POPHAM", () => {
  const parcel = loadAllParcels().find((p) => p.apn === POPHAM_APN)!;
  const instruments = loadAllInstruments().filter((i) =>
    parcel.instrument_numbers?.includes(i.instrument_number),
  );
  const a = computeHomeownerAnswers(parcel, instruments, LIFECYCLES);

  it("title-clean reflects zero OPEN lifecycles tied to this parcel's instruments", () => {
    // All POPHAM curated lifecycles are released or linked. title-clean === true.
    expect(a.titleClean.clean).toBe(true);
    expect(a.titleClean.openCount).toBe(0);
  });

  it("last-sale returns the 2021 WAR DEED", () => {
    expect(a.lastSale.year).toBe("2021");
    expect(a.lastSale.recordingNumber).toBe("20210057847".length === 11 ? "20210057847" : expect.any(String));
    // Don't lock the exact recordingNumber — loader may reorder; just require shape.
    expect(a.lastSale.recordingNumber).toMatch(/^\d{11}$/);
  });

  it("open-liens matches titleClean.openCount", () => {
    expect(a.openLiens.count).toBe(a.titleClean.openCount);
  });

  it("lender-history lists at least one lender entry with year", () => {
    expect(a.lenderHistory.entries.length).toBeGreaterThanOrEqual(1);
    for (const e of a.lenderHistory.entries) {
      expect(e.year).toMatch(/^\d{4}$/);
      expect(e.lenderDisplayName).toBeTruthy();
      expect(e.recordingNumber).toMatch(/^\d{11}$/);
    }
  });
});

describe("computeHomeownerAnswers — empty parcel safety", () => {
  it("returns sensible defaults when no instruments", () => {
    const parcel = {
      apn: "000-00-000",
      address: "Nowhere",
      city: "Gilbert",
      state: "AZ",
      zip: "00000",
      legal_description: "",
      current_owner: "",
      subdivision: "",
      instrument_numbers: [],
    } as const;
    const a = computeHomeownerAnswers(parcel, [], []);
    expect(a.titleClean.clean).toBe(true);
    expect(a.lastSale.found).toBe(false);
    expect(a.openLiens.count).toBe(0);
    expect(a.lenderHistory.entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL**

- [ ] **Step 3: Implement**

```ts
// src/logic/homeowner-answers.ts
import type { Parcel, Instrument } from "../types";
import type { z } from "zod";
import { EncumbranceLifecycle, FieldWithProvenance } from "../schemas";
import { subjectPhraseFromParties, cleanEntityName, isEntityName } from "../narrative/subject-phrase";

type Lifecycle = z.infer<typeof EncumbranceLifecycle>;

export interface HomeownerAnswers {
  titleClean: { clean: boolean; openCount: number; openLifecycleIds: string[] };
  lastSale: {
    found: boolean;
    recordingNumber: string;
    recording_date: string;
    year: string;
    buyersPhrase: string;
    sellersPhrase: string;
    priceDisplay: string;
    priceProvenance: string | null;
    // provenance is public_api for the recording-date shell, manual_entry
    // for the grantor/grantee attribution. We carry the weakest link.
    provenance: "public_api" | "ocr" | "manual_entry" | "none";
  };
  openLiens: {
    count: number;
    summaries: Array<{ lifecycleId: string; rationale: string; rootInstrument: string }>;
  };
  lenderHistory: {
    entries: Array<{
      recordingNumber: string;
      year: string;
      recording_date: string;
      lenderDisplayName: string;
      provenance: "public_api" | "ocr" | "manual_entry";
    }>;
  };
}

function isDeed(i: Instrument): boolean {
  return (
    i.document_type === "warranty_deed" ||
    i.document_type === "special_warranty_deed" ||
    i.document_type === "quit_claim_deed" ||
    i.document_type === "grant_deed"
  );
}

function isDOTLike(i: Instrument): boolean {
  return i.document_type === "deed_of_trust" || i.document_type === "heloc_dot";
}

function pickLender(inst: Instrument): { name: string; provenance: "public_api" | "ocr" | "manual_entry" } {
  const lender = inst.parties.find((p) => p.role === "lender");
  if (lender) return { name: lender.name, provenance: lender.provenance as typeof lender.provenance extends infer T ? T extends "public_api" | "ocr" | "manual_entry" ? T : "manual_entry" : "manual_entry" };
  const beneficiary = inst.parties.find((p) => p.role === "beneficiary");
  if (beneficiary?.nominee_for) {
    return { name: beneficiary.nominee_for.party_name, provenance: beneficiary.provenance as any };
  }
  if (beneficiary) return { name: beneficiary.name, provenance: beneficiary.provenance as any };
  return { name: "a lender", provenance: "manual_entry" };
}

function displayLender(raw: string): string {
  if (isEntityName(raw)) return cleanEntityName(raw);
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function computeHomeownerAnswers(
  parcel: Parcel,
  instruments: Instrument[],
  lifecycles: Lifecycle[],
): HomeownerAnswers {
  const parcelInstrumentNumbers = new Set(
    parcel.instrument_numbers ?? instruments.map((i) => i.instrument_number),
  );

  // Only lifecycles whose root instrument belongs to this parcel.
  const parcelLifecycles = lifecycles.filter((lc) => parcelInstrumentNumbers.has(lc.root_instrument));
  const openLifecycles = parcelLifecycles.filter((lc) => {
    const effective = lc.examiner_override ?? lc.status;
    return effective === "open" || effective === "unresolved";
  });

  const deeds = instruments.filter(isDeed).slice().sort((a, b) => b.recording_date.localeCompare(a.recording_date));
  const latestDeed = deeds[0] ?? null;

  // Optional price from extracted_fields; Maricopa rarely records price — default "not recorded".
  const priceField: z.infer<typeof FieldWithProvenance> | undefined =
    (latestDeed?.extracted_fields?.sale_price ??
      latestDeed?.extracted_fields?.consideration) as z.infer<typeof FieldWithProvenance> | undefined;

  const dotLike = instruments.filter(isDOTLike).slice().sort((a, b) => a.recording_date.localeCompare(b.recording_date));

  return {
    titleClean: {
      clean: openLifecycles.length === 0,
      openCount: openLifecycles.length,
      openLifecycleIds: openLifecycles.map((lc) => lc.id),
    },
    lastSale: latestDeed
      ? {
          found: true,
          recordingNumber: latestDeed.instrument_number,
          recording_date: latestDeed.recording_date,
          year: latestDeed.recording_date.slice(0, 4),
          buyersPhrase: subjectPhraseFromParties(latestDeed.parties, "grantee"),
          sellersPhrase: subjectPhraseFromParties(latestDeed.parties, "grantor"),
          priceDisplay: priceField ? priceField.value : "Price not recorded by the county",
          priceProvenance: priceField ? priceField.provenance : null,
          provenance: priceField ? (priceField.provenance as "public_api" | "ocr" | "manual_entry") : "public_api",
        }
      : {
          found: false,
          recordingNumber: "",
          recording_date: "",
          year: "",
          buyersPhrase: "",
          sellersPhrase: "",
          priceDisplay: "",
          priceProvenance: null,
          provenance: "none",
        },
    openLiens: {
      count: openLifecycles.length,
      summaries: openLifecycles.map((lc) => ({
        lifecycleId: lc.id,
        rationale: lc.status_rationale,
        rootInstrument: lc.root_instrument,
      })),
    },
    lenderHistory: {
      entries: dotLike.map((inst) => {
        const lender = pickLender(inst);
        return {
          recordingNumber: inst.instrument_number,
          year: inst.recording_date.slice(0, 4),
          recording_date: inst.recording_date,
          lenderDisplayName: displayLender(lender.name),
          provenance: lender.provenance,
        };
      }),
    },
  };
}
```

- [ ] **Step 4: Run tests — expected PASS**

Run: `npx vitest run src/logic/homeowner-answers.test.ts`
Expected: all pass. If a POPHAM lifecycle is in `open` state in the fixture, adjust the test's expectation from `clean: true` to the actual count — the test should match reality, not force it. Read `src/data/lifecycles.json` and adjust the assertion if needed.

- [ ] **Step 5: Commit**

```bash
git add src/logic/homeowner-answers.ts src/logic/homeowner-answers.test.ts
git commit -m "feat(logic): add homeowner-answers computation"
```

---

## Task 8: Homeowner card components (four cards)

**Files:**
- Create: `src/components/homeowner/TitleCleanCard.tsx`
- Create: `src/components/homeowner/LastSaleCard.tsx`
- Create: `src/components/homeowner/OpenLiensCard.tsx`
- Create: `src/components/homeowner/LenderHistoryCard.tsx`
- Create: `src/components/homeowner/cards.test.tsx`

All four cards share a single visual shell (title, answer, drill-in link, provenance footer). Keep one shell component inline per-card; do not extract a premature abstraction.

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/homeowner/cards.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { TitleCleanCard } from "./TitleCleanCard";
import { LastSaleCard } from "./LastSaleCard";
import { OpenLiensCard } from "./OpenLiensCard";
import { LenderHistoryCard } from "./LenderHistoryCard";

const APN = "304-78-386";

function Wrap({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("TitleCleanCard", () => {
  it("renders 'Title looks clean' + drill-in to encumbrances when clean", () => {
    render(
      <TitleCleanCard apn={APN} titleClean={{ clean: true, openCount: 0, openLifecycleIds: [] }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByRole("heading", { name: /is the title clean/i })).toBeInTheDocument();
    expect(screen.getByText(/title looks clean/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see the evidence/i })).toHaveAttribute("href", `/parcel/${APN}/encumbrances`);
  });

  it("renders 'N open item(s)' when not clean", () => {
    render(
      <TitleCleanCard apn={APN} titleClean={{ clean: false, openCount: 2, openLifecycleIds: ["lc-1", "lc-2"] }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByText(/2 open/i)).toBeInTheDocument();
  });
});

describe("LastSaleCard", () => {
  it("renders 'not recorded' when no deed", () => {
    render(
      <LastSaleCard apn={APN} lastSale={{ found: false, recordingNumber: "", recording_date: "", year: "", buyersPhrase: "", sellersPhrase: "", priceDisplay: "", priceProvenance: null, provenance: "none" }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByText(/no recent sale recorded/i)).toBeInTheDocument();
  });

  it("renders year + buyers + sellers + price-not-recorded note by default", () => {
    render(
      <LastSaleCard apn={APN} lastSale={{
        found: true,
        recordingNumber: "20210057847",
        recording_date: "2021-01-22",
        year: "2021",
        buyersPhrase: "the Pophams",
        sellersPhrase: "The Madison Living Trust",
        priceDisplay: "Price not recorded by the county",
        priceProvenance: null,
        provenance: "public_api",
      }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByText(/2021/)).toBeInTheDocument();
    expect(screen.getByText(/the Pophams/)).toBeInTheDocument();
    expect(screen.getByText(/Madison Living Trust/)).toBeInTheDocument();
    expect(screen.getByText(/price not recorded/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see the evidence/i }))
      .toHaveAttribute("href", `/parcel/${APN}/instrument/20210057847`);
  });
});

describe("OpenLiensCard", () => {
  it("renders 'no open liens' when count is zero", () => {
    render(<OpenLiensCard apn={APN} openLiens={{ count: 0, summaries: [] }} />, { wrapper: Wrap });
    expect(screen.getByText(/no open liens/i)).toBeInTheDocument();
  });

  it("lists summaries when present", () => {
    render(<OpenLiensCard apn={APN} openLiens={{
      count: 1,
      summaries: [{ lifecycleId: "lc-x", rationale: "Reconveyance not yet recorded.", rootInstrument: "20200000001" }],
    }} />, { wrapper: Wrap });
    expect(screen.getByText(/reconveyance not yet recorded/i)).toBeInTheDocument();
  });
});

describe("LenderHistoryCard", () => {
  it("renders 'no mortgages on record' when entries empty", () => {
    render(<LenderHistoryCard apn={APN} lenderHistory={{ entries: [] }} />, { wrapper: Wrap });
    expect(screen.getByText(/no mortgages on record/i)).toBeInTheDocument();
  });

  it("lists each lender with year and a drill-in link to the chain", () => {
    render(<LenderHistoryCard apn={APN} lenderHistory={{
      entries: [
        { recordingNumber: "20130183450", year: "2013", recording_date: "2013-02-01", lenderDisplayName: "VIP Mortgage", provenance: "manual_entry" },
        { recordingNumber: "20210057848", year: "2021", recording_date: "2021-01-22", lenderDisplayName: "VIP Mortgage", provenance: "manual_entry" },
      ],
    }} />, { wrapper: Wrap });
    expect(screen.getByText("2013")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getAllByText(/VIP Mortgage/).length).toBe(2);
    expect(screen.getByRole("link", { name: /see the evidence/i }))
      .toHaveAttribute("href", `/parcel/${APN}`);
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL**

- [ ] **Step 3: Implement the shell helper + four cards**

Create a tiny inline shell (no separate file — keeps each card self-contained and legible). Here's the first card; repeat the pattern for the others.

```tsx
// src/components/homeowner/TitleCleanCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function TitleCleanCard({ apn, titleClean }: { apn: string; titleClean: HomeownerAnswers["titleClean"] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
        Is the title clean?
      </h2>
      <p className="mt-2 text-xl font-semibold text-slate-900">
        {titleClean.clean
          ? "Title looks clean"
          : `${titleClean.openCount} open item${titleClean.openCount === 1 ? "" : "s"} on record`}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {titleClean.clean
          ? "No unreleased mortgages or liens are recorded against this parcel."
          : "The county still shows open items that have not been resolved on the public record."}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}/encumbrances`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: county recorder + curated chain review</span>
      </div>
    </section>
  );
}
```

```tsx
// src/components/homeowner/LastSaleCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function LastSaleCard({ apn, lastSale }: { apn: string; lastSale: HomeownerAnswers["lastSale"] }) {
  if (!lastSale.found) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">When was the last sale?</h2>
        <p className="mt-2 text-xl font-semibold text-slate-900">No recent sale recorded</p>
        <p className="mt-1 text-sm text-slate-600">
          The county's curated chain for this parcel does not show a qualifying deed.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">When was the last sale?</h2>
      <p className="mt-2 text-xl font-semibold text-slate-900">{lastSale.year}</p>
      <p className="mt-1 text-sm text-slate-600">
        {lastSale.buyersPhrase} bought the home from {lastSale.sellersPhrase}.
      </p>
      <p className="mt-1 text-sm text-slate-500">{lastSale.priceDisplay}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}/instrument/${lastSale.recordingNumber}`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: county recorded deed ({lastSale.provenance})</span>
      </div>
    </section>
  );
}
```

```tsx
// src/components/homeowner/OpenLiensCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function OpenLiensCard({ apn, openLiens }: { apn: string; openLiens: HomeownerAnswers["openLiens"] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Are there open liens?</h2>
      {openLiens.count === 0 ? (
        <p className="mt-2 text-xl font-semibold text-slate-900">No open liens on record</p>
      ) : (
        <>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {openLiens.count} open item{openLiens.count === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 list-disc list-inside">
            {openLiens.summaries.map((s) => (
              <li key={s.lifecycleId}>{s.rationale}</li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}/encumbrances`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: encumbrance lifecycle analysis</span>
      </div>
    </section>
  );
}
```

```tsx
// src/components/homeowner/LenderHistoryCard.tsx
import { Link } from "react-router";
import type { HomeownerAnswers } from "../../logic/homeowner-answers";

export function LenderHistoryCard({ apn, lenderHistory }: { apn: string; lenderHistory: HomeownerAnswers["lenderHistory"] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Who has lent against this property?</h2>
      {lenderHistory.entries.length === 0 ? (
        <p className="mt-2 text-xl font-semibold text-slate-900">No mortgages on record</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {lenderHistory.entries.map((e) => (
            <li key={e.recordingNumber} className="flex items-baseline gap-3 text-sm">
              <span className="font-mono text-slate-500 w-12">{e.year}</span>
              <span className="text-slate-900 font-medium">{e.lenderDisplayName}</span>
              <span className="ml-auto text-[11px] text-slate-400">({e.provenance})</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <Link
          to={`/parcel/${apn}`}
          className="text-indigo-700 font-medium hover:underline underline-offset-2"
        >
          See the evidence →
        </Link>
        <span>Source: recorded deeds of trust</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests — expected PASS**

Run: `npx vitest run src/components/homeowner/cards.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/homeowner/
git commit -m "feat(components): add four homeowner question cards"
```

---

## Task 9: `HomeownerCardPage` — route component

**Files:**
- Create: `src/components/homeowner/HomeownerCardPage.tsx`
- Create: `src/components/homeowner/HomeownerCardPage.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/homeowner/HomeownerCardPage.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { HomeownerCardPage } from "./HomeownerCardPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/parcel/:apn/home" element={<HomeownerCardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomeownerCardPage", () => {
  it("renders the parcel address + all four question headings for POPHAM", () => {
    renderAt("/parcel/304-78-386/home");
    expect(screen.getByText(/3674 E Palmer St/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /is the title clean/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /when was the last sale/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /open liens/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /lent against/i })).toBeInTheDocument();
  });

  it("shows a not-in-corpus panel for unknown APN", () => {
    renderAt("/parcel/999-99-999/home");
    expect(screen.getByText(/not in (the )?corpus/i)).toBeInTheDocument();
  });

  it("links to examiner chain view at the bottom", () => {
    renderAt("/parcel/304-78-386/home");
    expect(screen.getByRole("link", { name: /open examiner view/i }))
      .toHaveAttribute("href", "/parcel/304-78-386?mode=examiner");
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/homeowner/HomeownerCardPage.tsx
import { Link, useParams } from "react-router";
import { loadAllInstruments, loadAllParcels } from "../../data-loader";
import { LifecyclesFile } from "../../schemas";
import lifecyclesRaw from "../../data/lifecycles.json";
import { computeHomeownerAnswers } from "../../logic/homeowner-answers";
import { TitleCleanCard } from "./TitleCleanCard";
import { LastSaleCard } from "./LastSaleCard";
import { OpenLiensCard } from "./OpenLiensCard";
import { LenderHistoryCard } from "./LenderHistoryCard";

const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

export function HomeownerCardPage() {
  const { apn = "" } = useParams();
  const parcels = loadAllParcels();
  const parcel = parcels.find((p) => p.apn === apn);

  if (!parcel) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">Not in the corpus</h1>
        <p className="mt-2 text-sm text-slate-600">
          This parcel isn't part of the curated Gilbert sample. Try the{" "}
          <Link to="/" className="text-indigo-700 hover:underline">home page</Link>.
        </p>
      </main>
    );
  }

  const instruments = loadAllInstruments().filter((i) =>
    parcel.instrument_numbers?.includes(i.instrument_number),
  );
  const answers = computeHomeownerAnswers(parcel, instruments, LIFECYCLES);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-500">{parcel.city}, {parcel.state}</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{parcel.address}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Four things the county's records say about this property. Each answer links to the underlying document.
        </p>
      </header>
      <div className="space-y-4">
        <TitleCleanCard apn={parcel.apn} titleClean={answers.titleClean} />
        <LastSaleCard apn={parcel.apn} lastSale={answers.lastSale} />
        <OpenLiensCard apn={parcel.apn} openLiens={answers.openLiens} />
        <LenderHistoryCard apn={parcel.apn} lenderHistory={answers.lenderHistory} />
      </div>
      <footer className="mt-8 border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Same data a title examiner would see — county-authoritative, not a title plant.</span>
        <Link to={`/parcel/${parcel.apn}?mode=examiner`} className="text-slate-700 font-medium hover:underline">
          Open examiner view →
        </Link>
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Run tests — expected PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/homeowner/HomeownerCardPage.tsx src/components/homeowner/HomeownerCardPage.test.tsx
git commit -m "feat(routes): add homeowner card page at /parcel/:apn/home"
```

---

## Task 10: Wire `/parcel/:apn/home` into the router

**Files:**
- Modify: `src/router.tsx` (add route near line 459-462)

- [ ] **Step 1: Add the route entry**

In `src/router.tsx`, in the route list, insert before the `/parcel/:apn/story` entry:

```tsx
  {
    path: "/parcel/:apn/home",
    element: <HomeownerCardPage />,
  },
```

Add the import at the top of the file:

```tsx
import { HomeownerCardPage } from "./components/homeowner/HomeownerCardPage";
```

- [ ] **Step 2: Smoke-test by building**

Run: `npx vite build` (or `npm run build` if a script exists)
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "feat(routes): register /parcel/:apn/home"
```

---

## Task 11: Swap the `LandingPage` hero for mode-aware rendering

**Files:**
- Modify: `src/components/LandingPage.tsx:177-190`

This is the coordination-sensitive edit. Only touch the hero region (current lines 179-190) + add the anchor comment for Agent 3.

- [ ] **Step 1: Update imports**

Add near the existing hook imports:

```tsx
import { usePortalMode } from "../hooks/usePortalMode";
import { PortalModeToggle } from "./PortalModeToggle";
import { HomeownerHero } from "./HomeownerHero";
```

- [ ] **Step 2: Consume `usePortalMode` inside `LandingPage`**

Right after the existing `useLandingUrlState()` destructure, add:

```tsx
  const { mode, setMode } = usePortalMode();
```

- [ ] **Step 3: Replace the `<SearchHero ... />` block**

Replace the current `<SearchHero .../>` call (lines 179-189) + the walkthrough/scenario line (190) with:

```tsx
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-end px-6 pt-3">
          <PortalModeToggle mode={mode} onChange={setMode} />
        </div>
        {mode === "homeowner" ? (
          <HomeownerHero
            searchables={searchables}
            onResolve={(apn) => navigate(`/parcel/${apn}/home`)}
          />
        ) : (
          <SearchHero
            value={query}
            onChange={setQuery}
            searchables={searchables}
            instruments={allInstruments}
            instrumentToApn={instrumentToApn}
            onSelectCurated={(apn) => navigate(`/parcel/${apn}`)}
            onSelectInstrument={(apn, n) => navigate(`/parcel/${apn}/instrument/${n}`)}
            onSelectDrawer={(apn) => setSelectedApn(apn)}
            onSelectParty={(normalizedName) => navigate(`/party/${normalizedName}`)}
          />
        )}
        {/* party-search hero card — Agent 3 */}
      </div>
      {walkthrough.active ? <WalkthroughBanner /> : <ScenarioPicker />}
```

Everything below this (PlantVsCountyProof, CountyMap section, FeaturedParcels, footer) remains unchanged.

- [ ] **Step 4: Manual verification**

Run `npm run dev` and in a browser:
1. Navigate to `/` — the homeowner hero should show by default.
2. Type "3674 palmer" → "See what the county knows" → lands on `/parcel/304-78-386/home` with four cards.
3. Click "Open examiner view →" top right — hero swaps to the SearchHero; localStorage now holds `portalMode=examiner`.
4. Hard-refresh `/` — examiner hero persists.
5. Navigate to `/?mode=homeowner` — homeowner hero returns, localStorage updated to homeowner.
6. Inspect: no "The Llcs" or "…, 2006s" strings anywhere in the rendered story timeline for POPHAM at `/parcel/304-78-386/story`.

Report any golden-path failure before committing.

- [ ] **Step 5: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(landing): swap hero for homeowner/examiner mode toggle"
```

---

## Task 12: Full test run + story-view regression check

- [ ] **Step 1: Run the full Vitest suite**

Run: `npm test -- --run`
Expected: all prior tests still pass; new tests pass; total test count ≈ previous + ~35.

- [ ] **Step 2: Manually verify story view**

Navigate to `/parcel/304-78-386/story`. Read every prose block. No string should contain:
- "Llcs"
- "Trusts" (plural)
- a four-digit year with a trailing 's' from the pluralization path (e.g., "2006s")
- "the THE" (the literal double 'the')

If any still appear, file a follow-up task — they come from a separate code path not covered by this plan.

- [ ] **Step 3: Summary commit only if any test-touching fixups were needed**

Otherwise, no commit. Plan complete.

---

## Self-Review Notes

- **Spec coverage:**
  - Homeowner hero with address input → Task 6 + 11.
  - Four homeowner questions → Tasks 7 + 8 + 9.
  - Drill-in "See the evidence →" → included on every card.
  - Mode toggle with localStorage persistence → Tasks 4 + 5 + 11.
  - Language bugs ("Llcs", "2006s") → Tasks 1 + 2 + 3.
  - Agent 3 coordination anchor → Task 11 Step 3.
  - Provenance honesty (price not recorded vs $0) → Task 7 default + Task 8 LastSaleCard copy.
- **Placeholder scan:** no TBDs, no "similar to Task N" without repeated code, no "handle edge cases" vague prompts.
- **Type consistency:** `HomeownerAnswers` shape declared once in `homeowner-answers.ts` and imported by every card and the page; `PortalMode` declared once in `usePortalMode.ts` and imported by the toggle.
- **Entity detection known limitation:** Bank-with-N.A. casing (e.g., "JPMORGAN CHASE BANK, N.A.") is handled by a small special-case in `smartTitle`. If demo parcels surface another acronym pattern (e.g., "USAA"), add to `PRESERVE_ACRONYMS` at that time — not pre-emptively.
