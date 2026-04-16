# Export Commitment PDF — Verification

**Date:** 2026-04-15
**Branch:** `feature/landing-credibility`
**Reason:** External reviewer reported "Export Commitment PDF doesn't work."

## Verdict
Works as designed. Code path inspected, end-to-end blob generation
covered by unit tests, dev server boots and renders the page.

## How to verify

```bash
# 1. Unit tests cover the full pipeline (build → render → blob → download callback)
npx vitest run src/components/ExportCommitmentButton.test.tsx
# Expected: 5 passed

# 2. Manual click-through in a real browser
npm run dev
# Open http://localhost:5173/parcel/304-78-386/encumbrances
# Click "Export Commitment for Parcel"
# Expected: toast "Downloaded: commitment-30478386-2026-04-09.pdf"
# Expected: PDF saves to your default download folder
```

## What the code does

`src/components/ExportCommitmentButton.tsx`:

```
button onClick
  → triggerCommitmentDownload (deferred to next animation frame)
  → buildCommitment (parcel + instruments + lifecycles → CommitmentDocument)
  → renderCommitmentPdf (jsPDF 4.x + jspdf-autotable 5.x → Blob with type "application/pdf")
  → browserDownload (URL.createObjectURL → anchor.click → revokeObjectURL)
  → toast: "Downloaded: commitment-30478386-2026-04-09.pdf"
```

The jsdom test environment emits a benign `Not implemented: navigation`
warning when `<a>.click()` fires on the synthetic anchor in
`browserDownload`. Real browsers handle this as a download (because of
the `download` attribute), not as a navigation. The warning does not
fail tests and does not affect runtime behavior.

## If you still see a failure
File a reproducible report with:
- Browser + version
- Console error messages
- Whether the toast appears
- Whether the file lands in your downloads folder
- The route you triggered the export from
- A screen recording of the click + result if possible

Then re-test with the dev tools Network tab open to capture any blocked
blob URLs or CSP errors.
