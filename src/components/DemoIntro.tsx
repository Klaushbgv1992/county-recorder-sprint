// src/components/DemoIntro.tsx
//
// First-load demo choreography: flies the map from a wider county view into
// POPHAM (304-78-386), then reveals a pulsing callout that invites the reviewer
// to click. Without this the landing reads as a zoning map — the callout
// anchors the thesis ("title plants miss three things here") in the first
// ten seconds of the demo.
//
// Mounts inside <MapGL>. Parent owns the decision of *whether* to show the
// intro (via the `active` prop): once a URL param selects an APN / query /
// overlay, the intro is suppressed on that visit.

import { useEffect, useRef, useState } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";
import type { MapCoord } from "../logic/compute-map-center";

export interface DemoIntroProps {
  active: boolean;
  target: MapCoord;
  targetZoom: number;
  onClick: () => void;
  flyDurationMs?: number;
}

type Phase = "flying" | "callout" | "dismissed";

export function DemoIntro({
  active,
  target,
  targetZoom,
  onClick,
  flyDurationMs = 1800,
}: DemoIntroProps) {
  const { current: map } = useMap();
  const [phase, setPhase] = useState<Phase>("flying");
  const introDoneRef = useRef(false);

  // Fly to POPHAM on mount. We listen for moveend (once, scoped to the
  // programmatic animation) to advance the phase — trying to predict animation
  // completion via setTimeout drifts on slow clients.
  useEffect(() => {
    if (!active || !map) return;
    const m = map.getMap();
    introDoneRef.current = false;

    const onMoveEnd = () => {
      if (introDoneRef.current) return;
      introDoneRef.current = true;
      setPhase("callout");
    };

    m.once("moveend", onMoveEnd);
    m.flyTo({
      center: [target.longitude, target.latitude],
      zoom: targetZoom,
      duration: flyDurationMs,
      essential: true,
    });

    return () => {
      m.off("moveend", onMoveEnd);
    };
  }, [active, map, target.longitude, target.latitude, targetZoom, flyDurationMs]);

  // Once the callout is visible, the next *user-initiated* map movement
  // dismisses it. originalEvent is truthy only for user input (drag, wheel,
  // touch) — programmatic flyTo/jumpTo leaves it undefined, so this filter
  // avoids self-dismissing on our own intro fly.
  useEffect(() => {
    if (!active || !map || phase !== "callout") return;
    const m = map.getMap();
    const onUserMove = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) setPhase("dismissed");
    };
    m.on("movestart", onUserMove);
    return () => {
      m.off("movestart", onUserMove);
    };
  }, [active, map, phase]);

  if (!active || phase !== "callout") return null;

  return (
    <Marker
      longitude={target.longitude}
      latitude={target.latitude}
      anchor="bottom"
    >
      <div className="relative flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="pointer-events-auto group relative mb-3 w-72 rounded-lg border border-moat-200 bg-white px-4 py-3 text-left shadow-xl ring-1 ring-moat-500/10 transition hover:ring-moat-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          aria-label="Explore POPHAM parcel — click to open"
        >
          <p className="text-[13px] font-semibold leading-snug text-slate-900">
            This property has three things title plants miss.
          </p>
          <p className="mt-1 text-[12px] leading-snug text-slate-600">
            Click to explore &rarr;
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-moat-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-moat-500" />
            POPHAM · 304-78-386 · Gilbert
          </div>
          {/* Tail pointing down toward the pulsing dot */}
          <div
            aria-hidden
            className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-moat-200 bg-white"
          />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPhase("dismissed");
          }}
          className="pointer-events-auto absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-400 shadow ring-1 ring-slate-200 hover:text-slate-700"
          aria-label="Dismiss intro callout"
        >
          ×
        </button>
        <div className="relative h-4 w-4">
          <div className="relative h-4 w-4 rounded-full border-2 border-white bg-moat-500 shadow-lg ring-2 ring-moat-300 ring-offset-1" />
        </div>
      </div>
    </Marker>
  );
}
