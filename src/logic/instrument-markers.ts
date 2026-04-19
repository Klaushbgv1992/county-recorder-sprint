export interface MarkerInput {
  instrument_number: string;
  document_type: string;
  geometry: GeoJSON.Polygon | null;
}

export interface MarkerPosition {
  instrument_number: string;
  longitude: number;
  latitude: number;
  icon: "plat" | "correction" | "instrument";
}

const CORRECTION_OFFSET: readonly [number, number] = [0.0001, 0.0001];

export function markerForInstrument(input: MarkerInput): MarkerPosition | null {
  if (!input.geometry) return null;
  const [cx, cy] = polygonCentroid(input.geometry);
  const icon = iconFor(input.document_type);
  const [dx, dy] = icon === "correction" ? CORRECTION_OFFSET : [0, 0];
  return {
    instrument_number: input.instrument_number,
    longitude: cx + dx,
    latitude: cy + dy,
    icon,
  };
}

function iconFor(docType: string): MarkerPosition["icon"] {
  if (/AFFID.*CORRECT/i.test(docType)) return "correction";
  if (/SUBDIV|PLAT/i.test(docType)) return "plat";
  return "instrument";
}

export function titleForIcon(icon: MarkerPosition["icon"]): string {
  if (icon === "plat") return "Subdivision plat";
  if (icon === "correction") return "Affidavit of correction";
  return "Instrument";
}

// TODO: switch to shoelace-weighted centroid if irregular polygons ship.
// Current arithmetic-mean-of-vertices is exact for rectangles and near-exact
// for the hand-traced subdivision boundary; fine for the demo corpus.
export function polygonCentroid(poly: GeoJSON.Polygon): [number, number] {
  const ring = poly.coordinates[0];
  const n = ring.length - 1;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return [x / n, y / n];
}
