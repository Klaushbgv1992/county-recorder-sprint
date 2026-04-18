import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import tier1ARaw from "../../docs/hunt-log-known-gap-2.md?raw";
import tier1BRaw from "../../data/raw/R-005/hunt-log.md?raw";

function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;

    let meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const metaWasPreexisting = meta !== null;
    const prevDescription = meta?.getAttribute("content") ?? null;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }

    document.title = title;
    meta.setAttribute("content", description);

    return () => {
      document.title = prevTitle;
      if (!metaWasPreexisting) {
        meta!.remove();
      } else if (prevDescription !== null) {
        meta!.setAttribute("content", prevDescription);
      }
    };
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
            Three beats: <em>why title plants exist</em>, <em>why they've
            become a tax</em>, and <em>why the custodian can leapfrog</em>.
          </p>
        </header>

        <section id="three-beats" className="mb-10 space-y-4">
          <div className="rounded-md border border-moat-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moat-100 text-sm font-semibold text-moat-800">
                1
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Why title plants exist in the first place
              </h2>
            </div>
            <div className="mt-3 pl-10 space-y-2 text-sm text-slate-700 leading-relaxed">
              <p>
                Counties record deeds one at a time, in 50-state taxonomies
                that diverge on document codes, name formatting, and legal
                descriptions. Until the 1990s most indexes were on paper or
                microfilm. By the time an examiner finished walking a chain
                back thirty years, the pile of photocopies was the work
                product.
              </p>
              <p>
                Title plants emerged to solve a real problem: they re-indexed
                the county's records into a geography-keyed database so an
                underwriter could quote a residential refinance without
                sending a human into a basement. A plant was faster than a
                courthouse visit, and underwriters bought what the plants
                sold because the county had no equivalent offering. That was
                a correct arbitrage in 1975.
              </p>
              <p className="text-slate-600">
                See how records actually move from filed to searchable:{" "}
                <a
                  href="#how-records-work"
                  className="text-moat-700 hover:text-moat-900 underline underline-offset-2"
                >
                  ↓ How county records actually work
                </a>
                .
              </p>
            </div>
          </div>

          <div className="rounded-md border border-moat-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moat-100 text-sm font-semibold text-moat-800">
                2
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Why title plants have become a tax
              </h2>
            </div>
            <div className="mt-3 pl-10 space-y-2 text-sm text-slate-700 leading-relaxed">
              <p>
                The county's side of the arbitrage has closed. Every recorded
                document Maricopa files today is available through{" "}
                <Code>publicapi.recorder.maricopa.gov</Code> the same day,
                with a deterministic PDF URL and a machine-readable metadata
                payload. The <em>custodial</em> advantage — authoritative
                source, real-time availability, no licensing layer — now sits
                with the county, not the plant.
              </p>
              <p>
                What the plant still sells is <em>convenience</em>: a search
                interface the county doesn't expose, a cleaned name index,
                and a 2–4 week re-indexing pass. All three of those are now
                things the county could do better — if it shipped a portal
                like this one. The plant's margin is the county's
                un-published inventory.
              </p>
              <p>
                And the margin is paid twice. First by examiners, who license
                plant access to do county work. Second by underwriters, who
                pass the cost into premiums. Neither sale goes back to the
                custodian that originated the record.
              </p>
              <p className="text-slate-600">
                Specific capabilities the public API withholds:{" "}
                <a
                  href="#plants-cannot"
                  className="text-moat-700 hover:text-moat-900 underline underline-offset-2"
                >
                  ↓ What title plants can't do
                </a>{" "}
                · Side-by-side at{" "}
                <Link
                  to="/moat-compare"
                  className="text-moat-700 hover:text-moat-900 underline underline-offset-2"
                >
                  /moat-compare
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="rounded-md border border-moat-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moat-100 text-sm font-semibold text-moat-800">
                3
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Why the custodian can leapfrog
              </h2>
            </div>
            <div className="mt-3 pl-10 space-y-2 text-sm text-slate-700 leading-relaxed">
              <p>
                Three structural advantages belong to the recorder's office
                and nobody else. <strong>Provenance</strong>: every field
                shown on this portal is tagged with its source (public_api /
                ocr / manual_entry) and a confidence score. Plants don't do
                this because they don't know which of their fields were
                scraped vs typed vs inferred. <strong>Pipeline
                transparency</strong>: the verified-through strip at the top
                of every page shows five stages and their SLAs. Plants don't
                publish stages they don't run. <strong>Cross-parcel
                search</strong>: only the custodian can answer "has this
                person's lien been released against any property they
                recorded against?" — the public API has no name-filtered
                search; the county's internal index does.
              </p>
              <p>
                The moat isn't AI. AI is a multiplier on a data asset the
                county already owns. The moat is <em>which side of the
                public search surface you sit on</em>.
              </p>
              <p className="text-slate-600">
                Reproducible proof, with failed-hunt logs:{" "}
                <a
                  href="#receipts"
                  className="text-moat-700 hover:text-moat-900 underline underline-offset-2"
                >
                  ↓ Receipts: what we tried, what the public API blocked
                </a>{" "}
                · Commercial counter-offer:{" "}
                <Link
                  to="/enterprise"
                  className="text-moat-700 hover:text-moat-900 underline underline-offset-2"
                >
                  /enterprise
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <nav
          aria-label="On this page"
          className="mb-10 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Evidence and receipts
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

        <section id="see-it" className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            See it in action
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/"
              className="group block rounded-md border border-slate-200 bg-white p-4 hover:border-moat-300 hover:shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              <p className="text-sm font-semibold text-slate-900 group-hover:text-moat-700">
                Spatial custody
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                County-authoritative parcel polygons from the assessor's file. No
                licensing layer.
              </p>
            </Link>
            <Link
              to="/pipeline"
              className="group block rounded-md border border-slate-200 bg-white p-4 hover:border-moat-300 hover:shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              <p className="text-sm font-semibold text-slate-900 group-hover:text-moat-700">
                Verified freshness
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Per-stage pipeline verification with SLA tracking. Know exactly
                how current your data is.
              </p>
            </Link>
            <Link
              to="/parcel/304-78-386/encumbrances"
              className="group block rounded-md border border-slate-200 bg-white p-4 hover:border-moat-300 hover:shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              <p className="text-sm font-semibold text-slate-900 group-hover:text-moat-700">
                Chain intelligence
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Same-day transaction grouping, MERS annotations, and release
                matching. Structured title work, not a document list.
              </p>
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
