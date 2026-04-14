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
