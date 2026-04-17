import { Source, Layer } from "react-map-gl/maplibre";

interface Props {
  active: boolean;
  geojson: GeoJSON.FeatureCollection;
}

const BAND_COLOR = {
  post2020: "#10b981",
  mid: "#f59e0b",
  early: "#94a3b8",
  old: "#6b7280",
};

const TS_2020 = 1577836800000;
const TS_2015 = 1420070400000;
const TS_2010 = 1262304000000;

export function LastDeedOverlayLayer({ active, geojson }: Props) {
  if (!active) return null;
  return (
    <Source id="overlay-lastdeed" type="geojson" data={geojson}>
      <Layer
        id="overlay-lastdeed-fill"
        type="fill"
        paint={{
          "fill-color": [
            "case",
            ["==", ["get", "DEED_DATE"], null], "rgba(0,0,0,0)",
            [">=", ["get", "DEED_DATE"], TS_2020], BAND_COLOR.post2020,
            [">=", ["get", "DEED_DATE"], TS_2015], BAND_COLOR.mid,
            [">=", ["get", "DEED_DATE"], TS_2010], BAND_COLOR.early,
            BAND_COLOR.old,
          ],
          "fill-opacity": 0.3,
        }}
      />
      <Layer
        id="overlay-lastdeed-outline-null"
        type="line"
        filter={["==", ["get", "DEED_DATE"], null]}
        paint={{
          "line-color": BAND_COLOR.early,
          "line-width": 1,
        }}
      />
    </Source>
  );
}
