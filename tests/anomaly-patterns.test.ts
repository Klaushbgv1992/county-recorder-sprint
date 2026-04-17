import { describe, it, expect } from "vitest";
import { anomalyPatterns } from "../src/narrative/anomaly-patterns";
import type { Instrument } from "../src/types";

describe("anomalyPatterns", () => {
  const makeInstrument = (num: string, type: string): Instrument => ({
    instrument_number: num,
    recording_date: "2020-01-01",
    document_code: null,
    document_type: type,
    parcel_apn: "304-78-386",
    extracted_fields: {},
  } as unknown as Instrument);

  it("exports all 5 pattern ids referenced by the schema", () => {
    const ids = Object.keys(anomalyPatterns);
    expect(ids.sort()).toEqual([
      "junior-lien-priority",
      "llc-to-member-retitle",
      "mers-beneficiary-gap",
      "ocr-trust-recovery",
      "recorded-assignment-chain",
    ]);
  });

  it("mers-beneficiary-gap cites both referenced instruments", () => {
    const prose = anomalyPatterns["mers-beneficiary-gap"]({
      references: ["20210075858", "20130183450"],
      instruments: [
        makeInstrument("20210075858", "RELEASE"),
        makeInstrument("20130183450", "DEED OF TRUST"),
      ],
    });
    expect(prose).toContain("[20210075858]");
    expect(prose).toContain("[20130183450]");
  });

  it("junior-lien-priority names both lienholders when findable", () => {
    const prose = anomalyPatterns["junior-lien-priority"]({
      references: ["20190100001", "20130087109"],
      instruments: [
        makeInstrument("20190100001", "DEED OF TRUST"),
        makeInstrument("20130087109", "DEED OF TRUST"),
      ],
    });
    expect(prose).toContain("[20190100001]");
    expect(prose).toContain("[20130087109]");
    expect(prose.toLowerCase()).toMatch(/junior|priority|senior/);
  });
});
