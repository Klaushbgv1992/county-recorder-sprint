# Demo Account Portal — Provenance & Scope

This document records which portal surfaces are real vs demo-only so a
reviewer is never surprised during the demo.

## Real behavior

- Watchlist state (parcels + parties) — localStorage, persists across reload.
- Notification read/unread — localStorage.
- Flag submissions — localStorage; visible to `/staff/queue` in-session.
- Correction requests, records requests, commitment exports — localStorage.
- Recently-viewed list — localStorage, 8-item rolling dedup.

## Faked (labeled `<PreviewPill/>` in the UI)

- Sign-in — one-click hardcoded demo user (`src/data/account/demo-user.json`).
  No OAuth, no password, no session crypto.
- Email/SMS delivery — preference toggles persist to localStorage. No real
  email or SMS is sent.
- Notification seed — pre-generated fixtures in
  `src/data/account/seed-notifications.json`, filtered at render time by the
  user's watchlist. In production these come from a live events stream.
- Statutory notices — seeded from
  `src/data/account/seed-statutory-notices.json`, filtered by watched-parcel
  APN + neighbor relationships.

## Not implemented, deliberately

- Multi-user / teams / role-based permissions.
- Real OAuth (Google/Microsoft) — the demo button maps to a fixed user.
- Billing / paid tiers — different pitch, different demo.
- 2FA, password reset, session management — no passwords exist here.

## Moat-relevant account features

Three surfaces are structurally county-only and cannot be replicated by any
title plant:

1. **Statutory notice inbox** (`/account/notices`) — only the custodian
   publishes tax sales, probate notices, lis pendens.
2. **Correction requests** (parcel-page button) — only the custodian can
   adjudicate corrections to the public record.
3. **Records requests / FOIA** (`/account/records-request`) — only the
   custodian fulfills public-records requests under state law.

Each surface frames this custodian-only role inline so a reviewer understands
why the feature cannot exist on a title plant.
