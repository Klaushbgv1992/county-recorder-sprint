// src/components/CountyMap.tsx
import { useMemo, useCallback, useState, useEffect } from "react";
import MapGL, { Source, Layer, useMap } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import countyBoundary from "../data/maricopa-county-boundary.json";
import parcelsGeo from "../data/parcels-geo.json";
import { computeLandingMapCenter } from "../logic/compute-map-center";
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
  overlays?: Set<OverlayName>;
  onAssessorParcelClick?: (apn: string) => void;
  lifecycles?: Array<{ id: string; root_instrument: string; status: string }>;
  anomalies?: Array<{ parcel_apn: string; severity: "high" | "medium" | "low" }>;
  instrumentToApn?: Map<string, string>;
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
  overlays = new Set<OverlayName>(),
  onAssessorParcelClick = () => {},
  lifecycles,
  anomalies,
  instrumentToApn,
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
          longitude: LANDING_MAP_CENTER.longitude,
          latitude: LANDING_MAP_CENTER.latitude,
          zoom: LANDING_MAP_ZOOM,
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
          lifecycles={lifecycles ?? LIFECYCLES}
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

        <MapZoomControls
          defaultCenter={LANDING_MAP_CENTER}
          defaultZoom={LANDING_MAP_ZOOM}
          counterExampleCoord={COUNTER_EXAMPLE_COORD}
        />
      </MapGL>
      <MapLegend />
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
