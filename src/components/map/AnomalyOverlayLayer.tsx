import { Source, Layer } from "react-map-gl/maplibre";

type Severity = "high" | "medium" | "low";
type Anomaly = { parcel_apn: string; severity: Severity };

interface Props {
  active: boolean;
  anomalies: Anomaly[];
  parcelsGeo: GeoJSON.FeatureCollection;
}

const SEV_COLOR: Record<Severity, string> = {
  high: "#dc2626",
  medium: "#f59e0b",
  low: "#94a3b8",
};

function maxSeverity(list: Severity[]): Severity {
  if (list.includes("high")) return "high";
  if (list.includes("medium")) return "medium";
  return "low";
}

export function AnomalyOverlayLayer({ active, anomalies, parcelsGeo }: Props) {
  if (!active) return null;
  const byApn = new Map<string, Severity[]>();
  for (const a of anomalies) {
    const arr = byApn.get(a.parcel_apn) ?? [];
    arr.push(a.severity);
    byApn.set(a.parcel_apn, arr);
  }
  const features = (parcelsGeo.features as GeoJSON.Feature[])
    .filter((f) => byApn.has((f.properties as { APN_DASH?: string } | null)?.APN_DASH ?? ""))
    .map((f) => {
      const apn = (f.properties as { APN_DASH?: string }).APN_DASH!;
      return {
        ...f,
        properties: { ...f.properties, _sev: maxSeverity(byApn.get(apn)!) },
      };
    });
  if (features.length === 0) return null;
  return (
    <Source id="overlay-anomaly" type="geojson" data={{ type: "FeatureCollection", features }}>
      <Layer
        id="overlay-anomaly-outline"
        type="line"
        paint={{
          "line-color": [
            "match",
            ["get", "_sev"],
            "high", SEV_COLOR.high,
            "medium", SEV_COLOR.medium,
            SEV_COLOR.low,
          ],
          "line-width": 3,
        }}
      />
    </Source>
  );
}
