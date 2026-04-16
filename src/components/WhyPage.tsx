import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import tier1ARaw from "../../docs/hunt-log-known-gap-2.md?raw";
import tier1BRaw from "../../data/raw/R-005/hunt-log.md?raw";

function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  }, [title, description]);
}

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-xs">{children}</code>;
}

function HuntLogSection({
  heading,
  narrative,
  fullLog,
  sourcePath,
}: {
  heading: string;
  narrative: ReactNode;
  fullLog: string;
  sourcePath: string;
}) {
  return (
    <article className="mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{heading}</h3>
      <div className="text-sm text-slate-700 leading-relaxed space-y-3">
        {narrative}
      </div>
      <details className="mt-3 rounded-md border border-slate-200 bg-white">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Full log ({sourcePath})
        </summary>
        <pre className="overflow-x-auto px-3 py-3 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap font-mono">
          {fullLog}
        </pre>
      </details>
      <p className="mt-1 text-xs text-slate-400 font-mono">
        Source file in repo: {sourcePath}
      </p>
    </article>
  );
}

export function WhyPage() {
  usePageMeta(
    "Why county-owned title data — Maricopa County Recorder Portal",
    "How county recording, indexing, and title-plant search actually work — plus what the public API blocks, with receipts from two failed hunts against Maricopa's publicapi.recorder.maricopa.gov.",
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <article className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">
            Why county-owned title data
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            How residential title work actually happens, and where the public
            pipeline falls short.
          </p>
        </header>

        <nav
          aria-label="On this page"
          className="mb-10 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            On this page
          </div>
          <ul className="space-y-0.5">
            <li>
              <a
                href="#how-records-work"
                className="text-slate-800 hover:text-slate-900 underline underline-offset-2"
              >
                ↓ How county records actually work
              </a>{" "}
              <span className="text-slate-500">(1 min)</span>
            </li>
            <li>
              <a
                href="#plants-cannot"
                className="text-slate-800 hover:text-slate-900 underline underline-offset-2"
              >
                ↓ What title plants can't do
              </a>{" "}
              <span className="text-slate-500">(45 sec)</span>
            </li>
            <li>
              <a
                href="#receipts"
                className="text-slate-800 hover:text-slate-900 underline underline-offset-2"
              >
                ↓ Receipts: the failed hunts
              </a>{" "}
              <span className="text-slate-500">(3 min)</span>
            </li>
          </ul>
        </nav>

        <section id="how-records-work" className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            How county records actually work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Recording → indexing → search
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                A deed becomes public in three moments: it's{" "}
                <em>recorded</em> (officially filed), then{" "}
                <em>indexed</em> (added to a searchable catalog), then{" "}
                <em>searchable</em> (anyone can find it). The gap between
                indexing and search is where title plants live — their value
                proposition is re-indexing after the county. The county has
                no such gap. What's recorded is immediately searchable from
                the same surface that recorded it.
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Chain reconstruction
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Title examiners work backwards. Today's owner names someone
                who sold it to them, who names someone before them, who
                names someone before them — a <em>chain of title</em> going
                back decades. Miss one link and the title is broken.
                Examiners do this click-by-click because every deed names
                different parties, filed on different dates, under different
                instrument numbers.
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Encumbrance lifecycle
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Every lien has a birth (recording) and, usually, a death
                (release). When the death never gets filed, the lien sits on
                paper forever — technically still there, legally dead,
                practically awkward. Tracking which encumbrances have been
                released and which haven't is half of what an examiner does.
              </p>
            </div>
          </div>
        </section>

        <section id="plants-cannot" className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            What title plants can't do
          </h2>
          <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <li>
              <strong className="text-slate-900">
                Lien search by recording code is literally impossible on the public
                API.
              </strong>{" "}
              The four lien-related codes —{" "}
              <Code>RE FED TX</Code>,{" "}
              <Code>FED TAX L</Code>,{" "}
              <Code>LIEN</Code>,{" "}
              <Code>MED LIEN</Code> — are in the index,
              but the search surface refuses to enumerate by them.{" "}
              <Code>totalResults: 0</Code> every time.
            </li>
            <li>
              <strong className="text-slate-900">
                Title plants host copies; the county hosts originals.
              </strong>{" "}
              Every PDF linked from this portal comes from{" "}
              <Code>publicapi.recorder.maricopa.gov</Code>{" "}
              directly. Aggregators serve their own CDN copy behind a subscription.
            </li>
            <li>
              <strong className="text-slate-900">
                Plants index on a 14–28-day lag; the county publishes same-day.
              </strong>{" "}
              Every recorded document is available through the public API the moment
              it's filed. Indexing lag exists upstream of the plants, not at the
              county.
            </li>
            <li>
              <strong className="text-slate-900">
                Pipeline transparency is custodian-only.
              </strong>{" "}
              This portal shows five verified-through dates (index, image, OCR,
              entity resolution, curator) each with its own SLA. No aggregator can
              report on stages they don't run.
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            Full side-by-side at{" "}
            <Link
              to="/moat-compare"
              className="text-moat-700 hover:text-moat-900 underline underline-offset-2"
            >
              /moat-compare
            </Link>
            .
          </p>
        </section>

        <section id="receipts" className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Receipts: what we tried, what the public API blocked
          </h2>

          <HuntLogSection
            heading="Federal-tax-lien hunt (Tier 1-A)"
            sourcePath="docs/hunt-log-known-gap-2.md"
            fullLog={tier1ARaw}
            narrative={
              <>
                <p>
                  45 minutes. One goal: find a federal tax lien using only the API
                  the county exposes to the public.
                </p>
                <p>
                  The search endpoint accepts a{" "}
                  <Code>documentCode</Code> filter. Every
                  spelling of "federal tax lien" (
                  <Code>FED TAX LIEN</Code>,{" "}
                  <Code>FEDERAL TAX LIEN</Code>,{" "}
                  <Code>IRS LIEN</Code>,{" "}
                  <Code>NFTL</Code>, ten others) returned
                  zero. The short code for federal tax lien isn't in the search
                  vocabulary.
                </p>
                <p>
                  Date filters? Silently dropped. The endpoint accepts the parameter
                  but ignores it. Default sort is ascending by recording number, so
                  every query starts in 1947 and would need ~50,000 pages of
                  pagination to reach 2020. There's no descending sort.
                </p>
                <p>
                  The modern web search page is Cloudflare-gated. The legacy ASP.NET
                  page requires replaying{" "}
                  <Code>__VIEWSTATE</Code> tokens that
                  no scripting API can generate. Structural blocker hit in 20
                  minutes. Stopped.
                </p>
                <p>
                  The hunt pivoted to subdivision encumbrances already cited in
                  POPHAM's deed legal description — and that pivot succeeded,
                  because it didn't require name or code search. Every step was{" "}
                  <Code>GET /documents/{"{known_number}"}</Code>.
                  That's the shape of what works here and what doesn't.
                </p>
              </>
            }
          />

          <HuntLogSection
            heading="Master-plat hunt (Tier 1-B)"
            sourcePath="data/raw/R-005/hunt-log.md"
            fullLog={tier1BRaw}
            narrative={
              <>
                <p>Different question, same API, deeper failure.</p>
                <p>
                  Parcel 3's final plat (
                  <Code>20010093192</Code>) says on its
                  face: <em>"being a resubdivision of a portion of Seville Tract H as
                  recorded in Book 553, Page 15."</em> One well-formed question with
                  a single-integer answer: what's the recording number for Book 553,
                  Page 15?
                </p>
                <p>
                  Budgeted 200 API calls. Stopped at ~141 of 200 calls. Zero hits.
                </p>
                <p>Five API layers blocked the lookup:</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-2">
                  <li>
                    <Code>documentCode</Code> filter
                    on <Code>/documents/search</Code>{" "}
                    silently dropped.
                  </li>
                  <li>
                    <Code>docketBook</Code> and{" "}
                    <Code>pageMap</Code> filters
                    silently dropped.
                  </li>
                  <li>
                    Pagination broken — page 10 returns the same 50 records from
                    1947 that page 1 returned.
                  </li>
                  <li>
                    Hypothesised{" "}
                    <Code>byBook/page</Code> and{" "}
                    <Code>book/{"{n}"}/{"{p}"}</Code>{" "}
                    endpoints both 404.
                  </li>
                  <li>Legacy book/page bridge URL Cloudflare-gated.</li>
                </ol>
                <p>
                  Bracket-scanned{" "}
                  <Code>GET /documents/{"{recordingNumber}"}</Code>{" "}
                  across ~94 sample points in the approved range{" "}
                  <Code>20000600000–20010100000</Code>.
                  Plats are 1-in-thousands sparse. No hits.
                </p>
                <p>
                  The side discovery matters more than the miss: four lien-related
                  document codes —{" "}
                  <Code>RE FED TX</Code>,{" "}
                  <Code>FED TAX L</Code>,{" "}
                  <Code>LIEN</Code>,{" "}
                  <Code>MED LIEN</Code> —{" "}
                  <em>are</em> present in the index (they appear inside{" "}
                  <Code>documentCodes</Code> when you
                  fetch by recording number) but return{" "}
                  <Code>totalResults: 0</Code> from{" "}
                  <Code>/documents/search?documentCode=…</Code>.{" "}
                  <strong>The codes are indexable but unsearchable</strong> — the
                  index records what the search surface refuses to enumerate.
                </p>
              </>
            }
          />

          <p className="mt-6 text-sm text-slate-700 leading-relaxed">
            Two failed hunts at adjacent tiers in the same taxonomy is the receipt.
            One is a one-off. Two is a pattern. The county holds the data. The public
            API serves documents, not searches. A county-owned portal closes these
            gaps because only the custodian has both the authoritative source
            records and the ingestion pipeline to build the indexes the public
            surface refuses to expose.
          </p>
        </section>
      </article>
    </main>
  );
}
