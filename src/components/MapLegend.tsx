import { useState, useEffect } from "react";
import { Term, TermSection } from "../terminology/Term";

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

const SWATCH_BASE =
  "inline-block w-3.5 h-3.5 mr-2 align-middle border-2";

function PophamSwatch() {
  return (
    <span
      aria-hidden="true"
      className={SWATCH_BASE}
      style={{
        backgroundColor: "rgba(16, 185, 129, 0.55)", // emerald-500 @ 55%
        borderColor: "#10b981",
      }}
    />
  );
}

function HogueSwatch() {
  return (
    <span
      aria-hidden="true"
      className={SWATCH_BASE}
      style={{
        backgroundColor: "rgba(245, 158, 11, 0.55)", // amber-500 @ 55%
        borderColor: "#f59e0b",
      }}
    />
  );
}

function HoaSwatch() {
  return (
    <span
      aria-hidden="true"
      className={SWATCH_BASE}
      style={{
        backgroundColor: "rgba(148, 163, 184, 0.35)", // slate-400 @ 35%
        borderColor: "#64748b", // slate-500
        borderStyle: "dashed",
      }}
    />
  );
}

function LegendBody() {
  return (
    <TermSection id="map-legend">
      <p className="text-xs font-medium text-slate-900 mb-2 leading-snug">
        Click any <Term professional="parcel" /> to open its{" "}
        <Term professional="chain of title" />
      </p>
      <ul className="text-[11px] text-slate-700 space-y-1">
        <li><PophamSwatch />POPHAM &mdash; example</li>
        <li><HogueSwatch />HOGUE &mdash; counter-example</li>
        <li><HoaSwatch />Seville HOA tract</li>
      </ul>
    </TermSection>
  );
}

export function MapLegend() {
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
      className="absolute bottom-4 left-4 z-10 w-[200px] bg-white border border-slate-200 rounded shadow p-3"
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
      <LegendBody />
    </div>
  );
}
