import { Link } from "react-router";
import { loadParcelDataByApn } from "../data-loader";

/**
 * `/api` — indicative API surface for the county's commercial tier.
 *
 * Not wired to a live gateway; this page is the commercial-face
 * deliverable that makes the moat story investable. Title plants
 * charge per-seat; the county can undercut them with a metered API
 * over the same authoritative index (see MoatCompareRoute pricing
 * panel). The endpoints shown here mirror the shapes the UI already
 * consumes locally in `data-loader.ts` — shipping them behind a real
 * gateway is a config-file change, not a data-model change.
 *
 * Every example on this page resolves against the curated POPHAM
 * parcel (APN 304-78-386) so a reader can paste any recording number
 * into the portal and cross-check the shape.
 */

const POPHAM_APN = "304-78-386";
const POPHAM_RELEASE_INSTRUMENT = "20210075858";

export function ApiDocsPage() {
  // Pull a real curated record so the example JSON isn't fabricated.
  const { parcel, instruments, lifecycles, pipelineStatus } = loadParcelDataByApn(
    POPHAM_APN,
  );
  const releaseInstrument = instruments.find(
    (i) => i.instrument_number === POPHAM_RELEASE_INSTRUMENT,
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <nav className="text-xs text-slate-500">
        <Link to="/" className="hover:underline">
          ← Back to search
        </Link>
        <span className="mx-2">·</span>
        <Link to="/moat-compare" className="hover:underline">
          Moat comparison
        </Link>
      </nav>

      <header>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-moat-700">
          Commercial API · indicative surface
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-recorder-900">
          County Recorder API
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          The same curated records the portal renders, served as JSON
          with cached-at timestamps and per-field provenance. Not yet
          gated behind an API key — this page documents the shape; the
          commercial tier is a deployment-time switch, not a data
          change.
        </p>
      </header>

      <section aria-label="Base URL" className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Base URL</h2>
        <pre className="rounded bg-gray-50 border border-gray-200 px-3 py-2 font-mono text-xs text-gray-800">
https://api.recorder.maricopa.gov/v1/
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Public read is free. Commercial tiers authenticate with{" "}
          <code className="bg-gray-100 px-1 rounded">X-API-Key</code>; a
          metered rate of $0.02–$0.05/call is the indicative price point
          that undercuts title-plant seats while preserving the
          county&apos;s authority advantage.
        </p>
      </section>

      <Endpoint
        method="GET"
        path={`/parcels/${parcel.apn}`}
        title="Parcel dossier"
        rationale="One call returns the parcel, current owner, all curated instruments for the parcel, every encumbrance lifecycle (open / released / unresolved), and the pipeline status. This is the shape abstractors want; today they reconstruct it by hand across 4–6 different surfaces."
        example={{
          parcel,
          instrument_count: instruments.length,
          lifecycle_count: lifecycles.length,
          pipeline_status: pipelineStatus,
          self_link: `/parcels/${parcel.apn}`,
        }}
      />

      <Endpoint
        method="GET"
        path={`/instruments/${POPHAM_RELEASE_INSTRUMENT}`}
        title="Single instrument with provenance"
        rationale="Every field carries provenance (public_api / ocr / manual_entry / demo_synthetic) and a curator-assigned confidence. Plant products hand you a row of data; this endpoint hands you a row of data plus the receipt for how each field got there."
        example={releaseInstrument ?? { error: "not found" }}
      />

      <Endpoint
        method="GET"
        path={`/parties/POPHAM-CHRISTOPHER/instruments`}
        title="Cross-parcel party index"
        rationale="Every instrument where the named party appears, with role attribution. The Maricopa public recorder API returns flat names without roles (Decision #19); this is the role-attributed feed title plants currently rebuild by hand."
        example={[
          {
            instrument_number: "20210057847",
            apn: parcel.apn,
            role: "trustor",
            role_provenance: "manual_entry",
            role_confidence: 1.0,
            recording_date: "2021-01-19",
          },
          {
            instrument_number: "20210075858",
            apn: parcel.apn,
            role: "trustor",
            role_provenance: "manual_entry",
            role_confidence: 1.0,
            recording_date: "2021-01-22",
          },
        ]}
      />

      <Endpoint
        method="GET"
        path={`/parcels/${parcel.apn}/title-opinion`}
        title="Synthesized title opinion"
        rationale="Deterministic marketability assessment from the parcel's chain + lifecycles + anomaly findings. Not prose from an LLM — every claim badges its source lifecycle ID or rule ID so it's defensible under a professional-liability lens. This is the piece plants cannot build because they do not apply R1–R10 against a single-source-of-truth corpus."
        example={{
          as_of: pipelineStatus.verified_through_date,
          headline: "Marketable subject to exceptions",
          open_encumbrance_ids: ["lc-002", "lc-015"],
          blocking_findings: ["R10"],
          claim_count: 7,
        }}
      />

      <Endpoint
        method="POST"
        path="/webhooks"
        title="Live-push webhook"
        rationale="Subscribe to recording events. Delivered in-millisecond as the county indexes each new instrument. Title plants cannot offer this — they are by definition downstream consumers of the county feed and lag 2–7 days."
        example={{
          event_type: "instrument.published",
          recording_number: "20260418100042",
          apn: "304-78-386",
          document_type_raw: "DEED TRST",
          published_at: "2026-04-18T14:32:07.812-07:00",
          webhook_delivery_latency_ms: 47,
        }}
      />

      <section
        aria-label="Rate limits and SLA"
        className="rounded border border-slate-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Rate limits &amp; SLA (indicative)
        </h2>
        <table className="w-full text-xs text-slate-700">
          <thead className="text-left uppercase tracking-wider text-[10px] text-slate-500">
            <tr>
              <th className="py-1">Tier</th>
              <th className="py-1">Rate</th>
              <th className="py-1">Price</th>
              <th className="py-1">SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-1">Public</td>
              <td className="py-1">60 req/min</td>
              <td className="py-1">Free</td>
              <td className="py-1">Best-effort</td>
            </tr>
            <tr>
              <td className="py-1">Commercial</td>
              <td className="py-1">600 req/min</td>
              <td className="py-1">$0.02/call</td>
              <td className="py-1">99.9% monthly; 2s p99 latency</td>
            </tr>
            <tr>
              <td className="py-1">Enterprise</td>
              <td className="py-1">Custom</td>
              <td className="py-1">Volume negotiated</td>
              <td className="py-1">99.95% monthly; live-push webhooks; dedicated support</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        aria-label="Not documented here"
        className="rounded border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <strong className="text-slate-800">Out of scope for this
        page:</strong> the gateway, auth, billing, quota enforcement,
        and webhook-dispatch infrastructure. The shapes above already
        exist as local imports in <code>src/data-loader.ts</code> and
        are consumed by the portal in production — wrapping them in
        an HTTP gateway is a deployment-time exercise, not a
        data-model change.
      </section>
    </div>
  );
}

function Endpoint({
  method,
  path,
  title,
  rationale,
  example,
}: {
  method: "GET" | "POST";
  path: string;
  title: string;
  rationale: string;
  example: unknown;
}) {
  const methodBg =
    method === "GET" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800";
  return (
    <section
      aria-label={title}
      className="rounded border border-slate-200 bg-white"
      data-testid="api-endpoint"
    >
      <header className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${methodBg}`}
          >
            {method}
          </span>
          <code className="font-mono text-sm text-slate-900">{path}</code>
        </div>
        <h3 className="mt-1 text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-xs text-slate-600">{rationale}</p>
      </header>
      <div className="px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Example response
        </div>
        <pre className="max-h-64 overflow-auto rounded bg-gray-50 border border-gray-200 px-3 py-2 font-mono text-[11px] text-gray-800">
          {JSON.stringify(example, null, 2)}
        </pre>
      </div>
    </section>
  );
}
