import type { ReactNode } from "react";
import { Link } from "react-router";
import { loadParcelDataByApn } from "../data-loader";
import { MoatBanner } from "./MoatBanner";
import { ProvenanceTag } from "./ProvenanceTag";
import type { ProvenanceKind } from "../types";

const POPHAM_APN = "304-78-386";
const POPHAM_FIRST_DEED = "20130183449";

function AggregatorTag({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] italic font-medium bg-gray-200 text-gray-600"
      title={`Source: ${label}`}
    >
      {label}
    </span>
  );
}

function CountyPdfLink({
  recordingNumber,
  children,
}: {
  recordingNumber: string;
  children: ReactNode;
}) {
  const href = `https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=${recordingNumber}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 hover:underline text-xs font-mono"
    >
      {children}
    </a>
  );
}

function ViewportFallback() {
  return (
    <div className="lg:hidden border border-amber-300 bg-amber-50 text-amber-900 rounded-lg px-4 py-6 text-sm">
      Moat comparison is designed for a presenter display. Widen the
      window to at least 1024px.
    </div>
  );
}

function PricingCompare() {
  return (
    <div
      className="mt-6 hidden lg:block border border-gray-200 bg-white rounded-lg px-6 py-4 text-sm text-gray-800"
      aria-label="Indicative pricing comparison"
      data-testid="moat-pricing-compare"
    >
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-900">
          Indicative seat / API cost per abstractor
        </h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
          illustrative — verify with each vendor
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Aggregator · consumer
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            $0 — ad-supported
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Name-and-address search, aged MLS. No chain, no encumbrance
            lifecycle, no PDFs. Not built for a title workflow.
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Title plant · professional
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            ~$300–$800 / seat / mo
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Parcel-keyed chain + per-search fees. Bulk-feed latency of
            2–7 days behind the county. Pricing per public reports and
            vendor quotes — confirm under current contract.
          </div>
        </div>
        <div className="rounded border border-moat-200 bg-moat-50 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-moat-700">
            County · authoritative
          </div>
          <div className="mt-1 text-base font-semibold text-moat-900">
            Free public · metered API for volume
          </div>
          <div className="mt-1 text-xs text-moat-700">
            Public read is free today (the recorder&apos;s statutory duty).
            A metered API tier for commercial consumers — e.g. $0.02–$0.05
            per call with an SLA and a live-push option — undercuts every
            plant on seat cost while preserving the county&apos;s authority
            advantage.
          </div>
          <div className="mt-2 text-[11px] font-mono text-moat-700">
            <Link
              to="/api"
              className="underline hover:text-moat-900"
            >
              See API surface →
            </Link>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-gray-500 italic">
        Prices are illustrative. Plant seat ranges cited from published
        industry coverage and practitioner interviews (DataTree,
        TitleIQ, PropertyRadar, PropStream) — not from a current
        vendor quote. The point isn&apos;t the exact number; it&apos;s
        that the county is the <em>only</em> surface that can price on
        marginal cost of bytes rather than on resold-data margin.
      </p>
    </div>
  );
}

function ClosingFooter() {
  return (
    <div className="mt-6 hidden lg:block border border-gray-200 bg-white rounded-lg px-6 py-4 text-sm text-gray-800">
      Both surfaces produce a property report. Only the prototype emits
      a Schedule A + B-II title commitment with per-row provenance and
      authoritative county PDF URLs. Generate one from any parcel page
      via{" "}
      <Link
        to="/parcel/304-78-386"
        className="text-blue-700 font-medium hover:underline"
      >
        Export Commitment for Parcel
      </Link>
      .
    </div>
  );
}

function Callout({
  anchor,
  headline,
}: {
  anchor: string;
  headline: string;
}) {
  return (
    <div className="contents" data-callout-anchor={anchor}>
      <div className="bg-blue-50 col-span-3 border-t border-blue-200 px-6 py-2 text-xs">
        <span className="text-blue-700 font-medium mr-2">
          › why this matters
        </span>
        <span className="text-blue-900 font-semibold">{headline}</span>
      </div>
    </div>
  );
}

function ComparisonRow({
  rowId,
  label,
  aggregator,
  prototype,
}: {
  rowId: string;
  label: string;
  aggregator: ReactNode;
  prototype: ReactNode;
}) {
  return (
    <div className="contents" data-row-id={rowId}>
      <div
        className="bg-gray-50 px-4 py-4 border-t border-gray-200 text-sm text-gray-700"
        data-side="aggregator"
      >
        {aggregator}
      </div>
      <div className="bg-white border-t border-gray-200 px-3 py-4 text-center text-xs font-medium text-gray-700 self-start">
        {label}
      </div>
      <div
        className="bg-blue-50 px-4 py-4 border-t border-gray-200 text-sm text-gray-900"
        data-side="prototype"
      >
        {prototype}
      </div>
    </div>
  );
}

function ProvenanceWithKind({
  kind,
  confidence,
  customLabel,
}: {
  kind: ProvenanceKind;
  confidence: number;
  customLabel?: string;
}) {
  if (customLabel) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800"
        title={`Source: ${customLabel}`}
      >
        {customLabel}
      </span>
    );
  }
  return <ProvenanceTag provenance={kind} confidence={confidence} />;
}

export function MoatCompareRoute() {
  const data = loadParcelDataByApn(POPHAM_APN);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Moat comparison: aggregator vs. county-owned portal
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Showing parcel 304-78-386 — POPHAM CHRISTOPHER / ASHLEY,
          3674 E Palmer Street, Gilbert. Prototype corpus contains
          six curated parcels reachable via{" "}
          <Link to="/" className="text-blue-700 hover:underline">Search</Link>.
        </p>
      </header>

      <div className="hidden lg:grid grid-cols-[1fr_12rem_1fr] gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            Aggregator-style property report
          </h2>
        </div>
        <div className="bg-white border-b border-gray-200" />
        <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-blue-900">
            County-owned prototype
          </h2>
        </div>

        <ComparisonRow
          rowId="row-1"
          label="Current owner of record"
          aggregator={
            <div className="space-y-1">
              <div>POPHAM CHRISTOPHER / ASHLEY</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-1">
              <div>POPHAM CHRISTOPHER / ASHLEY</div>
              <div className="flex items-center gap-2 flex-wrap">
                <ProvenanceWithKind
                  kind="public_api"
                  confidence={1}
                  customLabel="County Deed"
                />
                <CountyPdfLink recordingNumber={POPHAM_FIRST_DEED}>
                  ↗ recording {POPHAM_FIRST_DEED} · 2013-02-27
                </CountyPdfLink>
              </div>
            </div>
          }
        />

        <ComparisonRow
          rowId="row-2"
          label="Open encumbrances (DOTs / liens)"
          aggregator={
            <div className="space-y-1">
              <div>1 open mortgage (estimated)</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-1">
              <div>2 lifecycles tracked</div>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                <li>lc-001 (2013 DOT) → released 2021-01-22</li>
                <li>lc-002 (2021 DOT) → open · "no reconveyance found in corpus"</li>
              </ul>
              <div className="flex items-center gap-2 flex-wrap">
                <ProvenanceTag provenance="manual_entry" confidence={1} />
                <CountyPdfLink recordingNumber="20210075858">
                  ↗ recording 20210075858
                </CountyPdfLink>
              </div>
            </div>
          }
        />

        <ComparisonRow
          rowId="row-3"
          label="Lien search by recording code"
          aggregator={
            <div className="space-y-1">
              <div>No federal-tax-lien hits (estimated; refresh cadence 30 days)</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-2">
              <div>
                No FED TAX L / LIEN / MED LIEN matches in this parcel's
                curated corpus.
              </div>
              <div className="text-xs text-gray-700 italic">
                Public API documentCode filter is silently dropped — see
                <code className="font-mono mx-1">docs/hunt-log-known-gap-2.md</code>
                and
                <code className="font-mono mx-1">data/raw/R-005/hunt-log.md</code>.
                A county-internal index closes this gap.
              </div>
              <ProvenanceWithKind
                kind="public_api"
                confidence={1}
                customLabel="County API + Hunt Log"
              />
            </div>
          }
        />
        <Callout
          anchor="row-3"
          headline="They can't search liens. The taxonomy lives in the county's own system."
        />

        <ComparisonRow
          rowId="row-4"
          label="Document image source"
          aggregator={
            <div className="space-y-1">
              <div>
                Aggregated copy stored on the aggregator's CDN; subscription
                required for full-resolution download.
              </div>
              <AggregatorTag label="aggregator copy" />
            </div>
          }
          prototype={
            <div className="space-y-1">
              <div>
                Canonical county PDF served by{" "}
                <code className="font-mono text-xs">publicapi.recorder.maricopa.gov</code>.
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ProvenanceTag provenance="public_api" confidence={1} />
                <CountyPdfLink recordingNumber={POPHAM_FIRST_DEED}>
                  ↗ open authoritative PDF
                </CountyPdfLink>
              </div>
            </div>
          }
        />
        <Callout
          anchor="row-4"
          headline="They host a copy. We host the original."
        />

        <ComparisonRow
          rowId="row-5"
          label="Index freshness"
          aggregator={
            <div className="space-y-1">
              <div>Indexed monthly (typical aggregator cadence)</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div>
              <MoatBanner pipelineStatus={data.pipelineStatus} />
            </div>
          }
        />
        <Callout
          anchor="row-5"
          headline="They index monthly. The county publishes same-day."
        />

        <ComparisonRow
          rowId="row-6"
          label="Spatial custody"
          aggregator={
            <div className="space-y-1">
              <div>Third-party licensed polygon. Assessor owns the source; title plants pay a licensing layer.</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-1">
              <div>Assessor polygon served direct. No licensing intermediary. Parcel boundary visible on landing map alongside chain.</div>
              <ProvenanceWithKind
                kind="public_api"
                confidence={1}
                customLabel="County Assessor"
              />
            </div>
          }
        />

        <ComparisonRow
          rowId="row-7"
          label="Pipeline transparency"
          aggregator={
            <div className="space-y-1">
              <div>Report dated but no stage breakdown. No way to verify when each component was last confirmed.</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-2">
              <div>5 verified-through dates — index ingestion, OCR run, curator sign-off, anomaly scan, pipeline status. Each stage has its own SLA and is visible to the examiner.</div>
              <ProvenanceWithKind
                kind="public_api"
                confidence={1}
                customLabel="County Pipeline"
              />
            </div>
          }
        />

        <ComparisonRow
          rowId="row-8"
          label="Chain judgment"
          aggregator={
            <div className="space-y-1">
              <div>Document list in date order. Flagging anomalies is the examiner's manual work.</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-2">
              <div>5 anomalies detected and surfaced automatically (MERS beneficiary, potential missed assignment, UCC termination gap). Each carries severity + examiner action surface.</div>
              <ProvenanceWithKind
                kind="public_api"
                confidence={1}
                customLabel="County Detection"
              />
            </div>
          }
        />

        <ComparisonRow
          rowId="row-9"
          label="Internal search flip"
          aggregator={
            <div className="space-y-1">
              <div>Name-based search returns results from the public recorder portal — same API any browser can reach.</div>
              <AggregatorTag label="aggregator index" />
            </div>
          }
          prototype={
            <div className="space-y-2">
              <div>Staff search runs against a name-indexed view of the county's full corpus. Same instruments, different access path. The county is the only party that can offer this.</div>
              <ProvenanceWithKind
                kind="public_api"
                confidence={1}
                customLabel="County Staff Access"
              />
            </div>
          }
        />
      </div>
      <ViewportFallback />
      <PricingCompare />
      <ClosingFooter />
    </div>
  );
}
