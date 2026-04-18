import { Link } from "react-router";
import { STEPS, TOTAL_STEPS } from "../walkthrough/steps";

interface Scenario {
  key: string;
  apn: string;
  label: string;
  heading: string;
  pain: string;
  instruments: number;
}

// Four curated residential title-work scenarios. Each tile deep-links to the
// parcel's Chain of Title; the AI summary + swimlane + lc-0XX lifecycle
// rationale already narrate what the examiner is looking at. No new
// walkthrough machinery — these parcels are self-explanatory once opened
// because the curated lifecycle copy explains the hazard inline.
const SCENARIOS: Scenario[] = [
  {
    key: "probate",
    apn: "999-01-362",
    label: "Probate",
    heading: "Heir takes title after death of owner",
    pain: "AF Death clears first-spouse record by survivorship — second death needs probate and a Personal Representative's Deed. Two instruments, two very different chains.",
    instruments: 5,
  },
  {
    key: "divorce",
    apn: "999-02-555",
    label: "Divorce Q/CL",
    heading: "Quit-claim after divorce — loan stays joint",
    pain: "Decree awards title to one spouse, quit-claim conveys record title, but the DOT still names both borrowers jointly. Ex-spouse remains contingently liable until lender releases.",
    instruments: 5,
  },
  {
    key: "llc",
    apn: "999-03-411",
    label: "LLC transfer",
    heading: "Individual conveys to wholly-owned LLC",
    pain: "Statement of Authority + deed + Affidavit of Property Value recorded same day. DOT stays in individual's name — due-on-sale exposure must be disclosed as a Schedule B exception.",
    instruments: 5,
  },
  {
    key: "tax-sale",
    apn: "999-04-401",
    label: "Tax-sale REO",
    heading: "Treasurer's Deed extinguishes prior DOT",
    pain: "A.R.S. § 42-18267 wipes junior liens by operation of law — but the 2005 Countrywide DOT has no release of record. Appears open; substantively cleared. Classic underwriter discussion.",
    instruments: 5,
  },
];

export function ScenarioPicker() {
  const firstStep = STEPS[0];
  return (
    <section
      aria-label="Examiner walkthrough and title scenarios"
      className="border-b border-slate-200 bg-slate-50 px-6 py-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Primary — guided walkthrough. Full-width hero on mobile, spans
            2 columns on desktop so it visually dominates the scenario row. */}
        <Link
          to={firstStep.path}
          className="group block rounded-lg bg-gradient-to-br from-moat-700 to-recorder-800 text-white p-5 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 mb-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-moat-100/90">
                Examiner walkthrough · {TOTAL_STEPS} steps · ~60 seconds
              </p>
              <h2 className="mt-1 text-lg md:text-xl font-semibold tracking-tight leading-snug">
                See how a title examiner closes a chain
              </h2>
              <p className="mt-2 text-sm text-moat-100/90 leading-snug max-w-2xl">
                POPHAM refi: search → chain → open DOT → candidate release review → commitment export with Schedule B-I.
              </p>
            </div>
            <div className="shrink-0 inline-flex items-center gap-2 rounded-md bg-white text-moat-800 text-sm font-semibold px-4 py-2 self-start sm:self-auto">
              Start walkthrough →
            </div>
          </div>
        </Link>

        {/* Four scenario tiles — visually subordinate to the primary tile above. */}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Or jump to a specific residential title scenario:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIOS.map((s) => (
            <Link
              key={s.key}
              to={`/parcel/${s.apn}`}
              className="rounded-lg bg-white border border-slate-200 p-4 flex flex-col hover:border-moat-400 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-moat-700">
                  {s.label}
                </span>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {s.instruments} docs
                </span>
              </div>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
                {s.heading}
              </h3>
              <p className="mt-1.5 text-[12px] text-slate-600 leading-snug flex-1">
                {s.pain}
              </p>
              <div className="mt-3 text-xs font-medium text-moat-700 group-hover:text-moat-900">
                Open parcel →
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500 text-center">
          Scenario parcels are demo-only synthesized instruments, disclosed
          per document — see the <span className="font-medium">synthetic · demo-only</span> pill in the Proof Drawer.
        </p>
      </div>
    </section>
  );
}
