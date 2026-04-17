# Data provenance — external citations

Central registry for every externally-sourced number in the portal.
Each entry names the constant, where it lives in code, the primary
source, and the access-state at retrieval time. If a source is later
found to disagree with the constant, **update the citation first,
then the constant** — never the other way around.

---

## `MARICOPA_BUSINESS_DAY_RECORDING_VOLUME` — County Heartbeat anchor

- **Constant location:** `src/logic/heartbeat-model.ts`
- **Value:** `4000` (documents per business day)
- **Derivation:** 1,000,000 annual documents ÷ 250 U.S. federal business days ≈ 4,000

### Primary source

- **Entity:** Maricopa County Recorder's Office — "About" page
- **URL:** https://recorder.maricopa.gov/site/about.aspx
- **Quoted statement:** "records approximately 1 million documents annually"
- **Access note (2026-04-16):** Direct WebFetch returns HTTP 403 (Cloudflare on
  the `recorder.maricopa.gov` subdomain). Citation was verified via Wikipedia's
  `Maricopa_County_Recorder's_Office` article, which cites this page as its
  Reference [12] with retrieval date 2023-10-31.

### Corroborating source

- **Entity:** Maricopa County official portal — Recorder's Office page
- **URL:** https://www.maricopacountyaz.org/Recorders_Office.html
- **Quoted statement:** "Each year, the office records around a million documents"
- **Access note (2026-04-16):** Direct WebFetch succeeded. Page rendered without
  block; statement verified in-text.

### Business-day divisor

- **Value:** 250
- **Derivation:** 365 calendar days − 104 weekend days − 11 federal holidays ≈ 250
- **Note:** Across any specific year, the count varies between ~249 and ~252
  depending on how holidays fall. This variance (~±1%) is absorbed by the
  "~" prefix on the "~4,000" figure in the provenance caption.

### When to update this entry

- The Maricopa Recorder publishes a materially different figure (≥15% delta).
- A more precise figure becomes available (e.g., the office publishes a
  monthly or quarterly statistic that lets us compute a tighter
  business-day average).
- The `recorder.maricopa.gov` 403 is resolved and the primary source can be
  fetched directly — at which point the access-note above should be updated
  to reflect direct retrieval.

### What NOT to do

- Do **not** update the constant to match a target UI behavior (e.g., "the
  counter ticks too slowly, bump to 5,000"). The constant is anchored to a
  citation; the citation governs the value, not the other way around.
- Do **not** remove this entry if the constant is removed from code. Leave
  a tombstone line: "Constant removed YYYY-MM-DD. See [commit]."
