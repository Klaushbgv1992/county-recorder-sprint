import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderAnomalyProse } from "../src/narrative/engine";
import type { z } from "zod";
import type { StaffAnomalySchema } from "../src/schemas";
import type { Instrument } from "../src/types";

type StaffAnomaly = z.infer<typeof StaffAnomalySchema>;

const makeInstrument = (num: string): Instrument => ({
  instrument_number: num,
  recording_date: "2020-01-01",
  document_code: null,
  document_type: "DEED OF TRUST",
  parcel_apn: "304-78-386",
  extracted_fields: {},
} as unknown as Instrument);

describe("renderAnomalyProse", () => {
  it("routes engine variant through the pattern catalogue with clickable citations", () => {
    const opens: string[] = [];
    const anomaly: StaffAnomaly = {
      id: "an-001",
      parcel_apn: "304-78-386",
      severity: "high",
      title: "t",
      description: "d",
      references: ["20210075858", "20130183450"],
      pattern_id: "mers-beneficiary-gap",
    };
    const nodes = renderAnomalyProse(
      anomaly,
      [makeInstrument("20210075858"), makeInstrument("20130183450")],
      (n) => opens.push(n),
    );
    const { container } = render(<>{nodes}</>);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    (buttons[0] as HTMLButtonElement).click();
    expect(opens).toEqual(["20210075858"]);
  });

  it("routes override variant verbatim but tokenizes its citations", () => {
    const opens: string[] = [];
    const anomaly: StaffAnomaly = {
      id: "an-002",
      parcel_apn: "304-77-689",
      severity: "high",
      title: "t",
      description: "d",
      references: [],
      plain_english: "The 2015 DOT [20150516730] has no matching release.",
    };
    const nodes = renderAnomalyProse(
      anomaly,
      [makeInstrument("20150516730")],
      (n) => opens.push(n),
    );
    const { container } = render(<>{nodes}</>);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    (buttons[0] as HTMLButtonElement).click();
    expect(opens).toEqual(["20150516730"]);
  });

  it("override citation unknown to this corpus renders as literal bracketed text", () => {
    const anomaly: StaffAnomaly = {
      id: "an-x",
      parcel_apn: "304-78-386",
      severity: "low",
      title: "t",
      description: "d",
      references: [],
      plain_english: "Unrelated number [99999999999] should stay literal.",
    };
    const nodes = renderAnomalyProse(anomaly, [], () => {});
    const { container } = render(<>{nodes}</>);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.textContent).toContain("[99999999999]");
  });
});
