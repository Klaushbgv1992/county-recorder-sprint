import { describe, expect, it } from "vitest";
import {
  computePolygonCentroid,
  computeMidpoint,
  computeLandingMapCenter,
} from "./compute-map-center";
import parcelsGeo from "../data/parcels-geo.json";

describe("computePolygonCentroid", () => {
  it("returns the average of polygon vertices (excluding the closing vertex)", () => {
    // Square with corners at (0,0), (2,0), (2,2), (0,2), and closing (0,0)
    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
    };
    const c = computePolygonCentroid(polygon);
    expect(c.longitude).toBeCloseTo(1, 6);
    expect(c.latitude).toBeCloseTo(1, 6);
  });

  it("ignores the duplicate closing vertex", () => {
    // Triangle (0,0), (3,0), (0,3), closing (0,0)
    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [3, 0], [0, 3], [0, 0]]],
    };
    const c = computePolygonCentroid(polygon);
    expect(c.longitude).toBeCloseTo(1, 6); // (0+3+0)/3
    expect(c.latitude).toBeCloseTo(1, 6); // (0+0+3)/3
  });
});

describe("computeMidpoint", () => {
  it("averages two coordinates", () => {
    const m = computeMidpoint(
      { longitude: -111.71, latitude: 33.235 },
      { longitude: -111.73, latitude: 33.236 },
    );
    expect(m.longitude).toBeCloseTo(-111.72, 6);
    expect(m.latitude).toBeCloseTo(33.2355, 6);
  });
});

describe("computeLandingMapCenter", () => {
  it("returns the midpoint of POPHAM and HOGUE centroids", () => {
    const c = computeLandingMapCenter(
      ["304-78-386", "304-77-689"],
      parcelsGeo as GeoJSON.FeatureCollection,
    );
    // Sanity: should land between the two known centroids in Gilbert
    expect(c.longitude).toBeGreaterThan(-111.74);
    expect(c.longitude).toBeLessThan(-111.70);
    expect(c.latitude).toBeGreaterThan(33.23);
    expect(c.latitude).toBeLessThan(33.24);
  });

  it("returns the single centroid for a one-APN list", () => {
    const c = computeLandingMapCenter(
      ["304-78-386"],
      parcelsGeo as GeoJSON.FeatureCollection,
    );
    expect(c.longitude).toBeCloseTo(-111.7103, 3);
    expect(c.latitude).toBeCloseTo(33.2358, 3);
  });

  it("throws when an APN is missing from the FeatureCollection", () => {
    expect(() =>
      computeLandingMapCenter(
        ["999-99-999"],
        parcelsGeo as GeoJSON.FeatureCollection,
      ),
    ).toThrow(/999-99-999/);
  });

  it("throws when given an empty APN list", () => {
    expect(() =>
      computeLandingMapCenter([], parcelsGeo as GeoJSON.FeatureCollection),
    ).toThrow(/at least one/i);
  });
});
