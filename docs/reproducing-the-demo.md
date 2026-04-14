# Reproducing the Demo from a Fresh Clone

This guide takes a reviewer from `git clone` to a working dev server with
the Proof Drawer rendering real document PDFs. It was verified end-to-end
on commit `cdd7764` (see "Fresh-clone verification" below).

## Prerequisites

Verified with:

- **Node.js:** v25.9.0 (any Node >= 20.19 should work; Vite 8 requires >= 20.19)
- **npm:** 11.12.1

Check your versions:

```bash
node --version
npm --version
```

## Commands (clone to running demo)

```bash
git clone <repo-url> county-recorder-sprint
cd county-recorder-sprint
npm ci
npm run build
npm run test
npm run dev
```

Expected output at each step:

| Command | Expected |
|---------|----------|
| `npm ci` | `added 213 packages ... found 0 vulnerabilities` |
| `npm run build` | `tsc -b` completes silently, then Vite reports `built in <NNN>ms` with three `dist/` artifacts |
| `npm run test` | `Test Files  4 passed (4)` and `Tests  27 passed (27)` |
| `npm run dev` | `VITE v8.x.x  ready in <NNN> ms` and `Local: http://localhost:5173/` |

Open `http://localhost:5173/` in a browser. The landing page is the
Search Entry screen ("Land Custodian Portal" header).

## Verifying the Proof Drawer

The Proof Drawer renders county-captured PDFs in an `<iframe>`. The five
corpus PDFs live under `data/raw/R-003/pdfs/` and Vite serves them from
the data directory (`publicDir: "data"` in `vite.config.ts`), so URLs
like `/raw/R-003/pdfs/20210075858.pdf` resolve to them.

A quick curl smoke test on the running dev server:

```bash
curl -I http://localhost:5173/raw/R-003/pdfs/20210075858.pdf
```

Expect `HTTP/1.1 200 OK` with `content-type: application/pdf` and a
body around 65 KB. If you get 404, see the next section.

## Troubleshooting: Proof Drawer shows 404s

The Proof Drawer references each instrument's `source_image_path`, which
points at `/raw/R-003/pdfs/<recording-number>.pdf`. Three things must
all be true for those URLs to work:

1. **`vite.config.ts` has `publicDir: "data"`.** This re-roots Vite's
   static serving from the default `public/` to the project's `data/`
   directory. If you accidentally change or remove this line, Vite will
   404 on every corpus URL.
2. **The PDFs must be tracked in git.** Run `git ls-files data/raw/` —
   you should see all five `.pdf` files. If you see only JSON metadata,
   the PDFs were not committed and the clone arrived empty.
3. **The data JSON paths must match the on-disk layout.** Grep for
   `source_image_path` in `data/instruments/*.json` and confirm the
   paths start with `/raw/R-003/pdfs/`. The leading slash matters —
   relative paths will break when the drawer opens from a non-root URL.

If the PDF URL returns 200 but the Proof Drawer pane is blank, check
the browser devtools console for a Content-Security-Policy or mixed-
content warning on the `<iframe>`.

## Fresh-clone verification

Reproduced end-to-end on commit `cdd7764` (worktree branch
`worktree-agent-af062e05`) by cloning the worktree into a scratch
directory and running the commands above in order. `npm ci` installed
213 packages cleanly, `npm run build` emitted `built in 315ms` with
zero TypeScript errors, `npm run test` reported `Tests 27 passed
(27)`, and the dev server answered HTTP 200 for `/` plus all five PDFs
at `/raw/R-003/pdfs/*.pdf`.

## Note on the Codex reviewer's build-failure claim

The external Codex review reported a Vite startup failure. **This does
not reproduce.** Fresh-clone verification on commit `cdd7764` succeeded:
`npm ci && npm run build && npm run test && npm run dev` all exited
cleanly, and curl against the running dev server returned 200 for the
app shell and for every corpus PDF the Proof Drawer requests.

If a future reviewer sees a genuine Vite startup error, the most likely
causes are (in order): Node version too old (< 20.19), a corrupted
`node_modules` from a prior partial install (run `rm -rf node_modules
package-lock.json && npm install`), or an OS-specific `@rollup/rollup-*`
optional dependency that npm skipped — `npm ci` from scratch typically
resolves the last one.
