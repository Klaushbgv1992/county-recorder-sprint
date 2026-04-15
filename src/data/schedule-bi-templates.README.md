# schedule-bi-templates.json

## Why this file exists

Schedule B-I (Requirements) on a real ALTA Commitment for Title
Insurance enumerates the instruments, statements, and affidavits a
title company must receive before closing. Conventions are
well-worn: payoff statements from current beneficiaries, assignment
or MERS-custody verification when the release executor differs from
the original lender, certificates of trust when a trustee conveys,
HOA estoppels for subdivision-governed parcels, tax certificates on
every residential closing, and curative affidavits for chain
ambiguities. This file holds the canonical sentences for those six
requirement shapes, each with an English `text` and a `why_template`
paragraph explaining the provenance of the requirement. Both strings
use `{placeholder}` tokens filled at generation time by
`src/logic/schedule-bi-generator.ts`.

This template bank is curator-reviewed for demo fidelity — each
sentence is written to read like actual title work product, not
AI-shaped filler. New templates are added only when a new B-I
requirement shape appears in the corpus.
