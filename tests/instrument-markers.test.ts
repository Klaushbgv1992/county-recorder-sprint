import { describe, it, expect } from "vitest";
import {
  markerForInstrument,
  type MarkerInput,
} from "../src/logic/instrument-markers";

const square: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
};

describe("markerForInstrument", () => {
  it("places a subdivision-plat marker at polygon centroid", () => {
    const input: MarkerInput = {
      instrument_number: "20010093192",
      document_type: "SUBDIVISION PLAT",
      geometry: square,
    };
    const pos = markerForInstrument(input);
    expect(pos).not.toBeNull();
    expect(pos!.icon).toBe("plat");
    expect(pos!.longitude).toBeCloseTo(5, 2);
    expect(pos!.latitude).toBeCloseTo(5, 2);
  });

  it("places an affidavit-of-correction marker offset from centroid", () => {
    const input: MarkerInput = {
      instrument_number: "20010849180",
      document_type: "AFFIDAVIT OF CORRECTION",
      geometry: square,
    };
    const pos = markerForInstrument(input);
    expect(pos).not.toBeNull();
    expect(pos!.icon).toBe("correction");
    // Offset should be non-zero to avoid overlap with plat marker
    expect(pos!.longitude).not.toBe(5);
    expect(pos!.latitude).not.toBe(5);
  });

  it("returns null for instrument with no geometry", () => {
    const input: MarkerInput = {
      instrument_number: "X",
      document_type: "WAR DEED",
      geometry: null,
    };
    expect(markerForInstrument(input)).toBeNull();
  });

  it("defaults to 'instrument' icon for unrecognized document types", () => {
    const input: MarkerInput = {
      instrument_number: "Y",
      document_type: "WAR DEED",
      geometry: square,
    };
    const pos = markerForInstrument(input);
    expect(pos).not.toBeNull();
    expect(pos!.icon).toBe("instrument");
  });
});
