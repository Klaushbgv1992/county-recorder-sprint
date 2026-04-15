import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import parcelsGeo from "../data/parcels-geo.json";
import subdivisionPlats from "../data/subdivision-plats.json";
import adjacentParcels from "../data/adjacent-parcels.json";
import {
  markerForInstrument,
  type MarkerInput,
  type MarkerPosition,
} from "../logic/instrument-markers";

const COLLAPSE_KEY = "spatial-panel-collapsed";

interface SubdivisionProperties {
  subdivision_id: string;
  display_name: string;
  plat_instrument: string;
  plat_book: string;
  plat_page: string;
  dedicated_by: string;
  dedication_date: string;
  parent_plat_reference?: string;
}

interface SubjectProperties {
  apn?: string;
  SITUS_ADDRESS?: string;
  SUBDIVISION?: string;
  OWNER_NAME?: string;
}

const SUBDIVISION_BY_APN: Record<string, string> = {
  "304-78-386": "seville-parcel-3",
};

// POPHAM subdivision-linked instruments: plat + correction affidavit.
// Future APNs/subdivisions will extend this registry.
const INSTRUMENTS_BY_SUBDIVISION: Record<string, MarkerInput[]> = {
  "seville-parcel-3": [
    {
      instrument_number: "20010093192",
      document_type: "SUBDIVISION PLAT",
      // Geometry filled at render time from the matching subdivision feature.
      geometry: null,
    },
    {
      instrument_number: "20010849180",
      document_type: "AFFIDAVIT OF CORRECTION",
      geometry: null,
    },
  ],
};

export interface SpatialContextPanelProps {
  apn: string;
}

export function SpatialContextPanel({ apn }: SpatialContextPanelProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === "true",
  );

  const subject = useMemo(
    () =>
      (parcelsGeo.features as GeoJSON.Feature[]).find(
        (f) => (f.properties as SubjectProperties | null)?.apn === apn,
      ),
    [apn],
  );

  const subdivisionId = SUBDIVISION_BY_APN[apn];
  const subdivision = useMemo(() => {
    if (!subdivisionId) return undefined;
    return (subdivisionPlats.features as GeoJSON.Feature[]).find(
      (f) =>
        (f.properties as SubdivisionProperties | null)?.subdivision_id ===
        subdivisionId,
    );
  }, [subdivisionId]);

  const markers: MarkerPosition[] = useMemo(() => {
    if (!subdivisionId || !subdivision) return [];
    const registered = INSTRUMENTS_BY_SUBDIVISION[subdivisionId] ?? [];
    const geometry = subdivision.geometry as GeoJSON.Polygon | null;
    return registered
      .map((m) => markerForInstrument({ ...m, geometry }))
      .filter((m): m is MarkerPosition => m !== null);
  }, [subdivisionId, subdivision]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, String(next));
  }

  if (!subject) {
    return (
      <aside className="border-l border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No spatial data for APN {apn}.
      </aside>
    );
  }

  const props = subject.properties as SubjectProperties | null;
  const subdivisionProps =
    (subdivision?.properties as SubdivisionProperties | null) ?? null;

  return (
    <aside
      className={`border-l border-slate-200 bg-white flex flex-col shrink-0 ${
        collapsed ? "w-10" : "w-full md:w-[40%]"
      }`}
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <h3
          className={`text-sm font-semibold text-slate-900 ${collapsed ? "sr-only" : ""}`}
        >
          Spatial context
        </h3>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          className="text-slate-500 hover:text-slate-900 text-lg leading-none"
        >
          {collapsed ? "»" : "«"}
        </button>
      </header>

      {!collapsed && (
        <>
          <div className="flex-1 min-h-[320px] relative">
            <Map
              initialViewState={{
                longitude: -111.7225,
                latitude: 33.2471,
                zoom: 16,
              }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              style={{ width: "100%", height: "100%" }}
            >
              <Source
                id="adjacent"
                type="geojson"
                data={adjacentParcels as GeoJSON.FeatureCollection}
              >
                <Layer
                  id="adjacent-outline"
                  type="line"
                  paint={{ "line-color": "#94a3b8", "line-width": 0.5 }}
                />
              </Source>

              {subdivision && (
                <Source
                  id="subdivision"
                  type="geojson"
                  data={{
                    type: "FeatureCollection",
                    features: [subdivision],
                  }}
                >
                  <Layer
                    id="seville-parcel-3-outline"
                    type="line"
                    paint={{
                      "line-color": "#f59e0b",
                      "line-width": 2,
                      "line-dasharray": [2, 2],
                    }}
                  />
                </Source>
              )}

              <Source
                id="subject"
                type="geojson"
                data={{ type: "FeatureCollection", features: [subject] }}
              >
                <Layer
                  id={`subject-${apn}-fill`}
                  type="fill"
                  paint={{ "fill-color": "#10b981", "fill-opacity": 0.45 }}
                />
                <Layer
                  id={`subject-${apn}-outline`}
                  type="line"
                  paint={{ "line-color": "#065f46", "line-width": 2 }}
                />
              </Source>

              {markers.map((m) => (
                <Marker
                  key={m.instrument_number}
                  longitude={m.longitude}
                  latitude={m.latitude}
                  onClick={() =>
                    navigate(
                      `/parcel/${apn}/instrument/${m.instrument_number}`,
                    )
                  }
                >
                  <span
                    title={
                      m.icon === "plat"
                        ? "Subdivision plat"
                        : m.icon === "correction"
                          ? "Affidavit of correction"
                          : "Instrument"
                    }
                    className="inline-block w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow"
                  />
                </Marker>
              ))}
            </Map>
          </div>

          <section className="px-3 py-3 border-t border-slate-200 text-xs text-slate-700 space-y-1">
            <div>
              <strong className="font-mono text-slate-900">
                {props?.apn ?? apn}
              </strong>
              {props?.SITUS_ADDRESS && <span> · {props.SITUS_ADDRESS}</span>}
            </div>
            {props?.SUBDIVISION && <div>{props.SUBDIVISION}</div>}

            {subdivisionProps ? (
              <p className="text-[11px] text-slate-600 leading-snug pt-2">
                <strong>Why this layer.</strong>{" "}
                {subdivisionProps.display_name} plat recorded{" "}
                {subdivisionProps.dedication_date} as resubdivision of{" "}
                {subdivisionProps.parent_plat_reference ?? "prior tract"}. That
                root plat exists only in the county's book index — not
                recoverable via public API. The moat isn't the polygon, it's
                the custody chain behind it.
              </p>
            ) : (
              <p className="text-[11px] text-slate-600 leading-snug pt-2">
                <strong>No linked subdivision in corpus.</strong> This parcel's
                subdivision plat is not curated. Only the subject polygon +
                adjacent-parcel context is shown.
              </p>
            )}

            <a
              href={`https://mcassessor.maricopa.gov/mcs/?q=${apn.replace(/-/g, "")}&mod=pd`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-[11px] underline underline-offset-2 text-slate-700"
            >
              Open in MC Assessor →
            </a>
          </section>
        </>
      )}
    </aside>
  );
}
