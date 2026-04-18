import { Link } from "react-router";
import defaultState from "../data/pipeline-state.json";
import {
  currentFreshness,
  type PipelineState,
} from "../logic/pipeline-selectors";

const PIPELINE_STATE_DEFAULT = defaultState as unknown as PipelineState;

const POPHAM_APN = "304-78-386";
const POPHAM_DOT = "20210057847";
const POPHAM_DOT_DATE = "2021-01-19";
const POPHAM_RECONVEYANCE = "20210075858";
const POPHAM_RECONVEYANCE_DATE = "2021-01-22";

function pdfUrl(recordingNumber: string): string {
  return `https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=${recordingNumber}`;
}

// Subtract `days` calendar days from an ISO YYYY-MM-DD date and return the
// same shape. Anchored to UTC to avoid TZ off-by-one when the test fixture
// straddles midnight.
function subtractDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  const t = Date.UTC(y, m - 1, d) - days * 86400000;
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

interface Props {
  state?: PipelineState;
}

export function PlantVsCountyProof({ state = PIPELINE_STATE_DEFAULT }: Props) {
  const verifiedThrough = currentFreshness(state).index;
  const { lag_days_min: lagMin, lag_days_max: lagMax } =
    state.plant_lag_reference;
  const plantCachedThroughMin = subtractDays(verifiedThrough, lagMin);
  const plantCachedThroughMax = subtractDays(verifiedThrough, lagMax);

  return (
    <section
      role="region"
      aria-label="Plant vs. county proof"
      className="border-b border-slate-200 bg-gradient-to-b from-amber-50 to-white"
    >
      <div className="max-w-5xl mx-auto px-6 py-5 space-y-5">
        {/* Beat A — side-by-side clock */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Plant vs. county — what an examiner sees right now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Public title plant (typical refresh)
              </p>
              <p className="font-mono text-lg text-slate-900 mt-1">
                cached through ~{plantCachedThroughMin}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Plants typically refresh {lagMin}–{lagMax} days behind the
                county; the {plantCachedThroughMax}–{plantCachedThroughMin}
                {" "}window is unverified on the plant side.
              </p>
            </div>
            <div className="rounded border border-emerald-300 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-emerald-700">
                Maricopa County custodian
              </p>
              <p className="font-mono text-lg text-slate-900 mt-1">
                verified through {verifiedThrough}
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">
                Authoritative — the county owns the recording day.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-700 mt-2">
            <strong className="font-semibold">{lagMin} days of documents the plant hasn't seen yet</strong>
            {" "}— recorded between {plantCachedThroughMin} and {verifiedThrough}.
          </p>
        </div>

        {/* Beat B — the instrument the plant would miss */}
        <div className="rounded border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            The instrument the plant would miss
          </p>
          <p className="text-sm text-slate-800 mt-1 leading-relaxed">
            POPHAM's 2021 refinance recorded the Deed of Trust on{" "}
            <span className="font-mono">{POPHAM_DOT_DATE}</span> (
            <a
              href={pdfUrl(POPHAM_DOT)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-recorder-700 underline underline-offset-2 hover:text-recorder-900"
            >
              {POPHAM_DOT}
            </a>
            ) and the Full Reconveyance 3 days later on{" "}
            <span className="font-mono">{POPHAM_RECONVEYANCE_DATE}</span> (
            <a
              href={pdfUrl(POPHAM_RECONVEYANCE)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-recorder-700 underline underline-offset-2 hover:text-recorder-900"
            >
              {POPHAM_RECONVEYANCE}
            </a>
            ). A plant refreshing every {lagMin}–{lagMax} days would have
            shown this DOT as <em>open</em> for the rest of January — the
            county had it released same-week.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link
              to={`/parcel/${POPHAM_APN}/instrument/${POPHAM_RECONVEYANCE}`}
              className="text-recorder-700 underline underline-offset-2 hover:text-recorder-900"
            >
              → Verify in corpus (open in parcel)
            </Link>
          </div>
        </div>

        {/* Beat C — the receipts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReceiptCard
            slug="federal-tax-lien"
            title="Receipt: federal-tax-lien hunt (Known Gap #2)"
            finding="A 45-minute API hunt confirmed the moat shape — search and index disagree on what's findable."
          >
            <span className="font-mono text-[11px] text-slate-700">
              <code>documentCode=FED TAX L</code> returns <code>totalResults: 0</code>
              {" "}— the same code is right there inside <code>documentCodes</code>{" "}
              on <code>GET /documents/20010092700</code>.
            </span>
          </ReceiptCard>
          <ReceiptCard
            slug="seville-master-plat"
            title="Receipt: Seville master-plat hunt (R-005)"
            finding="A second hunt at the plat tier hit five separate API layers blocking a well-formed question."
          >
            <span className="text-[11px] text-slate-700">
              ~141 of 200 API calls used. <code>documentCode</code>,{" "}
              <code>docketBook</code>/<code>pageMap</code>,{" "}
              <code>byBook/page</code>, <code>book/&#123;n&#125;/&#123;p&#125;</code>, and the legacy
              book/page bridge — all silently dropped, 404, or
              Cloudflare-gated.
            </span>
          </ReceiptCard>
        </div>
      </div>
    </section>
  );
}

function ReceiptCard({
  slug,
  title,
  finding,
  children,
}: {
  slug: string;
  title: string;
  finding: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="text-xs text-slate-800 mt-1 leading-snug">{finding}</p>
      <div className="mt-2 border-l-2 border-slate-300 pl-2 leading-snug">
        {children}
      </div>
      <Link
        to={`/receipts/${slug}`}
        className="mt-2 self-start text-xs text-recorder-700 underline underline-offset-2 hover:text-recorder-900"
      >
        Read the hunt →
      </Link>
    </div>
  );
}
