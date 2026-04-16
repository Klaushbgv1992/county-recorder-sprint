import { useMap } from "react-map-gl/maplibre";
import countyBoundary from "../data/maricopa-county-boundary.json";

export interface MapZoomControlsProps {
  defaultCenter: { longitude: number; latitude: number };
  defaultZoom: number;
  // Optional pan target for a named counter-example parcel (HOGUE on landing).
  // Rendered as "Show counter-example" button when provided.
  counterExampleCoord?: { longitude: number; latitude: number };
}

function computeBboxFromFeatureCollection(
  fc: GeoJSON.FeatureCollection,
): [number, number, number, number] {
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  for (const feat of fc.features) {
    const geom = feat.geometry;
    const rings: number[][][] =
      geom.type === "Polygon"
        ? geom.coordinates
        : geom.type === "MultiPolygon"
          ? geom.coordinates.flat()
          : [];
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

const BUTTON_CLASS =
  "px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded shadow hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500";

export function MapZoomControls({
  defaultCenter,
  defaultZoom,
  counterExampleCoord,
}: MapZoomControlsProps) {
  const { current: map } = useMap();

  function showFullCounty() {
    if (!map) return;
    const [minLon, minLat, maxLon, maxLat] = computeBboxFromFeatureCollection(
      countyBoundary as GeoJSON.FeatureCollection,
    );
    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 32, duration: 700 },
    );
  }

  function resetView() {
    if (!map) return;
    map.flyTo({
      center: [defaultCenter.longitude, defaultCenter.latitude],
      zoom: defaultZoom,
      duration: 700,
    });
  }

  function showCounterExample() {
    if (!map || !counterExampleCoord) return;
    map.flyTo({
      center: [counterExampleCoord.longitude, counterExampleCoord.latitude],
      zoom: defaultZoom,
      duration: 700,
    });
  }

  const currentZoom = map?.getZoom() ?? defaultZoom;
  const showReset = currentZoom < 13;

  return (
    <div className="absolute top-20 left-2 z-10 flex flex-col gap-1">
      <button
        type="button"
        onClick={showFullCounty}
        title="Zoom out to see all of Maricopa County."
        className={BUTTON_CLASS}
      >
        Show full county
      </button>
      {counterExampleCoord && (
        <button
          type="button"
          onClick={showCounterExample}
          title="Pan to the HOGUE counter-example parcel."
          className={BUTTON_CLASS}
        >
          Show counter-example
        </button>
      )}
      {showReset && (
        <button
          type="button"
          onClick={resetView}
          title="Return to street-level view of the example parcels."
          className={BUTTON_CLASS}
        >
          Reset view
        </button>
      )}
    </div>
  );
}
