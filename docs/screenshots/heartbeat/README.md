# County Heartbeat — screenshot handoff

**Status:** Pending capture. Implementation complete on `feature/landing-heartbeat`; Preview MCP was not available to the implementing agent, so the six spec-mandated screenshots are captured by the sprint owner during local dev-server review.

## How to capture

```bash
cd C:\Users\Klaus\county-recorder-sprint\.claude\worktrees\landing-heartbeat
npm run dev
```

Default URL is `http://localhost:5173/`. Use the Preview MCP or any headless-screenshot tool at the viewports and URLs listed below. Save each captured image into this directory as `heartbeat-shot-<N>.png` and update the "Captured?" column.

## Shot list

| # | URL | Viewport | Expected state | Captured? |
|---|---|---|---|---|
| 1 | `/?now=2026-04-09T14:00:00-07:00` | 1280×720 | Full band: count `2,520`, 7 solid business-hour bars (7–13) + 3 outline business-hour bars (14–16) + 7 outline trickle bars (17–23), desktop ribbon "The county operates the recording day. Title plants refresh 14–28 days behind.", provenance caption with "per the Recorder's Office" citation link, "See pipeline →" visible right side. Sparkline aria-label says "14 of 24 hours elapsed". | ☐ |
| 2 | `/?now=2026-04-09T14:00:00-07:00` | 375×812 | Collapsed: count centered, mobile ribbon wrapped to 2 lines ("County operates the recording day · title plants lag 14–28d"), no sparkline visible, no visible provenance caption, no "See pipeline →" visible. | ☐ |
| 3 | `/?now=2026-04-09T14:00:00-07:00` | 1280×720, focus state on "See pipeline →" via Tab | Visible focus ring on the link. (Counter is a `<span>`, intentionally not in tab order — do NOT add `tabindex` just to focus it.) | ☐ |
| 4 | `/?now=2026-04-09T09:00:00-07:00` | 1280×720 | Replayed morning: count `720`, 2 solid bars (hours 7–8), 15 outline bars. | ☐ |
| 5 | `/?now=2026-04-09T16:00:00-07:00` | 1280×720 | Late afternoon: count `3,240`, 9 solid bars (hours 7–15), 1 outline business bar (hour 16) + 7 outline trickle bars. | ☐ |
| 6 | `/?now=2026-04-09T22:00:00-07:00` | 1280×720 | Replayed late: count `3,885`, all 10 business-hour bars solid (7–16) + 5 solid trickle bars (17–21), 2 outline trickle bars (22–23). | ☐ |

## Sanity checks to confirm by eye before saving each shot

1. **Counter format** — thousands separator is a comma: `2,520` not `2520` or `2.520`.
2. **Bar shape** — pre-dawn hours (0–6) are truly blank, no rect visible. The 10 business-hour bars are equal height. Trickle bars are visibly shorter. The baseline 1px line spans the full sparkline width.
3. **Citation link** — hovering "per the Recorder's Office" shows underline + the external URL in the browser status bar.

## Narrative beat for guided walkthrough (from spec)

"Before we search, look at this — the counter's ticking because the recorder is live. Here's today's volume. Here's 14 days ahead of a plant."

The heartbeat is the first-thirty-seconds pitch beat: the county is the custodian operating the record, not a copy of it.
