import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import parcelsGeo from "../data/parcels-geo.json";
import subdivisionPlats from "../data/subdivision-plats.json";
import adjacentParcels from "../data/adjacent-parcels.json";
import {
  markerForInstrument,
  polygonCentroid,
  titleForIcon,
  type MarkerInput,
  type MarkerPosition,
} from "../logic/instrument-markers";
import { resolvePopupData, type PopupData } from "../logic/popup-data";
import { loadAllParcels, loadAllInstruments } from "../data-loader";
import { LifecyclesFile } from "../schemas";
import lifecyclesRaw from "../data/lifecycles.json";
import { MapPopup } from "./MapPopup";
import type { CacheEntry } from "../data/load-cached-neighbors";

const COLLAPSE_KEY = "spatial-panel-collapsed";

// Module-level caches so repeated mounts don't re-parse the corpus.
const PARCELS = loadAllParcels();
const INSTRUMENTS = loadAllInstruments();
const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

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

interface AssessorProperties {
  APN_DASH?: string;
  OWNER_NAME?: string;
  PHYSICAL_STREET_NUM?: string;
  PHYSICAL_STREET_DIR?: string;
  PHYSICAL_STREET_NAME?: string;
  PHYSICAL_STREET_TYPE?: string;
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

function assessorAddress(props: AssessorProperties | null | undefined): string {
  if (!props) return "";
  const parts = [
    props.PHYSICAL_STREET_NUM,
    props.PHYSICAL_STREET_DIR,
    props.PHYSICAL_STREET_NAME,
    props.PHYSICAL_STREET_TYPE,
  ].filter((p): p is string => Boolean(p));
  return parts.join(" ");
}

function featureCentroid(feat: GeoJSON.Feature | undefined): { longitude: number; latitude: number } | null {
  if (!feat || feat.geometry.type !== "Polygon") return null;
  const ring = (feat.geometry as GeoJSON.Polygon).coordinates[0];
  // Drop the closing duplicate vertex so the average is not biased.
  const verts = ring.slice(0, -1);
  if (verts.length === 0) return null;
  const lon = verts.reduce((s, v) => s + v[0], 0) / verts.length;
  const lat = verts.reduce((s, v) => s + v[1], 0) / verts.length;
  return { longitude: lon, latitude: lat };
}

export interface SpatialContextPanelProps {
  apn: string;
}

export function SpatialContextPanel({ apn }: SpatialContextPanelProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const persisted = localStorage.getItem(COLLAPSE_KEY);
    if (persisted !== null) return persisted === "true";
    // Detail pages default to collapsed so the chain/encumbrance content
    // stays the focus. Examiners opt in to the spatial view explicitly.
    return true;
  });

  // Lazy-load the ~1MB assessor layer + cached-neighbor API responses so
  // detail pages without the spatial panel expanded don't pay for them.
  // Mirrors the LandingPage pattern (see CountyMap wiring there).
  const [assessor, setAssessor] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cachedData, setCachedData] = useState<Map<string, CacheEntry> | null>(
    null,
  );

  useEffect(() => {
    if (collapsed) return;
    let cancelled = false;
    if (!assessor) {
      import("../data/gilbert-parcels-geo.json").then((m) => {
        if (!cancelled) setAssessor(m.default as GeoJSON.FeatureCollection);
      });
    }
    if (!cachedData) {
      import("../data/load-cached-neighbors").then((m) => {
        if (!cancelled) setCachedData(m.default);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [collapsed, assessor, cachedData]);

  const subject = useMemo(
    () =>
      (parcelsGeo.features as GeoJSON.Feature[]).find(
        (f) => (f.properties as SubjectProperties | null)?.apn === apn,
      ),
    [apn],
  );

  // All curated parcels other than the subject — same highlight style as the
  // landing map's "primary" tier, so the examiner immediately knows which
  // neighbors have full chain data versus index-only context.
  const otherCurated = useMemo(() => {
    return (parcelsGeo.features as GeoJSON.Feature[]).filter((f) => {
      const a = (f.properties as SubjectProperties | null)?.apn;
      return a && a !== apn;
    });
  }, [apn]);

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

  const subjectCenter = useMemo((): [number, number] | null => {
    const geom = subject?.geometry;
    if (geom?.type !== "Polygon") return null;
    return polygonCentroid(geom as GeoJSON.Polygon);
  }, [subject]);

  const cachedApns = useMemo(
    () => (cachedData ? new Set(cachedData.keys()) : new Set<string>()),
    [cachedData],
  );

  // Interactive layer IDs drive maplibre's hit-testing. Order matters:
  // curated parcels sit on top of cached and assessor, so clicks on an
  // overlapping vertex always prefer the richer-data tier.
  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    if (subject) ids.push(`subject-${apn}-fill`);
    for (const f of otherCurated) {
      const a = (f.properties as SubjectProperties | null)?.apn;
      if (a) ids.push(`curated-${a}-fill`);
    }
    ids.push("cached-neighbors-fill-hit");
    ids.push("assessor-only-fill");
    return ids;
  }, [subject, apn, otherCurated]);

  // Hover state drives the MapPopup. Tracks the APN under the cursor.
  const [hoveredApn, setHoveredApn] = useState<string | null>(null);

  const apnFromEvent = useCallback(
    (e: MapLayerMouseEvent): string | null => {
      const feat = e.features?.[0];
      if (!feat) return null;
      const layerId = feat.layer?.id ?? "";
      if (layerId === `subject-${apn}-fill`) return apn;
      const curatedMatch = layerId.match(/^curated-(.+)-fill$/);
      if (curatedMatch) return curatedMatch[1];
      if (
        layerId === "assessor-only-fill" ||
        layerId === "cached-neighbors-fill-hit"
      ) {
        return (
          (feat.properties as AssessorProperties | null)?.APN_DASH ?? null
        );
      }
      return null;
    },
    [apn],
  );

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const a = apnFromEvent(e);
      setHoveredApn((prev) => (prev === a ? prev : a));
    },
    [apnFromEvent],
  );

  const handleMouseLeave = useCallback(() => setHoveredApn(null), []);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const a = apnFromEvent(e);
      if (!a) return;
      // Clicking the subject parcel is a no-op: examiner is already there.
      if (a === apn) return;
      navigate(`/parcel/${a}`);
    },
    [apnFromEvent, apn, navigate],
  );

  // Popup data comes from the richest tier available for the hovered APN:
  //  - curated → resolvePopupData (owner + open lifecycles + last filed)
  //  - cached  → synthesized from cached recorder response + assessor shell
  //  - assessor-only → minimal owner + address
  const popupData = useMemo((): PopupData | null => {
    if (!hoveredApn) return null;
    const curated = resolvePopupData(hoveredApn, {
      parcels: PARCELS,
      instruments: INSTRUMENTS,
      lifecycles: LIFECYCLES,
    });
    if (curated) return curated;

    const assessorFeat = assessor?.features.find(
      (f) =>
        (f.properties as AssessorProperties | null)?.APN_DASH === hoveredApn,
    );
    const assessorProps =
      (assessorFeat?.properties as AssessorProperties | null) ?? null;
    const cachedEntry = cachedData?.get(hoveredApn);

    if (cachedEntry) {
      return {
        apn: hoveredApn,
        type: "residential",
        owner: assessorProps?.OWNER_NAME ?? "Unknown owner",
        address: assessorAddress(assessorProps),
        lastRecordingDate: cachedEntry.lastRecordedDate,
        openLifecycleCount: 0,
      };
    }

    if (assessorProps) {
      return {
        apn: hoveredApn,
        type: "residential",
        owner: assessorProps.OWNER_NAME ?? "Unknown owner",
        address: assessorAddress(assessorProps),
        lastRecordingDate: null,
        openLifecycleCount: 0,
      };
    }

    return null;
  }, [hoveredApn, assessor, cachedData]);

  const popupCoord = useMemo(() => {
    if (!hoveredApn) return null;
    // Try curated first, then assessor polygons.
    const curatedFeat = (parcelsGeo.features as GeoJSON.Feature[]).find(
      (f) => (f.properties as SubjectProperties | null)?.apn === hoveredApn,
    );
    const feat =
      curatedFeat ??
      assessor?.features.find(
        (f) =>
          (f.properties as AssessorProperties | null)?.APN_DASH === hoveredApn,
      );
    return featureCentroid(feat);
  }, [hoveredApn, assessor]);

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

  if (collapsed) {
    return (
      <aside className="border-l border-recorder-50/60 bg-white flex flex-col shrink-0 shadow-sm w-10">
        <button
          type="button"
          onClick={toggle}
          aria-label="Show spatial context"
          title="Show spatial context"
          className="flex-1 flex flex-col items-center justify-start gap-2 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        >
          <span aria-hidden="true" className="text-lg leading-none">»</span>
          <span
            className="text-xs font-medium whitespace-nowrap"
            style={{ writingMode: "vertical-rl" }}
          >
            Show spatial context
          </span>
        </button>
      </aside>
    );
  }

  const cachedNeighborsFC: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: assessor
      ? assessor.features.filter((f) =>
          cachedApns.has(
            (f.properties as AssessorProperties | null)?.APN_DASH ?? "",
          ),
        )
      : [],
  };

  return (
    <aside className="border-l border-recorder-50/60 bg-white flex flex-col shrink-0 shadow-sm w-full md:w-[40%]">
      <header className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          Spatial context
        </h3>
        <button
          type="button"
          onClick={toggle}
          aria-label="Collapse panel"
          title="Hide spatial context"
          className="text-slate-500 hover:text-slate-900 text-lg leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        >
          «
        </button>
      </header>

      <div className="flex-1 min-h-[320px] relative">
            <Map
              key={apn}
              initialViewState={{
                longitude: subjectCenter?.[0] ?? -111.7225,
                latitude: subjectCenter?.[1] ?? 33.2471,
                zoom: 16,
              }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              style={{ width: "100%", height: "100%" }}
              interactiveLayerIds={interactiveLayerIds}
              cursor={hoveredApn ? "pointer" : "grab"}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Adjacent-parcel outlines — low-contrast base layer for
                  spatial orientation only. Not interactive; the richer
                  assessor layer (when loaded) handles clicks/hovers. */}
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

              {/* Assessor tier — ~8,570 Gilbert parcels. Fill is near-
                  transparent so it doesn't compete with curated highlights,
                  but it still owns clicks and hover popups for every
                  non-curated parcel in the frame. */}
              {assessor && (
                <Source id="assessor-only" type="geojson" data={assessor}>
                  <Layer
                    id="assessor-only-fill"
                    type="fill"
                    paint={{ "fill-color": "#cbd5e1", "fill-opacity": 0.08 }}
                  />
                  <Layer
                    id="assessor-only-outline"
                    type="line"
                    paint={{ "line-color": "#64748b", "line-width": 0.4 }}
                  />
                </Source>
              )}

              {/* Cached-neighbor outlines — the pre-fetched 5-APN ring that
                  the landing page highlights in blue. Invisible-fill hit
                  target so the richer cached popup wins over assessor. */}
              <Source
                id="cached-neighbors"
                type="geojson"
                data={cachedNeighborsFC}
              >
                <Layer
                  id="cached-neighbors-fill-hit"
                  type="fill"
                  paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.01 }}
                />
                <Layer
                  id="cached-neighbors-outline"
                  type="line"
                  paint={{ "line-color": "#3b82f6", "line-width": 1.5 }}
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

              {/* Other curated parcels — same amber "primary" tier palette
                  as the landing map, so the examiner can spot POPHAM's
                  near-neighbors that also have full chain data. */}
              {otherCurated.map((f) => {
                const a = (f.properties as SubjectProperties | null)?.apn;
                if (!a) return null;
                return (
                  <Source
                    key={a}
                    id={`curated-${a}`}
                    type="geojson"
                    data={{ type: "FeatureCollection", features: [f] }}
                  >
                    <Layer
                      id={`curated-${a}-fill`}
                      type="fill"
                      paint={{
                        "fill-color": "#f59e0b",
                        "fill-opacity": hoveredApn === a ? 0.55 : 0.35,
                      }}
                    />
                    <Layer
                      id={`curated-${a}-outline`}
                      type="line"
                      paint={{ "line-color": "#b45309", "line-width": 1.5 }}
                    />
                  </Source>
                );
              })}

              <Source
                id="subject"
                type="geojson"
                data={{ type: "FeatureCollection", features: [subject] }}
              >
                <Layer
                  id={`subject-${apn}-fill`}
                  type="fill"
                  paint={{
                    "fill-color": "#10b981",
                    "fill-opacity": hoveredApn === apn ? 0.65 : 0.45,
                  }}
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
                    title={titleForIcon(m.icon)}
                    className="inline-block w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow"
                  />
                </Marker>
              ))}

              {popupData && popupCoord && (
                <MapPopup
                  data={popupData}
                  longitude={popupCoord.longitude}
                  latitude={popupCoord.latitude}
                />
              )}
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

            <p className="text-[11px] text-slate-500 leading-snug pt-2">
              Hover any parcel for owner + last-filed detail; click a neighbor
              to jump to its chain of title.
            </p>

            <a
              href={`https://mcassessor.maricopa.gov/mcs/?q=${apn.replace(/-/g, "")}&mod=pd`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-[11px] underline underline-offset-2 text-slate-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
            >
              Open in MC Assessor →
            </a>
          </section>
    </aside>
  );
}
