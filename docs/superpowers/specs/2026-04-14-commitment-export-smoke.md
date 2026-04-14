# Commitment Export — Manual Smoke-Test Checklist

> **Audience:** anyone with a browser. No code knowledge required.
> **Time budget:** under 5 minutes.
> **Purpose:** close CHECKPOINT 4 of the commitment-export branch.
> The deterministic content of the PDF was already verified
> programmatically; this checklist confirms the click-through and
> visual layout that automation cannot see.

---

## Preconditions

- [ ] **P1.** Open a terminal at the worktree root:
      `C:\Users\Klaus\projects\county-recorder-sprint\.claude\worktrees\feature-commitment-export`
- [ ] **P2.** Run `npm run dev`. Wait until Vite prints
      `Local: http://localhost:5173/`. Leave the terminal open.
- [ ] **P3.** Open a fresh browser tab. Close any open PDF viewer
      windows (so new downloads don't get appended into a stale
      tab).
- [ ] **P4.** Confirm your default download folder is somewhere you
      can find — you'll open three PDFs from there.

If any precondition fails, stop and report — the rest will not run.

---

## Path A — POPHAM from the Proof Drawer (exercises the `← viewed` marker)

- [ ] **A1.** In the browser, navigate to
      `http://localhost:5173/parcel/304-78-386/instrument/20210075858`.
      The page should load split-pane: chain on the left,
      Proof Drawer open on the right showing instrument 20210075858
      (the 2021 release).
      **If this fails, suspect:** `src/router.tsx` ChainRouteInner /
      `src/components/ProofDrawer.tsx` mount.

- [ ] **A2.** In the Proof Drawer header, confirm two buttons are
      visible side-by-side: an emerald **"Export Commitment for
      Parcel"** button on the left, the existing blue **"Copy
      Citation"** button on its right.
      **If this fails, suspect:**
      `src/components/ProofDrawer.tsx` headerActions slot wiring,
      or the `headerActions=` prop in `ChainRouteInner`
      (`src/router.tsx`).

- [ ] **A3.** Click **Export Commitment for Parcel**. A file should
      download immediately (no dialog, no second click).
      **If this fails, suspect:**
      `src/components/ExportCommitmentButton.tsx` `browserDownload`
      function, or a browser pop-up blocker.

- [ ] **A4.** Confirm the downloaded filename is exactly
      `commitment-30478386-2026-04-09.pdf`.
      **If this fails, suspect:** `triggerCommitmentDownload` in
      `src/components/ExportCommitmentButton.tsx` (filename builder
      uses APN-no-dashes + `pipelineStatus.verified_through_date`).

- [ ] **A5.** Open the PDF. Page 1 should be a Maricopa County
      report with a header note that begins "This report is a
      chain-and-encumbrance abstract of the recorded corpus as of
      2026-04-09."
      **If this fails, suspect:**
      `buildHeaderNote` in `src/logic/commitment-builder.ts`, or
      header rendering in `src/logic/commitment-pdf.ts`.

- [ ] **A6.** Locate **Schedule A**. Confirm the Current Owner cell
      reads `POPHAM CHRISTOPHER / POPHAM ASHLEY` (or the same two
      names) followed by a `(manual)` provenance tag.
      **If this fails, suspect:** `formatProvenanceTag`
      (`src/logic/format-provenance-tag.ts`) for the tag, or the
      Schedule A row composer in `src/logic/commitment-pdf.ts`.

- [ ] **A7.** In the same Schedule A block, the Legal Description
      cell should reference "Seville Parcel 3" (or the Seville lot
      legal) and end with a `(manual)` tag. The text should wrap
      cleanly inside the value column — no overflow, no overlap
      with the next row.
      **If this fails, suspect:** autoTable column-width config
      in the Schedule A renderer (`src/logic/commitment-pdf.ts`);
      this was the layout-decision branch resolved in Checkpoint 2.

- [ ] **A8.** Locate **Schedule B-II**. Confirm three rows are
      present, in this order: **lc-001** (released), **lc-002**
      (open), **lc-004** (status open or whatever the lifecycle
      currently resolves to, with a `subdivision_encumbrance`
      subtype tag in the heading).
      **If this fails, suspect:** lifecycle ordering in
      `src/logic/commitment-builder.ts`, or B-II row rendering in
      `src/logic/commitment-pdf.ts`.

- [ ] **A9.** On the **lc-001** row only, confirm the heading line
      ends with `← viewed` (or the literal string "viewed" with an
      arrow). No other lifecycle row should carry that marker.
      **If this fails, suspect:** `viewedInstrumentNumber`
      threading in `src/components/ExportCommitmentButton.tsx`
      → `buildCommitment` (set on the lifecycle whose root or
      child equals the URL's `:instrumentNumber`).

- [ ] **A10.** On the **lc-002** row, confirm a line beginning
      `Closing impact:` is present (it should reference a payoff
      statement and recorded reconveyance).
      **If this fails, suspect:**
      `src/data/closing-impact-templates.json` lookup in
      `findClosingImpact` (`src/logic/commitment-builder.ts`).

- [ ] **A11.** Scroll to the **Sources** block at the bottom.
      Confirm each line is formatted as
      `{recordingNumber}: https://publicapi.recorder.maricopa.gov/documents/{recordingNumber}`
      — the recording number must appear before the colon, not
      embedded inside the URL.
      **If this fails, suspect:** `perInstrumentMetadataUrls`
      shape in `src/logic/commitment-builder.ts` and its renderer
      in `src/logic/commitment-pdf.ts`.

---

## Path B — POPHAM from the Encumbrance panel header (exercises the no-instrument anchor path)

- [ ] **B1.** Navigate to
      `http://localhost:5173/parcel/304-78-386/encumbrances`.
      The Encumbrance Lifecycle panel should fill the main pane;
      no Proof Drawer should be visible.
      **If this fails, suspect:** `EncumbranceRouteInner` in
      `src/router.tsx`.

- [ ] **B2.** In the panel header (top of the main pane, near the
      "Encumbrance Lifecycles" title and APN line), confirm the
      emerald **"Export Commitment for Parcel"** button is
      present.
      **If this fails, suspect:** `headerActions` prop on
      `EncumbranceLifecycle` (`src/components/EncumbranceLifecycle.tsx`)
      or the `headerActions=` site in `EncumbranceRouteInner`.

- [ ] **B3.** Click the button. A PDF downloads with the same
      filename as A4: `commitment-30478386-2026-04-09.pdf`.
      Browsers usually append `(1)` to the name on the second
      download — that's expected.

- [ ] **B4.** Open this PDF. Locate the **lc-001** row in
      Schedule B-II. Confirm there is **no `← viewed` marker**
      anywhere in the document — Path B has no instrument context,
      so no row should be anchored.
      **If this fails, suspect:** `EncumbranceRouteInner` in
      `src/router.tsx` is incorrectly forwarding
      `viewedInstrumentNumber` to the panel-mount export button
      (it should pass `undefined`, not the drawer's instrument).

---

## Path C (optional) — HOGUE smaller-corpus regression

Run this only if Paths A and B both pass. It guards the smaller
parcel against silent breakage.

- [ ] **C1.** Navigate to
      `http://localhost:5173/parcel/304-77-689/encumbrances` and
      click **Export Commitment for Parcel**.
- [ ] **C2.** Filename is `commitment-30477689-2026-04-09.pdf`.
- [ ] **C3.** In the PDF, Schedule B-II contains a row for
      **lc-003** whose rationale reads, verbatim, "Maricopa public
      API does not support name-filtered document search" (or
      contains that exact substring).
- [ ] **C4.** That same lc-003 row carries a `Closing impact:`
      line.

If any C step fails, suspect the same components as their A/B
counterparts plus parcel-scoped data loading in
`src/data-loader.ts`.

---

## What to send back

When you're done, paste back to me:

1. **Pass / fail per step ID** (e.g., `A1 pass / A2 pass / A3 fail`).
   Steps you did not run (e.g., all of Path C if you skipped it)
   should be marked `n/a`.
2. **For any failed step:** attach the downloaded PDF (the one
   that exposed the failure) and a screenshot of the browser at
   the moment of failure.
3. **Layout anomalies even if functionally correct.** Examples
   worth flagging: text running off the page edge, two rows
   overlapping, a citation breaking mid-URL, a `(manual)` tag
   appearing on its own line orphaned from its value.
4. **Anything that surprised you** even if it isn't strictly a
   failure — that's signal too.

When all required steps pass, I'll close CHECKPOINT 4 and invoke
`superpowers:requesting-code-review`.
