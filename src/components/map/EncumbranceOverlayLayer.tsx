import { Source, Layer } from "react-map-gl/maplibre";

interface Lifecycle {
  id: string;
  root_instrument: string;
  status: string;
}

interface Props {
  active: boolean;
  lifecycles: Lifecycle[];
  instrumentToApn: Map<string, string>;
  parcelsGeo: GeoJSON.FeatureCollection;
}

export function EncumbranceOverlayLayer({ active, lifecycles, instrumentToApn, parcelsGeo }: Props) {
  if (!active) return null;
  const openApns = new Set(
    lifecycles
      .filter((l) => l.status === "open")
      .map((l) => instrumentToApn.get(l.root_instrument))
      .filter((a): a is string => Boolean(a)),
  );
  const features = (parcelsGeo.features as GeoJSON.Feature[]).filter((f) => {
    const apn = (f.properties as { APN_DASH?: string } | null)?.APN_DASH;
    return apn && openApns.has(apn);
  });
  if (features.length === 0) return null;
  return (
    <Source id="overlay-encumbrance" type="geojson" data={{ type: "FeatureCollection", features }}>
      <Layer id="overlay-encumbrance-fill" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.5 }} />
      <Layer id="overlay-encumbrance-outline" type="line" paint={{ "line-color": "#1d4ed8", "line-width": 2 }} />
    </Source>
  );
}
