# Commitment Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Export Commitment for Parcel" button to the Proof Drawer and Encumbrance Lifecycle panel that downloads a parcel-level chain-and-encumbrance abstract PDF (Schedule A + Schedule B-II) with provenance footnotes that match what the UI shows.

**Architecture:** Three new modules — pure document-model builder (`commitment-builder.ts`), pure PDF renderer (`commitment-pdf.ts`), and a self-contained UI button component (`ExportCommitmentButton.tsx`). The button receives all parcel data as props (no prop drilling into busy components); router mounts it into a `headerActions` slot on both the Proof Drawer and the Encumbrance panel.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Tailwind 4, react-router 7, zod (existing); jsPDF + jspdf-autotable (new).

**Spec:** `docs/superpowers/specs/2026-04-14-commitment-export-design.md`

**Review checkpoints (per user direction):**

1. After Task 3 — `commitment-builder.ts` tests green (logic correct before any PDF concern).
2. After Task 4 — `commitment-pdf.ts` smoke test in dev server resolves Branch A vs Branch B for legal description.
3. After Task 6 — `ExportCommitmentButton` wired to both Proof Drawer and Encumbrance panel.
4. After Task 8 — final verification, before invoking `superpowers:requesting-code-review`.

**Working directory:** `C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export`. All `cd` commands use this absolute path because shell state does not persist between Bash tool calls in this environment.

**File inventory:**

- Create: `src/logic/format-provenance-tag.ts`
- Create: `src/logic/format-provenance-tag.test.ts`
- Create: `src/logic/commitment-builder.ts`
- Create: `src/logic/commitment-builder.test.ts`
- Create: `src/logic/commitment-pdf.ts`
- Create: `src/logic/commitment-pdf.test.ts`
- Create: `src/components/ExportCommitmentButton.tsx`
- Create: `src/components/ExportCommitmentButton.test.tsx`
- Create: `src/data/closing-impact-templates.json`
- Create: `src/data/closing-impact-templates.README.md`
- Modify: `src/components/ProofDrawer.tsx` — add `headerActions?: ReactNode` prop and slot it next to Copy Citation
- Modify: `src/components/EncumbranceLifecycle.tsx` — add `headerActions?: ReactNode` prop and slot it in the panel header
- Modify: `src/router.tsx` — instantiate `ExportCommitmentButton` and pass it to both surfaces via the slot
- Modify: `package.json` — add `jspdf` and `jspdf-autotable` dependencies
- Modify: `docs/known-gaps.md` — add entry #14 (no Schedule B-I generation)
- Modify: `CLAUDE.md` — add Decision #39 row
- Modify: `docs/superpowers/specs/2026-04-14-commitment-export-design.md` — fill in "Layout decision" section after Task 4

---

## Task 1: Install dependencies and create closing-impact templates

**Files:**
- Modify: `package.json`
- Create: `src/data/closing-impact-templates.json`
- Create: `src/data/closing-impact-templates.README.md`

- [ ] **Step 1: Install jsPDF + jspdf-autotable**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm install jspdf jspdf-autotable
```

Expected: dependencies added, no audit warnings.

- [ ] **Step 2: Verify install by reading package.json**

Use the Read tool on `package.json`. Confirm `jspdf` and `jspdf-autotable` appear in `dependencies`.

- [ ] **Step 3: Create the closing-impact templates data file**

Create `src/data/closing-impact-templates.json` with this exact content:

```json
[
  {
    "status": "open",
    "root_doc_type": "deed_of_trust",
    "template": "At transaction opening, this open DOT would require a payoff statement and recorded reconveyance prior to insuring the new lender's position."
  },
  {
    "status": "open",
    "root_doc_type": "assignment_of_dot",
    "template": "At transaction opening, an unreleased assignment requires a corresponding satisfaction or release before the chain can close."
  },
  {
    "status": "open",
    "root_doc_type": "other",
    "template": "At transaction opening, this open lifecycle requires examiner-resolved closing instructions before clear title can be insured."
  }
]
```

Note: `assignment_of_dot` and `other` are real `DocumentType` enum values in `src/schemas.ts`. The third row covers the lc-004 plat case if that lifecycle were ever flipped to open (defensive — currently lc-004 is `released`).

- [ ] **Step 4: Create the README sibling**

Create `src/data/closing-impact-templates.README.md` with this content:

```markdown
# closing-impact-templates.json

## Why this file exists

Schedule B-I (Requirements) on a real ALTA title commitment is
**transaction-scoped** — items such as payoff statements, satisfaction
of assignments, or curative affidavits are generated when a closing
opens against a specific buyer, lender, and effective date. Those
inputs are **not** part of the recorded corpus and are out of scope
for the chain-and-encumbrance abstract this prototype emits.

To avoid fabricating a B-I section we don't have data for, the
prototype renders a one-sentence **Closing impact:** annotation on
each open Schedule B-II row. The annotation explains what a B-I item
*would* require if a transaction were opened. Knowledge co-located
with the encumbrance it attaches to.

This file holds those sentences.

## Key shape

Lookup is by composite key `(status, root_doc_type)` where:

- `status` is a value from `LifecycleStatus` in `src/schemas.ts` —
  currently always `"open"` for templates that render.
- `root_doc_type` is a value from `DocumentType` in `src/schemas.ts`
  (e.g. `deed_of_trust`, `assignment_of_dot`, `other`).

If a lifecycle's `(status, root_doc_type)` does not match any
template, the row simply renders without a `Closing impact:` line.
This is intentional — silent omission is honest; a generic fallback
would be padding.

## Review rule

**Templates are reviewed by a human before merge. No
auto-generation.** New templates are added when a new
open-lifecycle shape appears in the corpus. The set is small on
purpose; growing it past a dozen rows is a signal that a real B-I
generator is the right next step.

## Provenance discipline at the data layer

This README exists so that a reviewer inspecting the repo sees the
provenance discipline at the data layer, not just in the UI. The
templates file is small enough to read in full; the rule that gates
new entries is documented here so a future contributor cannot add
templates without acknowledging the contract.
```

- [ ] **Step 5: Run baseline tests to confirm nothing broke**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm test
```

Expected: 105 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git add package.json package-lock.json src/data/closing-impact-templates.json src/data/closing-impact-templates.README.md && git commit -m "$(cat <<'EOF'
deps(commitment-export): add jspdf + jspdf-autotable; closing-impact templates with provenance-discipline README

Templates render as inline Closing impact: annotations on open Schedule
B-II rows in the commitment PDF, co-located with the encumbrance instead
of fabricating a transaction-scoped B-I section.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: format-provenance-tag formatter (pure helper, TDD)

**Files:**
- Create: `src/logic/format-provenance-tag.ts`
- Create: `src/logic/format-provenance-tag.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/logic/format-provenance-tag.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatProvenanceTag } from "./format-provenance-tag";

describe("formatProvenanceTag", () => {
  it("renders public_api as (api), confidence omitted", () => {
    expect(formatProvenanceTag("public_api", 1)).toBe("(api)");
  });

  it("renders manual_entry as (manual), confidence omitted", () => {
    expect(formatProvenanceTag("manual_entry", 1)).toBe("(manual)");
  });

  it("renders ocr with 2-decimal confidence", () => {
    expect(formatProvenanceTag("ocr", 0.92)).toBe("(ocr, 0.92)");
  });

  it("pads single-decimal ocr confidence to 2 decimals", () => {
    // critical: 0.8 must render as 0.80, not 0.8
    expect(formatProvenanceTag("ocr", 0.8)).toBe("(ocr, 0.80)");
  });

  it("renders algorithmic provenance as (algo, X.XX)", () => {
    expect(formatProvenanceTag("algorithmic", 0.881)).toBe("(algo, 0.88)");
  });
});
```

Note: `ProvenanceKind` enum in `src/schemas.ts` is `["public_api", "ocr", "manual_entry", "algorithmic"]`. There is no `"ai_extraction"` value — the spec used `ai_extraction` informally; the actual enum uses `algorithmic`. The test reflects the real enum.

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/logic/format-provenance-tag.test.ts
```

Expected: FAIL — "Failed to resolve import" or equivalent.

- [ ] **Step 3: Write the minimal implementation**

Create `src/logic/format-provenance-tag.ts`:

```ts
import type { ProvenanceKind } from "../types";

export function formatProvenanceTag(
  provenance: ProvenanceKind,
  confidence: number,
): string {
  if (provenance === "public_api") return "(api)";
  if (provenance === "manual_entry") return "(manual)";
  const label = provenance === "ocr" ? "ocr" : "algo";
  return `(${label}, ${confidence.toFixed(2)})`;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/logic/format-provenance-tag.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git add src/logic/format-provenance-tag.ts src/logic/format-provenance-tag.test.ts && git commit -m "$(cat <<'EOF'
feat(commitment-export): provenance-tag formatter for inline PDF footnotes

Renders (api) and (manual) without confidence (implicit 1.0) and
(ocr, 0.92) / (algo, 0.88) with 2-decimal padding to match on-screen UI.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: commitment-builder (pure document-model builder, TDD) — REVIEW CHECKPOINT 1

**Files:**
- Create: `src/logic/commitment-builder.ts`
- Create: `src/logic/commitment-builder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/logic/commitment-builder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCommitment } from "./commitment-builder";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

const POPHAM_APN = "304-78-386";
const HOGUE_APN = "304-77-689";
const FIXED_GENERATED_AT = "2026-04-14T12:00:00.000Z";

describe("buildCommitment — POPHAM", () => {
  const data = loadParcelDataByApn(POPHAM_APN);
  const doc = buildCommitment({
    parcel: data.parcel,
    instruments: data.instruments,
    links: data.links,
    lifecycles: data.lifecycles,
    pipelineStatus: data.pipelineStatus,
    closingImpactTemplates,
    generatedAt: FIXED_GENERATED_AT,
  });

  it("sets header fields from parcel + pipelineStatus", () => {
    expect(doc.header.parcelApn).toBe("304-78-386");
    expect(doc.header.parcelAddress).toContain("3674 E Palmer St");
    expect(doc.header.verifiedThroughDate).toBe("2026-04-09");
    expect(doc.header.generatedAt).toBe(FIXED_GENERATED_AT);
    expect(doc.header.countyName).toBe("Maricopa County, AZ");
  });

  it("interpolates verified_through_date into header note", () => {
    expect(doc.header.headerNote).toContain("transaction-scoped");
    expect(doc.header.headerNote).toContain("2026-04-09");
  });

  it("populates Schedule A current owner and legal description", () => {
    expect(doc.scheduleA.currentOwner.value).toBe("POPHAM CHRISTOPHER / ASHLEY");
    expect(doc.scheduleA.legalDescription.value).toBe(data.parcel.legal_description);
    expect(doc.scheduleA.apn).toBe("304-78-386");
    expect(doc.scheduleA.subdivision).toBe("Seville Parcel 3");
  });

  it("preserves provenance and confidence on Schedule A fields", () => {
    // Per Decisions #19, #20 — owner + legal desc on a parcel record are manual_entry.
    expect(doc.scheduleA.currentOwner.provenance).toBe("manual_entry");
    expect(doc.scheduleA.legalDescription.provenance).toBe("manual_entry");
  });

  it("renders all 4 POPHAM lifecycles in lifecycles.json order", () => {
    expect(doc.scheduleB2.map((r) => r.lifecycleId)).toEqual([
      "lc-001",
      "lc-002",
      "lc-004",
    ]);
    // lc-003 is HOGUE-only; data-loader scopes lifecycles to this parcel.
    // POPHAM has lc-001, lc-002, lc-004.
  });

  it("released lifecycle (lc-001) has no closingImpact", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!;
    expect(row.status).toBe("released");
    expect(row.closingImpact).toBeUndefined();
  });

  it("open lifecycle (lc-002, root is DOT) renders DOT closing-impact template", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-002")!;
    expect(row.status).toBe("open");
    expect(row.closingImpact).toContain("payoff statement and recorded reconveyance");
  });

  it("plat lifecycle (lc-004) is tagged as subdivision encumbrance", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-004")!;
    expect(row.subtype).toBe("subdivision_encumbrance");
  });

  it("citation URL on rootInstrument uses the public API PDF endpoint", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!;
    expect(row.rootInstrument.pdfUrl).toBe(
      "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=20130183450",
    );
  });

  it("Sources block lists each cited instrument with its metadata URL prefixed", () => {
    expect(doc.sources.countyApiBase).toBe("https://publicapi.recorder.maricopa.gov");
    const entry20130183450 = doc.sources.perInstrumentMetadataUrls.find(
      (e) => e.recordingNumber === "20130183450",
    );
    expect(entry20130183450).toBeDefined();
    expect(entry20130183450!.url).toBe(
      "https://publicapi.recorder.maricopa.gov/documents/20130183450",
    );
    // each unique instrument cited in B-II appears exactly once in sources
    const all = doc.sources.perInstrumentMetadataUrls.map((e) => e.recordingNumber);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("buildCommitment — viewedInstrumentNumber anchoring", () => {
  const data = loadParcelDataByApn(POPHAM_APN);

  it("sets viewedMarker on the row whose root matches the viewed instrument", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
      viewedInstrumentNumber: "20210057847", // root of lc-002
    });
    expect(doc.scheduleB2.find((r) => r.lifecycleId === "lc-002")!.viewedMarker).toBe(true);
    expect(doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!.viewedMarker).toBe(false);
  });

  it("sets viewedMarker on the row whose child matches the viewed instrument", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
      viewedInstrumentNumber: "20210075858", // release child of lc-001
    });
    expect(doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!.viewedMarker).toBe(true);
  });

  it("leaves all viewedMarker false when prop is absent", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(doc.scheduleB2.every((r) => r.viewedMarker === false)).toBe(true);
  });
});

describe("buildCommitment — HOGUE regression (narrow)", () => {
  const data = loadParcelDataByApn(HOGUE_APN);

  it("does not throw", () => {
    expect(() =>
      buildCommitment({
        parcel: data.parcel,
        instruments: data.instruments,
        links: data.links,
        lifecycles: data.lifecycles,
        pipelineStatus: data.pipelineStatus,
        closingImpactTemplates,
        generatedAt: FIXED_GENERATED_AT,
      }),
    ).not.toThrow();
  });

  it("includes lc-003 with verbatim rationale text from lifecycles.json", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
    });
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-003");
    expect(row).toBeDefined();
    // Pull the verbatim phrase from the source-of-truth lifecycle, not re-typed.
    const sourceLifecycle = data.lifecycles.find((lc) => lc.id === "lc-003")!;
    expect(row!.rationale).toBe(sourceLifecycle.status_rationale);
    expect(row!.rationale).toContain(
      "Maricopa public API does not support name-filtered document search",
    );
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/logic/commitment-builder.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/logic/commitment-builder.ts`:

```ts
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
  ProvenanceKind,
  FieldWithProvenance,
  DocumentType,
} from "../types";

const COUNTY_NAME = "Maricopa County, AZ";
const COUNTY_API_BASE = "https://publicapi.recorder.maricopa.gov";

// Explicit allow-list per spec — schema has no subtype field, and
// document_type "other" is too broad to use as a subtype signal.
// When a future plat is curated, the curator updates this set.
const SUBDIVISION_ENCUMBRANCE_ROOTS = new Set<string>(["20010093192"]);

export interface ClosingImpactTemplate {
  status: "open";
  root_doc_type: string;
  template: string;
}

export interface BuildCommitmentInput {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  closingImpactTemplates: ClosingImpactTemplate[];
  generatedAt: string; // ISO 8601, injected for testability
  viewedInstrumentNumber?: string;
}

export interface B2InstrumentRef {
  recordingNumber: string;
  documentType: string;
  recordingDate: string;
  pdfUrl: string;
}

export interface B2RowParty {
  role: string;
  name: string;
  provenance: ProvenanceKind;
  confidence: number;
}

export interface ScheduleB2Row {
  lifecycleId: string;
  status: "open" | "released" | "unresolved" | "possible_match";
  rootInstrument: B2InstrumentRef;
  childInstruments: B2InstrumentRef[];
  rationale: string;
  closingImpact?: string;
  parties: B2RowParty[];
  viewedMarker: boolean;
  subtype?: "subdivision_encumbrance";
}

export interface CommitmentDocument {
  header: {
    countyName: string;
    parcelApn: string;
    parcelAddress: string;
    verifiedThroughDate: string;
    generatedAt: string;
    headerNote: string;
    countyAuthoritativeUrls: {
      assessorUrl: string | undefined;
      recorderApiBase: string;
    };
  };
  scheduleA: {
    currentOwner: FieldWithProvenance;
    legalDescription: FieldWithProvenance;
    apn: string;
    subdivision: string;
    vesting?: FieldWithProvenance;
  };
  scheduleB2: ScheduleB2Row[];
  sources: {
    countyApiBase: string;
    perInstrumentMetadataUrls: Array<{
      recordingNumber: string;
      url: string;
    }>;
  };
}

function pdfUrlFor(recordingNumber: string): string {
  return `${COUNTY_API_BASE}/preview/pdf?recordingNumber=${recordingNumber}`;
}

function metadataUrlFor(recordingNumber: string): string {
  return `${COUNTY_API_BASE}/documents/${recordingNumber}`;
}

function instrumentRef(inst: Instrument): B2InstrumentRef {
  return {
    recordingNumber: inst.instrument_number,
    documentType: humanizeDocType(inst.document_type),
    recordingDate: inst.recording_date,
    pdfUrl: pdfUrlFor(inst.instrument_number),
  };
}

function humanizeDocType(t: DocumentType): string {
  // Schema enum → human-readable label
  const map: Record<DocumentType, string> = {
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
    other: "Other",
  };
  return map[t] ?? t;
}

function findClosingImpact(
  templates: ClosingImpactTemplate[],
  status: string,
  rootDocType: DocumentType,
): string | undefined {
  if (status !== "open") return undefined;
  return templates.find(
    (t) => t.status === status && t.root_doc_type === rootDocType,
  )?.template;
}

function vestingFromLatestDeed(
  instruments: Instrument[],
): FieldWithProvenance | undefined {
  // Pick most recent deed-family instrument with a vesting field.
  const deeds = instruments
    .filter((i) =>
      ["warranty_deed", "special_warranty_deed", "quit_claim_deed", "grant_deed"].includes(
        i.document_type,
      ),
    )
    .sort((a, b) => (b.recording_date < a.recording_date ? -1 : 1));
  for (const d of deeds) {
    const v = d.extracted_fields["vesting"];
    if (v) return v;
  }
  return undefined;
}

function buildHeaderNote(verifiedThroughDate: string): string {
  return `This report is a chain-and-encumbrance abstract of the recorded corpus as of ${verifiedThroughDate}. Schedule B-I (Requirements) is transaction-scoped \u2014 items such as payoff of open deeds of trust, satisfaction of assignments, or curative affidavits are generated when a closing opens against a specific buyer, lender, and effective date. Those inputs are not part of the recorded corpus and are out of scope for this abstract.`;
}

export function buildCommitment(input: BuildCommitmentInput): CommitmentDocument {
  const {
    parcel,
    instruments,
    lifecycles,
    pipelineStatus,
    closingImpactTemplates,
    generatedAt,
    viewedInstrumentNumber,
  } = input;

  const instrumentMap = new Map(
    instruments.map((i) => [i.instrument_number, i]),
  );

  const scheduleB2: ScheduleB2Row[] = lifecycles.map((lc) => {
    const root = instrumentMap.get(lc.root_instrument);
    if (!root) {
      throw new Error(
        `commitment-builder: lifecycle ${lc.id} references unknown root instrument ${lc.root_instrument}`,
      );
    }
    const children = lc.child_instruments
      .map((n) => instrumentMap.get(n))
      .filter((x): x is Instrument => Boolean(x));

    const isViewed =
      viewedInstrumentNumber !== undefined &&
      (lc.root_instrument === viewedInstrumentNumber ||
        lc.child_instruments.includes(viewedInstrumentNumber));

    const subtype = SUBDIVISION_ENCUMBRANCE_ROOTS.has(lc.root_instrument)
      ? "subdivision_encumbrance"
      : undefined;

    return {
      lifecycleId: lc.id,
      status: lc.status,
      rootInstrument: instrumentRef(root),
      childInstruments: children.map(instrumentRef),
      rationale: lc.status_rationale,
      closingImpact: findClosingImpact(
        closingImpactTemplates,
        lc.status,
        root.document_type,
      ),
      parties: root.parties.map((p) => ({
        role: p.role,
        name: p.name,
        provenance: p.provenance,
        confidence: p.confidence,
      })),
      viewedMarker: isViewed,
      subtype,
    };
  });

  // Unique cited recording numbers — each lifecycle's root + its children.
  const cited = new Set<string>();
  for (const lc of lifecycles) {
    cited.add(lc.root_instrument);
    for (const c of lc.child_instruments) cited.add(c);
  }
  const perInstrumentMetadataUrls = Array.from(cited)
    .sort()
    .map((n) => ({ recordingNumber: n, url: metadataUrlFor(n) }));

  return {
    header: {
      countyName: COUNTY_NAME,
      parcelApn: parcel.apn,
      parcelAddress: `${parcel.address}, ${parcel.city}, ${parcel.state} ${parcel.zip}`,
      verifiedThroughDate: pipelineStatus.verified_through_date,
      generatedAt,
      headerNote: buildHeaderNote(pipelineStatus.verified_through_date),
      countyAuthoritativeUrls: {
        assessorUrl: parcel.assessor_url,
        recorderApiBase: COUNTY_API_BASE,
      },
    },
    scheduleA: {
      currentOwner: {
        // Decision #19 — current_owner on parcel record is curator-entered.
        value: parcel.current_owner,
        provenance: "manual_entry",
        confidence: 1,
      },
      legalDescription: {
        // Decision #20 — legal description on parcel record is curator-entered (or OCR'd to that field).
        value: parcel.legal_description,
        provenance: "manual_entry",
        confidence: 1,
      },
      apn: parcel.apn,
      subdivision: parcel.subdivision,
      vesting: vestingFromLatestDeed(instruments),
    },
    scheduleB2,
    sources: {
      countyApiBase: COUNTY_API_BASE,
      perInstrumentMetadataUrls,
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/logic/commitment-builder.test.ts
```

Expected: all assertions pass.

- [ ] **Step 5: Run full suite to confirm no regression**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm test
```

Expected: 105 prior + 18 new = 123 tests pass (5 from format-provenance-tag + 13 from commitment-builder).

Note: the exact "POPHAM has 3 lifecycles (lc-001, lc-002, lc-004)" assertion in the test depends on data-loader scoping correctly. If the test expects 4 rows (including lc-003) it will fail — re-read the assertion. POPHAM's curated `instrument_numbers` does not include the HOGUE root instrument 20150516730, so data-loader filters lc-003 out. The test asserts the correct 3-row outcome.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git add src/logic/commitment-builder.ts src/logic/commitment-builder.test.ts && git commit -m "$(cat <<'EOF'
feat(commitment-export): pure document-model builder for parcel-level commitment

Composes Schedule A + Schedule B-II from parcel + instruments +
lifecycles + pipelineStatus. Provenance and confidence preserved on
every field. Closing-impact template lookup co-located with open-row
rendering. Subdivision-encumbrance subtype detected via explicit
allow-list. HOGUE regression test asserts verbatim lc-003 rationale
without re-typing source text.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### ⛔ REVIEW CHECKPOINT 1

**Stop here.** Builder logic is correct before any PDF concern. Confirm with the user that the document model shape is right before proceeding to PDF rendering. Show:
- Test count (should be 18 new, 123 total).
- The shape of `CommitmentDocument` as defined in the implementation.

---

## Task 4: commitment-pdf renderer (TDD + dev-server smoke test) — REVIEW CHECKPOINT 2

**Files:**
- Create: `src/logic/commitment-pdf.ts`
- Create: `src/logic/commitment-pdf.test.ts`
- Modify: `docs/superpowers/specs/2026-04-14-commitment-export-design.md` — fill in "Layout decision" section

- [ ] **Step 1: Write the failing test**

Create `src/logic/commitment-pdf.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderCommitmentPdf } from "./commitment-pdf";
import { buildCommitment } from "./commitment-builder";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

describe("renderCommitmentPdf", () => {
  const data = loadParcelDataByApn("304-78-386");
  const doc = buildCommitment({
    parcel: data.parcel,
    instruments: data.instruments,
    links: data.links,
    lifecycles: data.lifecycles,
    pipelineStatus: data.pipelineStatus,
    closingImpactTemplates,
    generatedAt: "2026-04-14T12:00:00.000Z",
  });

  it("returns a Blob with application/pdf mime", () => {
    const blob = renderCommitmentPdf(doc);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });

  it("starts with %PDF- magic bytes", async () => {
    const blob = renderCommitmentPdf(doc);
    const buf = await blob.arrayBuffer();
    const head = new TextDecoder().decode(buf.slice(0, 5));
    expect(head).toBe("%PDF-");
  });

  it("produces a non-trivial PDF (>1KB)", () => {
    const blob = renderCommitmentPdf(doc);
    expect(blob.size).toBeGreaterThan(1024);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/logic/commitment-pdf.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation (Branch A — legal description in Schedule A table)**

Create `src/logic/commitment-pdf.ts`:

```ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CommitmentDocument, ScheduleB2Row } from "./commitment-builder";
import { formatProvenanceTag } from "./format-provenance-tag";

const MARGIN_X = 14;
const PAGE_WIDTH_PT = 210; // mm — A4 default for jsPDF unit:'mm'
const HEADING_FONT_SIZE = 14;
const SUBHEADING_FONT_SIZE = 11;
const BODY_FONT_SIZE = 10;
const SMALL_FONT_SIZE = 8;

export function renderCommitmentPdf(doc: CommitmentDocument): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;

  // ---------- Header ----------
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(HEADING_FONT_SIZE);
  pdf.text("Chain-and-Encumbrance Abstract", MARGIN_X, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(BODY_FONT_SIZE);
  pdf.text(doc.header.countyName, MARGIN_X, y);
  y += 5;
  pdf.text(`APN ${doc.header.parcelApn} \u2014 ${doc.header.parcelAddress}`, MARGIN_X, y);
  y += 5;
  pdf.text(
    `Verified through ${doc.header.verifiedThroughDate} \u2022 Generated ${doc.header.generatedAt}`,
    MARGIN_X,
    y,
  );
  y += 8;

  // Header note (transaction-scoped explainer)
  pdf.setFontSize(SMALL_FONT_SIZE);
  const noteLines = pdf.splitTextToSize(
    doc.header.headerNote,
    PAGE_WIDTH_PT - MARGIN_X * 2,
  );
  pdf.text(noteLines, MARGIN_X, y);
  y += noteLines.length * 4 + 4;

  // ---------- Schedule A ----------
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(SUBHEADING_FONT_SIZE);
  pdf.text("Schedule A \u2014 Vesting and Description", MARGIN_X, y);
  y += 4;

  autoTable(pdf, {
    startY: y,
    theme: "grid",
    styles: { fontSize: BODY_FONT_SIZE, cellPadding: 2 },
    head: [["Field", "Value"]],
    headStyles: { fillColor: [240, 240, 240], textColor: 30 },
    body: [
      ["APN", doc.scheduleA.apn],
      ["Subdivision", doc.scheduleA.subdivision],
      [
        "Current Owner",
        `${doc.scheduleA.currentOwner.value} ${formatProvenanceTag(
          doc.scheduleA.currentOwner.provenance,
          doc.scheduleA.currentOwner.confidence,
        )}`,
      ],
      ...(doc.scheduleA.vesting
        ? [
            [
              "Vesting",
              `${doc.scheduleA.vesting.value} ${formatProvenanceTag(
                doc.scheduleA.vesting.provenance,
                doc.scheduleA.vesting.confidence,
              )}`,
            ],
          ]
        : []),
      [
        "Legal Description",
        `${doc.scheduleA.legalDescription.value} ${formatProvenanceTag(
          doc.scheduleA.legalDescription.provenance,
          doc.scheduleA.legalDescription.confidence,
        )}`,
      ],
    ],
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: "auto" } },
  });
  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ---------- Schedule B-II ----------
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(SUBHEADING_FONT_SIZE);
  pdf.text(
    "Schedule B-II \u2014 Encumbrances of Record",
    MARGIN_X,
    y,
  );
  y += 4;

  for (const row of doc.scheduleB2) {
    if (y > 260) {
      pdf.addPage();
      y = 18;
    }
    y = renderB2Row(pdf, row, y);
    y += 4;
  }

  // ---------- Sources ----------
  if (y > 240) {
    pdf.addPage();
    y = 18;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(SUBHEADING_FONT_SIZE);
  pdf.text("Sources", MARGIN_X, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(SMALL_FONT_SIZE);
  pdf.text(`County API base: ${doc.sources.countyApiBase}`, MARGIN_X, y);
  y += 4;
  if (doc.header.countyAuthoritativeUrls.assessorUrl) {
    pdf.text(
      `Assessor: ${doc.header.countyAuthoritativeUrls.assessorUrl}`,
      MARGIN_X,
      y,
    );
    y += 4;
  }
  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.text("Per-instrument metadata URLs:", MARGIN_X, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  for (const entry of doc.sources.perInstrumentMetadataUrls) {
    if (y > 285) {
      pdf.addPage();
      y = 18;
    }
    pdf.text(`${entry.recordingNumber}: ${entry.url}`, MARGIN_X, y);
    y += 4;
  }

  return pdf.output("blob");
}

function renderB2Row(pdf: jsPDF, row: ScheduleB2Row, startY: number): number {
  let y = startY;

  // Row header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(BODY_FONT_SIZE);
  const subtypeTag =
    row.subtype === "subdivision_encumbrance" ? " (subdivision encumbrance)" : "";
  const viewedTag = row.viewedMarker ? "  \u2190 viewed" : "";
  pdf.text(
    `${row.lifecycleId.toUpperCase()} \u2014 ${row.status.toUpperCase()}${subtypeTag}${viewedTag}`,
    MARGIN_X,
    y,
  );
  y += 5;

  // Root + children table
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(SMALL_FONT_SIZE);

  const body: string[][] = [];
  body.push([
    rowLabelForRoot(row),
    row.rootInstrument.recordingNumber,
    row.rootInstrument.documentType,
    row.rootInstrument.recordingDate,
    row.rootInstrument.pdfUrl,
  ]);
  for (const child of row.childInstruments) {
    body.push([
      "  release",
      child.recordingNumber,
      child.documentType,
      child.recordingDate,
      child.pdfUrl,
    ]);
  }
  autoTable(pdf, {
    startY: y,
    theme: "grid",
    styles: { fontSize: SMALL_FONT_SIZE, cellPadding: 1.5 },
    head: [["Role", "Recording #", "Type", "Date", "Document URL"]],
    headStyles: { fillColor: [248, 248, 248], textColor: 60 },
    body,
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: "auto" },
    },
  });
  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

  // Rationale
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(SMALL_FONT_SIZE);
  const ratLines = pdf.splitTextToSize(
    `Rationale: ${row.rationale}`,
    PAGE_WIDTH_PT - MARGIN_X * 2,
  );
  pdf.text(ratLines, MARGIN_X, y);
  y += ratLines.length * 3.5;

  // Closing impact (open rows only)
  if (row.closingImpact) {
    pdf.setFont("helvetica", "normal");
    const ciLines = pdf.splitTextToSize(
      `Closing impact: ${row.closingImpact}`,
      PAGE_WIDTH_PT - MARGIN_X * 2,
    );
    pdf.text(ciLines, MARGIN_X, y);
    y += ciLines.length * 3.5;
  }

  // Parties
  if (row.parties.length > 0) {
    pdf.setFont("helvetica", "normal");
    const partyLines = row.parties.map(
      (p) =>
        `  ${p.role}: ${p.name} ${formatProvenanceTag(p.provenance, p.confidence)}`,
    );
    const wrapped = pdf.splitTextToSize(
      partyLines.join("\n"),
      PAGE_WIDTH_PT - MARGIN_X * 2,
    );
    pdf.text(wrapped, MARGIN_X, y);
    y += wrapped.length * 3.5;
  }

  return y;
}

function rowLabelForRoot(row: ScheduleB2Row): string {
  if (row.status === "released") return "root (released)";
  return "root";
}
```

- [ ] **Step 4: Run the unit tests**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/logic/commitment-pdf.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Smoke-test layout in dev — write fixture PDF to disk**

Create `scripts/smoke-commitment-pdf.mjs`:

```js
// One-shot smoke test: builds the POPHAM commitment PDF and writes it to
// tmp/smoke-commitment.pdf so the developer can open it visually and
// resolve the Branch A vs Branch B layout decision for the legal
// description. Not part of npm test; not a regression suite.
//
// Run with: npm run smoke:commitment
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Use vite-node so TS imports resolve.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("ts-node/esm", pathToFileURL("./"));

const __dirname = dirname(fileURLToPath(import.meta.url));

const { buildCommitment } = await import("../src/logic/commitment-builder.ts");
const { renderCommitmentPdf } = await import("../src/logic/commitment-pdf.ts");
const { loadParcelDataByApn } = await import("../src/data-loader.ts");
const closingImpactTemplates = (
  await import("../src/data/closing-impact-templates.json", {
    assert: { type: "json" },
  })
).default;

const data = loadParcelDataByApn("304-78-386");
const doc = buildCommitment({
  parcel: data.parcel,
  instruments: data.instruments,
  links: data.links,
  lifecycles: data.lifecycles,
  pipelineStatus: data.pipelineStatus,
  closingImpactTemplates,
  generatedAt: new Date().toISOString(),
});
const blob = renderCommitmentPdf(doc);
const buf = Buffer.from(await blob.arrayBuffer());
const out = `${__dirname}/../tmp/smoke-commitment.pdf`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
console.log(`wrote ${out} (${buf.length} bytes)`);
```

If `ts-node/esm` is fragile in this Node setup, an alternate approach: write a Vitest one-shot that runs the same code and uses `node:fs` to write the PDF. Use whichever is simpler in the live environment. The Vitest variant:

```ts
// Or: src/logic/commitment-pdf.smoke.test.ts (skipped by default).
import { writeFileSync, mkdirSync } from "node:fs";
import { describe, it } from "vitest";
import { buildCommitment } from "./commitment-builder";
import { renderCommitmentPdf } from "./commitment-pdf";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

describe.skip("PDF smoke (manual run only)", () => {
  it("writes tmp/smoke-commitment.pdf", async () => {
    const data = loadParcelDataByApn("304-78-386");
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: new Date().toISOString(),
    });
    const blob = renderCommitmentPdf(doc);
    const buf = Buffer.from(await blob.arrayBuffer());
    mkdirSync("tmp", { recursive: true });
    writeFileSync("tmp/smoke-commitment.pdf", buf);
  });
});
```

Run the skip-removed version once to produce the PDF:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run -t "writes tmp/smoke-commitment.pdf"
```

Open `tmp/smoke-commitment.pdf` in a viewer and inspect:
- Schedule A legal description cell — does the ~250-char Seville text wrap reasonably?
- Schedule B-II — every instrument's PDF URL visible, no truncation.
- Header note — the transaction-scoped paragraph is fully readable.
- Sources — one line per recording number, prefix legible.

- [ ] **Step 6: Decide Branch A vs Branch B**

If Schedule A's legal description cell renders cleanly (wraps within the cell, no overflow): **Branch A wins**. No code change.

If it overflows or wraps in an ugly way: **Branch B**. Lift the legal description out of the Schedule A table into a stand-alone bordered block above the table. To implement Branch B:

In `commitment-pdf.ts`, in the Schedule A section, **remove** the `Legal Description` row from the autoTable body and **prepend** this block before the autoTable call:

```ts
// Branch B: stand-alone bordered legal description above Schedule A table.
pdf.setDrawColor(180, 180, 180);
pdf.setLineWidth(0.2);
const ldText = `${doc.scheduleA.legalDescription.value} ${formatProvenanceTag(
  doc.scheduleA.legalDescription.provenance,
  doc.scheduleA.legalDescription.confidence,
)}`;
const ldLines = pdf.splitTextToSize(ldText, PAGE_WIDTH_PT - MARGIN_X * 2 - 4);
const ldHeight = ldLines.length * 4 + 4;
pdf.rect(MARGIN_X, y, PAGE_WIDTH_PT - MARGIN_X * 2, ldHeight);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(SMALL_FONT_SIZE);
pdf.text("Legal Description", MARGIN_X + 2, y + 4);
pdf.setFont("helvetica", "normal");
pdf.text(ldLines, MARGIN_X + 2, y + 8);
y += ldHeight + 4;
```

Re-run smoke test, re-open PDF, confirm.

- [ ] **Step 7: Update spec with the layout decision**

Edit `docs/superpowers/specs/2026-04-14-commitment-export-design.md`. In the section "Layout decision (filled at verification)", replace the empty placeholder with:

For Branch A:
```markdown
### Layout decision (filled at verification)

**Branch A shipped.** Schedule A legal description renders inside the
Schedule A two-column table. Wrap behavior is acceptable for the
~250-char Seville Parcel 3 description; future descriptions longer
than ~400 chars may need Branch B.
```

For Branch B:
```markdown
### Layout decision (filled at verification)

**Branch B shipped.** Schedule A legal description renders as a
stand-alone bordered block immediately above the Schedule A
two-column table. Branch A wrapping was visually unacceptable for
the ~250-char Seville Parcel 3 description (overflow / poor wrap).
```

- [ ] **Step 8: Delete or re-skip the smoke test before commit**

If you used the Vitest variant, restore `describe.skip(...)` so it doesn't run on every `npm test`. The smoke artifact `tmp/smoke-commitment.pdf` is in `tmp/` which is already git-ignored (verify with `git status`). If `tmp/` is not git-ignored, add it to `.gitignore` in this commit.

- [ ] **Step 9: Run full suite**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm test
```

Expected: 105 prior + 5 (tag) + 13 (builder) + 3 (pdf) = 126 tests pass.

- [ ] **Step 10: Commit**

```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git add src/logic/commitment-pdf.ts src/logic/commitment-pdf.test.ts docs/superpowers/specs/2026-04-14-commitment-export-design.md .gitignore && git commit -m "$(cat <<'EOF'
feat(commitment-export): jsPDF renderer with Schedule A + B-II + Sources

Pure renderer takes a CommitmentDocument and returns a Blob. Inline
provenance tags on every field via formatProvenanceTag. Per-row
PDF URL citations to the public API. Sources block lists per-instrument
metadata URLs prefixed with the recording number for fast verification
lookup. Layout branch (A vs B for legal description) recorded in spec.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### ⛔ REVIEW CHECKPOINT 2

**Stop here.** PDF renders, layout decision made and recorded. Confirm with the user. Show:
- Layout branch chosen (A or B) with a one-line rationale.
- Path to the smoke artifact (`tmp/smoke-commitment.pdf`) so they can open it.
- Test count (126 total).

---

## Task 5: ExportCommitmentButton component (TDD)

**Files:**
- Create: `src/components/ExportCommitmentButton.tsx`
- Create: `src/components/ExportCommitmentButton.test.tsx`

- [ ] **Step 1: Check for an existing testing-library setup**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && grep -E '"@testing-library' package.json || echo "no testing-library installed"
```

If "no testing-library installed" prints, **do not** install one — the existing test suite has 105 passing tests without it. Test the button by mocking and asserting on the builder/renderer call sequence (a logic test, not a render test). The component's responsibility is "wire props to builder + renderer + download" — that's exactly what we test.

- [ ] **Step 2: Write the failing test**

Create `src/components/ExportCommitmentButton.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { triggerCommitmentDownload } from "./ExportCommitmentButton";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

describe("triggerCommitmentDownload", () => {
  const data = loadParcelDataByApn("304-78-386");

  beforeEach(() => {
    // Mock browser-only APIs jsdom doesn't fully implement
    if (!globalThis.URL.createObjectURL) {
      // @ts-expect-error — test shim
      globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    }
    if (!globalThis.URL.revokeObjectURL) {
      // @ts-expect-error — test shim
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  it("returns a CommitmentDocument with the correct parcel APN", () => {
    const result = triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      download: vi.fn(),
    });
    expect(result.doc.header.parcelApn).toBe("304-78-386");
  });

  it("forwards viewedInstrumentNumber when present", () => {
    const result = triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      viewedInstrumentNumber: "20210075858",
      download: vi.fn(),
    });
    const lc001 = result.doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!;
    expect(lc001.viewedMarker).toBe(true);
  });

  it("invokes the download callback with the right filename", () => {
    const download = vi.fn();
    triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      download,
    });
    expect(download).toHaveBeenCalledTimes(1);
    const [blob, filename] = download.mock.calls[0];
    expect(blob.type).toBe("application/pdf");
    // APN dashes stripped, today's verified-through date used.
    expect(filename).toMatch(/^commitment-30478386-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("uses verifiedThroughDate (not generatedAt) for the filename date suffix", () => {
    const download = vi.fn();
    triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      download,
    });
    const [, filename] = download.mock.calls[0];
    // pipelineStatus.verified_through_date is "2026-04-09" in fixtures.
    expect(filename).toBe("commitment-30478386-2026-04-09.pdf");
  });
});
```

The test exposes a pure function `triggerCommitmentDownload` separate from the React component. The React `onClick` handler is a one-liner that calls `triggerCommitmentDownload`. This is the pattern used by `formatCitation` (already in the codebase) — pure logic separated from component, easy to unit-test, no DOM mocking required.

- [ ] **Step 3: Run the test to confirm it fails**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/components/ExportCommitmentButton.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

Create `src/components/ExportCommitmentButton.tsx`:

```tsx
import { useCallback } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
} from "../types";
import {
  buildCommitment,
  type CommitmentDocument,
  type ClosingImpactTemplate,
} from "../logic/commitment-builder";
import { renderCommitmentPdf } from "../logic/commitment-pdf";
import closingImpactTemplates from "../data/closing-impact-templates.json";

export interface TriggerInput {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  closingImpactTemplates: ClosingImpactTemplate[];
  generatedAt: string;
  viewedInstrumentNumber?: string;
  download: (blob: Blob, filename: string) => void;
}

export interface TriggerResult {
  doc: CommitmentDocument;
  blob: Blob;
  filename: string;
}

export function triggerCommitmentDownload(input: TriggerInput): TriggerResult {
  const doc = buildCommitment({
    parcel: input.parcel,
    instruments: input.instruments,
    links: input.links,
    lifecycles: input.lifecycles,
    pipelineStatus: input.pipelineStatus,
    closingImpactTemplates: input.closingImpactTemplates,
    generatedAt: input.generatedAt,
    viewedInstrumentNumber: input.viewedInstrumentNumber,
  });
  const blob = renderCommitmentPdf(doc);
  const apnNoDashes = input.parcel.apn.replace(/-/g, "");
  const filename = `commitment-${apnNoDashes}-${input.pipelineStatus.verified_through_date}.pdf`;
  input.download(blob, filename);
  return { doc, blob, filename };
}

function browserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke a tick so Safari/Firefox don't cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface ButtonProps {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  viewedInstrumentNumber?: string;
  variant?: "drawer" | "panel";
}

export function ExportCommitmentButton(props: ButtonProps) {
  const handleClick = useCallback(() => {
    triggerCommitmentDownload({
      parcel: props.parcel,
      instruments: props.instruments,
      links: props.links,
      lifecycles: props.lifecycles,
      pipelineStatus: props.pipelineStatus,
      closingImpactTemplates: closingImpactTemplates as ClosingImpactTemplate[],
      generatedAt: new Date().toISOString(),
      viewedInstrumentNumber: props.viewedInstrumentNumber,
      download: browserDownload,
    });
  }, [
    props.parcel,
    props.instruments,
    props.links,
    props.lifecycles,
    props.pipelineStatus,
    props.viewedInstrumentNumber,
  ]);

  // Match the existing Copy Citation button styling.
  const cls =
    "px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors";
  return (
    <button
      onClick={handleClick}
      className={cls}
      title="Download a PDF chain-and-encumbrance abstract for this parcel"
    >
      Export Commitment for Parcel
    </button>
  );
}
```

- [ ] **Step 5: Run the test**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npx vitest run src/components/ExportCommitmentButton.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 6: Run the full suite**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm test
```

Expected: 105 + 5 + 13 + 3 + 4 = 130 tests pass.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git add src/components/ExportCommitmentButton.tsx src/components/ExportCommitmentButton.test.tsx && git commit -m "$(cat <<'EOF'
feat(commitment-export): ExportCommitmentButton with pure trigger separated from React handler

triggerCommitmentDownload is a pure function over (parcel, instruments,
links, lifecycles, pipelineStatus) → (doc, blob, filename) plus an
injected download callback. The React component is a one-line wrapper
around it. Mirrors the formatCitation pattern already in the codebase.
Filename is commitment-{apn-no-dashes}-{verified-through-date}.pdf.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire button into Proof Drawer + Encumbrance panel via headerActions slot — REVIEW CHECKPOINT 3

**Files:**
- Modify: `src/components/ProofDrawer.tsx` — add `headerActions?: ReactNode` prop, render in header
- Modify: `src/components/EncumbranceLifecycle.tsx` — add `headerActions?: ReactNode` prop, render in panel header
- Modify: `src/router.tsx` — instantiate `ExportCommitmentButton` and pass it via the slot to both surfaces

- [ ] **Step 1: Add the slot prop to ProofDrawer**

In `src/components/ProofDrawer.tsx`:

Update the `import` line at top:
```ts
import { useCallback, useState, type ReactNode } from "react";
```

Update the `Props` interface (around line 17–22):
```ts
interface Props {
  instrument: Instrument;
  links: DocumentLink[];
  corpusProvenance: CorpusProvenance;
  onClose: () => void;
  headerActions?: ReactNode;
}
```

Update the function signature (around line 24):
```ts
export function ProofDrawer({ instrument, links, corpusProvenance, onClose, headerActions }: Props) {
```

Update the header button row (around lines 55–69) — render `headerActions` immediately to the LEFT of `Copy Citation` so the new button sits between the provenance summary and the existing copy button:

Before:
```tsx
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCitation}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              title="Copy formatted citation to clipboard"
            >
              Copy Citation
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-lg"
            >
              &times;
            </button>
          </div>
```

After:
```tsx
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={handleCopyCitation}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              title="Copy formatted citation to clipboard"
            >
              Copy Citation
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-lg"
            >
              &times;
            </button>
          </div>
```

- [ ] **Step 2: Add the slot prop to EncumbranceLifecycle**

In `src/components/EncumbranceLifecycle.tsx`:

Update the `import` line at top:
```ts
import { useMemo, useState, type ReactNode } from "react";
```

Add `headerActions?: ReactNode` to the `Props` interface (around line 27–41):
```ts
interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  pipelineStatus: PipelineStatus;
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (
    lifecycleId: string,
    status: LifecycleStatus,
  ) => void;
  onOpenDocument: (instrumentNumber: string) => void;
  headerActions?: ReactNode;
}
```

Update the destructured props (around lines 73–84):
```ts
export function EncumbranceLifecycle({
  parcel,
  instruments,
  links,
  lifecycles,
  pipelineStatus,
  linkActions,
  lifecycleOverrides,
  onSetLinkAction,
  onSetLifecycleOverride,
  onOpenDocument,
  headerActions,
}: Props) {
```

Update the panel header (around lines 128–135) to add the slot beside the heading:

Before:
```tsx
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Encumbrance Lifecycles
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {parcel.address} &mdash; APN: {parcel.apn}
        </p>
      </div>
```

After:
```tsx
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Encumbrance Lifecycles
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {parcel.address} &mdash; APN: {parcel.apn}
          </p>
        </div>
        {headerActions && <div className="shrink-0">{headerActions}</div>}
      </div>
```

- [ ] **Step 3: Wire ExportCommitmentButton into the router**

In `src/router.tsx`:

Update the import block at top:
```tsx
import { ExportCommitmentButton } from "./components/ExportCommitmentButton";
```

Update `ChainRouteInner` (around line 178). Change the `<ProofDrawer ... />` JSX to pass the new slot:

Before:
```tsx
  const drawerNode =
    drawerOpen && instrumentForDrawer ? (
      <ProofDrawer
        instrument={instrumentForDrawer}
        links={linksForDrawer}
        corpusProvenance={corpusProvenanceOf(data)}
        onClose={closeDrawer}
      />
    ) : drawerOpen ? (
```

After:
```tsx
  const drawerNode =
    drawerOpen && instrumentForDrawer ? (
      <ProofDrawer
        instrument={instrumentForDrawer}
        links={linksForDrawer}
        corpusProvenance={corpusProvenanceOf(data)}
        onClose={closeDrawer}
        headerActions={
          <ExportCommitmentButton
            parcel={data.parcel}
            instruments={data.instruments}
            links={data.links}
            lifecycles={data.lifecycles}
            pipelineStatus={data.pipelineStatus}
            viewedInstrumentNumber={instrumentForDrawer.instrument_number}
          />
        }
      />
    ) : drawerOpen ? (
```

Update `EncumbranceRouteInner` (around line 240) — both the `<ProofDrawer>` (with `viewedInstrumentNumber`) and the `<EncumbranceLifecycle>` panel get a button.

For the drawer block in `EncumbranceRouteInner`, mirror the change above:

```tsx
  const drawerNode =
    drawerOpen && instrumentForDrawer ? (
      <ProofDrawer
        instrument={instrumentForDrawer}
        links={linksForDrawer}
        corpusProvenance={corpusProvenanceOf(data)}
        onClose={closeDrawer}
        headerActions={
          <ExportCommitmentButton
            parcel={data.parcel}
            instruments={data.instruments}
            links={data.links}
            lifecycles={data.lifecycles}
            pipelineStatus={data.pipelineStatus}
            viewedInstrumentNumber={instrumentForDrawer.instrument_number}
          />
        }
      />
    ) : drawerOpen ? (
```

For the `<EncumbranceLifecycle ...>` JSX (around line 257), add the slot:

Before:
```tsx
        <EncumbranceLifecycle
          parcel={data.parcel}
          instruments={data.instruments}
          links={data.links}
          lifecycles={data.lifecycles}
          pipelineStatus={data.pipelineStatus}
          linkActions={examiner.linkActions}
          lifecycleOverrides={examiner.lifecycleOverrides}
          onSetLinkAction={examiner.setLinkAction}
          onSetLifecycleOverride={examiner.setLifecycleOverride}
          onOpenDocument={openDrawer}
        />
```

After:
```tsx
        <EncumbranceLifecycle
          parcel={data.parcel}
          instruments={data.instruments}
          links={data.links}
          lifecycles={data.lifecycles}
          pipelineStatus={data.pipelineStatus}
          linkActions={examiner.linkActions}
          lifecycleOverrides={examiner.lifecycleOverrides}
          onSetLinkAction={examiner.setLinkAction}
          onSetLifecycleOverride={examiner.setLifecycleOverride}
          onOpenDocument={openDrawer}
          headerActions={
            <ExportCommitmentButton
              parcel={data.parcel}
              instruments={data.instruments}
              links={data.links}
              lifecycles={data.lifecycles}
              pipelineStatus={data.pipelineStatus}
              variant="panel"
            />
          }
        />
```

- [ ] **Step 4: Run the full test suite**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm test
```

Expected: 130 tests still pass (no regression — only props added, behavior preserved).

- [ ] **Step 5: Smoke-test in dev server**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm run dev
```

In a browser:
1. Navigate to `http://localhost:5173/parcel/304-78-386/instrument/20210075858`. Confirm the Proof Drawer header now shows two buttons: "Export Commitment for Parcel" (emerald) and "Copy Citation" (blue). Click the export button — a PDF downloads with filename `commitment-30478386-2026-04-09.pdf`. Open it and verify:
   - Schedule A has POPHAM CHRISTOPHER / ASHLEY + the Seville Parcel 3 legal description, both with `(manual)` provenance tags.
   - Schedule B-II has lc-001 (released, struck-through root + release child line), lc-002 (open, with closing impact line), lc-004 (subdivision encumbrance subtype tag).
   - lc-001's row shows `← viewed` because the URL targets `20210075858` (release child of lc-001).
   - Sources block at the bottom lists each cited recording number with its `https://publicapi.recorder.maricopa.gov/documents/{n}` URL.
2. Navigate to `http://localhost:5173/parcel/304-78-386/encumbrances`. Confirm the panel header now shows the export button. Click it — same PDF, no `← viewed` marker (no instrument context).
3. Navigate to `http://localhost:5173/parcel/304-77-689/encumbrances` (HOGUE). Click export. Confirm:
   - Filename `commitment-30477689-2026-04-09.pdf`.
   - Schedule B-II has lc-003 with verbatim rationale ("Maricopa public API does not support name-filtered document search").
   - Closing impact line: "...payoff statement and recorded reconveyance..."
4. Stop the dev server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git add src/components/ProofDrawer.tsx src/components/EncumbranceLifecycle.tsx src/router.tsx && git commit -m "$(cat <<'EOF'
feat(commitment-export): wire ExportCommitmentButton via headerActions slot on Proof Drawer + Encumbrance panel

Proof Drawer surface: button sits next to existing Copy Citation, passes
viewedInstrumentNumber so the matching Schedule B-II row renders the
"<-- viewed" anchor. Encumbrance panel surface: button sits in the panel
header, no instrument context. Both surfaces call the same generator.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### ⛔ REVIEW CHECKPOINT 3

**Stop here.** Both surfaces wired. Confirm with the user. Show:
- Two button surfaces visible in dev server (URLs above).
- A downloaded PDF for POPHAM with the verified content.
- A downloaded PDF for HOGUE with verbatim lc-003 rationale.

---

## Task 7: Document the new known gap and add Decision #39

**Files:**
- Modify: `docs/known-gaps.md` — append entry #14
- Modify: `CLAUDE.md` — append Decision #39

- [ ] **Step 1: Append known-gaps.md entry #14**

Append to `docs/known-gaps.md` (after entry #13):

```markdown

14. **Schedule B-I (Requirements) is not generated.**
    - *What's missing:* The exported commitment PDF emits Schedule A
      and Schedule B-II only. There is no Schedule B-I (Requirements)
      section.
    - *Why that's OK for this pitch:* B-I items are
      transaction-scoped — payoff statements, satisfactions, curative
      affidavits — generated when a closing opens against a specific
      buyer, lender, and effective date. None of those inputs are part
      of the recorded corpus. A fabricated B-I section would dilute
      every other honest gap surfaced on stage (HOGUE empty state,
      MERS note, hunt log). The PDF header note states this verbatim,
      and each open Schedule B-II row carries a `Closing impact:`
      sentence (sourced from `src/data/closing-impact-templates.json`,
      reviewed per the rule documented in
      `src/data/closing-impact-templates.README.md`) explaining what a
      B-I item *would* require if a transaction were opened.
    - *What production would do:* generate B-I when a closing file is
      opened against the parcel — payoff requests for open DOTs,
      satisfaction lookups for any unreleased assignments, curative
      requirements derived from chain anomalies. Every B-I item
      depends on transaction inputs (effective date, buyer, lender,
      title agent) that this prototype does not model.
```

- [ ] **Step 2: Append Decision #39 to CLAUDE.md**

In `CLAUDE.md`, find the Decision Log table and append a row at the end (after row 38). Match the existing pipe-delimited format.

The exact line to append (single row):
```markdown
| 39 | Commitment Export delivers the abstractor's actual deliverable | "Copy Citation" produces a single-instrument string; an abstractor produces a parcel-level chain-and-encumbrance abstract. New Export Commitment for Parcel button on Proof Drawer + Encumbrance panel emits a jsPDF document with Schedule A + Schedule B-II, inline (provenance, confidence) footnotes matching on-screen UI verbatim, county-authoritative PDF URLs cited per row, and per-instrument metadata URLs in a Sources block prefixed by recording number. Schedule B-I is intentionally absent (Known Gap #14) — the header note explains B-I is transaction-scoped and each open B-II row carries a Closing impact: sentence in lieu. | 2026-04-14 |
```

- [ ] **Step 3: Run the full test suite (sanity)**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm test
```

Expected: 130 tests pass.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git add docs/known-gaps.md CLAUDE.md && git commit -m "$(cat <<'EOF'
docs(commitment-export): Known Gap #14 (no Schedule B-I) + Decision #39

Decision row records the abstractor-deliverable rationale, the two button
surfaces, and the inline-provenance + Sources URL strategy. Known gap
explains why Schedule B-I is intentionally absent and how Closing impact:
sentences fill the role.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final verification — REVIEW CHECKPOINT 4

**No file changes.** This task verifies the branch ships clean.

- [ ] **Step 1: Full test suite**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm test
```

Expected: **130 tests pass, 0 failures.** If anything fails, investigate root cause before proceeding.

- [ ] **Step 2: Production build**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm run build
```

Expected: TypeScript compiles cleanly (no errors), Vite produces `dist/` artifacts, no warnings about unused imports or unresolved modules.

- [ ] **Step 3: End-to-end manual test in dev server**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && npm run dev
```

Verify all of the following:

1. `/parcel/304-78-386/instrument/20210075858` → Proof Drawer renders → "Export Commitment for Parcel" button visible → click → PDF downloads → open PDF → Schedule A shows POPHAM + Seville legal description with `(manual)` tags → Schedule B-II rows for lc-001 / lc-002 / lc-004 → lc-001 has `← viewed` marker → Closing impact: line on lc-002 → Sources block at bottom with prefixed metadata URLs.
2. `/parcel/304-78-386/encumbrances` → Encumbrance panel header shows the button → click → same PDF, **no `← viewed` marker** anywhere.
3. `/parcel/304-77-689/encumbrances` → button visible → click → HOGUE PDF → Schedule B-II has lc-003 with verbatim rationale "Maricopa public API does not support name-filtered document search" + Closing impact: line.
4. **Cross-check: on-screen vs PDF.** Open `/parcel/304-78-386/instrument/20130183450` → Proof Drawer shows the legal description with `ocr` provenance and confidence on the UI tag → click Export → in the PDF, the Schedule A legal description footnote shows `(manual, ...)` because Schedule A's legal description is sourced from the **parcel** record (curator-entered), not from the instrument's OCR'd legal description. **This is correct** — the parcel's legal description is the canonical one for the abstract; per-instrument legal descriptions appear on B-II rows via party listings, not on Schedule A. If a reviewer flags this, the explanation is in the spec.
5. Stop the dev server (Ctrl+C).

- [ ] **Step 4: Git status check**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git status
```

Expected: clean working tree (the only untracked things should be in `tmp/` if you didn't add it to gitignore yet, and possibly `dist/` from the build — both should already be ignored).

- [ ] **Step 5: Show final commit log to confirm story reads coherently**

Run:
```bash
cd "C:/Users/Klaus/projects/county-recorder-sprint/.claude/worktrees/feature-commitment-export" && git log --oneline master..HEAD
```

Expected: 7 commits, one per task (1: deps + templates, 2: tag formatter, 3: builder, 4: pdf, 5: button, 6: wiring, 7: docs).

### ⛔ REVIEW CHECKPOINT 4

**Stop here.** Surface the verification results to the user. Then invoke `superpowers:requesting-code-review`.

---

## Self-review checklist (run before declaring plan complete)

1. **Spec coverage:**
   - Schedule A → Task 3 (builder) + Task 4 (renderer)
   - Schedule B-II → Task 3 + Task 4
   - Header note with verified-through interpolation → Task 3 (test asserts substring)
   - Inline provenance footnotes → Task 2 (formatter) + Task 4 (used in renderer)
   - PDF URL inline per row + metadata URLs in Sources → Task 3 (asserted) + Task 4 (rendered)
   - Closing-impact templates → Task 1 (data file + README) + Task 3 (lookup)
   - Subdivision-encumbrance subtype → Task 3 (allow-list)
   - viewedInstrumentNumber anchoring → Task 3 (asserted) + Task 6 (passed from drawer)
   - Two button surfaces → Task 6
   - HOGUE regression → Task 3 (test) + Task 8 (manual)
   - Layout decision recorded → Task 4 (spec edit)
   - Known gap #14 + Decision #39 → Task 7
   - npm test green + npm build clean → Task 8

2. **Placeholder scan:** No "TBD", "TODO", "implement later" left in the plan.

3. **Type consistency:** `CommitmentDocument`, `ScheduleB2Row`, `ClosingImpactTemplate`, `BuildCommitmentInput`, `triggerCommitmentDownload`, `ExportCommitmentButton` — all defined in Tasks 3 and 5, all consumed in Tasks 4, 5, 6 with matching shapes. `ProvenanceKind` enum is `["public_api", "ocr", "manual_entry", "algorithmic"]` (per `schemas.ts`); spec used `ai_extraction` informally and the test in Task 2 corrects to `algorithmic`.

4. **Ambiguity:** Two were resolved during plan-writing:
   - Spec said `ai_extraction`; real enum is `algorithmic` — Task 2 test is explicit.
   - Spec said "Schedule B-II contains exactly 4 rows for POPHAM"; real data-loader scopes lifecycles per parcel and POPHAM has 3 (lc-001, lc-002, lc-004 — lc-003 belongs to HOGUE) — Task 3 test asserts 3, with a comment.
