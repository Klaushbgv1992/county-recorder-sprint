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

export interface HighlightedParcel {
  apn: string;
  status: "primary" | "backup" | "subdivision_common";
  label?: string;
}

export interface CountyMapProps {
  highlightedParcels: HighlightedParcel[];
  onParcelClick: (apn: string) => void;
}

// Derived from midpoint of POPHAM (304-78-386) ↔ HOGUE (304-77-689) centroids.
// Recompute via computeLandingMapCenter() if the highlighted parcel set changes.
const LANDING_MAP_CENTER = computeLandingMapCenter(
  ["304-78-386", "304-77-689"],
  parcelsGeo as GeoJSON.FeatureCollection,
);
const LANDING_MAP_ZOOM = 15;

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
  apns: string[];
}

function MobileBoundsFitter({ apns }: MobileBoundsFitterProps) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map) return;
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
  }, [map, apns]);
  return null;
}

export function CountyMap({
  highlightedParcels,
  onParcelClick,
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

  const interactiveLayerIds = useMemo(
    () => highlightedParcels.map((p) => `parcel-${p.apn}-fill`),
    [highlightedParcels],
  );

  const apnFromEvent = (e: MapLayerMouseEvent): string | null => {
    const feat = e.features?.[0];
    if (!feat) return null;
    const layerId = feat.layer?.id ?? "";
    const match = layerId.match(/^parcel-(.+)-fill$/);
    return match ? match[1] : null;
  };

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const apn = apnFromEvent(e);
      if (apn) onParcelClick(apn);
    },
    [onParcelClick],
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
    <div className="relative h-full w-full">
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
          <MobileBoundsFitter apns={highlightedParcels.map((p) => p.apn)} />
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
