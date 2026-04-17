import { Source, Layer } from "react-map-gl/maplibre";

interface Lifecycle {
  id: string;
  root_instrument: string;
  status: string;
  root_document_type: "hoa_lien" | "other";
}

interface Props {
  active: boolean;
  lifecycles: Lifecycle[];
  instrumentToApn: Map<string, string>;
  parcelsGeo: GeoJSON.FeatureCollection;
}

export function EncumbranceOverlayLayer({ active, lifecycles, instrumentToApn, parcelsGeo }: Props) {
  if (!active) return null;

  const openLienApns = new Set<string>();
  const openDeedApns = new Set<string>();
  for (const lc of lifecycles) {
    if (lc.status !== "open") continue;
    const apn = instrumentToApn.get(lc.root_instrument);
    if (!apn) continue;
    if (lc.root_document_type === "hoa_lien") {
      openLienApns.add(apn);
    } else {
      openDeedApns.add(apn);
    }
  }

  const allFeatures = parcelsGeo.features as GeoJSON.Feature[];
  const lienFeatures = allFeatures.filter((f) => {
    const apn = (f.properties as { APN_DASH?: string } | null)?.APN_DASH;
    return apn && openLienApns.has(apn);
  });
  const deedFeatures = allFeatures.filter((f) => {
    const apn = (f.properties as { APN_DASH?: string } | null)?.APN_DASH;
    return apn && openDeedApns.has(apn);
  });

  if (lienFeatures.length === 0 && deedFeatures.length === 0) return null;

  return (
    <>
      {deedFeatures.length > 0 && (
        <Source id="overlay-encumbrance-deed" type="geojson" data={{ type: "FeatureCollection", features: deedFeatures }}>
          <Layer id="overlay-encumbrance-deed-fill" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.5 }} />
          <Layer id="overlay-encumbrance-deed-outline" type="line" paint={{ "line-color": "#1d4ed8", "line-width": 2 }} />
        </Source>
      )}
      {lienFeatures.length > 0 && (
        <Source id="overlay-encumbrance-lien" type="geojson" data={{ type: "FeatureCollection", features: lienFeatures }}>
          <Layer id="overlay-encumbrance-lien-fill" type="fill" paint={{ "fill-color": "#f59e0b", "fill-opacity": 0.55 }} />
          <Layer id="overlay-encumbrance-lien-outline" type="line" paint={{ "line-color": "#b45309", "line-width": 2 }} />
        </Source>
      )}
    </>
  );
}
