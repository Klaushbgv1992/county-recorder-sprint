import { describe, it, expect } from "vitest";
import {
  computeTimeAxisDomain,
  computeNodeX,
  groupSameDayInstruments,
  resolveMatcherSlotState,
  detectMersGap,
} from "./swimlane-layout";
import type { Instrument } from "../types";
import type { AnomalyFinding } from "../types/anomaly";

function inst(n: string, date: string, overrides: Partial<Instrument> = {}): Instrument {
  return {
    instrument_number: n,
    recording_date: date,
    document_type: "deed_of_trust",
    document_type_raw: "DEED TRST",
    bundled_document_types: [],
    parties: [],
    back_references: [],
    source_image_path: `/x/${n}.pdf`,
    page_count: 1,
    raw_api_response: {
      names: [],
      documentCodes: [],
      recordingDate: date,
      recordingNumber: n,
      pageAmount: 1,
      docketBook: 0,
      pageMap: 0,
      affidavitPresent: false,
      affidavitPageAmount: 0,
      restricted: false,
    },
    corpus_boundary_note: "",
    ...overrides,
  } as Instrument;
}

describe("computeTimeAxisDomain", () => {
  it("spans from earliest to latest recording_date, snapped to year boundaries", () => {
    const instruments = [
      inst("a", "2001-02-07"),
      inst("b", "2013-02-27"),
      inst("c", "2021-01-22"),
    ];
    const [start, end] = computeTimeAxisDomain(instruments);
    expect(start).toBe("2001-01-01");
    expect(end).toBe("2022-01-01");
  });

  it("returns [null, null] for empty input", () => {
    expect(computeTimeAxisDomain([])).toEqual([null, null]);
  });
});

describe("computeNodeX", () => {
  it("places the domain start at x=0 and domain end at x=width", () => {
    expect(computeNodeX("2001-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(0);
    expect(computeNodeX("2022-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(1000);
  });

  it("places a midpoint date at x=width/2 (approx)", () => {
    const x = computeNodeX("2011-07-02", ["2001-01-01", "2022-01-01"], 1000);
    expect(x).toBeGreaterThan(495);
    expect(x).toBeLessThan(505);
  });

  it("clamps dates outside the domain", () => {
    expect(computeNodeX("1990-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(0);
    expect(computeNodeX("2030-01-01", ["2001-01-01", "2022-01-01"], 1000)).toBe(1000);
  });
});

describe("groupSameDayInstruments", () => {
  it("returns a single node when dates all differ", () => {
    const a = inst("a", "2013-02-27");
    const b = inst("b", "2015-07-17");
    expect(groupSameDayInstruments([a, b])).toEqual([
      { kind: "single", instrument: a },
      { kind: "single", instrument: b },
    ]);
  });

  it("collapses same-day instruments into a composite", () => {
    const a = inst("a", "2021-01-19");
    const b = inst("b", "2021-01-19");
    const result = groupSameDayInstruments([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      kind: "composite",
      date: "2021-01-19",
      instruments: [a, b],
    });
  });

  it("preserves order across mixed groups", () => {
    const a = inst("a", "2021-01-19");
    const b = inst("b", "2021-01-19");
    const c = inst("c", "2021-01-22");
    const result = groupSameDayInstruments([a, b, c]);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe("composite");
    expect(result[1].kind).toBe("single");
  });
});

describe("detectMersGap", () => {
  const baseFinding = (overrides: Partial<AnomalyFinding> = {}): AnomalyFinding => ({
    rule_id: "R3",
    parcel_apn: "304-78-386",
    severity: "medium",
    title: "MERS beneficiary",
    description: "DOT 20130183450 names MERS as beneficiary as nominee for V I P MORTGAGE INC. Release was executed by WELLS FARGO HOME MORTGAGE, not V I P MORTGAGE INC directly.",
    evidence_instruments: ["20130183450", "20210075858"],
    examiner_action: "x",
    detection_provenance: { rule_name: "R3", rule_version: "1.0", confidence: 0.9 },
    ...overrides,
  });

  it("returns the originator+releaser+evidence for an R3 finding on this DOT", () => {
    const finding = baseFinding();
    const gap = detectMersGap("20130183450", [finding]);
    expect(gap).toEqual({
      dot_instrument: "20130183450",
      release_instrument: "20210075858",
      originator: "V I P MORTGAGE INC",
      releaser: "WELLS FARGO HOME MORTGAGE",
      rule_finding: finding,
    });
  });

  it("returns null when no R3 finding references the DOT", () => {
    const finding = baseFinding({ evidence_instruments: ["20150516730", "xxx"] });
    expect(detectMersGap("20130183450", [finding])).toBeNull();
  });

  it("returns null when there are no findings at all", () => {
    expect(detectMersGap("20130183450", [])).toBeNull();
  });

  it("parses a finding produced from the live R3 description_template", async () => {
    const rulesJson = await import("../data/anomaly-rules.json");
    const rules = (rulesJson as unknown as { rules: Array<{ rule_id: string; description_template: string }> }).rules
      ?? (rulesJson.default as { rules: Array<{ rule_id: string; description_template: string }> }).rules;
    const r3 = rules.find((r) => r.rule_id === "R3");
    expect(r3).toBeDefined();
    const description = r3!.description_template
      .replace("{a}", "20130183450")
      .replace(/\{lender\}/g, "V I P MORTGAGE INC")
      .replace("{releaser}", "WELLS FARGO HOME MORTGAGE");
    const finding: AnomalyFinding = {
      rule_id: "R3",
      parcel_apn: "304-78-386",
      severity: "medium",
      title: "t",
      description,
      evidence_instruments: ["20130183450", "20210075858"],
      examiner_action: "x",
      detection_provenance: { rule_name: "R3", rule_version: "1.0", confidence: 0.9 },
    };
    const gap = detectMersGap("20130183450", [finding]);
    expect(gap).not.toBeNull();
    expect(gap!.originator).toBe("V I P MORTGAGE INC");
    expect(gap!.releaser).toBe("WELLS FARGO HOME MORTGAGE");
  });
});

describe("resolveMatcherSlotState", () => {
  it("returns 'closed' when the lifecycle has an accepted release", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 0,
        scannedPartyCount: 0,
        hasAcceptedRelease: true,
      }),
    ).toBe("closed");
  });

  it("returns 'expanded-fan' when rowsCount > 0 and open", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 2,
        scannedPartyCount: 47,
        hasAcceptedRelease: false,
      }),
    ).toBe("expanded-fan");
  });

  it("returns 'expanded-empty-with-scan' when rowsCount === 0 and scannedPartyCount > 0", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 0,
        scannedPartyCount: 47,
        hasAcceptedRelease: false,
      }),
    ).toBe("expanded-empty-with-scan");
  });

  it("returns 'collapsed-pill' when rowsCount === 0 and scannedPartyCount === 0", () => {
    expect(
      resolveMatcherSlotState({
        rowsCount: 0,
        scannedPartyCount: 0,
        hasAcceptedRelease: false,
      }),
    ).toBe("collapsed-pill");
  });
});
