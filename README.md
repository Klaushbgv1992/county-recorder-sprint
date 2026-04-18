# County Recorder AI-Enhanced Search Portal — Prototype

A working prototype of an AI-enhanced county recorder search portal, aimed
at residential title examiners and abstractors. Focus county: **Maricopa
AZ**. Corpus: 2 fully-curated parcels (POPHAM, HOGUE) plus cached
assessor-tier neighbors in Seville Parcel 3.

## Quick start

```bash
npm ci
npm run dev      # http://localhost:5173/
```

### Prerequisites

- **Node.js ≥ 20.19** (Vite 8 requirement). Verified on 20.19, 22.x, 25.x.
  Node 20.18 and below will start the dev server but print a Vite
  incompatibility warning and may fail on build. If your `node --version`
  is below 20.19, run `nvm use 20` or `nvm install 22`.
- **npm 10+**.

### Other scripts

```bash
npm run build    # tsc -b && vite build
npm run test     # vitest
npm run lint     # eslint
```

## What to look at first

1. **Landing page** (`/`) — county map, search, featured parcels, the
   plant-vs-county proof band.
2. **Chain of title** (`/parcel/304-78-386`) — POPHAM, the hero parcel.
   Anomaly panel, chain swimlane with linked releases, spatial context.
3. **Encumbrance lifecycle** (`/parcel/304-78-386/encumbrances`) — MERS
   gap annotation, cross-parcel release hunt, **Party Judgment Sweep**
   panel (new).
4. **Commitment export** (`/parcel/304-78-386/commitment/new`) — the
   abstractor's actual deliverable, produced as a PDF.
5. **Why we built this** (`/why`) — the 3-beat narrative of why plants
   exist, why they're now a tax, and why the custodian can leapfrog.
6. **Enterprise feed** (`/enterprise`) — sample JSON payload and pricing
   hint for county-licensed data (the commercial counter-offer to plants).
7. **Moat compare** (`/moat-compare`) — nine claims, side by side.
8. **Staff workbench** (`/staff`) — internal search and curator queue.

Full reviewer guide: [`docs/reproducing-the-demo.md`](docs/reproducing-the-demo.md).
Demo script (~7:30 run time): [`docs/demo-script.md`](docs/demo-script.md).

## Project context

- [`CLAUDE.md`](CLAUDE.md) — mission, constraints, decisions log
  (~45 entries), parcel selections
- [`docs/known-gaps.md`](docs/known-gaps.md) — every shortcut, surfaced
  honestly
- [`docs/red-team.md`](docs/red-team.md) — skeptical-buyer Q&A with
  verifiable spot-check curls against the live public API
- [`docs/hunt-log-known-gap-2.md`](docs/hunt-log-known-gap-2.md) and
  [`data/raw/R-005/hunt-log.md`](data/raw/R-005/hunt-log.md) —
  reproducible evidence that the Maricopa public API cannot do what the
  county's internal index can
