import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import releaseInstrumentRaw from "../data/instruments/20210075858.json";

function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    let meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const preexisting = meta !== null;
    const prev = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    document.title = title;
    meta.setAttribute("content", description);
    return () => {
      document.title = prevTitle;
      if (!preexisting) meta!.remove();
      else if (prev !== null) meta!.setAttribute("content", prev);
    };
  }, [title, description]);
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-xs text-slate-800">{children}</code>;
}

interface Tier {
  name: string;
  price: string;
  per: string;
  for: string;
  features: string[];
  cta: string;
}

const TIERS: Tier[] = [
  {
    name: "Per-record API",
    price: "$0.12",
    per: "/ curated instrument",
    for: "Title agencies, lenders, proptech builders pulling on demand.",
    features: [
      "REST pull against county-authoritative JSON",
      "Provenance + confidence per field",
      "Linked releases, same-day transaction groups",
      "Metered billing, $100 monthly minimum",
    ],
    cta: "Request an API key",
  },
  {
    name: "Parcel commitment feed",
    price: "$4.80",
    per: "/ commitment PDF",
    for: "Underwriters, refinance desks, closing attorneys.",
    features: [
      "Schedule A vesting + Schedule B-II encumbrances",
      "B-I requirements generated from open lifecycles",
      "Every line cites a county-hosted PDF",
      "Webhook when a watched parcel records a new instrument",
    ],
    cta: "Request a pilot",
  },
  {
    name: "Bulk enterprise license",
    price: "Custom",
    per: "",
    for: "Title plants, mortgage servicers, national insurers.",
    features: [
      "Nightly delta of every recorded instrument",
      "Name-index full-text (the capability the public API does not expose)",
      "SLA-backed verified-through commitments",
      "Co-marketed as 'County-Authoritative' — the county keeps the attribution",
    ],
    cta: "Talk to us",
  },
];

const SAMPLE_PAYLOAD = {
  instrument_number: releaseInstrumentRaw.instrument_number,
  recording_date: releaseInstrumentRaw.recording_date,
  document_type: releaseInstrumentRaw.document_type,
  county: "Maricopa, AZ",
  parties: (releaseInstrumentRaw as { parties: unknown[] }).parties.slice(0, 3),
  provenance_summary: (releaseInstrumentRaw as { provenance_summary?: unknown })
    .provenance_summary,
  verified_through: "2026-04-17",
  source_pdf_url:
    "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=20210075858",
  portal_url:
    "https://portal.example.gov/parcel/304-78-386/instrument/20210075858",
};

function SampleEndpoint() {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(SAMPLE_PAYLOAD, null, 2), []);

  const copy = () => {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(json).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2 text-xs font-mono text-slate-300">
        <span>
          GET /v1/instruments/20210075858 · Authorization: Bearer …
        </span>
        <button
          onClick={copy}
          className="rounded border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200 hover:bg-slate-700"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
        {json}
      </pre>
    </div>
  );
}

function KeyRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [useCase, setUseCase] = useState<string>("title_examiner");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Prototype stub — no network call. Production would POST to
    // /internal/api-key-requests and route to the recorder's business
    // development team.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-900">
        <p className="font-semibold">Request received — prototype stub.</p>
        <p className="mt-1 text-emerald-800">
          In production this would route <Mono>{email || "you"}</Mono>
          {org ? <> at <Mono>{org}</Mono></> : null} to the recorder's business
          development desk for a tier-{useCase === "plant" ? "3" : "1"} onboarding
          call within 1 business day. Pilot API keys are issued with a $0
          monthly minimum for the first 30 days.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-3 text-xs underline underline-offset-2"
        >
          ← submit another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-slate-200 bg-white p-5 space-y-3"
    >
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Work email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@agency.com"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moat-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Organization
        </label>
        <input
          type="text"
          required
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          placeholder="Sunbelt Title & Escrow"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moat-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Primary use case
        </label>
        <select
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moat-500"
        >
          <option value="title_examiner">
            Title examiner / abstractor — per-record lookups
          </option>
          <option value="underwriter">
            Underwriter / refinance desk — commitment feed
          </option>
          <option value="attorney">
            Closing attorney — commitment feed
          </option>
          <option value="plant">
            Title plant / insurer — bulk delta license
          </option>
          <option value="other">Other</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-moat-700 px-4 py-2 text-sm font-semibold text-white hover:bg-moat-800 focus:outline-none focus:ring-2 focus:ring-moat-500 focus:ring-offset-2"
      >
        Request API key
      </button>
      <p className="text-[11px] text-slate-500">
        Prototype stub. No data is sent. In production this form opens a
        county-managed onboarding ticket with pilot-tier credentials returned
        by email.
      </p>
    </form>
  );
}

export function EnterprisePage() {
  usePageMeta(
    "Enterprise data feed — Maricopa County Recorder",
    "County-licensed data feed for title agencies, lenders, underwriters, and plants. Per-record API, commitment feed, and bulk delta license. County-authoritative, same-day, cited.",
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <article className="max-w-5xl mx-auto">
        <header className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-moat-700">
            For private enterprise
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            License the county's data — direct from the custodian
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Title plants charge their customers to re-sell a 2–4 week-stale
            copy of records the county already hosts. This feed sells the
            authoritative version, same-day, with provenance and confidence
            per field. The revenue returns to the recorder's office that
            originated the record.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>· Same-day vs 14–28 day plant lag</span>
            <span>· County-authoritative PDFs cited per row</span>
            <span>· Provenance + confidence on every field</span>
            <span>
              ·{" "}
              <Link
                to="/why"
                className="underline underline-offset-2 hover:text-slate-700"
              >
                Why this beats a plant
              </Link>
            </span>
          </div>
        </header>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Sample endpoint
          </h2>
          <p className="text-sm text-slate-600 mb-3 max-w-3xl">
            This is the exact shape of a curated instrument pulled from the
            county feed. Parties are role-tagged; provenance is{" "}
            <Mono>public_api</Mono>, <Mono>ocr</Mono>, or{" "}
            <Mono>manual_entry</Mono>; source PDF is the
            county-authoritative URL from{" "}
            <Mono>publicapi.recorder.maricopa.gov</Mono>.
          </p>
          <SampleEndpoint />
          <p className="mt-2 text-[11px] text-slate-500">
            Payload derived from the real curated instrument at{" "}
            <Mono>/parcel/304-78-386/instrument/20210075858</Mono>.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Pricing tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-md border border-slate-200 bg-white p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.name}
                </p>
                <p className="mt-2">
                  <span className="text-2xl font-semibold text-slate-900">
                    {t.price}
                  </span>
                  <span className="ml-1 text-xs text-slate-500">{t.per}</span>
                </p>
                <p className="mt-1 text-xs text-slate-600">{t.for}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-700 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span
                        className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-moat-700"
                        aria-hidden="true"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] text-slate-500">
                  CTA: <span className="text-slate-700">{t.cta}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Pricing is an illustrative anchor for this prototype — plants
            currently charge $2–$8 per pull and $20k–$250k annual seat
            licenses for agencies. County-licensed pricing targets a deliberate
            discount on the plant's resale margin.
          </p>
        </section>

        <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Request a pilot key
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              30-day pilot on the per-record tier. No monthly minimum during
              the pilot. Production keys issued after a single onboarding call
              with the recorder's business development team.
            </p>
            <KeyRequestForm />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Why buy from the county, not a plant
            </h2>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">
                  Same-day, not 2–4 week stale
                </p>
                <p className="mt-1 text-slate-600 text-[13px] leading-relaxed">
                  Plants re-index weekly at best. The county has no
                  re-indexing lag — what's recorded is searchable immediately.
                </p>
              </li>
              <li className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">
                  Authoritative, not scraped
                </p>
                <p className="mt-1 text-slate-600 text-[13px] leading-relaxed">
                  Every PDF URL points back to{" "}
                  <Mono>publicapi.recorder.maricopa.gov</Mono>. A commitment
                  built on this feed can cite the original document without
                  an aggregator in the middle.
                </p>
              </li>
              <li className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">
                  Pipeline transparency
                </p>
                <p className="mt-1 text-slate-600 text-[13px] leading-relaxed">
                  Five verified-through dates published per stage. No plant
                  reports on stages it doesn't operate. An underwriter
                  budgeting title exposure can price from SLAs instead of
                  guesses.
                </p>
              </li>
              <li className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">
                  Capabilities plants structurally cannot match
                </p>
                <p className="mt-1 text-slate-600 text-[13px] leading-relaxed">
                  Name-filtered cross-parcel search, MERS-gap annotation,
                  same-day transaction grouping — all require custodian-side
                  access to the un-published internal index.{" "}
                  <Link
                    to="/moat-compare"
                    className="underline underline-offset-2 hover:text-slate-800"
                  >
                    Side-by-side
                  </Link>
                  .
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 text-xs text-slate-500">
          <p className="font-semibold text-slate-700 uppercase tracking-wide">
            Prototype scope note
          </p>
          <p className="mt-1 leading-relaxed">
            This page is a credible stub. The sample endpoint, schema, and
            pricing anchors are real. The submission form does not call a
            backend. Per <Link to="/why" className="underline">/why</Link>,
            the commercial argument is that the custodian already owns every
            input the plants re-sell; this page shows the shape of the offer
            a recorder's office could ship without giving away any
            additional data.
          </p>
        </section>
      </article>
    </main>
  );
}
