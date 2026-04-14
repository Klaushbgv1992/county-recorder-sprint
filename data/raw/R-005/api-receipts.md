# R-005 API Receipts — exact `documentCode` strings as returned by `publicapi.recorder.maricopa.gov`

Captured 2026-04-14 against the live API. These are the canonical spellings to use anywhere the codes are quoted (CLAUDE.md, hunt logs, demo script).

## `RE FED TX` — Release of Federal Tax Lien

```bash
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/19470000050"
```
```json
{
  "recordingNumber": "19470000050",
  "recordingDate": "1-02-1947",
  "documentCodes": ["RE FED TX"],
  "docketBook": 0,
  "pageMap": 0
}
```

## `FED TAX L` — Federal Tax Lien

```bash
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/20010092700"
```
```json
{
  "recordingNumber": "20010092700",
  "recordingDate": "2-07-2001",
  "documentCodes": ["FED TAX L"],
  "docketBook": 0,
  "pageMap": 0
}
```

## `LIEN` — General Lien

```bash
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/20010092800"
```
```json
{
  "recordingNumber": "20010092800",
  "recordingDate": "2-07-2001",
  "documentCodes": ["LIEN"],
  "docketBook": 0,
  "pageMap": 0
}
```

## `MED LIEN` — Medical Lien

```bash
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/20010090000"
```
```json
{
  "recordingNumber": "20010090000",
  "recordingDate": "2-06-2001",
  "documentCodes": ["MED LIEN"],
  "docketBook": 0,
  "pageMap": 0
}
```

## Cross-cutting fact: every `documentCode` filter returns zero, including for codes the index demonstrably contains

```bash
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/search?documentCode=FED%20TAX%20L"
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/search?documentCode=LIEN"
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/search?documentCode=MED%20LIEN"
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/search?documentCode=RE%20FED%20TX"
$ curl -s "https://publicapi.recorder.maricopa.gov/documents/search?documentCode=PLAT%20MAP"
```

All five → `{ "totalResults": 0, "searchResults": [] }`.

Yet `GET /documents/{recordingNumber}` returns documents whose `documentCodes` array contains exactly those values (see receipts above). The codes exist in the index. The search surface refuses to use them.

Aside — `docketBook` filter behaves differently again: `?docketBook=553` returns `totalResults: 501` and 50 records all dated 1947-01-02 regardless of `pageNum`. So `documentCode` zeroes the result; `docketBook` returns a fixed 1947 seed; either way nothing useful.
