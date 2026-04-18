// src/components/CountyMap.tsx
import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import MapGL, { Source, Layer, Marker, useMap } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import countyBoundary from "../data/maricopa-county-boundary.json";
import parcelsGeo from "../data/parcels-geo.json";
import { computeLandingMapCenter, type MapCoord } from "../logic/compute-map-center";
import { resolvePopupData } from "../logic/popup-data";
import { loadAllParcels, loadAllInstruments } from "../data-loader";
import { LifecyclesFile } from "../schemas";
import lifecyclesRaw from "../data/lifecycles.json";
import { MapPopup } from "./MapPopup";
import { MapLegend } from "./MapLegend";
import { MapZoomControls } from "./MapZoomControls";
import type { OverlayName } from "../logic/overlay-state";
import { EncumbranceOverlayLayer } from "./map/EncumbranceOverlayLayer";
import { AnomalyOverlayLayer } from "./map/AnomalyOverlayLayer";
import { LastDeedOverlayLayer } from "./map/LastDeedOverlayLayer";

export interface HighlightedParcel {
  apn: string;
  status: "primary" | "backup" | "subdivision_common";
  label?: string;
}

export interface CountyMapProps {
  highlightedParcels: HighlightedParcel[];
  onParcelClick: (apn: string) => void;
  // New optional props (defaults ensure backward compat with existing call sites)
  assessorPolygons?: GeoJSON.FeatureCollection;
  cachedApns?: Set<string>;
  // Full set of APNs with hand-curated instrument chains. Used only to
  // surface the accurate "Curated N" count in the tier legend —
  // highlightedParcels is a smaller map-highlight subset and would
  // understate the moat if used for the legend.
  curatedApns?: Set<string>;
  overlays?: Set<OverlayName>;
  onAssessorParcelClick?: (apn: string) => void;
  lifecycles?: Array<{ id: string; root_instrument: string; status: string; examiner_override?: string | null }>;
  anomalies?: Array<{ parcel_apn: string; severity: "high" | "medium" | "low" }>;
  instrumentToApn?: Map<string, string>;
  // When true, the map starts zoomed out and auto-flies into POPHAM with a
  // pulsing callout. Parent decides this based on URL state — a deep link
  // with ?apn/?q/?overlay set suppresses the intro on that visit.
  showIntro?: boolean;
  // Invoked when the intro callout is clicked. Parent wires this to open the
  // POPHAM parcel drawer.
  onIntroClick?: () => void;
}

// Derived from midpoint of POPHAM (304-78-386) ↔ HOA tract (304-78-409) centroids.
// These two sit ~50m apart in Seville Parcel 3; zoom 16 frames them together
// with E Palmer St street labels visible. HOGUE (304-77-689) is ~2km west and
// out of this frame — reachable via the "Show counter-example" button below.
// Recompute via computeLandingMapCenter() if the highlighted cluster changes.
const LANDING_MAP_CENTER = computeLandingMapCenter(
  ["304-78-386", "304-78-409"],
  parcelsGeo as GeoJSON.FeatureCollection,
);
const LANDING_MAP_ZOOM = 16;

// Zoomed-out frame used as the *starting* viewport when the demo intro is
// active. Picked so Gilbert street grid is visible — the fly-in to zoom 16
// reads as a deliberate reveal rather than a jump.
const INTRO_START_ZOOM = 12.5;

// POPHAM centroid — the intro fly target and callout anchor.
const POPHAM_COORD = computeLandingMapCenter(
  ["304-78-386"],
  parcelsGeo as GeoJSON.FeatureCollection,
);

// HOGUE centroid for the "Show counter-example" pan target.
const COUNTER_EXAMPLE_COORD = computeLandingMapCenter(
  ["304-77-689"],
  parcelsGeo as GeoJSON.FeatureCollection,
);

const STATUS_FILL: Record<HighlightedParcel["status"], string> = {
  primary: "#10b981", // emerald-500
  backup: "#f59e0b", // amber-500
  subdivision_common: "#94a3b8", // slate-400
};

const STATUS_OUTLINE: Record<HighlightedParcel["status"], string> = {
  primary: "#10b981",
  backup: "#f59e0b",
  subdivision_common: "#64748b", // slate-500
};

const STATUS_FILL_OPACITY: Record<HighlightedParcel["status"], number> = {
  primary: 0.55,
  backup: 0.55,
  subdivision_common: 0.35,
};

// Used at module load; safe because corpus is static.
const PARCELS = loadAllParcels();
const INSTRUMENTS = loadAllInstruments();
const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;
const INSTRUMENT_BY_NUMBER = new Map(INSTRUMENTS.map((i) => [i.instrument_number, i]));

function useViewport(): { isMobile: boolean } {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return { isMobile };
}

interface MobileBoundsFitterProps {
  // Comma-joined APN list. String-valued so useEffect dependency is stable
  // across parent re-renders (a new array identity would re-fire fitBounds
  // on every render).
  apnsKey: string;
}

function MobileBoundsFitter({ apnsKey }: MobileBoundsFitterProps) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map) return;
    const apns = apnsKey.split(",");
    const features = (parcelsGeo.features as GeoJSON.Feature[]).filter((f) =>
      apns.includes((f.properties as { apn?: string } | null)?.apn ?? ""),
    );
    if (features.length === 0) return;
    let minLon = Infinity,
      minLat = Infinity,
      maxLon = -Infinity,
      maxLat = -Infinity;
    for (const f of features) {
      if (f.geometry.type !== "Polygon") continue;
      for (const [lon, lat] of (f.geometry as GeoJSON.Polygon).coordinates[0]) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 24, maxZoom: 15, duration: 0 },
    );
  }, [map, apnsKey]);
  return null;
}

export function CountyMap({
  highlightedParcels,
  onParcelClick,
  assessorPolygons = { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection,
  cachedApns = new Set<string>(),
  curatedApns,
  overlays = new Set<OverlayName>(),
  onAssessorParcelClick = () => {},
  lifecycles,
  anomalies,
  instrumentToApn,
  showIntro = false,
  onIntroClick,
}: CountyMapProps) {
  const { isMobile } = useViewport();
  const [hoveredApn, setHoveredApn] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const handleReady = useCallback(() => setMapReady(true), []);

  const parcelById = useMemo(() => {
    const m = new Map<string, GeoJSON.Feature>();
    for (const f of parcelsGeo.features as GeoJSON.Feature[]) {
      const apn = (f.properties as { apn?: string } | null)?.apn;
      if (apn) m.set(apn, f);
    }
    return m;
  }, []);

  // Enrich lifecycles with root_document_type for the dual-color overlay.
  // "hoa_lien" instruments paint amber; everything else stays blue.
  const lifecyclesForOverlay = useMemo(() => {
    const source = lifecycles ?? LIFECYCLES;
    return source.map((lc) => ({
      id: lc.id,
      root_instrument: lc.root_instrument,
      status: lc.status,
      root_document_type: (
        INSTRUMENT_BY_NUMBER.get(lc.root_instrument)?.document_type === "hoa_lien"
          ? "hoa_lien"
          : "other"
      ) as "hoa_lien" | "other",
    }));
  }, [lifecycles]);

  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    // Curated parcels first (highest priority)
    for (const p of highlightedParcels) ids.push(`parcel-${p.apn}-fill`);
    // Cached-neighbor hit target
    ids.push("cached-neighbors-fill-hit");
    // Assessor-only polygons last
    ids.push("assessor-only-fill");
    return ids;
  }, [highlightedParcels]);

  const apnFromEvent = (e: MapLayerMouseEvent): string | null => {
    const feat = e.features?.[0];
    if (!feat) return null;
    const layerId = feat.layer?.id ?? "";
    const match = layerId.match(/^parcel-(.+)-fill$/);
    return match ? match[1] : null;
  };

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const layerId = feat.layer?.id ?? "";
      // Curated parcel click
      const curatedMatch = layerId.match(/^parcel-(.+)-fill$/);
      if (curatedMatch) {
        onParcelClick(curatedMatch[1]);
        return;
      }
      // Assessor or cached-neighbor click
      const apn = (feat.properties as { APN_DASH?: string } | null)?.APN_DASH;
      if (apn && (layerId === "assessor-only-fill" || layerId === "cached-neighbors-fill-hit")) {
        onAssessorParcelClick(apn);
      }
    },
    [onParcelClick, onAssessorParcelClick],
  );

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const apn = apnFromEvent(e);
    setHoveredApn((prev) => (prev === apn ? prev : apn));
  }, []);

  const handleMouseLeave = useCallback(() => setHoveredApn(null), []);

  const popupData = hoveredApn
    ? resolvePopupData(hoveredApn, {
        parcels: PARCELS,
        instruments: INSTRUMENTS,
        lifecycles: LIFECYCLES,
      })
    : null;
  const popupFeature = hoveredApn ? parcelById.get(hoveredApn) : undefined;
  const popupCoord = popupFeature
    ? (() => {
        const ring = (popupFeature.geometry as GeoJSON.Polygon).coordinates[0];
        const verts = ring.slice(0, -1);
        const lon = verts.reduce((s, v) => s + v[0], 0) / verts.length;
        const lat = verts.reduce((s, v) => s + v[1], 0) / verts.length;
        return { longitude: lon, latitude: lat };
      })()
    : null;

  // Activity overlay intentionally omitted (spec 2026-04-15-landing-map §10):
  // - municipality-grained, not parcel-grained (unit mismatch on parcel-zoom)
  // - already rendered at /county-activity (ActivityHeatMap)
  // - freshness signal already covered by Terminal 3's verified-through banner
  // Future: parcel-grained activity belongs in the popup, not as global overlay.

  return (
    // absolute inset-0 (not h-full w-full) because the parent <section>
    // sizes via flex-1 + min-h-[70vh], which gives a computed layout
    // height but no CSS `height` property. height:100% resolves against
    // the parent's CSS `height` (auto) and collapses to 0. Absolute
    // positioning against the relative parent pins all four edges to
    // the parent's border box, which IS the flex-resolved 70vh.
    <div className="absolute inset-0">
      <MapGL
        initialViewState={{
          longitude: showIntro
            ? POPHAM_COORD.longitude
            : LANDING_MAP_CENTER.longitude,
          latitude: showIntro
            ? POPHAM_COORD.latitude
            : LANDING_MAP_CENTER.latitude,
          zoom: showIntro ? INTRO_START_ZOOM : LANDING_MAP_ZOOM,
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={interactiveLayerIds}
        cursor={hoveredApn ? "pointer" : "grab"}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onLoad={handleReady}
        onIdle={handleReady}
      >
        {isMobile && (
          <MobileBoundsFitter
            apnsKey={highlightedParcels.map((p) => p.apn).join(",")}
          />
        )}

        <Source
          id="county-boundary"
          type="geojson"
          data={countyBoundary as GeoJSON.FeatureCollection}
        >
          <Layer
            id="county-boundary-outline"
            type="line"
            paint={{ "line-color": "#1e293b", "line-width": 1.5 }}
          />
        </Source>

        {highlightedParcels.map((p) => {
          const feat = parcelById.get(p.apn);
          if (!feat) return null;
          const isHovered = hoveredApn === p.apn;
          const dashedOutline = p.status === "subdivision_common";
          return (
            <Source
              key={p.apn}
              id={`parcel-${p.apn}`}
              type="geojson"
              data={{ type: "FeatureCollection", features: [feat] }}
            >
              <Layer
                id={`parcel-${p.apn}-fill`}
                type="fill"
                paint={{
                  "fill-color": STATUS_FILL[p.status],
                  "fill-opacity": isHovered
                    ? STATUS_FILL_OPACITY[p.status] + 0.2
                    : STATUS_FILL_OPACITY[p.status],
                }}
              />
              <Layer
                id={`parcel-${p.apn}-outline`}
                type="line"
                paint={
                  dashedOutline
                    ? {
                        "line-color": STATUS_OUTLINE[p.status],
                        "line-width": 2,
                        "line-dasharray": [2, 2],
                      }
                    : {
                        "line-color": STATUS_OUTLINE[p.status],
                        "line-width": 2,
                      }
                }
              />
              <Layer
                id={`parcel-${p.apn}-outline-hover`}
                type="line"
                paint={{
                  "line-color": STATUS_OUTLINE[p.status],
                  "line-width": isHovered ? 5 : 0,
                }}
              />
            </Source>
          );
        })}

        {/* Assessor-only polygons — visible at zoom >= 13 */}
        <Source id="assessor-only" type="geojson" data={assessorPolygons}>
          <Layer
            id="assessor-only-fill"
            type="fill"
            minzoom={13}
            paint={{ "fill-color": "#cbd5e1", "fill-opacity": 0.08 }}
          />
          <Layer
            id="assessor-only-outline"
            type="line"
            minzoom={13}
            paint={{ "line-color": "#64748b", "line-width": 0.5 }}
          />
        </Source>

        {/* Cached-neighbor polygons — always visible, outline-only + invisible hit target */}
        <Source
          id="cached-neighbors"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: (assessorPolygons.features as GeoJSON.Feature[]).filter(
              (f) => cachedApns.has((f.properties as { APN_DASH?: string } | null)?.APN_DASH ?? ""),
            ),
          }}
        >
          <Layer id="cached-neighbors-fill-hit" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.01 }} />
          <Layer id="cached-neighbors-outline" type="line" paint={{ "line-color": "#3b82f6", "line-width": 2 }} />
        </Source>

        {/* Overlay layers — render on top, never in interactiveLayerIds */}
        <EncumbranceOverlayLayer
          active={overlays.has("encumbrance")}
          lifecycles={lifecyclesForOverlay}
          instrumentToApn={instrumentToApn ?? new Map()}
          parcelsGeo={assessorPolygons}
        />
        <AnomalyOverlayLayer
          active={overlays.has("anomaly")}
          anomalies={anomalies ?? []}
          parcelsGeo={assessorPolygons}
        />
        <LastDeedOverlayLayer
          active={overlays.has("lastdeed")}
          geojson={assessorPolygons}
        />

        {popupData && popupCoord && (
          <MapPopup
            data={popupData}
            longitude={popupCoord.longitude}
            latitude={popupCoord.latitude}
          />
        )}

        <IntroCallout
          active={showIntro}
          target={POPHAM_COORD}
          targetZoom={LANDING_MAP_ZOOM}
          onClick={() => onIntroClick?.()}
        />

        <MapZoomControls
          defaultCenter={LANDING_MAP_CENTER}
          defaultZoom={LANDING_MAP_ZOOM}
          counterExampleCoord={COUNTER_EXAMPLE_COORD}
        />
      </MapGL>
      <MapLegend
        tierCounts={{
          // Prefer the full curated APN set when the parent supplies it
          // (landing page). Falls back to the highlighted subset for older
          // call sites that don't yet know about the full corpus.
          curated: curatedApns?.size ?? highlightedParcels.length,
          cached: cachedApns.size,
          assessor: assessorPolygons.features.length,
        }}
      />
      <div
        aria-hidden={mapReady}
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/85 transition-opacity duration-500 ${
          mapReady ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-sm font-medium text-slate-600">
          Loading county map&hellip;
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IntroCallout — inlined (was DemoIntro) so the "wow-factor" animations live
// alongside the map choreography they serve. Renders nothing unless `active`
// is true and the fly-in has completed — matching the upstream DemoIntro
// contract so parent props are unchanged.
//
// Animations (all defined in src/index.css under the @theme block):
//   - animate-fade-in-up  → mount entrance (no snap-in)
//   (bob + ring-pulse removed — intro bubble stays static; the marker
//    uses a static ring-moat-300 ring-offset-1 cue instead of an
//    infinite ring emission. Entrance fade-in remains.)
// Cursor + ring-color hover signal "this is clickable".
// ─────────────────────────────────────────────────────────────────────────────

interface IntroCalloutProps {
  active: boolean;
  target: MapCoord;
  targetZoom: number;
  onClick: () => void;
  flyDurationMs?: number;
}

type IntroPhase = "flying" | "callout" | "dismissed";

function IntroCallout({
  active,
  target,
  targetZoom,
  onClick,
  flyDurationMs = 1800,
}: IntroCalloutProps) {
  const { current: map } = useMap();
  const [phase, setPhase] = useState<IntroPhase>("flying");
  const introDoneRef = useRef(false);

  // Fly to POPHAM on mount. Advance phase on moveend (once, scoped to the
  // programmatic animation) — setTimeout-based completion drifts on slow clients.
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

  // Once the callout is visible, any *user-initiated* map movement dismisses
  // it. originalEvent is truthy only for user input (drag, wheel, touch);
  // programmatic flyTo/jumpTo leaves it undefined, so we avoid self-dismissing.
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
    <Marker longitude={target.longitude} latitude={target.latitude} anchor="bottom">
      {/* Outer wrapper: fade-in entrance only. Keeping bob/ring-pulse on
          child nodes avoids nested transform composition. */}
      <div className="relative flex flex-col items-center pointer-events-none animate-fade-in-up">
        {/* Bobbing label group — the text bubble + close button drift together
            so the tail stays aligned with the bubble base. */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="pointer-events-auto group relative mb-3 w-72 cursor-pointer rounded-lg border border-moat-200 bg-white px-4 py-3 text-left shadow-xl ring-1 ring-moat-500/10 transition-colors duration-200 hover:ring-moat-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
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
        </div>
        {/* Marker dot — ring-pulse lives here (separate from bob) so the
            radiating box-shadow stays radially symmetric and doesn't wobble. */}
        <div className="relative h-4 w-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-moat-500 opacity-75" />
          <div className="relative h-4 w-4 rounded-full border-2 border-white bg-moat-500 shadow-lg ring-2 ring-moat-300 ring-offset-1" />
        </div>
      </div>
    </Marker>
  );
}
