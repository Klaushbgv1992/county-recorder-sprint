import { useEffect } from "react";

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
        </section>

        <section id="receipts" className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Receipts: what we tried, what the public API blocked
          </h2>
        </section>
      </article>
    </main>
  );
}
