# Plain-English Terminology Toggle + Staff Workbench Discoverability

**Date:** 2026-04-15
**Stream:** H3
**Branch:** claude/h3-plain-english
**Approach:** A (React Context + centralized glossary)

## Scope

Two features:

1. **Terminology toggle** — A Professional / Plain English switch in the header that translates 15 title-industry terms into homeowner-friendly language across all examiner-facing screens.
2. **Staff nav discoverability** — A muted footer link on the landing page pointing to `/staff`.

## Exclusion Zones (never translated regardless of toggle state)

- PDF exports (commitment schedules via `commitment-pdf.ts`, `commitment-builder.ts`)
- `document_type_raw` citations in ProofDrawer
- Anomaly rule names (R1-R8) in AnomalyPanel
- `/moat-compare` prose (presenter-facing comparison page)
- `/staff/*` routes (StaffWorkbench, StaffParcelView, StaffPageFrame)

## Glossary (15 terms)

| Professional Term | Plain English | Where Rendered |
|---|---|---|
| Chain of Title | Ownership History | App.tsx nav, ChainOfTitle.tsx heading |
| Encumbrances | Claims Against Property | App.tsx nav |
| Encumbrance Lifecycles | Claims Against Property | EncumbranceLifecycle.tsx heading |
| Deed of Trust | Mortgage | TYPE_LABELS badges (ChainOfTitle, InstrumentRow) |
| Full Reconveyance | Mortgage Paid Off | TYPE_LABELS badges |
| Partial Reconveyance | Partial Payoff | TYPE_LABELS badges |
| Warranty Deed | Sale Deed | TYPE_LABELS badges |
| Special Warranty Deed | Sale Deed (Limited) | TYPE_LABELS badges |
| Quit Claim Deed | Ownership Transfer | TYPE_LABELS badges |
| Grant Deed | Sale Deed | TYPE_LABELS badges |
| Grantor | Previous Owner | ChainOfTitle.tsx, ProofDrawer.tsx labels |
| Grantee | New Owner | ChainOfTitle.tsx, ProofDrawer.tsx labels |
| DOT | Mortgage | EncumbranceLifecycle.tsx labelForDocumentType() |
| Assignment of DOT | Mortgage Transfer | TYPE_LABELS badges |
| HELOC DOT | Home Equity Loan | TYPE_LABELS badges |
| Trustor/Borrower | Borrower | ProofDrawer.tsx label |

## Architecture

### Data Layer

**`src/terminology/glossary.ts`** — A `Record<string, string>` keyed by lowercase professional term, valued with plain-English equivalent. 15 entries.

**`src/terminology/TerminologyContext.tsx`** — React context providing:
- `mode: "professional" | "plain"` — current toggle state
- `toggle: () => void` — flips mode, persists to `localStorage` key `terminology-mode`
- `t: (term: string) => string` — translates if in plain mode; case-insensitive lookup (normalizes to lowercase), returns glossary value with its own casing, falls back to original if no match

Provider wraps the app in `main.tsx`. Reads initial mode from `localStorage` on mount, defaults to `"professional"`.

### Term Component + First-Occurrence Tracking

**`src/terminology/Term.tsx`** — Exports two components:

`<TermSection id="string">` — Wrapper that provides a scoped `Set<string>` via context. The Set tracks which professional terms have already shown their "?" icon within this section. Created fresh on each render.

`<Term professional="Deed of Trust" />` — In professional mode, renders the string as-is. In plain mode:
- Calls `t()` to get the translated text
- Checks the parent `TermSection`'s Set for this term
- If first occurrence: renders translated text + a `?` glyph (`text-[10px]`, muted circle, `title="Professional term: {original}"`) and adds the term to the Set
- If subsequent: renders translated text only

### Component Integration

**5 components edited:**

1. **`App.tsx`** — Toggle control in nav (right side): `Terminology: [Professional] Plain English`. Nav tab labels wrapped in `<Term>`. One `<TermSection id="nav">`.

2. **`ChainOfTitle.tsx`** — `TYPE_LABELS` values run through `t()` in badge rendering. `"Chain of Title"` heading, `Grantor`/`Grantee` dt labels wrapped in `<Term>`. `<TermSection>` boundaries at heading and per ownership period.

3. **`InstrumentRow.tsx`** — Badge text runs through `t()`. Inherits `<TermSection>` from parent (no standalone section).

4. **`EncumbranceLifecycle.tsx`** — Heading wrapped in `<Term>`. `labelForDocumentType()` return values run through `t()`. Each lifecycle card is a `<TermSection>` boundary.

5. **`ProofDrawer.tsx`** — Field labels `Grantor`, `Grantee`, `Trustor/Borrower` wrapped in `<Term>`. `Lender` and `Releasing Party` are already plain English — left unwrapped. One `<TermSection>` for extracted fields area.

**Feature 2 — `LandingPage.tsx`** — Add footer link: `"County staff? Open workbench ->"` linking to `/staff`. Muted `text-slate-400` styling.

### localStorage Persistence

Key: `terminology-mode`
Values: `"professional"` | `"plain"`
Default: `"professional"` (if key absent)
Same pattern as S5's Gap #14 localStorage fix.

## Success Criteria

1. Toggle in header works, preference persists across page reloads
2. Switching to Plain English changes visible labels across `/`, `/parcel/:apn`, `/parcel/:apn/encumbrances`
3. "?" icon appears on first occurrence per section, shows professional term on hover
4. PDF export still uses professional terminology regardless of toggle state
5. `/moat-compare` and `/staff/*` are untranslated regardless of toggle state
6. `/staff` is reachable via footer link from `/`
7. `npm test && npm run lint && npm run build` pass, console clean
