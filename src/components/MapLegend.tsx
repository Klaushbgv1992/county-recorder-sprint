import { useState, useEffect } from "react";

// Three-tier data-moat legend. The whole point of the landing map is to
// make the county's three-tier coverage visible at a glance. Each tier
// earns its colour:
//
//  - Curated (emerald): the 11 APNs with full hand-curated chains,
//    provenance, lifecycles, and matched release links.
//  - Recorder-cached (blue): neighbor APNs whose raw recorder-API JSON
//    is cached locally. Production = live API with a TTL.
//  - Assessor (slate): every parcel polygon seeded from the Maricopa
//    Assessor public GIS (~8,570 in Gilbert). Click to see "not in
//    corpus" — the honest floor of coverage.
//
// Keeping this up-front makes the moat story land before a user clicks
// anything. Counts are live from CountyMap so they never drift.

interface TierCounts {
  curated: number;
  cached: number;
  assessor: number;
}

interface Props {
  tierCounts: TierCounts;
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function formatCount(n: number): string {
  if (n >= 1000) return `~${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

function TierRow({
  swatchColor,
  swatchBorderColor,
  swatchStyle = "solid",
  label,
  sublabel,
  count,
  accentTextClass,
}: {
  swatchColor: string;
  swatchBorderColor: string;
  swatchStyle?: "solid" | "dashed";
  label: string;
  sublabel: string;
  count: string;
  accentTextClass: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="inline-block w-3.5 h-3.5 mt-0.5 flex-shrink-0 border-2"
        style={{
          backgroundColor: swatchColor,
          borderColor: swatchBorderColor,
          borderStyle: swatchStyle,
        }}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-slate-900 truncate">
            {label}
          </span>
          <span
            className={`text-[10px] font-mono font-semibold tabular-nums ${accentTextClass}`}
          >
            {count}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 truncate">{sublabel}</div>
      </div>
    </li>
  );
}

function LegendBody({ tierCounts }: { tierCounts: TierCounts }) {
  return (
    <div id="map-legend">
      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
          County data moat
        </div>
        <div className="text-[11px] font-medium text-slate-700 leading-tight">
          Three tiers of coverage
        </div>
      </div>
      <ul className="space-y-2">
        <TierRow
          swatchColor="rgba(16, 185, 129, 0.55)" /* emerald-500 @ 55% */
          swatchBorderColor="#10b981"
          label="Curated"
          sublabel="Full chain + provenance"
          count={formatCount(tierCounts.curated)}
          accentTextClass="text-emerald-700"
        />
        <TierRow
          swatchColor="rgba(59, 130, 246, 0.25)" /* blue-500 @ 25% */
          swatchBorderColor="#3b82f6"
          label="Recorder"
          sublabel="Cached API · live in prod"
          count={formatCount(tierCounts.cached)}
          accentTextClass="text-blue-700"
        />
        <TierRow
          swatchColor="rgba(148, 163, 184, 0.20)" /* slate-400 @ 20% */
          swatchBorderColor="#64748b" /* slate-500 */
          swatchStyle="dashed"
          label="Assessor"
          sublabel="Public GIS polygons"
          count={formatCount(tierCounts.assessor)}
          accentTextClass="text-slate-600"
        />
      </ul>
      <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-snug">
        Click any parcel — the tier determines how much the custodian
        knows about it.
      </p>
    </div>
  );
}

export function MapLegend({ tierCounts }: Props) {
  const [mobile, setMobile] = useState(isMobileViewport);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Pinned bottom-left to avoid colliding with OverlayToggles (top-right,
  // z-10) introduced by the landing-map feature. The top-left corner of
  // the map is occupied by "Show full county" / "Show counter-example"
  // CountyMap controls, and the bottom-right carries the MapLibre
  // attribution line — so bottom-left is the only remaining quiet corner.
  // The hero search bar above the map does not collide with this placement.
  if (mobile && !expanded) {
    return (
      <button
        type="button"
        aria-label="Show map legend"
        onClick={() => setExpanded(true)}
        className="absolute bottom-4 left-4 z-10 w-8 h-8 rounded-full bg-white border border-slate-300 shadow text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        &#9432;
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-4 left-4 z-10 w-[220px] bg-white border border-slate-200 rounded-md shadow-lg p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {mobile && (
        <button
          type="button"
          aria-label="Hide map legend"
          onClick={() => setExpanded(false)}
          className="absolute top-1 right-1 text-slate-400 hover:text-slate-700 text-sm leading-none"
        >
          &times;
        </button>
      )}
      <LegendBody tierCounts={tierCounts} />
    </div>
  );
}
