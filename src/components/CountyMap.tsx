// src/components/CountyMap.tsx
import { useMemo, useCallback, useState } from "react";
import MapGL, { Source, Layer } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import countyBoundary from "../data/maricopa-county-boundary.json";
import parcelsGeo from "../data/parcels-geo.json";

export interface HighlightedParcel {
  apn: string;
  status: "primary" | "backup";
  label?: string;
}

export interface CountyMapProps {
  highlightedParcels: HighlightedParcel[];
  onParcelClick: (apn: string) => void;
  initialViewState?: { longitude: number; latitude: number; zoom: number };
}

const DEFAULT_VIEW = { longitude: -112.05, latitude: 33.45, zoom: 8.5 };

const STATUS_FILL: Record<HighlightedParcel["status"], string> = {
  primary: "#10b981", // emerald-500
  backup: "#f59e0b", // amber-500
};

export function CountyMap({
  highlightedParcels,
  onParcelClick,
  initialViewState = DEFAULT_VIEW,
}: CountyMapProps) {
  const [hoveredApn, setHoveredApn] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const handleReady = useCallback(() => setMapReady(true), []);

  const parcelById = useMemo(() => {
    const m = new Map<string, GeoJSON.Feature>();
    for (const f of parcelsGeo.features as GeoJSON.Feature[]) {
      const apn = (f.properties as { apn: string } | null)?.apn;
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

  const handleMouseLeave = useCallback(() => {
    setHoveredApn(null);
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapGL
        initialViewState={initialViewState}
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
        <Source id="county-boundary" type="geojson" data={countyBoundary as GeoJSON.FeatureCollection}>
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
                  "fill-opacity": isHovered ? 0.75 : 0.55,
                }}
              />
              <Layer
                id={`parcel-${p.apn}-outline`}
                type="line"
                paint={{ "line-color": STATUS_FILL[p.status], "line-width": 2 }}
              />
              <Layer
                id={`parcel-${p.apn}-outline-hover`}
                type="line"
                paint={{
                  "line-color": STATUS_FILL[p.status],
                  "line-width": isHovered ? 5 : 0,
                }}
              />
            </Source>
          );
        })}
      </MapGL>
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
