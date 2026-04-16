export interface MapCoord {
  longitude: number;
  latitude: number;
}

export function computePolygonCentroid(polygon: GeoJSON.Polygon): MapCoord {
  const ring = polygon.coordinates[0];
  // Exclude the closing vertex (which equals the first vertex by GeoJSON spec).
  const verts = ring.slice(0, -1);
  let lonSum = 0;
  let latSum = 0;
  for (const [lon, lat] of verts) {
    lonSum += lon;
    latSum += lat;
  }
  return {
    longitude: lonSum / verts.length,
    latitude: latSum / verts.length,
  };
}

export function computeMidpoint(a: MapCoord, b: MapCoord): MapCoord {
  return {
    longitude: (a.longitude + b.longitude) / 2,
    latitude: (a.latitude + b.latitude) / 2,
  };
}

export function computeLandingMapCenter(
  apns: string[],
  fc: GeoJSON.FeatureCollection,
): MapCoord {
  if (apns.length === 0) {
    throw new Error("computeLandingMapCenter: requires at least one APN");
  }
  const centroids: MapCoord[] = apns.map((apn) => {
    const feat = fc.features.find(
      (f) => (f.properties as { apn?: string } | null)?.apn === apn,
    );
    if (!feat) {
      throw new Error(`computeLandingMapCenter: APN not found: ${apn}`);
    }
    if (feat.geometry.type !== "Polygon") {
      throw new Error(
        `computeLandingMapCenter: ${apn} geometry is ${feat.geometry.type}, expected Polygon`,
      );
    }
    return computePolygonCentroid(feat.geometry as GeoJSON.Polygon);
  });
  if (centroids.length === 1) return centroids[0];
  // Average of all centroids — for the locked 2-parcel case this is exactly
  // midpoint(POPHAM, HOGUE). For >2, generalizes to mean centroid.
  const lonAvg = centroids.reduce((s, c) => s + c.longitude, 0) / centroids.length;
  const latAvg = centroids.reduce((s, c) => s + c.latitude, 0) / centroids.length;
  return { longitude: lonAvg, latitude: latAvg };
}
