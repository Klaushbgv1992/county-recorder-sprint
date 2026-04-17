import { describe, it, expect } from "vitest";
import { StaffAnomalySchema, StaffAnomalyFileSchema } from "../src/schemas";
import fs from "node:fs";
import path from "node:path";

describe("StaffAnomalySchema", () => {
  const base = {
    id: "an-x",
    parcel_apn: "304-78-386",
    severity: "high",
    title: "t",
    description: "d",
  };

  it("accepts an engine-variant anomaly", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: ["20210075858"],
        pattern_id: "mers-beneficiary-gap",
      }),
    ).not.toThrow();
  });

  it("accepts an override-variant anomaly", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: [],
        plain_english: "The release is missing.",
      }),
    ).not.toThrow();
  });

  it("rejects engine variant without pattern_id", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: ["20210075858"],
      }),
    ).toThrow();
  });

  it("rejects override variant without plain_english", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: [],
      }),
    ).toThrow();
  });

  it("rejects hybrid (non-empty references AND plain_english)", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: ["20210075858"],
        pattern_id: "mers-beneficiary-gap",
        plain_english: "extra",
      }),
    ).toThrow();
  });

  it("rejects empty-but-wrong-shape references", () => {
    expect(() =>
      StaffAnomalySchema.parse({
        ...base,
        references: [],
        pattern_id: "mers-beneficiary-gap",
      }),
    ).toThrow();
  });
});

it("validates the committed staff-anomalies.json", () => {
  const raw = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../src/data/staff-anomalies.json"),
      "utf8",
    ),
  );
  expect(() => StaffAnomalyFileSchema.parse(raw)).not.toThrow();
  expect(raw).toHaveLength(9);
});
